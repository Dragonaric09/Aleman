import type { Prisma } from "@prisma/client";
import { syncCards, toWordData, visibleTo, wordToInput } from "@/modules/vocabulary";
import { prisma } from "@/server/db";
import { serializeAnkiCsv } from "./anki";
import { parseVocabularyCsv, serializeVocabularyCsv, type RowError } from "./csv";

export interface ImportReport {
  created: number;
  updated: number;
  valid: number;
  errors: RowError[];
  preview: { row: number; lemma: string; type: string; translationEs: string; action: "create" | "update" }[];
}

/**
 * Importa un CSV a las palabras propias del usuario (upsert por scope, lema y tipo).
 * Con dryRun = true no guarda nada: solo devuelve la vista previa y los errores por fila.
 */
export async function importVocabularyCsv(userId: string, text: string, dryRun: boolean): Promise<ImportReport> {
  const parsed = parseVocabularyCsv(text);
  const errors = [...parsed.errors];

  const lessons = await prisma.lesson.findMany({ select: { id: true, number: true } });
  const lessonIds = new Map(lessons.map((l) => [l.number, l.id]));
  const rows = parsed.rows.filter(({ row, word }) => {
    if (word.lessonNumber != null && !lessonIds.has(word.lessonNumber)) {
      errors.push({ row, field: "lesson", message: `la lección ${word.lessonNumber} no existe` });
      return false;
    }
    return true;
  });

  const existing = rows.length
    ? await prisma.word.findMany({
        where: { scope: userId, OR: rows.map(({ word }) => ({ lemma: word.lemma, type: word.type })) },
        select: { id: true, lemma: true, type: true },
      })
    : [];
  const existingIds = new Map(existing.map((w) => [`${w.lemma}\u0000${w.type}`, w.id]));

  const preview = rows.map(({ row, word }) => ({
    row,
    lemma: word.lemma,
    type: word.type,
    translationEs: word.translationEs,
    action: existingIds.has(`${word.lemma}\u0000${word.type}`) ? ("update" as const) : ("create" as const),
  }));
  const report: ImportReport = {
    created: preview.filter((p) => p.action === "create").length,
    updated: preview.filter((p) => p.action === "update").length,
    valid: rows.length,
    errors: errors.sort((a, b) => a.row - b.row),
    preview: preview.slice(0, 200),
  };
  if (dryRun || rows.length === 0) return report;

  await prisma.$transaction(
    async (tx) => {
      const ids: string[] = [];
      for (const { word } of rows) {
        const data = toWordData(word, word.lessonNumber != null ? (lessonIds.get(word.lessonNumber) ?? null) : null);
        const id = existingIds.get(`${word.lemma}\u0000${word.type}`);
        if (id) {
          await tx.word.update({ where: { id }, data });
          ids.push(id);
        } else {
          const created = await tx.word.create({ data: { ...data, scope: userId }, select: { id: true } });
          ids.push(created.id);
        }
      }
      await syncCards(userId, { wordIds: ids }, tx);
    },
    { timeout: 60_000, maxWait: 10_000 },
  );
  return report;
}

async function exportableWords(userId: string, includeGlobal: boolean) {
  const where: Prisma.WordWhereInput = includeGlobal ? visibleTo(userId) : { scope: userId };
  return prisma.word.findMany({
    where,
    include: { lesson: { select: { number: true, sortOrder: true } } },
    orderBy: [{ lesson: { sortOrder: "asc" } }, { priority: "desc" }, { lemma: "asc" }],
  });
}

/** CSV en el formato 9.1 con las palabras propias (y opcionalmente las globales). */
export async function exportVocabularyCsv(userId: string, includeGlobal: boolean) {
  const words = await exportableWords(userId, includeGlobal);
  return serializeVocabularyCsv(words.map(wordToInput));
}

/** CSV para Anki con todas las palabras visibles. */
export async function exportAnkiCsv(userId: string) {
  const words = await exportableWords(userId, true);
  return serializeAnkiCsv(words.map((w) => ({ ...w, lessonNumber: w.lesson?.number ?? null })));
}

import { randomUUID } from "node:crypto";
import type { Prisma } from "@prisma/client";
import { getSettings, settingsSchema } from "@/modules/settings";
import {
  invalidateCardSync,
  lessonIdByNumber,
  toWordData,
  wordInputSchema,
  wordToInput,
} from "@/modules/vocabulary";
import { prisma } from "@/server/db";
import { AppError } from "@/server/http";
import { backupSchema, type Backup, type WordRef } from "./schemas";

const refKey = (r: WordRef) => `${r.scope}\u0000${r.lemma}\u0000${r.type}`;

/** Copia de seguridad JSON: { version, exportedAt, settings, ownWords, cards, reviewLogs, notes }. */
export async function buildBackup(userId: string, now: Date): Promise<Backup> {
  const settings = await getSettings(userId);
  const [ownWords, cards, logs, notes] = await Promise.all([
    prisma.word.findMany({
      where: { scope: userId },
      include: { lesson: { select: { number: true } } },
      orderBy: { createdAt: "asc" },
    }),
    prisma.card.findMany({
      where: { userId },
      include: { word: { select: { scope: true, lemma: true, type: true } } },
    }),
    prisma.reviewLog.findMany({ where: { userId }, orderBy: { reviewedAt: "asc" } }),
    prisma.wordNote.findMany({
      where: { userId },
      include: { word: { select: { scope: true, lemma: true, type: true } } },
    }),
  ]);
  const ref = (w: { scope: string; lemma: string; type: WordRef["type"] }): WordRef => ({
    scope: w.scope === "global" ? "global" : "own",
    lemma: w.lemma,
    type: w.type,
  });
  return {
    version: 1,
    exportedAt: now.toISOString(),
    settings: { ...settings },
    ownWords: ownWords.map((w) => ({ ...wordToInput(w) })),
    cards: cards.map((c) => ({
      ref: c.id,
      word: ref(c.word),
      kind: c.kind,
      state: c.state,
      due: c.due.toISOString(),
      stability: c.stability,
      difficulty: c.difficulty,
      elapsedDays: c.elapsedDays,
      scheduledDays: c.scheduledDays,
      learningSteps: c.learningSteps,
      reps: c.reps,
      lapses: c.lapses,
      lastReview: c.lastReview?.toISOString() ?? null,
      introducedAt: c.introducedAt?.toISOString() ?? null,
      suspended: c.suspended,
      isLeech: c.isLeech,
    })),
    reviewLogs: logs.map((l) => ({
      cardRef: l.cardId,
      rating: l.rating,
      verdict: l.verdict,
      typedAnswer: l.typedAnswer,
      durationMs: l.durationMs,
      stateBefore: l.stateBefore,
      cardBefore: l.cardBefore,
      scheduledDays: l.scheduledDays,
      reviewedAt: l.reviewedAt.toISOString(),
      studyDay: l.studyDay,
      isNewCard: l.isNewCard,
    })),
    notes: notes.map((n) => ({ word: ref(n.word), mnemonic: n.mnemonic, ownSentence: n.ownSentence })),
  };
}

/** Valida una copia (sin escribir nada) y devuelve un resumen para la confirmación. */
export function inspectBackup(json: unknown) {
  const parsed = backupSchema.safeParse(json);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    throw new AppError(
      400,
      "INVALID_BACKUP",
      `Copia inválida: ${first?.path.join(".") || "archivo"}: ${first?.message ?? ""}`,
    );
  }
  const b = parsed.data;
  return {
    backup: b,
    summary: {
      exportedAt: b.exportedAt,
      ownWords: b.ownWords.length,
      cards: b.cards.length,
      reviewLogs: b.reviewLogs.length,
      notes: b.notes.length,
    },
  };
}

/** Reemplaza todos los datos del usuario por los de la copia, en una transacción. */
export async function restoreBackup(userId: string, json: unknown) {
  const { backup, summary } = inspectBackup(json);
  const settings = settingsSchema.parse(backup.settings);
  const ownWords = backup.ownWords.map((w, i) => {
    const parsed = wordInputSchema.safeParse(w);
    if (!parsed.success) {
      throw new AppError(
        400,
        "INVALID_BACKUP",
        `Copia inválida: palabra ${i + 1}: ${parsed.error.issues[0]?.message ?? ""}`,
      );
    }
    return parsed.data;
  });

  await prisma.$transaction(
    async (tx) => {
      await tx.reviewLog.deleteMany({ where: { userId } });
      await tx.card.deleteMany({ where: { userId } });
      await tx.wordNote.deleteMany({ where: { userId } });
      await tx.word.deleteMany({ where: { scope: userId } });
      await tx.userSettings.upsert({ where: { userId }, update: settings, create: { userId, ...settings } });

      const wordIds = new Map<string, string>();
      for (const w of ownWords) {
        const created = await tx.word.create({
          data: { ...toWordData(w, await lessonIdByNumber(tx, w.lessonNumber)), scope: userId },
          select: { id: true },
        });
        wordIds.set(refKey({ scope: "own", lemma: w.lemma, type: w.type }), created.id);
      }
      const globalRefs = [...backup.cards.map((c) => c.word), ...backup.notes.map((n) => n.word)].filter(
        (r) => r.scope === "global",
      );
      if (globalRefs.length) {
        const globals = await tx.word.findMany({
          where: { scope: "global", OR: globalRefs.map((r) => ({ lemma: r.lemma, type: r.type })) },
          select: { id: true, lemma: true, type: true },
        });
        for (const g of globals) wordIds.set(refKey({ scope: "global", lemma: g.lemma, type: g.type }), g.id);
      }

      const cardIds = new Map<string, string>();
      const cardRows: Prisma.CardCreateManyInput[] = [];
      for (const c of backup.cards) {
        const wordId = wordIds.get(refKey(c.word));
        if (!wordId) continue; // la palabra global ya no existe en el catálogo
        const id = randomUUID();
        cardIds.set(c.ref, id);
        cardRows.push({
          id,
          userId,
          wordId,
          kind: c.kind,
          state: c.state,
          due: new Date(c.due),
          stability: c.stability,
          difficulty: c.difficulty,
          elapsedDays: c.elapsedDays,
          scheduledDays: c.scheduledDays,
          learningSteps: c.learningSteps,
          reps: c.reps,
          lapses: c.lapses,
          lastReview: c.lastReview ? new Date(c.lastReview) : null,
          introducedAt: c.introducedAt ? new Date(c.introducedAt) : null,
          suspended: c.suspended,
          isLeech: c.isLeech,
        });
      }
      if (cardRows.length) await tx.card.createMany({ data: cardRows, skipDuplicates: true });

      const logRows: Prisma.ReviewLogCreateManyInput[] = [];
      for (const l of backup.reviewLogs) {
        const cardId = cardIds.get(l.cardRef);
        if (!cardId) continue;
        logRows.push({
          userId,
          cardId,
          rating: l.rating,
          verdict: l.verdict,
          typedAnswer: l.typedAnswer,
          durationMs: l.durationMs,
          stateBefore: l.stateBefore,
          cardBefore: (l.cardBefore ?? {}) as Prisma.InputJsonValue,
          scheduledDays: l.scheduledDays,
          reviewedAt: new Date(l.reviewedAt),
          studyDay: l.studyDay,
          isNewCard: l.isNewCard,
        });
      }
      if (logRows.length) await tx.reviewLog.createMany({ data: logRows });

      const noteRows: Prisma.WordNoteCreateManyInput[] = [];
      for (const n of backup.notes) {
        const wordId = wordIds.get(refKey(n.word));
        if (wordId) noteRows.push({ userId, wordId, mnemonic: n.mnemonic, ownSentence: n.ownSentence });
      }
      if (noteRows.length) await tx.wordNote.createMany({ data: noteRows, skipDuplicates: true });
    },
    { timeout: 60_000, maxWait: 10_000 },
  );
  invalidateCardSync(userId);
  return summary;
}

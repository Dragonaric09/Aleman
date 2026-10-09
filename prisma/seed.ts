// Semilla idempotente: carga lecciones y el catálogo global desde data/. Nunca toca tarjetas, repasos ni datos de usuarios.
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { ensureUser } from "@/modules/auth/service";
import { parseLessonsCsv, parseVocabularyCsv } from "@/modules/transfer";
import { normalizeKey } from "@/modules/reading";
import { upsertGlobalWord } from "@/modules/vocabulary";
import { prisma } from "@/server/db";
import { loadContent, validateContent } from "../scripts/lib/content";

const root = resolve(import.meta.dirname, "..");

async function main() {
  const lessons = parseLessonsCsv(readFileSync(resolve(root, "data/lecciones.csv"), "utf8"));
  const vocab = parseVocabularyCsv(readFileSync(resolve(root, "data/vocabulario.csv"), "utf8"));
  const errors = [...lessons.errors, ...vocab.errors];
  if (errors.length) {
    for (const e of errors.slice(0, 20)) console.error(`fila ${e.row} · ${e.field}: ${e.message}`);
    throw new Error(`El CSV tiene ${errors.length} error(es); ejecuta pnpm vocab:validate`);
  }

  for (const l of lessons.rows) {
    await prisma.lesson.upsert({
      where: { number: l.number },
      update: { title: l.title, topic: l.topic, sortOrder: l.sortOrder },
      create: { number: l.number, title: l.title, topic: l.topic, sortOrder: l.sortOrder },
    });
  }
  const lessonIds = new Map((await prisma.lesson.findMany()).map((l) => [l.number, l.id]));

  const counts = { created: 0, updated: 0, unchanged: 0 };
  const summary = new Map<string, { created: number; updated: number }>();
  for (const { word } of vocab.rows) {
    const lessonId = word.lessonNumber != null ? (lessonIds.get(word.lessonNumber) ?? null) : null;
    const result = await upsertGlobalWord(prisma, word, lessonId);
    counts[result]++;
    const key = `${word.level} · lección ${word.lessonNumber ?? "-"}`;
    const e = summary.get(key) ?? { created: 0, updated: 0 };
    if (result === "created") e.created++;
    if (result === "updated") e.updated++;
    summary.set(key, e);
  }

  console.log(`Lecciones: ${lessons.rows.length}`);
  console.log(
    `Palabras: ${counts.created} creadas, ${counts.updated} actualizadas, ${counts.unchanged} sin cambios`,
  );
  for (const [key, e] of [...summary].sort()) {
    if (e.created || e.updated) console.log(`  ${key}: ${e.created} creadas, ${e.updated} actualizadas`);
  }

  await seedContent(vocab.rows.map((r) => r.word));

  const email = process.env.SEED_DEMO_EMAIL?.trim();
  const password = process.env.SEED_DEMO_PASSWORD ?? "";
  if (email && password) {
    if (password.length < 10) throw new Error("SEED_DEMO_PASSWORD debe tener al menos 10 caracteres");
    const { created } = await ensureUser(email, password, "Demo");
    console.log(created ? `Usuario demo creado: ${email}` : `Usuario demo ya existía: ${email}`);
  }
}

/** Temas de Gramática e historias (data/gramatica, data/historias). Nunca borra intentos de usuarios. */
async function seedContent(catalog: Parameters<typeof validateContent>[1]) {
  const content = loadContent(root);
  const result = validateContent(content, catalog);
  if (result.errors.length) {
    for (const e of result.errors.slice(0, 20)) console.error(e);
    throw new Error(`El contenido tiene ${result.errors.length} error(es); ejecuta pnpm content:validate`);
  }
  // Comparación estable (jsonb reordena las claves de los objetos).
  const stable = (v: unknown): unknown =>
    Array.isArray(v)
      ? v.map(stable)
      : v && typeof v === "object"
        ? Object.fromEntries(
            Object.entries(v)
              .filter(([, x]) => x !== undefined)
              .sort(([a], [b]) => a.localeCompare(b))
              .map(([k, x]) => [k, stable(x)]),
          )
        : v;
  const same = (a: unknown, b: unknown) => JSON.stringify(stable(a)) === JSON.stringify(stable(b));
  const counts = { topics: { created: 0, updated: 0 }, stories: { created: 0, updated: 0 } };

  for (const t of content.topics) {
    const data = {
      slug: t.slug,
      title: t.title,
      summary: t.summary,
      lessonNumbers: t.lessons,
      prerequisites: t.prerequisites,
      sortOrder: t.order,
      status: t.status === "available" ? ("AVAILABLE" as const) : ("PLANNED" as const),
      plannedStories: t.plannedStories,
      content: {
        ...(t.content ?? {}),
        titleDe: t.titleDe ?? null,
        targetLabel: t.targetLabel,
        findPrompt: t.findPrompt ?? null,
        minTargets: t.minTargets,
      },
    };
    const existing = await prisma.grammarTopic.findUnique({ where: { id: t.id } });
    if (!existing) {
      await prisma.grammarTopic.create({ data: { id: t.id, ...data } });
      counts.topics.created++;
    } else if ((Object.keys(data) as (keyof typeof data)[]).some((k) => !same(existing[k], data[k]))) {
      await prisma.grammarTopic.update({ where: { id: t.id }, data });
      counts.topics.updated++;
    }
  }

  for (const s of content.stories) {
    const data = {
      topicId: s.topicId,
      phase: s.phase,
      sortOrder: s.sortOrder,
      title: s.title,
      titleEs: s.titleEs,
      body: s.body,
      keywords: s.keywords.map((k) => result.lemmaByKey.get(normalizeKey(k)) ?? k),
      highlight: s.highlight,
      wordCount: s.wordCount,
      reviewed: s.reviewed,
      exercises: s.exercises,
    };
    const existing = await prisma.story.findUnique({ where: { id: s.id } });
    if (!existing) {
      await prisma.story.create({ data: { id: s.id, ...data } });
      counts.stories.created++;
    } else if ((Object.keys(data) as (keyof typeof data)[]).some((k) => !same(existing[k], data[k]))) {
      await prisma.story.update({ where: { id: s.id }, data });
      counts.stories.updated++;
    }
  }
  console.log(
    `Gramática: ${content.topics.length} temas (${counts.topics.created} creados, ${counts.topics.updated} actualizados) · ` +
      `Historias: ${content.stories.length} (${counts.stories.created} creadas, ${counts.stories.updated} actualizadas)`,
  );
  for (const w of result.warnings) console.log(`  aviso: ${w}`);
}

main()
  .catch((err) => {
    console.error(err instanceof Error ? err.message : err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());

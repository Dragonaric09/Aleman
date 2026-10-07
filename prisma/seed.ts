// Semilla idempotente: carga lecciones y el catálogo global desde data/. Nunca toca tarjetas, repasos ni datos de usuarios.
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { ensureUser } from "@/modules/auth/service";
import { parseLessonsCsv, parseVocabularyCsv } from "@/modules/transfer";
import { upsertGlobalWord } from "@/modules/vocabulary";
import { prisma } from "@/server/db";

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
  console.log(`Palabras: ${counts.created} creadas, ${counts.updated} actualizadas, ${counts.unchanged} sin cambios`);
  for (const [key, e] of [...summary].sort()) {
    if (e.created || e.updated) console.log(`  ${key}: ${e.created} creadas, ${e.updated} actualizadas`);
  }

  const email = process.env.SEED_DEMO_EMAIL?.trim();
  const password = process.env.SEED_DEMO_PASSWORD ?? "";
  if (email && password) {
    if (password.length < 10) throw new Error("SEED_DEMO_PASSWORD debe tener al menos 10 caracteres");
    const { created } = await ensureUser(email, password, "Demo");
    console.log(created ? `Usuario demo creado: ${email}` : `Usuario demo ya existía: ${email}`);
  }
}

main()
  .catch((err) => {
    console.error(err instanceof Error ? err.message : err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());

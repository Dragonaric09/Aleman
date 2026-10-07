// Valida data/vocabulario.csv y data/lecciones.csv con el mismo esquema Zod de la importación.
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { parseLessonsCsv, parseVocabularyCsv } from "@/modules/transfer";

const root = resolve(import.meta.dirname, "..");
const vocabText = readFileSync(resolve(root, "data/vocabulario.csv"), "utf8");
const lessonsText = readFileSync(resolve(root, "data/lecciones.csv"), "utf8");

let failed = false;
if (vocabText.charCodeAt(0) === 0xfeff) {
  console.error("✗ data/vocabulario.csv tiene BOM: debe ser UTF-8 sin BOM");
  failed = true;
}

const lessons = parseLessonsCsv(lessonsText);
for (const e of lessons.errors) console.error(`✗ lecciones.csv fila ${e.row} · ${e.field}: ${e.message}`);
const lessonNumbers = new Set(lessons.rows.map((l) => l.number));

const vocab = parseVocabularyCsv(vocabText);
for (const e of vocab.errors) console.error(`✗ vocabulario.csv fila ${e.row} · ${e.field}: ${e.message}`);
let unknownLessons = 0;
for (const { row, word } of vocab.rows) {
  if (word.lessonNumber != null && !lessonNumbers.has(word.lessonNumber)) {
    console.error(
      `✗ vocabulario.csv fila ${row} · lesson: la lección ${word.lessonNumber} no está en lecciones.csv`,
    );
    unknownLessons++;
  }
}

const errors = lessons.errors.length + vocab.errors.length + unknownLessons;
if (errors || failed) {
  console.error(`\n${errors} error(es). Corrige el CSV y vuelve a ejecutar pnpm vocab:validate.`);
  process.exit(1);
}

const byLevel = vocab.rows.reduce<Record<string, number>>((acc, { word }) => {
  acc[word.level] = (acc[word.level] ?? 0) + 1;
  return acc;
}, {});
console.log(`✓ ${lessons.rows.length} lecciones y ${vocab.rows.length} palabras válidas`);
console.log(
  `  por nivel: ${Object.entries(byLevel)
    .map(([k, v]) => `${k}=${v}`)
    .join(", ")}`,
);
console.log(`  ★: ${vocab.rows.filter((r) => r.word.starred).length}`);

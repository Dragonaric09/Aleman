// Valida data/gramatica y data/historias contra el catálogo (pnpm content:validate).
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { parseVocabularyCsv } from "@/modules/transfer";
import { loadContent, validateContent } from "./lib/content";

const root = resolve(import.meta.dirname, "..");
const verbose = process.argv.includes("--verbose");

let content;
try {
  content = loadContent(root);
} catch (err) {
  console.error(`✗ ${(err as Error).message}`);
  process.exit(1);
}
const catalog = parseVocabularyCsv(readFileSync(resolve(root, "data/vocabulario.csv"), "utf8")).rows.map(
  (r) => r.word,
);
const result = validateContent(content, catalog);

for (const s of result.stats) {
  const cov = (s.coverage * 100).toFixed(1);
  console.log(
    `  ${s.id}  ${String(s.words).padStart(3)} palabras · ${String(s.targets).padStart(2)} formas meta · ${s.keywords} clave · cobertura ${cov} %` +
      (verbose && s.unknown.length ? `  [${s.unknown.join(", ")}]` : ""),
  );
}
for (const w of result.warnings) console.warn(`⚠ ${w}`);
if (verbose) for (const u of result.underused) console.warn(`    L${u.lesson} ${u.lemma}: ${u.count}`);
for (const e of result.errors) console.error(`✗ ${e}`);

if (result.errors.length) {
  console.error(`\n${result.errors.length} error(es) en el contenido.`);
  process.exit(1);
}
console.log(`✓ ${content.topics.length} temas y ${content.stories.length} historias válidas`);

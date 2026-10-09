// Carga y validación del contenido de Gramática e Historias (data/gramatica, data/historias).
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { parseTopicFile, type TopicFile } from "@/modules/grammar";
import {
  STORY_PHASES,
  buildKnownForms,
  isKnown,
  keyForLemma,
  normalizeKey,
  parseStoryFile,
  plainText,
  storyCoverage,
  words,
  type ParsedStory,
} from "@/modules/reading";
import type { WordInput } from "@/modules/vocabulary";

export const MIN_WORDS = 80;
export const MAX_WORDS = 150;
export const MIN_COVERAGE = 0.95;
export const MIN_APPEARANCES = 3;

export interface LoadedContent {
  topics: TopicFile[];
  stories: ParsedStory[];
  basicWords: string[];
}

export function loadContent(root: string): LoadedContent {
  const gdir = join(root, "data/gramatica");
  const sdir = join(root, "data/historias");
  const topics = readdirSync(gdir)
    .filter((f) => f.endsWith(".yml"))
    .sort()
    .map((f) => parseTopicFile(readFileSync(join(gdir, f), "utf8"), `data/gramatica/${f}`));
  const stories = readdirSync(sdir)
    .filter((f) => f.endsWith(".md") && !f.startsWith("_"))
    .sort()
    .map((f) => parseStoryFile(readFileSync(join(sdir, f), "utf8"), `data/historias/${f}`));
  const basicWords = readFileSync(join(sdir, "_basico.txt"), "utf8")
    .split(/\r?\n/)
    .filter((l) => l.trim() && !l.trim().startsWith("#"))
    .flatMap((l) => l.trim().split(/\s+/));
  return { topics, stories, basicWords };
}

export interface ValidationResult {
  errors: string[];
  warnings: string[];
  /** Lema real del catálogo para cada clave de palabra clave. */
  lemmaByKey: Map<string, string>;
  stats: {
    id: string;
    words: number;
    targets: number;
    coverage: number;
    unknown: string[];
    keywords: number;
  }[];
  /** Palabras activas de las lecciones con temas disponibles que aparecen menos de 3 veces. */
  underused: { lesson: number; lemma: string; count: number }[];
}

/** Valida el contenido contra el catálogo de vocabulario (sin E/S). */
export function validateContent(content: LoadedContent, catalog: WordInput[]): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const { topics, stories } = content;

  const lemmaByKey = new Map<string, string>();
  for (const w of catalog) lemmaByKey.set(keyForLemma(w.lemma), w.lemma);
  const known = buildKnownForms(catalog, content.basicWords);

  // Temas
  const topicById = new Map<string, TopicFile>();
  for (const t of topics) {
    if (topicById.has(t.id)) errors.push(`tema ${t.id}: id duplicado`);
    topicById.set(t.id, t);
  }
  const slugs = new Set<string>();
  for (const t of topics) {
    if (slugs.has(t.slug)) errors.push(`tema ${t.id}: slug duplicado «${t.slug}»`);
    slugs.add(t.slug);
    for (const p of t.prerequisites)
      if (!topicById.has(p)) errors.push(`tema ${t.id}: requisito desconocido ${p}`);
  }

  // Historias
  const stats: ValidationResult["stats"] = [];
  const seen = new Set<string>();
  for (const s of stories) {
    const where = `historia ${s.id}`;
    if (seen.has(s.id)) errors.push(`${where}: id duplicado`);
    seen.add(s.id);
    const topic = topicById.get(s.topicId);
    if (!topic) {
      errors.push(`${where}: el tema ${s.topicId} no existe`);
      continue;
    }
    if (topic.status !== "available")
      errors.push(`${where}: el tema ${s.topicId} está «planned»; márcalo como «available»`);
    if (!s.id.startsWith(`${s.topicId}-`)) errors.push(`${where}: el id debe empezar por ${s.topicId}-`);

    for (const k of s.keywords) {
      if (!lemmaByKey.has(normalizeKey(k)))
        errors.push(`${where}: la palabra clave «${k}» no existe en vocabulario.csv`);
    }
    if (s.targetCount < topic.minTargets) {
      errors.push(
        `${where}: tiene ${s.targetCount} formas meta y el tema exige al menos ${topic.minTargets}`,
      );
    }
    if (s.wordCount < MIN_WORDS || s.wordCount > MAX_WORDS) {
      errors.push(`${where}: tiene ${s.wordCount} palabras (debe tener entre ${MIN_WORDS} y ${MAX_WORDS})`);
    }
    const cov = storyCoverage(s.body, known);
    if (cov.ratio < MIN_COVERAGE) {
      errors.push(
        `${where}: cobertura léxica ${(cov.ratio * 100).toFixed(1)} % (< ${MIN_COVERAGE * 100} %). Desconocidas: ${cov.unknown.join(", ")}`,
      );
    }
    const ex = s.exercises;
    if (ex.find && s.targetCount === 0) errors.push(`${where}: «find» sin formas meta`);
    if (!ex.truefalse.length) errors.push(`${where}: necesita al menos una pregunta richtig/falsch`);
    if (!ex.cloze.length && !ex.order.length)
      errors.push(`${where}: necesita al menos un ejercicio de producción`);
    stats.push({
      id: s.id,
      words: s.wordCount,
      targets: s.targetCount,
      coverage: cov.ratio,
      unknown: cov.unknown,
      keywords: s.keywords.length,
    });
  }

  // Orden y fases por tema
  for (const t of topics.filter((x) => x.status === "available")) {
    const ts = stories.filter((s) => s.topicId === t.id).sort((a, b) => a.sortOrder - b.sortOrder);
    ts.forEach((s, i) => {
      if (s.sortOrder !== i + 1)
        errors.push(`tema ${t.id}: el orden de las historias debe ser 1..${ts.length} sin huecos`);
      const prev = ts[i - 1];
      if (prev && STORY_PHASES.indexOf(s.phase) < STORY_PHASES.indexOf(prev.phase)) {
        errors.push(
          `tema ${t.id}: ${s.id} (${s.phase}) va después de ${prev.id} (${prev.phase}); las fases no pueden retroceder`,
        );
      }
    });
    if (t.plannedStories && ts.length !== t.plannedStories) {
      warnings.push(`tema ${t.id}: tiene ${ts.length} historias y se planificaron ${t.plannedStories}`);
    }
  }

  // Control léxico: cada palabra activa (A/B) de las lecciones con temas disponibles en ≥ 3 historias
  const lessons = new Set(topics.filter((t) => t.status === "available").flatMap((t) => t.lessons));
  const storyTokens = stories.map((s) => {
    const text = plainText(s.body).toLowerCase();
    return { text, tokens: new Set(words(text)) };
  });
  const underused: ValidationResult["underused"] = [];
  for (const w of catalog) {
    if (w.lessonNumber == null || !lessons.has(w.lessonNumber) || w.level === "C") continue;
    const count = storyTokens.filter((st) => appears(w, st, known)).length;
    if (count < MIN_APPEARANCES) underused.push({ lesson: w.lessonNumber, lemma: w.lemma, count });
  }
  if (underused.length) {
    warnings.push(
      `control léxico: ${underused.length} palabras activas aparecen en menos de ${MIN_APPEARANCES} historias (se completará con los demás temas)`,
    );
  }

  return { errors, warnings, lemmaByKey, stats, underused };
}

function appears(w: WordInput, st: { text: string; tokens: Set<string> }, known: Set<string>) {
  const display = w.lemma
    .replace("|", "")
    .toLowerCase()
    .replace(/[.!?]+$/, "");
  if (display.includes(" ")) return st.text.includes(display.replace(" ...", "").replace("...", "").trim());
  const forms = new Set([display, ...(w.pluralForm ? words(w.pluralForm) : [])]);
  const stems = new Set<string>();
  if (w.lemma.includes("|")) forms.add(w.lemma.split("|")[1]!.toLowerCase()); // biegen … ab
  if (w.thirdPerson) {
    const third = words(w.thirdPerson)[0]!;
    forms.add(third);
    stems.add(third.replace(/e?t$/, "")); // fähr(t) → fährst
  }
  if (w.perfekt) forms.add(words(w.perfekt).at(-1)!);
  if (w.type === "VERB") stems.add(display.replace(/e?n$/, "")); // such(en) → sucht
  for (const t of st.tokens) {
    if (forms.has(t)) return true;
    for (const f of forms) if (t.startsWith(f) && t.length - f.length <= 2 && isKnown(t, known)) return true;
    for (const s of stems) if (s.length >= 3 && t.startsWith(s) && t.length - s.length <= 3) return true;
  }
  return false;
}

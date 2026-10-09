import { checkAnswer, sentenceTiles, type CardWord } from "@/modules/study/shared";
import { parseStoryBody, tokenize } from "./body";
import type { StoryExercises } from "./content";

export interface AttemptAnswers {
  /** Ids de las palabras tocadas en «encuentra las formas». */
  tapped?: number[];
  truefalse: (boolean | null)[];
  cloze: string[];
  order: string[];
}

export type ItemKind = "find" | "truefalse" | "cloze" | "order";

export interface ItemResult {
  kind: ItemKind;
  index: number;
  /** 0..1 */
  score: number;
  expected: string;
  given: string;
  hints: string[];
  explanation?: string;
}

export interface AttemptScore {
  comprehension: number | null;
  production: number | null;
  items: ItemResult[];
  find?: { found: number; total: number; wrong: number };
}

const EMPTY_WORD: CardWord = {
  lemma: "",
  type: "EXPRESSION",
  gender: null,
  pluralForm: null,
  translationEs: "",
  exampleDe: null,
  exampleEs: null,
  clozeText: null,
  separablePrefix: null,
  thirdPerson: null,
  perfekt: null,
  isFalseFriend: false,
  falseFriendNote: null,
  governsCase: null,
};

/** Corrige un hueco con las mismas reglas que las tarjetas (artículo, umlauts, Levenshtein). */
export function checkCloze(text: string, typed: string, strictCapitalization = false) {
  return checkAnswer("CLOZE", { ...EMPTY_WORD, clozeText: text }, typed, { strictCapitalization });
}

/** Corrige el orden de una frase. */
export function checkOrder(sentence: string, typed: string) {
  return checkAnswer("SEPARABLE_ORDER", { ...EMPTY_WORD, exampleDe: sentence }, typed, {
    strictCapitalization: false,
  });
}

const verdictScore = (v: string) => (v === "CORRECT" ? 1 : v === "ALMOST" ? 0.5 : 0);

/**
 * «Encuentra las formas»: una forma meta cuenta como encontrada si se toca cualquiera de sus palabras.
 * Cada palabra tocada fuera de una forma meta resta media forma.
 */
export function scoreFind(body: string, tapped: number[]) {
  const tokens = tokenize(parseStoryBody(body));
  const total = new Set(tokens.filter((t) => t.targetId !== null).map((t) => t.targetId)).size;
  const found = new Set<number>();
  let wrong = 0;
  for (const id of new Set(tapped)) {
    const t = tokens[id];
    if (!t || !t.isWord) continue;
    if (t.targetId !== null) found.add(t.targetId);
    else wrong++;
  }
  const score = total ? Math.max(0, Math.min(1, (found.size - 0.5 * wrong) / total)) : 0;
  return { found: found.size, total, wrong, score };
}

const mean = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);

/** Puntúa un intento (función pura compartida por cliente y servidor). */
export function scoreAttempt(
  story: { body: string; exercises: StoryExercises },
  answers: AttemptAnswers,
  opts: { strictCapitalization?: boolean } = {},
): AttemptScore {
  const ex = story.exercises;
  const items: ItemResult[] = [];
  let find: AttemptScore["find"];

  if (ex.find) {
    const f = scoreFind(story.body, answers.tapped ?? []);
    find = { found: f.found, total: f.total, wrong: f.wrong };
    items.push({
      kind: "find",
      index: 0,
      score: f.score,
      expected: `${f.total} formas`,
      given: `${f.found} encontradas, ${f.wrong} de más`,
      hints: [],
    });
  }
  ex.truefalse.forEach((q, i) => {
    const given = answers.truefalse[i];
    items.push({
      kind: "truefalse",
      index: i,
      score: given === q.answer ? 1 : 0,
      expected: q.answer ? "richtig" : "falsch",
      given: given == null ? "" : given ? "richtig" : "falsch",
      hints: [],
      explanation: q.explanation,
    });
  });
  ex.cloze.forEach((q, i) => {
    const given = answers.cloze[i] ?? "";
    const r = given.trim()
      ? checkCloze(q.text, given, opts.strictCapitalization)
      : { verdict: "WRONG" as const, expected: q.text, hints: [] };
    items.push({
      kind: "cloze",
      index: i,
      score: verdictScore(r.verdict),
      expected: r.expected,
      given,
      hints: r.hints,
    });
  });
  ex.order.forEach((q, i) => {
    const given = answers.order[i] ?? "";
    const r = checkOrder(q.sentence, given);
    items.push({
      kind: "order",
      index: i,
      score: verdictScore(r.verdict),
      expected: sentenceTiles(q.sentence).join(" "),
      given,
      hints: [],
    });
  });

  const comprehension = mean(
    items.filter((i) => i.kind === "find" || i.kind === "truefalse").map((i) => i.score),
  );
  const production = mean(items.filter((i) => i.kind === "cloze" || i.kind === "order").map((i) => i.score));
  return { comprehension, production, items, find };
}

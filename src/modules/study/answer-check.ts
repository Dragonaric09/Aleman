import {
  ARTICLES,
  displayLemma,
  splitAlternatives,
  type CardKind,
  type Rating,
} from "@/modules/vocabulary/shared";
import { clozeAnswer, sentenceTiles, type CardWord } from "./card-content";

export type CheckVerdict = "CORRECT" | "ALMOST" | "WRONG";

export interface CheckResult {
  verdict: CheckVerdict;
  expected: string;
  hints: string[];
}

export interface CheckOptions {
  strictCapitalization: boolean;
}

export const HINT_ARTICLE = "Falta o falla el artículo";
export const HINT_NOUN_CAPS = "Los sustantivos van con mayúscula";
export const HINT_CAPS = "Revisa las mayúsculas";
export const HINT_UMLAUT = "Usa ä ö ü ß";
export const HINT_SINGULAR = "Esa es la forma singular: escribe el plural";
export const HINT_AUX = "Revisa el auxiliar del Perfekt (haben / sein)";

const RANK: Record<CheckVerdict, number> = { CORRECT: 0, ALMOST: 1, WRONG: 2 };

/** NFC, trim, espacios múltiples → uno, quita . ! ? finales, comillas tipográficas → rectas. */
export function normalizeAnswer(s: string): string {
  return s
    .normalize("NFC")
    .replace(/[“”„«»]/g, '"')
    .replace(/[‘’‚]/g, "'")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/[.!?]+$/u, "")
    .trim();
}

/** Distancia de Levenshtein (inserción, borrado, sustitución). */
export function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const cur = [i];
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      cur[j] = Math.min(prev[j]! + 1, cur[j - 1]! + 1, prev[j - 1]! + cost);
    }
    prev = cur;
  }
  return prev[b.length]!;
}

function transliterate(s: string): string {
  return s.toLowerCase().replace(/ä/g, "ae").replace(/ö/g, "oe").replace(/ü/g, "ue").replace(/ß/g, "ss");
}

/** Umbral de Levenshtein para alemán: 1 si la palabra tiene 4..9 letras, 2 si tiene 10 o más. */
function germanTolerance(expected: string): number {
  const len = expected.replace(/\s/g, "").length;
  if (len >= 10) return 2;
  if (len >= 4) return 1;
  return 0;
}

/** Reglas 3–6 para una respuesta alemana ya sin artículo. */
function compareGerman(typed: string, expected: string, opts: CheckOptions, isNoun: boolean): CheckResult {
  const hints: string[] = [];
  if (typed === expected) return { verdict: "CORRECT", expected, hints };
  // 3. Solo difiere en mayúsculas
  if (typed.toLowerCase() === expected.toLowerCase()) {
    if (opts.strictCapitalization)
      return { verdict: "ALMOST", expected, hints: [isNoun ? HINT_NOUN_CAPS : HINT_CAPS] };
    return { verdict: "CORRECT", expected, hints: [isNoun ? HINT_NOUN_CAPS : HINT_CAPS] };
  }
  // 4. Escribió ae/oe/ue/ss en lugar de ä/ö/ü/ß
  if (transliterate(typed) === transliterate(expected))
    return { verdict: "ALMOST", expected, hints: [HINT_UMLAUT] };
  // 5. Distancia de Levenshtein
  const tol = germanTolerance(expected);
  if (tol > 0 && levenshtein(typed.toLowerCase(), expected.toLowerCase()) <= tol) {
    return { verdict: "ALMOST", expected, hints };
  }
  // 6. En otro caso
  return { verdict: "WRONG", expected, hints };
}

const ARTICLE_RE = /^(der|die|das)\s+(.+)$/i;

function checkNounWithArticle(typed: string, w: CardWord, opts: CheckOptions): CheckResult {
  const article = w.gender ? ARTICLES[w.gender] : "";
  const noun = displayLemma(w.lemma);
  const expected = `${article} ${noun}`;
  const m = ARTICLE_RE.exec(typed);
  // 2. Artículo distinto o ausente
  if (!m || m[1]!.toLowerCase() !== article) return { verdict: "WRONG", expected, hints: [HINT_ARTICLE] };
  const r = compareGerman(m[2]!, noun, opts, true);
  return { ...r, expected };
}

function checkPlural(typed: string, w: CardWord, opts: CheckOptions): CheckResult {
  const plural = w.pluralForm ?? "";
  const bare = typed.replace(/^die\s+/i, "");
  const singular = displayLemma(w.lemma);
  if (plural !== singular && bare.toLowerCase() === singular.toLowerCase()) {
    return { verdict: "WRONG", expected: plural, hints: [HINT_SINGULAR] };
  }
  return { ...compareGerman(bare, plural, opts, true), expected: plural };
}

const PRONOUN_RE = /^(er|sie|es)\s+/i;
const AUX_RE = /^(hat|ist)\s+(.+)$/i;

function checkVerbForms(typed: string, w: CardWord, opts: CheckOptions): CheckResult {
  const third = w.thirdPerson ?? "";
  const perfekt = w.perfekt ?? "";
  const expected = `${third} / ${perfekt}`;
  const parts = typed.split("/").map((p) => normalizeAnswer(p));
  if (parts.length !== 2 || !parts[0] || !parts[1])
    return { verdict: "WRONG", expected, hints: ["Escribe las dos formas"] };

  const r1 = compareGerman(parts[0].replace(PRONOUN_RE, ""), third, opts, false);
  const hints = [...r1.hints];
  let r2: CheckResult;
  const typedAux = AUX_RE.exec(parts[1].replace(PRONOUN_RE, ""));
  const expectedAux = AUX_RE.exec(perfekt);
  if (typedAux && expectedAux && typedAux[1]!.toLowerCase() !== expectedAux[1]!.toLowerCase()) {
    r2 = { verdict: "WRONG", expected: perfekt, hints: [HINT_AUX] };
  } else {
    r2 = compareGerman(parts[1].replace(PRONOUN_RE, ""), perfekt, opts, false);
  }
  hints.push(...r2.hints.map((h) => (h === HINT_AUX ? h : `Perfekt: ${h.toLowerCase()}`)));
  if (r1.verdict === "WRONG") hints.unshift("Revisa la tercera persona");
  const verdict = RANK[r1.verdict] >= RANK[r2.verdict] ? r1.verdict : r2.verdict;
  return { verdict, expected, hints: [...new Set(hints)] };
}

/** Normalización para respuestas en español: sin mayúsculas, tildes, artículos iniciales ni «se» final. */
export function normalizeSpanish(s: string): string {
  let out = normalizeAnswer(s)
    .toLowerCase()
    .replace(/\([^)]*\)/g, " ")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[¿?¡!.,;:"']/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  out = out.replace(/^(el|la|los|las|un|una|unos|unas)\s+/, "");
  out = out.replace(/^(\p{L}+(?:ar|er|ir))se\b/u, "$1");
  return out.trim();
}

function checkSpanish(typed: string, w: CardWord): CheckResult {
  const expected = w.translationEs;
  const t = normalizeSpanish(typed);
  const alternatives = splitAlternatives(w.translationEs).map(normalizeSpanish).filter(Boolean);
  if (alternatives.includes(t)) return { verdict: "CORRECT", expected, hints: [] };
  const close = alternatives.some((alt) => alt.length >= 4 && levenshtein(t, alt) <= 2);
  return { verdict: close ? "ALMOST" : "WRONG", expected, hints: [] };
}

/** Corrige una respuesta escrita. Función pura compartida por cliente y servidor (sección 7.6). */
export function checkAnswer(
  kind: CardKind,
  word: CardWord,
  typedRaw: string,
  opts: CheckOptions,
): CheckResult {
  const typed = normalizeAnswer(typedRaw);
  switch (kind) {
    case "DE_TO_ES":
      return checkSpanish(typed, word);
    case "ES_TO_DE": {
      if (word.type === "NOUN") return checkNounWithArticle(typed, word, opts);
      const expected = displayLemma(word.lemma);
      // Verbos: se acepta el infinitivo con o sin barra ("abbiegen" / "ab|biegen").
      return compareGerman(typed.replace(/\|/g, ""), expected, opts, false);
    }
    case "PLURAL":
      return checkPlural(typed, word, opts);
    case "VERB_FORMS":
      return checkVerbForms(typedRaw, word, opts);
    case "SEPARABLE_ORDER": {
      const expected = word.exampleDe ?? "";
      const ok = sentenceTiles(typed).join(" ") === sentenceTiles(normalizeAnswer(expected)).join(" ");
      return { verdict: ok ? "CORRECT" : "WRONG", expected, hints: [] };
    }
    case "CLOZE": {
      const expected = word.clozeText ? clozeAnswer(word.clozeText) : "";
      return compareGerman(typed, normalizeAnswer(expected), opts, false);
    }
  }
}

/** Calificación sugerida: CORRECT → GOOD, ALMOST → HARD, WRONG → AGAIN. */
export function suggestedRating(verdict: CheckVerdict): Rating {
  return verdict === "CORRECT" ? "GOOD" : verdict === "ALMOST" ? "HARD" : "AGAIN";
}

export type DiffPart = { text: string; type: "same" | "missing" | "extra" };

/** Diff carácter a carácter (para mostrar en ALMOST/WRONG). */
export function charDiff(typed: string, expected: string): DiffPart[] {
  const a = typed;
  const b = expected;
  const dp: number[][] = Array.from({ length: a.length + 1 }, () => new Array<number>(b.length + 1).fill(0));
  for (let i = a.length - 1; i >= 0; i--)
    for (let j = b.length - 1; j >= 0; j--)
      dp[i]![j] = a[i] === b[j] ? dp[i + 1]![j + 1]! + 1 : Math.max(dp[i + 1]![j]!, dp[i]![j + 1]!);
  const parts: DiffPart[] = [];
  const push = (text: string, type: DiffPart["type"]) => {
    const last = parts[parts.length - 1];
    if (last && last.type === type) last.text += text;
    else parts.push({ text, type });
  };
  let i = 0;
  let j = 0;
  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) {
      push(a[i]!, "same");
      i++;
      j++;
    } else if (dp[i + 1]![j]! >= dp[i]![j + 1]!) push(a[i++]!, "extra");
    else push(b[j++]!, "missing");
  }
  while (i < a.length) push(a[i++]!, "extra");
  while (j < b.length) push(b[j++]!, "missing");
  return parts;
}

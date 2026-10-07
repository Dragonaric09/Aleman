/**
 * API pública del módulo vocabulary apta para el cliente (sin E/S ni Prisma).
 * Los tipos replican los enums de Prisma como uniones de texto.
 */

export const WORD_TYPES = ["NOUN", "VERB", "ADJECTIVE", "ADVERB", "PREPOSITION", "PRONOUN", "EXPRESSION", "OTHER"] as const;
export type WordType = (typeof WORD_TYPES)[number];

export const GENDERS = ["DER", "DIE", "DAS"] as const;
export type Gender = (typeof GENDERS)[number];

export const LEVELS = ["A", "B", "C"] as const;
export type Level = (typeof LEVELS)[number];

export const GOETHE_LEVELS = ["A1", "A2", "B1"] as const;
export type GoetheLevel = (typeof GOETHE_LEVELS)[number];

export const AUXILIARIES = ["HABEN", "SEIN"] as const;
export type Auxiliary = (typeof AUXILIARIES)[number];

export const CARD_KINDS = ["ES_TO_DE", "DE_TO_ES", "PLURAL", "VERB_FORMS", "SEPARABLE_ORDER", "CLOZE"] as const;
export type CardKind = (typeof CARD_KINDS)[number];

export const CARD_STATES = ["NEW", "LEARNING", "REVIEW", "RELEARNING"] as const;
export type CardState = (typeof CARD_STATES)[number];

export const RATINGS = ["AGAIN", "HARD", "GOOD", "EASY"] as const;
export type Rating = (typeof RATINGS)[number];

export type AnswerVerdict = "CORRECT" | "ALMOST" | "WRONG" | "SELF_GRADED";

export const WORD_TYPE_LABELS: Record<WordType, string> = {
  NOUN: "sustantivo",
  VERB: "verbo",
  ADJECTIVE: "adjetivo",
  ADVERB: "adverbio",
  PREPOSITION: "preposición",
  PRONOUN: "pronombre",
  EXPRESSION: "expresión",
  OTHER: "otro",
};

export const CARD_KIND_LABELS: Record<CardKind, string> = {
  ES_TO_DE: "Español → alemán",
  DE_TO_ES: "Alemán → español",
  PLURAL: "Plural",
  VERB_FORMS: "Formas verbales",
  SEPARABLE_ORDER: "Orden (verbo separable)",
  CLOZE: "Completar la frase",
};

export const CARD_STATE_LABELS: Record<CardState, string> = {
  NEW: "nueva",
  LEARNING: "aprendiendo",
  REVIEW: "repaso",
  RELEARNING: "reaprendiendo",
};

export const RATING_LABELS: Record<Rating, string> = {
  AGAIN: "Otra vez",
  HARD: "Difícil",
  GOOD: "Bien",
  EASY: "Fácil",
};

export const LEVEL_LABELS: Record<Level, string> = {
  A: "A · alta frecuencia",
  B: "B · clave en los textos",
  C: "C · específico",
};

export const ARTICLES: Record<Gender, "der" | "die" | "das"> = { DER: "der", DIE: "die", DAS: "das" };

/** Colores fijos de género (sección 2). Siempre acompañados del artículo escrito. */
export const GENDER_COLORS: Record<Gender | "PLURAL", string> = {
  DER: "#2563EB",
  DIE: "#DC2626",
  DAS: "#16A34A",
  PLURAL: "#6B7280",
};

/** Normaliza texto: Unicode NFC, sin espacios sobrantes. */
export function normalizeText(s: string): string {
  return s.normalize("NFC").replace(/\s+/g, " ").trim();
}

/** "ab|biegen" → "abbiegen". */
export function displayLemma(lemma: string): string {
  return lemma.replace(/\|/g, "");
}

export interface DisplayableWord {
  lemma: string;
  type: WordType;
  gender: Gender | null;
}

/** Forma de cita: "der Bahnhof", "abbiegen", "Wie komme ich zum ...?". */
export function citationForm(word: DisplayableWord): string {
  const lemma = displayLemma(word.lemma);
  if (word.type === "NOUN" && word.gender) return `${ARTICLES[word.gender]} ${lemma}`;
  return lemma;
}

/** Divide las alternativas de traducción separadas por " / ". */
export function splitAlternatives(translationEs: string): string[] {
  return translationEs
    .split(" / ")
    .map((s) => s.trim())
    .filter(Boolean);
}

/** Etiqueta del tipo que acompaña a la pregunta español → alemán. */
export function typeHint(word: { type: WordType; separablePrefix?: string | null }): string {
  switch (word.type) {
    case "NOUN":
      return "sustantivo – con artículo";
    case "VERB":
      return word.separablePrefix ? "verbo separable – infinitivo" : "verbo – infinitivo";
    default:
      return WORD_TYPE_LABELS[word.type];
  }
}

import {
  ARTICLES,
  citationForm,
  displayLemma,
  typeHint,
  type CardKind,
  type Gender,
  type WordType,
} from "@/modules/vocabulary/shared";

/** Datos de la palabra que necesita una tarjeta (cliente y servidor). */
export interface CardWord {
  lemma: string;
  type: WordType;
  gender: Gender | null;
  pluralForm: string | null;
  translationEs: string;
  exampleDe: string | null;
  exampleEs: string | null;
  clozeText: string | null;
  separablePrefix: string | null;
  thirdPerson: string | null;
  perfekt: string | null;
  isFalseFriend: boolean;
  falseFriendNote: string | null;
  governsCase: string | null;
}

const CLOZE_RE = /\{\{([^{}]+)\}\}/;

/** Texto esperado en el hueco de una frase cloze. */
export function clozeAnswer(clozeText: string): string {
  return CLOZE_RE.exec(clozeText)?.[1] ?? "";
}

/** Frase cloze con el hueco vacío. */
export function clozeWithBlank(clozeText: string): string {
  return clozeText.replace(CLOZE_RE, "_____");
}

/** Respuesta esperada (forma canónica que se muestra al corregir). */
export function expectedAnswer(kind: CardKind, w: CardWord): string {
  switch (kind) {
    case "ES_TO_DE":
      return citationForm(w);
    case "DE_TO_ES":
      return w.translationEs;
    case "PLURAL":
      return w.pluralForm ?? "";
    case "VERB_FORMS":
      return `${w.thirdPerson ?? ""} / ${w.perfekt ?? ""}`;
    case "SEPARABLE_ORDER":
      return w.exampleDe ?? "";
    case "CLOZE":
      return w.clozeText ? clozeAnswer(w.clozeText) : "";
  }
}

export interface CardPrompt {
  /** Texto principal del anverso. */
  title: string;
  /** Subtítulo (etiqueta del tipo, traducción de la frase, etc.). */
  subtitle?: string;
  /** Si el anverso muestra un lema alemán con color de género. */
  showGender?: boolean;
  /** Fichas desordenadas para SEPARABLE_ORDER. */
  tiles?: string[];
  /** Etiquetas de los campos de respuesta (VERB_FORMS usa dos). */
  fields: string[];
  /** Se permite revelar sin escribir (solo reconocimiento). */
  allowReveal: boolean;
  /** Idioma de la respuesta (para el atributo lang del campo). */
  answerLang: "de" | "es";
}

/** Barajado determinista (mismo resultado en servidor y cliente) que evita dejar la frase en orden. */
export function shuffleTiles(words: string[], seed: string): string[] {
  let h = 2166136261;
  for (const ch of seed) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
  const out = [...words];
  for (let i = out.length - 1; i > 0; i--) {
    h = Math.imul(h ^ (h >>> 15), 2246822507) >>> 0;
    const j = h % (i + 1);
    [out[i], out[j]] = [out[j]!, out[i]!];
  }
  if (out.length > 1 && out.join(" ") === words.join(" ")) out.push(out.shift()!);
  return out;
}

/** Palabras de la frase de ejemplo sin la puntuación final. */
export function sentenceTiles(sentence: string): string[] {
  return sentence
    .replace(/[.!?]+$/u, "")
    .split(/\s+/)
    .filter(Boolean);
}

/** Contenido del anverso según la tabla 7.1. */
export function buildPrompt(kind: CardKind, w: CardWord, seed = ""): CardPrompt {
  const lemma = displayLemma(w.lemma);
  switch (kind) {
    case "ES_TO_DE":
      // Si es falso amigo, NO se avisa en el anverso.
      return {
        title: w.translationEs,
        subtitle: typeHint(w),
        fields: ["Respuesta en alemán"],
        allowReveal: false,
        answerLang: "de",
      };
    case "DE_TO_ES":
      return {
        title: w.type === "NOUN" ? citationForm(w) : lemma,
        subtitle: w.governsCase ? `rige ${w.governsCase}` : undefined,
        showGender: w.type === "NOUN",
        fields: ["Respuesta en español"],
        allowReveal: true,
        answerLang: "es",
      };
    case "PLURAL":
      return {
        title: `${w.gender ? ARTICLES[w.gender] : ""} ${lemma} → die …`.trim(),
        subtitle: "Escribe el plural",
        showGender: true,
        fields: ["Plural"],
        allowReveal: false,
        answerLang: "de",
      };
    case "VERB_FORMS":
      return {
        title: `${lemma}: er … / Perfekt: …`,
        subtitle: w.translationEs,
        fields: ["er / sie / es …", "Perfekt"],
        allowReveal: false,
        answerLang: "de",
      };
    case "SEPARABLE_ORDER":
      return {
        title: w.exampleEs ?? w.translationEs,
        subtitle: `Ordena la frase con «${lemma}»`,
        tiles: shuffleTiles(sentenceTiles(w.exampleDe ?? ""), seed || w.lemma),
        fields: ["Frase"],
        allowReveal: false,
        answerLang: "de",
      };
    case "CLOZE":
      return {
        title: w.clozeText ? clozeWithBlank(w.clozeText) : lemma,
        subtitle: w.exampleEs ?? w.translationEs,
        fields: ["Texto que falta"],
        allowReveal: false,
        answerLang: "de",
      };
  }
}

/** Tarjetas de producción: exigen escribir antes de revelar. */
export function isProductionKind(kind: CardKind): boolean {
  return kind !== "DE_TO_ES";
}

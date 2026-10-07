import { z } from "zod";
import { AUXILIARIES, GENDERS, GOETHE_LEVELS, LEVELS, WORD_TYPES, normalizeText, splitAlternatives } from "./shared";

/** Texto normalizado (NFC, sin espacios sobrantes); vacío → null. */
const optText = (max = 500) =>
  z
    .string()
    .max(max, `máximo ${max} caracteres`)
    .nullish()
    .transform((v) => {
      if (v == null) return null;
      const n = normalizeText(v);
      return n === "" ? null : n;
    });

const reqText = (max = 300) =>
  z
    .string({ message: "es obligatorio" })
    .transform((v) => normalizeText(v))
    .pipe(z.string().min(1, "es obligatorio").max(max, `máximo ${max} caracteres`));

const textList = z
  .array(z.string())
  .default([])
  .transform((arr) => [...new Set(arr.map((s) => normalizeText(s)).filter(Boolean))]);

const CLOZE_RE = /\{\{([^{}]+)\}\}/g;

/** Cuenta los huecos {{...}} de una frase cloze. */
export function clozeGaps(text: string): string[] {
  return [...text.matchAll(CLOZE_RE)].map((m) => m[1] ?? "");
}

/** Entrada de una palabra (formularios, CSV, semilla). Aplica las reglas de integridad 6.2. */
export const wordInputSchema = z
  .object({
    lemma: reqText(200),
    type: z.enum(WORD_TYPES, { message: "tipo de palabra inválido" }),
    gender: z.enum(GENDERS, { message: "género inválido" }).nullish().transform((v) => v ?? null),
    pluralSuffix: optText(20),
    pluralForm: optText(100),
    noPlural: z.boolean().default(false),
    translationEs: reqText(300),
    exampleDe: optText(),
    exampleEs: optText(),
    clozeText: optText(),
    level: z.enum(LEVELS, { message: "nivel inválido (A, B o C)" }),
    starred: z.boolean().default(false),
    goetheLevel: z.enum(GOETHE_LEVELS, { message: "nivel Goethe inválido" }).nullish().transform((v) => v ?? null),
    frequencyRank: z.number().int().positive("debe ser un entero positivo").nullish().transform((v) => v ?? null),
    lessonNumber: z.number().int().positive().nullish().transform((v) => v ?? null),
    sources: textList,
    isCognate: z.boolean().default(false),
    isFalseFriend: z.boolean().default(false),
    falseFriendNote: optText(),
    separablePrefix: optText(20),
    thirdPerson: optText(100),
    perfekt: optText(100),
    auxiliary: z.enum(AUXILIARIES, { message: "auxiliar inválido" }).nullish().transform((v) => v ?? null),
    isIrregular: z.boolean().default(false),
    governsCase: optText(30),
    tags: textList,
  })
  .superRefine((w, ctx) => {
    const issue = (path: string, message: string) => ctx.addIssue({ code: "custom", path: [path], message });

    if (w.type === "NOUN") {
      if (!w.gender) issue("gender", "un sustantivo necesita género (der, die o das)");
      if (!w.pluralForm && !w.noPlural) issue("pluralForm", "indica el plural o marca «sin plural»");
      const first = w.lemma.charAt(0);
      if (first && first !== first.toUpperCase()) issue("lemma", "un sustantivo empieza con mayúscula");
    } else if (w.gender) {
      issue("gender", "solo los sustantivos tienen género");
    }

    if (w.type === "VERB" && w.separablePrefix) {
      const [prefix, rest] = w.lemma.split("|");
      if (!rest || prefix !== w.separablePrefix) {
        issue("lemma", `un verbo separable se escribe con barra: «${w.separablePrefix}|…»`);
      }
      if (!w.thirdPerson) issue("thirdPerson", "un verbo separable necesita la tercera persona («biegt ab»)");
    }
    if (w.lemma.includes("|") && !(w.type === "VERB" && w.separablePrefix)) {
      issue("separablePrefix", "la barra en el lema solo se usa en verbos separables con prefijo");
    }

    if (w.type === "EXPRESSION") {
      if (!w.clozeText) issue("clozeText", "una expresión necesita la frase con hueco {{...}}");
      else if (clozeGaps(w.clozeText).length !== 1) issue("clozeText", "la frase debe tener exactamente un hueco {{...}}");
    }
    if (w.clozeText && w.type !== "EXPRESSION" && clozeGaps(w.clozeText).length !== 1) {
      issue("clozeText", "la frase debe tener exactamente un hueco {{...}}");
    }

    const alternatives = splitAlternatives(w.translationEs);
    if (alternatives.length === 0) issue("translationEs", "la traducción no puede estar vacía");
    if (alternatives.length > 5) issue("translationEs", "máximo 5 alternativas separadas por « / »");

    if (w.isFalseFriend && !w.falseFriendNote) issue("falseFriendNote", "explica el falso amigo en la nota");
  });

export type WordInput = z.output<typeof wordInputSchema>;
export type WordInputRaw = z.input<typeof wordInputSchema>;

export const noteInputSchema = z.object({
  mnemonic: optText(1000),
  ownSentence: optText(1000),
});
export type NoteInput = z.output<typeof noteInputSchema>;

export const wordFiltersSchema = z.object({
  q: z.string().trim().max(100).optional().default(""),
  level: z.enum(LEVELS).optional(),
  type: z.enum(WORD_TYPES).optional(),
  lesson: z.coerce.number().int().optional(),
  gender: z.enum(GENDERS).optional(),
  status: z.enum(["new", "learning", "review", "suspended", "leech"]).optional(),
  falseFriend: z.coerce.boolean().optional(),
  scope: z.enum(["own", "global"]).optional(),
  page: z.coerce.number().int().min(1).default(1),
});
export type WordFilters = z.output<typeof wordFiltersSchema>;

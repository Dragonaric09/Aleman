import { z } from "zod";
import { CARD_KINDS, CARD_STATES, RATINGS, WORD_TYPES } from "@/modules/vocabulary/shared";

export const MAX_CSV_BYTES = 2 * 1024 * 1024;
export const MAX_JSON_BYTES = 20 * 1024 * 1024;
export const RESTORE_CONFIRMATION = "RESTAURAR";

export const exportFormatSchema = z.enum(["csv", "anki", "json"], { message: "formato inválido (csv, anki o json)" });

/** Referencia estable a una palabra (los ids pueden cambiar entre instalaciones). */
const wordRef = z.object({
  scope: z.enum(["global", "own"]),
  lemma: z.string().min(1),
  type: z.enum(WORD_TYPES),
});
export type WordRef = z.infer<typeof wordRef>;

const isoDate = z.string().refine((s) => !Number.isNaN(Date.parse(s)), "fecha inválida");

export const backupSchema = z.object({
  version: z.literal(1, { message: "versión de copia no soportada" }),
  exportedAt: isoDate,
  settings: z.record(z.string(), z.unknown()),
  ownWords: z.array(z.record(z.string(), z.unknown())),
  cards: z.array(
    z.object({
      ref: z.string().min(1),
      word: wordRef,
      kind: z.enum(CARD_KINDS),
      state: z.enum(CARD_STATES),
      due: isoDate,
      stability: z.number(),
      difficulty: z.number(),
      elapsedDays: z.number().int(),
      scheduledDays: z.number().int(),
      learningSteps: z.number().int(),
      reps: z.number().int(),
      lapses: z.number().int(),
      lastReview: isoDate.nullable(),
      introducedAt: isoDate.nullable(),
      suspended: z.boolean(),
      isLeech: z.boolean(),
    }),
  ),
  reviewLogs: z.array(
    z.object({
      cardRef: z.string().min(1),
      rating: z.enum(RATINGS),
      verdict: z.enum(["CORRECT", "ALMOST", "WRONG", "SELF_GRADED"]),
      typedAnswer: z.string().nullable(),
      durationMs: z.number().int(),
      stateBefore: z.enum(CARD_STATES),
      cardBefore: z.unknown(),
      scheduledDays: z.number().int(),
      reviewedAt: isoDate,
      studyDay: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      isNewCard: z.boolean(),
    }),
  ),
  notes: z.array(
    z.object({
      word: wordRef,
      mnemonic: z.string().nullable(),
      ownSentence: z.string().nullable(),
    }),
  ),
});
export type Backup = z.infer<typeof backupSchema>;

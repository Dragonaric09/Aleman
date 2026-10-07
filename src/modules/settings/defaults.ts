import type { CardKind } from "@/modules/vocabulary/shared";

export const DEFAULT_SETTINGS = {
  newCardsPerDay: 12,
  maxReviewsPerDay: 200,
  reviewBacklogCap: 120,
  desiredRetention: 0.9,
  maximumIntervalDays: 365,
  dayStartsAtHour: 4,
  timezone: "America/La_Paz",
  enabledCardKinds: [
    "ES_TO_DE",
    "DE_TO_ES",
    "PLURAL",
    "VERB_FORMS",
    "SEPARABLE_ORDER",
    "CLOZE",
  ] as CardKind[],
  ttsEnabled: true,
  ttsAutoplay: false,
  ttsRate: 0.9,
  ttsVoice: null as string | null,
  strictCapitalization: false,
  leechThreshold: 6,
  leechAutoSuspend: false,
};

export type Settings = typeof DEFAULT_SETTINGS;

/** Rangos válidos (se usan en la validación y en el formulario de /ajustes). */
export const SETTINGS_RANGES = {
  newCardsPerDay: { min: 5, max: 30, step: 1 },
  maxReviewsPerDay: { min: 50, max: 999, step: 1 },
  reviewBacklogCap: { min: 20, max: 999, step: 1 },
  desiredRetention: { min: 0.8, max: 0.95, step: 0.01 },
  maximumIntervalDays: { min: 30, max: 36500, step: 1 },
  dayStartsAtHour: { min: 0, max: 23, step: 1 },
  ttsRate: { min: 0.5, max: 1.2, step: 0.05 },
  leechThreshold: { min: 3, max: 20, step: 1 },
} as const;

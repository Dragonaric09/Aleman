import { z } from "zod";
import { CARD_KINDS } from "@/modules/vocabulary/shared";
import { SETTINGS_RANGES as R } from "./defaults";

const range = (key: keyof typeof R, int = true) => {
  const base = int ? z.coerce.number().int("debe ser un número entero") : z.coerce.number();
  return base
    .min(R[key].min, `mínimo ${String(R[key].min).replace(".", ",")}`)
    .max(R[key].max, `máximo ${String(R[key].max).replace(".", ",")}`);
};

function isValidTimezone(tz: string) {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

export const settingsSchema = z.object({
  newCardsPerDay: range("newCardsPerDay"),
  maxReviewsPerDay: range("maxReviewsPerDay"),
  reviewBacklogCap: range("reviewBacklogCap"),
  desiredRetention: range("desiredRetention", false),
  maximumIntervalDays: range("maximumIntervalDays"),
  dayStartsAtHour: range("dayStartsAtHour"),
  timezone: z.string().trim().refine(isValidTimezone, "zona horaria desconocida"),
  enabledCardKinds: z
    .array(z.enum(CARD_KINDS))
    .min(1, "activa al menos un tipo de tarjeta")
    .refine((k) => k.includes("ES_TO_DE") || k.includes("DE_TO_ES") || k.includes("CLOZE"), "activa al menos una tarjeta principal"),
  ttsEnabled: z.boolean(),
  ttsAutoplay: z.boolean(),
  ttsRate: range("ttsRate", false),
  ttsVoice: z
    .string()
    .trim()
    .max(200)
    .nullish()
    .transform((v) => (v ? v : null)),
  strictCapitalization: z.boolean(),
  leechThreshold: range("leechThreshold"),
  leechAutoSuspend: z.boolean(),
});

export type SettingsInput = z.output<typeof settingsSchema>;

import { prisma, type Tx } from "@/server/db";
import { DEFAULT_SETTINGS, type Settings } from "./defaults";
import { settingsSchema } from "./schemas";

function toSettings(row: Settings & Record<string, unknown>): Settings {
  return {
    newCardsPerDay: row.newCardsPerDay,
    maxReviewsPerDay: row.maxReviewsPerDay,
    reviewBacklogCap: row.reviewBacklogCap,
    desiredRetention: row.desiredRetention,
    maximumIntervalDays: row.maximumIntervalDays,
    dayStartsAtHour: row.dayStartsAtHour,
    timezone: row.timezone,
    enabledCardKinds: row.enabledCardKinds,
    ttsEnabled: row.ttsEnabled,
    ttsAutoplay: row.ttsAutoplay,
    ttsRate: row.ttsRate,
    ttsVoice: row.ttsVoice,
    strictCapitalization: row.strictCapitalization,
    leechThreshold: row.leechThreshold,
    leechAutoSuspend: row.leechAutoSuspend,
  };
}

/** Ajustes del usuario; si no existen, se crean con los valores por defecto. */
export async function getSettings(userId: string, tx: Tx = prisma): Promise<Settings> {
  const row = await tx.userSettings.upsert({ where: { userId }, update: {}, create: { userId } });
  return toSettings(row);
}

export async function createDefaultSettings(userId: string, tx: Tx = prisma, timezone?: string) {
  await tx.userSettings.create({ data: { userId, ...(timezone ? { timezone } : {}) } });
}

export async function updateSettings(userId: string, input: unknown): Promise<Settings> {
  const data = settingsSchema.parse(input);
  const row = await prisma.userSettings.upsert({
    where: { userId },
    update: data,
    create: { userId, ...data },
  });
  return toSettings(row);
}

export { DEFAULT_SETTINGS };

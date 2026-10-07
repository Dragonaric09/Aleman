import { ensureUser } from "@/modules/auth";
import { updateSettings, getSettings } from "@/modules/settings";
import { expectedAnswer, getQueue, submitReview, type QueueItem } from "@/modules/study";
import { prisma } from "@/server/db";

export async function makeUser(email = `u${Math.random().toString(36).slice(2, 8)}@test.dev`) {
  const { user } = await ensureUser(email, "contraseña-segura-123", email.split("@")[0]!);
  return user;
}

export async function patchSettings(userId: string, patch: Record<string, unknown>) {
  const current = await getSettings(userId);
  return updateSettings(userId, { ...current, ...patch });
}

/** Respuesta correcta para una tarjeta de la cola. */
export function correctAnswer(item: QueueItem): string {
  const exp = expectedAnswer(item.card.kind, item.word);
  if (item.card.kind === "DE_TO_ES")
    return exp
      .split(" / ")[0]!
      .replace(/\(.*?\)/g, "")
      .trim();
  return exp;
}

export async function answer(
  userId: string,
  item: QueueItem,
  rating: "AGAIN" | "HARD" | "GOOD" | "EASY",
  now: Date,
) {
  return submitReview(
    userId,
    { cardId: item.card.id, rating, typedAnswer: correctAnswer(item), durationMs: 4000 },
    now,
  );
}

/** Estudia todo lo que ofrece la cola en este instante. */
export async function studyAll(userId: string, now: Date, rating: "GOOD" | "EASY" = "EASY", max = 200) {
  let done = 0;
  for (;;) {
    const [item] = await getQueue(userId, now, 1);
    if (!item || done >= max) return done;
    await answer(userId, item, rating, now);
    done++;
  }
}

export async function globalWord(lemma: string, type = "NOUN") {
  return prisma.word.findFirstOrThrow({ where: { scope: "global", lemma, type: type as never } });
}

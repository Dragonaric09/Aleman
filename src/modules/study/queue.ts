import type { CardState } from "@/modules/vocabulary/shared";

export interface QueueCard {
  id: string;
  wordId: string;
  state: CardState;
  due: Date;
}

export interface QueueSettings {
  newCardsPerDay: number;
  maxReviewsPerDay: number;
  reviewBacklogCap: number;
}

export interface BuildQueueInput<T extends QueueCard> {
  now: Date;
  settings: QueueSettings;
  dayStart: Date;
  dayEnd: Date;
  /** state LEARNING|RELEARNING, due <= now + 20 min */
  learningDue: T[];
  /** state REVIEW, due < dayEnd */
  reviewDue: T[];
  /** state NEW, elegibles (ver reglas), ordenadas por prioridad */
  newCandidates: T[];
  reviewsDoneToday: number;
  newIntroducedToday: number;
  /** palabras ya respondidas hoy (para separar hermanas) */
  wordsSeenToday: Set<string>;
  /** tarjetas ya respondidas hoy: una tarjeta en aprendizaje sigue apareciendo aunque su palabra esté vista */
  cardsSeenToday?: Set<string>;
}

export const LEARNING_LOOKAHEAD_MS = 20 * 60_000;

/** Cola diaria (sección 7.4). Función pura: no hace E/S. */
export function buildQueue<T extends QueueCard>(input: BuildQueueInput<T>): T[] {
  const { now, settings, wordsSeenToday } = input;
  const cardsSeen = input.cardsSeenToday ?? new Set<string>();
  const siblingBlocked = (c: T) => wordsSeenToday.has(c.wordId) && !cardsSeen.has(c.id);

  // 1. learning = learningDue ordenadas por due ASC
  const learning = input.learningDue
    .filter((c) => !siblingBlocked(c))
    .sort((a, b) => a.due.getTime() - b.due.getTime());

  // 2. reviews = reviewDue ordenadas por due ASC, excluyendo palabras vistas hoy, con tope diario
  const reviewLimit = Math.max(0, settings.maxReviewsPerDay - input.reviewsDoneToday);
  const reviewWords = new Set<string>();
  const reviews: T[] = [];
  for (const c of [...input.reviewDue].sort((a, b) => a.due.getTime() - b.due.getTime())) {
    if (reviews.length >= reviewLimit) break;
    if (wordsSeenToday.has(c.wordId) || reviewWords.has(c.wordId)) continue;
    reviewWords.add(c.wordId);
    reviews.push(c);
  }

  // 3. bloqueo de nuevas por acumulación
  const pending = input.learningDue.length + input.reviewDue.length;
  const allowedNew =
    pending > settings.reviewBacklogCap ? 0 : Math.max(0, settings.newCardsPerDay - input.newIntroducedToday);

  // 4. nuevas: como máximo UNA tarjeta por palabra, sin palabras ya presentes
  const taken = new Set<string>([...learning.map((c) => c.wordId), ...reviewWords, ...wordsSeenToday]);
  const news: T[] = [];
  for (const c of input.newCandidates) {
    if (news.length >= allowedNew) break;
    if (taken.has(c.wordId)) continue;
    taken.add(c.wordId);
    news.push(c);
  }

  // 5. intercalar: learning ya vencido primero; luego repasos con una nueva cada k
  const nowMs = now.getTime();
  const learningNow = learning.filter((c) => c.due.getTime() <= nowMs);
  const learningAhead = learning.filter((c) => c.due.getTime() > nowMs);
  const k = Math.max(1, Math.floor(reviews.length / Math.max(1, news.length)));

  const result: T[] = [...learningNow];
  let n = 0;
  reviews.forEach((r, i) => {
    result.push(r);
    if ((i + 1) % k === 0 && n < news.length) result.push(news[n++]!);
  });
  while (n < news.length) result.push(news[n++]!);
  // Las tarjetas en aprendizaje cuyo due aún no llegó se muestran cuando no queda nada más.
  result.push(...learningAhead);
  return result;
}

export interface EligibilityCard {
  id: string;
  wordId: string;
  kind: string;
  state: CardState;
  suspended: boolean;
}

/**
 * Elegibilidad de nuevas: una principal NEW es elegible si no está suspendida;
 * una secundaria NEW solo si la principal de su palabra está en REVIEW.
 */
export function isEligibleNew(card: EligibilityCard, primaryKind: string | null, primaryState: CardState | null) {
  if (card.state !== "NEW" || card.suspended) return false;
  if (primaryKind === null) return false;
  if (card.kind === primaryKind) return true;
  return primaryState === "REVIEW";
}

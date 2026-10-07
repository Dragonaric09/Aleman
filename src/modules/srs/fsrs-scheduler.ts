// Único archivo que importa ts-fsrs. Mapea camelCase ↔ snake_case en un solo lugar.
import { fsrs, generatorParameters, Rating as FsrsRating, State as FsrsState, type Card, type Grade } from "ts-fsrs";
import type { CardState, Rating } from "@/modules/vocabulary/shared";
import { intervalLabel } from "./interval-label";
import type { CardSnapshot, Scheduler, SchedulerOptions } from "./scheduler";

const STATE_TO_FSRS: Record<CardState, FsrsState> = {
  NEW: FsrsState.New,
  LEARNING: FsrsState.Learning,
  REVIEW: FsrsState.Review,
  RELEARNING: FsrsState.Relearning,
};
const STATE_FROM_FSRS: Record<FsrsState, CardState> = {
  [FsrsState.New]: "NEW",
  [FsrsState.Learning]: "LEARNING",
  [FsrsState.Review]: "REVIEW",
  [FsrsState.Relearning]: "RELEARNING",
};
const RATING_TO_FSRS: Record<Rating, Grade> = {
  AGAIN: FsrsRating.Again,
  HARD: FsrsRating.Hard,
  GOOD: FsrsRating.Good,
  EASY: FsrsRating.Easy,
};

function toFsrs(c: CardSnapshot): Card {
  return {
    due: c.due,
    stability: c.stability,
    difficulty: c.difficulty,
    elapsed_days: c.elapsedDays,
    scheduled_days: c.scheduledDays,
    learning_steps: c.learningSteps,
    reps: c.reps,
    lapses: c.lapses,
    state: STATE_TO_FSRS[c.state],
    last_review: c.lastReview ?? undefined,
  };
}

function fromFsrs(c: Card): CardSnapshot {
  return {
    state: STATE_FROM_FSRS[c.state],
    due: c.due,
    stability: c.stability,
    difficulty: c.difficulty,
    elapsedDays: c.elapsed_days,
    scheduledDays: c.scheduled_days,
    learningSteps: c.learning_steps,
    reps: c.reps,
    lapses: c.lapses,
    lastReview: c.last_review ?? null,
  };
}

const DAY_MS = 86_400_000;

/** ts-fsrs puede pasar el máximo en 1–2 días al mantener EASY > GOOD: se recorta al intervalo máximo. */
function clampInterval(c: Card, now: Date, maxDays: number): Card {
  if (c.scheduled_days <= maxDays) return c;
  return { ...c, scheduled_days: maxDays, due: new Date(now.getTime() + maxDays * DAY_MS) };
}

export function createFsrsScheduler(opts: SchedulerOptions): Scheduler {
  // Parámetros del modelo: los valores por defecto de la librería (sin optimización en v1).
  const f = fsrs(
    generatorParameters({
      request_retention: opts.desiredRetention,
      maximum_interval: opts.maximumIntervalDays,
      enable_fuzz: opts.enableFuzz,
    }),
  );

  return {
    preview(card, now) {
      const log = f.repeat(toFsrs(card), now);
      const out = {} as Record<Rating, { due: Date; label: string }>;
      for (const rating of Object.keys(RATING_TO_FSRS) as Rating[]) {
        const due = clampInterval(log[RATING_TO_FSRS[rating]].card, now, opts.maximumIntervalDays).due;
        out[rating] = { due, label: intervalLabel(due.getTime() - now.getTime()) };
      }
      return out;
    },
    review(card, rating, now) {
      return fromFsrs(clampInterval(f.next(toFsrs(card), now, RATING_TO_FSRS[rating]).card, now, opts.maximumIntervalDays));
    },
  };
}

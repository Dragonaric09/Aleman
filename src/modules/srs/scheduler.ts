// srs/scheduler.ts — interfaz propia; el resto de la app NO importa ts-fsrs
import type { CardState, Rating } from "@/modules/vocabulary/shared";
import { createFsrsScheduler } from "./fsrs-scheduler";

export interface CardSnapshot {
  state: CardState;
  due: Date;
  stability: number;
  difficulty: number;
  elapsedDays: number;
  scheduledDays: number;
  learningSteps: number;
  reps: number;
  lapses: number;
  lastReview: Date | null;
}

export interface Scheduler {
  preview(card: CardSnapshot, now: Date): Record<Rating, { due: Date; label: string }>;
  review(card: CardSnapshot, rating: Rating, now: Date): CardSnapshot;
}

export interface SchedulerOptions {
  desiredRetention: number;
  maximumIntervalDays: number;
  enableFuzz: boolean;
}

export function createScheduler(opts: SchedulerOptions): Scheduler {
  return createFsrsScheduler(opts);
}

/** Estado inicial de una tarjeta nueva. */
export function emptySnapshot(now: Date): CardSnapshot {
  return {
    state: "NEW",
    due: now,
    stability: 0,
    difficulty: 0,
    elapsedDays: 0,
    scheduledDays: 0,
    learningSteps: 0,
    reps: 0,
    lapses: 0,
    lastReview: null,
  };
}

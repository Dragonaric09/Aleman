import { describe, expect, it } from "vitest";
import { intervalLabel } from "@/modules/srs/interval-label";
import { applyLeechRules } from "@/modules/srs/leech";
import { createScheduler, emptySnapshot } from "@/modules/srs/scheduler";

const now = new Date("2026-10-06T14:00:00Z");
const MIN = 60_000;
const DAY = 86_400_000;

describe("adaptador FSRS", () => {
  const s = createScheduler({ desiredRetention: 0.9, maximumIntervalDays: 365, enableFuzz: false });

  it("preview devuelve las cuatro calificaciones con intervalos crecientes", () => {
    const p = s.preview(emptySnapshot(now), now);
    expect(Object.keys(p).sort()).toEqual(["AGAIN", "EASY", "GOOD", "HARD"]);
    expect(p.AGAIN.due.getTime()).toBeLessThanOrEqual(p.HARD.due.getTime());
    expect(p.HARD.due.getTime()).toBeLessThanOrEqual(p.GOOD.due.getTime());
    expect(p.GOOD.due.getTime()).toBeLessThan(p.EASY.due.getTime());
    expect(typeof p.GOOD.label).toBe("string");
  });

  it("review de una nueva con GOOD pasa a aprendizaje y suma un repaso", () => {
    const next = s.review(emptySnapshot(now), "GOOD", now);
    expect(["LEARNING", "REVIEW"]).toContain(next.state);
    expect(next.reps).toBe(1);
    expect(next.lastReview?.getTime()).toBe(now.getTime());
  });

  it("EASY gradúa directamente a REVIEW y AGAIN en REVIEW suma un lapse", () => {
    const review = s.review(emptySnapshot(now), "EASY", now);
    expect(review.state).toBe("REVIEW");
    const later = new Date(review.due.getTime() + DAY);
    const lapsed = s.review(review, "AGAIN", later);
    expect(lapsed.state).toBe("RELEARNING");
    expect(lapsed.lapses).toBe(1);
  });

  it("respeta el intervalo máximo", () => {
    const capped = createScheduler({ desiredRetention: 0.95, maximumIntervalDays: 30, enableFuzz: false });
    let card = capped.review(emptySnapshot(now), "EASY", now);
    let t = now;
    for (let i = 0; i < 8; i++) {
      t = new Date(card.due.getTime());
      card = capped.review(card, "EASY", t);
    }
    expect(card.scheduledDays).toBeLessThanOrEqual(30);
  });
});

describe("intervalLabel", () => {
  it.each([
    [30_000, "<1 min"],
    [10 * MIN, "10 min"],
    [60 * MIN, "1 h"],
    [DAY, "1 d"],
    [3 * DAY, "3 d"],
    [14 * DAY, "2 sem"],
    [30 * DAY, "1 mes"],
    [45 * DAY, "1,5 meses"],
    [365 * DAY, "1 año"],
    [550 * DAY, "1,5 años"],
  ])("%d ms → %s", (ms, label) => {
    expect(intervalLabel(ms)).toBe(label);
  });
});

describe("rebeldes", () => {
  const base = { stateBefore: "REVIEW" as const, rating: "AGAIN" as const, wasLeech: false, wasSuspended: false, threshold: 6, autoSuspend: false };
  it("al llegar a 6 lapses se marca rebelde", () => {
    expect(applyLeechRules({ ...base, lapsesAfter: 5 })).toEqual({ isLeech: false, suspended: false, becameLeech: false });
    expect(applyLeechRules({ ...base, lapsesAfter: 6 })).toEqual({ isLeech: true, suspended: false, becameLeech: true });
  });
  it("con autosuspensión, la tarjeta se suspende", () => {
    expect(applyLeechRules({ ...base, lapsesAfter: 6, autoSuspend: true }).suspended).toBe(true);
  });
  it("solo cuenta AGAIN desde REVIEW", () => {
    expect(applyLeechRules({ ...base, stateBefore: "LEARNING", lapsesAfter: 9 }).isLeech).toBe(false);
    expect(applyLeechRules({ ...base, rating: "GOOD", lapsesAfter: 9 }).isLeech).toBe(false);
  });
  it("una rebelde sigue siéndolo", () => {
    expect(applyLeechRules({ ...base, wasLeech: true, lapsesAfter: 7 })).toEqual({ isLeech: true, suspended: false, becameLeech: false });
    expect(applyLeechRules({ ...base, rating: "GOOD", wasLeech: true, lapsesAfter: 7 }).isLeech).toBe(true);
  });
});

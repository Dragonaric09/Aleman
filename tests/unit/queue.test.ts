import { describe, expect, it } from "vitest";
import { buildQueue, isEligibleNew, type BuildQueueInput, type QueueCard } from "@/modules/study/queue";

const now = new Date("2026-10-06T14:00:00Z");
const dayStart = new Date("2026-10-06T08:00:00Z");
const dayEnd = new Date("2026-10-07T08:00:00Z");
const min = (m: number) => new Date(now.getTime() + m * 60_000);

let seq = 0;
function card(state: QueueCard["state"], wordId: string, due = now): QueueCard {
  return { id: `c${++seq}`, wordId, state, due };
}

function input(overrides: Partial<BuildQueueInput<QueueCard>> = {}): BuildQueueInput<QueueCard> {
  return {
    now,
    settings: { newCardsPerDay: 12, maxReviewsPerDay: 200, reviewBacklogCap: 120 },
    dayStart,
    dayEnd,
    learningDue: [],
    reviewDue: [],
    newCandidates: [],
    reviewsDoneToday: 0,
    newIntroducedToday: 0,
    wordsSeenToday: new Set(),
    ...overrides,
  };
}

describe("buildQueue", () => {
  it("límite de nuevas: con newCardsPerDay = 12 solo entran 12 palabras nuevas", () => {
    const news = Array.from({ length: 30 }, (_, i) => card("NEW", `w${i}`));
    const q = buildQueue(input({ newCandidates: news }));
    expect(q).toHaveLength(12);
    expect(q.map((c) => c.wordId)).toEqual(news.slice(0, 12).map((c) => c.wordId));
  });

  it("descuenta las nuevas ya introducidas hoy", () => {
    const news = Array.from({ length: 30 }, (_, i) => card("NEW", `w${i}`));
    expect(buildQueue(input({ newCandidates: news, newIntroducedToday: 12 }))).toHaveLength(0);
    expect(buildQueue(input({ newCandidates: news, newIntroducedToday: 10 }))).toHaveLength(2);
  });

  it("tope por acumulación: 130 repasos pendientes y tope 120 → sin nuevas", () => {
    const reviews = Array.from({ length: 130 }, (_, i) => card("REVIEW", `r${i}`, min(-60)));
    const news = [card("NEW", "n1"), card("NEW", "n2")];
    const q = buildQueue(input({ reviewDue: reviews, newCandidates: news }));
    expect(q.some((c) => c.state === "NEW")).toBe(false);
    expect(q).toHaveLength(130);
  });

  it("respeta maxReviewsPerDay descontando los repasos hechos hoy", () => {
    const reviews = Array.from({ length: 80 }, (_, i) => card("REVIEW", `r${i}`, min(-i)));
    const q = buildQueue(input({ reviewDue: reviews, reviewsDoneToday: 150 }));
    expect(q).toHaveLength(50);
  });

  it("máximo UNA tarjeta nueva por palabra", () => {
    const q = buildQueue(input({ newCandidates: [card("NEW", "w1"), card("NEW", "w1"), card("NEW", "w2")] }));
    expect(q.map((c) => c.wordId)).toEqual(["w1", "w2"]);
  });

  it("hermanas: excluye palabras ya vistas hoy de repasos y nuevas", () => {
    const q = buildQueue(
      input({
        reviewDue: [card("REVIEW", "seen", min(-5)), card("REVIEW", "other", min(-5))],
        newCandidates: [card("NEW", "seen"), card("NEW", "fresh")],
        wordsSeenToday: new Set(["seen"]),
      }),
    );
    expect(q.map((c) => c.wordId)).toEqual(["other", "fresh"]);
  });

  it("hermanas: no repite palabra entre repasos, aprendizaje y nuevas", () => {
    const q = buildQueue(
      input({
        learningDue: [card("LEARNING", "a", min(-1))],
        reviewDue: [card("REVIEW", "a", min(-10)), card("REVIEW", "b", min(-10)), card("REVIEW", "b", min(-9))],
        newCandidates: [card("NEW", "a"), card("NEW", "b"), card("NEW", "c")],
      }),
    );
    const words = q.map((c) => c.wordId);
    expect(new Set(words).size).toBe(words.length - 1); // "a" (aprendizaje) + "a" (repaso) se permite solo en aprendizaje
    expect(words.filter((w) => w === "b")).toHaveLength(1);
    expect(words).toContain("c");
  });

  it("una tarjeta en aprendizaje ya respondida hoy sigue en la cola; su hermana no", () => {
    const learning = card("LEARNING", "w", min(-1));
    const sibling = card("RELEARNING", "w", min(-1));
    const q = buildQueue(
      input({ learningDue: [learning, sibling], wordsSeenToday: new Set(["w"]), cardsSeenToday: new Set([learning.id]) }),
    );
    expect(q).toEqual([learning]);
  });

  it("orden: aprendizaje vencido primero, luego repasos con nuevas intercaladas, y aprendizaje futuro al final", () => {
    const ahead = card("LEARNING", "la", min(10));
    const due = card("LEARNING", "ld", min(-2));
    const reviews = Array.from({ length: 4 }, (_, i) => card("REVIEW", `r${i}`, min(-30 + i)));
    const news = [card("NEW", "n1"), card("NEW", "n2")];
    const q = buildQueue(input({ learningDue: [ahead, due], reviewDue: reviews, newCandidates: news }));
    // k = floor(4 / 2) = 2 → r0 r1 n1 r2 r3 n2
    expect(q.map((c) => c.wordId)).toEqual(["ld", "r0", "r1", "n1", "r2", "r3", "n2", "la"]);
  });

  it("si no hay repasos, las nuevas van seguidas", () => {
    const q = buildQueue(input({ newCandidates: [card("NEW", "a"), card("NEW", "b")] }));
    expect(q.map((c) => c.wordId)).toEqual(["a", "b"]);
  });

  it("orden de introducción: respeta el orden de candidatas (A★, A, B, C)", () => {
    const ordered = ["A★", "A", "B", "C"].map((w) => card("NEW", w));
    expect(buildQueue(input({ newCandidates: ordered })).map((c) => c.wordId)).toEqual(["A★", "A", "B", "C"]);
  });
});

describe("isEligibleNew", () => {
  const base = { id: "c", wordId: "w", suspended: false, state: "NEW" as const };
  it("la principal NEW es elegible", () => {
    expect(isEligibleNew({ ...base, kind: "ES_TO_DE" }, "ES_TO_DE", "NEW")).toBe(true);
  });
  it("secundarias: PLURAL no aparece hasta que ES_TO_DE está en REVIEW", () => {
    expect(isEligibleNew({ ...base, kind: "PLURAL" }, "ES_TO_DE", "NEW")).toBe(false);
    expect(isEligibleNew({ ...base, kind: "PLURAL" }, "ES_TO_DE", "LEARNING")).toBe(false);
    expect(isEligibleNew({ ...base, kind: "PLURAL" }, "ES_TO_DE", "REVIEW")).toBe(true);
  });
  it("suspendidas o ya estudiadas no son elegibles", () => {
    expect(isEligibleNew({ ...base, kind: "ES_TO_DE", suspended: true }, "ES_TO_DE", "NEW")).toBe(false);
    expect(isEligibleNew({ ...base, kind: "ES_TO_DE", state: "REVIEW" }, "ES_TO_DE", "REVIEW")).toBe(false);
    expect(isEligibleNew({ ...base, kind: "ES_TO_DE" }, null, null)).toBe(false);
  });
});

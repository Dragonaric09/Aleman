import { describe, expect, it } from "vitest";
import {
  genderPractice,
  getQueue,
  getSummary,
  lessonPractice,
  submitReview,
  undoLastReview,
} from "@/modules/study";
import { listLeeches } from "@/modules/vocabulary";
import { prisma } from "@/server/db";
import { answer, globalWord, makeUser, patchSettings, studyAll } from "./helpers";

// 10:00 en La Paz (UTC-4), día de estudio 2026-10-06
const now = new Date("2026-10-06T14:00:00Z");

describe("cola diaria y límites", () => {
  it("límite de nuevas: con 12/día se introducen exactamente 12 palabras y el panel muestra 0 nuevas", async () => {
    const user = await makeUser();
    const before = await getSummary(user.id, now);
    expect(before.newAvailable).toBe(12);
    await studyAll(user.id, now, "EASY");
    const introduced = await prisma.reviewLog.count({ where: { userId: user.id, isNewCard: true } });
    const words = await prisma.card.findMany({
      where: { userId: user.id, introducedAt: { not: null } },
      select: { wordId: true },
      distinct: ["wordId"],
    });
    expect(introduced).toBe(12);
    expect(words).toHaveLength(12);
    expect((await getSummary(user.id, now)).newAvailable).toBe(0);
  });

  it("orden de introducción: A★ antes que A, B y C", async () => {
    const user = await makeUser();
    await patchSettings(user.id, { newCardsPerDay: 30 });
    const queue = await getQueue(user.id, now, 50);
    const levels = queue.map((q) => q.word.level);
    const starredWords = await prisma.word.count({ where: { scope: "global", starred: true } });
    const firstWords = await prisma.word.findMany({
      where: { id: { in: queue.slice(0, 10).map((q) => q.word.id) } },
    });
    expect(starredWords).toBeGreaterThan(10);
    expect(firstWords.every((w) => w.starred)).toBe(true);
    expect(levels.every((l) => l === "A")).toBe(true);
  });

  it("tope por acumulación: con más de 120 pendientes no hay nuevas", async () => {
    const user = await makeUser();
    await getSummary(user.id, now); // crea las tarjetas
    const cards = await prisma.card.findMany({ where: { userId: user.id, kind: "ES_TO_DE" }, take: 130 });
    await prisma.card.updateMany({
      where: { id: { in: cards.map((c) => c.id) } },
      data: {
        state: "REVIEW",
        due: new Date(now.getTime() - 86_400_000),
        stability: 5,
        difficulty: 5,
        scheduledDays: 3,
        reps: 3,
        lastReview: new Date("2026-10-02T14:00:00Z"),
      },
    });
    const queue = await getQueue(user.id, now, 50);
    expect(queue.some((q) => q.card.state === "NEW")).toBe(false);
    expect((await getSummary(user.id, now)).newAvailable).toBe(0);
  });

  it("hermanas: tras responder ES_TO_DE de una palabra, ninguna otra tarjeta suya aparece ese día", async () => {
    const user = await makeUser();
    await getSummary(user.id, now);
    const word = await globalWord("Bahnhof");
    const past = new Date(now.getTime() - 86_400_000);
    const reviewState = {
      state: "REVIEW" as const,
      due: past,
      stability: 10,
      difficulty: 5,
      scheduledDays: 5,
      reps: 4,
      lastReview: new Date("2026-09-30T14:00:00Z"),
    };
    await prisma.card.updateMany({ where: { userId: user.id, wordId: word.id }, data: reviewState });
    let queue = await getQueue(user.id, now, 50);
    const mine = queue.filter((q) => q.word.id === word.id);
    expect(mine).toHaveLength(1);
    await answer(user.id, mine[0]!, "GOOD", now);
    queue = await getQueue(user.id, now, 50);
    expect(queue.filter((q) => q.word.id === word.id)).toHaveLength(0);
  });

  it("secundarias: PLURAL no aparece hasta que ES_TO_DE está en REVIEW", async () => {
    const user = await makeUser();
    await getSummary(user.id, now);
    const word = await globalWord("Bahnhof");
    const isPluralQueued = async () =>
      (await getQueue(user.id, now, 50)).some((q) => q.word.id === word.id && q.card.kind === "PLURAL");
    await patchSettings(user.id, { newCardsPerDay: 30 });
    await prisma.card.updateMany({
      where: { userId: user.id, wordId: word.id, kind: "ES_TO_DE" },
      data: { state: "LEARNING", due: new Date(now.getTime() + 86_400_000 * 3) },
    });
    // Prioridad máxima para que la palabra entre en las primeras posiciones.
    await prisma.word.update({ where: { id: word.id }, data: { priority: 1000 } });
    expect(await isPluralQueued()).toBe(false);
    // DE_TO_ES ya estudiada para aislar PLURAL (solo entra una tarjeta por palabra al día).
    await prisma.card.updateMany({
      where: { userId: user.id, wordId: word.id, kind: { in: ["ES_TO_DE", "DE_TO_ES"] } },
      data: { state: "REVIEW", due: new Date(now.getTime() + 86_400_000 * 3) },
    });
    expect(await isPluralQueued()).toBe(true);
    await prisma.word.update({ where: { id: word.id }, data: { priority: word.priority } });
  });
});

describe("registrar, deshacer y rebeldes", () => {
  it("deshacer: la tarjeta vuelve exactamente a su estado anterior y el log desaparece", async () => {
    const user = await makeUser();
    const [item] = await getQueue(user.id, now, 1);
    const before = await prisma.card.findUniqueOrThrow({ where: { id: item!.card.id } });
    const res = await answer(user.id, item!, "GOOD", now);
    expect(res.verdict).toBe("CORRECT");
    expect(await prisma.reviewLog.count({ where: { userId: user.id } })).toBe(1);
    const { restoredCardId } = await undoLastReview(user.id, now);
    expect(restoredCardId).toBe(item!.card.id);
    const after = await prisma.card.findUniqueOrThrow({ where: { id: item!.card.id } });
    expect(after).toEqual(before);
    expect(await prisma.reviewLog.count({ where: { userId: user.id } })).toBe(0);
    await expect(undoLastReview(user.id, now)).rejects.toMatchObject({ status: 409 });
  });

  it("el servidor recalcula el veredicto y exige respuesta escrita en tarjetas de producción", async () => {
    const user = await makeUser();
    const [item] = await getQueue(user.id, now, 1);
    expect(item!.card.kind).not.toBe("DE_TO_ES");
    await expect(
      submitReview(user.id, { cardId: item!.card.id, rating: "GOOD", durationMs: 1000 }, now),
    ).rejects.toMatchObject({ status: 422 });
    const res = await submitReview(
      user.id,
      { cardId: item!.card.id, rating: "GOOD", typedAnswer: "xyz", durationMs: 999_999 },
      now,
    );
    expect(res.verdict).toBe("WRONG");
    const log = await prisma.reviewLog.findFirstOrThrow({ where: { userId: user.id } });
    expect(log.durationMs).toBe(120_000);
    expect(log.isNewCard).toBe(true);
    expect(log.studyDay).toBe("2026-10-06");
  });

  it("día de estudio: un repaso a las 02:00 de Bolivia cuenta para el día anterior", async () => {
    const user = await makeUser();
    const late = new Date("2026-10-07T06:00:00Z"); // 02:00 en La Paz
    const [item] = await getQueue(user.id, late, 1);
    await answer(user.id, item!, "GOOD", late);
    const log = await prisma.reviewLog.findFirstOrThrow({ where: { userId: user.id } });
    expect(log.studyDay).toBe("2026-10-06");
  });

  it("rebelde: al llegar a 6 lapses aparece en /rebeldes con aviso", async () => {
    const user = await makeUser();
    await getSummary(user.id, now);
    const word = await globalWord("Ampel");
    await prisma.card.updateMany({
      where: { userId: user.id, wordId: word.id, kind: "ES_TO_DE" },
      data: {
        state: "REVIEW",
        due: new Date(now.getTime() - 3_600_000),
        stability: 2,
        difficulty: 8,
        scheduledDays: 2,
        reps: 12,
        lapses: 5,
        lastReview: new Date("2026-10-04T14:00:00Z"),
      },
    });
    const card = await prisma.card.findFirstOrThrow({
      where: { userId: user.id, wordId: word.id, kind: "ES_TO_DE" },
    });
    const res = await submitReview(
      user.id,
      { cardId: card.id, rating: "AGAIN", typedAnswer: "die Ampl", durationMs: 3000 },
      now,
    );
    expect(res.isLeech).toBe(true);
    expect(res.becameLeech).toBe(true);
    expect(res.card.lapses).toBe(6);
    const leeches = await listLeeches(user.id);
    expect(leeches.map((c) => c.id)).toContain(card.id);
  });

  it("devuelve el siguiente lote si se pide", async () => {
    const user = await makeUser();
    const [item] = await getQueue(user.id, now, 1);
    const res = await submitReview(
      user.id,
      { cardId: item!.card.id, rating: "EASY", typedAnswer: "x", durationMs: 1000, wantNext: true },
      now,
    );
    expect(res.next?.length).toBeGreaterThan(0);
    expect(res.next?.some((q) => q.card.id === item!.card.id)).toBe(false);
  });
});

describe("práctica libre", () => {
  it("no crea ReviewLog ni modifica tarjetas", async () => {
    const user = await makeUser();
    await studyAll(user.id, now, "EASY");
    const logs = await prisma.reviewLog.count({ where: { userId: user.id } });
    const snapshot = await prisma.card.findMany({ where: { userId: user.id }, orderBy: { id: "asc" } });
    const nouns = await genderPractice(user.id, 20);
    expect(nouns.length).toBeGreaterThan(0);
    expect(nouns.every((n) => ["DER", "DIE", "DAS"].includes(n.gender))).toBe(true);
    const lesson = await lessonPractice(user.id, 13);
    expect(lesson.words.length).toBeGreaterThan(20);
    expect(await prisma.reviewLog.count({ where: { userId: user.id } })).toBe(logs);
    expect(await prisma.card.findMany({ where: { userId: user.id }, orderBy: { id: "asc" } })).toEqual(
      snapshot,
    );
  });
});

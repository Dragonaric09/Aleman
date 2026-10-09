import { describe, expect, it } from "vitest";
import { getTopic, listTopics } from "@/modules/grammar";
import { getStory, listStories, nextStory, parseStoryBody, submitAttempt, tokenize } from "@/modules/reading";
import { getSummary } from "@/modules/study";
import { prisma } from "@/server/db";
import { globalWord, makeUser } from "./helpers";

const day1 = new Date("2026-10-09T14:00:00Z");
const day2 = new Date("2026-10-10T14:00:00Z");

/** Respuestas perfectas para una historia (encuentra todas las formas, acierta todo). */
async function perfectAnswers(storyId: string) {
  const s = await prisma.story.findUniqueOrThrow({ where: { id: storyId } });
  const ex = s.exercises as {
    find?: unknown;
    truefalse: { answer: boolean }[];
    cloze: { text: string }[];
    order: { sentence: string }[];
  };
  const tokens = tokenize(parseStoryBody(s.body));
  return {
    tapped: ex.find ? tokens.filter((t) => t.targetId !== null && t.isWord).map((t) => t.id) : undefined,
    truefalse: ex.truefalse.map((q) => q.answer),
    cloze: ex.cloze.map((q) => /\{\{([^{}]+)\}\}/.exec(q.text)![1]!),
    order: ex.order.map((q) => q.sentence.replace(/[.!?]$/, "")),
  };
}

async function readUpTo(userId: string, lastOrder: number, now = day1) {
  for (let i = 1; i <= lastOrder; i++) {
    const id = `G1-${String(i).padStart(2, "0")}`;
    await submitAttempt(userId, { storyId: id, answers: await perfectAnswers(id) }, now);
  }
}

describe("historias", () => {
  it("se desbloquean en orden; leer la primera abre la segunda", async () => {
    const u = await makeUser();
    await expect(getStory(u.id, "G1-02")).rejects.toMatchObject({ status: 403 });
    const s1 = await getStory(u.id, "G1-01");
    expect(s1.title).toBe("Lucía sucht das Café Linde");
    expect(Object.keys(s1.keywords).length).toBeGreaterThan(8);
    expect((await nextStory(u.id))?.id).toBe("G1-01");

    const r = await submitAttempt(u.id, { storyId: "G1-01", answers: await perfectAnswers("G1-01") }, day1);
    expect(r.isProbe).toBe(true);
    expect(r.score.comprehension).toBe(1);
    expect(r.score.production).toBe(1);
    expect(r.progress.read).toBe(1);
    expect(r.progress.unlocked).toContain("G1-02");
    expect((await nextStory(u.id))?.id).toBe("G1-02");

    const again = await submitAttempt(
      u.id,
      { storyId: "G1-01", answers: await perfectAnswers("G1-01") },
      day1,
    );
    expect(again.isProbe).toBe(false);
  });

  it("leer historias no modifica tarjetas ni repasos (no afecta FSRS)", async () => {
    const u = await makeUser();
    await getSummary(u.id, day1); // crea las tarjetas
    const before = await prisma.card.findMany({ where: { userId: u.id }, orderBy: { id: "asc" } });
    await readUpTo(u.id, 3);
    expect(await prisma.reviewLog.count({ where: { userId: u.id } })).toBe(0);
    expect(await prisma.card.findMany({ where: { userId: u.id }, orderBy: { id: "asc" } })).toEqual(before);
    expect(await prisma.storyAttempt.count({ where: { userId: u.id } })).toBe(3);
  });

  it("aislamiento: el progreso de un usuario no desbloquea historias de otro", async () => {
    const a = await makeUser("lectora-a@test.dev");
    const b = await makeUser("lectora-b@test.dev");
    await readUpTo(a.id, 2);
    await expect(getStory(b.id, "G1-02")).rejects.toMatchObject({ status: 403 });
    const groupsB = await listStories(b.id);
    expect(groupsB.find((g) => g.topic.id === "G1")!.progress.read).toBe(0);
    const topicsA = await listTopics(a.id);
    expect(topicsA.find((t) => t.id === "G1")!.progress!.read).toBe(2);
  });

  it("comprensión con una historia de práctica nueva y dominio en dos días distintos", async () => {
    const u = await makeUser();
    await readUpTo(u.id, 9, day1); // hasta la primera de contraste... y la segunda
    let topic = await getTopic(u.id, "dativo-local");
    expect(topic.progress!.comprehension).toBe(true);
    expect(topic.progress!.masteryDays).toBe(1);
    expect(topic.progress!.mastery).toBe(false);

    await submitAttempt(u.id, { storyId: "G1-10", answers: await perfectAnswers("G1-10") }, day2);
    topic = await getTopic(u.id, "dativo-local");
    expect(topic.progress!.mastery).toBe(true);
    expect(topic.content?.rule).toMatch(/dativo/);
  });

  it("marca como conocidas las palabras clave ya introducidas en las tarjetas", async () => {
    const u = await makeUser();
    await getSummary(u.id, day1);
    const ampel = await globalWord("Ampel");
    await prisma.card.updateMany({ where: { userId: u.id, wordId: ampel.id }, data: { introducedAt: day1 } });
    const s = await getStory(u.id, "G1-01");
    expect(s.keywords["ampel"]?.known).toBe(true);
    expect(s.keywords["dom"]?.known).toBe(false);
  });

  it("valida la entrada y rechaza temas en preparación", async () => {
    const u = await makeUser();
    await expect(submitAttempt(u.id, { storyId: "nada", answers: {} }, day1)).rejects.toThrow();
    const planned = await getTopic(u.id, "pronombres-dativo");
    expect(planned.status).toBe("PLANNED");
    expect(planned.content).toBeNull();
  });
});

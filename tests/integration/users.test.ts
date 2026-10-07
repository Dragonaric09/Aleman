import { describe, expect, it } from "vitest";
import { login, register, validateSessionToken, hashToken, changePassword } from "@/modules/auth";
import { getSummary, getQueue, submitReview } from "@/modules/study";
import { buildBackup, importVocabularyCsv, restoreBackup, VOCAB_HEADERS } from "@/modules/transfer";
import {
  copyGlobalWord,
  createWord,
  deleteWord,
  getWordDetail,
  saveNote,
  setCardSuspended,
  updateWord,
} from "@/modules/vocabulary";
import { upsertGlobalWord, wordInputSchema } from "@/modules/vocabulary";
import { prisma } from "@/server/db";
import { answer, globalWord, makeUser, studyAll } from "./helpers";

const now = new Date("2026-10-06T14:00:00Z");
const DAY = 86_400_000;

const ownNoun = {
  lemma: "Kreuzung",
  type: "NOUN",
  gender: "DIE",
  pluralForm: "Kreuzungen",
  translationEs: "cruce / intersección",
  level: "B",
  lessonNumber: 13,
  exampleDe: "An der Kreuzung links.",
};

describe("autenticación y sesiones", () => {
  it("registro, login, sesión con SHA-256 y renovación deslizante", async () => {
    const reg = await register({ email: "Ana@Test.dev", password: "una-clave-larga", displayName: "Ana", timezone: "Europe/Berlin" }, now);
    expect(reg.user.email).toBe("ana@test.dev");
    const stored = await prisma.session.findUniqueOrThrow({ where: { id: hashToken(reg.token) } });
    expect(stored.id).not.toBe(reg.token);
    expect((await prisma.userSettings.findUniqueOrThrow({ where: { userId: reg.user.id } })).timezone).toBe("Europe/Berlin");

    const session = await login({ email: "ana@test.dev", password: "una-clave-larga" }, "1.1.1.1", now);
    expect((await validateSessionToken(session.token, new Date(now.getTime() + 10 * DAY)))?.renewed).toBe(false);
    const renewed = await validateSessionToken(session.token, new Date(now.getTime() + 20 * DAY));
    expect(renewed?.renewed).toBe(true);
    expect(await validateSessionToken(session.token, new Date(now.getTime() + 60 * DAY))).toBeNull();
  });

  it("contraseña mínima de 10, email duplicado y error de login genérico", async () => {
    await expect(register({ email: "b@test.dev", password: "corta", displayName: "B" }, now)).rejects.toThrow();
    await register({ email: "b@test.dev", password: "una-clave-larga", displayName: "B" }, now);
    await expect(register({ email: "b@test.dev", password: "una-clave-larga", displayName: "B" }, now)).rejects.toMatchObject({ status: 409 });
    await expect(login({ email: "b@test.dev", password: "incorrecta!!" }, "2.2.2.2", now)).rejects.toMatchObject({
      status: 401,
      message: "Email o contraseña incorrectos",
    });
    await expect(login({ email: "nadie@test.dev", password: "incorrecta!!" }, "2.2.2.3", now)).rejects.toMatchObject({
      message: "Email o contraseña incorrectos",
    });
  });

  it("límite de intentos: 5 por minuto por email", async () => {
    await register({ email: "c@test.dev", password: "una-clave-larga", displayName: "C" }, now);
    for (let i = 0; i < 5; i++) {
      await expect(login({ email: "c@test.dev", password: "mala-clave-xx" }, `9.9.9.${i}`, now)).rejects.toMatchObject({ status: 401 });
    }
    await expect(login({ email: "c@test.dev", password: "una-clave-larga" }, "9.9.9.9", now)).rejects.toMatchObject({ status: 429 });
    const later = new Date(now.getTime() + 61_000);
    await expect(login({ email: "c@test.dev", password: "una-clave-larga" }, "9.9.9.9", later)).resolves.toBeTruthy();
  });

  it("cambiar la contraseña cierra las demás sesiones", async () => {
    const a = await register({ email: "d@test.dev", password: "una-clave-larga", displayName: "D" }, now);
    const other = await login({ email: "d@test.dev", password: "una-clave-larga" }, "3.3.3.3", now);
    await changePassword(a.user.id, { currentPassword: "una-clave-larga", newPassword: "otra-clave-larga", confirmPassword: "otra-clave-larga" }, a.token);
    expect(await validateSessionToken(other.token, now)).toBeNull();
    expect(await validateSessionToken(a.token, now)).not.toBeNull();
  });
});

describe("aislamiento entre usuarios", () => {
  it("el usuario B nunca puede leer ni modificar tarjetas, notas o palabras propias del usuario A", async () => {
    const a = await makeUser("a@test.dev");
    const b = await makeUser("b@test.dev");
    const word = await createWord(a.id, ownNoun);
    await saveNote(a.id, word.id, { mnemonic: "truco de A", ownSentence: null });
    const [item] = await getQueue(a.id, now, 1);
    const cardA = item!.card.id;

    await expect(getWordDetail(b.id, word.id)).rejects.toMatchObject({ status: 404 });
    await expect(updateWord(b.id, word.id, { ...ownNoun, translationEs: "hack" })).rejects.toMatchObject({ status: 404 });
    await expect(deleteWord(b.id, word.id)).rejects.toMatchObject({ status: 404 });
    await expect(saveNote(b.id, word.id, { mnemonic: "x" })).rejects.toMatchObject({ status: 404 });
    await expect(submitReview(b.id, { cardId: cardA, rating: "GOOD", typedAnswer: "x", durationMs: 1 }, now)).rejects.toMatchObject({ status: 404 });
    await expect(setCardSuspended(b.id, cardA, true)).rejects.toMatchObject({ status: 404 });

    const bQueue = await getQueue(b.id, now, 50);
    expect(bQueue.some((q) => q.word.id === word.id || q.card.id === cardA)).toBe(false);
    const backupB = await buildBackup(b.id, now);
    expect(backupB.ownWords).toHaveLength(0);
    expect(backupB.notes).toHaveLength(0);
    expect((await prisma.wordNote.findFirstOrThrow({ where: { wordId: word.id } })).mnemonic).toBe("truco de A");
  });

  it("las globales son de solo lectura; «crear copia propia» oculta la global", async () => {
    const a = await makeUser();
    const global = await globalWord("Bahnhof");
    await expect(updateWord(a.id, global.id, { ...ownNoun, lemma: "Bahnhof" })).rejects.toMatchObject({ status: 403 });
    await expect(deleteWord(a.id, global.id)).rejects.toMatchObject({ status: 403 });
    const copy = await copyGlobalWord(a.id, global.id);
    const detail = await getWordDetail(a.id, copy.id);
    expect(detail.isOwn).toBe(true);
    const globalCards = await prisma.card.findMany({ where: { userId: a.id, wordId: global.id } });
    expect(globalCards.length).toBeGreaterThan(0);
    expect(globalCards.every((c) => c.suspended)).toBe(true);
  });

  it("crear un sustantivo sin género falla con mensaje claro; con género genera sus tarjetas", async () => {
    const a = await makeUser();
    await expect(createWord(a.id, { ...ownNoun, gender: null })).rejects.toThrow(/género/);
    const w = await createWord(a.id, ownNoun);
    const kinds = (await prisma.card.findMany({ where: { userId: a.id, wordId: w.id } })).map((c) => c.kind).sort();
    expect(kinds).toEqual(["DE_TO_ES", "ES_TO_DE", "PLURAL"]);
  });
});

describe("transferencia", () => {
  const header = VOCAB_HEADERS.join(";");
  const ok1 = "Kreuzung;noun;die;-en;Kreuzungen;0;cruce;;;;B;0;;;13;;0;0;;;;;;0;;";
  const ok2 = "geradeaus gehen;verb;;;;0;seguir recto;;;;B;0;;;13;;0;0;;;geht geradeaus;ist geradeaus gegangen;sein;1;;";
  const bad1 = "Zug;noun;;;Züge;0;tren;;;;A;0;;;13;;0;0;;;;;;0;;";
  const bad2 = "Hallo;expression;;;;0;hola;;;;A;0;;;999;;0;0;;;;;;0;;";

  it("importación: 2 filas inválidas se muestran con fila y campo, y nada se guarda hasta confirmar", async () => {
    const a = await makeUser();
    const csv = [header, ok1, bad1, ok2, bad2].join("\n");
    const preview = await importVocabularyCsv(a.id, csv, true);
    expect(preview.valid).toBe(2);
    expect(preview.created).toBe(2);
    expect(preview.errors.map((e) => [e.row, e.field])).toEqual(
      expect.arrayContaining([
        [3, "gender"],
        [5, "cloze_text"],
      ]),
    );
    expect(await prisma.word.count({ where: { scope: a.id } })).toBe(0);
    const done = await importVocabularyCsv(a.id, csv, false);
    expect(done.created).toBe(2);
    expect(await prisma.word.count({ where: { scope: a.id } })).toBe(2);
    const again = await importVocabularyCsv(a.id, [header, ok1].join("\n"), false);
    expect(again.updated).toBe(1);
    expect(await prisma.word.count({ where: { scope: a.id } })).toBe(2);
  });

  it("exportar → borrar → restaurar devuelve el mismo estado", async () => {
    const a = await makeUser();
    const own = await createWord(a.id, ownNoun);
    await saveNote(a.id, own.id, { mnemonic: "Kreuz = cruz", ownSentence: "Ich warte an der Kreuzung." });
    await studyAll(a.id, now, "EASY", 8);
    const later = new Date(now.getTime() + 600_000);
    const [item] = await getQueue(a.id, later, 1);
    if (item) await answer(a.id, item, "GOOD", later);

    const backup = JSON.parse(JSON.stringify(await buildBackup(a.id, now)));
    const strip = async () => ({
      cards: (await prisma.card.findMany({ where: { userId: a.id }, include: { word: { select: { lemma: true, type: true, scope: true } } } }))
        .map(({ id: _id, wordId: _w, word, ...c }) => ({ ...c, word: `${word.scope === "global" ? "g" : "o"}:${word.lemma}:${word.type}` }))
        .sort((x, y) => (x.word + x.kind).localeCompare(y.word + y.kind)),
      logs: (await prisma.reviewLog.findMany({ where: { userId: a.id }, orderBy: { reviewedAt: "asc" } })).map(
        ({ id: _id, cardId: _c, ...l }) => l,
      ),
      notes: (await prisma.wordNote.findMany({ where: { userId: a.id } })).map(({ mnemonic, ownSentence }) => ({ mnemonic, ownSentence })),
      words: (await prisma.word.findMany({ where: { scope: a.id } })).map(({ lemma, translationEs, priority }) => ({ lemma, translationEs, priority })),
      settings: await prisma.userSettings.findUniqueOrThrow({ where: { userId: a.id }, omit: { updatedAt: true } }),
    });
    const before = await strip();
    expect(before.logs.length).toBeGreaterThan(0);

    await prisma.reviewLog.deleteMany({ where: { userId: a.id } });
    await prisma.card.deleteMany({ where: { userId: a.id } });
    await prisma.word.deleteMany({ where: { scope: a.id } });

    const summary = await restoreBackup(a.id, backup);
    expect(summary.ownWords).toBe(1);
    expect(await strip()).toEqual(before);
    await expect(restoreBackup(a.id, { ...backup, version: 2 })).rejects.toMatchObject({ status: 400 });
  });
});

describe("semilla", () => {
  it("volver a cargar una palabra global sin cambios no modifica nada", async () => {
    const w = await globalWord("Bahnhof");
    const input = wordInputSchema.parse({
      ...w,
      lessonNumber: 13,
    });
    expect(await upsertGlobalWord(prisma, input, w.lessonId)).toBe("unchanged");
    const after = await globalWord("Bahnhof");
    expect(after.updatedAt).toEqual(w.updatedAt);
  });

  it("el resumen crea tarjetas para el catálogo sin tocar las existentes", async () => {
    const a = await makeUser();
    await getSummary(a.id, now);
    const count = await prisma.card.count({ where: { userId: a.id } });
    expect(count).toBeGreaterThan(481);
    await getSummary(a.id, now);
    expect(await prisma.card.count({ where: { userId: a.id } })).toBe(count);
  });
});

import { describe, expect, it } from "vitest";
import { computeStreak } from "@/modules/stats/streak";
import { dayBounds, dayRange, shiftDay, studyDay } from "@/modules/study/study-day";
import { cardPlan, possibleCardKinds, type CardKindWord } from "@/modules/vocabulary/card-kinds";
import { compareForIntroduction, computePriority } from "@/modules/vocabulary/priority";
import { CARD_KINDS, citationForm, displayLemma, splitAlternatives, typeHint } from "@/modules/vocabulary/shared";

describe("computePriority (7.2)", () => {
  const base = { level: "A" as const, starred: false, isFalseFriend: false, isCognate: false, sources: [], frequencyRank: null };
  it("base por nivel", () => {
    expect(computePriority(base)).toBe(300);
    expect(computePriority({ ...base, level: "B" })).toBe(200);
    expect(computePriority({ ...base, level: "C" })).toBe(100);
  });
  it("bonificaciones y penalizaciones", () => {
    expect(
      computePriority({ ...base, starred: true, isFalseFriend: true, isCognate: true, sources: ["a", "b", "c", "d", "e"], frequencyRank: 500 }),
    ).toBe(300 + 50 + 20 - 20 + 20 + 10);
    expect(computePriority({ ...base, frequencyRank: 2000 })).toBe(300);
  });
  it("A★ (≥ 3 fuentes) > A > B > C con los datos del proyecto (sin rango de frecuencia)", () => {
    const aStar = computePriority({ ...base, starred: true, isCognate: true, sources: ["1", "2", "3"] });
    const aMax = computePriority({ ...base, isFalseFriend: true, sources: ["1", "2", "3", "4"] });
    const aMin = computePriority({ ...base, isCognate: true });
    const bMax = computePriority({ ...base, level: "B", isFalseFriend: true, sources: ["1", "2", "3", "4"], frequencyRank: 1 });
    const cMax = computePriority({ ...base, level: "C", isFalseFriend: true, sources: ["1", "2", "3", "4"], frequencyRank: 1 });
    expect(aStar).toBeGreaterThan(aMax);
    expect(aMin).toBeGreaterThan(bMax);
    expect(computePriority({ ...base, level: "B", isCognate: true })).toBeGreaterThan(cMax);
  });
  it("desempate: lección, fecha de creación, id", () => {
    const d = new Date("2026-01-01");
    const a = { id: "a", priority: 300, lessonSortOrder: 1, createdAt: d };
    expect(compareForIntroduction(a, { ...a, id: "b", priority: 310 })).toBeGreaterThan(0);
    expect(compareForIntroduction(a, { ...a, id: "b", lessonSortOrder: 2 })).toBeLessThan(0);
    expect(compareForIntroduction(a, { ...a, id: "b", lessonSortOrder: null })).toBeLessThan(0);
    expect(compareForIntroduction(a, { ...a, id: "b", createdAt: new Date("2026-02-01") })).toBeLessThan(0);
    expect(compareForIntroduction(a, { ...a, id: "b" })).toBeLessThan(0);
    expect(compareForIntroduction({ ...a, id: "b" }, a)).toBeGreaterThan(0);
    expect(compareForIntroduction(a, a)).toBe(0);
  });
});

describe("tipos de tarjeta (7.1)", () => {
  const noun: CardKindWord = {
    type: "NOUN",
    level: "A",
    noPlural: false,
    pluralForm: "Bahnhöfe",
    isIrregular: false,
    separablePrefix: null,
    auxiliary: null,
    thirdPerson: null,
    perfekt: null,
    exampleDe: null,
    clozeText: null,
  };
  it("sustantivo: ES_TO_DE, DE_TO_ES, PLURAL (sin plural → sin tarjeta PLURAL)", () => {
    expect(possibleCardKinds(noun)).toEqual(["ES_TO_DE", "DE_TO_ES", "PLURAL"]);
    expect(possibleCardKinds({ ...noun, noPlural: true, pluralForm: null })).toEqual(["ES_TO_DE", "DE_TO_ES"]);
  });
  it("verbo: VERB_FORMS solo si irregular, separable o con SEIN; SEPARABLE_ORDER si separable con ejemplo", () => {
    const verb = { ...noun, type: "VERB" as const, pluralForm: null, thirdPerson: "macht", perfekt: "hat gemacht" };
    expect(possibleCardKinds(verb)).toEqual(["ES_TO_DE", "DE_TO_ES"]);
    expect(possibleCardKinds({ ...verb, isIrregular: true })).toContain("VERB_FORMS");
    expect(possibleCardKinds({ ...verb, auxiliary: "SEIN" })).toContain("VERB_FORMS");
    expect(possibleCardKinds({ ...verb, separablePrefix: "ab" })).toEqual(["ES_TO_DE", "DE_TO_ES", "VERB_FORMS"]);
    expect(possibleCardKinds({ ...verb, separablePrefix: "ab", exampleDe: "Sie biegen ab." })).toEqual([
      "ES_TO_DE",
      "DE_TO_ES",
      "VERB_FORMS",
      "SEPARABLE_ORDER",
    ]);
  });
  it("expresión: CLOZE principal; nivel C: solo DE_TO_ES; resto: ES_TO_DE y DE_TO_ES", () => {
    expect(possibleCardKinds({ ...noun, type: "EXPRESSION", clozeText: "Wie {{komme}} ich?" })).toEqual(["CLOZE", "DE_TO_ES"]);
    expect(possibleCardKinds({ ...noun, type: "EXPRESSION" })).toEqual(["DE_TO_ES"]);
    expect(possibleCardKinds({ ...noun, level: "C" })).toEqual(["DE_TO_ES"]);
    expect(possibleCardKinds({ ...noun, type: "ADJECTIVE" })).toEqual(["ES_TO_DE", "DE_TO_ES"]);
  });
  it("cardPlan filtra por tipos activados; la principal es la primera activada", () => {
    expect(cardPlan(noun, CARD_KINDS)).toEqual({ primary: "ES_TO_DE", kinds: ["ES_TO_DE", "DE_TO_ES", "PLURAL"] });
    expect(cardPlan(noun, ["DE_TO_ES", "PLURAL"])).toEqual({ primary: "DE_TO_ES", kinds: ["DE_TO_ES", "PLURAL"] });
    expect(cardPlan(noun, ["CLOZE"])).toEqual({ primary: null, kinds: [] });
  });
});

describe("día de estudio (7.3)", () => {
  const tz = "America/La_Paz"; // UTC-4, sin horario de verano
  it("un repaso a las 02:00 de Bolivia cuenta para el día anterior (inicio 04:00)", () => {
    expect(studyDay(new Date("2026-10-07T06:00:00Z"), tz, 4)).toBe("2026-10-06"); // 02:00 local
    expect(studyDay(new Date("2026-10-07T08:30:00Z"), tz, 4)).toBe("2026-10-07"); // 04:30 local
  });
  it("dayBounds devuelve inicio y fin en UTC", () => {
    const { start, end } = dayBounds("2026-10-06", tz, 4);
    expect(start.toISOString()).toBe("2026-10-06T08:00:00.000Z");
    expect(end.toISOString()).toBe("2026-10-07T08:00:00.000Z");
  });
  it("respeta el horario de verano (Europe/Berlin)", () => {
    const { start, end } = dayBounds("2026-10-24", "Europe/Berlin", 4);
    expect((end.getTime() - start.getTime()) / 3_600_000).toBe(25);
  });
  it("shiftDay y dayRange", () => {
    expect(shiftDay("2026-12-31", 1)).toBe("2027-01-01");
    expect(shiftDay("2026-03-01", -1)).toBe("2026-02-28");
    expect(dayRange("2026-10-06", 3)).toEqual(["2026-10-04", "2026-10-05", "2026-10-06"]);
  });
});

describe("racha", () => {
  it("cuenta días consecutivos con al menos un repaso; un día sin repasos la reinicia", () => {
    expect(computeStreak(["2026-10-04", "2026-10-05", "2026-10-06"], "2026-10-06")).toEqual({ current: 3, max: 3 });
    expect(computeStreak(["2026-10-01", "2026-10-02", "2026-10-03", "2026-10-05", "2026-10-06"], "2026-10-06")).toEqual({
      current: 2,
      max: 3,
    });
  });
  it("sigue viva si hoy aún no se estudió pero ayer sí", () => {
    expect(computeStreak(["2026-10-05"], "2026-10-06").current).toBe(1);
    expect(computeStreak(["2026-10-04"], "2026-10-06").current).toBe(0);
    expect(computeStreak([], "2026-10-06")).toEqual({ current: 0, max: 0 });
  });
});

describe("utilidades de vocabulario", () => {
  it("formas de cita", () => {
    expect(displayLemma("ab|biegen")).toBe("abbiegen");
    expect(citationForm({ lemma: "Bahnhof", type: "NOUN", gender: "DER" })).toBe("der Bahnhof");
    expect(citationForm({ lemma: "ab|biegen", type: "VERB", gender: null })).toBe("abbiegen");
    expect(splitAlternatives("departamento / vivienda")).toEqual(["departamento", "vivienda"]);
    expect(typeHint({ type: "NOUN" })).toBe("sustantivo – con artículo");
    expect(typeHint({ type: "VERB", separablePrefix: "ab" })).toContain("separable");
    expect(typeHint({ type: "VERB" })).toBe("verbo – infinitivo");
    expect(typeHint({ type: "ADVERB" })).toBe("adverbio");
  });
});

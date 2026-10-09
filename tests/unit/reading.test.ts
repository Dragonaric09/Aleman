import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { parseTopicFile } from "@/modules/grammar/content";
import { countTargets, keywordKeys, parseStoryBody, plainText, tokenize } from "@/modules/reading/body";
import { parseStoryFile } from "@/modules/reading/content";
import { buildKnownForms, isKnown, storyCoverage } from "@/modules/reading/coverage";
import { keyForLemma, normalizeKey } from "@/modules/reading/keys";
import { topicProgress, type AttemptMeta, type StoryMeta } from "@/modules/reading/progress";
import { checkCloze, scoreAttempt, scoreFind } from "@/modules/reading/scoring";
import { parseVocabularyCsv } from "@/modules/transfer/csv";
import { loadContent, validateContent } from "../../scripts/lib/content";

const body =
  "Lucía steht {dat:an der} [[Ampel]]. Das Café ist {dat:neben dem} [[Dom]]. Sie [[biegt#abbiegen]] ab. {err:neben der Dom}";

describe("marcado de las historias", () => {
  it("separa texto, palabras clave, formas meta y errores", () => {
    const segs = parseStoryBody(body);
    expect(segs.filter((s) => s.kind === "keyword").map((s) => s.kind === "keyword" && s.key)).toEqual([
      "Ampel",
      "Dom",
      "abbiegen",
    ]);
    expect(countTargets(segs)).toBe(2);
    expect(segs.some((s) => s.kind === "error" && s.text === "neben der Dom")).toBe(true);
    expect(plainText(body)).toBe(
      "Lucía steht an der Ampel. Das Café ist neben dem Dom. Sie biegt ab. neben der Dom",
    );
    expect(keywordKeys(segs)).toEqual(["Ampel", "Dom", "abbiegen"]);
  });

  it("tokeniza conservando forma meta, segmento y párrafo", () => {
    const tokens = tokenize(parseStoryBody("Hallo {dat:im} Park.\n\nZweiter [[Absatz]]."));
    const im = tokens.find((t) => t.text === "im")!;
    expect(im.targetId).toBe(0);
    expect(tokens.find((t) => t.text === "Zweiter")!.paragraph).toBe(1);
    expect(tokens.find((t) => t.text === "Absatz")!.keywordKey).toBe("Absatz");
    expect(tokens.filter((t) => t.isWord).map((t) => t.text)).toEqual([
      "Hallo",
      "im",
      "Park",
      "Zweiter",
      "Absatz",
    ]);
  });

  it("claves normalizadas", () => {
    expect(normalizeKey("  Kein   Problem. ")).toBe("kein problem");
    expect(keyForLemma("ab|biegen")).toBe("abbiegen");
    expect(keyForLemma("Wie komme ich zum ...?")).toBe(normalizeKey("Wie komme ich zum ...?"));
  });
});

describe("puntuación de un intento", () => {
  const exercises = {
    find: { prompt: "Toca" },
    truefalse: [
      { statement: "A", answer: true },
      { statement: "B", answer: false },
    ],
    cloze: [{ text: "Das Café ist {{neben}} dem Dom." }],
    order: [{ sentence: "Die Post ist neben der Bank." }],
  };
  const tokens = tokenize(parseStoryBody(body));
  const idOf = (w: string) => tokens.find((t) => t.text === w && t.isWord)!.id;

  it("encontrar formas: una forma cuenta al tocar cualquiera de sus palabras; tocar de más resta media", () => {
    expect(scoreFind(body, [idOf("an"), idOf("dem")])).toMatchObject({
      found: 2,
      total: 2,
      wrong: 0,
      score: 1,
    });
    expect(scoreFind(body, [idOf("an"), idOf("Café")])).toMatchObject({ found: 1, wrong: 1, score: 0.25 });
    expect(scoreFind(body, [999])).toMatchObject({ found: 0, score: 0 });
  });

  it("los errores mostrados a propósito cuentan como toque incorrecto", () => {
    const errorId = tokens.find((t) => t.error && t.isWord)!.id;
    expect(scoreFind(body, [errorId]).wrong).toBe(1);
  });

  it("combina comprensión (encontrar + richtig/falsch) y producción (huecos + orden)", () => {
    const s = scoreAttempt(
      { body, exercises },
      {
        tapped: [idOf("an"), idOf("dem")],
        truefalse: [true, true],
        cloze: ["neben"],
        order: ["Die Post ist der neben Bank"],
      },
    );
    expect(s.comprehension).toBeCloseTo((1 + 1 + 0) / 3);
    expect(s.production).toBeCloseTo(0.5);
    expect(s.items.find((i) => i.kind === "truefalse" && i.index === 1)!.score).toBe(0);
  });

  it("los huecos usan la corrección de las tarjetas", () => {
    expect(checkCloze("Das ist {{neben}} dem Dom.", "neben").verdict).toBe("CORRECT");
    expect(checkCloze("Über {{dem}} Markt.", "den").verdict).toBe("WRONG");
    expect(checkCloze("Die {{Brücke}}.", "Bruecke").verdict).toBe("ALMOST");
    const empty = scoreAttempt(
      { body, exercises: { ...exercises, find: undefined } },
      { truefalse: [null, null], cloze: [""], order: [""] },
    );
    expect(empty.comprehension).toBe(0);
    expect(empty.production).toBe(0);
  });
});

describe("cobertura léxica", () => {
  const known = buildKnownForms(
    [
      { lemma: "Ampel", pluralForm: "Ampeln", thirdPerson: null, perfekt: null },
      { lemma: "ab|biegen", pluralForm: null, thirdPerson: "biegt ab", perfekt: "ist abgebogen" },
      { lemma: "suchen", pluralForm: null, thirdPerson: "sucht", perfekt: "hat gesucht" },
      { lemma: "nett", pluralForm: null, thirdPerson: null, perfekt: null },
    ],
    ["die", "an", "der", "ist", "sehr", "sie"],
  );
  it("reconoce lemas, plurales, formas verbales y terminaciones", () => {
    expect(isKnown("Ampeln", known)).toBe(true);
    expect(isKnown("biegen", known)).toBe(true);
    expect(isKnown("suchst", known)).toBe(true);
    expect(isKnown("nette", known)).toBe(true);
    expect(isKnown("Zeitung", known)).toBe(false);
  });
  it("calcula la proporción y lista las desconocidas", () => {
    const c = storyCoverage("Sie sucht die {dat:an der} [[Ampel]]. Die Zeitung ist sehr nett.", known);
    expect(c.unknown).toEqual(["zeitung"]);
    expect(c.ratio).toBeCloseTo(10 / 11);
  });
});

describe("progreso de un tema", () => {
  const stories: StoryMeta[] = [
    { id: "G1-01", phase: "DISCOVER", sortOrder: 1 },
    { id: "G1-02", phase: "PRACTICE", sortOrder: 2 },
    { id: "G1-03", phase: "CONTRAST", sortOrder: 3 },
    { id: "G1-04", phase: "APPLY", sortOrder: 4 },
  ];
  const a = (
    storyId: string,
    c: number | null,
    p: number | null,
    isProbe: boolean,
    studyDay = "2026-10-09",
  ): AttemptMeta => ({
    storyId,
    comprehensionScore: c,
    productionScore: p,
    isProbe,
    studyDay,
  });

  it("desbloquea en orden: solo la primera al empezar", () => {
    const p = topicProgress(stories, []);
    expect(p.unlocked).toEqual(["G1-01"]);
    expect(p.nextStoryId).toBe("G1-01");
    expect(topicProgress(stories, [a("G1-01", 0.2, 0, true)]).unlocked).toEqual(["G1-01", "G1-02"]);
  });

  it("comprensión: ≥ 80 % en la primera lectura de una historia que no es de descubrimiento", () => {
    expect(topicProgress(stories, [a("G1-01", 1, 1, true)]).comprehension).toBe(false);
    expect(topicProgress(stories, [a("G1-01", 1, 1, true), a("G1-02", 0.9, 0.5, false)]).comprehension).toBe(
      false,
    );
    expect(topicProgress(stories, [a("G1-01", 1, 1, true), a("G1-02", 0.8, 0.5, true)]).comprehension).toBe(
      true,
    );
  });

  it("dominio: ≥ 80 % de producción en contraste/aplicación en dos días distintos", () => {
    const base = [a("G1-01", 1, 1, true), a("G1-02", 1, 1, true)];
    const sameDay = topicProgress(stories, [...base, a("G1-03", 1, 0.9, true), a("G1-04", 1, 1, true)]);
    expect(sameDay.mastery).toBe(false);
    expect(sameDay.masteryDays).toBe(1);
    const twoDays = topicProgress(stories, [
      ...base,
      a("G1-03", 1, 0.9, true),
      a("G1-04", 1, 0.8, true, "2026-10-10"),
    ]);
    expect(twoDays.mastery).toBe(true);
    expect(twoDays.read).toBe(4);
    expect(twoDays.nextStoryId).toBeNull();
    expect(twoDays.best["G1-03"]).toEqual({ comprehension: 1, production: 0.9 });
  });
});

describe("formato de archivos", () => {
  it("rechaza historias mal formadas con mensajes claros", () => {
    expect(() => parseStoryFile("sin frontmatter", "x.md")).toThrow(/frontmatter/);
    const bad =
      "---\nid: X1\ntopic: G1\nphase: DISCOVER\norder: 1\ntitle: T\ntitleEs: T\nexercises: {}\n---\nTexto";
    expect(() => parseStoryFile(bad, "x.md")).toThrow(/id/);
    const cloze =
      "---\nid: G1-01\ntopic: G1\nphase: DISCOVER\norder: 1\ntitle: T\ntitleEs: T\nexercises:\n  cloze:\n    - text: sin hueco\n---\nTexto";
    expect(() => parseStoryFile(cloze, "x.md")).toThrow(/hueco/);
  });
  it("rechaza temas disponibles sin contenido", () => {
    expect(() =>
      parseTopicFile("id: G1\nslug: a\ntitle: T\nsummary: S\norder: 1\nstatus: available\n", "g.yml"),
    ).toThrow(/contenido/);
  });
});

describe("contenido real del proyecto", () => {
  it("todas las historias y temas pasan la validación", () => {
    const catalog = parseVocabularyCsv(readFileSync("data/vocabulario.csv", "utf8")).rows.map((r) => r.word);
    const content = loadContent(process.cwd());
    const result = validateContent(content, catalog);
    expect(result.errors).toEqual([]);
    expect(content.stories.filter((s) => s.topicId === "G1")).toHaveLength(11);
    for (const s of result.stats) {
      expect(s.coverage).toBeGreaterThanOrEqual(0.95);
      expect(s.targets).toBeGreaterThanOrEqual(6);
    }
  });
});

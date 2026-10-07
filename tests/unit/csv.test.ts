import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { ankiBack, serializeAnkiCsv } from "@/modules/transfer/anki";
import {
  VOCAB_HEADERS,
  parseLessonsCsv,
  parseVocabularyCsv,
  serializeVocabularyCsv,
} from "@/modules/transfer/csv";
import { wordInputSchema } from "@/modules/vocabulary/schemas";

const header = VOCAB_HEADERS.join(";");
const bahnhof =
  "Bahnhof;noun;der;-¨e;Bahnhöfe;0;estación de tren;Das Hotel ist zwischen dem Bahnhof und dem Dom.;El hotel está entre la estación y la catedral.;;A;1;A1;;13;KB13|AB13;0;0;;;;;;0;;stadt";
const abbiegen =
  "ab|biegen;verb;;;;0;girar (en una calle);Sie biegen rechts ab.;Usted gira a la derecha.;;A;0;A2;;13;KB13;0;0;;ab;biegt ab;ist abgebogen;sein;1;;stadt|trennbar";

describe("parseVocabularyCsv", () => {
  it("lee filas válidas con todos los campos", () => {
    const r = parseVocabularyCsv(`${header}\n${bahnhof}\n${abbiegen}\n`);
    expect(r.errors).toEqual([]);
    expect(r.rows).toHaveLength(2);
    const [b, v] = r.rows.map((x) => x.word);
    expect(b).toMatchObject({
      lemma: "Bahnhof",
      type: "NOUN",
      gender: "DER",
      pluralForm: "Bahnhöfe",
      starred: true,
      lessonNumber: 13,
    });
    expect(b!.sources).toEqual(["KB13", "AB13"]);
    expect(v).toMatchObject({
      separablePrefix: "ab",
      auxiliary: "SEIN",
      isIrregular: true,
      goetheLevel: "A2",
    });
  });

  it("dos filas inválidas: errores con número de fila y campo, sin afectar a las válidas", () => {
    const sinGenero = bahnhof.replace(";der;", ";;").replace("Bahnhof;", "Zug;");
    const sinCloze = "Wie komme ich zum ...?;expression;;;;0;¿cómo llego?;;;;A;0;;;13;;0;0;;;;;;0;;";
    const r = parseVocabularyCsv(`${header}\n${bahnhof}\n${sinGenero}\n${sinCloze}\n`);
    expect(r.rows).toHaveLength(1);
    expect(r.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ row: 3, field: "gender" }),
        expect.objectContaining({ row: 4, field: "cloze_text" }),
      ]),
    );
  });

  it("detecta cabeceras incorrectas, columnas de más y duplicados", () => {
    expect(parseVocabularyCsv("lemma;type\nx;noun").errors[0]).toMatchObject({ row: 1, field: "cabecera" });
    expect(parseVocabularyCsv("").errors[0]).toMatchObject({ row: 1 });
    expect(parseVocabularyCsv(`${header}\n${bahnhof};extra`).errors[0]).toMatchObject({
      row: 2,
      field: "fila",
    });
    expect(parseVocabularyCsv(`${header}\n${bahnhof}\n${bahnhof}`).errors[0]).toMatchObject({
      row: 3,
      field: "lemma",
    });
  });

  it("valida booleanos y enteros", () => {
    const bad = bahnhof.replace(";-¨e;Bahnhöfe;0;", ";-¨e;Bahnhöfe;si;").replace(";13;KB13", ";trece;KB13");
    const r = parseVocabularyCsv(`${header}\n${bad}`);
    expect(r.errors.map((e) => e.field)).toEqual(expect.arrayContaining(["no_plural", "lesson"]));
  });

  it("tolera BOM y vuelve a serializar en el mismo formato", () => {
    const r = parseVocabularyCsv(`﻿${header}\n${bahnhof}\n${abbiegen}\n`);
    const out = serializeVocabularyCsv(r.rows.map((x) => x.word));
    expect(out.charCodeAt(0)).not.toBe(0xfeff);
    expect(out.split("\n")[0]).toBe(header);
    expect(parseVocabularyCsv(out).rows.map((x) => x.word)).toEqual(r.rows.map((x) => x.word));
  });

  it("el CSV real del proyecto valida sin errores", () => {
    const text = readFileSync("data/vocabulario.csv", "utf8");
    const r = parseVocabularyCsv(text);
    expect(r.errors).toEqual([]);
    expect(r.rows.length).toBeGreaterThan(300);
  });
});

describe("parseLessonsCsv", () => {
  it("lee lecciones y rechaza cabeceras incorrectas", () => {
    const ok = parseLessonsCsv("number;title;topic;sort_order\n13;Wir suchen;Ciudad;1\n901;Clase 2;;5\n");
    expect(ok.errors).toEqual([]);
    expect(ok.rows[1]).toEqual({ number: 901, title: "Clase 2", topic: null, sortOrder: 5 });
    expect(parseLessonsCsv("a;b\n").errors).toHaveLength(1);
    expect(parseLessonsCsv("number;title;topic;sort_order\nx;;;y\n").errors.length).toBeGreaterThan(0);
  });
});

describe("reglas de integridad (6.2)", () => {
  const base = {
    lemma: "Bahnhof",
    type: "NOUN",
    gender: "DER",
    pluralForm: "Bahnhöfe",
    translationEs: "estación",
    level: "A",
  };
  const issues = (raw: object) => (wordInputSchema.safeParse(raw).error?.issues ?? []).map((i) => i.path[0]);

  it("sustantivo: género, plural o «sin plural», mayúscula inicial", () => {
    expect(issues(base)).toEqual([]);
    expect(issues({ ...base, gender: null })).toContain("gender");
    expect(issues({ ...base, pluralForm: null })).toContain("pluralForm");
    expect(issues({ ...base, pluralForm: null, noPlural: true })).toEqual([]);
    expect(issues({ ...base, lemma: "bahnhof" })).toContain("lemma");
    expect(issues({ ...base, type: "ADJECTIVE", lemma: "groß" })).toContain("gender");
  });
  it("verbo separable: barra en el lema y tercera persona", () => {
    const v = {
      lemma: "ab|biegen",
      type: "VERB",
      translationEs: "girar",
      level: "A",
      separablePrefix: "ab",
      thirdPerson: "biegt ab",
    };
    expect(issues(v)).toEqual([]);
    expect(issues({ ...v, lemma: "abbiegen" })).toContain("lemma");
    expect(issues({ ...v, thirdPerson: null })).toContain("thirdPerson");
    expect(issues({ ...v, separablePrefix: null })).toContain("separablePrefix");
  });
  it("expresión: exactamente un hueco; traducción con máximo 5 alternativas; nota de falso amigo", () => {
    const e = {
      lemma: "Wie geht's?",
      type: "EXPRESSION",
      translationEs: "¿qué tal?",
      level: "A",
      clozeText: "Wie {{geht's}}?",
    };
    expect(issues(e)).toEqual([]);
    expect(issues({ ...e, clozeText: "Wie {{geht}} {{es}}?" })).toContain("clozeText");
    expect(issues({ ...e, translationEs: "a / b / c / d / e / f" })).toContain("translationEs");
    expect(issues({ ...e, isFalseFriend: true })).toContain("falseFriendNote");
  });
  it("normaliza a NFC y quita espacios sobrantes", () => {
    const decomposed = "Brücke";
    const r = wordInputSchema.parse({
      ...base,
      lemma: `  ${decomposed}  `,
      translationEs: "puente   de  piedra",
    });
    expect(r.lemma).toBe("Brücke");
    expect(r.translationEs).toBe("puente de piedra");
  });
});

describe("exportación para Anki", () => {
  const w = {
    lemma: "Bahnhof",
    type: "NOUN" as const,
    gender: "DER" as const,
    pluralForm: "Bahnhöfe",
    noPlural: false,
    translationEs: "estación de tren",
    exampleDe: "Ich bin am Bahnhof.",
    exampleEs: "Estoy en la estación.",
    perfekt: null,
    level: "A",
    lessonNumber: 13,
  };
  it("reverso HTML con artículo coloreado, plural y ejemplo", () => {
    const back = ankiBack(w);
    expect(back).toContain('<span style="color:#2563EB">der</span> Bahnhof');
    expect(back).toContain("die Bahnhöfe");
    expect(back).toContain("Ich bin am Bahnhof.");
    expect(ankiBack({ ...w, noPlural: true })).toContain("sin plural");
    expect(ankiBack({ ...w, type: "VERB", gender: null, lemma: "ab|biegen", perfekt: "ist <ab>" })).toContain(
      "ist &lt;ab&gt;",
    );
  });
  it("cabeceras #separator y #html, columnas Front;Back;Tags", () => {
    const csv = serializeAnkiCsv([w]);
    const lines = csv.split("\n");
    expect(lines[0]).toBe("#separator:semicolon");
    expect(lines[1]).toBe("#html:true");
    expect(csv).toContain("nivel_A leccion_13 sustantivo");
  });
});

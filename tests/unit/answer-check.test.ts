import { describe, expect, it } from "vitest";
import {
  HINT_ARTICLE,
  HINT_AUX,
  HINT_NOUN_CAPS,
  HINT_SINGULAR,
  HINT_UMLAUT,
  charDiff,
  checkAnswer,
  levenshtein,
  normalizeAnswer,
  normalizeSpanish,
  suggestedRating,
} from "@/modules/study/answer-check";
import { abbiegen, ampel, bahnhof, bruecke, girar, strasse, wieKomme, wohnung, word } from "../fixtures/words";

const lax = { strictCapitalization: false };
const strict = { strictCapitalization: true };

describe("checkAnswer · casos obligatorios de la sección 12.2", () => {
  const cases: [string, Parameters<typeof checkAnswer>, string, string?][] = [
    ["ES_TO_DE der Bahnhof / der Bahnhof", ["ES_TO_DE", bahnhof, "der Bahnhof", lax], "CORRECT"],
    ["ES_TO_DE der Bahnhof / der bahnhof (laxo)", ["ES_TO_DE", bahnhof, "der bahnhof", lax], "CORRECT", HINT_NOUN_CAPS],
    ["ES_TO_DE der Bahnhof / der bahnhof (estricto)", ["ES_TO_DE", bahnhof, "der bahnhof", strict], "ALMOST", HINT_NOUN_CAPS],
    ["ES_TO_DE der Bahnhof / die Bahnhof", ["ES_TO_DE", bahnhof, "die Bahnhof", lax], "WRONG", HINT_ARTICLE],
    ["ES_TO_DE der Bahnhof / Bahnhof", ["ES_TO_DE", bahnhof, "Bahnhof", lax], "WRONG", HINT_ARTICLE],
    ["ES_TO_DE der Bahnhof / der Banhof", ["ES_TO_DE", bahnhof, "der Banhof", lax], "ALMOST"],
    ["ES_TO_DE die Straße / die Strasse", ["ES_TO_DE", strasse, "die Strasse", lax], "ALMOST", HINT_UMLAUT],
    ["ES_TO_DE die Brücke / die Bruecke", ["ES_TO_DE", bruecke, "die Bruecke", lax], "ALMOST", HINT_UMLAUT],
    ["ES_TO_DE abbiegen / ab|biegen", ["ES_TO_DE", abbiegen, "ab|biegen", lax], "CORRECT"],
    ["PLURAL Bahnhöfe / die Bahnhöfe", ["PLURAL", bahnhof, "die Bahnhöfe", lax], "CORRECT"],
    ["PLURAL Bahnhöfe / Bahnhof", ["PLURAL", bahnhof, "Bahnhof", lax], "WRONG", HINT_SINGULAR],
    ["DE_TO_ES departamento / vivienda / La vivienda", ["DE_TO_ES", wohnung, "La vivienda", lax], "CORRECT"],
    ["DE_TO_ES semáforo / semaforo", ["DE_TO_ES", ampel, "semaforo", lax], "CORRECT"],
    ["DE_TO_ES girar (en una calle) / girar", ["DE_TO_ES", girar, "girar", lax], "CORRECT"],
    ["VERB_FORMS biegt ab / hat abgebogen", ["VERB_FORMS", abbiegen, "biegt ab / hat abgebogen", lax], "WRONG", HINT_AUX],
  ];

  it.each(cases)("%s", (_name, args, verdict, hint) => {
    const r = checkAnswer(...args);
    expect(r.verdict).toBe(verdict);
    if (hint) expect(r.hints).toContain(hint);
  });
});

describe("checkAnswer · otras reglas", () => {
  it("acepta el infinitivo sin barra", () => {
    expect(checkAnswer("ES_TO_DE", abbiegen, "abbiegen", lax).verdict).toBe("CORRECT");
  });

  it("PLURAL también se acepta sin «die»", () => {
    expect(checkAnswer("PLURAL", bahnhof, "Bahnhöfe", lax).verdict).toBe("CORRECT");
  });

  it("PLURAL igual al singular (das Zimmer → die Zimmer) no se marca como singular", () => {
    const zimmer = word({ lemma: "Zimmer", gender: "DAS", pluralForm: "Zimmer" });
    expect(checkAnswer("PLURAL", zimmer, "Zimmer", lax).verdict).toBe("CORRECT");
  });

  it("VERB_FORMS correcto, con o sin pronombre", () => {
    expect(checkAnswer("VERB_FORMS", abbiegen, "biegt ab / ist abgebogen", lax).verdict).toBe("CORRECT");
    expect(checkAnswer("VERB_FORMS", abbiegen, "er biegt ab / ist abgebogen", lax).verdict).toBe("CORRECT");
  });

  it("VERB_FORMS sin las dos partes es WRONG", () => {
    expect(checkAnswer("VERB_FORMS", abbiegen, "biegt ab", lax).verdict).toBe("WRONG");
  });

  it("VERB_FORMS con error en la tercera persona", () => {
    const r = checkAnswer("VERB_FORMS", abbiegen, "abbiegt / ist abgebogen", lax);
    expect(r.verdict).toBe("WRONG");
    expect(r.hints).toContain("Revisa la tercera persona");
  });

  it("CLOZE: rellena el hueco", () => {
    expect(checkAnswer("CLOZE", wieKomme, "komme", lax).verdict).toBe("CORRECT");
    expect(checkAnswer("CLOZE", wieKomme, "kommen", lax).verdict).toBe("ALMOST");
    expect(checkAnswer("CLOZE", wieKomme, "gehe", lax).verdict).toBe("WRONG");
  });

  it("SEPARABLE_ORDER exige el orden exacto (sin puntuación final)", () => {
    expect(checkAnswer("SEPARABLE_ORDER", abbiegen, "Sie biegen rechts ab", lax).verdict).toBe("CORRECT");
    expect(checkAnswer("SEPARABLE_ORDER", abbiegen, "Sie biegen ab rechts", lax).verdict).toBe("WRONG");
  });

  it("palabras muy cortas no admiten errores tipográficos", () => {
    const an = word({ lemma: "an", type: "PREPOSITION", gender: null, pluralForm: null, translationEs: "en" });
    expect(checkAnswer("ES_TO_DE", an, "am", lax).verdict).toBe("WRONG");
  });

  it("palabras de 10+ letras toleran 2 errores", () => {
    const k = word({ lemma: "Kindergarten", pluralForm: "Kindergärten", translationEs: "kínder" });
    expect(checkAnswer("ES_TO_DE", k, "der Kindegarte", lax).verdict).toBe("ALMOST");
  });

  it("DE_TO_ES: error leve es ALMOST, otra palabra es WRONG", () => {
    expect(checkAnswer("DE_TO_ES", ampel, "semafro", lax).verdict).toBe("ALMOST");
    expect(checkAnswer("DE_TO_ES", ampel, "puente", lax).verdict).toBe("WRONG");
  });

  it("DE_TO_ES: ignora el «se» final de los verbos pronominales", () => {
    const umziehen = word({ type: "VERB", gender: null, pluralForm: null, lemma: "um|ziehen", translationEs: "mudarse" });
    expect(checkAnswer("DE_TO_ES", umziehen, "mudar", lax).verdict).toBe("CORRECT");
  });

  it("acepta comillas tipográficas y puntuación final", () => {
    expect(checkAnswer("ES_TO_DE", bahnhof, "der Bahnhof.", lax).verdict).toBe("CORRECT");
  });
});

describe("utilidades", () => {
  it("normalizeAnswer", () => {
    expect(normalizeAnswer("  der   Bahnhof!! ")).toBe("der Bahnhof");
    expect(normalizeAnswer("„Hallo“")).toBe('"Hallo"');
  });
  it("normalizeSpanish", () => {
    expect(normalizeSpanish("Los Semáforos")).toBe("semaforos");
    expect(normalizeSpanish("girar (en una calle)")).toBe("girar");
  });
  it("levenshtein", () => {
    expect(levenshtein("Bahnhof", "Banhof")).toBe(1);
    expect(levenshtein("", "abc")).toBe(3);
    expect(levenshtein("abc", "")).toBe(3);
  });
  it("suggestedRating", () => {
    expect(suggestedRating("CORRECT")).toBe("GOOD");
    expect(suggestedRating("ALMOST")).toBe("HARD");
    expect(suggestedRating("WRONG")).toBe("AGAIN");
  });
  it("charDiff marca lo que falta y lo que sobra", () => {
    const parts = charDiff("Banhof", "Bahnhof");
    expect(parts.map((p) => p.text).join("")).toBe("Bahnhof");
    expect(parts.some((p) => p.type === "missing" && p.text === "h")).toBe(true);
    expect(charDiff("abcx", "abc").at(-1)).toEqual({ text: "x", type: "extra" });
  });
});

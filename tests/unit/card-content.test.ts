import { describe, expect, it } from "vitest";
import { changePasswordSchema, loginSchema, registerSchema } from "@/modules/auth/schemas";
import { settingsSchema } from "@/modules/settings/schemas";
import { DEFAULT_SETTINGS } from "@/modules/settings/defaults";
import {
  buildPrompt,
  clozeAnswer,
  clozeWithBlank,
  expectedAnswer,
  isProductionKind,
  sentenceTiles,
  shuffleTiles,
} from "@/modules/study/card-content";
import { backupSchema, exportFormatSchema } from "@/modules/transfer/schemas";
import { abbiegen, bahnhof, wieKomme, word } from "../fixtures/words";

describe("contenido de cada tarjeta (7.1)", () => {
  it("ES_TO_DE: traducción + etiqueta; el falso amigo NO se avisa en el anverso", () => {
    const p = buildPrompt("ES_TO_DE", { ...bahnhof, isFalseFriend: true, falseFriendNote: "ojo" });
    expect(p.title).toBe("estación de tren");
    expect(p.subtitle).toBe("sustantivo – con artículo");
    expect(JSON.stringify(p)).not.toContain("ojo");
    expect(p.allowReveal).toBe(false);
    expect(expectedAnswer("ES_TO_DE", bahnhof)).toBe("der Bahnhof");
    expect(expectedAnswer("ES_TO_DE", abbiegen)).toBe("abbiegen");
  });

  it("DE_TO_ES: lema con género, permite revelar", () => {
    const p = buildPrompt("DE_TO_ES", bahnhof);
    expect(p.title).toBe("der Bahnhof");
    expect(p.showGender).toBe(true);
    expect(p.allowReveal).toBe(true);
    expect(p.answerLang).toBe("es");
    expect(buildPrompt("DE_TO_ES", abbiegen).title).toBe("abbiegen");
    const an = word({ lemma: "an", type: "PREPOSITION", gender: null, governsCase: "Dat./Akk." });
    expect(buildPrompt("DE_TO_ES", an).subtitle).toBe("rige Dat./Akk.");
    expect(expectedAnswer("DE_TO_ES", bahnhof)).toBe("estación de tren");
  });

  it("PLURAL, VERB_FORMS, SEPARABLE_ORDER y CLOZE", () => {
    expect(buildPrompt("PLURAL", bahnhof).title).toBe("der Bahnhof → die …");
    expect(expectedAnswer("PLURAL", bahnhof)).toBe("Bahnhöfe");

    const vf = buildPrompt("VERB_FORMS", abbiegen);
    expect(vf.title).toBe("abbiegen: er … / Perfekt: …");
    expect(vf.fields).toHaveLength(2);
    expect(expectedAnswer("VERB_FORMS", abbiegen)).toBe("biegt ab / ist abgebogen");

    const so = buildPrompt("SEPARABLE_ORDER", abbiegen, "semilla");
    expect(so.tiles?.slice().sort()).toEqual(["Sie", "ab", "biegen", "rechts"].sort());
    expect(so.tiles?.join(" ")).not.toBe("Sie biegen rechts ab");
    expect(expectedAnswer("SEPARABLE_ORDER", abbiegen)).toBe("Sie biegen rechts ab.");

    const cl = buildPrompt("CLOZE", wieKomme);
    expect(cl.title).toBe("Wie _____ ich zum Bahnhof?");
    expect(expectedAnswer("CLOZE", wieKomme)).toBe("komme");
  });

  it("utilidades", () => {
    expect(clozeAnswer("a {{b}} c")).toBe("b");
    expect(clozeAnswer("sin hueco")).toBe("");
    expect(clozeWithBlank("a {{b}} c")).toBe("a _____ c");
    expect(sentenceTiles("Ich komme mit!")).toEqual(["Ich", "komme", "mit"]);
    expect(shuffleTiles(["a", "b"], "x")).not.toEqual(["a", "b"]);
    expect(shuffleTiles(["a", "b", "c"], "s")).toEqual(shuffleTiles(["a", "b", "c"], "s"));
    expect(isProductionKind("DE_TO_ES")).toBe(false);
    expect(isProductionKind("ES_TO_DE")).toBe(true);
  });
});

describe("esquemas de entrada", () => {
  it("ajustes: rangos validados", () => {
    expect(settingsSchema.safeParse(DEFAULT_SETTINGS).success).toBe(true);
    const bad = settingsSchema.safeParse({
      ...DEFAULT_SETTINGS,
      newCardsPerDay: 40,
      desiredRetention: 0.99,
      timezone: "Marte/Base",
    });
    expect(bad.success).toBe(false);
    const paths = bad.error?.issues.map((i) => i.path[0]);
    expect(paths).toEqual(expect.arrayContaining(["newCardsPerDay", "desiredRetention", "timezone"]));
    expect(settingsSchema.safeParse({ ...DEFAULT_SETTINGS, enabledCardKinds: [] }).success).toBe(false);
    expect(settingsSchema.safeParse({ ...DEFAULT_SETTINGS, enabledCardKinds: ["PLURAL"] }).success).toBe(
      false,
    );
    expect(settingsSchema.parse({ ...DEFAULT_SETTINGS, ttsVoice: "" }).ttsVoice).toBeNull();
  });

  it("auth: email normalizado, contraseña mínima de 10, confirmación", () => {
    expect(
      registerSchema.parse({ email: " Ana@X.dev ", password: "1234567890", displayName: "Ana" }).email,
    ).toBe("ana@x.dev");
    expect(registerSchema.safeParse({ email: "x@y.dev", password: "corta", displayName: "A" }).success).toBe(
      false,
    );
    expect(loginSchema.safeParse({ email: "no-es-email", password: "x" }).success).toBe(false);
    expect(
      changePasswordSchema.safeParse({
        currentPassword: "a",
        newPassword: "1234567890",
        confirmPassword: "otra",
      }).success,
    ).toBe(false);
  });

  it("transferencia: formato de exportación y versión de copia", () => {
    expect(exportFormatSchema.parse("anki")).toBe("anki");
    expect(exportFormatSchema.safeParse("pdf").success).toBe(false);
    const empty = {
      version: 1,
      exportedAt: "2026-10-06T00:00:00Z",
      settings: {},
      ownWords: [],
      cards: [],
      reviewLogs: [],
      notes: [],
    };
    expect(backupSchema.safeParse(empty).success).toBe(true);
    expect(backupSchema.safeParse({ ...empty, version: 2 }).success).toBe(false);
  });
});

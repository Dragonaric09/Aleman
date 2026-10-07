import type { CardWord } from "@/modules/study/card-content";

/** Palabra de prueba con todos los campos de CardWord; se sobrescriben los necesarios. */
export function word(overrides: Partial<CardWord> = {}): CardWord {
  return {
    lemma: "Bahnhof",
    type: "NOUN",
    gender: "DER",
    pluralForm: "Bahnhöfe",
    translationEs: "estación de tren",
    exampleDe: null,
    exampleEs: null,
    clozeText: null,
    separablePrefix: null,
    thirdPerson: null,
    perfekt: null,
    isFalseFriend: false,
    falseFriendNote: null,
    governsCase: null,
    ...overrides,
  };
}

export const bahnhof = word();
export const strasse = word({ lemma: "Straße", gender: "DIE", pluralForm: "Straßen", translationEs: "calle" });
export const bruecke = word({ lemma: "Brücke", gender: "DIE", pluralForm: "Brücken", translationEs: "puente" });
export const abbiegen = word({
  lemma: "ab|biegen",
  type: "VERB",
  gender: null,
  pluralForm: null,
  translationEs: "girar (en una calle) / doblar",
  separablePrefix: "ab",
  thirdPerson: "biegt ab",
  perfekt: "ist abgebogen",
  exampleDe: "Sie biegen rechts ab.",
  exampleEs: "Usted gira a la derecha.",
});
export const wohnung = word({
  lemma: "Wohnung",
  gender: "DIE",
  pluralForm: "Wohnungen",
  translationEs: "departamento / vivienda",
});
export const ampel = word({ lemma: "Ampel", gender: "DIE", pluralForm: "Ampeln", translationEs: "semáforo" });
export const girar = word({
  lemma: "ab|biegen",
  type: "VERB",
  gender: null,
  pluralForm: null,
  translationEs: "girar (en una calle)",
});
export const wieKomme = word({
  lemma: "Wie komme ich zum ...?",
  type: "EXPRESSION",
  gender: null,
  pluralForm: null,
  translationEs: "¿cómo llego a...?",
  clozeText: "Wie {{komme}} ich zum Bahnhof?",
});

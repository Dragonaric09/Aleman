import type { Auxiliary, CardKind, Level, WordType } from "./shared";

export interface CardKindWord {
  type: WordType;
  level: Level;
  noPlural: boolean;
  pluralForm: string | null;
  isIrregular: boolean;
  separablePrefix: string | null;
  auxiliary: Auxiliary | null;
  thirdPerson: string | null;
  perfekt: string | null;
  exampleDe: string | null;
  clozeText: string | null;
}

/** Tarjetas posibles de una palabra según la tabla 7.1; la principal va primero. */
export function possibleCardKinds(w: CardKindWord): CardKind[] {
  if (w.level === "C") return ["DE_TO_ES"];
  switch (w.type) {
    case "NOUN": {
      const kinds: CardKind[] = ["ES_TO_DE", "DE_TO_ES"];
      if (!w.noPlural && w.pluralForm) kinds.push("PLURAL");
      return kinds;
    }
    case "VERB": {
      const kinds: CardKind[] = ["ES_TO_DE", "DE_TO_ES"];
      const special = w.isIrregular || !!w.separablePrefix || w.auxiliary === "SEIN";
      if (special && w.thirdPerson && w.perfekt) kinds.push("VERB_FORMS");
      if (w.separablePrefix && w.exampleDe) kinds.push("SEPARABLE_ORDER");
      return kinds;
    }
    case "EXPRESSION":
      return w.clozeText ? ["CLOZE", "DE_TO_ES"] : ["DE_TO_ES"];
    default:
      return ["ES_TO_DE", "DE_TO_ES"];
  }
}

export interface WordCardPlan {
  /** Tarjeta principal (la primera activada). */
  primary: CardKind | null;
  /** Todas las tarjetas activadas, la principal primero. */
  kinds: CardKind[];
}

/** Aplica las tarjetas activadas en los ajustes del usuario. */
export function cardPlan(w: CardKindWord, enabled: readonly CardKind[]): WordCardPlan {
  const kinds = possibleCardKinds(w).filter((k) => enabled.includes(k));
  return { primary: kinds[0] ?? null, kinds };
}

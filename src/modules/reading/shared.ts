/** API del módulo reading apta para el cliente (funciones puras y tipos). */
export * from "./body";
export * from "./scoring";
export * from "./keys";
export { COMPREHENSION_THRESHOLD, MASTERY_THRESHOLD, MASTERY_DAYS, type TopicProgress } from "./progress";
export type { StoryExercises, StoryPhase } from "./content";
export type { KeywordInfo, StoryView, StoryListItem, TopicStories } from "./types";

export const PHASE_LABELS = {
  DISCOVER: { de: "Entdecken", es: "Descubrir" },
  PRACTICE: { de: "Üben", es: "Practicar" },
  CONTRAST: { de: "Kontrast", es: "Contrastar" },
  APPLY: { de: "Anwenden", es: "Aplicar" },
} as const;

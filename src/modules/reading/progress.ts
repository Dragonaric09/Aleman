import type { StoryPhase } from "./content";

export const COMPREHENSION_THRESHOLD = 0.8;
export const MASTERY_THRESHOLD = 0.8;
export const MASTERY_DAYS = 2;

export interface StoryMeta {
  id: string;
  phase: StoryPhase;
  sortOrder: number;
}

export interface AttemptMeta {
  storyId: string;
  comprehensionScore: number | null;
  productionScore: number | null;
  isProbe: boolean;
  studyDay: string;
}

export interface TopicProgress {
  total: number;
  read: number;
  /** Comprensión: ≥ 80 % en la primera lectura de una historia sin resaltado inicial (fase ≥ Üben). */
  comprehension: boolean;
  /** Dominio: ≥ 80 % en producción, en historias de contraste o aplicación, en dos días distintos. */
  mastery: boolean;
  masteryDays: number;
  unlocked: string[];
  nextStoryId: string | null;
  best: Record<string, { comprehension: number | null; production: number | null }>;
}

/** Progreso de un tema a partir de los intentos (función pura). Las historias se desbloquean en orden. */
export function topicProgress(stories: StoryMeta[], attempts: AttemptMeta[]): TopicProgress {
  const ordered = [...stories].sort((a, b) => a.sortOrder - b.sortOrder);
  const phaseOf = new Map(ordered.map((s) => [s.id, s.phase]));
  const attempted = new Set(attempts.map((a) => a.storyId));

  const best: TopicProgress["best"] = {};
  for (const a of attempts) {
    const b = (best[a.storyId] ??= { comprehension: null, production: null });
    if (a.comprehensionScore !== null) b.comprehension = Math.max(b.comprehension ?? 0, a.comprehensionScore);
    if (a.productionScore !== null) b.production = Math.max(b.production ?? 0, a.productionScore);
  }

  const comprehension = attempts.some(
    (a) =>
      a.isProbe &&
      phaseOf.get(a.storyId) !== undefined &&
      phaseOf.get(a.storyId) !== "DISCOVER" &&
      (a.comprehensionScore ?? 0) >= COMPREHENSION_THRESHOLD,
  );
  const masteryDays = new Set(
    attempts
      .filter((a) => {
        const p = phaseOf.get(a.storyId);
        return (p === "CONTRAST" || p === "APPLY") && (a.productionScore ?? 0) >= MASTERY_THRESHOLD;
      })
      .map((a) => a.studyDay),
  ).size;

  const unlocked: string[] = [];
  for (const [i, s] of ordered.entries()) {
    if (i === 0 || attempted.has(ordered[i - 1]!.id)) unlocked.push(s.id);
    else break;
  }
  const nextStoryId = ordered.find((s) => unlocked.includes(s.id) && !attempted.has(s.id))?.id ?? null;

  return {
    total: ordered.length,
    read: ordered.filter((s) => attempted.has(s.id)).length,
    comprehension,
    mastery: masteryDays >= MASTERY_DAYS,
    masteryDays,
    unlocked,
    nextStoryId,
    best,
  };
}

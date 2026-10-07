import type { Level } from "./shared";

export interface PriorityInput {
  level: Level;
  starred: boolean;
  isFalseFriend: boolean;
  isCognate: boolean;
  sources: string[];
  frequencyRank: number | null;
}

const BASE: Record<Level, number> = { A: 300, B: 200, C: 100 };

/** Prioridad de introducción (sección 7.2). Mayor = antes. */
export function computePriority(w: PriorityInput): number {
  let p = BASE[w.level];
  if (w.starred) p += 50;
  if (w.isFalseFriend) p += 20;
  if (w.isCognate) p -= 20;
  p += Math.min(w.sources.length, 4) * 5;
  if (w.frequencyRank != null && w.frequencyRank <= 1000) p += 10;
  return p;
}

export interface SortableNewWord {
  id: string;
  priority: number;
  lessonSortOrder: number | null;
  createdAt: Date;
}

/** Orden de introducción: prioridad DESC, luego lesson.sortOrder ASC, createdAt ASC, id ASC. */
export function compareForIntroduction(a: SortableNewWord, b: SortableNewWord): number {
  if (a.priority !== b.priority) return b.priority - a.priority;
  const la = a.lessonSortOrder ?? Number.MAX_SAFE_INTEGER;
  const lb = b.lessonSortOrder ?? Number.MAX_SAFE_INTEGER;
  if (la !== lb) return la - lb;
  const ca = a.createdAt.getTime();
  const cb = b.createdAt.getTime();
  if (ca !== cb) return ca - cb;
  return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
}

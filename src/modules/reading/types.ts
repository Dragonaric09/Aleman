import type { Gender, WordType } from "@/modules/vocabulary/shared";
import type { StoryExercises, StoryPhase } from "./content";
import type { TopicProgress } from "./progress";

export interface KeywordInfo {
  wordId: string;
  lemma: string;
  type: WordType;
  gender: Gender | null;
  translationEs: string;
  pluralForm: string | null;
  /** El usuario ya introdujo esta palabra en sus tarjetas. */
  known: boolean;
}

export interface StoryView {
  id: string;
  topic: { id: string; slug: string; title: string; targetLabel: string };
  phase: StoryPhase;
  sortOrder: number;
  totalInTopic: number;
  title: string;
  titleEs: string;
  body: string;
  highlight: boolean;
  reviewed: boolean;
  wordCount: number;
  exercises: StoryExercises;
  /** Por clave normalizada (ver keys.ts). */
  keywords: Record<string, KeywordInfo>;
  previousId: string | null;
  nextId: string | null;
  read: boolean;
}

export interface StoryListItem {
  id: string;
  phase: StoryPhase;
  sortOrder: number;
  title: string;
  titleEs: string;
  wordCount: number;
  keywords: number;
  knownKeywords: number;
  unlocked: boolean;
  read: boolean;
  best: { comprehension: number | null; production: number | null } | null;
}

export interface TopicStories {
  topic: {
    id: string;
    slug: string;
    title: string;
    summary: string;
    status: "AVAILABLE" | "PLANNED";
    lessonNumbers: number[];
  };
  progress: TopicProgress;
  stories: StoryListItem[];
}

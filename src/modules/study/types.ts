import type { AnswerVerdict, CardKind, CardState, Level, Rating } from "@/modules/vocabulary/shared";
import type { CardPrompt, CardWord } from "./card-content";

export interface QueueWord extends CardWord {
  id: string;
  level: Level;
  scope: string;
  lessonNumber: number | null;
  lessonTitle: string | null;
  pluralSuffix: string | null;
  noPlural: boolean;
  auxiliary: "HABEN" | "SEIN" | null;
}

export interface QueueItem {
  card: {
    id: string;
    kind: CardKind;
    state: CardState;
    due: string;
    reps: number;
    lapses: number;
    isLeech: boolean;
  };
  word: QueueWord;
  note: { mnemonic: string | null; ownSentence: string | null } | null;
  prompt: CardPrompt;
  preview: Record<Rating, { due: string; label: string }>;
}

export interface StudySummary {
  newAvailable: number;
  reviewsDue: number;
  learning: number;
  studyDay: string;
  reviewsDoneToday: number;
  newIntroducedToday: number;
  /** Próxima tarjeta en aprendizaje (si no hay nada más que estudiar). */
  nextLearningDue: string | null;
}

export interface ReviewResult {
  verdict: AnswerVerdict;
  card: {
    id: string;
    state: CardState;
    due: string;
    reps: number;
    lapses: number;
    isLeech: boolean;
    suspended: boolean;
  };
  isLeech: boolean;
  becameLeech: boolean;
  /** Tras el tercer repaso correcto se invita a escribir «mi frase». */
  inviteOwnSentence: boolean;
  next?: QueueItem[];
}

export interface PracticeNoun {
  wordId: string;
  lemma: string;
  gender: "DER" | "DIE" | "DAS";
  translationEs: string;
}

export interface PracticeWord {
  word: QueueWord;
}

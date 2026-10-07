import type { CardState, Rating } from "@/modules/vocabulary/shared";

export interface LeechInput {
  stateBefore: CardState;
  rating: Rating;
  lapsesAfter: number;
  wasLeech: boolean;
  wasSuspended: boolean;
  threshold: number;
  autoSuspend: boolean;
}

export interface LeechResult {
  isLeech: boolean;
  suspended: boolean;
  /** true solo en el repaso que la convierte en rebelde (para mostrar el aviso). */
  becameLeech: boolean;
}

/** Rebelde: tras AGAIN desde REVIEW, si lapses >= umbral (sección 7.5). */
export function applyLeechRules(i: LeechInput): LeechResult {
  const lapse = i.stateBefore === "REVIEW" && i.rating === "AGAIN";
  if (lapse && i.lapsesAfter >= i.threshold) {
    return {
      isLeech: true,
      suspended: i.wasSuspended || i.autoSuspend,
      becameLeech: !i.wasLeech,
    };
  }
  return { isLeech: i.wasLeech, suspended: i.wasSuspended, becameLeech: false };
}

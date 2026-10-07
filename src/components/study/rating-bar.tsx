"use client";

import { RATING_LABELS, RATINGS, type Rating } from "@/modules/vocabulary/shared";
import { cn } from "@/lib/cn";

const TONE: Record<Rating, string> = {
  AGAIN: "hover:border-bad/50 hover:bg-bad-bg",
  HARD: "hover:border-almost/50 hover:bg-almost-bg",
  GOOD: "hover:border-ok/50 hover:bg-ok-bg",
  EASY: "hover:border-accent/50 hover:bg-accent-soft",
};

/** Botones de calificación 1–4 con el intervalo de la vista previa; el sugerido va resaltado. */
export function RatingBar({
  preview,
  suggested,
  onRate,
  disabled,
}: {
  preview: Record<Rating, { label: string }>;
  suggested: Rating | null;
  onRate: (r: Rating) => void;
  disabled?: boolean;
}) {
  return (
    <div className="grid grid-cols-4 gap-2" role="group" aria-label="Calificación">
      {RATINGS.map((r, i) => {
        const isSuggested = suggested === r;
        return (
          <button
            key={r}
            type="button"
            disabled={disabled}
            onClick={() => onRate(r)}
            aria-keyshortcuts={`${i + 1}${isSuggested ? " Enter" : ""}`}
            aria-describedby={isSuggested ? "suggested-hint" : undefined}
            className={cn(
              "group border-line-strong bg-surface text-ink relative flex flex-col items-center gap-0.5 rounded-md border px-1 py-2.5 transition-colors disabled:opacity-50",
              TONE[r],
              isSuggested && "border-accent ring-accent/35 ring-2",
            )}
          >
            <span className="text-sm font-medium">{RATING_LABELS[r]}</span>
            <span className="tabular text-ink-2 text-xs">{preview[r].label}</span>
            <span className="kbd absolute top-1.5 left-1.5 hidden sm:inline" aria-hidden>
              {i + 1}
            </span>
          </button>
        );
      })}
      {suggested && (
        <span id="suggested-hint" className="sr-only">
          Sugerida; pulsa Enter para elegirla
        </span>
      )}
    </div>
  );
}

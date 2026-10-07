"use client";

import type { RefObject } from "react";
import { cn } from "@/lib/cn";

const CHARS = ["ä", "ö", "ü", "ß", "Ä", "Ö", "Ü"];

/** Inserta un carácter en la posición del cursor y avisa a React del cambio. */
export function insertAtCursor(el: HTMLInputElement, char: string, onChange: (value: string) => void) {
  const start = el.selectionStart ?? el.value.length;
  const end = el.selectionEnd ?? el.value.length;
  const value = el.value.slice(0, start) + char + el.value.slice(end);
  onChange(value);
  requestAnimationFrame(() => {
    el.focus();
    el.setSelectionRange(start + char.length, start + char.length);
  });
}

/** Atajos Alt+a/o/u/s (con Mayús para mayúsculas). Devuelve el carácter o null. */
export function umlautFromKey(e: React.KeyboardEvent): string | null {
  if (!e.altKey || e.ctrlKey || e.metaKey) return null;
  const map: Record<string, [string, string]> = { KeyA: ["ä", "Ä"], KeyO: ["ö", "Ö"], KeyU: ["ü", "Ü"], KeyS: ["ß", "ß"] };
  const pair = map[e.code];
  return pair ? pair[e.shiftKey ? 1 : 0] : null;
}

export function UmlautBar({
  targetRef,
  onInsert,
  disabled,
  className,
}: {
  targetRef: RefObject<HTMLInputElement | null>;
  onInsert: (value: string) => void;
  disabled?: boolean;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-wrap gap-1.5", className)} role="group" aria-label="Caracteres alemanes">
      {CHARS.map((c) => (
        <button
          key={c}
          type="button"
          tabIndex={-1}
          disabled={disabled}
          aria-label={`Insertar ${c}`}
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => targetRef.current && insertAtCursor(targetRef.current, c, onInsert)}
          className="h-9 min-w-9 rounded-md border border-line-strong bg-surface px-2 font-serif text-base text-ink transition-colors hover:border-accent hover:text-accent disabled:opacity-40"
        >
          {c}
        </button>
      ))}
    </div>
  );
}

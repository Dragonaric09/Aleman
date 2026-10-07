"use client";

import { Delete } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/cn";

/** Fichas pulsables y arrastrables que forman la frase (SEPARABLE_ORDER). */
export function SeparableOrder({
  tiles,
  value,
  onChange,
  disabled,
}: {
  tiles: string[];
  /** Índices de las fichas elegidas, en orden. */
  value: number[];
  onChange: (next: number[]) => void;
  disabled?: boolean;
}) {
  const [dragging, setDragging] = useState<number | null>(null);
  const available = tiles.map((t, i) => ({ t, i })).filter(({ i }) => !value.includes(i));

  const tileClass =
    "rounded-md border border-line-strong bg-surface px-3 py-1.5 font-serif text-lg text-ink shadow-paper transition-colors hover:border-accent disabled:opacity-50";

  return (
    <div className="grid gap-3">
      <div
        className={cn(
          "flex min-h-14 flex-wrap items-center gap-2 rounded-md border border-dashed border-line-strong bg-surface-2/60 p-2",
          dragging !== null && "border-accent",
        )}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          if (dragging !== null && !value.includes(dragging)) onChange([...value, dragging]);
          setDragging(null);
        }}
        aria-label="Tu frase"
        aria-live="polite"
        lang="de"
      >
        {value.length === 0 && <span className="px-2 text-sm text-ink-2">Pulsa o arrastra las fichas aquí…</span>}
        {value.map((i, pos) => (
          <button
            key={`${i}-${pos}`}
            type="button"
            disabled={disabled}
            className={cn(tileClass, "bg-accent-soft")}
            onClick={() => onChange(value.filter((_, p) => p !== pos))}
            aria-label={`Quitar «${tiles[i]}»`}
          >
            {tiles[i]}
          </button>
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-2" lang="de">
        {available.map(({ t, i }) => (
          <button
            key={i}
            type="button"
            draggable={!disabled}
            onDragStart={() => setDragging(i)}
            onDragEnd={() => setDragging(null)}
            disabled={disabled}
            className={tileClass}
            onClick={() => onChange([...value, i])}
          >
            {t}
          </button>
        ))}
        <button
          type="button"
          disabled={disabled || value.length === 0}
          onClick={() => onChange(value.slice(0, -1))}
          className="ml-auto inline-flex items-center gap-1.5 rounded-md px-2 py-1.5 text-sm text-ink-2 hover:bg-surface-2 hover:text-ink disabled:opacity-40"
        >
          <Delete className="size-4" aria-hidden />
          Borrar última
        </button>
      </div>
    </div>
  );
}

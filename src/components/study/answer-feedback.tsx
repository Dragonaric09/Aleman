"use client";

import { AlertTriangle, Check, Eye, Lightbulb, X } from "lucide-react";
import { charDiff, type QueueItem } from "@/modules/study/shared";
import type { AnswerVerdict } from "@/modules/vocabulary/shared";
import { cn } from "@/lib/cn";
import { WordDisplay } from "../word/gender";

const VERDICT = {
  CORRECT: { label: "¡Correcto!", icon: Check, box: "border-ok/30 bg-ok-bg", text: "text-ok" },
  ALMOST: { label: "Casi", icon: AlertTriangle, box: "border-almost/30 bg-almost-bg", text: "text-almost" },
  WRONG: { label: "Incorrecto", icon: X, box: "border-bad/30 bg-bad-bg", text: "text-bad" },
  SELF_GRADED: { label: "Respuesta", icon: Eye, box: "border-line bg-surface-2", text: "text-ink" },
} as const;

export function Diff({ typed, expected }: { typed: string; expected: string }) {
  const parts = charDiff(typed, expected);
  return (
    <p className="font-mono text-sm break-words" aria-label={`Escribiste «${typed}»; se esperaba «${expected}»`}>
      {parts.map((p, i) => (
        <span
          key={i}
          className={cn(
            p.type === "missing" && "rounded-[3px] bg-ok/15 text-ok underline decoration-dotted",
            p.type === "extra" && "rounded-[3px] bg-bad/15 text-bad line-through",
          )}
        >
          {p.text}
        </span>
      ))}
    </p>
  );
}

/** Retroalimentación: color + icono + texto; respuesta correcta con artículo coloreado, plural y ejemplos. */
export function AnswerFeedback({
  item,
  verdict,
  typed,
  expected,
  hints,
}: {
  item: QueueItem;
  verdict: AnswerVerdict;
  typed: string;
  expected: string;
  hints: string[];
}) {
  const v = VERDICT[verdict];
  const Icon = v.icon;
  const w = item.word;
  const showDiff = (verdict === "ALMOST" || verdict === "WRONG") && typed && item.card.kind !== "DE_TO_ES";

  return (
    <section role="status" aria-live="polite" className={cn("animate-rise rounded-lg border p-4 sm:p-5", v.box)}>
      <div className={cn("mb-3 flex items-center gap-2 font-medium", v.text)}>
        <Icon className="size-5" aria-hidden />
        {v.label}
        {hints.length > 0 && <span className="text-sm font-normal">· {hints.join(" · ")}</span>}
      </div>

      <div className="grid gap-3">
        <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
          {item.card.kind === "DE_TO_ES" ? (
            <p className="font-serif text-2xl">{expected}</p>
          ) : item.card.kind === "PLURAL" ? (
            <WordDisplay word={w} plural={w.pluralForm} size="lg" />
          ) : item.card.kind === "ES_TO_DE" ? (
            <WordDisplay word={w} size="lg" />
          ) : (
            <p lang="de" className="font-serif text-2xl">
              {expected}
            </p>
          )}
          {w.type === "NOUN" && item.card.kind !== "PLURAL" && (
            <span lang="de" className="text-sm text-ink-2">
              Plural: {w.noPlural ? "sin plural" : <span className="text-plural-text">die {w.pluralForm}</span>}
            </span>
          )}
          {w.type === "VERB" && w.perfekt && item.card.kind !== "VERB_FORMS" && (
            <span lang="de" className="text-sm text-ink-2">
              {w.thirdPerson} · {w.perfekt}
            </span>
          )}
        </div>

        {item.card.kind !== "DE_TO_ES" && <p className="text-sm text-ink-2">{w.translationEs}</p>}
        {showDiff && <Diff typed={typed} expected={expected} />}

        {(w.exampleDe || w.exampleEs) && (
          <blockquote className="border-l-2 border-accent/60 pl-3 text-sm">
            {w.exampleDe && (
              <p lang="de" className="font-serif text-base italic">
                {w.exampleDe}
              </p>
            )}
            {w.exampleEs && <p className="text-ink-2">{w.exampleEs}</p>}
          </blockquote>
        )}

        {w.isFalseFriend && w.falseFriendNote && (
          <p className="flex gap-2 rounded-md border border-almost/30 bg-almost-bg px-3 py-2 text-sm text-almost">
            <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden />
            <span>
              <strong>Falso amigo:</strong> {w.falseFriendNote}
            </span>
          </p>
        )}

        {item.note?.mnemonic && (
          <p className="flex gap-2 text-sm">
            <Lightbulb className="mt-0.5 size-4 shrink-0 text-accent" aria-hidden />
            <span>{item.note.mnemonic}</span>
          </p>
        )}
      </div>
    </section>
  );
}

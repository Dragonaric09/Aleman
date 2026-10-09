"use client";

import { Check, RotateCcw, X } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/form";
import { cn } from "@/lib/cn";
import type { TopicContent } from "@/modules/grammar/shared";
import { checkCloze } from "@/modules/reading/shared";
import { insertAtCursor, umlautFromKey } from "../study/umlaut-bar";

type Exercise = TopicContent["exercises"][number];

/**
 * Mini ejercicios del tema: primero comprensión (elegir), luego producción (escribir).
 * Es práctica libre: no se guarda ni afecta al progreso.
 */
export function TopicExercises({ exercises }: { exercises: Exercise[] }) {
  const choices = exercises.filter((e) => e.type === "choice");
  const clozes = exercises.filter((e) => e.type === "cloze");
  const [picked, setPicked] = useState<(number | null)[]>(() => choices.map(() => null));
  const [typed, setTyped] = useState<string[]>(() => clozes.map(() => ""));
  const [checked, setChecked] = useState<boolean[]>(() => clozes.map(() => false));

  const reset = () => {
    setPicked(choices.map(() => null));
    setTyped(clozes.map(() => ""));
    setChecked(clozes.map(() => false));
  };

  return (
    <div className="grid gap-8">
      {choices.length > 0 && (
        <section aria-labelledby="ex-choice">
          <h3 id="ex-choice" className="mb-1 font-medium">
            Paso 1 · Entiende la forma
          </h3>
          <p className="text-ink-2 mb-4 text-sm">
            Elige la opción correcta. Fíjate en el artículo y en la pregunta «Wo?».
          </p>
          <ol className="grid gap-5">
            {choices.map((e, i) => {
              const answer = picked[i];
              return (
                <li key={i}>
                  <p lang="de" className="font-serif text-lg">
                    {e.prompt}
                  </p>
                  <div
                    className="mt-2 flex flex-wrap gap-2"
                    role="radiogroup"
                    aria-label={`Pregunta ${i + 1}`}
                  >
                    {e.options.map((o, j) => {
                      const chosen = answer === j;
                      const right = answer !== null && j === e.answer;
                      return (
                        <button
                          key={j}
                          type="button"
                          role="radio"
                          aria-checked={chosen}
                          disabled={answer !== null}
                          onClick={() => setPicked((p) => p.map((x, k) => (k === i ? j : x)))}
                          className={cn(
                            "border-field bg-surface enabled:hover:bg-surface-2 rounded-md border px-3 py-1.5 text-sm transition-colors",
                            right && "border-ok bg-ok-bg text-ok",
                            chosen && !right && "border-bad bg-bad-bg text-bad",
                          )}
                        >
                          {o}
                        </button>
                      );
                    })}
                  </div>
                  {answer !== null && (
                    <p
                      role="status"
                      className={cn("mt-2 text-sm", answer === e.answer ? "text-ok" : "text-bad")}
                    >
                      {answer === e.answer ? "¡Correcto!" : "No."} {e.explanation}
                    </p>
                  )}
                </li>
              );
            })}
          </ol>
        </section>
      )}

      {clozes.length > 0 && (
        <section aria-labelledby="ex-cloze">
          <h3 id="ex-cloze" className="mb-1 font-medium">
            Paso 2 · Escríbela tú
          </h3>
          <p className="text-ink-2 mb-4 text-sm">
            Completa el hueco y pulsa Enter. Alt + a / o / u / s para ä ö ü ß.
          </p>
          <ol className="grid gap-5">
            {clozes.map((e, i) => {
              const [before, after] = e.text.split(/\{\{[^{}]+\}\}/);
              const result = checked[i] ? checkCloze(e.text, typed[i] ?? "") : null;
              return (
                <li key={i}>
                  <form
                    className="flex flex-wrap items-baseline gap-x-2 gap-y-1 font-serif text-lg"
                    lang="de"
                    onSubmit={(ev) => {
                      ev.preventDefault();
                      if (typed[i]?.trim()) setChecked((c) => c.map((x, k) => (k === i ? true : x)));
                    }}
                  >
                    <span>{before}</span>
                    <Input
                      aria-label={`Hueco ${i + 1}`}
                      value={typed[i]}
                      autoComplete="off"
                      autoCorrect="off"
                      autoCapitalize="off"
                      spellCheck={false}
                      onChange={(ev) => {
                        const v = ev.target.value;
                        setTyped((t) => t.map((x, k) => (k === i ? v : x)));
                        setChecked((c) => c.map((x, k) => (k === i ? false : x)));
                      }}
                      onKeyDown={(ev) => {
                        const ch = umlautFromKey(ev);
                        if (ch) {
                          ev.preventDefault();
                          insertAtCursor(ev.currentTarget, ch, (v) =>
                            setTyped((t) => t.map((x, k) => (k === i ? v : x))),
                          );
                        }
                      }}
                      className={cn(
                        "inline-block h-9 w-28 font-serif text-lg",
                        result?.verdict === "CORRECT" && "border-ok",
                        result && result.verdict !== "CORRECT" && "border-bad",
                      )}
                    />
                    <span>{after}</span>
                  </form>
                  {e.es && <p className="text-ink-2 mt-1 text-sm">{e.es}</p>}
                  {result && (
                    <p
                      role="status"
                      className={cn(
                        "mt-1 flex items-center gap-1.5 text-sm",
                        result.verdict === "CORRECT"
                          ? "text-ok"
                          : result.verdict === "ALMOST"
                            ? "text-almost"
                            : "text-bad",
                      )}
                    >
                      {result.verdict === "CORRECT" ? (
                        <Check className="size-4" aria-hidden />
                      ) : (
                        <X className="size-4" aria-hidden />
                      )}
                      {result.verdict === "CORRECT" ? "¡Correcto!" : `Respuesta: ${result.expected}`}
                      {result.hints.length > 0 && (
                        <span className="text-ink-2">· {result.hints.join(" · ")}</span>
                      )}
                    </p>
                  )}
                </li>
              );
            })}
          </ol>
        </section>
      )}

      <div>
        <Button variant="ghost" size="sm" onClick={reset}>
          <RotateCcw aria-hidden /> Empezar de nuevo
        </Button>
      </div>
    </div>
  );
}

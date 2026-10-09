"use client";

import * as Popover from "@radix-ui/react-popover";
import { ExternalLink, Sparkles } from "lucide-react";
import Link from "next/link";
import { Fragment, useMemo } from "react";
import { cn } from "@/lib/cn";
import {
  normalizeKey,
  parseStoryBody,
  tokenize,
  type KeywordInfo,
  type Token,
} from "@/modules/reading/shared";
import { WordDisplay } from "../word/gender";

export type StoryTextMode = "read" | "find" | "review";

const GENDER_UNDERLINE = {
  DER: "decoration-der",
  DIE: "decoration-die",
  DAS: "decoration-das",
} as const;

interface Props {
  body: string;
  mode: StoryTextMode;
  highlight?: boolean;
  keywords?: Record<string, KeywordInfo>;
  /** Modo «find»: ids de palabras tocadas. */
  tapped?: Set<number>;
  onToggle?: (id: number) => void;
}

/** Agrupa tokens consecutivos del mismo segmento de marcado (p. ej. «Kein Problem», «neben dem»). */
function groupTokens(tokens: Token[]) {
  const groups: Token[][] = [];
  for (const t of tokens) {
    const last = groups.at(-1);
    const marked = t.targetId !== null || t.error || t.keywordKey !== null;
    if (last && marked && last[0]!.segment === t.segment) last.push(t);
    else groups.push([t]);
  }
  // Los separadores al final de un grupo marcado (p. ej. coma) se pintan fuera del grupo.
  return groups;
}

function Keyword({ group, info }: { group: Token[]; info: KeywordInfo | undefined }) {
  const text = group.map((t) => t.text).join("");
  if (!info) return <>{text}</>;
  const genderClass =
    info.type === "NOUN" && info.gender ? GENDER_UNDERLINE[info.gender] : "decoration-accent/70";
  return (
    <Popover.Root>
      <Popover.Trigger asChild>
        <button
          type="button"
          className={cn(
            "hover:bg-surface-2 focus-visible:bg-surface-2 inline cursor-pointer rounded-[3px] underline decoration-2 underline-offset-[0.25em] transition-colors",
            genderClass,
            !info.known && "decoration-dotted",
          )}
          aria-label={`${text}: ver significado`}
        >
          {text}
        </button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          side="top"
          sideOffset={8}
          collisionPadding={16}
          className="animate-rise border-line bg-surface shadow-lift z-50 w-64 rounded-lg border p-4"
        >
          <WordDisplay word={info} size="md" />
          <p className="text-ink-2 mt-1 text-sm">{info.translationEs}</p>
          {info.type === "NOUN" && info.pluralForm && (
            <p lang="de" className="text-plural-text mt-1 text-xs">
              die {info.pluralForm}
            </p>
          )}
          <div className="mt-3 flex items-center justify-between gap-2 text-xs">
            {info.known ? (
              <span className="text-ok">Ya está en tus tarjetas</span>
            ) : (
              <span className="text-accent inline-flex items-center gap-1">
                <Sparkles className="size-3" aria-hidden /> Nueva para ti
              </span>
            )}
            <Link
              href={`/vocabulario/${info.wordId}`}
              target="_blank"
              className="text-ink-2 hover:text-ink inline-flex items-center gap-1"
            >
              Ficha <ExternalLink className="size-3" aria-hidden />
            </Link>
          </div>
          <Popover.Arrow className="fill-surface" />
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}

/** Texto de una historia: lectura (glosas y resaltado), búsqueda de formas o revisión del resultado. */
export function StoryText({ body, mode, highlight = false, keywords = {}, tapped, onToggle }: Props) {
  const tokens = useMemo(() => tokenize(parseStoryBody(body)), [body]);
  const paragraphs = useMemo(() => {
    const byP = new Map<number, Token[]>();
    for (const t of tokens) byP.set(t.paragraph, [...(byP.get(t.paragraph) ?? []), t]);
    return [...byP.values()];
  }, [tokens]);
  const foundTargets = useMemo(() => {
    const s = new Set<number>();
    for (const id of tapped ?? []) {
      const t = tokens[id];
      if (t?.targetId != null) s.add(t.targetId);
    }
    return s;
  }, [tapped, tokens]);

  return (
    <div lang="de" className="text-ink grid gap-4 font-serif text-[1.22rem] leading-[1.85] sm:text-[1.3rem]">
      {paragraphs.map((p, pi) => (
        <p key={pi} className="text-pretty">
          {mode === "find"
            ? p.map((t) =>
                t.isWord ? (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => onToggle?.(t.id)}
                    aria-pressed={tapped?.has(t.id) ?? false}
                    className={cn(
                      "hover:bg-accent-soft rounded-[4px] px-[1px] transition-colors",
                      tapped?.has(t.id) && "bg-accent text-accent-ink hover:bg-accent",
                    )}
                  >
                    {t.text}
                  </button>
                ) : (
                  <Fragment key={t.id}>{t.text}</Fragment>
                ),
              )
            : groupTokens(p).map((g) => {
                const first = g[0]!;
                const text = g.map((t) => t.text).join("");
                if (first.error) {
                  return (
                    <span
                      key={first.id}
                      className="bg-bad-bg text-bad rounded-[3px] px-0.5 line-through decoration-2"
                    >
                      {text}
                      <span className="sr-only"> (incorrecto)</span>
                    </span>
                  );
                }
                if (first.targetId !== null) {
                  if (mode === "review") {
                    const found = foundTargets.has(first.targetId);
                    return (
                      <mark
                        key={first.id}
                        className={cn(
                          "text-ink rounded-[4px] px-0.5",
                          found
                            ? "bg-ok-bg ring-ok/40 ring-1"
                            : "outline-almost/70 bg-transparent outline-1 outline-dashed",
                        )}
                      >
                        {text}
                        <span className="sr-only">{found ? " (encontrada)" : " (no encontrada)"}</span>
                      </mark>
                    );
                  }
                  return highlight ? (
                    <mark
                      key={first.id}
                      className="bg-accent-soft text-ink rounded-[4px] px-0.5 shadow-[inset_0_-2px_0_var(--accent)]"
                    >
                      {text}
                    </mark>
                  ) : (
                    <Fragment key={first.id}>{text}</Fragment>
                  );
                }
                if (first.keywordKey !== null && mode === "read") {
                  return <Keyword key={first.id} group={g} info={keywords[normalizeKey(first.keywordKey)]} />;
                }
                if (mode === "review" && g.some((t) => tapped?.has(t.id))) {
                  return g.map((t) =>
                    tapped?.has(t.id) && t.isWord ? (
                      <span key={t.id} className="bg-bad-bg text-bad rounded-[3px] line-through">
                        {t.text}
                      </span>
                    ) : (
                      <Fragment key={t.id}>{t.text}</Fragment>
                    ),
                  );
                }
                return <Fragment key={first.id}>{text}</Fragment>;
              })}
        </p>
      ))}
    </div>
  );
}

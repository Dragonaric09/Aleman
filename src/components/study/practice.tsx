"use client";

import { ArrowLeft, ArrowRight, BookOpen, Check, RotateCcw, Shuffle, Volume2, X } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, EmptyState } from "@/components/ui/card";
import { cn } from "@/lib/cn";
import type { QueueItem } from "@/modules/study/shared";
import { ARTICLES, citationForm, type Gender } from "@/modules/vocabulary/shared";
import { WordDisplay } from "../word/gender";
import { useSpeech } from "./use-speech";

type LessonInfo = { number: number; title: string; topic: string | null; words: number };
type TtsPrefs = { enabled: boolean; rate: number; voice: string | null };
type Noun = {
  wordId: string;
  lemma: string;
  gender: Gender;
  translationEs: string;
  pluralForm: string | null;
};

export function PracticeHub({ lessons, tts }: { lessons: LessonInfo[]; tts: TtsPrefs }) {
  const [mode, setMode] = useState<"menu" | "gender" | { lesson: number }>("menu");
  if (mode === "gender") return <GenderDrill onExit={() => setMode("menu")} tts={tts} />;
  if (typeof mode === "object")
    return <LessonCards lesson={mode.lesson} onExit={() => setMode("menu")} tts={tts} />;
  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_1.4fr]">
      <Card raised className="flex flex-col justify-between gap-6 p-6">
        <div>
          <p className="mb-3 flex gap-1.5" aria-hidden>
            <span className="bg-der/12 text-der-text rounded-sm px-2 py-0.5 text-sm font-semibold">der</span>
            <span className="bg-die/12 text-die-text rounded-sm px-2 py-0.5 text-sm font-semibold">die</span>
            <span className="bg-das/12 text-das-text rounded-sm px-2 py-0.5 text-sm font-semibold">das</span>
          </p>
          <h2 className="font-serif text-2xl font-semibold">Drill de género</h2>
          <p className="text-ink-2 mt-2 text-sm">
            Rondas de 20 sustantivos que ya has visto. Elige el artículo con los botones o las teclas 1, 2 y
            3. Los que fallas vuelven en la siguiente ronda.
          </p>
        </div>
        <Button size="lg" onClick={() => setMode("gender")}>
          Empezar <ArrowRight aria-hidden />
        </Button>
      </Card>
      <Card className="p-6">
        <h2 className="flex items-center gap-2 font-serif text-2xl font-semibold">
          <BookOpen className="text-accent size-5" aria-hidden /> Por lección
        </h2>
        <p className="text-ink-2 mt-2 mb-4 text-sm">
          Recorre todas las palabras de una lección en modo tarjeta, ideal antes de una clase o un examen.
        </p>
        <ul className="grid gap-2">
          {lessons.map((l) => (
            <li key={l.number}>
              <button
                type="button"
                onClick={() => setMode({ lesson: l.number })}
                disabled={l.words === 0}
                className="border-line hover:border-accent hover:bg-surface-2 flex w-full items-center gap-3 rounded-md border px-3 py-2.5 text-left transition-colors disabled:opacity-40"
              >
                <span className="tabular text-accent w-10 shrink-0 font-serif text-lg">{l.number}</span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium">{l.title}</span>
                  {l.topic && <span className="text-ink-2 block truncate text-xs">{l.topic}</span>}
                </span>
                <span className="tabular text-ink-2 shrink-0 text-xs">{l.words} palabras</span>
              </button>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}

const GENDER_KEYS: Gender[] = ["DER", "DIE", "DAS"];

function GenderDrill({ onExit, tts }: { onExit: () => void; tts: TtsPrefs }) {
  const [round, setRound] = useState<Noun[] | null>(null);
  const [index, setIndex] = useState(0);
  const [picked, setPicked] = useState<Gender | null>(null);
  const [score, setScore] = useState({ right: 0, wrong: 0 });
  // Contador de fallos en memoria de la sesión: los más fallados vuelven primero.
  const [misses, setMisses] = useState<Map<string, { noun: Noun; count: number }>>(new Map());
  const [error, setError] = useState<string | null>(null);
  const speech = useSpeech({ enabled: tts.enabled, rate: tts.rate, voiceName: tts.voice });

  const loadRound = useCallback(async () => {
    setError(null);
    try {
      const res = await fetch("/api/practice/gender?limit=20");
      const body = (await res.json()) as { items?: Noun[]; error?: { message: string } };
      if (!res.ok) throw new Error(body.error?.message ?? "Error");
      const failed = [...misses.values()].sort((a, b) => b.count - a.count).map((m) => m.noun);
      const fresh = (body.items ?? []).filter((n) => !failed.some((f) => f.wordId === n.wordId));
      setRound([...failed.slice(0, 10), ...fresh].slice(0, 20));
      setIndex(0);
      setPicked(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo cargar la ronda");
    }
  }, [misses]);

  useEffect(() => {
    loadRound();
    // Solo al entrar.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const current = round?.[index] ?? null;

  const choose = useCallback(
    (g: Gender) => {
      if (!current || picked) return;
      setPicked(g);
      const ok = g === current.gender;
      setScore((s) => ({ right: s.right + (ok ? 1 : 0), wrong: s.wrong + (ok ? 0 : 1) }));
      setMisses((m) => {
        const next = new Map(m);
        const prev = next.get(current.wordId);
        if (ok) {
          if (prev && prev.count <= 1) next.delete(current.wordId);
          else if (prev) next.set(current.wordId, { ...prev, count: prev.count - 1 });
        } else next.set(current.wordId, { noun: current, count: (prev?.count ?? 0) + 1 });
        return next;
      });
      speech.speak(`${ARTICLES[current.gender]} ${current.lemma}`);
    },
    [current, picked, speech],
  );

  const next = useCallback(() => {
    setPicked(null);
    setIndex((i) => i + 1);
  }, []);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      if (!picked && ["1", "2", "3"].includes(e.key)) choose(GENDER_KEYS[Number(e.key) - 1]!);
      else if (picked && (e.key === "Enter" || e.key === " ")) {
        e.preventDefault();
        next();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [picked, choose, next]);

  const header = (
    <div className="mb-6 flex items-center justify-between gap-3">
      <Button variant="ghost" size="sm" onClick={onExit}>
        <ArrowLeft aria-hidden /> Práctica
      </Button>
      <p className="tabular text-ink-2 text-sm" aria-live="polite">
        <span className="text-ok">{score.right} aciertos</span> ·{" "}
        <span className="text-bad">{score.wrong} fallos</span>
      </p>
    </div>
  );

  if (error)
    return (
      <div className="mx-auto max-w-[640px]">
        {header}
        <p role="alert" className="text-bad">
          {error}
        </p>
      </div>
    );
  if (!round)
    return (
      <div className="mx-auto max-w-[640px]">
        {header}
        <p className="text-ink-2">Cargando…</p>
      </div>
    );
  if (round.length === 0)
    return (
      <div className="mx-auto max-w-[640px]">
        {header}
        <EmptyState title="Aún no hay sustantivos introducidos">
          Estudia algunas palabras nuevas y vuelve al drill.
        </EmptyState>
      </div>
    );

  if (!current)
    return (
      <div className="mx-auto max-w-[640px]">
        {header}
        <Card raised className="p-8 text-center">
          <h2 className="font-serif text-3xl font-semibold">Ronda terminada</h2>
          <p className="text-ink-2 mt-2">
            {misses.size > 0
              ? `${misses.size} sustantivos volverán en la siguiente ronda.`
              : "¡Sin fallos pendientes!"}
          </p>
          <Button className="mt-6" size="lg" onClick={loadRound}>
            <Shuffle aria-hidden /> Otra ronda
          </Button>
        </Card>
      </div>
    );

  const ok = picked === current.gender;
  return (
    <div className="mx-auto max-w-[640px]">
      {header}
      <p className="text-ink-2 mb-2 text-center text-xs">
        {index + 1} / {round.length}
      </p>
      <Card raised className="flex min-h-56 flex-col items-center justify-center gap-2 p-8 text-center">
        {picked ? (
          <WordDisplay word={{ lemma: current.lemma, type: "NOUN", gender: current.gender }} size="xl" />
        ) : (
          <p lang="de" className="font-serif text-5xl font-medium tracking-tight">
            {current.lemma}
          </p>
        )}
        <p className="text-ink-2 text-sm">{current.translationEs}</p>
        {picked && (
          <p
            role="status"
            className={cn("mt-2 flex items-center gap-1.5 font-medium", ok ? "text-ok" : "text-bad")}
          >
            {ok ? <Check className="size-4" aria-hidden /> : <X className="size-4" aria-hidden />}
            {ok ? "¡Correcto!" : `Es «${ARTICLES[current.gender]}»`}
          </p>
        )}
      </Card>
      <div className="mt-5 grid grid-cols-3 gap-3" role="group" aria-label="Elige el artículo">
        {GENDER_KEYS.map((g, i) => (
          <button
            key={g}
            type="button"
            disabled={!!picked}
            onClick={() => choose(g)}
            aria-keyshortcuts={String(i + 1)}
            className={cn(
              "bg-surface relative flex h-16 items-center justify-center rounded-md border-2 font-serif text-2xl font-semibold transition-colors disabled:cursor-default",
              g === "DER" && "border-der/40 text-der-text hover:bg-der/10",
              g === "DIE" && "border-die/40 text-die-text hover:bg-die/10",
              g === "DAS" && "border-das/40 text-das-text hover:bg-das/10",
              picked && g === current.gender && "ring-accent/40 ring-4",
              picked && g !== current.gender && "opacity-40",
            )}
          >
            {ARTICLES[g]}
            <span className="kbd absolute top-1.5 left-1.5 hidden font-sans sm:inline">{i + 1}</span>
          </button>
        ))}
      </div>
      {picked && (
        <div className="mt-4 flex justify-center gap-2">
          {speech.available && (
            <Button
              variant="ghost"
              onClick={() => speech.speak(`${ARTICLES[current.gender]} ${current.lemma}`)}
            >
              <Volume2 aria-hidden /> Escuchar
            </Button>
          )}
          <Button onClick={next} autoFocus>
            Siguiente <ArrowRight aria-hidden />
          </Button>
        </div>
      )}
    </div>
  );
}

function LessonCards({ lesson, onExit, tts }: { lesson: number; onExit: () => void; tts: TtsPrefs }) {
  const [data, setData] = useState<{
    lesson: { number: number; title: string };
    words: QueueItem["word"][];
  } | null>(null);
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [direction, setDirection] = useState<"de" | "es">("de");
  const speech = useSpeech({ enabled: tts.enabled, rate: tts.rate, voiceName: tts.voice });

  useEffect(() => {
    fetch(`/api/practice/lesson/${lesson}`)
      .then((r) => r.json())
      .then(setData)
      .catch(() => setData({ lesson: { number: lesson, title: "" }, words: [] }));
  }, [lesson]);

  const words = data?.words ?? [];
  const w = words[index];
  const go = useCallback(
    (d: number) => {
      setFlipped(false);
      setIndex((i) => Math.min(Math.max(0, i + d), Math.max(0, words.length - 1)));
    },
    [words.length],
  );

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === " " || e.key === "Enter") {
        e.preventDefault();
        setFlipped((f) => !f);
      } else if (e.key === "ArrowRight") go(1);
      else if (e.key === "ArrowLeft") go(-1);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [go]);

  return (
    <div className="mx-auto max-w-[640px]">
      <div className="mb-6 flex items-center justify-between gap-3">
        <Button variant="ghost" size="sm" onClick={onExit}>
          <ArrowLeft aria-hidden /> Práctica
        </Button>
        <Button variant="ghost" size="sm" onClick={() => setDirection((d) => (d === "de" ? "es" : "de"))}>
          <RotateCcw aria-hidden /> {direction === "de" ? "Alemán → español" : "Español → alemán"}
        </Button>
      </div>
      {!data ? (
        <p className="text-ink-2">Cargando…</p>
      ) : !w ? (
        <EmptyState title="Lección sin palabras" />
      ) : (
        <>
          <p className="text-ink-2 mb-2 text-center text-sm">
            Lección {data.lesson.number} · {data.lesson.title} ·{" "}
            <span className="tabular">
              {index + 1} / {words.length}
            </span>
          </p>
          <button
            type="button"
            onClick={() => setFlipped((f) => !f)}
            className="w-full rounded-lg text-left"
            aria-label={flipped ? "Ocultar respuesta" : "Mostrar respuesta"}
          >
            <Card raised className="flex min-h-64 flex-col items-center justify-center gap-3 p-8 text-center">
              {direction === "de" || flipped ? (
                <WordDisplay word={w} size="xl" />
              ) : (
                <p className="font-serif text-4xl">{w.translationEs}</p>
              )}
              {flipped && (
                <div className="animate-rise grid gap-2">
                  {direction === "de" && <p className="text-lg">{w.translationEs}</p>}
                  {w.type === "NOUN" && (
                    <p lang="de" className="text-plural-text text-sm">
                      {w.noPlural ? "sin plural" : `die ${w.pluralForm}`}
                    </p>
                  )}
                  {w.perfekt && (
                    <p lang="de" className="text-ink-2 text-sm">
                      {w.thirdPerson} · {w.perfekt}
                    </p>
                  )}
                  {w.exampleDe && (
                    <p lang="de" className="text-ink-2 font-serif italic">
                      {w.exampleDe}
                    </p>
                  )}
                </div>
              )}
              {!flipped && <p className="text-ink-2 text-xs">Pulsa la tarjeta o Espacio para girarla</p>}
            </Card>
          </button>
          <div className="mt-5 flex items-center justify-between gap-2">
            <Button variant="secondary" onClick={() => go(-1)} disabled={index === 0}>
              <ArrowLeft aria-hidden /> Anterior
            </Button>
            {speech.available && (
              <Button variant="ghost" onClick={() => speech.speak(citationForm(w))}>
                <Volume2 aria-hidden /> Escuchar
              </Button>
            )}
            <Button variant="secondary" onClick={() => go(1)} disabled={index >= words.length - 1}>
              Siguiente <ArrowRight aria-hidden />
            </Button>
          </div>
        </>
      )}
    </div>
  );
}

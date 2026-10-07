"use client";

import * as Dialog from "@radix-ui/react-dialog";
import {
  CheckCircle2,
  ExternalLink,
  Flame,
  Keyboard,
  Lightbulb,
  PenLine,
  Undo2,
  Volume2,
  X,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { saveNoteAction } from "@/app/(app)/vocabulario/actions";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input, Textarea } from "@/components/ui/form";
import { cn } from "@/lib/cn";
import {
  checkAnswer,
  expectedAnswer,
  suggestedRating,
  type QueueItem,
  type ReviewResult,
  type StudySummary,
} from "@/modules/study/shared";
import {
  CARD_KIND_LABELS,
  RATINGS,
  citationForm,
  displayLemma,
  type AnswerVerdict,
  type Rating,
} from "@/modules/vocabulary/shared";
import { WordDisplay } from "../word/gender";
import { AnswerFeedback } from "./answer-feedback";
import { RatingBar } from "./rating-bar";
import { SeparableOrder } from "./separable-order";
import { UmlautBar, insertAtCursor, umlautFromKey } from "./umlaut-bar";
import { useSpeech } from "./use-speech";

export interface StudyPrefs {
  strictCapitalization: boolean;
  ttsEnabled: boolean;
  ttsAutoplay: boolean;
  ttsRate: number;
  ttsVoice: string | null;
}

interface Answered {
  verdict: AnswerVerdict;
  typed: string;
  expected: string;
  hints: string[];
  suggested: Rating | null;
}

interface SessionStats {
  reviewed: number;
  correct: number;
  ms: number;
}

/** Texto alemán que se pronuncia para una tarjeta. */
function spokenText(item: QueueItem) {
  const w = item.word;
  if (item.card.kind === "PLURAL" && w.pluralForm) return `die ${w.pluralForm}`;
  if (item.card.kind === "SEPARABLE_ORDER" || item.card.kind === "CLOZE")
    return w.exampleDe ?? displayLemma(w.lemma);
  return citationForm(w);
}

function isTypingTarget(el: EventTarget | null) {
  return (
    el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement || el instanceof HTMLSelectElement
  );
}

async function api<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: { "Content-Type": "application/json", ...init?.headers },
  });
  const body = (await res.json().catch(() => ({}))) as T & { error?: { message: string } };
  if (!res.ok) throw new Error(body.error?.message ?? "Error de red");
  return body;
}

export function StudySession({ initial, prefs }: { initial: QueueItem[]; prefs: StudyPrefs }) {
  const [queue, setQueue] = useState<QueueItem[]>(initial);
  const [answered, setAnswered] = useState<Answered | null>(null);
  const [typed, setTyped] = useState("");
  const [typed2, setTyped2] = useState("");
  const [tiles, setTiles] = useState<number[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [stats, setStats] = useState<SessionStats>({ reviewed: 0, correct: 0, ms: 0 });
  const [leech, setLeech] = useState<{ wordId: string; lemma: string } | null>(null);
  const [inviteSentence, setInviteSentence] = useState<{ wordId: string; lemma: string } | null>(null);
  const [summary, setSummary] = useState<StudySummary | null>(null);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const [ttsNotice, setTtsNotice] = useState(false);
  const [activeField, setActiveField] = useState<1 | 2>(1);
  const shownAt = useRef<number>(Date.now());
  const inputRef = useRef<HTMLInputElement>(null);
  const input2Ref = useRef<HTMLInputElement>(null);

  const item = queue[0] ?? null;
  const tts = useSpeech({ enabled: prefs.ttsEnabled, rate: prefs.ttsRate, voiceName: prefs.ttsVoice });

  // Aviso único si no hay voz alemana.
  useEffect(() => {
    if (!tts.missingGerman) return;
    try {
      if (!localStorage.getItem("wz-tts-notice")) {
        setTtsNotice(true);
        localStorage.setItem("wz-tts-notice", "1");
      }
    } catch {}
  }, [tts.missingGerman]);

  // Nueva tarjeta: reinicia el estado y mide el tiempo desde que aparece el anverso.
  const itemKey = item?.card.id;
  useEffect(() => {
    setAnswered(null);
    setTyped("");
    setTyped2("");
    setTiles([]);
    setActiveField(1);
    shownAt.current = Date.now();
    requestAnimationFrame(() => inputRef.current?.focus());
  }, [itemKey]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2500);
    return () => clearTimeout(t);
  }, [toast]);

  // Al terminar, pide el resumen (para saber si quedan tarjetas en aprendizaje).
  useEffect(() => {
    if (item) return;
    api<StudySummary>("/api/study/summary")
      .then(setSummary)
      .catch(() => undefined);
  }, [item]);

  const production = item ? item.card.kind !== "DE_TO_ES" : false;
  const isVerbForms = item?.card.kind === "VERB_FORMS";
  const isOrder = item?.card.kind === "SEPARABLE_ORDER";

  const typedAnswer = useMemo(() => {
    if (!item) return "";
    if (isOrder) return tiles.map((i) => item.prompt.tiles?.[i] ?? "").join(" ");
    if (isVerbForms) return `${typed.trim()} / ${typed2.trim()}`;
    return typed;
  }, [item, isOrder, isVerbForms, tiles, typed, typed2]);

  const hasAnswer = isOrder
    ? tiles.length > 0
    : isVerbForms
      ? !!(typed.trim() && typed2.trim())
      : !!typed.trim();

  const check = useCallback(() => {
    if (!item || answered) return;
    if (!hasAnswer) {
      if (production) {
        setError("Escribe tu respuesta antes de verla.");
        return;
      }
    }
    setError(null);
    const expected = expectedAnswer(item.card.kind, item.word);
    if (!hasAnswer) {
      setAnswered({ verdict: "SELF_GRADED", typed: "", expected, hints: [], suggested: null });
    } else {
      const r = checkAnswer(item.card.kind, item.word, typedAnswer, {
        strictCapitalization: prefs.strictCapitalization,
      });
      setAnswered({
        verdict: r.verdict,
        typed: typedAnswer,
        expected: r.expected,
        hints: r.hints,
        suggested: suggestedRating(r.verdict),
      });
    }
    if (prefs.ttsAutoplay) tts.speak(spokenText(item));
  }, [
    item,
    answered,
    hasAnswer,
    production,
    typedAnswer,
    prefs.strictCapitalization,
    prefs.ttsAutoplay,
    tts,
  ]);

  const rate = useCallback(
    async (rating: Rating) => {
      if (!item || !answered || busy) return;
      setBusy(true);
      setError(null);
      const durationMs = Date.now() - shownAt.current;
      try {
        const res = await api<ReviewResult>("/api/study/review", {
          method: "POST",
          body: JSON.stringify({
            cardId: item.card.id,
            rating,
            typedAnswer: answered.typed || null,
            durationMs,
            wantNext: true,
          }),
        });
        setStats((s) => ({
          reviewed: s.reviewed + 1,
          correct: s.correct + (rating === "GOOD" || rating === "EASY" ? 1 : 0),
          ms: s.ms + Math.min(durationMs, 120_000),
        }));
        const lemma = citationForm(item.word);
        setLeech(res.becameLeech ? { wordId: item.word.id, lemma } : null);
        setInviteSentence(res.inviteOwnSentence && !res.becameLeech ? { wordId: item.word.id, lemma } : null);
        setQueue(res.next ?? queue.slice(1));
      } catch (e) {
        setError(e instanceof Error ? e.message : "No se pudo guardar el repaso");
      } finally {
        setBusy(false);
      }
    },
    [item, answered, busy, queue],
  );

  const undo = useCallback(async () => {
    if (busy) return;
    setBusy(true);
    try {
      await api("/api/study/undo", { method: "POST" });
      const next = await api<{ items: QueueItem[] }>("/api/study/queue?limit=20");
      setQueue(next.items);
      setStats((s) => ({ ...s, reviewed: Math.max(0, s.reviewed - 1) }));
      setLeech(null);
      setInviteSentence(null);
      setSummary(null);
      setToast("Repaso deshecho");
    } catch (e) {
      setToast(e instanceof Error ? e.message : "No hay nada que deshacer");
    } finally {
      setBusy(false);
    }
  }, [busy]);

  // Atajos de teclado globales.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (shortcutsOpen || e.ctrlKey || e.metaKey || e.altKey) return;
      const typing = isTypingTarget(e.target) && !(e.target as HTMLInputElement).disabled;
      if (
        e.key === "Enter" &&
        !(e.target instanceof HTMLTextAreaElement) &&
        !(e.target instanceof HTMLButtonElement)
      ) {
        if (!item) return;
        e.preventDefault();
        if (!answered) check();
        else if (answered.suggested) rate(answered.suggested);
        return;
      }
      if (typing) return;
      if (answered && ["1", "2", "3", "4"].includes(e.key)) {
        e.preventDefault();
        rate(RATINGS[Number(e.key) - 1]!);
      } else if (e.key === " " && item && !answered && !production) {
        e.preventDefault();
        check();
      } else if (e.key.toLowerCase() === "u") {
        e.preventDefault();
        undo();
      } else if (e.key.toLowerCase() === "p" && item) {
        e.preventDefault();
        tts.speak(spokenText(item));
      } else if (e.key.toLowerCase() === "e" && item) {
        e.preventDefault();
        window.open(`/vocabulario/${item.word.id}`, "_blank", "noopener");
      } else if (e.key === "?") {
        e.preventDefault();
        setShortcutsOpen(true);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [item, answered, production, check, rate, undo, tts, shortcutsOpen]);

  function onInputKey(e: React.KeyboardEvent<HTMLInputElement>, setter: (v: string) => void) {
    const ch = umlautFromKey(e);
    if (ch) {
      e.preventDefault();
      insertAtCursor(e.currentTarget, ch, setter);
    }
  }

  const total = stats.reviewed + queue.length;
  const progress = total ? Math.round((stats.reviewed / total) * 100) : 100;

  return (
    <div className="mx-auto w-full max-w-[640px]">
      {/* Barra de progreso de la sesión */}
      <div className="mb-6 flex items-center gap-3">
        <div
          className="bg-surface-2 h-1.5 flex-1 overflow-hidden rounded-full"
          role="progressbar"
          aria-label="Progreso de la sesión"
          aria-valuenow={progress}
          aria-valuemin={0}
          aria-valuemax={100}
        >
          <div
            className="bg-accent h-full rounded-full transition-[width] duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
        <span className="tabular text-ink-2 text-xs">
          {stats.reviewed} / {total}
        </span>
        <Button
          variant="ghost"
          size="icon"
          className="size-8"
          onClick={undo}
          disabled={busy || stats.reviewed === 0}
          aria-label="Deshacer (U)"
          title="Deshacer (U)"
        >
          <Undo2 aria-hidden />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="size-8"
          onClick={() => setShortcutsOpen(true)}
          aria-label="Atajos de teclado (?)"
          title="Atajos (?)"
        >
          <Keyboard aria-hidden />
        </Button>
      </div>

      {ttsNotice && (
        <p
          className="border-line bg-surface-2 text-ink-2 mb-4 rounded-md border px-3 py-2 text-sm"
          role="status"
        >
          Tu navegador no tiene una voz alemana instalada, así que el botón de audio está oculto.
        </p>
      )}

      {leech && <LeechPrompt key={leech.wordId} {...leech} onDone={() => setLeech(null)} />}
      {inviteSentence && (
        <SentencePrompt
          key={inviteSentence.wordId}
          {...inviteSentence}
          onDone={() => setInviteSentence(null)}
        />
      )}

      {!item ? (
        <SessionDone stats={stats} summary={summary} />
      ) : (
        <div className="grid gap-5">
          <Card raised className="relative overflow-hidden">
            <div className="border-line text-ink-2 flex items-center justify-between gap-2 border-b px-5 py-2.5 text-xs">
              <span className="flex items-center gap-2">
                <span className="text-ink font-medium">{CARD_KIND_LABELS[item.card.kind]}</span>
                {item.card.state === "NEW" && (
                  <span className="bg-accent-soft text-accent rounded-sm px-1.5 py-0.5 font-medium">
                    nueva
                  </span>
                )}
                {item.card.isLeech && (
                  <span className="text-bad inline-flex items-center gap-1">
                    <Flame className="size-3" aria-hidden />
                    rebelde
                  </span>
                )}
              </span>
              <span>
                Nivel {item.word.level}
                {item.word.lessonNumber && ` · Lección ${item.word.lessonNumber}`}
              </span>
            </div>

            <div className="flex min-h-48 flex-col items-center justify-center gap-3 px-5 py-10 text-center sm:px-8">
              {item.prompt.showGender && item.card.kind === "DE_TO_ES" ? (
                <WordDisplay word={item.word} size="xl" />
              ) : item.prompt.showGender && item.card.kind === "PLURAL" ? (
                <p lang="de" className="font-serif text-4xl sm:text-5xl">
                  <WordDisplay word={item.word} size="xl" />
                  <span className="text-ink-2"> → die …</span>
                </p>
              ) : (
                <p
                  lang={item.card.kind === "DE_TO_ES" || item.card.kind === "CLOZE" ? "de" : "es"}
                  className={cn(
                    "font-serif font-medium tracking-tight text-balance",
                    item.prompt.title.length > 40 ? "text-2xl sm:text-3xl" : "text-3xl sm:text-5xl",
                  )}
                >
                  {item.prompt.title}
                </p>
              )}
              {item.prompt.subtitle && <p className="text-ink-2 text-sm">{item.prompt.subtitle}</p>}
              {tts.available && (item.card.kind === "DE_TO_ES" || answered) && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => tts.speak(spokenText(item))}
                  aria-label="Escuchar pronunciación (P)"
                >
                  <Volume2 aria-hidden />
                  Escuchar
                </Button>
              )}
            </div>
          </Card>

          {!answered && (
            <form
              className="grid gap-3"
              onSubmit={(e) => {
                e.preventDefault();
                check();
              }}
            >
              {isOrder ? (
                <SeparableOrder tiles={item.prompt.tiles ?? []} value={tiles} onChange={setTiles} />
              ) : (
                <>
                  <div className={cn("grid gap-3", isVerbForms && "sm:grid-cols-2")}>
                    <Input
                      ref={inputRef}
                      value={typed}
                      onChange={(e) => setTyped(e.target.value)}
                      onKeyDown={(e) => onInputKey(e, setTyped)}
                      onFocus={() => setActiveField(1)}
                      placeholder={item.prompt.fields[0]}
                      aria-label={item.prompt.fields[0]}
                      autoComplete="off"
                      autoCorrect="off"
                      autoCapitalize="off"
                      spellCheck={false}
                      lang={item.prompt.answerLang}
                      className="h-14 text-center font-serif text-xl"
                    />
                    {isVerbForms && (
                      <Input
                        ref={input2Ref}
                        value={typed2}
                        onChange={(e) => setTyped2(e.target.value)}
                        onKeyDown={(e) => onInputKey(e, setTyped2)}
                        onFocus={() => setActiveField(2)}
                        placeholder={item.prompt.fields[1]}
                        aria-label={item.prompt.fields[1]}
                        autoComplete="off"
                        autoCorrect="off"
                        autoCapitalize="off"
                        spellCheck={false}
                        lang="de"
                        className="h-14 text-center font-serif text-xl"
                      />
                    )}
                  </div>
                  {item.prompt.answerLang === "de" && (
                    <UmlautBar
                      targetRef={isVerbForms && activeField === 2 ? input2Ref : inputRef}
                      onInsert={isVerbForms && activeField === 2 ? setTyped2 : setTyped}
                      className="justify-center"
                    />
                  )}
                </>
              )}
              {error && (
                <p role="alert" className="text-bad text-center text-sm">
                  {error}
                </p>
              )}
              <div className="flex flex-wrap justify-center gap-2">
                <Button type="submit" size="lg" disabled={production && !hasAnswer}>
                  Comprobar{" "}
                  <span className="kbd text-paper/70 ml-1 hidden bg-transparent sm:inline">Enter</span>
                </Button>
                {!production && (
                  <Button type="button" size="lg" variant="secondary" onClick={check}>
                    Mostrar respuesta <span className="kbd ml-1 hidden sm:inline">Espacio</span>
                  </Button>
                )}
              </div>
            </form>
          )}

          {answered && (
            <div className="grid gap-4">
              <AnswerFeedback
                item={item}
                verdict={answered.verdict}
                typed={answered.typed}
                expected={answered.expected}
                hints={answered.hints}
              />
              <RatingBar
                preview={item.preview}
                suggested={answered.suggested}
                onRate={rate}
                disabled={busy}
              />
              {error && (
                <p role="alert" className="text-bad text-center text-sm">
                  {error}
                </p>
              )}
              <p className="text-ink-2 text-center text-xs">
                <Link
                  href={`/vocabulario/${item.word.id}`}
                  target="_blank"
                  className="hover:text-ink inline-flex items-center gap-1"
                >
                  Abrir ficha <ExternalLink className="size-3" aria-hidden />
                </Link>
              </p>
            </div>
          )}
        </div>
      )}

      {toast && (
        <div
          role="status"
          className="animate-rise bg-ink text-paper shadow-lift fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-md px-4 py-2 text-sm"
        >
          {toast}
        </div>
      )}

      <ShortcutsDialog open={shortcutsOpen} onOpenChange={setShortcutsOpen} />
    </div>
  );
}

function SessionDone({ stats, summary }: { stats: SessionStats; summary: StudySummary | null }) {
  const minutes = Math.max(1, Math.round(stats.ms / 60_000));
  const accuracy = stats.reviewed ? Math.round((stats.correct / stats.reviewed) * 100) : 0;
  const waitMin = summary?.nextLearningDue
    ? Math.max(1, Math.ceil((Date.parse(summary.nextLearningDue) - Date.now()) / 60_000))
    : null;
  return (
    <Card raised className="animate-rise p-8 text-center">
      <CheckCircle2 className="text-accent mx-auto mb-4 size-10" aria-hidden />
      <h2 className="font-serif text-3xl font-semibold tracking-tight">
        {stats.reviewed ? "Sesión terminada. Super!" : "No hay tarjetas pendientes"}
      </h2>
      {stats.reviewed > 0 && (
        <dl className="mx-auto mt-6 grid max-w-sm grid-cols-3 gap-4">
          <div>
            <dt className="text-ink-2 text-xs">Repasadas</dt>
            <dd className="tabular font-serif text-3xl">{stats.reviewed}</dd>
          </div>
          <div>
            <dt className="text-ink-2 text-xs">Aciertos</dt>
            <dd className="tabular font-serif text-3xl">{accuracy}%</dd>
          </div>
          <div>
            <dt className="text-ink-2 text-xs">Tiempo</dt>
            <dd className="tabular font-serif text-3xl">{minutes} min</dd>
          </div>
        </dl>
      )}
      <p className="text-ink-2 mt-6">
        {waitMin
          ? `Te quedan tarjetas en aprendizaje: vuelve en ${waitMin} ${waitMin === 1 ? "minuto" : "minutos"}.`
          : "Las próximas tarjetas llegarán en tu siguiente día de estudio."}
      </p>
      <div className="mt-6 flex flex-wrap justify-center gap-2">
        <Button asChild variant="secondary">
          <Link href="/">Volver al panel</Link>
        </Button>
        <Button asChild variant="ghost">
          <Link href="/practicar">Práctica libre</Link>
        </Button>
      </div>
    </Card>
  );
}

function LeechPrompt({ wordId, lemma, onDone }: { wordId: string; lemma: string; onDone: () => void }) {
  const [value, setValue] = useState("");
  const [saving, setSaving] = useState(false);
  return (
    <div className="animate-rise border-bad/30 bg-bad-bg mb-5 rounded-lg border p-4" role="alert">
      <p className="text-bad flex items-center gap-2 font-medium">
        <Flame className="size-4" aria-hidden />
        Esta palabra es rebelde: escribe un truco para recordarla.
      </p>
      <form
        className="mt-3 flex flex-col gap-2 sm:flex-row"
        onSubmit={async (e) => {
          e.preventDefault();
          if (!value.trim()) return;
          setSaving(true);
          await saveNoteAction(wordId, { mnemonic: value });
          setSaving(false);
          onDone();
        }}
      >
        <label htmlFor="leech-mnemonic" className="sr-only">
          Mnemotecnia para {lemma}
        </label>
        <Input
          id="leech-mnemonic"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={`Truco para «${lemma}»`}
        />
        <div className="flex gap-2">
          <Button type="submit" variant="primary" loading={saving}>
            <Lightbulb aria-hidden /> Guardar
          </Button>
          <Button type="button" variant="ghost" onClick={onDone} aria-label="Cerrar">
            <X aria-hidden />
          </Button>
        </div>
      </form>
    </div>
  );
}

function SentencePrompt({ wordId, lemma, onDone }: { wordId: string; lemma: string; onDone: () => void }) {
  const [value, setValue] = useState("");
  const [saving, setSaving] = useState(false);
  return (
    <div className="animate-rise border-accent/30 bg-accent-soft mb-5 rounded-lg border p-4">
      <p className="flex items-center gap-2 font-medium">
        <PenLine className="text-accent size-4" aria-hidden />
        Ya dominas «{lemma}». ¿Escribes tu propia frase con ella?
      </p>
      <form
        className="mt-3 grid gap-2"
        onSubmit={async (e) => {
          e.preventDefault();
          if (!value.trim()) return;
          setSaving(true);
          await saveNoteAction(wordId, { ownSentence: value });
          setSaving(false);
          onDone();
        }}
      >
        <label htmlFor="own-sentence" className="sr-only">
          Mi frase con {lemma}
        </label>
        <Textarea
          id="own-sentence"
          lang="de"
          rows={2}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="Ich …"
        />
        <div className="flex gap-2">
          <Button type="submit" size="sm" loading={saving}>
            Guardar mi frase
          </Button>
          <Button type="button" size="sm" variant="ghost" onClick={onDone}>
            Ahora no
          </Button>
        </div>
      </form>
    </div>
  );
}

const SHORTCUTS: [string, string][] = [
  ["Enter", "Comprobar / confirmar la calificación sugerida"],
  ["1 – 4", "Calificar: Otra vez, Difícil, Bien, Fácil"],
  ["Espacio", "Revelar (solo tarjetas de reconocimiento)"],
  ["U", "Deshacer el último repaso"],
  ["P", "Escuchar la pronunciación"],
  ["E", "Abrir la ficha en otra pestaña"],
  ["Alt + a / o / u / s", "Escribir ä / ö / ü / ß (con Mayús: Ä Ö Ü)"],
  ["?", "Mostrar esta lista"],
];

function ShortcutsDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="bg-ink/30 fixed inset-0 z-50 backdrop-blur-[2px]" />
        <Dialog.Content className="border-line bg-surface shadow-lift fixed top-1/2 left-1/2 z-50 w-[min(440px,calc(100vw-32px))] -translate-x-1/2 -translate-y-1/2 rounded-lg border p-6">
          <Dialog.Title className="font-serif text-xl font-semibold">Atajos de teclado</Dialog.Title>
          <Dialog.Description className="text-ink-2 mt-1 text-sm">
            Las letras no actúan mientras escribes en un campo.
          </Dialog.Description>
          <dl className="mt-4 grid gap-2 text-sm">
            {SHORTCUTS.map(([k, d]) => (
              <div key={k} className="flex items-center justify-between gap-4">
                <dt>
                  <span className="kbd">{k}</span>
                </dt>
                <dd className="text-ink-2 text-right">{d}</dd>
              </div>
            ))}
          </dl>
          <Dialog.Close asChild>
            <Button className="mt-6 w-full" variant="secondary">
              Cerrar
            </Button>
          </Dialog.Close>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

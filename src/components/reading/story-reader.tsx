"use client";

import {
  ArrowLeft,
  ArrowRight,
  BookOpenText,
  Check,
  CircleHelp,
  GraduationCap,
  Highlighter,
  PenLine,
  Square,
  Volume2,
  X,
} from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge, Card } from "@/components/ui/card";
import { FormMessage, Input, Textarea } from "@/components/ui/form";
import { cn } from "@/lib/cn";
import {
  COMPREHENSION_THRESHOLD,
  MASTERY_DAYS,
  PHASE_LABELS,
  plainText,
  type AttemptAnswers,
  type AttemptScore,
  type StoryView,
  type TopicProgress,
} from "@/modules/reading/shared";
import { sentenceTiles, shuffleTiles } from "@/modules/study/shared";
import { SeparableOrder } from "../study/separable-order";
import { insertAtCursor, umlautFromKey } from "../study/umlaut-bar";
import { useSpeech } from "../study/use-speech";
import { StoryText } from "./story-text";

type Step = "read" | "exercises" | "result";
interface Result {
  score: AttemptScore;
  isProbe: boolean;
  progress: TopicProgress;
}

const pct = (x: number | null) => (x === null ? "—" : `${Math.round(x * 100)} %`);

export function StoryReader({
  story,
  tts,
}: {
  story: StoryView;
  tts: { enabled: boolean; rate: number; voice: string | null };
}) {
  const ex = story.exercises;
  const [step, setStep] = useState<Step>("read");
  const [highlight, setHighlight] = useState(story.highlight);
  const [tapped, setTapped] = useState<Set<number>>(new Set());
  const [tf, setTf] = useState<(boolean | null)[]>(() => ex.truefalse.map(() => null));
  const [cloze, setCloze] = useState<string[]>(() => ex.cloze.map(() => ""));
  const [order, setOrder] = useState<number[][]>(() => ex.order.map(() => []));
  const [written, setWritten] = useState("");
  const [showModel, setShowModel] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<Result | null>(null);
  const [speaking, setSpeaking] = useState(false);
  const speech = useSpeech({ enabled: tts.enabled, rate: tts.rate, voiceName: tts.voice });

  const orderTiles = useMemo(
    () => ex.order.map((o, i) => shuffleTiles(sentenceTiles(o.sentence), `${story.id}-${i}`)),
    [ex.order, story.id],
  );
  const phase = PHASE_LABELS[story.phase];
  const complete = tf.every((v) => v !== null);

  function speak() {
    if (speaking) {
      window.speechSynthesis.cancel();
      setSpeaking(false);
      return;
    }
    speech.speak(plainText(story.body).replace(/\s+/g, " "));
    setSpeaking(true);
    const timer = setInterval(() => {
      if (!window.speechSynthesis.speaking) {
        setSpeaking(false);
        clearInterval(timer);
      }
    }, 500);
  }

  async function submit() {
    setBusy(true);
    setError(null);
    const answers: AttemptAnswers = {
      tapped: ex.find ? [...tapped] : undefined,
      truefalse: tf,
      cloze,
      order: order.map((idx, i) => idx.map((t) => orderTiles[i]![t]).join(" ")),
    };
    try {
      const res = await fetch("/api/reading/attempt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ storyId: story.id, answers }),
      });
      const body = (await res.json()) as Result & { error?: { message: string } };
      if (!res.ok) throw new Error(body.error?.message ?? "No se pudo guardar");
      setResult(body);
      setStep("result");
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo guardar");
    } finally {
      setBusy(false);
    }
  }

  const header = (
    <header className="mb-6">
      <div className="mb-3 flex flex-wrap items-center gap-2 text-xs">
        <Link href="/estudiar/historias" className="text-ink-2 hover:text-ink inline-flex items-center gap-1">
          <ArrowLeft className="size-3.5" aria-hidden /> Historias
        </Link>
        <span className="text-line-strong" aria-hidden>
          ·
        </span>
        <Link href={`/gramatica/${story.topic.slug}`} className="text-ink-2 hover:text-ink">
          {story.topic.id} · {story.topic.title}
        </Link>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Badge tone="accent">
          {phase.de} · {phase.es}
        </Badge>
        <Badge>
          Historia {story.sortOrder} de {story.totalInTopic}
        </Badge>
        <Badge>{story.wordCount} palabras</Badge>
        {!story.reviewed && (
          <Badge title="Texto nuevo: aún no lo revisó tu profesor. Si ves un error, anótalo.">
            en revisión<span className="sr-only">: aún no lo revisó tu profesor</span>
          </Badge>
        )}
      </div>
      <h1
        lang="de"
        className="mt-4 font-serif text-3xl font-semibold tracking-tight text-balance sm:text-4xl"
      >
        {story.title}
      </h1>
      <p className="text-ink-2 mt-1">{story.titleEs}</p>
    </header>
  );

  if (step === "read") {
    return (
      <div className="mx-auto max-w-[680px]">
        {header}
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <Button
            variant={highlight ? "accent" : "secondary"}
            size="sm"
            onClick={() => setHighlight((h) => !h)}
            aria-pressed={highlight}
          >
            <Highlighter aria-hidden /> Resaltar {story.topic.targetLabel}
          </Button>
          {speech.available && (
            <Button variant="secondary" size="sm" onClick={speak}>
              {speaking ? <Square aria-hidden /> : <Volume2 aria-hidden />}
              {speaking ? "Detener" : "Escuchar"}
            </Button>
          )}
        </div>
        <Card raised className="p-6 sm:p-8">
          <StoryText body={story.body} mode="read" highlight={highlight} keywords={story.keywords} />
        </Card>
        <ul className="text-ink-2 mt-4 flex flex-wrap gap-x-5 gap-y-1 text-xs" aria-label="Leyenda">
          <li>
            <span className="decoration-der underline decoration-2 underline-offset-4">Subrayado</span>:
            palabra clave (el color es su género; tócala para ver el significado)
          </li>
          <li>
            <span className="decoration-accent underline decoration-dotted decoration-2 underline-offset-4">
              Punteado
            </span>
            : aún no está en tus tarjetas
          </li>
          <li>
            <mark className="bg-accent-soft text-ink rounded-[3px] px-0.5 shadow-[inset_0_-2px_0_var(--accent)]">
              Resaltado
            </mark>
            : {story.topic.targetLabel}
          </li>
        </ul>
        <div className="mt-8 flex flex-wrap items-center justify-between gap-3">
          <Button asChild variant="ghost">
            <Link href={`/gramatica/${story.topic.slug}`}>
              <GraduationCap aria-hidden /> Ver la gramática
            </Link>
          </Button>
          <Button
            size="lg"
            onClick={() => {
              window.speechSynthesis?.cancel();
              setStep("exercises");
              window.scrollTo({ top: 0 });
            }}
          >
            Ir a los ejercicios <ArrowRight aria-hidden />
          </Button>
        </div>
      </div>
    );
  }

  if (step === "exercises") {
    let n = 0;
    const num = () => ++n;
    return (
      <div className="mx-auto max-w-[680px]">
        {header}
        <div className="grid gap-6">
          {ex.find && (
            <Card className="p-5 sm:p-6">
              <ExerciseTitle n={num()} title="Encuentra las formas" hint={ex.find.prompt} />
              <StoryText
                body={story.body}
                mode="find"
                tapped={tapped}
                onToggle={(id) =>
                  setTapped((s) => {
                    const next = new Set(s);
                    if (next.has(id)) next.delete(id);
                    else next.add(id);
                    return next;
                  })
                }
              />
              <p className="text-ink-2 mt-3 text-xs" aria-live="polite">
                {tapped.size} {tapped.size === 1 ? "palabra marcada" : "palabras marcadas"} · toca otra vez
                para desmarcar
              </p>
            </Card>
          )}

          <Card className="p-5 sm:p-6">
            <ExerciseTitle n={num()} title="Richtig oder falsch?" hint="Según la historia." />
            <ol className="grid gap-3">
              {ex.truefalse.map((q, i) => (
                <li key={i} className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <span lang="de" className="font-serif text-lg">
                    {q.statement}
                  </span>
                  <span className="flex shrink-0 gap-2" role="radiogroup" aria-label={`Afirmación ${i + 1}`}>
                    {[true, false].map((v) => (
                      <button
                        key={String(v)}
                        type="button"
                        role="radio"
                        aria-checked={tf[i] === v}
                        onClick={() => setTf((a) => a.map((x, j) => (j === i ? v : x)))}
                        className={cn(
                          "border-field rounded-md border px-3 py-1.5 text-sm transition-colors",
                          tf[i] === v
                            ? "border-accent bg-accent text-accent-ink"
                            : "bg-surface hover:bg-surface-2",
                        )}
                      >
                        {v ? "richtig" : "falsch"}
                      </button>
                    ))}
                  </span>
                </li>
              ))}
            </ol>
          </Card>

          {ex.cloze.length > 0 && (
            <Card className="p-5 sm:p-6">
              <ExerciseTitle
                n={num()}
                title="Completa"
                hint="Escribe la palabra que falta. Alt + a / o / u / s para ä ö ü ß."
              />
              <ol className="grid gap-4">
                {ex.cloze.map((q, i) => {
                  const [before, after] = q.text.split(/\{\{[^{}]+\}\}/);
                  return (
                    <li key={i}>
                      <p
                        lang="de"
                        className="flex flex-wrap items-baseline gap-x-2 gap-y-1 font-serif text-lg"
                      >
                        <span>{before}</span>
                        <Input
                          aria-label={`Hueco ${i + 1}`}
                          lang="de"
                          autoComplete="off"
                          autoCorrect="off"
                          autoCapitalize="off"
                          spellCheck={false}
                          value={cloze[i]}
                          onChange={(e) => setCloze((a) => a.map((x, j) => (j === i ? e.target.value : x)))}
                          onKeyDown={(e) => {
                            const ch = umlautFromKey(e);
                            if (ch) {
                              e.preventDefault();
                              insertAtCursor(e.currentTarget, ch, (v) =>
                                setCloze((a) => a.map((x, j) => (j === i ? v : x))),
                              );
                            }
                          }}
                          className="inline-block h-9 w-32 font-serif text-lg"
                        />
                        <span>{after}</span>
                      </p>
                      {q.es && <p className="text-ink-2 mt-1 text-sm">{q.es}</p>}
                    </li>
                  );
                })}
              </ol>
            </Card>
          )}

          {ex.order.length > 0 && (
            <Card className="p-5 sm:p-6">
              <ExerciseTitle n={num()} title="Ordena la frase" hint="Pulsa o arrastra las fichas." />
              <ol className="grid gap-6">
                {ex.order.map((q, i) => (
                  <li key={i} className="grid gap-2">
                    {q.es && <p className="text-ink-2 text-sm">{q.es}</p>}
                    <SeparableOrder
                      tiles={orderTiles[i]!}
                      value={order[i]!}
                      onChange={(v) => setOrder((a) => a.map((x, j) => (j === i ? v : x)))}
                    />
                  </li>
                ))}
              </ol>
            </Card>
          )}

          {ex.write && (
            <Card className="p-5 sm:p-6">
              <ExerciseTitle
                n={num()}
                title="Escribe tú (opcional)"
                hint={ex.write.prompt}
                icon={<PenLine className="size-4" aria-hidden />}
              />
              <Textarea
                lang="de"
                rows={4}
                value={written}
                onChange={(e) => setWritten(e.target.value)}
                placeholder="Mein Haus ist …"
              />
              <div className="mt-3">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowModel((s) => !s)}
                  aria-expanded={showModel}
                >
                  {showModel ? "Ocultar el modelo" : "Ver un modelo"}
                </Button>
                {showModel && (
                  <p
                    lang="de"
                    className="animate-rise border-accent/60 mt-2 border-l-2 pl-3 font-serif text-lg italic"
                  >
                    {ex.write.model}
                  </p>
                )}
              </div>
              <p className="text-ink-2 mt-2 text-xs">
                Este ejercicio no se puntúa: compara tu texto con el modelo.
              </p>
            </Card>
          )}

          {error && <FormMessage tone="error">{error}</FormMessage>}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <Button variant="ghost" onClick={() => setStep("read")}>
              <BookOpenText aria-hidden /> Volver a leer
            </Button>
            <Button size="lg" onClick={submit} loading={busy} disabled={!complete}>
              Comprobar
            </Button>
          </div>
          {!complete && (
            <p className="text-ink-2 text-right text-xs">Responde todas las afirmaciones richtig / falsch.</p>
          )}
        </div>
      </div>
    );
  }

  // Resultado
  const r = result!;
  const p = r.progress;
  return (
    <div className="mx-auto max-w-[680px]">
      {header}
      <Card raised className="animate-rise p-6 sm:p-8">
        <div className="grid grid-cols-2 gap-4 text-center">
          <Score label="Comprensión" value={r.score.comprehension} />
          <Score label="Producción" value={r.score.production} />
        </div>
        {r.isProbe &&
          story.phase !== "DISCOVER" &&
          (r.score.comprehension ?? 0) >= COMPREHENSION_THRESHOLD && (
            <p className="text-ok mt-4 text-center text-sm">
              Primera lectura con ≥ 80 % de comprensión. ¡Sehr gut!
            </p>
          )}
        {!r.isProbe && (
          <p className="text-ink-2 mt-4 text-center text-xs">
            Relectura: cuenta para la práctica, no como prueba de comprensión.
          </p>
        )}
      </Card>

      <section className="mt-6 grid gap-3" aria-labelledby="feedback-title">
        <h2 id="feedback-title" className="font-serif text-xl font-semibold">
          Revisión
        </h2>
        {ex.find && r.score.find && (
          <Card className="p-5">
            <p className="mb-3 text-sm">
              Encontraste <strong>{r.score.find.found}</strong> de {r.score.find.total} formas
              {r.score.find.wrong > 0 && <> y marcaste {r.score.find.wrong} de más</>}.{" "}
              <span className="text-ink-2">
                Verde: encontradas · línea discontinua: no encontradas · tachado: de más.
              </span>
            </p>
            <StoryText body={story.body} mode="review" tapped={tapped} />
          </Card>
        )}
        <Card className="divide-line divide-y">
          {r.score.items
            .filter((i) => i.kind !== "find")
            .map((i) => (
              <div key={`${i.kind}-${i.index}`} className="flex gap-3 p-4">
                <span
                  className={cn(
                    "mt-0.5 inline-flex size-5 shrink-0 items-center justify-center rounded-full",
                    i.score >= 1
                      ? "bg-ok-bg text-ok"
                      : i.score > 0
                        ? "bg-almost-bg text-almost"
                        : "bg-bad-bg text-bad",
                  )}
                  aria-label={i.score >= 1 ? "correcto" : i.score > 0 ? "casi" : "incorrecto"}
                >
                  {i.score >= 1 ? (
                    <Check className="size-3.5" />
                  ) : i.score > 0 ? (
                    <CircleHelp className="size-3.5" />
                  ) : (
                    <X className="size-3.5" />
                  )}
                </span>
                <div className="min-w-0 text-sm">
                  {i.kind === "truefalse" && (
                    <p lang="de" className="font-serif text-base">
                      {ex.truefalse[i.index]!.statement} → <strong>{i.expected}</strong>
                    </p>
                  )}
                  {i.kind === "cloze" && (
                    <p lang="de" className="font-serif text-base">
                      {ex.cloze[i.index]!.text.replace(/\{\{([^{}]+)\}\}/, "[$1]")}
                      {i.score < 1 && i.given && (
                        <span className="text-bad ml-2 line-through">{i.given}</span>
                      )}
                    </p>
                  )}
                  {i.kind === "order" && (
                    <p lang="de" className="font-serif text-base">
                      {i.expected}
                      {i.score < 1 && i.given && (
                        <span className="text-bad block line-through">{i.given}</span>
                      )}
                    </p>
                  )}
                  {i.hints.length > 0 && <p className="text-ink-2">{i.hints.join(" · ")}</p>}
                  {i.explanation && i.score < 1 && <p className="text-ink-2">{i.explanation}</p>}
                </div>
              </div>
            ))}
        </Card>
      </section>

      <Card className="mt-6 p-5">
        <h2 className="font-serif text-lg font-semibold">Tu avance en {story.topic.id}</h2>
        <dl className="mt-3 grid grid-cols-3 gap-3 text-center text-sm">
          <div>
            <dt className="text-ink-2 text-xs">Historias leídas</dt>
            <dd className="tabular font-serif text-2xl">
              {p.read}/{p.total}
            </dd>
          </div>
          <div>
            <dt className="text-ink-2 text-xs">Comprensión</dt>
            <dd className={cn("font-serif text-2xl", p.comprehension ? "text-ok" : "text-ink-2")}>
              {p.comprehension ? "✓" : "—"}
            </dd>
          </div>
          <div>
            <dt className="text-ink-2 text-xs">Dominio</dt>
            <dd className={cn("tabular font-serif text-2xl", p.mastery ? "text-ok" : "text-ink-2")}>
              {p.mastery ? "✓" : `${p.masteryDays}/${MASTERY_DAYS}`}
            </dd>
          </div>
        </dl>
      </Card>

      <div className="mt-8 flex flex-wrap items-center justify-between gap-3">
        <Button asChild variant="ghost">
          <Link href={`/gramatica/${story.topic.slug}`}>
            <GraduationCap aria-hidden /> Repasar la gramática
          </Link>
        </Button>
        {story.nextId ? (
          <Button asChild size="lg">
            <Link href={`/estudiar/historias/${story.nextId}`}>
              Siguiente historia <ArrowRight aria-hidden />
            </Link>
          </Button>
        ) : (
          <Button asChild size="lg" variant="secondary">
            <Link href="/estudiar/historias">Volver a las historias</Link>
          </Button>
        )}
      </div>
    </div>
  );
}

function ExerciseTitle({
  n,
  title,
  hint,
  icon,
}: {
  n: number;
  title: string;
  hint?: string;
  icon?: React.ReactNode;
}) {
  return (
    <div className="mb-4">
      <h2 className="flex items-center gap-2 font-serif text-xl font-semibold">
        <span className="tabular bg-accent-soft text-accent inline-flex size-6 items-center justify-center rounded-full text-sm">
          {n}
        </span>
        {title}
        {icon}
      </h2>
      {hint && <p className="text-ink-2 mt-1 text-sm">{hint}</p>}
    </div>
  );
}

function Score({ label, value }: { label: string; value: number | null }) {
  const tone =
    value === null ? "text-ink-2" : value >= 0.8 ? "text-ok" : value >= 0.5 ? "text-almost" : "text-bad";
  return (
    <div>
      <p className="text-ink-2 text-xs font-medium tracking-[0.12em] uppercase">{label}</p>
      <p className={cn("tabular mt-1 font-serif text-5xl font-semibold", tone)}>{pct(value)}</p>
    </div>
  );
}

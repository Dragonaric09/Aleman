import { AlertTriangle, ArrowLeft, ArrowRight, BookOpenText, Check, Lightbulb, X } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { PrepositionsDiagram } from "@/components/grammar/prepositions-diagram";
import { TopicExercises } from "@/components/grammar/topic-exercises";
import { Button } from "@/components/ui/button";
import {
  Badge,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  EmptyState,
  PageHeader,
} from "@/components/ui/card";
import { cn } from "@/lib/cn";
import { requireUser } from "@/modules/auth";
import { getTopic } from "@/modules/grammar";
import { MASTERY_DAYS, PHASE_LABELS } from "@/modules/reading/shared";

export const metadata: Metadata = { title: "Gramática" };

const ROW_STYLE = {
  DER: "border-l-der text-der-text",
  DIE: "border-l-die text-die-text",
  DAS: "border-l-das text-das-text",
  PLURAL: "border-l-plural text-plural-text",
} as const;

export default async function TopicPage({ params }: { params: Promise<{ slug: string }> }) {
  const user = await requireUser();
  const { slug } = await params;
  const t = await getTopic(user.id, slug);
  const c = t.content;
  const p = t.progress;

  return (
    <div className="mx-auto max-w-4xl">
      <Link
        href="/gramatica"
        className="text-ink-2 hover:text-ink mb-4 inline-flex items-center gap-1.5 text-sm"
      >
        <ArrowLeft className="size-4" aria-hidden /> Gramática
      </Link>
      <PageHeader
        eyebrow={`${t.id} · ${t.lessonNumbers.length ? `Lección ${t.lessonNumbers.join(", ")}` : "Apuntes de clase"}`}
        title={t.title}
        description={
          t.titleDe ? (
            <span lang="de" className="italic">
              {t.titleDe}
            </span>
          ) : undefined
        }
        actions={
          p && (
            <>
              <Badge tone={p.comprehension ? "ok" : "neutral"}>
                Comprensión {p.comprehension ? "✓" : "—"}
              </Badge>
              <Badge tone={p.mastery ? "ok" : "neutral"}>
                Dominio {p.mastery ? "✓" : `${p.masteryDays}/${MASTERY_DAYS}`}
              </Badge>
            </>
          )
        }
      />

      {!c ? (
        <EmptyState title="Tema en preparación">
          {t.summary} Sus mini historias se escribirán en la próxima fase.
        </EmptyState>
      ) : (
        <div className="grid gap-6">
          {/* 1. En una frase */}
          <Card raised className="p-6 sm:p-8">
            <p className="text-accent text-xs font-medium tracking-[0.14em] uppercase">En una frase</p>
            <p className="mt-2 font-serif text-2xl leading-snug font-medium text-balance sm:text-3xl">
              {c.rule}
            </p>
            {c.rulePoints.length > 0 && (
              <ul className="mt-5 grid gap-2">
                {c.rulePoints.map((r) => (
                  <li key={r} className="text-ink flex gap-2">
                    <span className="bg-accent mt-2.5 size-1.5 shrink-0 rounded-full" aria-hidden />
                    <span>{r}</span>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          {/* 2–3. Tabla y esquema */}
          <div className="grid gap-6 lg:grid-cols-[1.25fr_1fr]">
            {c.table && (
              <Card>
                <CardHeader>
                  <CardTitle>{c.table.caption}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                      <caption className="sr-only">{c.table.caption}</caption>
                      <thead>
                        <tr className="border-line text-ink-2 border-b text-xs">
                          {c.table.headers.map((h) => (
                            <th key={h} scope="col" className="py-2 pr-3 font-medium">
                              {h}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody lang="de">
                        {c.table.rows.map((r, i) => (
                          <tr key={i} className="border-line border-b last:border-0">
                            {r.cells.map((cell, j) => (
                              <td
                                key={j}
                                className={cn(
                                  "py-2.5 pr-3 font-serif",
                                  j === 0 && "border-l-4 pl-2 font-sans text-xs font-medium",
                                  j === 0 && r.gender && ROW_STYLE[r.gender],
                                  j === 2 && "font-semibold",
                                )}
                                lang={j === 0 ? "es" : "de"}
                              >
                                {cell}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {c.notes.length > 0 && (
                    <ul className="text-ink-2 mt-4 grid gap-1.5 text-sm">
                      {c.notes.map((n) => (
                        <li key={n}>· {n}</li>
                      ))}
                    </ul>
                  )}
                </CardContent>
              </Card>
            )}
            {c.diagram === "prepositions" && (
              <Card>
                <CardHeader>
                  <CardTitle>Las nueve, en imagen</CardTitle>
                </CardHeader>
                <CardContent>
                  <PrepositionsDiagram />
                </CardContent>
              </Card>
            )}
          </div>

          {/* 4–5. Trampas y ganchos */}
          <div className="grid gap-6 lg:grid-cols-2">
            {c.traps.length > 0 && (
              <Card className="border-almost/30">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <AlertTriangle className="text-almost size-5" aria-hidden /> Trampas del español
                  </CardTitle>
                </CardHeader>
                <CardContent className="grid gap-4">
                  {c.traps.map((tr) => (
                    <div key={tr.wrong} className="grid gap-1">
                      <p lang="de" className="text-bad flex items-start gap-2 font-serif text-lg">
                        <X className="mt-1.5 size-4 shrink-0" aria-label="incorrecto" />
                        <span className="line-through decoration-2">{tr.wrong}</span>
                      </p>
                      <p lang="de" className="text-ok flex items-start gap-2 font-serif text-lg">
                        <Check className="mt-1.5 size-4 shrink-0" aria-label="correcto" />
                        {tr.right}
                      </p>
                      <p className="text-ink-2 pl-6 text-sm">{tr.note}</p>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}
            {c.mnemonics.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Lightbulb className="text-accent size-5" aria-hidden /> Para recordarlo
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="grid gap-3">
                    {c.mnemonics.map((m) => (
                      <li key={m} className="bg-accent-soft rounded-md px-3 py-2 text-sm">
                        {m}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}
          </div>

          {/* 6. Ejemplos de las historias */}
          {c.examples.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Ejemplos de las historias</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="grid gap-3">
                  {c.examples.map((e) => (
                    <li
                      key={e.de}
                      className="border-accent/60 flex flex-col gap-1 border-l-2 pl-3 sm:flex-row sm:items-baseline sm:justify-between"
                    >
                      <span>
                        <span lang="de" className="block font-serif text-lg">
                          {e.de}
                        </span>
                        <span className="text-ink-2 text-sm">{e.es}</span>
                      </span>
                      {e.story && (
                        <Link
                          href={`/estudiar/historias/${e.story}`}
                          className="text-accent shrink-0 text-xs hover:underline"
                        >
                          Historia {e.story}
                        </Link>
                      )}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          {/* 7. Mini ejercicios */}
          {c.exercises.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Practica</CardTitle>
              </CardHeader>
              <CardContent>
                <TopicExercises exercises={c.exercises} />
              </CardContent>
            </Card>
          )}

          {/* 8. Historias del tema */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BookOpenText className="text-accent size-5" aria-hidden /> Historias del tema
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ol className="grid gap-2 sm:grid-cols-2">
                {t.stories.map((s) => {
                  const unlocked = p?.unlocked.includes(s.id) ?? false;
                  const read = p?.best[s.id] !== undefined;
                  return (
                    <li
                      key={s.id}
                      className="border-line flex items-center justify-between gap-3 rounded-md border px-3 py-2"
                    >
                      <span className="min-w-0">
                        <span lang="de" className="block truncate font-serif">
                          {s.sortOrder}. {s.title}
                        </span>
                        <span className="text-ink-2 text-xs">
                          {PHASE_LABELS[s.phase as keyof typeof PHASE_LABELS].es}
                        </span>
                      </span>
                      {read ? (
                        <Badge tone="ok">leída</Badge>
                      ) : unlocked ? (
                        <Link
                          href={`/estudiar/historias/${s.id}`}
                          className="text-accent text-sm hover:underline"
                        >
                          Leer
                        </Link>
                      ) : (
                        <Badge>bloqueada</Badge>
                      )}
                    </li>
                  );
                })}
              </ol>
              {p?.nextStoryId && (
                <Button asChild className="mt-5">
                  <Link href={`/estudiar/historias/${p.nextStoryId}`}>
                    Seguir con la historia {p.nextStoryId} <ArrowRight aria-hidden />
                  </Link>
                </Button>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

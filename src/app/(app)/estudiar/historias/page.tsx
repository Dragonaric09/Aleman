import { ArrowRight, BookOpenText, Check, GraduationCap, Lock } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge, Card, PageHeader } from "@/components/ui/card";
import { cn } from "@/lib/cn";
import { requireUser } from "@/modules/auth";
import { listStories } from "@/modules/reading";
import { MASTERY_DAYS, PHASE_LABELS } from "@/modules/reading/shared";

export const metadata: Metadata = { title: "Historias" };

const pct = (x: number | null | undefined) => (x == null ? null : `${Math.round(x * 100)} %`);

export default async function StoriesPage() {
  const user = await requireUser();
  const groups = await listStories(user.id);
  const available = groups.filter((g) => g.topic.status === "AVAILABLE");
  const planned = groups.filter((g) => g.topic.status === "PLANNED");

  return (
    <>
      <PageHeader
        eyebrow="Lesen"
        title="Mini historias"
        description="Lecturas breves con el vocabulario que ya estudias. Cada tema avanza en cuatro fases: descubrir, practicar, contrastar y aplicar. Leer no cambia la programación de tus tarjetas."
      />

      <div className="grid gap-8">
        {available.map((g) => {
          const next = g.stories.find((s) => s.id === g.progress.nextStoryId);
          return (
            <section key={g.topic.id} aria-labelledby={`t-${g.topic.id}`}>
              <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <p className="text-accent text-xs font-medium tracking-[0.14em] uppercase">
                    {g.topic.id} · Lección {g.topic.lessonNumbers.join(", ")}
                  </p>
                  <h2 id={`t-${g.topic.id}`} className="font-serif text-2xl font-semibold">
                    {g.topic.title}
                  </h2>
                  <p className="text-ink-2 mt-1 max-w-xl text-sm">{g.topic.summary}</p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge>
                    {g.progress.read}/{g.progress.total} leídas
                  </Badge>
                  <Badge tone={g.progress.comprehension ? "ok" : "neutral"}>
                    Comprensión {g.progress.comprehension ? "✓" : "—"}
                  </Badge>
                  <Badge tone={g.progress.mastery ? "ok" : "neutral"}>
                    Dominio {g.progress.mastery ? "✓" : `${g.progress.masteryDays}/${MASTERY_DAYS}`}
                  </Badge>
                  <Button asChild variant="ghost" size="sm">
                    <Link href={`/gramatica/${g.topic.slug}`}>
                      <GraduationCap aria-hidden /> Gramática
                    </Link>
                  </Button>
                </div>
              </div>

              {next && (
                <Card
                  raised
                  className="mb-4 flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <p className="text-ink-2 text-xs">
                      Siguiente · {PHASE_LABELS[next.phase].de} · historia {next.sortOrder}
                    </p>
                    <p lang="de" className="font-serif text-2xl font-semibold">
                      {next.title}
                    </p>
                    <p className="text-ink-2 text-sm">
                      {next.titleEs} · {next.keywords} palabras clave
                      {next.knownKeywords > 0 && `, ${next.knownKeywords} ya en tus tarjetas`}
                    </p>
                  </div>
                  <Button asChild size="lg">
                    <Link href={`/estudiar/historias/${next.id}`}>
                      Leer <ArrowRight aria-hidden />
                    </Link>
                  </Button>
                </Card>
              )}

              <ol className="grid gap-2 sm:grid-cols-2">
                {g.stories.map((s) => {
                  const best = s.best;
                  const content = (
                    <>
                      <span
                        className={cn(
                          "tabular inline-flex size-8 shrink-0 items-center justify-center rounded-full border text-sm",
                          s.read
                            ? "border-ok/30 bg-ok-bg text-ok"
                            : s.unlocked
                              ? "border-accent/40 text-accent"
                              : "border-line text-ink-2",
                        )}
                        aria-hidden
                      >
                        {s.read ? (
                          <Check className="size-4" />
                        ) : s.unlocked ? (
                          s.sortOrder
                        ) : (
                          <Lock className="size-3.5" />
                        )}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span lang="de" className="block truncate font-serif text-lg leading-tight">
                          {s.title}
                        </span>
                        <span className="text-ink-2 block truncate text-xs">
                          {PHASE_LABELS[s.phase].es} · {s.titleEs}
                        </span>
                      </span>
                      {best && (
                        <span className="tabular text-ink-2 shrink-0 text-right text-xs">
                          {pct(best.comprehension) && (
                            <span className="block">C {pct(best.comprehension)}</span>
                          )}
                          {pct(best.production) && <span className="block">P {pct(best.production)}</span>}
                        </span>
                      )}
                    </>
                  );
                  return (
                    <li key={s.id}>
                      {s.unlocked ? (
                        <Link
                          href={`/estudiar/historias/${s.id}`}
                          className="border-line bg-surface hover:border-accent hover:bg-surface-2 flex items-center gap-3 rounded-md border px-3 py-2.5 transition-colors"
                        >
                          {content}
                        </Link>
                      ) : (
                        <div
                          className="border-line flex items-center gap-3 rounded-md border border-dashed px-3 py-2.5 opacity-70"
                          aria-label={`${s.title}: bloqueada hasta leer la anterior`}
                        >
                          {content}
                        </div>
                      )}
                    </li>
                  );
                })}
              </ol>
            </section>
          );
        })}

        {planned.length > 0 && (
          <section aria-labelledby="planned">
            <h2 id="planned" className="mb-3 flex items-center gap-2 font-serif text-xl font-semibold">
              <BookOpenText className="text-ink-2 size-5" aria-hidden /> En preparación
            </h2>
            <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {planned.map((g) => (
                <li key={g.topic.id} className="border-line rounded-md border border-dashed px-3 py-2.5">
                  <span className="text-ink-2 text-xs">{g.topic.id}</span>
                  <span className="block font-medium">{g.topic.title}</span>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </>
  );
}

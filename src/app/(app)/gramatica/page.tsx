import { ArrowRight, Check, Clock } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Badge, PageHeader } from "@/components/ui/card";
import { cn } from "@/lib/cn";
import { listTopics, type TopicCard } from "@/modules/grammar";
import { requireUser } from "@/modules/auth";
import { MASTERY_DAYS } from "@/modules/reading/shared";

export const metadata: Metadata = { title: "Gramática" };

/** Dos líneas de aprendizaje (ver docs/PROPUESTA_HISTORIAS_GRAMATICA.md § 2.2). */
const STRANDS = [
  {
    title: "Lecciones 13–16",
    description: "Lo nuevo de Menschen A1.2, en orden.",
    ids: ["G1", "G10", "G2", "G3", "G4", "G5"],
  },
  {
    title: "Repaso de tus apuntes de clase",
    description: "Temas de A1.1 que las lecciones vuelven a usar.",
    ids: ["G6", "G7", "G8", "G9"],
  },
];

function TopicTile({ t, byId }: { t: TopicCard; byId: Map<string, TopicCard> }) {
  const available = t.status === "AVAILABLE";
  const p = t.progress;
  const body = (
    <>
      <div className="flex items-start justify-between gap-3">
        <span className="tabular text-accent font-serif text-sm font-semibold">{t.id}</span>
        {available ? (
          <span className="flex gap-1.5">
            <Badge tone={p?.comprehension ? "ok" : "neutral"}>
              {p?.comprehension ? <Check className="size-3" aria-hidden /> : null} Comprensión
            </Badge>
            <Badge tone={p?.mastery ? "ok" : "neutral"}>
              {p?.mastery ? <Check className="size-3" aria-hidden /> : null} Dominio
              {!p?.mastery && ` ${p?.masteryDays ?? 0}/${MASTERY_DAYS}`}
            </Badge>
          </span>
        ) : (
          <Badge>
            <Clock className="size-3" aria-hidden /> En preparación
          </Badge>
        )}
      </div>
      <h3 className="mt-2 font-serif text-xl leading-tight font-semibold">{t.title}</h3>
      {t.titleDe && (
        <p lang="de" className="text-ink-2 text-sm italic">
          {t.titleDe}
        </p>
      )}
      <p className="text-ink-2 mt-2 text-sm">{t.summary}</p>
      <div className="text-ink-2 mt-4 flex flex-wrap items-center justify-between gap-2 text-xs">
        <span>
          {t.lessonNumbers.length ? `Lección ${t.lessonNumbers.join(", ")}` : "Apuntes de clase"}
          {t.prerequisites.length > 0 &&
            ` · después de ${t.prerequisites.map((id) => byId.get(id)?.id ?? id).join(", ")}`}
        </span>
        {available ? (
          <span className="text-ink inline-flex items-center gap-1 font-medium">
            {p ? `${p.read}/${p.total} historias` : `${t.storyCount} historias`}{" "}
            <ArrowRight className="size-3.5" aria-hidden />
          </span>
        ) : (
          <span>
            {t.plannedStories > 0 ? `${t.plannedStories} historias previstas` : "comparte historias con G3"}
          </span>
        )}
      </div>
      {available && p && (
        <div
          className="bg-surface-2 mt-3 h-1.5 overflow-hidden rounded-full"
          role="img"
          aria-label={`${p.read} de ${p.total} historias leídas`}
        >
          <div
            className="bg-accent h-full rounded-full"
            style={{ width: `${p.total ? (p.read / p.total) * 100 : 0}%` }}
          />
        </div>
      )}
    </>
  );
  const cls = "flex h-full flex-col rounded-lg border p-5 transition-colors";
  return available ? (
    <Link
      href={`/gramatica/${t.slug}`}
      className={cn(cls, "border-line bg-surface shadow-paper hover:border-accent")}
    >
      {body}
    </Link>
  ) : (
    <div className={cn(cls, "border-line-strong border-dashed bg-transparent opacity-80")}>{body}</div>
  );
}

export default async function GrammarPage() {
  const user = await requireUser();
  const topics = await listTopics(user.id);
  const byId = new Map(topics.map((t) => [t.id, t]));
  return (
    <>
      <PageHeader
        eyebrow="Grammatik"
        title="Gramática"
        description="Cada tema tiene una regla breve, una tabla con los colores de género, la trampa típica del español, un truco para recordarla y sus mini historias."
      />
      <div className="grid gap-10">
        {STRANDS.map((s) => (
          <section key={s.title} aria-labelledby={`s-${s.title}`}>
            <h2 id={`s-${s.title}`} className="font-serif text-2xl font-semibold">
              {s.title}
            </h2>
            <p className="text-ink-2 mb-4 text-sm">{s.description}</p>
            <ol className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {s.ids
                .map((id) => byId.get(id))
                .filter((t): t is TopicCard => !!t)
                .map((t) => (
                  <li key={t.id}>
                    <TopicTile t={t} byId={byId} />
                  </li>
                ))}
            </ol>
          </section>
        ))}
      </div>
    </>
  );
}

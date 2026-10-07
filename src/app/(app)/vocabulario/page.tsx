import { AlertTriangle, ChevronLeft, ChevronRight, Plus, Search, Star } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge, Card, EmptyState, PageHeader } from "@/components/ui/card";
import { Input, Label, Select } from "@/components/ui/form";
import { WordDisplay } from "@/components/word/gender";
import { requireUser } from "@/modules/auth";
import { listLessons, listWords, type WordStatus } from "@/modules/vocabulary";
import { WORD_TYPES, WORD_TYPE_LABELS } from "@/modules/vocabulary/shared";

export const metadata: Metadata = { title: "Vocabulario" };

const STATUS: Record<WordStatus, { label: string; tone: "neutral" | "accent" | "ok" | "almost" | "bad" }> = {
  new: { label: "nueva", tone: "neutral" },
  learning: { label: "aprendiendo", tone: "almost" },
  review: { label: "repaso", tone: "ok" },
  suspended: { label: "suspendida", tone: "neutral" },
  leech: { label: "rebelde", tone: "bad" },
};

type SP = Record<string, string | undefined>;

function pageHref(sp: SP, page: number) {
  const params = new URLSearchParams(
    Object.entries(sp).filter((e): e is [string, string] => !!e[1] && e[0] !== "page"),
  );
  params.set("page", String(page));
  return `/vocabulario?${params}`;
}

export default async function VocabularyPage({ searchParams }: { searchParams: Promise<SP> }) {
  const user = await requireUser();
  const sp = await searchParams;
  const filters = Object.fromEntries(Object.entries(sp).filter(([, v]) => v));
  const [result, lessons] = await Promise.all([listWords(user.id, filters), listLessons()]);

  return (
    <>
      <PageHeader
        eyebrow="Wortschatz"
        title="Vocabulario"
        description={`${result.total} palabras · catálogo global y tus palabras propias.`}
        actions={
          <Button asChild>
            <Link href="/vocabulario/nueva">
              <Plus aria-hidden /> Nueva palabra
            </Link>
          </Button>
        }
      />

      <Card className="mb-6 p-4">
        <form
          className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4"
          role="search"
          aria-label="Filtrar vocabulario"
        >
          <div className="grid gap-1.5 sm:col-span-2">
            <Label htmlFor="q">Buscar</Label>
            <div className="relative">
              <Search
                className="text-ink-2 pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2"
                aria-hidden
              />
              <Input id="q" name="q" defaultValue={sp.q} placeholder="Alemán o español…" className="pl-9" />
            </div>
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="level">Nivel</Label>
            <Select id="level" name="level" defaultValue={sp.level ?? ""}>
              <option value="">Todos</option>
              <option value="A">A · alta frecuencia</option>
              <option value="B">B · clave en los textos</option>
              <option value="C">C · específico</option>
            </Select>
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="type">Tipo</Label>
            <Select id="type" name="type" defaultValue={sp.type ?? ""}>
              <option value="">Todos</option>
              {WORD_TYPES.map((t) => (
                <option key={t} value={t}>
                  {WORD_TYPE_LABELS[t]}
                </option>
              ))}
            </Select>
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="lesson">Lección</Label>
            <Select id="lesson" name="lesson" defaultValue={sp.lesson ?? ""}>
              <option value="">Todas</option>
              {lessons.map((l) => (
                <option key={l.number} value={l.number}>
                  {l.number} · {l.title}
                </option>
              ))}
            </Select>
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="gender">Género</Label>
            <Select id="gender" name="gender" defaultValue={sp.gender ?? ""}>
              <option value="">Todos</option>
              <option value="DER">der</option>
              <option value="DIE">die</option>
              <option value="DAS">das</option>
            </Select>
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="status">Estado</Label>
            <Select id="status" name="status" defaultValue={sp.status ?? ""}>
              <option value="">Todos</option>
              <option value="new">Nueva</option>
              <option value="learning">Aprendiendo</option>
              <option value="review">Repaso</option>
              <option value="suspended">Suspendida</option>
              <option value="leech">Rebelde</option>
            </Select>
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="scope">Origen</Label>
            <Select id="scope" name="scope" defaultValue={sp.scope ?? ""}>
              <option value="">Propias y globales</option>
              <option value="own">Solo propias</option>
              <option value="global">Solo globales</option>
            </Select>
          </div>
          <div className="flex items-end gap-3 sm:col-span-2 lg:col-span-4">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                name="falseFriend"
                value="true"
                defaultChecked={sp.falseFriend === "true"}
                className="size-4 accent-[var(--accent)]"
              />
              Solo falsos amigos
            </label>
            <div className="ml-auto flex gap-2">
              <Button asChild variant="ghost" size="sm">
                <Link href="/vocabulario">Limpiar</Link>
              </Button>
              <Button type="submit" size="sm" variant="secondary">
                Filtrar
              </Button>
            </div>
          </div>
        </form>
      </Card>

      {result.items.length === 0 ? (
        <EmptyState icon={<Search />} title="Sin resultados">
          Prueba con otros filtros o crea una palabra nueva.
        </EmptyState>
      ) : (
        <Card className="overflow-hidden">
          <ul className="divide-line divide-y">
            {result.items.map((w) => (
              <li key={w.id}>
                <Link
                  href={`/vocabulario/${w.id}`}
                  className="hover:bg-surface-2 grid gap-1 px-4 py-3 transition-colors sm:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)_auto] sm:items-center sm:gap-4"
                >
                  <span className="flex min-w-0 items-center gap-2">
                    <WordDisplay word={w} size="sm" />
                    {w.starred && (
                      <Star
                        className="fill-accent text-accent size-3.5 shrink-0"
                        aria-label="prioritaria (★)"
                      />
                    )}
                    {w.isFalseFriend && (
                      <AlertTriangle className="text-almost size-3.5 shrink-0" aria-label="falso amigo" />
                    )}
                  </span>
                  <span className="text-ink-2 truncate text-sm">{w.translationEs}</span>
                  <span className="flex flex-wrap items-center gap-1.5">
                    <Badge>{WORD_TYPE_LABELS[w.type]}</Badge>
                    <Badge>{w.level}</Badge>
                    {w.lesson && <Badge>L{w.lesson.number}</Badge>}
                    {w.scope !== "global" && <Badge tone="accent">propia</Badge>}
                    <Badge tone={STATUS[w.status].tone}>{STATUS[w.status].label}</Badge>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </Card>
      )}

      {result.pages > 1 && (
        <nav aria-label="Paginación" className="mt-6 flex items-center justify-between gap-3 text-sm">
          <Button
            asChild
            variant="secondary"
            size="sm"
            className={result.page <= 1 ? "pointer-events-none opacity-40" : ""}
          >
            <Link href={pageHref(sp, result.page - 1)} aria-disabled={result.page <= 1}>
              <ChevronLeft aria-hidden /> Anterior
            </Link>
          </Button>
          <span className="tabular text-ink-2">
            Página {result.page} de {result.pages}
          </span>
          <Button
            asChild
            variant="secondary"
            size="sm"
            className={result.page >= result.pages ? "pointer-events-none opacity-40" : ""}
          >
            <Link href={pageHref(sp, result.page + 1)} aria-disabled={result.page >= result.pages}>
              Siguiente <ChevronRight aria-hidden />
            </Link>
          </Button>
        </nav>
      )}
    </>
  );
}

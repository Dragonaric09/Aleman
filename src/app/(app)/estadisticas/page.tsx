import { Clock, Flame, Target, Trophy } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { ActivityHeatmap, ForecastBars, ReviewsPerDay } from "@/components/stats/charts";
import { ProgressStack, StatCard } from "@/components/stats/stat-card";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, PageHeader } from "@/components/ui/card";
import { cn } from "@/lib/cn";
import { requireUser } from "@/modules/auth";
import { getStats } from "@/modules/stats";
import { LEVEL_LABELS } from "@/modules/vocabulary/shared";
import { clock } from "@/server/clock";

export const metadata: Metadata = { title: "Estadísticas" };

const RANGES = [7, 30, 90, 365];

export default async function StatsPage({ searchParams }: { searchParams: Promise<{ range?: string }> }) {
  const user = await requireUser();
  const { range } = await searchParams;
  const s = await getStats(user.id, range, clock.now());
  const retention = s.retention.rate === null ? "—" : `${Math.round(s.retention.rate * 100)}%`;
  const avg =
    s.averageMsPerCard === null ? "—" : `${(s.averageMsPerCard / 1000).toFixed(1).replace(".", ",")} s`;

  return (
    <>
      <PageHeader
        eyebrow="Wortschatz"
        title="Estadísticas"
        description="Tu constancia y lo que viene."
        actions={
          <nav aria-label="Rango" className="border-line bg-surface-2 inline-flex rounded-md border p-0.5">
            {RANGES.map((r) => (
              <Link
                key={r}
                href={`/estadisticas?range=${r}`}
                aria-current={s.range === r ? "true" : undefined}
                className={cn(
                  "text-ink-2 rounded-[7px] px-3 py-1 text-sm",
                  s.range === r && "bg-surface text-ink shadow-paper",
                )}
              >
                {r} d
              </Link>
            ))}
          </nav>
        }
      />

      <section className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          label="Racha actual"
          value={s.streak.current}
          icon={Flame}
          tone="accent"
          hint={s.streak.current === 1 ? "día" : "días"}
        />
        <StatCard label="Racha máxima" value={s.streak.max} icon={Trophy} hint="días seguidos" />
        <StatCard
          label="Retención real"
          value={retention}
          icon={Target}
          hint={`${s.retention.retained} de ${s.retention.reviews} repasos (30 d)`}
        />
        <StatCard
          label="Tiempo por tarjeta"
          value={avg}
          icon={Clock}
          hint={`${s.totals.reviews} repasos en ${s.range} d`}
        />
      </section>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Actividad · 90 días</CardTitle>
            <CardDescription>Cada casilla es un día de estudio.</CardDescription>
          </CardHeader>
          <CardContent>
            <ActivityHeatmap data={s.heatmap} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Repasos por día · {s.range} días</CardTitle>
          </CardHeader>
          <CardContent>
            <ReviewsPerDay data={s.reviewsPerDay} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Previsión · 30 días</CardTitle>
            <CardDescription>Repasos programados; los atrasados cuentan para hoy.</CardDescription>
          </CardHeader>
          <CardContent>
            <ForecastBars data={s.forecast} height={224} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Progreso por nivel</CardTitle>
            <CardDescription>Maduras = intervalo de 21 días o más.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-5">
            {s.levels.map((l) => (
              <ProgressStack
                key={l.level}
                label={LEVEL_LABELS[l.level]}
                total={l.total}
                introduced={l.introduced}
                mature={l.mature}
              />
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Progreso por lección</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-5">
            {s.lessons.map((l) => (
              <ProgressStack
                key={l.number}
                label={`${l.number} · ${l.title}`}
                total={l.total}
                introduced={l.introduced}
                mature={l.mature}
              />
            ))}
          </CardContent>
        </Card>
      </div>
    </>
  );
}

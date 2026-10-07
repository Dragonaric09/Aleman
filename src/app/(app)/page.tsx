import { ArrowRight, Flame, Hourglass, RotateCcw, Sparkles } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { ForecastBars } from "@/components/stats/charts";
import { ProgressStack, StatCard } from "@/components/stats/stat-card";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { requireUser } from "@/modules/auth";
import { getSettings } from "@/modules/settings";
import { getDashboard } from "@/modules/stats";
import { LEVEL_LABELS } from "@/modules/vocabulary/shared";
import { clock } from "@/server/clock";

export const metadata: Metadata = { title: "Panel" };

function greeting(hour: number) {
  if (hour < 12) return "Guten Morgen";
  if (hour < 19) return "Guten Tag";
  return "Guten Abend";
}

export default async function DashboardPage() {
  const user = await requireUser();
  const { summary, streak, levels, forecast } = await getDashboard(user.id, clock.now());
  const pending = summary.newAvailable + summary.reviewsDue;
  const { timezone } = await getSettings(user.id);
  const hour = Number(
    new Intl.DateTimeFormat("es", { hour: "numeric", hourCycle: "h23", timeZone: timezone }).format(
      clock.now(),
    ),
  );

  return (
    <div className="grid gap-8">
      <section className="grid gap-6 lg:grid-cols-[1.4fr_1fr] lg:items-stretch">
        <Card raised className="relative overflow-hidden">
          <div className="absolute inset-x-0 top-0 flex h-1" aria-hidden>
            <span className="bg-ink flex-1" />
            <span className="bg-die flex-1" />
            <span className="bg-accent flex-1" />
          </div>
          <div className="flex h-full flex-col justify-between gap-8 p-6 sm:p-8">
            <div>
              <p className="text-accent text-xs font-medium tracking-[0.14em] uppercase">
                {greeting(hour)}, {user.displayName}
              </p>
              <h1 className="mt-2 font-serif text-4xl font-semibold tracking-tight text-balance sm:text-5xl">
                {pending > 0 ? (
                  <>
                    Hoy te esperan <span className="tabular">{pending}</span> tarjetas
                  </>
                ) : summary.learning > 0 ? (
                  "Solo quedan tarjetas en aprendizaje"
                ) : (
                  "Todo al día. Gut gemacht!"
                )}
              </h1>
              <p className="text-ink-2 mt-3">
                {summary.newAvailable} nuevas · {summary.reviewsDue} repasos · {summary.learning} en
                aprendizaje
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <Button asChild size="lg" variant={pending > 0 ? "primary" : "secondary"}>
                <Link href="/estudiar">
                  Estudiar
                  <ArrowRight aria-hidden />
                </Link>
              </Button>
              <Button asChild size="lg" variant="ghost">
                <Link href="/practicar">Práctica libre</Link>
              </Button>
            </div>
          </div>
        </Card>
        <div className="grid grid-cols-2 gap-4">
          <StatCard
            label="Nuevas hoy"
            value={summary.newAvailable}
            icon={Sparkles}
            tone="accent"
            hint={`${summary.newIntroducedToday} ya introducidas`}
          />
          <StatCard
            label="Repasos"
            value={summary.reviewsDue}
            icon={RotateCcw}
            hint={`${summary.reviewsDoneToday} hechos hoy`}
          />
          <StatCard label="Aprendiendo" value={summary.learning} icon={Hourglass} hint="pasos cortos" />
          <StatCard
            label="Racha"
            value={streak.current}
            icon={Flame}
            tone="accent"
            hint={`${streak.current === 1 ? "día" : "días"} · máxima ${streak.max}`}
          />
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Progreso por nivel</CardTitle>
            <CardDescription>
              Introducidas sobre el total; maduras = intervalo de 21 días o más.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-5">
            {levels.map((l) => (
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
            <CardTitle>Próximos 7 días</CardTitle>
            <CardDescription>Repasos programados por día de estudio.</CardDescription>
          </CardHeader>
          <CardContent>
            <ForecastBars data={forecast} compact height={170} />
          </CardContent>
        </Card>
      </section>
    </div>
  );
}

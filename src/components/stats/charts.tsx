"use client";

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

/** Props mínimas que Recharts pasa al contenido del tooltip. */
type TipProps = { active?: boolean; payload?: ReadonlyArray<{ payload?: unknown }> };
import { cn } from "@/lib/cn";

const WEEKDAYS = ["dom", "lun", "mar", "mié", "jue", "vie", "sáb"];

function parseDay(day: string) {
  const [y, m, d] = day.split("-").map(Number) as [number, number, number];
  return new Date(Date.UTC(y, m - 1, d));
}
function shortDate(day: string) {
  const d = parseDay(day);
  return `${d.getUTCDate()}/${d.getUTCMonth() + 1}`;
}
function weekday(day: string) {
  return WEEKDAYS[parseDay(day).getUTCDay()]!;
}
function longDate(day: string) {
  return parseDay(day).toLocaleDateString("es", {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: "UTC",
  });
}

const axisProps = {
  stroke: "var(--chart-axis)",
  tick: { fill: "var(--chart-axis)", fontSize: 11 },
  tickLine: false,
  axisLine: false,
} as const;

function TooltipBox({
  title,
  rows,
}: {
  title: string;
  rows: { label: string; value: number; color?: string }[];
}) {
  return (
    <div className="border-line bg-surface shadow-lift rounded-md border px-3 py-2 text-xs">
      <p className="text-ink mb-1 font-medium first-letter:uppercase">{title}</p>
      {rows.map((r) => (
        <p key={r.label} className="text-ink-2 flex items-center gap-2">
          {r.color && <span className="size-2 rounded-[2px]" style={{ background: r.color }} aria-hidden />}
          <span>{r.label}</span>
          <span className="tabular text-ink ml-auto pl-3 font-medium">{r.value}</span>
        </p>
      ))}
    </div>
  );
}

/** Tabla alternativa accesible para cada gráfico. */
function DataTable({
  caption,
  head,
  rows,
}: {
  caption: string;
  head: string[];
  rows: (string | number)[][];
}) {
  return (
    <details className="mt-3 text-sm">
      <summary className="text-ink-2 hover:text-ink cursor-pointer text-xs">Ver como tabla</summary>
      <div className="border-line mt-2 max-h-64 overflow-auto rounded-md border">
        <table className="w-full text-left text-xs">
          <caption className="sr-only">{caption}</caption>
          <thead className="bg-surface-2 sticky top-0">
            <tr>
              {head.map((h) => (
                <th key={h} scope="col" className="px-3 py-1.5 font-medium">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="tabular">
            {rows.map((r, i) => (
              <tr key={i} className="border-line border-t">
                {r.map((c, j) => (
                  <td key={j} className="px-3 py-1">
                    {c}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </details>
  );
}

/** Previsión de repasos (una serie): mini barras en el panel o 30 días en estadísticas. */
export function ForecastBars({
  data,
  height = 140,
  compact,
}: {
  data: { day: string; count: number }[];
  height?: number;
  compact?: boolean;
}) {
  const Tip = ({ active, payload }: TipProps) => {
    const p = payload?.[0]?.payload as { day: string; count: number } | undefined;
    if (!active || !p) return null;
    return (
      <TooltipBox
        title={longDate(p.day)}
        rows={[{ label: "Repasos previstos", value: p.count, color: "var(--chart-1)" }]}
      />
    );
  };
  return (
    <figure>
      <div
        style={{ height }}
        role="img"
        aria-label={`Previsión de repasos: ${data.map((d) => `${shortDate(d.day)} ${d.count}`).join(", ")}`}
      >
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data}
            margin={{ top: 8, right: 4, bottom: 0, left: compact ? -28 : -16 }}
            barCategoryGap={compact ? "22%" : "18%"}
          >
            <CartesianGrid vertical={false} stroke="var(--chart-grid)" />
            <XAxis
              dataKey="day"
              {...axisProps}
              tickFormatter={compact ? weekday : shortDate}
              interval={compact ? 0 : "preserveStartEnd"}
              minTickGap={12}
            />
            <YAxis {...axisProps} allowDecimals={false} width={40} />
            <Tooltip content={Tip} cursor={{ fill: "var(--surface-2)" }} />
            <Bar dataKey="count" fill="var(--chart-1)" radius={[4, 4, 0, 0]} maxBarSize={28} />
          </BarChart>
        </ResponsiveContainer>
      </div>
      {!compact && (
        <DataTable
          caption="Previsión de repasos"
          head={["Día", "Repasos"]}
          rows={data.map((d) => [longDate(d.day), d.count])}
        />
      )}
    </figure>
  );
}

/** Repasos por día, apilados: repasos (dorado) y nuevas (verde azulado), con 2 px de separación. */
export function ReviewsPerDay({ data }: { data: { day: string; reviews: number; news: number }[] }) {
  const Tip = ({ active, payload }: TipProps) => {
    const p = payload?.[0]?.payload as { day: string; reviews: number; news: number } | undefined;
    if (!active || !p) return null;
    return (
      <TooltipBox
        title={longDate(p.day)}
        rows={[
          { label: "Repasos", value: p.reviews, color: "var(--chart-1)" },
          { label: "Nuevas", value: p.news, color: "var(--chart-2)" },
        ]}
      />
    );
  };
  return (
    <figure>
      <Legend
        items={[
          { label: "Repasos", color: "var(--chart-1)" },
          { label: "Nuevas", color: "var(--chart-2)" },
        ]}
      />
      <div className="h-56" role="img" aria-label="Repasos y palabras nuevas por día">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 8, right: 4, bottom: 0, left: -16 }} barCategoryGap="18%">
            <CartesianGrid vertical={false} stroke="var(--chart-grid)" />
            <XAxis dataKey="day" {...axisProps} tickFormatter={shortDate} minTickGap={16} />
            <YAxis {...axisProps} allowDecimals={false} width={40} />
            <Tooltip content={Tip} cursor={{ fill: "var(--surface-2)" }} />
            <Bar
              dataKey="reviews"
              stackId="a"
              fill="var(--chart-1)"
              stroke="var(--surface)"
              strokeWidth={2}
              maxBarSize={24}
            />
            <Bar
              dataKey="news"
              stackId="a"
              fill="var(--chart-2)"
              stroke="var(--surface)"
              strokeWidth={2}
              radius={[4, 4, 0, 0]}
              maxBarSize={24}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <DataTable
        caption="Repasos por día"
        head={["Día", "Repasos", "Nuevas"]}
        rows={data.map((d) => [longDate(d.day), d.reviews, d.news])}
      />
    </figure>
  );
}

export function Legend({ items }: { items: { label: string; color: string }[] }) {
  return (
    <ul className="text-ink-2 mb-2 flex flex-wrap gap-4 text-xs">
      {items.map((i) => (
        <li key={i.label} className="flex items-center gap-1.5">
          <span className="size-2.5 rounded-[3px]" style={{ background: i.color }} aria-hidden />
          {i.label}
        </li>
      ))}
    </ul>
  );
}

/** Heatmap de actividad (secuencial de un solo matiz: más repasos = dorado más intenso). */
export function ActivityHeatmap({ data }: { data: { day: string; count: number }[] }) {
  const max = Math.max(1, ...data.map((d) => d.count));
  const level = (n: number) => (n === 0 ? 0 : Math.min(4, Math.ceil((n / max) * 4)));
  const shades = [
    "var(--surface-2)",
    "color-mix(in oklab, var(--chart-1) 30%, var(--surface))",
    "color-mix(in oklab, var(--chart-1) 55%, var(--surface))",
    "color-mix(in oklab, var(--chart-1) 78%, var(--surface))",
    "var(--chart-1)",
  ];
  // Columnas por semana empezando en lunes.
  const first = parseDay(data[0]?.day ?? "2026-01-01").getUTCDay();
  const offset = (first + 6) % 7;
  const cells: ({ day: string; count: number } | null)[] = [...Array(offset).fill(null), ...data];
  const active = data.filter((d) => d.count > 0).length;
  return (
    <figure>
      <div className="overflow-x-auto pb-1">
        <div
          className="grid w-max grid-flow-col grid-rows-7 gap-[3px]"
          role="img"
          aria-label={`Actividad de los últimos ${data.length} días: ${active} días con repasos`}
        >
          {cells.map((c, i) =>
            c ? (
              <span
                key={c.day}
                title={`${longDate(c.day)}: ${c.count} repasos`}
                className={cn("size-3 rounded-[3px] sm:size-3.5", c.count === 0 && "border-line border")}
                style={{ background: shades[level(c.count)] }}
              />
            ) : (
              <span key={`e${i}`} className="size-3 sm:size-3.5" aria-hidden />
            ),
          )}
        </div>
      </div>
      <figcaption className="text-ink-2 mt-2 flex items-center gap-1.5 text-xs">
        Menos
        {shades.map((s, i) => (
          <span
            key={i}
            className={cn("size-3 rounded-[3px]", i === 0 && "border-line border")}
            style={{ background: s }}
            aria-hidden
          />
        ))}
        Más
      </figcaption>
    </figure>
  );
}

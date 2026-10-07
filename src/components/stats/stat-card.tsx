import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/cn";

export function StatCard({
  label,
  value,
  hint,
  icon: Icon,
  tone = "neutral",
  className,
}: {
  label: string;
  value: React.ReactNode;
  hint?: React.ReactNode;
  icon?: LucideIcon;
  tone?: "neutral" | "accent";
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col justify-between gap-3 rounded-lg border border-line bg-surface p-4 shadow-paper", className)}>
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-medium uppercase tracking-[0.12em] text-ink-2">{label}</p>
        {Icon && <Icon className={cn("size-4", tone === "accent" ? "text-accent" : "text-ink-2")} aria-hidden />}
      </div>
      <p className="tabular font-serif text-4xl leading-none font-semibold tracking-tight">{value}</p>
      {hint && <p className="text-xs text-ink-2">{hint}</p>}
    </div>
  );
}

/** Barra de progreso apilada: madura (tinta) dentro de introducida (dorado) sobre el total. */
export function ProgressStack({
  label,
  total,
  introduced,
  mature,
}: {
  label: React.ReactNode;
  total: number;
  introduced: number;
  mature: number;
}) {
  const pct = (n: number) => (total ? Math.round((n / total) * 100) : 0);
  return (
    <div className="grid gap-1.5">
      <div className="flex items-baseline justify-between gap-3 text-sm">
        <span className="min-w-0 truncate font-medium">{label}</span>
        <span className="tabular shrink-0 text-ink-2">
          {introduced} / {total}
          <span className="ml-2 text-xs">({mature} maduras)</span>
        </span>
      </div>
      <div
        className="relative h-2 overflow-hidden rounded-full bg-surface-2"
        role="img"
        aria-label={`${introduced} de ${total} introducidas, ${mature} maduras`}
      >
        <div className="absolute inset-y-0 left-0 rounded-full bg-accent/45" style={{ width: `${pct(introduced)}%` }} />
        <div className="absolute inset-y-0 left-0 rounded-full bg-accent" style={{ width: `${pct(mature)}%` }} />
      </div>
    </div>
  );
}

import * as React from "react";
import { cn } from "@/lib/cn";

export function Card({
  className,
  raised,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & { raised?: boolean }) {
  return (
    <div
      className={cn(
        "border-line bg-surface rounded-lg border",
        raised ? "shadow-lift" : "shadow-paper",
        className,
      )}
      {...props}
    />
  );
}

export function CardHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("flex flex-col gap-1 p-5 pb-3", className)} {...props} />;
}

export function CardTitle({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return <h2 className={cn("font-serif text-lg font-semibold tracking-tight", className)} {...props} />;
}

export function CardDescription({ className, ...props }: React.HTMLAttributes<HTMLParagraphElement>) {
  return <p className={cn("text-ink-2 text-sm", className)} {...props} />;
}

export function CardContent({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("p-5 pt-0", className)} {...props} />;
}

export function PageHeader({
  title,
  description,
  actions,
  eyebrow,
}: {
  title: React.ReactNode;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  eyebrow?: React.ReactNode;
}) {
  return (
    <header className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        {eyebrow && (
          <p className="text-accent mb-1 text-xs font-medium tracking-[0.14em] uppercase">{eyebrow}</p>
        )}
        <h1 className="font-serif text-3xl font-semibold tracking-tight text-balance sm:text-4xl">{title}</h1>
        {description && <p className="text-ink-2 mt-2 max-w-2xl text-pretty">{description}</p>}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap gap-2">{actions}</div>}
    </header>
  );
}

export function Badge({
  className,
  tone = "neutral",
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & { tone?: "neutral" | "accent" | "ok" | "almost" | "bad" }) {
  const tones = {
    neutral: "border-line-strong bg-surface-2 text-ink-2",
    accent: "border-accent/30 bg-accent-soft text-accent",
    ok: "border-ok/25 bg-ok-bg text-ok",
    almost: "border-almost/25 bg-almost-bg text-almost",
    bad: "border-bad/25 bg-bad-bg text-bad",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-sm border px-1.5 py-0.5 text-xs leading-none font-medium",
        tones[tone],
        className,
      )}
      {...props}
    />
  );
}

export function EmptyState({
  icon,
  title,
  children,
}: {
  icon?: React.ReactNode;
  title: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="border-line-strong flex flex-col items-center gap-3 rounded-lg border border-dashed px-6 py-14 text-center">
      {icon && <div className="text-accent [&_svg]:size-8">{icon}</div>}
      <p className="font-serif text-xl font-semibold">{title}</p>
      {children && <div className="text-ink-2 max-w-md text-sm">{children}</div>}
    </div>
  );
}

import { Wordmark } from "@/components/layout/app-nav";
import { ThemeToggle } from "@/components/layout/theme-toggle";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-dvh lg:grid-cols-[1.1fr_1fr]">
      <aside className="relative hidden overflow-hidden border-r border-line bg-surface-2 lg:flex lg:flex-col lg:justify-between lg:p-12">
        <Wordmark />
        <div className="max-w-md">
          <p className="font-serif text-5xl leading-[1.05] font-medium tracking-tight text-balance">
            Cada palabra, <span className="italic text-accent">justo antes</span> de olvidarla.
          </p>
          <p className="mt-5 text-ink-2">
            Recuperación activa y repaso espaciado para el vocabulario de tus lecciones 13–16 de alemán.
          </p>
        </div>
        <dl lang="de" className="grid grid-cols-3 gap-3 font-serif text-lg" aria-label="Ejemplos de género">
          <div className="rounded-md border border-line bg-surface p-3">
            <dt className="text-sm font-semibold text-der-text">der</dt>
            <dd>Bahnhof</dd>
          </div>
          <div className="rounded-md border border-line bg-surface p-3">
            <dt className="text-sm font-semibold text-die-text">die</dt>
            <dd>Ampel</dd>
          </div>
          <div className="rounded-md border border-line bg-surface p-3">
            <dt className="text-sm font-semibold text-das-text">das</dt>
            <dd>Zimmer</dd>
          </div>
        </dl>
      </aside>
      <main className="flex flex-col px-4 py-6 sm:px-10">
        <div className="flex items-center justify-between lg:justify-end">
          <span className="lg:hidden">
            <Wordmark />
          </span>
          <ThemeToggle />
        </div>
        <div className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center py-10">{children}</div>
      </main>
    </div>
  );
}

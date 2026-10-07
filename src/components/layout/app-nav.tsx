"use client";

import * as Dialog from "@radix-ui/react-dialog";
import {
  BarChart3,
  BookOpen,
  Dumbbell,
  FileUp,
  Flame,
  GraduationCap,
  Home,
  LogOut,
  Menu,
  Settings,
  X,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { cn } from "@/lib/cn";
import { ThemeToggle } from "./theme-toggle";

const LINKS = [
  { href: "/", label: "Panel", icon: Home },
  { href: "/estudiar", label: "Estudiar", icon: GraduationCap },
  { href: "/practicar", label: "Practicar", icon: Dumbbell },
  { href: "/vocabulario", label: "Vocabulario", icon: BookOpen },
  { href: "/rebeldes", label: "Rebeldes", icon: Flame },
  { href: "/estadisticas", label: "Estadísticas", icon: BarChart3 },
  { href: "/importar-exportar", label: "Importar / exportar", icon: FileUp },
  { href: "/ajustes", label: "Ajustes", icon: Settings },
];

function isActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);
}

export function Wordmark() {
  return (
    <Link href="/" className="group inline-flex items-baseline gap-1.5 rounded-sm">
      <span className="font-serif text-xl font-semibold tracking-tight">Wortschatz</span>
      <span className="flex gap-[2px] self-center" aria-hidden>
        <span className="h-3 w-[3px] rounded-full bg-ink" />
        <span className="h-3 w-[3px] rounded-full bg-die" />
        <span className="h-3 w-[3px] rounded-full bg-accent" />
      </span>
    </Link>
  );
}

export function AppNav({ displayName, logout }: { displayName: string; logout: () => Promise<void> }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const primary = LINKS.slice(0, 6);

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-paper/85 backdrop-blur supports-[backdrop-filter]:bg-paper/70">
      <div className="mx-auto flex h-14 max-w-6xl items-center gap-4 px-4 sm:px-6">
        <Wordmark />
        <nav aria-label="Principal" className="ml-4 hidden items-center gap-0.5 lg:flex">
          {primary.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              aria-current={isActive(pathname, href) ? "page" : undefined}
              className={cn(
                "rounded-md px-3 py-1.5 text-sm text-ink-2 transition-colors hover:text-ink",
                isActive(pathname, href) && "bg-surface text-ink shadow-paper",
              )}
            >
              {label}
            </Link>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-2">
          <ThemeToggle className="hidden sm:inline-flex" />
          <Dialog.Root open={open} onOpenChange={setOpen}>
            <Dialog.Trigger asChild>
              <button
                type="button"
                className="inline-flex size-9 items-center justify-center rounded-md border border-line bg-surface text-ink-2 hover:text-ink"
                aria-label="Abrir menú"
              >
                <Menu className="size-4" aria-hidden />
              </button>
            </Dialog.Trigger>
            <Dialog.Portal>
              <Dialog.Overlay className="fixed inset-0 z-50 bg-ink/30 backdrop-blur-[2px]" />
              <Dialog.Content className="fixed inset-y-0 right-0 z-50 flex w-[min(320px,88vw)] flex-col border-l border-line bg-paper p-5 shadow-lift">
                <div className="mb-6 flex items-center justify-between">
                  <Dialog.Title className="font-serif text-lg font-semibold">Hallo, {displayName}</Dialog.Title>
                  <Dialog.Close className="inline-flex size-8 items-center justify-center rounded-md text-ink-2 hover:bg-surface-2" aria-label="Cerrar menú">
                    <X className="size-4" aria-hidden />
                  </Dialog.Close>
                </div>
                <Dialog.Description className="sr-only">Navegación de la aplicación</Dialog.Description>
                <nav aria-label="Menú" className="flex flex-col gap-0.5">
                  {LINKS.map(({ href, label, icon: Icon }) => (
                    <Link
                      key={href}
                      href={href}
                      onClick={() => setOpen(false)}
                      aria-current={isActive(pathname, href) ? "page" : undefined}
                      className={cn(
                        "flex items-center gap-3 rounded-md px-3 py-2.5 text-sm text-ink-2 hover:bg-surface-2 hover:text-ink",
                        isActive(pathname, href) && "bg-surface text-ink shadow-paper",
                      )}
                    >
                      <Icon className="size-4" aria-hidden />
                      {label}
                    </Link>
                  ))}
                </nav>
                <div className="mt-auto flex items-center justify-between gap-3 border-t border-line pt-4">
                  <ThemeToggle />
                  <form action={logout}>
                    <button type="submit" className="inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm text-ink-2 hover:bg-surface-2 hover:text-ink">
                      <LogOut className="size-4" aria-hidden />
                      Salir
                    </button>
                  </form>
                </div>
              </Dialog.Content>
            </Dialog.Portal>
          </Dialog.Root>
        </div>
      </div>
    </header>
  );
}

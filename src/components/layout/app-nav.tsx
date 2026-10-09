"use client";

import * as Dialog from "@radix-ui/react-dialog";
import {
  BarChart3,
  BookOpen,
  Dumbbell,
  FileUp,
  Flame,
  GraduationCap,
  Languages,
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
  { href: "/gramatica", label: "Gramática", icon: Languages },
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
        <span className="bg-ink h-3 w-[3px] rounded-full" />
        <span className="bg-die h-3 w-[3px] rounded-full" />
        <span className="bg-accent h-3 w-[3px] rounded-full" />
      </span>
    </Link>
  );
}

export function AppNav({ displayName, logout }: { displayName: string; logout: () => Promise<void> }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const primary = LINKS.slice(0, 6);

  return (
    <header className="border-line bg-paper/85 supports-[backdrop-filter]:bg-paper/70 sticky top-0 z-40 border-b backdrop-blur">
      <div className="mx-auto flex h-14 max-w-6xl items-center gap-4 px-4 sm:px-6">
        <Wordmark />
        <nav aria-label="Principal" className="ml-4 hidden items-center gap-0.5 lg:flex">
          {primary.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              aria-current={isActive(pathname, href) ? "page" : undefined}
              className={cn(
                "text-ink-2 hover:text-ink rounded-md px-3 py-1.5 text-sm transition-colors",
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
                className="border-line bg-surface text-ink-2 hover:text-ink inline-flex size-9 items-center justify-center rounded-md border"
                aria-label="Abrir menú"
              >
                <Menu className="size-4" aria-hidden />
              </button>
            </Dialog.Trigger>
            <Dialog.Portal>
              <Dialog.Overlay className="bg-ink/30 fixed inset-0 z-50 backdrop-blur-[2px]" />
              <Dialog.Content className="border-line bg-paper shadow-lift fixed inset-y-0 right-0 z-50 flex w-[min(320px,88vw)] flex-col border-l p-5">
                <div className="mb-6 flex items-center justify-between">
                  <Dialog.Title className="font-serif text-lg font-semibold">
                    Hallo, {displayName}
                  </Dialog.Title>
                  <Dialog.Close
                    className="text-ink-2 hover:bg-surface-2 inline-flex size-8 items-center justify-center rounded-md"
                    aria-label="Cerrar menú"
                  >
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
                        "text-ink-2 hover:bg-surface-2 hover:text-ink flex items-center gap-3 rounded-md px-3 py-2.5 text-sm",
                        isActive(pathname, href) && "bg-surface text-ink shadow-paper",
                      )}
                    >
                      <Icon className="size-4" aria-hidden />
                      {label}
                    </Link>
                  ))}
                </nav>
                <div className="border-line mt-auto flex items-center justify-between gap-3 border-t pt-4">
                  <ThemeToggle />
                  <form action={logout}>
                    <button
                      type="submit"
                      className="text-ink-2 hover:bg-surface-2 hover:text-ink inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm"
                    >
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

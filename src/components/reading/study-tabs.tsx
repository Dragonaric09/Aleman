"use client";

import { BookOpenText, Layers } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";

const TABS = [
  { href: "/estudiar", label: "Tarjetas", icon: Layers },
  { href: "/estudiar/historias", label: "Historias", icon: BookOpenText },
];

/** Pestañas de la sección Estudiar. */
export function StudyTabs() {
  const pathname = usePathname();
  return (
    <nav
      aria-label="Modo de estudio"
      className="border-line bg-surface-2 mx-auto mb-8 flex w-fit rounded-md border p-0.5"
    >
      {TABS.map(({ href, label, icon: Icon }) => {
        const active = href === "/estudiar" ? pathname === href : pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "text-ink-2 hover:text-ink inline-flex items-center gap-2 rounded-[7px] px-4 py-1.5 text-sm transition-colors",
              active && "bg-surface text-ink shadow-paper",
            )}
          >
            <Icon className="size-4" aria-hidden />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}

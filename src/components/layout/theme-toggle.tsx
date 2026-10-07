"use client";

import { Monitor, Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";
import { cn } from "@/lib/cn";

type Theme = "light" | "dark" | "system";
const OPTIONS: { value: Theme; label: string; icon: typeof Sun }[] = [
  { value: "light", label: "Claro", icon: Sun },
  { value: "dark", label: "Oscuro", icon: Moon },
  { value: "system", label: "Sistema", icon: Monitor },
];

function apply(theme: Theme) {
  const dark = theme === "dark" || (theme === "system" && matchMedia("(prefers-color-scheme: dark)").matches);
  document.documentElement.classList.toggle("dark", dark);
}

/** Conmutador manual de tema; por defecto sigue al sistema. */
export function ThemeToggle({ className }: { className?: string }) {
  const [theme, setTheme] = useState<Theme>("system");

  useEffect(() => {
    let saved: Theme = "system";
    try {
      saved = (localStorage.getItem("wz-theme") as Theme | null) ?? "system";
    } catch {}
    setTheme(saved);
    const mq = matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => {
      let current: Theme = "system";
      try {
        current = (localStorage.getItem("wz-theme") as Theme | null) ?? "system";
      } catch {}
      if (current === "system") apply("system");
    };
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  function choose(t: Theme) {
    setTheme(t);
    try {
      if (t === "system") localStorage.removeItem("wz-theme");
      else localStorage.setItem("wz-theme", t);
    } catch {}
    apply(t);
  }

  return (
    <div role="group" aria-label="Tema" className={cn("inline-flex rounded-md border border-line bg-surface-2 p-0.5", className)}>
      {OPTIONS.map(({ value, label, icon: Icon }) => (
        <button
          key={value}
          type="button"
          aria-pressed={theme === value}
          aria-label={label}
          title={label}
          onClick={() => choose(value)}
          className={cn(
            "inline-flex size-7 items-center justify-center rounded-[7px] text-ink-2 transition-colors",
            theme === value ? "bg-surface text-ink shadow-paper" : "hover:text-ink",
          )}
        >
          <Icon className="size-3.5" aria-hidden />
        </button>
      ))}
    </div>
  );
}

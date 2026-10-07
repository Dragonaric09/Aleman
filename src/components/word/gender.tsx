import { ARTICLES, citationForm, displayLemma, type Gender, type WordType } from "@/modules/vocabulary/shared";
import { cn } from "@/lib/cn";

const STYLE: Record<Gender | "PLURAL", { dot: string; text: string; underline: string; bg: string }> = {
  DER: { dot: "bg-der", text: "text-der-text", underline: "decoration-der", bg: "bg-der/10 border-der/30" },
  DIE: { dot: "bg-die", text: "text-die-text", underline: "decoration-die", bg: "bg-die/10 border-die/30" },
  DAS: { dot: "bg-das", text: "text-das-text", underline: "decoration-das", bg: "bg-das/10 border-das/30" },
  PLURAL: { dot: "bg-plural", text: "text-plural-text", underline: "decoration-plural", bg: "bg-plural/10 border-plural/30" },
};

/** Artículo con su color de género. El artículo siempre va escrito: el color es redundante. */
export function GenderBadge({ gender, size = "md", className }: { gender: Gender | "PLURAL"; size?: "sm" | "md"; className?: string }) {
  const s = STYLE[gender];
  const label = gender === "PLURAL" ? "die" : ARTICLES[gender];
  return (
    <span
      lang="de"
      className={cn(
        "inline-flex items-center gap-1.5 rounded-sm border font-semibold",
        s.bg,
        s.text,
        size === "sm" ? "px-1.5 py-0.5 text-xs" : "px-2 py-0.5 text-sm",
        className,
      )}
    >
      <span className={cn("size-1.5 rounded-full", s.dot)} aria-hidden />
      {label}
      {gender === "PLURAL" && <span className="sr-only"> (plural)</span>}
    </span>
  );
}

const SIZES = { sm: "text-base", md: "text-xl", lg: "text-3xl sm:text-4xl", xl: "text-4xl sm:text-5xl" };

/** Lema alemán en serif, con artículo coloreado y subrayado de género. */
export function WordDisplay({
  word,
  size = "md",
  plural,
  className,
}: {
  word: { lemma: string; type: WordType; gender: Gender | null };
  size?: keyof typeof SIZES;
  /** Mostrar la forma plural (die …) en lugar del singular. */
  plural?: string | null;
  className?: string;
}) {
  const g = plural ? "PLURAL" : word.type === "NOUN" ? word.gender : null;
  const lemma = plural ?? displayLemma(word.lemma);
  return (
    <span lang="de" className={cn("inline-flex flex-wrap items-baseline gap-x-2 font-serif leading-tight", SIZES[size], className)}>
      {g && (
        <span className={cn("font-semibold", STYLE[g].text)}>
          {g === "PLURAL" ? "die" : ARTICLES[g]}
        </span>
      )}
      <span
        className={cn(
          "font-medium tracking-tight text-ink",
          g && "underline decoration-2 underline-offset-[0.22em]",
          g && STYLE[g].underline,
        )}
      >
        {lemma}
      </span>
    </span>
  );
}

export function citation(word: { lemma: string; type: WordType; gender: Gender | null }) {
  return citationForm(word);
}

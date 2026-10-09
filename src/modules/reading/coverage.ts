import { displayLemma } from "@/modules/vocabulary/shared";
import { plainText } from "./body";

export interface CatalogForms {
  lemma: string;
  pluralForm: string | null;
  thirdPerson: string | null;
  perfekt: string | null;
}

const WORD_RE = /\p{L}+/gu;
const SUFFIXES = ["sten", "ste", "est", "en", "em", "er", "es", "st", "e", "n", "s", "t"];

export function words(text: string): string[] {
  return [...text.toLowerCase().matchAll(WORD_RE)].map((m) => m[0]);
}

/** Formas que se consideran conocidas: lemas, plurales, tercera persona, participios y raíces verbales. */
export function buildKnownForms(catalog: CatalogForms[], functionWords: Iterable<string>): Set<string> {
  const known = new Set<string>();
  const add = (s: string | null | undefined) => {
    if (!s) return;
    for (const w of words(s)) known.add(w);
  };
  for (const w of catalog) {
    add(displayLemma(w.lemma));
    add(w.lemma.replace("|", " "));
    add(w.pluralForm);
    add(w.thirdPerson);
    add(w.perfekt);
    const inf = displayLemma(w.lemma).toLowerCase();
    if (/(en|ern|eln)$/.test(inf)) known.add(inf.replace(/e?n$/, "")); // raíz verbal: such(en)
    if (w.thirdPerson) known.add(words(w.thirdPerson)[0]!.replace(/e?t$/, "")); // fähr(t)
    if (w.lemma.includes("|")) known.add(w.lemma.split("|")[1]!.toLowerCase().replace(/e?n$/, ""));
  }
  for (const f of functionWords) add(f);
  return known;
}

/** ¿Es conocida una palabra (directamente o quitando una terminación flexiva)? */
export function isKnown(word: string, known: Set<string>): boolean {
  const w = word.toLowerCase();
  if (known.has(w) || /^\d+$/.test(w)) return true;
  for (const s of SUFFIXES) {
    if (w.length > s.length + 2 && w.endsWith(s) && known.has(w.slice(0, -s.length))) return true;
  }
  return false;
}

/** Proporción de palabras de la historia que pertenecen al vocabulario conocido. */
export function storyCoverage(body: string, known: Set<string>) {
  const all = words(plainText(body));
  const unknown = all.filter((w) => !isKnown(w, known));
  return {
    total: all.length,
    ratio: all.length ? (all.length - unknown.length) / all.length : 1,
    unknown: [...new Set(unknown)],
  };
}

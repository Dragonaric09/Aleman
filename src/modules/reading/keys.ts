import { displayLemma } from "@/modules/vocabulary/shared";

/** Clave normalizada de una palabra clave: «Ampel», «abbiegen», «Kein Problem». */
export function normalizeKey(s: string): string {
  return s
    .normalize("NFC")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim()
    .replace(/[.!?¿¡]+$/u, "")
    .trim();
}

export function keyForLemma(lemma: string): string {
  return normalizeKey(displayLemma(lemma));
}

/**
 * Marcado de las historias (puro, cliente y servidor):
 *   [[Ampel]]            palabra clave (la clave es el lema sin barra: «Ampel»)
 *   [[biegen#abbiegen]]  palabra clave cuya forma en el texto difiere del lema
 *   {dat:neben dem}      forma meta del tema (se resalta y se cuenta)
 *   {err:neben der Dom}  error mostrado a propósito (fase de contraste)
 */

export type Segment =
  | { kind: "text"; text: string }
  | { kind: "keyword"; text: string; key: string }
  | { kind: "target"; text: string; tag: string }
  | { kind: "error"; text: string };

const MARKUP = /\[\[([^\]#]+)(?:#([^\]]+))?\]\]|\{([a-z]+):([^{}]+)\}/g;

export function parseStoryBody(body: string): Segment[] {
  const segments: Segment[] = [];
  let last = 0;
  for (const m of body.matchAll(MARKUP)) {
    const index = m.index ?? 0;
    if (index > last) segments.push({ kind: "text", text: body.slice(last, index) });
    if (m[1] !== undefined) {
      const text = m[1].trim();
      segments.push({ kind: "keyword", text, key: (m[2] ?? m[1]).trim() });
    } else if (m[3] === "err") {
      segments.push({ kind: "error", text: m[4]!.trim() });
    } else {
      segments.push({ kind: "target", text: m[4]!.trim(), tag: m[3]! });
    }
    last = index + m[0].length;
  }
  if (last < body.length) segments.push({ kind: "text", text: body.slice(last) });
  return segments;
}

/** Texto sin marcado. */
export function plainText(body: string): string {
  return parseStoryBody(body)
    .map((s) => s.text)
    .join("");
}

export interface Token {
  id: number;
  text: string;
  /** Palabra (se puede tocar) o separador (espacios y puntuación). */
  isWord: boolean;
  /** Índice de la forma meta a la que pertenece. */
  targetId: number | null;
  error: boolean;
  keywordKey: string | null;
  /** Índice del párrafo (los párrafos se separan con una línea en blanco). */
  paragraph: number;
  /** Índice del segmento de marcado (agrupa expresiones de varias palabras). */
  segment: number;
}

const WORD_RE = /[\p{L}\p{N}]+(?:['’-][\p{L}\p{N}]+)*/gu;

/** Divide el texto en palabras y separadores conservando la pertenencia a formas meta y palabras clave. */
export function tokenize(segments: Segment[]): Token[] {
  const tokens: Token[] = [];
  let targetCount = 0;
  let paragraph = 0;
  let segment = -1;
  const push = (text: string, isWord: boolean, extra: Partial<Token>) =>
    tokens.push({
      id: tokens.length,
      text,
      isWord,
      targetId: null,
      error: false,
      keywordKey: null,
      paragraph,
      segment,
      ...extra,
    });

  for (const seg of segments) {
    segment++;
    const extra: Partial<Token> = {};
    if (seg.kind === "target") extra.targetId = targetCount++;
    if (seg.kind === "error") extra.error = true;
    if (seg.kind === "keyword") extra.keywordKey = seg.key;
    let last = 0;
    for (const m of seg.text.matchAll(WORD_RE)) {
      const i = m.index ?? 0;
      if (i > last) {
        const sep = seg.text.slice(last, i);
        const parts = sep.split(/\n\s*\n/);
        parts.forEach((p, idx) => {
          if (idx > 0) paragraph++;
          if (p) push(p, false, seg.kind === "text" ? {} : extra);
        });
      }
      push(m[0], true, extra);
      last = i + m[0].length;
    }
    if (last < seg.text.length) {
      const parts = seg.text.slice(last).split(/\n\s*\n/);
      parts.forEach((p, idx) => {
        if (idx > 0) paragraph++;
        if (p) push(p, false, seg.kind === "text" ? {} : extra);
      });
    }
  }
  return tokens;
}

export function countTargets(segments: Segment[]): number {
  return segments.filter((s) => s.kind === "target").length;
}

export function countWords(text: string): number {
  return [...text.matchAll(WORD_RE)].length;
}

export function keywordKeys(segments: Segment[]): string[] {
  return [...new Set(segments.flatMap((s) => (s.kind === "keyword" ? [s.key] : [])))];
}

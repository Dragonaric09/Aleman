import Papa from "papaparse";
import {
  ARTICLES,
  GENDER_COLORS,
  WORD_TYPE_LABELS,
  displayLemma,
  type Gender,
  type WordType,
} from "@/modules/vocabulary/shared";

export interface AnkiWord {
  lemma: string;
  type: WordType;
  gender: Gender | null;
  pluralForm: string | null;
  noPlural: boolean;
  translationEs: string;
  exampleDe: string | null;
  exampleEs: string | null;
  perfekt: string | null;
  level: string;
  lessonNumber: number | null;
}

function escapeHtml(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

/** Reverso: HTML simple con artículo coloreado, plural y ejemplo. */
export function ankiBack(w: AnkiWord): string {
  const lemma = escapeHtml(displayLemma(w.lemma));
  const parts: string[] = [];
  if (w.type === "NOUN" && w.gender) {
    const color = GENDER_COLORS[w.gender];
    parts.push(`<b><span style="color:${color}">${ARTICLES[w.gender]}</span> ${lemma}</b>`);
    if (w.noPlural) parts.push(`<i>sin plural</i>`);
    else if (w.pluralForm)
      parts.push(`<span style="color:${GENDER_COLORS.PLURAL}">die ${escapeHtml(w.pluralForm)}</span>`);
  } else {
    parts.push(`<b>${lemma}</b>`);
    if (w.perfekt) parts.push(`<i>${escapeHtml(w.perfekt)}</i>`);
  }
  if (w.exampleDe) parts.push(`<br>${escapeHtml(w.exampleDe)}`);
  if (w.exampleEs) parts.push(`<span style="color:#6B7280">${escapeHtml(w.exampleEs)}</span>`);
  return parts.join("<br>");
}

function tag(s: string) {
  return s.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/\s+/g, "_");
}

/** CSV para Anki: Front (español); Back (HTML); Tags (nivel, lección y tipo). */
export function serializeAnkiCsv(words: AnkiWord[]): string {
  const rows = words.map((w) => [
    w.translationEs,
    ankiBack(w),
    [`nivel_${w.level}`, w.lessonNumber ? `leccion_${w.lessonNumber}` : null, tag(WORD_TYPE_LABELS[w.type])]
      .filter(Boolean)
      .join(" "),
  ]);
  const body = Papa.unparse(rows, { delimiter: ";", newline: "\n" });
  return (
    ["#separator:semicolon", "#html:true", "#columns:Front;Back;Tags", "#tags column:3", body].join("\n") +
    "\n"
  );
}

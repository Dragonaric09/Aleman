import Papa from "papaparse";
import { z } from "zod";
import { wordInputSchema, type WordInput, type WordInputRaw } from "@/modules/vocabulary";
import type { Auxiliary, Gender, GoetheLevel, Level, WordType } from "@/modules/vocabulary/shared";

/** Cabeceras exactas del formato CSV (sección 9.1). */
export const VOCAB_HEADERS = [
  "lemma",
  "type",
  "gender",
  "plural_suffix",
  "plural_form",
  "no_plural",
  "translation_es",
  "example_de",
  "example_es",
  "cloze_text",
  "level",
  "starred",
  "goethe_level",
  "frequency_rank",
  "lesson",
  "sources",
  "is_cognate",
  "is_false_friend",
  "false_friend_note",
  "separable_prefix",
  "third_person",
  "perfekt",
  "auxiliary",
  "is_irregular",
  "governs_case",
  "tags",
] as const;

export const LESSON_HEADERS = ["number", "title", "topic", "sort_order"] as const;

export interface RowError {
  row: number;
  field: string;
  message: string;
}

export interface ParsedVocabulary {
  rows: { row: number; word: WordInput }[];
  errors: RowError[];
}

const HEADER_TO_FIELD: Record<string, string> = {
  lemma: "lemma",
  type: "type",
  gender: "gender",
  plural_suffix: "pluralSuffix",
  plural_form: "pluralForm",
  no_plural: "noPlural",
  translation_es: "translationEs",
  example_de: "exampleDe",
  example_es: "exampleEs",
  cloze_text: "clozeText",
  level: "level",
  starred: "starred",
  goethe_level: "goetheLevel",
  frequency_rank: "frequencyRank",
  lesson: "lessonNumber",
  sources: "sources",
  is_cognate: "isCognate",
  is_false_friend: "isFalseFriend",
  false_friend_note: "falseFriendNote",
  separable_prefix: "separablePrefix",
  third_person: "thirdPerson",
  perfekt: "perfekt",
  auxiliary: "auxiliary",
  is_irregular: "isIrregular",
  governs_case: "governsCase",
  tags: "tags",
};
const FIELD_TO_HEADER = Object.fromEntries(Object.entries(HEADER_TO_FIELD).map(([h, f]) => [f, h]));

function stripBom(text: string) {
  return text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;
}

function parseTable(text: string): string[][] {
  const result = Papa.parse<string[]>(stripBom(text), { delimiter: ";", skipEmptyLines: "greedy" });
  return result.data;
}

const cellError = (row: number, header: string, message: string): RowError => ({ row, field: header, message });

/** Convierte una fila de texto en la entrada cruda del esquema; acumula errores de formato. */
function rowToRaw(cells: Record<string, string>, row: number, errors: RowError[]): WordInputRaw {
  const str = (h: string) => {
    const v = (cells[h] ?? "").trim();
    return v === "" ? null : v;
  };
  const bool = (h: string) => {
    const v = str(h);
    if (v == null || v === "0") return false;
    if (v === "1") return true;
    errors.push(cellError(row, h, "debe ser 1 o 0"));
    return false;
  };
  const int = (h: string) => {
    const v = str(h);
    if (v == null) return null;
    if (!/^\d+$/.test(v)) {
      errors.push(cellError(row, h, "debe ser un número entero"));
      return null;
    }
    return Number(v);
  };
  const list = (h: string) =>
    (str(h) ?? "")
      .split("|")
      .map((s) => s.trim())
      .filter(Boolean);
  const upper = (h: string) => str(h)?.toUpperCase() ?? null;

  return {
    lemma: str("lemma") ?? "",
    type: (upper("type") ?? "") as WordType,
    gender: upper("gender") as Gender | null,
    pluralSuffix: str("plural_suffix"),
    pluralForm: str("plural_form"),
    noPlural: bool("no_plural"),
    translationEs: str("translation_es") ?? "",
    exampleDe: str("example_de"),
    exampleEs: str("example_es"),
    clozeText: str("cloze_text"),
    level: (upper("level") ?? "") as Level,
    starred: bool("starred"),
    goetheLevel: upper("goethe_level") as GoetheLevel | null,
    frequencyRank: int("frequency_rank"),
    lessonNumber: int("lesson"),
    sources: list("sources"),
    isCognate: bool("is_cognate"),
    isFalseFriend: bool("is_false_friend"),
    falseFriendNote: str("false_friend_note"),
    separablePrefix: str("separable_prefix"),
    thirdPerson: str("third_person"),
    perfekt: str("perfekt"),
    auxiliary: upper("auxiliary") as Auxiliary | null,
    isIrregular: bool("is_irregular"),
    governsCase: str("governs_case"),
    tags: list("tags"),
  };
}

/** Lee y valida un CSV de vocabulario. Nunca lanza: devuelve filas válidas y errores por fila y campo. */
export function parseVocabularyCsv(text: string): ParsedVocabulary {
  const table = parseTable(text);
  const errors: RowError[] = [];
  const rows: ParsedVocabulary["rows"] = [];
  const [header, ...data] = table;
  if (!header) return { rows, errors: [cellError(1, "cabecera", "el archivo está vacío")] };

  const normalizedHeader = header.map((h) => h.trim());
  const missing = VOCAB_HEADERS.filter((h) => !normalizedHeader.includes(h));
  const unknown = normalizedHeader.filter((h) => !(VOCAB_HEADERS as readonly string[]).includes(h));
  if (missing.length || unknown.length) {
    const parts = [];
    if (missing.length) parts.push(`faltan columnas: ${missing.join(", ")}`);
    if (unknown.length) parts.push(`columnas desconocidas: ${unknown.join(", ")}`);
    return { rows, errors: [cellError(1, "cabecera", parts.join("; "))] };
  }

  const seen = new Map<string, number>();
  data.forEach((cells, i) => {
    const rowNumber = i + 2;
    if (cells.length !== normalizedHeader.length) {
      errors.push(
        cellError(rowNumber, "fila", `tiene ${cells.length} columnas y se esperaban ${normalizedHeader.length}`),
      );
      return;
    }
    const record = Object.fromEntries(normalizedHeader.map((h, idx) => [h, cells[idx] ?? ""]));
    const rowErrors: RowError[] = [];
    const raw = rowToRaw(record, rowNumber, rowErrors);
    const parsed = wordInputSchema.safeParse(raw);
    if (!parsed.success) {
      for (const issue of parsed.error.issues) {
        const field = String(issue.path[0] ?? "fila");
        rowErrors.push(cellError(rowNumber, FIELD_TO_HEADER[field] ?? field, issue.message));
      }
    }
    if (rowErrors.length || !parsed.success) {
      errors.push(...rowErrors);
      return;
    }
    const key = `${parsed.data.lemma}\u0000${parsed.data.type}`;
    const prev = seen.get(key);
    if (prev) {
      errors.push(cellError(rowNumber, "lemma", `duplicado de la fila ${prev} (mismo lema y tipo)`));
      return;
    }
    seen.set(key, rowNumber);
    rows.push({ row: rowNumber, word: parsed.data });
  });

  return { rows, errors };
}

/** Palabra tal como se exporta (mismos campos que WordInput). */
export type ExportableWord = WordInput;

function csvBool(b: boolean) {
  return b ? "1" : "0";
}

/** Serializa palabras al formato CSV 9.1 (UTF-8 sin BOM, separador ;). */
export function serializeVocabularyCsv(words: ExportableWord[]): string {
  const rows = words.map((w) => [
    w.lemma,
    w.type.toLowerCase(),
    w.gender?.toLowerCase() ?? "",
    w.pluralSuffix ?? "",
    w.pluralForm ?? "",
    csvBool(w.noPlural),
    w.translationEs,
    w.exampleDe ?? "",
    w.exampleEs ?? "",
    w.clozeText ?? "",
    w.level,
    csvBool(w.starred),
    w.goetheLevel ?? "",
    w.frequencyRank?.toString() ?? "",
    w.lessonNumber?.toString() ?? "",
    w.sources.join("|"),
    csvBool(w.isCognate),
    csvBool(w.isFalseFriend),
    w.falseFriendNote ?? "",
    w.separablePrefix ?? "",
    w.thirdPerson ?? "",
    w.perfekt ?? "",
    w.auxiliary?.toLowerCase() ?? "",
    csvBool(w.isIrregular),
    w.governsCase ?? "",
    w.tags.join("|"),
  ]);
  return Papa.unparse({ fields: [...VOCAB_HEADERS], data: rows }, { delimiter: ";", newline: "\n" }) + "\n";
}

export const lessonRowSchema = z.object({
  number: z.coerce.number().int().positive("debe ser un entero positivo"),
  title: z.string().trim().min(1, "es obligatorio"),
  topic: z
    .string()
    .trim()
    .transform((v) => (v === "" ? null : v)),
  sortOrder: z.coerce.number().int("debe ser un entero"),
});
export type LessonRow = z.output<typeof lessonRowSchema>;

/** Lee data/lecciones.csv (number;title;topic;sort_order). */
export function parseLessonsCsv(text: string): { rows: LessonRow[]; errors: RowError[] } {
  const [header, ...data] = parseTable(text);
  const errors: RowError[] = [];
  const rows: LessonRow[] = [];
  if (!header || header.map((h) => h.trim()).join(";") !== LESSON_HEADERS.join(";")) {
    return { rows, errors: [cellError(1, "cabecera", `se esperaba: ${LESSON_HEADERS.join(";")}`)] };
  }
  data.forEach((cells, i) => {
    const parsed = lessonRowSchema.safeParse({
      number: cells[0],
      title: cells[1] ?? "",
      topic: cells[2] ?? "",
      sortOrder: cells[3],
    });
    if (!parsed.success) {
      for (const issue of parsed.error.issues) errors.push(cellError(i + 2, String(issue.path[0]), issue.message));
    } else rows.push(parsed.data);
  });
  return { rows, errors };
}

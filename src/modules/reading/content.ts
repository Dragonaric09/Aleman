import { parse as parseYaml } from "yaml";
import { z } from "zod";
import { clozeGaps } from "@/modules/vocabulary";
import { countTargets, countWords, keywordKeys, parseStoryBody, plainText } from "./body";

export const STORY_PHASES = ["DISCOVER", "PRACTICE", "CONTRAST", "APPLY"] as const;
export type StoryPhase = (typeof STORY_PHASES)[number];

const text = z.string().trim().min(1, "es obligatorio");

export const exercisesSchema = z.object({
  find: z.object({ prompt: text }).optional(),
  truefalse: z
    .array(z.object({ statement: text, answer: z.boolean(), explanation: z.string().trim().optional() }))
    .default([]),
  cloze: z
    .array(
      z.object({
        text: text.refine(
          (t) => clozeGaps(t).length === 1,
          "el hueco debe marcarse con exactamente un {{…}}",
        ),
        es: z.string().trim().optional(),
      }),
    )
    .default([]),
  order: z.array(z.object({ sentence: text, es: z.string().trim().optional() })).default([]),
  write: z.object({ prompt: text, model: text }).optional(),
});
export type StoryExercises = z.output<typeof exercisesSchema>;

export const storyFrontmatterSchema = z.object({
  id: z.string().regex(/^G\d+-\d{2}$/, "el id debe tener la forma G1-01"),
  topic: z.string().regex(/^G\d+$/, "el tema debe tener la forma G1"),
  phase: z.enum(STORY_PHASES, { message: "fase inválida (DISCOVER, PRACTICE, CONTRAST, APPLY)" }),
  order: z.number().int().positive(),
  title: text,
  titleEs: text,
  highlight: z.boolean().default(true),
  reviewed: z.boolean().default(false),
  exercises: exercisesSchema,
});

export interface ParsedStory {
  id: string;
  topicId: string;
  phase: StoryPhase;
  sortOrder: number;
  title: string;
  titleEs: string;
  highlight: boolean;
  reviewed: boolean;
  body: string;
  keywords: string[];
  wordCount: number;
  targetCount: number;
  exercises: StoryExercises;
}

const FRONTMATTER = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/;

export class ContentError extends Error {
  constructor(
    public file: string,
    message: string,
  ) {
    super(`${file}: ${message}`);
  }
}

/** Lee un archivo de historia (frontmatter YAML + texto con marcado). No hace E/S. */
export function parseStoryFile(source: string, file = "historia"): ParsedStory {
  const m = FRONTMATTER.exec(source.replace(/^﻿/, ""));
  if (!m) throw new ContentError(file, "falta el bloque de frontmatter --- … ---");
  let data: unknown;
  try {
    data = parseYaml(m[1]!);
  } catch (err) {
    throw new ContentError(file, `YAML inválido: ${(err as Error).message}`);
  }
  const parsed = storyFrontmatterSchema.safeParse(data);
  if (!parsed.success) {
    const i = parsed.error.issues[0]!;
    throw new ContentError(file, `${i.path.join(".") || "frontmatter"}: ${i.message}`);
  }
  const body = m[2]!.trim();
  if (!body) throw new ContentError(file, "la historia no tiene texto");
  const segments = parseStoryBody(body);
  const f = parsed.data;
  return {
    id: f.id,
    topicId: f.topic,
    phase: f.phase,
    sortOrder: f.order,
    title: f.title,
    titleEs: f.titleEs,
    highlight: f.highlight,
    reviewed: f.reviewed,
    body,
    keywords: keywordKeys(segments),
    wordCount: countWords(plainText(body)),
    targetCount: countTargets(segments),
    exercises: f.exercises,
  };
}

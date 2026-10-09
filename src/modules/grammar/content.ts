import { parse as parseYaml } from "yaml";
import { z } from "zod";

const text = z.string().trim().min(1, "es obligatorio");

export const topicContentSchema = z.object({
  rule: text,
  rulePoints: z.array(text).default([]),
  table: z
    .object({
      caption: text,
      headers: z.array(text).min(2),
      rows: z.array(
        z.object({
          gender: z.enum(["DER", "DIE", "DAS", "PLURAL"]).optional(),
          cells: z.array(z.string()),
        }),
      ),
    })
    .optional(),
  notes: z.array(text).default([]),
  diagram: z.enum(["prepositions"]).optional(),
  traps: z.array(z.object({ wrong: text, right: text, note: text })).default([]),
  mnemonics: z.array(text).default([]),
  examples: z.array(z.object({ de: text, es: text, story: z.string().optional() })).default([]),
  exercises: z
    .array(
      z.discriminatedUnion("type", [
        z.object({
          type: z.literal("choice"),
          prompt: text,
          options: z.array(text).min(2),
          answer: z.number().int().nonnegative(),
          explanation: z.string().trim().optional(),
        }),
        z.object({ type: z.literal("cloze"), text, es: z.string().trim().optional() }),
      ]),
    )
    .default([]),
});
export type TopicContent = z.output<typeof topicContentSchema>;

export const topicFileSchema = z
  .object({
    id: z.string().regex(/^G\d+$/, "el id debe tener la forma G1"),
    slug: z.string().regex(/^[a-z0-9-]+$/, "slug en minúsculas con guiones"),
    title: text,
    titleDe: z.string().trim().optional(),
    summary: text,
    lessons: z.array(z.number().int().positive()).default([]),
    prerequisites: z.array(z.string()).default([]),
    order: z.number().int().positive(),
    status: z.enum(["available", "planned"]),
    plannedStories: z.number().int().nonnegative().default(0),
    minTargets: z.number().int().positive().default(6),
    targetLabel: z.string().trim().default("forma meta"),
    findPrompt: z.string().trim().optional(),
    content: topicContentSchema.optional(),
  })
  .superRefine((t, ctx) => {
    if (t.status === "available" && !t.content) {
      ctx.addIssue({ code: "custom", path: ["content"], message: "un tema disponible necesita contenido" });
    }
    if (t.content) {
      t.content.exercises.forEach((e, i) => {
        if (e.type === "choice" && e.answer >= e.options.length) {
          ctx.addIssue({
            code: "custom",
            path: ["content", "exercises", i],
            message: "la respuesta no está entre las opciones",
          });
        }
      });
    }
  });
export type TopicFile = z.output<typeof topicFileSchema>;

/** Lee un archivo YAML de tema gramatical. No hace E/S. */
export function parseTopicFile(source: string, file = "tema"): TopicFile {
  let data: unknown;
  try {
    data = parseYaml(source.replace(/^﻿/, ""));
  } catch (err) {
    throw new Error(`${file}: YAML inválido: ${(err as Error).message}`);
  }
  const parsed = topicFileSchema.safeParse(data);
  if (!parsed.success) {
    const i = parsed.error.issues[0]!;
    throw new Error(`${file}: ${i.path.join(".") || "tema"}: ${i.message}`);
  }
  return parsed.data;
}

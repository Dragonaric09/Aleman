import { z } from "zod";
import { getSettings } from "@/modules/settings";
import { studyDay } from "@/modules/study";
import { prisma } from "@/server/db";
import { AppError, notFound } from "@/server/http";
import { exercisesSchema, type StoryExercises } from "./content";
import { keyForLemma } from "./keys";
import { topicProgress, type TopicProgress } from "./progress";
import { scoreAttempt } from "./scoring";
import type { KeywordInfo, StoryListItem, StoryView, TopicStories } from "./types";

const storyMeta = {
  id: true,
  topicId: true,
  phase: true,
  sortOrder: true,
  title: true,
  titleEs: true,
  wordCount: true,
  keywords: true,
} as const;

async function attemptsFor(userId: string, storyIds: string[]) {
  return prisma.storyAttempt.findMany({
    where: { userId, storyId: { in: storyIds } },
    select: { storyId: true, comprehensionScore: true, productionScore: true, isProbe: true, studyDay: true },
    orderBy: { createdAt: "asc" },
  });
}

/** Lemas del catálogo global (y del usuario) que el usuario ya introdujo en sus tarjetas. */
async function introducedLemmas(userId: string, lemmas: string[]) {
  if (!lemmas.length) return new Set<string>();
  const words = await prisma.word.findMany({
    where: {
      lemma: { in: lemmas },
      scope: { in: ["global", userId] },
      cards: { some: { userId, introducedAt: { not: null } } },
    },
    select: { lemma: true },
  });
  return new Set(words.map((w) => w.lemma));
}

/** Progreso de todos los temas (para Gramática y el panel). */
export async function progressByTopic(userId: string): Promise<Record<string, TopicProgress>> {
  const stories = await prisma.story.findMany({
    select: { id: true, topicId: true, phase: true, sortOrder: true },
  });
  const attempts = await attemptsFor(
    userId,
    stories.map((s) => s.id),
  );
  const out: Record<string, TopicProgress> = {};
  const topicIds = [...new Set(stories.map((s) => s.topicId))];
  for (const t of topicIds) {
    const ts = stories.filter((s) => s.topicId === t);
    const ids = new Set(ts.map((s) => s.id));
    out[t] = topicProgress(
      ts,
      attempts.filter((a) => ids.has(a.storyId)),
    );
  }
  return out;
}

/** Historias agrupadas por tema, con desbloqueo, mejor puntuación y palabras clave ya conocidas. */
export async function listStories(userId: string): Promise<TopicStories[]> {
  const topics = await prisma.grammarTopic.findMany({
    orderBy: { sortOrder: "asc" },
    include: { stories: { select: storyMeta, orderBy: { sortOrder: "asc" } } },
  });
  const allStories = topics.flatMap((t) => t.stories);
  const [attempts, known] = await Promise.all([
    attemptsFor(
      userId,
      allStories.map((s) => s.id),
    ),
    introducedLemmas(userId, [...new Set(allStories.flatMap((s) => s.keywords))]),
  ]);
  return topics.map((t) => {
    const ids = new Set(t.stories.map((s) => s.id));
    const progress = topicProgress(
      t.stories,
      attempts.filter((a) => ids.has(a.storyId)),
    );
    const stories: StoryListItem[] = t.stories.map((s) => ({
      id: s.id,
      phase: s.phase,
      sortOrder: s.sortOrder,
      title: s.title,
      titleEs: s.titleEs,
      wordCount: s.wordCount,
      keywords: s.keywords.length,
      knownKeywords: s.keywords.filter((k) => known.has(k)).length,
      unlocked: t.status === "AVAILABLE" && progress.unlocked.includes(s.id),
      read: progress.best[s.id] !== undefined,
      best: progress.best[s.id] ?? null,
    }));
    return {
      topic: {
        id: t.id,
        slug: t.slug,
        title: t.title,
        summary: t.summary,
        status: t.status,
        lessonNumbers: t.lessonNumbers,
      },
      progress,
      stories,
    };
  });
}

/** Próxima historia recomendada (primera desbloqueada y no leída). */
export async function nextStory(userId: string) {
  const groups = await listStories(userId);
  for (const g of groups) {
    if (g.topic.status !== "AVAILABLE") continue;
    const s = g.stories.find((x) => x.id === g.progress.nextStoryId);
    if (s) return { ...s, topic: g.topic };
  }
  return null;
}

async function loadStoryForUser(userId: string, storyId: string) {
  const story = await prisma.story.findUnique({ where: { id: storyId }, include: { topic: true } });
  if (!story) throw notFound("Historia no encontrada");
  if (story.topic.status !== "AVAILABLE")
    throw new AppError(403, "PLANNED", "Este tema todavía está en preparación");
  const siblings = await prisma.story.findMany({
    where: { topicId: story.topicId },
    select: { id: true, phase: true, sortOrder: true },
  });
  const attempts = await attemptsFor(
    userId,
    siblings.map((s) => s.id),
  );
  const progress = topicProgress(siblings, attempts);
  if (!progress.unlocked.includes(story.id)) {
    throw new AppError(403, "LOCKED", "Lee primero la historia anterior de este tema");
  }
  return { story, progress, attempts };
}

/** Historia lista para el lector, con los datos de sus palabras clave. */
export async function getStory(userId: string, storyId: string): Promise<StoryView> {
  const { story, progress } = await loadStoryForUser(userId, storyId);
  const words = await prisma.word.findMany({
    where: { scope: "global", lemma: { in: story.keywords } },
    select: { id: true, lemma: true, type: true, gender: true, translationEs: true, pluralForm: true },
  });
  const known = await introducedLemmas(userId, story.keywords);
  const keywords: Record<string, KeywordInfo> = {};
  for (const w of words) {
    keywords[keyForLemma(w.lemma)] = {
      wordId: w.id,
      lemma: w.lemma,
      type: w.type,
      gender: w.gender,
      translationEs: w.translationEs,
      pluralForm: w.pluralForm,
      known: known.has(w.lemma),
    };
  }
  const ordered = await prisma.story.findMany({
    where: { topicId: story.topicId },
    select: { id: true, sortOrder: true },
    orderBy: { sortOrder: "asc" },
  });
  const pos = ordered.findIndex((s) => s.id === story.id);
  return {
    id: story.id,
    topic: {
      id: story.topic.id,
      slug: story.topic.slug,
      title: story.topic.title,
      targetLabel: targetLabelOf(story.topic.content),
    },
    phase: story.phase,
    sortOrder: story.sortOrder,
    totalInTopic: ordered.length,
    title: story.title,
    titleEs: story.titleEs,
    body: story.body,
    highlight: story.highlight,
    reviewed: story.reviewed,
    wordCount: story.wordCount,
    exercises: exercisesSchema.parse(story.exercises),
    keywords,
    previousId: ordered[pos - 1]?.id ?? null,
    nextId: ordered[pos + 1]?.id ?? null,
    read: progress.best[story.id] !== undefined,
  };
}

function targetLabelOf(content: unknown) {
  const label = (content as { targetLabel?: unknown } | null)?.targetLabel;
  return typeof label === "string" ? label : "forma meta";
}

export const attemptInputSchema = z.object({
  storyId: z.string().regex(/^G\d+-\d{2}$/),
  answers: z.object({
    tapped: z.array(z.number().int().nonnegative()).max(500).optional(),
    truefalse: z.array(z.boolean().nullable()).max(20),
    cloze: z.array(z.string().max(200)).max(20),
    order: z.array(z.string().max(500)).max(20),
  }),
});

/** Registra un intento. Nunca modifica tarjetas ni repasos (no afecta FSRS). */
export async function submitAttempt(userId: string, raw: unknown, now: Date) {
  const input = attemptInputSchema.parse(raw);
  const { story, attempts } = await loadStoryForUser(userId, input.storyId);
  const settings = await getSettings(userId);
  const exercises: StoryExercises = exercisesSchema.parse(story.exercises);
  const score = scoreAttempt({ body: story.body, exercises }, input.answers, {
    strictCapitalization: settings.strictCapitalization,
  });
  const isProbe = !attempts.some((a) => a.storyId === story.id);
  await prisma.storyAttempt.create({
    data: {
      userId,
      storyId: story.id,
      comprehensionScore: score.comprehension,
      productionScore: score.production,
      isProbe,
      studyDay: studyDay(now, settings.timezone, settings.dayStartsAtHour),
    },
  });
  const progress = (await progressByTopic(userId))[story.topicId]!;
  return { score, isProbe, progress };
}

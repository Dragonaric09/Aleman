import { progressByTopic, type TopicProgress } from "@/modules/reading";
import { prisma } from "@/server/db";
import { notFound } from "@/server/http";
import { topicContentSchema, type TopicContent } from "./content";

export interface TopicCard {
  id: string;
  slug: string;
  title: string;
  titleDe: string | null;
  summary: string;
  lessonNumbers: number[];
  prerequisites: string[];
  status: "AVAILABLE" | "PLANNED";
  plannedStories: number;
  storyCount: number;
  progress: TopicProgress | null;
}

function meta(content: unknown) {
  const c = (content ?? {}) as { titleDe?: unknown };
  return { titleDe: typeof c.titleDe === "string" ? c.titleDe : null };
}

/** Mapa de temas con el progreso del usuario. */
export async function listTopics(userId: string): Promise<TopicCard[]> {
  const [topics, progress] = await Promise.all([
    prisma.grammarTopic.findMany({
      orderBy: { sortOrder: "asc" },
      include: { _count: { select: { stories: true } } },
    }),
    progressByTopic(userId),
  ]);
  return topics.map((t) => ({
    id: t.id,
    slug: t.slug,
    title: t.title,
    titleDe: meta(t.content).titleDe,
    summary: t.summary,
    lessonNumbers: t.lessonNumbers,
    prerequisites: t.prerequisites,
    status: t.status,
    plannedStories: t.plannedStories,
    storyCount: t._count.stories,
    progress: progress[t.id] ?? null,
  }));
}

export interface TopicPage extends TopicCard {
  content: TopicContent | null;
  stories: { id: string; title: string; titleEs: string; phase: string; sortOrder: number }[];
}

export async function getTopic(userId: string, slug: string): Promise<TopicPage> {
  const topic = await prisma.grammarTopic.findUnique({
    where: { slug },
    include: {
      stories: {
        select: { id: true, title: true, titleEs: true, phase: true, sortOrder: true },
        orderBy: { sortOrder: "asc" },
      },
    },
  });
  if (!topic) throw notFound("Tema no encontrado");
  const progress = (await progressByTopic(userId))[topic.id] ?? null;
  const parsed = topicContentSchema.safeParse(topic.content);
  return {
    id: topic.id,
    slug: topic.slug,
    title: topic.title,
    titleDe: meta(topic.content).titleDe,
    summary: topic.summary,
    lessonNumbers: topic.lessonNumbers,
    prerequisites: topic.prerequisites,
    status: topic.status,
    plannedStories: topic.plannedStories,
    storyCount: topic.stories.length,
    progress,
    content: topic.status === "AVAILABLE" && parsed.success ? parsed.data : null,
    stories: topic.stories,
  };
}

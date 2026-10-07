import type { Prisma } from "@prisma/client";
import { z } from "zod";
import { getSettings, type Settings } from "@/modules/settings";
import { applyLeechRules, createScheduler, type CardSnapshot } from "@/modules/srs";
import {
  RATINGS,
  cardPlan,
  compareForIntroduction,
  syncCards,
  visibleTo,
  type CardKind,
  type CardState,
  type Rating,
} from "@/modules/vocabulary";
import { prisma, type Tx } from "@/server/db";
import { AppError, notFound } from "@/server/http";
import { checkAnswer } from "./answer-check";
import { buildPrompt, isProductionKind } from "./card-content";
import { LEARNING_LOOKAHEAD_MS, buildQueue, isEligibleNew } from "./queue";
import { dayBounds, studyDay } from "./study-day";
import type { QueueItem, QueueWord, ReviewResult, StudySummary } from "./types";

export const MAX_DURATION_MS = 120_000;
export const MAX_UNDO_CHAIN = 10;

const cardInclude = {
  word: {
    include: { lesson: { select: { number: true, title: true, sortOrder: true } } },
  },
} as const;
type CardRow = Prisma.CardGetPayload<{ include: typeof cardInclude }>;

function schedulerFor(s: Settings) {
  return createScheduler({
    desiredRetention: s.desiredRetention,
    maximumIntervalDays: s.maximumIntervalDays,
    enableFuzz: true,
  });
}

export function snapshotOf(c: {
  state: CardState;
  due: Date;
  stability: number;
  difficulty: number;
  elapsedDays: number;
  scheduledDays: number;
  learningSteps: number;
  reps: number;
  lapses: number;
  lastReview: Date | null;
}): CardSnapshot {
  return {
    state: c.state,
    due: c.due,
    stability: c.stability,
    difficulty: c.difficulty,
    elapsedDays: c.elapsedDays,
    scheduledDays: c.scheduledDays,
    learningSteps: c.learningSteps,
    reps: c.reps,
    lapses: c.lapses,
    lastReview: c.lastReview,
  };
}

function toQueueWord(w: CardRow["word"]): QueueWord {
  return {
    id: w.id,
    lemma: w.lemma,
    type: w.type,
    gender: w.gender,
    pluralForm: w.pluralForm,
    pluralSuffix: w.pluralSuffix,
    noPlural: w.noPlural,
    translationEs: w.translationEs,
    exampleDe: w.exampleDe,
    exampleEs: w.exampleEs,
    clozeText: w.clozeText,
    separablePrefix: w.separablePrefix,
    thirdPerson: w.thirdPerson,
    perfekt: w.perfekt,
    auxiliary: w.auxiliary,
    isFalseFriend: w.isFalseFriend,
    falseFriendNote: w.falseFriendNote,
    governsCase: w.governsCase,
    level: w.level,
    scope: w.scope,
    lessonNumber: w.lesson?.number ?? null,
    lessonTitle: w.lesson?.title ?? null,
  };
}

interface DayContext {
  now: Date;
  settings: Settings;
  day: string;
  start: Date;
  end: Date;
}

async function dayContext(userId: string, now: Date, tx: Tx = prisma): Promise<DayContext> {
  const settings = await getSettings(userId, tx);
  const day = studyDay(now, settings.timezone, settings.dayStartsAtHour);
  const { start, end } = dayBounds(day, settings.timezone, settings.dayStartsAtHour);
  return { now, settings, day, start, end };
}

/** Reúne las entradas de buildQueue para el día de estudio actual. */
async function gatherQueue(userId: string, ctx: DayContext) {
  await syncCards(userId);
  const enabled = ctx.settings.enabledCardKinds;
  const [cards, logsToday] = await Promise.all([
    prisma.card.findMany({
      where: { userId, kind: { in: enabled }, word: visibleTo(userId) },
      include: cardInclude,
    }),
    prisma.reviewLog.findMany({
      where: { userId, studyDay: ctx.day },
      select: { cardId: true, isNewCard: true, stateBefore: true, card: { select: { wordId: true } } },
    }),
  ]);

  // Estado de la tarjeta principal de cada palabra.
  const primaryKind = new Map<string, CardKind | null>();
  const primaryState = new Map<string, CardState>();
  for (const c of cards) {
    if (!primaryKind.has(c.wordId)) primaryKind.set(c.wordId, cardPlan(c.word, enabled).primary);
    if (primaryKind.get(c.wordId) === c.kind) primaryState.set(c.wordId, c.state);
  }

  const lookahead = ctx.now.getTime() + LEARNING_LOOKAHEAD_MS;
  const active = cards.filter((c) => !c.suspended);
  const learningAll = active.filter((c) => c.state === "LEARNING" || c.state === "RELEARNING");
  const learningDue = learningAll.filter((c) => c.due.getTime() <= lookahead);
  const reviewDue = active.filter((c) => c.state === "REVIEW" && c.due.getTime() < ctx.end.getTime());
  const kindOrder = (k: CardKind) => enabled.indexOf(k);
  const newCandidates = cards
    .filter((c) => isEligibleNew(c, primaryKind.get(c.wordId) ?? null, primaryState.get(c.wordId) ?? null))
    .sort((a, b) => {
      const byWord = compareForIntroduction(
        {
          id: a.wordId,
          priority: a.word.priority,
          lessonSortOrder: a.word.lesson?.sortOrder ?? null,
          createdAt: a.word.createdAt,
        },
        {
          id: b.wordId,
          priority: b.word.priority,
          lessonSortOrder: b.word.lesson?.sortOrder ?? null,
          createdAt: b.word.createdAt,
        },
      );
      return byWord !== 0 ? byWord : kindOrder(a.kind) - kindOrder(b.kind);
    });

  const wordsSeenToday = new Set(logsToday.map((l) => l.card.wordId));
  const cardsSeenToday = new Set(logsToday.map((l) => l.cardId));
  const reviewsDoneToday = logsToday.filter((l) => l.stateBefore === "REVIEW").length;
  const newIntroducedToday = logsToday.filter((l) => l.isNewCard).length;

  const queue = buildQueue({
    now: ctx.now,
    settings: ctx.settings,
    dayStart: ctx.start,
    dayEnd: ctx.end,
    learningDue,
    reviewDue,
    newCandidates,
    reviewsDoneToday,
    newIntroducedToday,
    wordsSeenToday,
    cardsSeenToday,
  });
  const laterLearning = learningAll
    .filter((c) => c.due.getTime() > lookahead && c.due.getTime() < ctx.end.getTime())
    .sort((a, b) => a.due.getTime() - b.due.getTime());

  return { queue, learningAll, reviewsDoneToday, newIntroducedToday, laterLearning };
}

export async function getSummary(userId: string, now: Date): Promise<StudySummary> {
  const ctx = await dayContext(userId, now);
  const g = await gatherQueue(userId, ctx);
  return {
    newAvailable: g.queue.filter((c) => c.state === "NEW").length,
    reviewsDue: g.queue.filter((c) => c.state === "REVIEW").length,
    learning: g.learningAll.length,
    studyDay: ctx.day,
    reviewsDoneToday: g.reviewsDoneToday,
    newIntroducedToday: g.newIntroducedToday,
    nextLearningDue: g.queue.length === 0 ? (g.laterLearning[0]?.due.toISOString() ?? null) : null,
  };
}

async function notesFor(userId: string, wordIds: string[]) {
  const notes = await prisma.wordNote.findMany({
    where: { userId, wordId: { in: wordIds } },
    select: { wordId: true, mnemonic: true, ownSentence: true },
  });
  return new Map(notes.map((n) => [n.wordId, { mnemonic: n.mnemonic, ownSentence: n.ownSentence }]));
}

function toQueueItems(
  cards: CardRow[],
  settings: Settings,
  now: Date,
  notes: Map<string, QueueItem["note"]>,
) {
  const scheduler = schedulerFor(settings);
  return cards.map((c): QueueItem => {
    const preview = scheduler.preview(snapshotOf(c), now);
    const word = toQueueWord(c.word);
    return {
      card: {
        id: c.id,
        kind: c.kind,
        state: c.state,
        due: c.due.toISOString(),
        reps: c.reps,
        lapses: c.lapses,
        isLeech: c.isLeech,
      },
      word,
      note: notes.get(c.wordId) ?? null,
      prompt: buildPrompt(c.kind, word, c.id),
      preview: Object.fromEntries(
        RATINGS.map((r) => [r, { due: preview[r].due.toISOString(), label: preview[r].label }]),
      ) as QueueItem["preview"],
    };
  });
}

export async function getQueue(userId: string, now: Date, limit = 20): Promise<QueueItem[]> {
  const ctx = await dayContext(userId, now);
  const { queue } = await gatherQueue(userId, ctx);
  const slice = queue.slice(0, Math.min(Math.max(limit, 1), 50));
  const notes = await notesFor(userId, [...new Set(slice.map((c) => c.wordId))]);
  return toQueueItems(slice, ctx.settings, now, notes);
}

// ───────────────────────────── Registrar un repaso ─────────────────────────────

export const reviewInputSchema = z.object({
  cardId: z.string().min(1).max(50),
  rating: z.enum(RATINGS),
  typedAnswer: z.string().max(500).nullish(),
  durationMs: z.number().int().min(0).max(86_400_000),
  wantNext: z.boolean().optional(),
});

const undoChains = new Map<string, number>();

function serializeSnapshot(c: CardRow) {
  return {
    ...snapshotOf(c),
    due: c.due.toISOString(),
    lastReview: c.lastReview?.toISOString() ?? null,
    introducedAt: c.introducedAt?.toISOString() ?? null,
    suspended: c.suspended,
    isLeech: c.isLeech,
  };
}

/** Registra un repaso en una transacción (sección 7.7). */
export async function submitReview(userId: string, raw: unknown, now: Date): Promise<ReviewResult> {
  const input = reviewInputSchema.parse(raw);
  const result = await prisma.$transaction(async (tx) => {
    const card = await tx.card.findFirst({ where: { id: input.cardId, userId }, include: cardInclude });
    if (!card) throw notFound("Tarjeta no encontrada");
    if (card.suspended) throw new AppError(409, "SUSPENDED", "La tarjeta está suspendida");
    const ctx = await dayContext(userId, now, tx);

    const typed = input.typedAnswer?.trim() ?? "";
    let verdict: ReviewResult["verdict"];
    if (typed) {
      verdict = checkAnswer(card.kind, toQueueWord(card.word), typed, {
        strictCapitalization: ctx.settings.strictCapitalization,
      }).verdict;
    } else if (isProductionKind(card.kind)) {
      throw new AppError(422, "ANSWER_REQUIRED", "Escribe tu respuesta antes de verla");
    } else {
      verdict = "SELF_GRADED";
    }

    const next = schedulerFor(ctx.settings).review(snapshotOf(card), input.rating, now);
    const leech = applyLeechRules({
      stateBefore: card.state,
      rating: input.rating,
      lapsesAfter: next.lapses,
      wasLeech: card.isLeech,
      wasSuspended: card.suspended,
      threshold: ctx.settings.leechThreshold,
      autoSuspend: ctx.settings.leechAutoSuspend,
    });

    const updated = await tx.card.update({
      where: { id: card.id },
      data: {
        state: next.state,
        due: next.due,
        stability: next.stability,
        difficulty: next.difficulty,
        elapsedDays: next.elapsedDays,
        scheduledDays: next.scheduledDays,
        learningSteps: next.learningSteps,
        reps: next.reps,
        lapses: next.lapses,
        lastReview: next.lastReview,
        introducedAt: card.introducedAt ?? (card.state === "NEW" ? now : null),
        isLeech: leech.isLeech,
        suspended: leech.suspended,
      },
    });

    await tx.reviewLog.create({
      data: {
        userId,
        cardId: card.id,
        rating: input.rating as Rating,
        verdict,
        typedAnswer: typed || null,
        durationMs: Math.min(input.durationMs, MAX_DURATION_MS),
        stateBefore: card.state,
        cardBefore: serializeSnapshot(card),
        scheduledDays: next.scheduledDays,
        reviewedAt: now,
        studyDay: ctx.day,
        isNewCard: card.state === "NEW",
      },
    });

    // «Mi frase»: se invita tras el tercer repaso correcto de la palabra.
    let inviteOwnSentence = false;
    if (input.rating === "GOOD" || input.rating === "EASY") {
      const correct = await tx.reviewLog.count({
        where: { userId, card: { wordId: card.wordId }, rating: { in: ["GOOD", "EASY"] } },
      });
      if (correct === 3) {
        const note = await tx.wordNote.findUnique({
          where: { userId_wordId: { userId, wordId: card.wordId } },
        });
        inviteOwnSentence = !note?.ownSentence;
      }
    }

    return {
      verdict,
      card: {
        id: updated.id,
        state: updated.state,
        due: updated.due.toISOString(),
        reps: updated.reps,
        lapses: updated.lapses,
        isLeech: updated.isLeech,
        suspended: updated.suspended,
      },
      isLeech: updated.isLeech,
      becameLeech: leech.becameLeech,
      inviteOwnSentence,
    } satisfies ReviewResult;
  });

  undoChains.set(userId, 0);
  if (input.wantNext) return { ...result, next: await getQueue(userId, now, 20) };
  return result;
}

const snapshotSchema = z.object({
  state: z.enum(["NEW", "LEARNING", "REVIEW", "RELEARNING"]),
  due: z.string(),
  stability: z.number(),
  difficulty: z.number(),
  elapsedDays: z.number(),
  scheduledDays: z.number(),
  learningSteps: z.number(),
  reps: z.number(),
  lapses: z.number(),
  lastReview: z.string().nullable(),
  introducedAt: z.string().nullable(),
  suspended: z.boolean(),
  isLeech: z.boolean(),
});

/** Deshacer: revierte el último repaso del día de estudio actual (sección 7.8). */
export async function undoLastReview(userId: string, now: Date) {
  const chain = undoChains.get(userId) ?? 0;
  if (chain >= MAX_UNDO_CHAIN) {
    throw new AppError(409, "UNDO_LIMIT", `Solo puedes deshacer hasta ${MAX_UNDO_CHAIN} repasos seguidos`);
  }
  const ctx = await dayContext(userId, now);
  const restoredCardId = await prisma.$transaction(async (tx) => {
    const log = await tx.reviewLog.findFirst({
      where: { userId, studyDay: ctx.day },
      orderBy: [{ reviewedAt: "desc" }, { id: "desc" }],
    });
    if (!log) throw new AppError(409, "NOTHING_TO_UNDO", "No hay nada que deshacer");
    const s = snapshotSchema.parse(log.cardBefore);
    await tx.card.update({
      where: { id: log.cardId },
      data: {
        state: s.state,
        due: new Date(s.due),
        stability: s.stability,
        difficulty: s.difficulty,
        elapsedDays: s.elapsedDays,
        scheduledDays: s.scheduledDays,
        learningSteps: s.learningSteps,
        reps: s.reps,
        lapses: s.lapses,
        lastReview: s.lastReview ? new Date(s.lastReview) : null,
        introducedAt: s.introducedAt ? new Date(s.introducedAt) : null,
        suspended: s.suspended,
        isLeech: s.isLeech,
      },
    });
    await tx.reviewLog.delete({ where: { id: log.id } });
    return log.cardId;
  });
  undoChains.set(userId, chain + 1);
  return { restoredCardId };
}

/** Solo para pruebas. */
export function resetUndoChains() {
  undoChains.clear();
}

// ───────────────────────────── Práctica libre (no afecta FSRS) ─────────────────────────────

/** Sustantivos ya introducidos, sin artículo, para el drill der/die/das. */
export async function genderPractice(userId: string, limit = 20) {
  const take = Math.min(Math.max(limit, 1), 50);
  const words = await prisma.word.findMany({
    where: {
      ...visibleTo(userId),
      type: "NOUN",
      gender: { not: null },
      cards: { some: { userId, introducedAt: { not: null } } },
    },
    select: { id: true, lemma: true, gender: true, translationEs: true, pluralForm: true },
  });
  for (let i = words.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [words[i], words[j]] = [words[j]!, words[i]!];
  }
  return words.slice(0, take).map((w) => ({
    wordId: w.id,
    lemma: w.lemma,
    gender: w.gender!,
    translationEs: w.translationEs,
    pluralForm: w.pluralForm,
  }));
}

/** Todas las palabras de una lección (introducidas o no), en modo tarjeta. */
export async function lessonPractice(userId: string, lessonNumber: number) {
  const lesson = await prisma.lesson.findUnique({ where: { number: lessonNumber } });
  if (!lesson) throw notFound(`La lección ${lessonNumber} no existe`);
  const words = await prisma.word.findMany({
    where: { ...visibleTo(userId), lessonId: lesson.id },
    include: { lesson: { select: { number: true, title: true, sortOrder: true } } },
    orderBy: [{ priority: "desc" }, { lemma: "asc" }],
  });
  return {
    lesson: { number: lesson.number, title: lesson.title, topic: lesson.topic },
    words: words.map(toQueueWord),
  };
}

export async function lessonsWithCounts(userId: string) {
  const lessons = await prisma.lesson.findMany({
    orderBy: { sortOrder: "asc" },
    include: { _count: { select: { words: { where: visibleTo(userId) } } } },
  });
  return lessons.map((l) => ({ number: l.number, title: l.title, topic: l.topic, words: l._count.words }));
}

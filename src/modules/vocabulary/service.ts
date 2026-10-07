import type { Prisma, Word } from "@prisma/client";
import { getSettings } from "@/modules/settings";
import { prisma, type Tx } from "@/server/db";
import { AppError, forbidden, notFound } from "@/server/http";
import { cardPlan, possibleCardKinds } from "./card-kinds";
import { computePriority } from "./priority";
import {
  findOwnWord,
  findVisibleWord,
  lessonIdByNumber,
  planSelect,
  visibleTo,
  wordWithLesson,
} from "./repository";
import { noteInputSchema, wordFiltersSchema, wordInputSchema, type WordInput } from "./schemas";
import type { CardKind } from "./shared";

export const PAGE_SIZE = 50;

/** Convierte la entrada validada en datos de Prisma (calcula la prioridad). */
export function toWordData(input: WordInput, lessonId: number | null) {
  const { lessonNumber: _lessonNumber, ...rest } = input;
  return { ...rest, lessonId, priority: computePriority(input) };
}

/** Datos exportables (WordInput) a partir de una fila de Word. */
export function wordToInput(w: Word & { lesson: { number: number } | null }): WordInput {
  return {
    lemma: w.lemma,
    type: w.type,
    gender: w.gender,
    pluralSuffix: w.pluralSuffix,
    pluralForm: w.pluralForm,
    noPlural: w.noPlural,
    translationEs: w.translationEs,
    exampleDe: w.exampleDe,
    exampleEs: w.exampleEs,
    clozeText: w.clozeText,
    level: w.level,
    starred: w.starred,
    goetheLevel: w.goetheLevel,
    frequencyRank: w.frequencyRank,
    lessonNumber: w.lesson?.number ?? null,
    sources: w.sources,
    isCognate: w.isCognate,
    isFalseFriend: w.isFalseFriend,
    falseFriendNote: w.falseFriendNote,
    separablePrefix: w.separablePrefix,
    thirdPerson: w.thirdPerson,
    perfekt: w.perfekt,
    auxiliary: w.auxiliary,
    isIrregular: w.isIrregular,
    governsCase: w.governsCase,
    tags: w.tags,
  };
}

async function requireLesson(tx: Tx, lessonNumber: number | null) {
  const lessonId = await lessonIdByNumber(tx, lessonNumber);
  if (lessonNumber != null && lessonId == null) {
    throw new AppError(422, "UNKNOWN_LESSON", `La lección ${lessonNumber} no existe`);
  }
  return lessonId;
}

// ───────────────────────────── Tarjetas ─────────────────────────────

const syncSignatures = new Map<string, string>();

/**
 * Crea las tarjetas que faltan para las palabras visibles del usuario según la tabla 7.1
 * y los tipos activados. Nunca borra ni modifica tarjetas existentes.
 */
export async function syncCards(
  userId: string,
  opts: { wordIds?: string[]; force?: boolean } = {},
  tx: Tx = prisma,
) {
  const settings = await getSettings(userId, tx);
  const where: Prisma.WordWhereInput = {
    ...visibleTo(userId),
    ...(opts.wordIds ? { id: { in: opts.wordIds } } : {}),
  };

  if (!opts.wordIds && !opts.force) {
    const agg = await tx.word.aggregate({ where, _count: true, _max: { updatedAt: true } });
    const signature = `${agg._count}|${agg._max.updatedAt?.toISOString()}|${settings.enabledCardKinds.join(",")}`;
    if (syncSignatures.get(userId) === signature) return 0;
    syncSignatures.set(userId, signature);
  }

  const words = await tx.word.findMany({ where, select: planSelect });
  const data: Prisma.CardCreateManyInput[] = [];
  for (const w of words) {
    for (const kind of cardPlan(w, settings.enabledCardKinds).kinds)
      data.push({ userId, wordId: w.id, kind });
  }
  if (!data.length) return 0;
  const res = await tx.card.createMany({ data, skipDuplicates: true });
  return res.count;
}

/** Olvida la firma de sincronización (tras cambiar ajustes o restaurar). */
export function invalidateCardSync(userId?: string) {
  if (userId) syncSignatures.delete(userId);
  else syncSignatures.clear();
}

/** Tipo principal de cada palabra para un usuario (para la elegibilidad de secundarias). */
export function primaryKindOf(word: Parameters<typeof cardPlan>[0], enabled: readonly CardKind[]) {
  return cardPlan(word, enabled).primary;
}

// ───────────────────────────── Consultas ─────────────────────────────

export async function listWords(userId: string, rawFilters: unknown) {
  const f = wordFiltersSchema.parse(rawFilters);
  const and: Prisma.WordWhereInput[] = [visibleTo(userId)];
  if (f.q) {
    and.push({
      OR: [
        { lemma: { contains: f.q, mode: "insensitive" } },
        { translationEs: { contains: f.q, mode: "insensitive" } },
        { pluralForm: { contains: f.q, mode: "insensitive" } },
        { thirdPerson: { contains: f.q, mode: "insensitive" } },
      ],
    });
  }
  if (f.level) and.push({ level: f.level });
  if (f.type) and.push({ type: f.type });
  if (f.gender) and.push({ gender: f.gender });
  if (f.lesson) and.push({ lesson: { number: f.lesson } });
  if (f.falseFriend) and.push({ isFalseFriend: true });
  if (f.scope === "own") and.push({ scope: userId });
  if (f.scope === "global") and.push({ scope: "global" });
  switch (f.status) {
    case "new":
      and.push({ cards: { none: { userId, state: { not: "NEW" } } } });
      break;
    case "learning":
      and.push({ cards: { some: { userId, state: { in: ["LEARNING", "RELEARNING"] } } } });
      break;
    case "review":
      and.push({ cards: { some: { userId, state: "REVIEW" } } });
      break;
    case "suspended":
      and.push({ cards: { some: { userId, suspended: true } } });
      break;
    case "leech":
      and.push({ cards: { some: { userId, isLeech: true } } });
      break;
  }
  const where: Prisma.WordWhereInput = { AND: and };
  const [total, items] = await Promise.all([
    prisma.word.count({ where }),
    prisma.word.findMany({
      where,
      orderBy: [{ lesson: { sortOrder: "asc" } }, { priority: "desc" }, { lemma: "asc" }],
      skip: (f.page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: {
        ...wordWithLesson,
        cards: { where: { userId }, select: { state: true, suspended: true, isLeech: true } },
      },
    }),
  ]);
  return {
    total,
    page: f.page,
    pageSize: PAGE_SIZE,
    pages: Math.max(1, Math.ceil(total / PAGE_SIZE)),
    items: items.map(({ cards, ...w }) => ({ ...w, status: wordStatus(cards) })),
  };
}

export type WordStatus = "new" | "learning" | "review" | "suspended" | "leech";

export function wordStatus(cards: { state: string; suspended: boolean; isLeech: boolean }[]): WordStatus {
  if (cards.length && cards.every((c) => c.suspended)) return "suspended";
  if (cards.some((c) => c.isLeech)) return "leech";
  if (cards.some((c) => c.state === "LEARNING" || c.state === "RELEARNING")) return "learning";
  if (cards.some((c) => c.state === "REVIEW")) return "review";
  return "new";
}

export async function getWordDetail(userId: string, wordId: string) {
  const word = await findVisibleWord(userId, wordId);
  if (!word) throw notFound("Palabra no encontrada");
  await syncCards(userId, { wordIds: [wordId] });
  const [cards, note, logs] = await Promise.all([
    prisma.card.findMany({ where: { userId, wordId }, orderBy: { kind: "asc" } }),
    prisma.wordNote.findUnique({ where: { userId_wordId: { userId, wordId } } }),
    prisma.reviewLog.findMany({
      where: { userId, card: { wordId } },
      orderBy: { reviewedAt: "desc" },
      take: 50,
      select: {
        id: true,
        rating: true,
        verdict: true,
        reviewedAt: true,
        durationMs: true,
        card: { select: { kind: true } },
      },
    }),
  ]);
  return { word, cards, note, logs, isOwn: word.scope === userId };
}

export async function listLeeches(userId: string) {
  return prisma.card.findMany({
    where: { userId, isLeech: true },
    orderBy: [{ lapses: "desc" }, { lastReview: "desc" }],
    include: {
      word: {
        include: {
          ...wordWithLesson,
          notes: { where: { userId }, select: { mnemonic: true, ownSentence: true } },
        },
      },
    },
  });
}

// ───────────────────────────── Mutaciones ─────────────────────────────

function isUniqueViolation(err: unknown) {
  return (
    typeof err === "object" && err !== null && "code" in err && (err as { code: string }).code === "P2002"
  );
}

export async function createWord(userId: string, raw: unknown) {
  const input = wordInputSchema.parse(raw);
  try {
    return await prisma.$transaction(async (tx) => {
      const lessonId = await requireLesson(tx, input.lessonNumber);
      const word = await tx.word.create({ data: { ...toWordData(input, lessonId), scope: userId } });
      await syncCards(userId, { wordIds: [word.id] }, tx);
      return word;
    });
  } catch (err) {
    if (isUniqueViolation(err))
      throw new AppError(409, "DUPLICATE", "Ya tienes una palabra con ese lema y tipo");
    throw err;
  }
}

export async function updateWord(userId: string, wordId: string, raw: unknown) {
  const input = wordInputSchema.parse(raw);
  const existing = await findVisibleWord(userId, wordId);
  if (!existing) throw notFound("Palabra no encontrada");
  if (existing.scope !== userId)
    throw forbidden("Las palabras del catálogo global no se editan: crea una copia propia");
  try {
    return await prisma.$transaction(async (tx) => {
      const lessonId = await requireLesson(tx, input.lessonNumber);
      const word = await tx.word.update({ where: { id: wordId }, data: toWordData(input, lessonId) });
      // Borra tarjetas nuevas de tipos que ya no corresponden (p. ej. si cambió el tipo de palabra).
      const valid = possibleCardKinds(word);
      await tx.card.deleteMany({ where: { userId, wordId, state: "NEW", kind: { notIn: valid } } });
      await syncCards(userId, { wordIds: [wordId] }, tx);
      return word;
    });
  } catch (err) {
    if (isUniqueViolation(err))
      throw new AppError(409, "DUPLICATE", "Ya tienes una palabra con ese lema y tipo");
    throw err;
  }
}

export async function deleteWord(userId: string, wordId: string) {
  const own = await findOwnWord(userId, wordId);
  if (!own) {
    const visible = await findVisibleWord(userId, wordId);
    if (visible) throw forbidden("Las palabras del catálogo global no se borran: puedes suspenderlas");
    throw notFound("Palabra no encontrada");
  }
  await prisma.word.delete({ where: { id: wordId } });
}

/** «Crear copia propia» de una palabra global; la global queda oculta (tarjetas suspendidas). */
export async function copyGlobalWord(userId: string, wordId: string) {
  const word = await findVisibleWord(userId, wordId);
  if (!word) throw notFound("Palabra no encontrada");
  if (word.scope !== "global") throw new AppError(422, "NOT_GLOBAL", "Esta palabra ya es tuya");
  const exists = await prisma.word.findUnique({
    where: { scope_lemma_type: { scope: userId, lemma: word.lemma, type: word.type } },
    select: { id: true },
  });
  if (exists) return exists;
  return prisma.$transaction(async (tx) => {
    const input = wordToInput(word);
    const copy = await tx.word.create({ data: { ...toWordData(input, word.lessonId), scope: userId } });
    await syncCards(userId, { wordIds: [wordId, copy.id] }, tx);
    await tx.card.updateMany({ where: { userId, wordId }, data: { suspended: true } });
    const note = await tx.wordNote.findUnique({ where: { userId_wordId: { userId, wordId } } });
    if (note) {
      await tx.wordNote.create({
        data: { userId, wordId: copy.id, mnemonic: note.mnemonic, ownSentence: note.ownSentence },
      });
    }
    return copy;
  });
}

/** Ocultar (suspender) o reactivar todas las tarjetas de una palabra. */
export async function setWordSuspended(userId: string, wordId: string, suspended: boolean) {
  const word = await findVisibleWord(userId, wordId);
  if (!word) throw notFound("Palabra no encontrada");
  await syncCards(userId, { wordIds: [wordId] });
  await prisma.card.updateMany({ where: { userId, wordId }, data: { suspended } });
}

export async function setCardSuspended(userId: string, cardId: string, suspended: boolean) {
  const res = await prisma.card.updateMany({ where: { id: cardId, userId }, data: { suspended } });
  if (!res.count) throw notFound("Tarjeta no encontrada");
}

/** «Reiniciar tarjeta»: vuelve a NEW y deja de ser rebelde. */
export async function resetCard(userId: string, cardId: string, now: Date) {
  const res = await prisma.card.updateMany({
    where: { id: cardId, userId },
    data: {
      state: "NEW",
      due: now,
      stability: 0,
      difficulty: 0,
      elapsedDays: 0,
      scheduledDays: 0,
      learningSteps: 0,
      reps: 0,
      lapses: 0,
      lastReview: null,
      introducedAt: null,
      isLeech: false,
      suspended: false,
    },
  });
  if (!res.count) throw notFound("Tarjeta no encontrada");
}

export async function saveNote(userId: string, wordId: string, raw: unknown) {
  const input = noteInputSchema.parse(raw);
  const word = await findVisibleWord(userId, wordId);
  if (!word) throw notFound("Palabra no encontrada");
  // Solo se actualizan los campos enviados (guardar la mnemotecnia no borra «mi frase»).
  const sent = typeof raw === "object" && raw !== null ? raw : {};
  const update = Object.fromEntries(Object.entries(input).filter(([k]) => k in sent));
  return prisma.wordNote.upsert({
    where: { userId_wordId: { userId, wordId } },
    update,
    create: { userId, wordId, ...input },
  });
}

/** Inserta o actualiza una palabra del catálogo global (semilla). */
export async function upsertGlobalWord(tx: Tx, input: WordInput, lessonId: number | null) {
  const data = toWordData(input, lessonId);
  const where = { scope_lemma_type: { scope: "global", lemma: input.lemma, type: input.type } };
  const existing = await tx.word.findUnique({ where });
  if (existing) {
    const changed = (Object.keys(data) as (keyof typeof data)[]).some(
      (k) => JSON.stringify(existing[k]) !== JSON.stringify(data[k]),
    );
    if (!changed) return "unchanged" as const;
    await tx.word.update({ where: { id: existing.id }, data });
    return "updated" as const;
  }
  await tx.word.create({ data: { ...data, scope: "global" } });
  return "created" as const;
}

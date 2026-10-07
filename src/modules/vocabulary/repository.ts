import type { Prisma } from "@prisma/client";
import { prisma, type Tx } from "@/server/db";

/** Palabras visibles para un usuario: catálogo global + sus palabras propias. */
export function visibleTo(userId: string): Prisma.WordWhereInput {
  return { scope: { in: ["global", userId] } };
}

export const wordWithLesson = { lesson: { select: { number: true, title: true, sortOrder: true } } } as const;

export function findVisibleWord(userId: string, wordId: string, tx: Tx = prisma) {
  return tx.word.findFirst({ where: { id: wordId, ...visibleTo(userId) }, include: wordWithLesson });
}

export function findOwnWord(userId: string, wordId: string, tx: Tx = prisma) {
  return tx.word.findFirst({ where: { id: wordId, scope: userId }, include: wordWithLesson });
}

export async function lessonIdByNumber(tx: Tx, lessonNumber: number | null): Promise<number | null> {
  if (lessonNumber == null) return null;
  const lesson = await tx.lesson.findUnique({ where: { number: lessonNumber }, select: { id: true } });
  return lesson?.id ?? null;
}

export function listLessons() {
  return prisma.lesson.findMany({ orderBy: { sortOrder: "asc" } });
}

/** Campos de palabra que necesita el plan de tarjetas. */
export const planSelect = {
  id: true,
  type: true,
  level: true,
  noPlural: true,
  pluralForm: true,
  isIrregular: true,
  separablePrefix: true,
  auxiliary: true,
  thirdPerson: true,
  perfekt: true,
  exampleDe: true,
  clozeText: true,
} as const;

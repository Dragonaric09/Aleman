import { z } from "zod";
import { getSettings } from "@/modules/settings";
import { dayRange, getSummary, shiftDay, studyDay } from "@/modules/study";
import { LEVELS, cardPlan, visibleTo, type Level } from "@/modules/vocabulary";
import { prisma } from "@/server/db";
import { computeStreak } from "./streak";

export const MATURE_DAYS = 21;

export const statsRangeSchema = z.coerce.number().int().min(7).max(365).default(30);

interface WordProgressRow {
  id: string;
  level: Level;
  lessonNumber: number | null;
  introduced: boolean;
  mature: boolean;
}

/** Progreso por palabra: introducida si alguna tarjeta se estudió; madura si la principal tiene intervalo ≥ 21 d. */
async function wordProgress(userId: string): Promise<WordProgressRow[]> {
  const settings = await getSettings(userId);
  const words = await prisma.word.findMany({
    where: visibleTo(userId),
    select: {
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
      lesson: { select: { number: true } },
      cards: {
        where: { userId },
        select: { kind: true, introducedAt: true, state: true, scheduledDays: true },
      },
    },
  });
  return words.map((w) => {
    const primary = cardPlan(w, settings.enabledCardKinds).primary;
    const primaryCard = w.cards.find((c) => c.kind === primary);
    return {
      id: w.id,
      level: w.level,
      lessonNumber: w.lesson?.number ?? null,
      introduced: w.cards.some((c) => c.introducedAt !== null),
      mature: !!primaryCard && primaryCard.state === "REVIEW" && primaryCard.scheduledDays >= MATURE_DAYS,
    };
  });
}

function progressBy<K extends string | number>(
  rows: WordProgressRow[],
  key: (r: WordProgressRow) => K | null,
) {
  const map = new Map<K, { total: number; introduced: number; mature: number }>();
  for (const r of rows) {
    const k = key(r);
    if (k === null) continue;
    const e = map.get(k) ?? { total: 0, introduced: 0, mature: 0 };
    e.total++;
    if (r.introduced) e.introduced++;
    if (r.mature) e.mature++;
    map.set(k, e);
  }
  return map;
}

/** Previsión de repasos por día de estudio (los atrasados cuentan para hoy). */
async function forecast(userId: string, today: string, days: number, tz: string, hour: number) {
  const settings = await getSettings(userId);
  const cards = await prisma.card.findMany({
    where: { userId, suspended: false, state: { not: "NEW" }, kind: { in: settings.enabledCardKinds } },
    select: { due: true },
  });
  const range = dayRange(shiftDay(today, days - 1), days);
  const counts = new Map(range.map((d) => [d, 0]));
  for (const c of cards) {
    let d = studyDay(c.due, tz, hour);
    if (d < today) d = today;
    if (counts.has(d)) counts.set(d, counts.get(d)! + 1);
  }
  return range.map((day) => ({ day, count: counts.get(day) ?? 0 }));
}

export async function getDashboard(userId: string, now: Date) {
  const settings = await getSettings(userId);
  const summary = await getSummary(userId, now);
  const [rows, days, next7] = await Promise.all([
    wordProgress(userId),
    prisma.reviewLog.findMany({ where: { userId }, distinct: ["studyDay"], select: { studyDay: true } }),
    forecast(userId, summary.studyDay, 7, settings.timezone, settings.dayStartsAtHour),
  ]);
  const byLevel = progressBy(rows, (r) => r.level);
  return {
    summary,
    streak: computeStreak(
      days.map((d) => d.studyDay),
      summary.studyDay,
    ),
    levels: LEVELS.map((level) => ({
      level,
      ...(byLevel.get(level) ?? { total: 0, introduced: 0, mature: 0 }),
    })),
    forecast: next7,
  };
}

export async function getStats(userId: string, rawRange: unknown, now: Date) {
  const range = statsRangeSchema.parse(rawRange);
  const settings = await getSettings(userId);
  const today = studyDay(now, settings.timezone, settings.dayStartsAtHour);
  const windowDays = Math.max(range, 90);
  const since = shiftDay(today, -(windowDays - 1));

  const [logs, allDays, rows, lessons, next30] = await Promise.all([
    prisma.reviewLog.findMany({
      where: { userId, studyDay: { gte: since } },
      select: { studyDay: true, rating: true, stateBefore: true, durationMs: true, isNewCard: true },
    }),
    prisma.reviewLog.findMany({ where: { userId }, distinct: ["studyDay"], select: { studyDay: true } }),
    wordProgress(userId),
    prisma.lesson.findMany({ orderBy: { sortOrder: "asc" }, select: { number: true, title: true } }),
    forecast(userId, today, 30, settings.timezone, settings.dayStartsAtHour),
  ]);

  const perDay = new Map<string, { reviews: number; news: number }>();
  for (const l of logs) {
    const e = perDay.get(l.studyDay) ?? { reviews: 0, news: 0 };
    if (l.isNewCard) e.news++;
    else e.reviews++;
    perDay.set(l.studyDay, e);
  }
  const series = (n: number) =>
    dayRange(today, n).map((day) => {
      const e = perDay.get(day) ?? { reviews: 0, news: 0 };
      return { day, reviews: e.reviews, news: e.news, total: e.reviews + e.news };
    });

  const since30 = shiftDay(today, -29);
  const matureReviews = logs.filter((l) => l.studyDay >= since30 && l.stateBefore === "REVIEW");
  const retained = matureReviews.filter((l) => l.rating !== "AGAIN").length;
  const inRange = logs.filter((l) => l.studyDay >= shiftDay(today, -(range - 1)));
  const avgMs = inRange.length
    ? Math.round(inRange.reduce((s, l) => s + l.durationMs, 0) / inRange.length)
    : null;

  const byLevel = progressBy(rows, (r) => r.level);
  const byLesson = progressBy(rows, (r) => r.lessonNumber);

  return {
    range,
    today,
    streak: computeStreak(
      allDays.map((d) => d.studyDay),
      today,
    ),
    heatmap: series(90).map(({ day, total }) => ({ day, count: total })),
    reviewsPerDay: series(range),
    retention: {
      rate: matureReviews.length ? retained / matureReviews.length : null,
      reviews: matureReviews.length,
      retained,
    },
    forecast: next30,
    levels: LEVELS.map((level) => ({
      level,
      ...(byLevel.get(level) ?? { total: 0, introduced: 0, mature: 0 }),
    })),
    lessons: lessons
      .map((l) => ({ ...l, ...(byLesson.get(l.number) ?? { total: 0, introduced: 0, mature: 0 }) }))
      .filter((l) => l.total > 0),
    averageMsPerCard: avgMs,
    totals: { reviews: inRange.length },
  };
}

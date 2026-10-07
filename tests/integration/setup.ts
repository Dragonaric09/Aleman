import { afterAll, beforeEach } from "vitest";

process.env.DATABASE_URL =
  process.env.TEST_DATABASE_URL ?? "postgresql://test:test@localhost:5433/deutsch_test?schema=public";
process.env.LOG_LEVEL = "silent";
process.env.ALLOW_REGISTRATION = "true";

const { prisma } = await import("@/server/db");
const { setClock } = await import("@/server/clock");
const { invalidateCardSync } = await import("@/modules/vocabulary");
const { resetUndoChains } = await import("@/modules/study");
const { loginLimiterByEmail, loginLimiterByIp } = await import("@/modules/auth");

beforeEach(async () => {
  await prisma.user.deleteMany({});
  await prisma.word.deleteMany({ where: { scope: { not: "global" } } });
  invalidateCardSync();
  resetUndoChains();
  loginLimiterByEmail.reset();
  loginLimiterByIp.reset();
  setClock(null);
});

afterAll(async () => {
  await prisma.$disconnect();
});

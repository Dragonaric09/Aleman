import { createHash, randomBytes } from "node:crypto";
import { prisma } from "@/server/db";

export const SESSION_COOKIE = "wz_session";
export const SESSION_DAYS = 30;
export const RENEW_WHEN_DAYS_LEFT = 15;
const DAY_MS = 86_400_000;

/** Token aleatorio de 32 bytes (base64url). Solo vive en la cookie. */
export function generateToken(): string {
  return randomBytes(32).toString("base64url");
}

/** En base de datos se guarda solo el SHA-256 (hex) del token. */
export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export async function createSession(userId: string, now: Date) {
  const token = generateToken();
  const expiresAt = new Date(now.getTime() + SESSION_DAYS * DAY_MS);
  await prisma.session.create({ data: { id: hashToken(token), userId, expiresAt } });
  return { token, expiresAt };
}

export interface SessionUser {
  id: string;
  email: string;
  displayName: string;
}

/** Valida el token; renueva la sesión (deslizante) cuando quedan menos de 15 días. */
export async function validateSessionToken(token: string, now: Date) {
  const id = hashToken(token);
  const session = await prisma.session.findUnique({
    where: { id },
    include: { user: { select: { id: true, email: true, displayName: true } } },
  });
  if (!session) return null;
  if (session.expiresAt.getTime() <= now.getTime()) {
    await prisma.session.delete({ where: { id } }).catch(() => undefined);
    return null;
  }
  let expiresAt = session.expiresAt;
  let renewed = false;
  if (expiresAt.getTime() - now.getTime() < RENEW_WHEN_DAYS_LEFT * DAY_MS) {
    expiresAt = new Date(now.getTime() + SESSION_DAYS * DAY_MS);
    await prisma.session.update({ where: { id }, data: { expiresAt } });
    renewed = true;
  }
  const user: SessionUser = session.user;
  return { user, expiresAt, renewed };
}

export async function invalidateSession(token: string) {
  await prisma.session.deleteMany({ where: { id: hashToken(token) } });
}

export async function invalidateAllSessions(userId: string, exceptToken?: string) {
  await prisma.session.deleteMany({
    where: { userId, ...(exceptToken ? { NOT: { id: hashToken(exceptToken) } } : {}) },
  });
}

export function sessionCookieOptions(expiresAt: Date) {
  const secure = (process.env.APP_URL ?? "").startsWith("https://");
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure,
    path: "/",
    expires: expiresAt,
  };
}

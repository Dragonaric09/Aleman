import { hash, verify } from "@node-rs/argon2";
import { createDefaultSettings } from "@/modules/settings";
import { prisma } from "@/server/db";
import { AppError } from "@/server/http";
import { logger } from "@/server/logger";
import { loginLimiterByEmail, loginLimiterByIp } from "./rate-limit";
import { findUserByEmail, findUserById, insertUser, updatePasswordHash } from "./repository";
import { changePasswordSchema, loginSchema, registerSchema } from "./schemas";
import { createSession, invalidateAllSessions } from "./session";

const GENERIC_LOGIN_ERROR = "Email o contraseña incorrectos";

function isValidTimezone(tz: string) {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

export function registrationAllowed() {
  return (process.env.ALLOW_REGISTRATION ?? "true") === "true";
}

/** Registro: crea el usuario con ajustes por defecto y abre sesión. */
export async function register(input: unknown, now: Date) {
  if (!registrationAllowed()) throw new AppError(403, "REGISTRATION_CLOSED", "El registro está cerrado");
  const data = registerSchema.parse(input);
  const existing = await findUserByEmail(data.email);
  if (existing) throw new AppError(409, "EMAIL_TAKEN", "Ya existe una cuenta con ese email");
  const passwordHash = await hash(data.password);
  const timezone = data.timezone && isValidTimezone(data.timezone) ? data.timezone : undefined;
  const user = await prisma.$transaction(async (tx) => {
    const u = await insertUser(tx, { email: data.email, passwordHash, displayName: data.displayName });
    await createDefaultSettings(u.id, tx, timezone);
    return u;
  });
  logger.info({ userId: user.id }, "usuario registrado");
  return { user, ...(await createSession(user.id, now)) };
}

/** Login con límite de intentos (5/min por IP y por email) y mensaje de error genérico. */
export async function login(input: unknown, ip: string, now: Date) {
  const data = loginSchema.parse(input);
  const t = now.getTime();
  const okIp = loginLimiterByIp.attempt(ip, t);
  const okEmail = loginLimiterByEmail.attempt(data.email, t);
  if (!okIp || !okEmail) {
    logger.warn({ ip }, "límite de intentos de login");
    throw new AppError(
      429,
      "TOO_MANY_ATTEMPTS",
      "Demasiados intentos. Espera un minuto e inténtalo de nuevo.",
    );
  }
  const user = await findUserByEmail(data.email);
  const valid = user ? await verify(user.passwordHash, data.password).catch(() => false) : false;
  if (!user || !valid) throw new AppError(401, "INVALID_CREDENTIALS", GENERIC_LOGIN_ERROR);
  return { user, ...(await createSession(user.id, now)) };
}

export async function changePassword(userId: string, input: unknown, currentToken: string) {
  const data = changePasswordSchema.parse(input);
  const user = await findUserById(userId);
  if (!user) throw new AppError(404, "NOT_FOUND", "Usuario no encontrado");
  const valid = await verify(user.passwordHash, data.currentPassword).catch(() => false);
  if (!valid) throw new AppError(400, "INVALID_PASSWORD", "La contraseña actual no es correcta");
  await updatePasswordHash(userId, await hash(data.newPassword));
  await invalidateAllSessions(userId, currentToken);
}

/** Crea un usuario si no existe (semilla de demostración). */
export async function ensureUser(email: string, password: string, displayName: string) {
  const normalized = email.trim().toLowerCase();
  const existing = await findUserByEmail(normalized);
  if (existing) return { user: existing, created: false };
  const passwordHash = await hash(password);
  const user = await prisma.$transaction(async (tx) => {
    const u = await insertUser(tx, { email: normalized, passwordHash, displayName });
    await createDefaultSettings(u.id, tx);
    return u;
  });
  return { user, created: true };
}

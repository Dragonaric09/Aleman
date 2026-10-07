import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { clock } from "@/server/clock";
import { AppError } from "@/server/http";
import { SESSION_COOKIE, sessionCookieOptions, validateSessionToken, type SessionUser } from "./session";

async function readToken() {
  return (await cookies()).get(SESSION_COOKIE)?.value ?? null;
}

/** Usuario de la sesión actual o null. Renueva la cookie cuando es posible. */
export async function getCurrentUser(): Promise<SessionUser | null> {
  const token = await readToken();
  if (!token) return null;
  const result = await validateSessionToken(token, clock.now());
  if (!result) return null;
  if (result.renewed) {
    try {
      (await cookies()).set(SESSION_COOKIE, token, sessionCookieOptions(result.expiresAt));
    } catch {
      // En Server Components no se pueden escribir cookies: la sesión ya se renovó en la base de datos.
    }
  }
  return result.user;
}

/** Para páginas y Server Actions: redirige a /login si no hay sesión válida. */
export async function requireUser(): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

/** Para Route Handlers: lanza 401 si no hay sesión válida. */
export async function requireApiUser(): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) throw new AppError(401, "UNAUTHENTICATED", "Inicia sesión para continuar");
  return user;
}

export async function currentSessionToken() {
  return readToken();
}

/** IP del cliente (detrás de proxy, primera de x-forwarded-for). */
export async function clientIp(): Promise<string> {
  const h = await headers();
  return h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || "local";
}

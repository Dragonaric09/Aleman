"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import {
  SESSION_COOKIE,
  clientIp,
  currentSessionToken,
  invalidateSession,
  login,
  register,
  sessionCookieOptions,
} from "@/modules/auth";
import { clock } from "@/server/clock";
import { str, toActionError, type ActionState } from "@/lib/action-result";

function safeNext(next: string) {
  return next.startsWith("/") && !next.startsWith("//") ? next : "/";
}

export async function loginAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  let token: string;
  let expiresAt: Date;
  try {
    ({ token, expiresAt } = await login(
      { email: str(form, "email"), password: str(form, "password") },
      await clientIp(),
      clock.now(),
    ));
  } catch (err) {
    return toActionError(err);
  }
  (await cookies()).set(SESSION_COOKIE, token, sessionCookieOptions(expiresAt));
  redirect(safeNext(str(form, "next")));
}

export async function registerAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  let token: string;
  let expiresAt: Date;
  try {
    ({ token, expiresAt } = await register(
      {
        email: str(form, "email"),
        password: str(form, "password"),
        displayName: str(form, "displayName"),
        timezone: str(form, "timezone") || undefined,
      },
      clock.now(),
    ));
  } catch (err) {
    return toActionError(err);
  }
  (await cookies()).set(SESSION_COOKIE, token, sessionCookieOptions(expiresAt));
  redirect("/");
}

export async function logoutAction() {
  const token = await currentSessionToken();
  if (token) await invalidateSession(token);
  (await cookies()).delete(SESSION_COOKIE);
  redirect("/login");
}

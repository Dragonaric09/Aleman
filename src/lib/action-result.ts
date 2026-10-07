import { ZodError } from "zod";
import { AppError } from "@/server/http";
import { logger } from "@/server/logger";

export interface ActionState {
  ok?: boolean;
  message?: string;
  error?: string;
  fieldErrors?: Record<string, string>;
  /** Datos opcionales devueltos por la acción (p. ej. el id creado). */
  data?: Record<string, unknown>;
}

/** Traduce errores de dominio y de validación al estado que muestran los formularios. */
export function toActionError(err: unknown): ActionState {
  if (err instanceof ZodError) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of err.issues) {
      const key = String(issue.path[0] ?? "form");
      fieldErrors[key] ??= issue.message;
    }
    return { error: "Revisa los campos marcados", fieldErrors };
  }
  if (err instanceof AppError) return { error: err.message };
  // Las redirecciones de Next.js se propagan.
  if (
    err &&
    typeof err === "object" &&
    "digest" in err &&
    String((err as { digest: unknown }).digest).startsWith("NEXT_")
  ) {
    throw err;
  }
  logger.error({ err }, "error no controlado en server action");
  return { error: "Ocurrió un error inesperado" };
}

export function str(form: FormData, key: string): string {
  const v = form.get(key);
  return typeof v === "string" ? v : "";
}

export function optStr(form: FormData, key: string): string | null {
  const v = str(form, key).trim();
  return v === "" ? null : v;
}

export function bool(form: FormData, key: string): boolean {
  const v = form.get(key);
  return v === "on" || v === "true" || v === "1";
}

export function optInt(form: FormData, key: string): number | null {
  const v = str(form, key).trim();
  if (v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

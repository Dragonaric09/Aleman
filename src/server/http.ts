import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { logger } from "./logger";

/** Error de dominio con código HTTP. Los mensajes son para el usuario (español). */
export class AppError extends Error {
  constructor(
    public status: 400 | 401 | 403 | 404 | 409 | 422 | 429 | 500,
    public code: string,
    message: string,
  ) {
    super(message);
  }
}

export const notFound = (msg = "No encontrado") => new AppError(404, "NOT_FOUND", msg);
export const forbidden = (msg = "No tienes permiso para esta acción") => new AppError(403, "FORBIDDEN", msg);
export const conflict = (msg: string) => new AppError(409, "CONFLICT", msg);
export const unprocessable = (msg: string) => new AppError(422, "UNPROCESSABLE", msg);

export function errorResponse(status: number, code: string, message: string) {
  return NextResponse.json({ error: { code, message } }, { status });
}

/** Convierte cualquier error en la respuesta JSON estándar { error: { code, message } }. */
export function handleRouteError(err: unknown) {
  if (err instanceof AppError) return errorResponse(err.status, err.code, err.message);
  if (err instanceof ZodError) {
    const first = err.issues[0];
    return errorResponse(400, "VALIDATION", first ? `${first.path.join(".") || "entrada"}: ${first.message}` : "Entrada inválida");
  }
  logger.error({ err }, "error no controlado en route handler");
  return errorResponse(500, "INTERNAL", "Ocurrió un error inesperado");
}

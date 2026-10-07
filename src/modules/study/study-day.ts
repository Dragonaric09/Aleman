import { TZDate } from "@date-fns/tz";
import { format, subHours } from "date-fns";

/**
 * Día de estudio "YYYY-MM-DD": empieza a las `dayStartsAtHour` en la zona horaria del usuario.
 * Ej.: con inicio a las 04:00, un repaso a las 02:00 cuenta para el día anterior.
 */
export function studyDay(now: Date, timezone: string, dayStartsAtHour: number): string {
  const local = new TZDate(now.getTime(), timezone);
  return format(subHours(local, dayStartsAtHour), "yyyy-MM-dd");
}

/** Inicio y fin (UTC) de un día de estudio. */
export function dayBounds(day: string, timezone: string, dayStartsAtHour: number): { start: Date; end: Date } {
  const [y, m, d] = day.split("-").map(Number) as [number, number, number];
  const start = new TZDate(y, m - 1, d, dayStartsAtHour, 0, 0, timezone);
  const end = new TZDate(y, m - 1, d + 1, dayStartsAtHour, 0, 0, timezone);
  return { start: new Date(start.getTime()), end: new Date(end.getTime()) };
}

/** Suma `n` días a una fecha "YYYY-MM-DD" (aritmética de calendario, sin zona horaria). */
export function shiftDay(day: string, n: number): string {
  const [y, m, d] = day.split("-").map(Number) as [number, number, number];
  const date = new Date(Date.UTC(y, m - 1, d + n));
  return date.toISOString().slice(0, 10);
}

/** Lista de días consecutivos que terminan en `lastDay` (incluido). */
export function dayRange(lastDay: string, count: number): string[] {
  return Array.from({ length: count }, (_, i) => shiftDay(lastDay, i - count + 1));
}

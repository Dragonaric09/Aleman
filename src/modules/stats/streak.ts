function shift(day: string, n: number): string {
  const [y, m, d] = day.split("-").map(Number) as [number, number, number];
  return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10);
}

/**
 * Racha: días de estudio consecutivos con al menos un repaso.
 * La racha actual sigue viva si hoy aún no se estudió pero ayer sí; un día sin repasos la reinicia.
 */
export function computeStreak(studyDays: Iterable<string>, today: string): { current: number; max: number } {
  const days = new Set(studyDays);
  let current = 0;
  let cursor = days.has(today) ? today : shift(today, -1);
  while (days.has(cursor)) {
    current++;
    cursor = shift(cursor, -1);
  }

  let max = 0;
  for (const d of days) {
    if (days.has(shift(d, -1))) continue; // no es el inicio de una racha
    let len = 1;
    let next = shift(d, 1);
    while (days.has(next)) {
      len++;
      next = shift(next, 1);
    }
    max = Math.max(max, len);
  }
  return { current, max: Math.max(max, current) };
}

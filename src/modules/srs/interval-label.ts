const MIN = 60_000;
const HOUR = 60 * MIN;
const DAY = 24 * HOUR;

function half(n: number) {
  return Math.round(n * 2) / 2;
}

function es(n: number) {
  return String(n).replace(".", ",");
}

/** Etiqueta legible en español del intervalo hasta el próximo repaso: «<1 min», «10 min», «1 h», «3 d», «2 sem», «1,5 meses», «1 año». */
export function intervalLabel(ms: number): string {
  if (ms < MIN) return "<1 min";
  if (ms < HOUR) return `${Math.round(ms / MIN)} min`;
  if (ms < DAY) return `${Math.max(1, Math.round(ms / HOUR))} h`;
  const days = ms / DAY;
  if (days < 14) return `${Math.max(1, Math.round(days))} d`;
  if (days < 30) return `${Math.round(days / 7)} sem`;
  if (days < 365) {
    const months = half(days / 30);
    return months <= 1 ? "1 mes" : `${es(months)} meses`;
  }
  const years = half(days / 365);
  return years <= 1 ? "1 año" : `${es(years)} años`;
}

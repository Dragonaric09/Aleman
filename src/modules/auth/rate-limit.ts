/**
 * Límite de intentos en memoria del proceso (suficiente en un monolito de una instancia).
 * Ventana deslizante: "limit" intentos por "windowMs" por clave.
 */
export class RateLimiter {
  private hits = new Map<string, number[]>();

  constructor(
    private limit: number,
    private windowMs: number,
  ) {}

  /** Registra un intento y devuelve false si la clave superó el límite. */
  attempt(key: string, now: number): boolean {
    const recent = (this.hits.get(key) ?? []).filter((t) => now - t < this.windowMs);
    if (recent.length >= this.limit) {
      this.hits.set(key, recent);
      return false;
    }
    recent.push(now);
    this.hits.set(key, recent);
    if (this.hits.size > 10_000) this.prune(now);
    return true;
  }

  reset() {
    this.hits.clear();
  }

  private prune(now: number) {
    for (const [k, v] of this.hits) if (v.every((t) => now - t >= this.windowMs)) this.hits.delete(k);
  }
}

/** 5 intentos de login por minuto por IP y por email. */
export const loginLimiterByIp = new RateLimiter(5, 60_000);
export const loginLimiterByEmail = new RateLimiter(5, 60_000);

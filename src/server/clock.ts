/** Reloj inyectable: la lógica pura recibe `now`; los servicios lo obtienen de aquí. */
export interface Clock {
  now(): Date;
}

const systemClock: Clock = { now: () => new Date() };
let current: Clock = systemClock;

export const clock: Clock = { now: () => current.now() };

/** Solo para pruebas: fija el reloj. */
export function setClock(next: Clock | Date | null) {
  if (next === null) current = systemClock;
  else if (next instanceof Date) current = { now: () => new Date(next.getTime()) };
  else current = next;
}

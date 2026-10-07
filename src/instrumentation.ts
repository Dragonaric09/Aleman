/** Se ejecuta al arrancar el servidor: valida las variables de entorno y termina con un mensaje claro si falta alguna. */
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  const { getEnv } = await import("./server/env");
  try {
    getEnv();
  } catch (err) {
    console.error(err instanceof Error ? err.message : err);
    process.exit(1);
  }
}

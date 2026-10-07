import { z } from "zod";

const envSchema = z.object({
  DATABASE_URL: z.string().min(1, "DATABASE_URL es obligatoria"),
  APP_URL: z.url("APP_URL debe ser una URL válida").default("http://localhost:3000"),
  ALLOW_REGISTRATION: z
    .enum(["true", "false"], { message: "ALLOW_REGISTRATION debe ser true o false" })
    .default("true")
    .transform((v) => v === "true"),
  LOG_LEVEL: z.enum(["fatal", "error", "warn", "info", "debug", "trace", "silent"]).default("info"),
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
});

export type Env = z.infer<typeof envSchema>;

let cached: Env | null = null;

/** Valida las variables de entorno. Lanza un error legible si falta alguna. */
export function getEnv(): Env {
  if (cached) return cached;
  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    const detail = parsed.error.issues.map((i) => `  - ${i.path.join(".")}: ${i.message}`).join("\n");
    throw new Error(`Variables de entorno inválidas:\n${detail}\nRevisa tu archivo .env (ver .env.example).`);
  }
  cached = parsed.data;
  return cached;
}

/** Solo para pruebas. */
export function resetEnvCache() {
  cached = null;
}

import { execSync } from "node:child_process";
import { existsSync } from "node:fs";

/** Prepara db_test (efímera, en tmpfs): aplica migraciones pendientes + semilla idempotente del catálogo real. */
export default function setup() {
  if (existsSync(".env.local")) process.loadEnvFile(".env.local");
  const url =
    process.env.TEST_DATABASE_URL ?? "postgresql://test:test@localhost:5433/deutsch_test?schema=public";
  const env = {
    ...process.env,
    DATABASE_URL: url,
    SEED_DEMO_EMAIL: "",
    SEED_DEMO_PASSWORD: "",
    LOG_LEVEL: "silent",
  };
  execSync("npx prisma migrate deploy", { env, stdio: "pipe" });
  execSync("npx tsx prisma/seed.ts", { env, stdio: "pipe" });
}

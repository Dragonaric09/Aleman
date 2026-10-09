import { existsSync } from "node:fs";
import react from "@vitejs/plugin-react";
import tsconfigPaths from "vite-tsconfig-paths";
import { defineConfig } from "vitest/config";

if (existsSync(".env.local")) process.loadEnvFile(".env.local");

export default defineConfig({
  plugins: [tsconfigPaths(), react()],
  test: {
    globals: true,
    coverage: {
      provider: "v8",
      include: [
        "src/modules/**/answer-check.ts",
        "src/modules/**/card-content.ts",
        "src/modules/**/priority.ts",
        "src/modules/**/card-kinds.ts",
        "src/modules/**/queue.ts",
        "src/modules/**/study-day.ts",
        "src/modules/**/streak.ts",
        "src/modules/**/leech.ts",
        "src/modules/**/interval-label.ts",
        "src/modules/**/fsrs-scheduler.ts",
        "src/modules/**/csv.ts",
        "src/modules/**/anki.ts",
        "src/modules/**/schemas.ts",
        "src/modules/reading/body.ts",
        "src/modules/reading/scoring.ts",
        "src/modules/reading/coverage.ts",
        "src/modules/reading/progress.ts",
        "src/modules/reading/keys.ts",
        "src/modules/reading/content.ts",
        "src/modules/grammar/content.ts",
      ],
      thresholds: { lines: 90 },
    },
    projects: [
      {
        extends: true,
        test: {
          name: "unit",
          include: ["tests/unit/**/*.test.{ts,tsx}"],
          environment: "node",
          setupFiles: ["tests/unit/setup.ts"],
        },
      },
      {
        extends: true,
        test: {
          name: "integration",
          include: ["tests/integration/**/*.test.ts"],
          environment: "node",
          globalSetup: ["tests/integration/global-setup.ts"],
          setupFiles: ["tests/integration/setup.ts"],
          fileParallelism: false,
          testTimeout: 30_000,
          hookTimeout: 60_000,
        },
      },
    ],
  },
});

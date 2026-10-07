import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { FlatCompat } from "@eslint/eslintrc";

const compat = new FlatCompat({ baseDirectory: dirname(fileURLToPath(import.meta.url)) });

const config = [
  {
    ignores: [
      "node_modules/**",
      ".next/**",
      "coverage/**",
      "playwright-report/**",
      "test-results/**",
      "next-env.d.ts",
      "materiales/**",
    ],
  },
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    rules: {
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_", varsIgnorePattern: "^_" }],
    },
  },
  {
    // Reglas de arquitectura (sección 4.2):
    // - la UI nunca importa Prisma ni el cliente de base de datos;
    // - entre módulos solo se usa la API pública (index.ts) o la API apta para cliente (shared.ts);
    // - ts-fsrs solo se importa en el adaptador.
    files: ["src/**/*.{ts,tsx}"],
    ignores: ["src/modules/srs/fsrs-scheduler.ts"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          paths: [
            { name: "ts-fsrs", message: "ts-fsrs solo se importa en src/modules/srs/fsrs-scheduler.ts." },
          ],
          patterns: [
            {
              group: ["@/modules/*/*", "!@/modules/*/shared"],
              message: "Importa solo la API pública del módulo (index.ts) o su API de cliente (shared.ts).",
            },
          ],
        },
      ],
    },
  },
  {
    files: ["src/app/**/*.{ts,tsx}", "src/components/**/*.{ts,tsx}", "src/middleware.ts"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          paths: [
            { name: "ts-fsrs", message: "ts-fsrs solo se importa en src/modules/srs/fsrs-scheduler.ts." },
          ],
          patterns: [
            {
              group: ["@prisma/client", "@prisma/client/*"],
              message: "La UI no importa Prisma: usa los servicios de src/modules.",
            },
            {
              group: ["@/server/db", "**/server/db"],
              message: "La UI no importa la base de datos: usa los servicios de src/modules.",
            },
            {
              group: ["@/modules/*/*", "!@/modules/*/shared"],
              message: "Importa solo la API pública del módulo (index.ts) o su API de cliente (shared.ts).",
            },
          ],
        },
      ],
    },
  },
];

export default config;

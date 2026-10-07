import { defineConfig, devices } from "@playwright/test";

/**
 * E2E contra una app en marcha (la pila de Docker o `pnpm dev`).
 * E2E_BASE_URL: URL de la app (por defecto http://localhost:3000).
 * PW_CHANNEL: usa un navegador instalado (p. ej. "chrome") en lugar del Chromium de Playwright.
 */
const channel = process.env.PW_CHANNEL || undefined;

export default defineConfig({
  testDir: "tests/e2e",
  timeout: 90_000,
  expect: { timeout: 15_000 },
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: [["list"]],
  use: {
    baseURL: process.env.E2E_BASE_URL ?? "http://localhost:3000",
    locale: "es-ES",
    timezoneId: "America/La_Paz",
    trace: "retain-on-failure",
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"], channel } },
    { name: "movil-390", use: { ...devices["Pixel 7"], viewport: { width: 390, height: 844 }, channel } },
  ],
});

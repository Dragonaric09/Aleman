import { expect, test } from "@playwright/test";
import { answerCurrentCard, registerFreshUser } from "./helpers";

test("salud de la API", async ({ request }) => {
  const res = await request.get("/api/health");
  expect(res.status()).toBe(200);
  expect(await res.json()).toEqual({ status: "ok", db: "ok" });
});

test("las rutas de la app exigen sesión", async ({ page, request }) => {
  await page.goto("/estudiar");
  await expect(page).toHaveURL(/\/login/);
  const api = await request.get("/api/study/summary");
  expect(api.status()).toBe(401);
  expect((await api.json()).error.code).toBe("UNAUTHENTICATED");
});

test("estudiar 5 tarjetas, deshacer 1 y ver el resumen", async ({ page }) => {
  await registerFreshUser(page);
  await expect(page.getByText(/Hoy te esperan 12 tarjetas/)).toBeVisible();
  await page.getByRole("link", { name: "Estudiar" }).first().click();
  await expect(page.getByText("0 / 12")).toBeVisible();

  for (let i = 0; i < 5; i++) {
    await answerCurrentCard(page);
    await expect(page.getByRole("progressbar")).toHaveAttribute("aria-valuenow", /\d+/);
  }
  await expect(page.getByText(/^5 \//)).toBeVisible();

  // U no actúa dentro del campo de respuesta (tiene el foco): se usa el botón.
  await page.getByRole("button", { name: "Deshacer (U)" }).click();
  await expect(page.getByText("Repaso deshecho")).toBeVisible();
  await expect(page.getByText(/^4 \//)).toBeVisible();

  // Terminar la sesión respondiendo todo lo que queda.
  for (let i = 0; i < 60; i++) {
    if (await page.getByText(/Sesión terminada|No hay tarjetas pendientes/).isVisible()) break;
    await answerCurrentCard(page);
  }
  await expect(page.getByText(/Sesión terminada/)).toBeVisible();
  await expect(page.getByText("Repasadas")).toBeVisible();

  // El panel ya no ofrece nuevas.
  await page.goto("/");
  await expect(page.getByText(/^0 nuevas/)).toBeVisible();
});

test("producción exige escribir antes de comprobar; el feedback muestra la respuesta", async ({ page }) => {
  await registerFreshUser(page);
  await page.goto("/estudiar");
  const check = page.getByRole("button", { name: /Comprobar/ });
  await expect(check).toBeDisabled();
  await page.locator("main form input").first().fill("xyz");
  await check.click();
  await expect(page.getByRole("status").filter({ hasText: /Incorrecto|Casi|Correcto/ })).toBeVisible();
  await expect(page.getByRole("button", { name: /^Otra vez/ })).toHaveAttribute(
    "aria-describedby",
    "suggested-hint",
  );
});

test("sin desplazamiento horizontal en la sesión de estudio", async ({ page }) => {
  await registerFreshUser(page);
  for (const path of ["/", "/estudiar", "/vocabulario", "/estadisticas", "/ajustes", "/practicar"]) {
    await page.goto(path);
    await page.waitForLoadState("networkidle");
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow, `desbordamiento horizontal en ${path}`).toBeLessThanOrEqual(0);
  }
});

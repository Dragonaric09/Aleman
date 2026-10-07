import { expect, test } from "@playwright/test";
import { registerFreshUser } from "./helpers";

test("crear un sustantivo sin género falla con mensaje claro; con género genera sus tarjetas", async ({ page }) => {
  await registerFreshUser(page);
  await page.goto("/vocabulario/nueva");
  await page.getByLabel("Lema (alemán)").fill("Kreuzung");
  await page.getByLabel("Plural", { exact: true }).fill("Kreuzungen");
  await page.getByLabel("Traducción al español").fill("cruce");
  await page.getByRole("button", { name: "Crear palabra" }).click();
  await expect(page.getByText("un sustantivo necesita género (der, die o das)")).toBeVisible();

  await page.locator("label").filter({ hasText: /^die$/ }).click();
  await page.getByRole("button", { name: "Crear palabra" }).click();
  await expect(page).toHaveURL(/\/vocabulario\/c/);
  await expect(page.getByRole("heading", { name: "Tarjetas" })).toBeVisible();
  const cards = page.getByRole("list").filter({ hasText: "Español → alemán" });
  await expect(cards.getByText("Español → alemán")).toBeVisible();
  await expect(cards.getByText("Alemán → español")).toBeVisible();
  await expect(cards.getByText("Plural", { exact: true })).toBeVisible();
});

test("la práctica libre no cambia el panel", async ({ page }) => {
  await registerFreshUser(page);
  await page.goto("/practicar");
  await page.getByRole("button", { name: /^13/ }).click();
  await expect(page.getByText(/Lección 13/)).toBeVisible();
  await page.keyboard.press("Space");
  await page.keyboard.press("ArrowRight");
  await page.goto("/");
  await expect(page.getByText(/Hoy te esperan 12 tarjetas/)).toBeVisible();
});

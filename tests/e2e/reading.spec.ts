import { expect, test } from "@playwright/test";
import { registerFreshUser } from "./helpers";

test("leer una historia, hacer los ejercicios y desbloquear la siguiente", async ({ page }) => {
  await registerFreshUser(page);
  await expect(page.getByText("Lucía sucht das Café Linde")).toBeVisible();

  await page.goto("/estudiar");
  await page.getByRole("link", { name: "Historias" }).click();
  await expect(page.getByRole("heading", { name: "Mini historias" })).toBeVisible();
  await page.getByRole("link", { name: /^Leer/ }).click();

  await expect(page.getByRole("heading", { name: "Lucía sucht das Café Linde" })).toBeVisible();
  await page.getByRole("button", { name: "Ampel: ver significado" }).click();
  await expect(page.getByText("semáforo")).toBeVisible();
  await page.keyboard.press("Escape");

  await page.getByRole("button", { name: /Ir a los ejercicios/ }).click();
  await page.getByRole("button", { name: "neben", exact: true }).first().click();
  const statements = page.getByRole("radiogroup", { name: /Afirmación/ });
  for (let i = 0; i < (await statements.count()); i++) {
    await statements.nth(i).getByRole("radio", { name: "falsch" }).click();
  }
  await page.getByLabel("Hueco 1").fill("neben");
  await page.getByLabel("Hueco 2").fill("am");
  await page.getByRole("button", { name: "Comprobar" }).click();

  await expect(page.getByRole("heading", { name: "Revisión" })).toBeVisible();
  await expect(page.getByText("Encontraste 1 de")).toBeVisible();
  await page.getByRole("link", { name: /Siguiente historia/ }).click();
  await expect(page.getByRole("heading", { name: "Der Stadtplan von Lindenau" })).toBeVisible();
});

test("la página de gramática explica el tema y corrige los ejercicios", async ({ page }) => {
  await registerFreshUser(page);
  await page.goto("/gramatica");
  await expect(page.getByRole("heading", { name: "Gramática", level: 1 })).toBeVisible();
  await page.getByRole("link", { name: /Preposiciones de lugar con dativo/ }).click();
  await expect(page.getByText("En una frase")).toBeVisible();
  await expect(page.getByRole("img", { name: /zwischen: entre/ })).toBeVisible();

  const q2 = page.getByRole("radiogroup", { name: "Pregunta 2" });
  await q2.getByRole("radio", { name: "dem" }).click();
  await expect(page.getByText(/¡Correcto! der Bahnhof es masculino/)).toBeVisible();

  const gap = page.getByLabel("Hueco 1");
  await gap.fill("neben");
  await gap.press("Enter");
  await expect(page.getByRole("status").filter({ hasText: "¡Correcto!" }).first()).toBeVisible();
});

test("las historias bloqueadas no se pueden abrir y no hay desbordamiento horizontal", async ({ page }) => {
  await registerFreshUser(page);
  const res = await page.request.post("/api/reading/attempt", {
    data: { storyId: "G1-05", answers: { truefalse: [], cloze: [], order: [] } },
  });
  expect(res.status()).toBe(403);
  for (const path of [
    "/estudiar/historias",
    "/estudiar/historias/G1-01",
    "/gramatica",
    "/gramatica/dativo-local",
  ]) {
    await page.goto(path);
    await page.waitForLoadState("networkidle");
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow, `desbordamiento horizontal en ${path}`).toBeLessThanOrEqual(0);
  }
});

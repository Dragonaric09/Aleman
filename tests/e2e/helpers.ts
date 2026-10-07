import { expect, type Page } from "@playwright/test";

/** Registra un usuario nuevo y aislado para la prueba. */
export async function registerFreshUser(page: Page) {
  const email = `e2e-${Date.now()}-${Math.random().toString(36).slice(2, 7)}@test.dev`;
  await page.goto("/registro");
  await page.getByLabel("Nombre").fill("Prueba");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Contraseña").fill("clave-de-prueba-e2e");
  await page.getByRole("button", { name: "Crear cuenta" }).click();
  await expect(page.getByRole("link", { name: "Estudiar" }).first()).toBeVisible();
  return email;
}

/** Responde la tarjeta actual escribiendo algo (o revelando) y confirma la calificación sugerida o «Bien». */
export async function answerCurrentCard(page: Page) {
  const reveal = page.getByRole("button", { name: /Mostrar respuesta/ });
  await expect(page.getByRole("button", { name: /Comprobar/ })).toBeVisible();
  if (await reveal.isVisible()) {
    await reveal.click();
  } else {
    const inputs = page.locator("main form input");
    const n = await inputs.count();
    if (n === 0) {
      // Orden de frase: pulsar la primera ficha disponible.
      await page.locator('main form [lang="de"] > button:not([aria-label^="Quitar"])').first().click();
    }
    for (let i = 0; i < n; i++) await inputs.nth(i).fill("respuesta");
    await page.getByRole("button", { name: /Comprobar/ }).click();
  }
  await expect(page.getByRole("group", { name: "Calificación" })).toBeVisible();
  await page.getByRole("button", { name: /^Bien/ }).click();
  await expect(page.getByRole("group", { name: "Calificación" })).toBeHidden();
}

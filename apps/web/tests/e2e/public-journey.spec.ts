import { expect, test } from "@playwright/test";

test("visitor understands the product and opens a public project", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Projetos encontram pessoas");
  const fundsMetric = page
    .getByLabel("Resumo do ciclo operacional")
    .locator(".hero-metrics > div")
    .filter({ hasText: "fundos movimentados" });
  await expect(fundsMetric.locator("strong")).toHaveText("0");
  await expect(fundsMetric.locator("span")).toHaveText("fundos movimentados");

  await page.getByRole("link", { name: "Explorar projetos" }).first().click();
  await expect(page).toHaveURL(/\/projects$/);
  await page.getByRole("link", { name: "Célula Zero — Solo fértil", exact: true }).click();
  await expect(page.getByText("Registro Original · imutável")).toBeVisible();
  await expect(page.getByRole("link", { name: "Exportar JSON" })).toBeVisible();
});

test("write route stays closed when local auth is not configured", async ({ page }) => {
  await page.goto("/projects/new");
  await expect(page.getByRole("heading", { name: "A criação de projeto exige o ambiente Supabase configurado." })).toBeVisible();
  await expect(page.getByText(/escrita atribuível nunca é habilitada/)).toBeVisible();
});

test("health endpoint states the economic and publication boundaries", async ({ request }) => {
  const response = await request.get("/api/health");
  expect(response.ok()).toBeTruthy();
  await expect(response.json()).resolves.toMatchObject({
    gate: 1,
    financialMovement: false,
    externalPublication: false,
  });
});

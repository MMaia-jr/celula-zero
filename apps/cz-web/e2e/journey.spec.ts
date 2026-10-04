// SPDX-License-Identifier: MPL-2.0
import { test, expect } from "@playwright/test";

test("legacy regression mode preserves authenticated identity and message/record boundaries", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByLabel("E-mail da sua conta")).toBeVisible();
  await page.getByLabel("E-mail da sua conta").fill("marcos@example.test");
  await page.getByLabel("Senha").fill("test-password");
  await page.getByRole("button", { name: "Entrar em Célula Zero" }).click();

  const bootstrap = page.getByRole("heading", { name: "Primeira entrada na Célula Zero" });
  const home = page.getByRole("heading", { name: /(Olá|Bem-vindo de volta), Marcos/ });
  await expect.poll(async () => await bootstrap.isVisible() || await home.isVisible()).toBe(true);
  if (await bootstrap.isVisible().catch(() => false)) {
    await expect(page.getByText(/não verifica sua identidade externamente/)).toBeVisible();
    await page.getByRole("button", { name: /Confirmar e inicializar minha presença/ }).click();
  }
  await expect(home).toBeVisible();
  const marker = "Mensagem normal " + Date.now();
  await page.getByLabel("Converse com Essenthius · o que você quer tornar possível agora?").fill(marker);
  const turnResponse = page.waitForResponse((response) => response.url().endsWith("/api/foundation") && response.request().method() === "POST");
  await page.getByRole("button", { name: /Enviar à Célula Zero/ }).click();
  expect((await turnResponse).ok()).toBe(true);

  const { view } = await (await page.request.get("/api/foundation", { headers: { "cache-control": "no-store" } })).json();
  expect(view.person.name).toBe("Marcos");
  expect(view.cell.name).toBe("Célula Zero");
  expect(view.conversationMessages).toContainEqual(expect.objectContaining({ body: marker, authorId: view.person.id }));
  expect(view.records.some((record: { kind: string; content?: string }) => record.kind === "OriginalRecord" && record.content === marker)).toBe(false);
  expect(view.intelligenceTurns).toContainEqual(expect.objectContaining({ humanMessageId: expect.any(String), threadId: "cell:" + view.cell.id }));
  expect(view.records.some((record: { kind: string; sourceMessageId?: string }) => record.kind === "Interpretation" && record.sourceMessageId === view.conversationMessages.find((message: { body: string }) => message.body === marker)?.id)).toBe(true);
});

test("rejects anonymous writes and client-supplied identity claims", async ({ request }) => {
  const anonymous = await request.post("/api/foundation", {
    headers: { Origin: "http://127.0.0.1:3089" },
    data: { action: "bootstrap", personId: "attacker" },
  });
  expect(anonymous.status()).toBe(401);
  const foreignOrigin = await request.post("/api/foundation", {
    headers: { Origin: "https://outside.example" },
    data: { action: "login", email: "marcos@example.test", password: "test-password" },
  });
  expect(foreignOrigin.status()).toBe(403);
});

test("keeps the server-rendered Home when the client application chunk cannot load", async ({ page }) => {
  await page.goto("/");
  await page.getByLabel("E-mail da sua conta").fill("marcos@example.test");
  await page.getByLabel("Senha").fill("test-password");
  await page.getByRole("button", { name: "Entrar em Célula Zero" }).click();
  const bootstrap = page.getByRole("heading", { name: "Primeira entrada na Célula Zero" });
  const home = page.getByRole("heading", { name: /(Olá|Bem-vindo de volta), Marcos/ });
  await expect.poll(async () => await bootstrap.isVisible() || await home.isVisible()).toBe(true);
  if (await bootstrap.isVisible().catch(() => false)) {
    await page.getByRole("button", { name: /Confirmar e inicializar minha presença/ }).click();
    await expect(home).toBeVisible();
  }
  await page.route("**/_next/static/chunks/app/**/page-*.js", (route) => route.abort());
  await page.reload();
  await expect(home).toBeVisible();
  await expect(page.getByRole("heading", { name: "Preparando sua entrada" })).toHaveCount(0);
  await expect(page.locator("body")).not.toBeEmpty();
});

test("times out session recovery with a clear retry path and preserves login as an option", async ({ page }) => {
  let recoveryRequests = 0;
  await page.route("**/api/foundation", async (route) => {
    recoveryRequests += 1;
    if (recoveryRequests === 1) await new Promise((resolve) => setTimeout(resolve, 12_000));
    try {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ view: null, authenticated: false, bootstrapRequired: false }) });
    } catch { /* The first request is expected to be aborted by the recovery timeout. */ }
  });
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Não conseguimos recuperar sua entrada" })).toBeVisible({ timeout: 13_000 });
  await expect(page.getByText(/Sua sessão e seus registros locais foram preservados/)).toBeVisible();
  await page.getByRole("button", { name: "Tentar recuperar novamente" }).click();
  await expect(page.getByRole("heading", { name: /O que você quer tornar possível/ })).toBeVisible();
  await expect(page.getByLabel("E-mail da sua conta")).toBeVisible();
  expect(recoveryRequests).toBeGreaterThanOrEqual(2);
});

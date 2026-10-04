// SPDX-License-Identifier: MPL-2.0
import { test, expect } from "@playwright/test";
test("Google is the normal login path and email link stays a collapsed fallback", async ({ page }) => {
  await page.goto("/login");
  await expect(page.getByRole("button", { name: "Continuar com Google" })).toBeVisible();
  await expect(page.getByLabel("E-mail autorizado")).toBeHidden();
  await page.getByText("Problemas com o Google? Usar link de e-mail como alternativa").click();
  await expect(page.getByLabel("E-mail autorizado")).toBeVisible();
  await expect(page.getByRole("button", { name: "Enviar link de fallback ↗" })).toBeVisible();
});

test("enter, produce profile/experience, persist, export, logout and return", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  await page.getByRole("button", { name: "Entrar como Marcos" }).click();
  await expect(
    page.getByRole("heading", { name: /Olá, Marcos/ }),
  ).toBeVisible();
  const marker = `Trabalho real ${Date.now()}`;
  await page.getByLabel("O que você quer registrar ou explorar?").fill(marker);
  await page.getByRole("button", { name: /Guardar para continuar/ }).click();
  await expect(page.getByRole("status")).toContainText("Salvo");
  await page.getByRole("link", { name: "Você", exact: true }).click();
  await page
    .getByLabel("Em poucas palavras")
    .fill("Aprendendo e construindo juntos");
  await page.getByRole("button", { name: "Salvar perfil" }).click();
  await expect(page.getByRole("status")).toContainText("Salvo");
  await page.getByLabel("Título da experiência").fill(marker);
  await page.getByLabel("Quando aconteceu?").fill("2026-09-29");
  await page
    .getByLabel("Conte o que aconteceu")
    .fill("Produzi uma proposta e aprendi com uma correção.");
  await page.getByRole("button", { name: "Guardar experiência" }).click();
  await expect(page.getByRole("heading", { name: marker })).toBeVisible();
  await page
    .getByLabel("Plataforma", { exact: true })
    .fill(`GitHub ${Date.now()}`);
  await page
    .getByLabel("Endereço do perfil")
    .fill("https://github.com/example");
  await page.getByRole("button", { name: "Guardar referência" }).click();
  await expect(
    page.getByText("Informada · titularidade não verificada").last(),
  ).toBeVisible();
  await page.reload();
  await expect(page.getByRole("heading", { name: marker })).toBeVisible();
  await page.getByRole("link", { name: "Células", exact: true }).click();
  await expect(
    page.getByText("Founder / Steward", { exact: true }),
  ).toBeVisible();
  await page
    .getByLabel("Propósito da célula")
    .fill("Construir e aprender com responsabilidade.");
  await page.getByRole("button", { name: "Atualizar propósito" }).click();
  await expect(page.getByRole("status")).toContainText("Salvo");
  await page.getByRole("link", { name: "Atividade", exact: true }).click();
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("link", { name: "Baixar meus registros" }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe("cz-foundation.json");
  const exported = await (
    await page.request.get("/api/foundation?export=1")
  ).json();
  expect(
    exported.records.some((r: { content?: string }) => r.content === marker),
  ).toBe(true);
  expect(exported.credentials).toBeUndefined();
  // UI logout must work on mobile too, via an accessible account control.
  await page.getByRole("button", { name: "Sair", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Entrar como Marcos" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Entrar como Marcos" }).click();
  await page.getByRole("link", { name: "Início", exact: true }).click();
  await expect(page.locator(".cards .record-text").filter({ hasText: marker })).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  expect(errors).toEqual([]);
});
test("rejects anonymous writes, foreign origin, and client authority claims", async ({
  request,
}) => {
  const command = { type: "intention", content: "not authorized" };
  const anon = await request.post("/api/foundation", {
    headers: { Origin: "http://127.0.0.1:3089" },
    data: { action: "command", command, key: "test-request-key-1234" },
  });
  expect(anon.status()).toBe(401);
  const csrf = await request.post("/api/foundation", {
    headers: { Origin: "https://outside.example" },
    data: { action: "enter" },
  });
  expect(csrf.status()).toBe(403);
  await request.post("/api/foundation", {
    headers: { Origin: "http://127.0.0.1:3089" },
    data: { action: "enter" },
  });
  const spoof = await request.post("/api/foundation", {
    headers: { Origin: "http://127.0.0.1:3089" },
    data: {
      action: "command",
      key: "test-request-key-1234",
      command: { ...command, actorId: "admin", origin: "verified" },
    },
  });
  expect(spoof.status()).toBe(400);
});

// SPDX-License-Identifier: MPL-2.0
import { expect, test } from "@playwright/test";

test("a confirmed work proposal reaches human result, learning and continuation", async ({ page }) => {
  await page.goto("/");
  if (await page.getByLabel("E-mail da sua conta").isVisible().catch(() => false)) {
    await page.getByLabel("E-mail da sua conta").fill("marcos@example.test");
    await page.getByLabel("Senha").fill("test-password");
    await page.getByRole("button", { name: "Entrar em Célula Zero" }).click();
  }
  const bootstrap = page.getByRole("heading", { name: "Primeira entrada na Célula Zero" });
  const returningHome = page.locator(".experience-v2").getByRole("heading", { name: /(?:Olá|Que bom que voltou), Marcos\./ });
  await expect.poll(async () => await bootstrap.isVisible() || await returningHome.isVisible()).toBe(true);
  if (await bootstrap.isVisible().catch(() => false)) {
    await page.getByRole("button", { name: /Confirmar e inicializar minha presença/ }).click();
    await expect(returningHome).toBeVisible();
  }
  const experience = page.locator(".experience-v2");
  await expect(experience.getByRole("region", { name: "Direção humana atual" })).toContainText("LOCAL / NÃO CANÔNICA");

  const beforeWorkCount = await page.evaluate(async () => (await (await fetch("/api/foundation")).json()).view.workItems.length);
  const humanText = "Quero transformar o próximo passo do Habitat em trabalho acompanhado. (" + Date.now() + ")";
  const turnResponse = page.waitForResponse((response) => {
    const body = response.request().postDataJSON() as { action?: string } | null;
    return response.url().endsWith("/api/foundation") && body?.action === "turn";
  });
  await experience.getByLabel("Converse com Essenthius").fill(humanText);
  await experience.getByRole("button", { name: "Enviar mensagem" }).click();
  const turnBody = await (await turnResponse).json();
  const dialogue = experience.getByRole("article").filter({ hasText: humanText });
  const proposal = dialogue.locator("form.inline-action").first();
  await expect(proposal.getByText("Posso transformar essa ideia em trabalho?")).toBeVisible();
  const createResponse = page.waitForResponse((response) => {
    const body = response.request().postDataJSON() as { action?: string } | null;
    return response.url().endsWith("/api/foundation") && body?.action === "confirm_action";
  });
  await proposal.getByRole("button", { name: "Criar trabalho" }).click();
  const created = await createResponse;
  const createdBody = await created.json();
  const workTitle = createdBody.view.workItems.at(-1).title as string;
  const workId = createdBody.view.workItems.at(-1).id as string;
  expect(turnBody.view.workItems).toHaveLength(beforeWorkCount);

  await page.getByRole("navigation", { name: "Navegação principal" }).getByRole("link", { name: "Células" }).click();
  const cell = experience.getByRole("region", { name: "Célula Célula Zero" });
  const work = cell.locator(".living-work").filter({ has: page.locator(`#entity-work-${workId}`) });
  await expect(work).toBeVisible();
  await work.getByRole("button", { name: "Registrar resultado" }).click();
  const completion = work.locator("form.work-completion-form");
  await completion.getByLabel("O que mudou ou foi produzido?").fill("A proposta foi confirmada e agora continua como trabalho atribuível.");
  await completion.getByLabel("O que você quer levar disso?").fill("A conversa natural pode iniciar trabalho sem apagar a necessidade de confirmação.");
  await completion.getByLabel(/reconhecimento ou gratidão/).fill("A continuidade ficou explícita.");
  await completion.getByLabel(/tensão continua/).fill("O próximo episódio ainda depende de uma escolha humana.");
  await completion.getByLabel(/tornar possível a seguir/).fill("Escolher qual parte do Habitat vale aprofundar.");
  const completeResponse = page.waitForResponse((response) => {
    const body = response.request().postDataJSON() as { command?: { type?: string } } | null;
    return response.url().endsWith("/api/foundation") && body?.command?.type === "work_complete";
  });
  await completion.getByRole("button", { name: "Registrar resultado e concluir" }).click();
  const completedView = (await (await completeResponse).json()).view;
  expect(completedView.workItems.find((item: { title: string; status: string }) => item.title === workTitle).status).toBe("complete");
  expect(completedView.records.some((record: { purpose?: string; content?: string }) => record.purpose === "learning" && record.content?.includes("A conversa natural"))).toBe(true);
  expect(completedView.records.some((record: { purpose?: string; content?: string }) => record.purpose === "next_possibility" && record.content?.includes("Escolher qual parte"))).toBe(true);

  const growthItem = cell.locator(`#growth-work-${workId}`);
  await expect(growthItem).toBeVisible();
  await growthItem.getByText("Algo ficou mais possível?").click();
  await growthItem.getByLabel("Que capacidade você quer reconhecer como possibilidade?").fill("Compor trabalho com continuidade humana");
  const candidateResponse = page.waitForResponse((response) => {
    const body = response.request().postDataJSON() as { action?: string; metabolism?: { type?: string } } | null;
    return response.url().endsWith("/api/foundation") && body?.action === "metabolism" && body.metabolism?.type === "capability_candidate_create";
  });
  await growthItem.getByRole("button", { name: "Preparar possibilidade" }).click();
  const candidateView = (await (await candidateResponse).json()).view;
  expect(candidateView.capabilityCandidates.at(-1).status).toBe("PROPOSED");
  const candidate = growthItem.locator(".growth-candidate");
  await expect(candidate).toContainText("ainda não é uma capacidade aceita nem verificada");
  const acceptResponse = page.waitForResponse((response) => {
    const body = response.request().postDataJSON() as { action?: string; metabolism?: { type?: string } } | null;
    return response.url().endsWith("/api/foundation") && body?.action === "metabolism" && body.metabolism?.type === "capability_candidate_decide";
  });
  await candidate.getByRole("button", { name: "Aceitar como relato não verificado" }).click();
  const acceptedCapabilityView = (await (await acceptResponse).json()).view;
  const acceptedCapability = acceptedCapabilityView.capabilities.find((item: { name: string }) => item.name === "Compor trabalho com continuidade humana");
  expect(acceptedCapability.provenance.origin).toBe("user_reported");
  expect(acceptedCapability.verificationIds).toEqual([]);
  await expect(growthItem).toContainText("Ainda não há verificação independente");

  await page.getByRole("navigation", { name: "Navegação principal" }).getByRole("link", { name: "Atividade" }).click();
  await expect(experience.locator(".feed-event").filter({ hasText: workTitle }).first()).toBeVisible();
  await expect(experience.locator(".feed-event").filter({ hasText: "A conversa natural pode iniciar trabalho" }).first()).toBeVisible();
  await page.reload();
  await expect(experience.getByRole("heading", { name: "Atividade" })).toBeVisible();
  await expect(experience.locator(".feed-event").filter({ hasText: "A conversa natural pode iniciar trabalho" }).first()).toBeVisible();
});

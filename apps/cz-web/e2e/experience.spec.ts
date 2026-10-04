// SPDX-License-Identifier: MPL-2.0
import { expect, test } from "@playwright/test";

test("the living CZ surface carries a real text meeting across navigation", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
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
    const bootstrapResponse = page.waitForResponse((response) => response.url().endsWith("/api/foundation") && response.request().method() === "POST");
    await page.getByRole("button", { name: /Confirmar e inicializar minha presença/ }).click();
    const response = await bootstrapResponse;
    expect(response.ok()).toBe(true);
    await page.waitForLoadState("load");
  }
  const experience = page.locator(".experience-v2");
  const activate = async (locator: import("@playwright/test").Locator) => {
    if (test.info().project.name === "mobile") await locator.tap(); else await locator.click();
    if (test.info().project.name === "mobile") {
      const noOverflow = async () => page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth);
      await expect.poll(noOverflow).toBe(true);
    }
  };
  await expect(returningHome).toBeVisible();
  await expect(experience.getByRole("heading", { name: /(?:Olá|Que bom que voltou), Marcos\./ })).toBeVisible();
  const directionCard = experience.getByRole("region", { name: "Direção humana atual" });
  await expect(directionCard).toContainText("D060 Genesis Operating Habitat Alpha");
  await expect(directionCard).toContainText("LOCAL / NÃO CANÔNICA");
  await page.screenshot({ path: `/tmp/cz-experience-v2-${test.info().project.name}.png`, fullPage: true });
  await expect(page.getByRole("navigation", { name: "Navegação principal" }).getByRole("link", { name: "Conversas" })).toBeVisible();
  if (test.info().project.name === "mobile") {
    const youLink = page.getByRole("navigation", { name: "Navegação principal" }).getByRole("link", { name: "Você" });
    await expect(youLink).toBeVisible();
    const bounds = await youLink.boundingBox();
    const viewportWidth = await page.evaluate(() => window.innerWidth);
    expect(bounds).not.toBeNull();
    expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(viewportWidth);
  }
  await expect(experience.locator(".companion-presence strong").filter({ hasText: "Essenthius" })).toBeVisible();
  await expect(experience.getByLabel("Converse com Essenthius")).toBeVisible();
  await expect(experience.getByText(/Mensagens continuam como conversa/)).toBeVisible();
  await expect(experience.getByText(/Sua fala fica como Original Record/)).toHaveCount(0);
  if (test.info().project.name === "mobile") await expect(experience.getByRole("button", { name: /Contexto vivo/ })).toBeVisible();
  const runMarker = `${test.info().project.name}-${Date.now()}`;
  const continuationMessage = `Quero continuar pensando no que importa agora (${runMarker}).`;
  await experience.getByLabel("Converse com Essenthius").fill(continuationMessage);
  await experience.getByRole("button", { name: "Enviar mensagem" }).click();
  const continuationTurn = experience.getByRole("article").filter({ hasText: continuationMessage });
  await expect(continuationTurn.getByText(/Marcos quer tornar algo possível/)).toBeVisible({ timeout: 10_000 });
  await activate(page.getByRole("navigation", { name: "Navegação principal" }).getByRole("link", { name: "Conversas" }));
  await expect(experience.locator(".dialogue-human p").filter({ hasText: continuationMessage }).first()).toBeVisible();
  await activate(page.getByRole("navigation", { name: "Navegação principal" }).getByRole("link", { name: "Início" }));
  await expect(experience.locator(".dialogue-human p").filter({ hasText: continuationMessage }).first()).toBeVisible();
  await expect(experience.getByLabel("Conversa com Essenthius").getByText("Quero entender o contexto e escolher uma próxima ação.", { exact: true })).toHaveCount(0);
  const beforeForumState = await page.evaluate(async () => (await (await fetch("/api/foundation")).json()).view);
  const forumMessage = `Quero registrar minha experiência com o XII Fórum de Agroecologia e ver o que isso pode tornar possível agora. (${runMarker})`;
  const forumTurnResponse = page.waitForResponse((response) => response.url().endsWith("/api/foundation") && response.request().method() === "POST" && response.request().postData()?.includes('"action":"turn"') === true);
  await experience.getByLabel("Converse com Essenthius").fill(forumMessage);
  await experience.getByRole("button", { name: "Enviar mensagem" }).click();
  const forumTurnResult = await forumTurnResponse;
  const forumTurnBody = await forumTurnResult.json();
  const forumTurn = experience.getByRole("article").filter({ hasText: forumMessage });
  const createdTurn = forumTurnBody.view.intelligenceTurns.find((turn: { id: string }) => turn.id === forumTurnBody.turnId);
  const sourceMessageId = forumTurnBody.view.conversationMessages.find((message: { id: string; body: string }) => message.id === createdTurn.humanMessageId).id;
  const experienceRecordFromThisMessage = forumTurnBody.view.records.filter((record: { kind: string; purpose?: string; content?: string }) => record.kind === "OriginalRecord" && record.purpose === "experience" && JSON.parse(record.content ?? "{}").sourceMessageId === sourceMessageId);
  expect(experienceRecordFromThisMessage).toHaveLength(0);
  expect(forumTurnBody.view.records.filter((record: { kind: string }) => record.kind === "Decision")).toHaveLength(beforeForumState.records.filter((record: { kind: string }) => record.kind === "Decision").length);
  expect(forumTurnBody.view.workItems).toHaveLength(beforeForumState.workItems.length);
  const experienceDraft = forumTurn.getByText("Uma experiência para revisar", { exact: true });
  await expect(experienceDraft).toBeVisible({ timeout: 10_000 });
  await expect(forumTurn.getByRole("complementary", { name: "Possibilidade para explorar" })).toContainText(/ainda não é compromisso/i);
  const experienceForm = forumTurn.locator("form.experience-draft");
  expect(await experienceForm.getByLabel("Quando aconteceu? (opcional)").getAttribute("required")).toBeNull();
  const acceptExperienceResponse = page.waitForResponse((response) => response.url().endsWith("/api/foundation") && response.request().method() === "POST" && response.request().postData()?.includes("experience_accept") === true);
  await experienceForm.getByRole("button", { name: "Confirmar e incluir em Você" }).click();
  const acceptedExperience = await acceptExperienceResponse;
  const acceptedExperienceBody = await acceptedExperience.json();
  expect(acceptedExperienceBody.view.experiences.find((item: { title: string }) => item.title === "XII Fórum de Agroecologia")?.occurredOn).toBeNull();
  await expect(page.getByRole("status").filter({ hasText: "Experiência registrada a partir da sua mensagem" })).toBeVisible();
  await activate(page.getByRole("navigation", { name: "Navegação principal" }).getByRole("link", { name: "Você" }));
  await expect(experience.getByText("XII Fórum de Agroecologia", { exact: true }).first()).toBeVisible();
  await activate(page.getByRole("navigation", { name: "Navegação principal" }).getByRole("link", { name: "Atividade" }));
  await expect(experience.locator(".feed-event").filter({ hasText: "XII Fórum de Agroecologia" }).first()).toBeVisible();
  await activate(page.getByRole("navigation", { name: "Navegação principal" }).getByRole("link", { name: "Início" }));
  const meetingProposalMessage = `Quero reunir Essenthius para pensar o próximo passo (${runMarker}).`;
  await experience.getByLabel("Conversa com Essenthius").getByLabel("Converse com Essenthius").fill(meetingProposalMessage);
  await experience.getByRole("button", { name: "Enviar mensagem" }).click();
  const meetingDraft = experience.locator("form.meeting-draft");
  await expect(meetingDraft.getByText("Posso abrir um encontro para esta conversa?")).toBeVisible({ timeout: 10_000 });
  const meetingCreateResponse = page.waitForResponse((response) => response.url().endsWith("/api/foundation") && response.request().method() === "POST" && response.request().postData()?.includes("meeting_create") === true);
  await meetingDraft.getByRole("button", { name: "Revisar e abrir encontro" }).click();
  const meetingCreated = await meetingCreateResponse;
  const createdMeetingId = (await meetingCreated.json()).view.meetings[0].id as string;
  await expect(page).toHaveURL(new RegExp(`/meetings\\?open=meeting%3A${createdMeetingId}$`));
  await expect(experience.locator(".meeting-heading h2")).toHaveText("Conversar com Essenthius");
  await page.reload();
  await expect(experience.locator(".meeting-heading h2")).toHaveText("Conversar com Essenthius");

  await activate(page.getByRole("navigation", { name: "Navegação principal" }).getByRole("link", { name: "Reuniões" }));
  await expect.poll(async () => await experience.locator(".meeting-heading h2").isVisible() || await experience.getByLabel("Dê um nome para este encontro").isVisible()).toBe(true);
  let originalTitle: string;
  if (await experience.locator(".meeting-heading h2").isVisible().catch(() => false)) {
    originalTitle = (await experience.locator(".meeting-heading h2").textContent()) ?? "Encontro existente";
  } else {
    originalTitle = `Encontro inicial ${Date.now()}`;
    await experience.getByLabel("Dê um nome para este encontro").fill(originalTitle);
    await experience.getByLabel("O que você quer pensar ou tornar possível?").fill("Pensar com Essenthius no próximo passo deste trabalho.");
    await experience.getByRole("button", { name: "Abrir encontro" }).click();
    await expect(experience.getByRole("heading", { name: originalTitle })).toBeVisible();
  }
  const newMeetingLink = experience.locator("a.meeting-new-link");
  await expect(newMeetingLink).toBeVisible();
  await activate(newMeetingLink);
  await expect(page).toHaveURL(/\/meetings\/new$/);
  await page.goBack();
  await expect(page).toHaveURL(/\/meetings$/);
  await expect(experience.getByRole("heading", { name: originalTitle })).toBeVisible();
  await page.goForward();
  await expect(page).toHaveURL(/\/meetings\/new$/);
  await page.reload();
  await expect(experience.getByLabel("Dê um nome para este encontro")).toBeVisible();
  await expect(experience.getByRole("link", { name: "Voltar ao encontro atual" })).toBeVisible();
  await activate(experience.getByRole("link", { name: "Voltar ao encontro atual" }));
  await expect(page).toHaveURL(/\/meetings$/);
  await expect(experience.getByRole("heading", { name: originalTitle })).toBeVisible();
  await activate(experience.locator("a.meeting-new-link"));
  await expect(experience.getByLabel("Dê um nome para este encontro")).toBeVisible();
  const title = `Habitat em conversa ${Date.now()}`;
  await experience.getByLabel("Dê um nome para este encontro").fill(title);
  await experience.getByLabel("O que você quer pensar ou tornar possível?").fill("Continuar o próximo passo com Essenthius.");
  await experience.getByRole("button", { name: "Abrir encontro" }).click();
  await expect(page).toHaveURL(/\/meetings$/);
  await expect(experience.getByRole("heading", { name: title })).toBeVisible();
  await expect(experience.locator(".participant-pill")).toHaveText(["MMarcos", "Essenthius"]);
  await expect(experience.getByText(/Áudio e vídeo não estão conectados/)).toBeVisible();

  const meetingConversationMessage = `Quero entender o contexto e escolher uma próxima ação (${runMarker}).`;
  await experience.getByLabel("Converse com Essenthius").fill(meetingConversationMessage);
  await experience.getByRole("button", { name: "Enviar mensagem" }).click();
  const meetingTurn = experience.locator(".meeting-conversation").getByRole("article").filter({ hasText: meetingConversationMessage });
  await expect(meetingTurn.getByText(/Marcos quer tornar algo possível/)).toBeVisible({ timeout: 10_000 });
  await expect(experience.getByText(/Revisar a intenção e/)).toBeVisible();

  await activate(page.getByRole("navigation", { name: "Navegação principal" }).getByRole("link", { name: "Células" }));
  await expect(experience.getByLabel("Célula Célula Zero").getByRole("heading", { name: "Célula Zero" })).toBeVisible();
  await expect(experience.locator(".companion-dock .companion-presence strong")).toHaveText("Essenthius está com você");
  await activate(page.getByRole("navigation", { name: "Navegação principal" }).getByRole("link", { name: "Reuniões" }));
  await expect(experience.getByRole("heading", { name: title })).toBeVisible();
  await expect(experience.getByRole("article").getByText(meetingConversationMessage)).toBeVisible();
  await expect(page.getByText(/Essenthius contextual/)).toHaveCount(0);

  await activate(page.getByRole("navigation", { name: "Navegação principal" }).getByRole("link", { name: "Descobrir" }));
  await expect(experience.getByRole("heading", { name: "Descobrir" })).toBeVisible();
  await expect(experience.locator(".companion-dock .companion-presence strong")).toHaveText("Essenthius está com você");
  await expect(experience.locator(".discovery-results .possibility").filter({ hasText: "VOCÊ ESTÁ AQUI" })).toBeVisible();
  await expect(experience.locator(".discovery-results .possibility").filter({ hasText: "ALGO QUE PODE AJUDAR" }).first()).toBeVisible();
  await expect(experience.locator(".discovery-results .possibility").getByText(/Disponível agora|Disponível quando você confirmar/).first()).toBeVisible();
  await expect(experience.locator(".capability-catalog").getByText(/outras capacidades/i)).toBeVisible();
  await expect(experience.getByLabel("O que você está buscando?")).toBeVisible();
  await expect(experience.getByText("CAPACIDADE ·", { exact: false })).toHaveCount(0);
  const connectedWorld = experience.getByRole("region", { name: "Serviços que podem participar" });
  await expect(connectedWorld.getByRole("heading", { name: "Conexões da Célula" })).toBeVisible();
  await expect(connectedWorld.getByText("GitHub", { exact: true })).toBeVisible();
  await expect(connectedWorld.getByText("Linear", { exact: true })).toBeVisible();
  await expect(connectedWorld.getByText("Google", { exact: true })).toBeVisible();
  await expect(connectedWorld.getByText("Ainda não conectado", { exact: true })).toHaveCount(3);
  await expect(connectedWorld).not.toContainText("private-keychain-locator");
  const githubConnection = connectedWorld.locator(".connected-provider").filter({ hasText: "GitHub" });
  await githubConnection.locator(":scope > summary").click();
  await githubConnection.getByText("Ver acessos, autoridade e limites", { exact: true }).click();
  await expect(githubConnection).toContainText("Estado: Ainda não conectada");
  await expect(githubConnection).toContainText("Destino exigido: repository");
  await expect(githubConnection).toContainText("Classe de custo/uso: external billing unknown");
  await expect(githubConnection).not.toContainText("not configured");

  await activate(page.getByRole("navigation", { name: "Navegação principal" }).getByRole("link", { name: "Atividade" }));
  await expect(experience.getByRole("heading", { name: "Um encontro começou" }).first()).toBeVisible();
  await expect(experience.locator(".companion-dock .companion-presence strong")).toHaveText("Essenthius está com você");
  await expect(experience.getByText(/O feed não substitui o registro original/)).toHaveCount(0);

  await activate(page.getByRole("navigation", { name: "Navegação principal" }).getByRole("link", { name: "Você" }));
  await expect(experience.getByRole("heading", { name: "Marcos" })).toBeVisible();
  await expect(experience.locator(".companion-dock .companion-presence strong")).toHaveText("Essenthius está com você");
  await expect(experience.getByText(/Sua presença, suas relações/)).toBeVisible();

  await activate(page.getByRole("navigation", { name: "Navegação principal" }).getByRole("link", { name: "Reuniões" }));
  await expect(experience.getByRole("heading", { name: title })).toBeVisible();
  await experience.getByRole("button", { name: "Encerrar", exact: true }).click();
  await expect(experience.locator(".meeting-state")).toHaveText("Encerrado");
  await activate(experience.locator("a.meeting-new-link"));
  await expect(page).toHaveURL(/\/meetings\/new$/);
  const nextTitle = `Novo encontro após encerrar ${Date.now()}`;
  await experience.getByLabel("Dê um nome para este encontro").fill(nextTitle);
  await experience.getByLabel("O que você quer pensar ou tornar possível?").fill("Abrir uma conversa nova sem alterar o encontro anterior.");
  await experience.getByRole("button", { name: "Abrir encontro" }).click();
  await expect(experience.getByRole("heading", { name: nextTitle })).toBeVisible();
  await activate(page.getByRole("navigation", { name: "Navegação principal" }).getByRole("link", { name: "Início" }));
  await expect(experience.getByLabel("Conversa com Essenthius").getByText(meetingConversationMessage, { exact: true })).toHaveCount(0);
  await expect(errors).toEqual([]);
});

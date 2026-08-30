import { expect, test, type APIRequestContext } from "@playwright/test";

const pilotEmail = "pilot@celulazero.local";
const mailpitUrl = process.env.LOCAL_MAILPIT_URL ?? "http://127.0.0.1:54324";
const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://127.0.0.1:3000";

interface MailpitMessage {
  HTML?: string;
  Text?: string;
  To?: Array<{ Address?: string }>;
}

function extractMagicLink(message: MailpitMessage) {
  const content = `${message.HTML ?? ""}\n${message.Text ?? ""}`;
  const href = content.match(/href=["']([^"']*\/auth\/v1\/verify[^"']*)["']/i)?.[1];
  const plain = content.match(/https?:\/\/[^\s<>"']*\/auth\/v1\/verify[^\s<>"']*/i)?.[0];
  return (href ?? plain ?? "").replaceAll("&amp;", "&");
}

async function latestMagicLink(request: APIRequestContext) {
  const response = await request.get(`${mailpitUrl}/api/v1/message/latest`);
  if (!response.ok()) return "";

  const message = (await response.json()) as MailpitMessage;
  const addressedToPilot = message.To?.some(
    ({ Address }) => Address?.toLowerCase() === pilotEmail,
  );

  return addressedToPilot ? extractMagicLink(message) : "";
}

async function loginAsPilot(page: import("@playwright/test").Page, request: APIRequestContext) {
  await page.goto("/login?next=/company-core");
  await expect(page.getByRole("heading", { name: "Entre quando houver uma razão para agir." })).toBeVisible();

  await page.getByLabel("E-mail").fill(pilotEmail);
  await page.getByRole("button", { name: "Continuar por e-mail" }).click();
  await expect(page.getByRole("status")).toContainText("Link emitido");

  let magicLink = "";
  await expect
    .poll(
      async () => {
        magicLink = await latestMagicLink(request);
        return magicLink;
      },
      { message: "o Mailpit local deve receber o link mágico do piloto", timeout: 15_000 },
    )
    .toMatch(/^http:\/\/127\.0\.0\.1:54321\/auth\/v1\/verify\?/);

  await page.goto(magicLink);
  await expect(page).toHaveURL(`${siteUrl}/company-core`, { timeout: 15_000 });
}

test("COMPANY CORE V0.1 founder traverses full cycle including mocked AI failure path", async ({
  page,
  request,
}) => {
  await loginAsPilot(page, request);

  // 1. Create Need
  await page.getByRole("link", { name: /Criar need da empresa|Create company need/ }).click();
  await expect(page).toHaveURL(/\/company-core\/new$/);

  const needTitle = `Need Company Core v0.1 ${Date.now()}`;
  await page.getByLabel(/Título da Need|Need title/).fill(needTitle);
  await page
    .getByLabel(/Qual é o problema ou need\?|What is the problem or need\?/)
    .fill("Com o Company Core v0.1 operacional, qual ação concreta aumenta a capacidade econômica?");
  await page
    .getByLabel(/Resultado desejado|Desired result/)
    .fill("Recomendação acionável com ação principal, benefício, pressupostos, custo, teste barato, falsificador e primeiro passo.");
  await page.getByLabel(/Contexto|Context/).fill("Contexto de teste E2E determinístico.");
  await page.getByLabel(/Prioridade|Priority/).selectOption("HIGH");
  await page.getByRole("button", { name: /Criar Need|Create Need/ }).click();

  await expect(page).toHaveURL(/\/company-core\/[0-9a-f-]+$/);
  const cycleUrl = page.url();


  await expect(page.getByRole("heading", { level: 1, name: needTitle })).toBeVisible();
  await expect(page.getByText("Need criada")).toBeVisible();

  // 2. Define Agreement
  await page.getByLabel(/Resultado esperado|Expected result/).fill("Recomendação acionável validada.");
  await page.getByLabel(/Escopo|Scope/).fill("Análise de próxima ação dentro de recursos atuais.");
  await page
    .getByLabel(/Critério de avaliação|Evaluation criterion/)
    .fill("Permite ao fundador aceitar, rejeitar ou modificar sem nova arquitetura.");
  await page.getByRole("button", { name: /Definir Acordo|Define Agreement/ }).click();

  await expect(page.getByText("Acordo definido")).toBeVisible();

  // 3. Authorize AI Work (will fail because Gateway is not configured in test env)
  await page.getByRole("button", { name: /Autorizar e Executar|Authorize & Execute/ }).click();

  // After failure, cycle should be in AI_FAILED state
  await expect(page.getByText("COMPANY CORE v0.1 · IA falhou", { exact: true })).toBeVisible();

  // 4. Record Result anyway
  await page.getByLabel(/Conteúdo do resultado|Result content/).fill("Resultado de teste E2E determinístico.");
  await page.getByRole("button", { name: /Registrar Resultado|Record Result/ }).click();

  await expect(page.getByText("Resultado registrado")).toBeVisible();

  // 5. Record Evaluation
  await page.getByLabel(/Veredicto|Verdict/).selectOption("USEFUL");
  await page.getByLabel(/Fundamento|Rationale/).fill("O teste E2E verificou o ciclo completo.");
  await page.getByRole("button", { name: /Registrar Avaliação|Record Evaluation/ }).click();

  await expect(page.getByText("Avaliação registrada")).toBeVisible();

  // 6. Record Consequence
  await page.getByLabel(/Tipo de consequência|Consequence type/).selectOption("TIME_SAVED");
  await page.getByLabel(/Descrição|Description/).fill("O ciclo Company Core v0.1 funcionou localmente.");
  await page.getByLabel(/Tempo do fundador|Founder time/).fill("15");
  await page.getByRole("button", { name: /Registrar Consequência|Record Consequence/ }).click();

  await expect(page.getByText("Consequência registrada")).toBeVisible();

  // 7. Verify lineage is reconstructible
  await page.reload();
  await expect(page.getByRole("heading", { level: 1, name: needTitle })).toBeVisible();
  await expect(page.getByText("Consequência registrada")).toBeVisible();
  await expect(page.getByText("USEFUL")).toBeVisible();
  await expect(page.getByText("TIME_SAVED")).toBeVisible();

  // Verify navigation from list
  await page.goto("/company-core");
  await expect(page.getByRole("link", { name: needTitle })).toBeVisible();
  await page.getByRole("link", { name: needTitle }).click();
  await expect(page).toHaveURL(cycleUrl);
});

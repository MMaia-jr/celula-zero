import { expect, test, type APIRequestContext } from "@playwright/test";

const pilotEmail = "pilot@celulazero.local";
const mailpitUrl = process.env.LOCAL_MAILPIT_URL ?? "http://127.0.0.1:54324";
const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://127.0.0.1:3000";

// Authenticated end-to-end journey owns its project fixture.
test.setTimeout(60_000);

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

test("COMPANY CORE V0.1 founder reaches durable AI queue authorization boundary", async ({
  page,
  request,
}) => {
  await loginAsPilot(page, request);

  // SELF-CONTAINED PROJECT FIXTURE
  //
  // This authenticated journey owns its project precondition instead of
  // depending on another Playwright spec having run first.
  await page.goto("/projects/new");
  await expect(
    page.getByRole("heading", {
      name: "Crie um projeto com intenção e limites explícitos.",
    }),
  ).toBeVisible({ timeout: 15_000 });

  const projectSuffix = `${Date.now()}`;
  const projectTitle = `Projeto Company Core E2E ${projectSuffix}`;

  await page.getByLabel("Título").fill(projectTitle);
  await page
    .getByLabel("Resumo público")
    .fill("Projeto local criado pelo próprio teste autenticado do Company Core.");
  await page
    .getByLabel("Registro Original")
    .fill("Preservar uma origem verificável para o ciclo Company Core E2E.");
  await page
    .getByLabel("Interpretação atual")
    .fill("Verificar o Company Core sem dependência de ordem entre specs.");
  await page
    .getByLabel("Resultado pretendido")
    .fill("O fundador consegue abrir uma Need no projeto que acabou de criar.");
  await page
    .getByLabel("Necessidades atuais")
    .fill("coordenação, teste determinístico, capacidade");
  await page
    .getByLabel("Regras e limites")
    .fill("Stack local; nenhuma chamada de provider; nenhuma publicação externa.");

  await expect(page.getByLabel("Publicar após criar")).toBeChecked();

  await page.getByRole("button", { name: "Criar projeto" }).click();

  await expect(page).toHaveURL(
    /\/projects\/(?!new$)[a-z0-9-]+$/,
    { timeout: 15_000 },
  );
  await expect(
    page.getByRole("heading", { level: 1, name: projectTitle }),
  ).toBeVisible();

  await page.goto("/company-core");

  // 1. Create Need
  await page.getByRole("link", { name: /Criar need da empresa|Create company need/ }).click();
  await expect(page).toHaveURL(/\/company-core\/new$/);

  const projectSelect = page.getByRole("combobox", {
    name: /^(Projeto|Project)$/,
  });
  await expect(projectSelect.locator("option:checked")).toHaveText(projectTitle);

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

  // 3. The new contract is durable authorization + queue, not a synchronous
  // Gateway call inside the web request. A clean CI seed has no sponsored
  // pool, so provider execution must remain impossible rather than silently
  // creating an unfunded Job.
  await expect(
    page.getByLabel(/Fundo de orçamento patrocinado|Sponsored budget pool/),
  ).toBeVisible();
  await expect(
    page.getByLabel(/Reserva patrocinada \(USD\)|Sponsored reservation \(USD\)/),
  ).toBeVisible();

  const authorizeButton = page.getByRole("button", {
    name: /Autorizar e Enfileirar Trabalho de IA|Authorize & Queue AI Work/,
  });
  await expect(authorizeButton).toBeDisabled();

  await expect(
    page.getByText(/Nenhuma execução de IA ainda\.|No AI execution yet\./),
  ).toBeVisible();

  // 4. Persisted state remains reconstructible after the boundary is reached.
  await page.reload();
  await expect(page).toHaveURL(cycleUrl);
  await expect(page.getByRole("heading", { level: 1, name: needTitle })).toBeVisible();
  await expect(page.getByText("Acordo definido")).toBeVisible();

  await page.goto("/company-core");
  await expect(page.getByRole("link", { name: needTitle })).toBeVisible();
  await page.getByRole("link", { name: needTitle }).click();
  await expect(page).toHaveURL(cycleUrl);
});

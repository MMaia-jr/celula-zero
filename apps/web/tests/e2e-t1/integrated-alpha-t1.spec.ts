import {
  expect,
  test,
  type APIRequestContext,
  type BrowserContext,
  type Page,
} from "@playwright/test";

const siteUrl = process.env.T1_SITE_URL ?? "http://127.0.0.1:3100";
const mailpitUrl = process.env.LOCAL_MAILPIT_URL ?? "http://127.0.0.1:61324";
const supabaseApiUrl =
  process.env.LOCAL_SUPABASE_API_URL ?? "http://127.0.0.1:61321";

interface MailpitMessage {
  HTML?: string;
  Text?: string;
  To?: Array<{ Address?: string }>;
}

interface ActivityStreamsCollection {
  "@context"?: string;
  type?: string;
  totalItems?: number;
  orderedItems?: Array<{
    type?: string;
    summary?: string;
    payload?: unknown;
  }>;
}

function extractMagicLink(message: MailpitMessage) {
  const content = `${message.HTML ?? ""}\n${message.Text ?? ""}`;
  const href = content.match(
    /href=["']([^"']*\/auth\/v1\/verify[^"']*)["']/i,
  )?.[1];
  const plain = content.match(
    /https?:\/\/[^\s<>"']*\/auth\/v1\/verify[^\s<>"']*/i,
  )?.[0];
  return (href ?? plain ?? "").replaceAll("&amp;", "&");
}

async function latestMagicLink(
  request: APIRequestContext,
  email: string,
) {
  const response = await request.get(`${mailpitUrl}/api/v1/message/latest`);
  if (!response.ok()) return "";

  const message = (await response.json()) as MailpitMessage;
  const addressedToUser = message.To?.some(
    ({ Address }) => Address?.toLowerCase() === email.toLowerCase(),
  );

  return addressedToUser ? extractMagicLink(message) : "";
}

async function signIn(
  page: Page,
  request: APIRequestContext,
  email: string,
  next = "/me",
) {
  await page.goto(`/login?next=${encodeURIComponent(next)}`);
  await page.locator('input[name="email"]').fill(email);
  await page.getByRole("button", { name: "Continuar por e-mail" }).click();
  await expect(page.getByRole("status")).toContainText("Link emitido");

  let magicLink = "";
  await expect
    .poll(
      async () => {
        magicLink = await latestMagicLink(request, email);
        return magicLink;
      },
      {
        message: `Mailpit deve receber o link mágico de ${email}`,
        timeout: 20_000,
      },
    )
    .toMatch(new RegExp(`^${supabaseApiUrl.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}/auth/v1/verify\\?`));

  await page.goto(magicLink);
  await expect(page).toHaveURL(`${siteUrl}${next}`, { timeout: 20_000 });
}

async function publishProfile(
  page: Page,
  handle: string,
  displayName: string,
) {
  await page.goto("/me");
  await page.getByLabel("Handle").fill(handle);
  await page.getByLabel("Nome exibido").fill(displayName);
  await page
    .getByLabel("Bio")
    .fill("Participante local do Integrated Alpha T1; apresentação não equivale a reputação.");
  await page.getByLabel("Visibilidade").selectOption("PUBLIC");
  await page.getByRole("button", { name: "Salvar Profile" }).click();
  await expect(page).toHaveURL(/\/me\?profile=updated$/, { timeout: 15_000 });
  await expect(page.getByRole("status")).toContainText("Profile atualizado");
}

async function newContextPage(context: BrowserContext) {
  const page = await context.newPage();
  page.setDefaultTimeout(15_000);
  return page;
}

test("T1 integrated two-identity journey reaches a comprehensible Commitment without Workbench", async ({
  browser,
  request,
}) => {
  const suffix = `${Date.now()}`.slice(-9);
  const stewardEmail = `t1-steward-${suffix}@celulazero.local`;
  const proposerEmail = `t1-proposer-${suffix}@celulazero.local`;
  const stewardHandle = `steward-${suffix}`;
  const proposerHandle = `proposer-${suffix}`;

  const stewardContext = await browser.newContext();
  const proposerContext = await browser.newContext();
  const steward = await newContextPage(stewardContext);
  const proposer = await newContextPage(proposerContext);

  await signIn(steward, request, stewardEmail);
  await publishProfile(steward, stewardHandle, "Steward T1");

  await steward.goto("/projects/new");
  const title = `Projeto Integrated T1 ${suffix}`;
  const originalIntent =
    "Testar uma jornada social de coordenação inteira sem Workbench, SQL ou terminal para o participante.";
  await steward.getByLabel("Título").fill(title);
  await steward
    .getByLabel("Resumo público")
    .fill("Duas identidades formam um Commitment a partir de uma Need real e observável.");
  await steward.getByLabel("Registro Original").fill(originalIntent);
  await steward
    .getByLabel("Interpretação atual")
    .fill("Precisamos verificar a experiência integrada T1 pela interface pública.");
  await steward
    .getByLabel("Resultado pretendido")
    .fill("Um Commitment compreensível entre duas identidades, com atividade social derivada.");
  await steward
    .getByLabel("Necessidades atuais")
    .fill("coordenação, revisão externa, experiência habitável");
  await steward
    .getByLabel("Regras e limites")
    .fill("Local only; sem pagamento, reputação universal, deploy ou contato externo.");
  await steward.getByRole("button", { name: "Criar projeto" }).click();

  await expect
    .poll(
      () => new URL(steward.url()).pathname,
      {
        message: "project creation must leave the reserved /projects/new route",
        timeout: 20_000,
      },
    )
    .toMatch(/^\/projects\/(?!new$)[a-z0-9-]+$/);
  const projectUrl = new URL(steward.url());
  const projectPath = projectUrl.pathname;
  const projectSlug = projectPath.split("/").pop();
  expect(projectSlug).toBeTruthy();
  await expect(steward.getByRole("heading", { level: 1, name: title })).toBeVisible();
  await expect(steward.getByRole("link", { name: "Atividade" })).toBeVisible();

  await steward.getByRole("link", { name: "Expressar Need" }).click();
  await expect(steward).toHaveURL(`${siteUrl}${projectPath}/needs/new`);
  const needTitle = `Need integrada ${suffix}`;
  await steward.getByLabel("Título da Need").fill(needTitle);
  await steward
    .getByLabel("O que está faltando ou precisa mudar?")
    .fill("Precisamos de uma segunda identidade capaz de avaliar e propor uma entrega delimitada.");
  await steward
    .getByLabel("Contexto (opcional)")
    .fill("A Need deve continuar distinta da Opportunity.");
  await expect(steward.getByLabel("Publicar agora")).toBeChecked();
  await steward.getByRole("button", { name: "Criar Need" }).click();

  await expect(steward).toHaveURL(
    new RegExp(`${projectPath.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\?need=published$`),
    { timeout: 15_000 },
  );
  const needLink = steward.getByRole("link", { name: needTitle }).first();
  await expect(needLink).toBeVisible();
  await needLink.click();
  await expect(steward).toHaveURL(/\/needs\/[0-9a-f-]{36}$/);
  const needPath = new URL(steward.url()).pathname;

  await steward
    .getByRole("link", { name: "Transformar esta Need em Opportunity" })
    .click();
  await expect(steward).toHaveURL(
    new RegExp(`${projectPath.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}/opportunities/new\\?need=`),
  );

  const opportunityTitle = `Opportunity integrada ${suffix}`;
  await steward.getByLabel("Título").fill(opportunityTitle);
  await steward
    .getByLabel("Sobre o que alguém pode agir?")
    .fill("Revisar a jornada integrada e produzir observações reproduzíveis.");
  await steward
    .getByLabel("Condições")
    .fill("A entrega deve permanecer limitada ao escopo publicado e às versões explícitas.");
  await steward
    .getByLabel("Resultado esperado")
    .fill("Uma revisão clara que possa ser aceita como Commitment sem implicar execução.");
  await steward.getByLabel("Capacidade").fill("1");
  await expect(steward.getByLabel("Publicar agora")).toBeChecked();
  await steward.getByRole("button", { name: /Criar opportunity/i }).click();

  await expect(steward).toHaveURL(
    /\/projects\/[a-z0-9-]+\/opportunities\/[0-9a-f-]{36}\?coordination=published$/,
    { timeout: 20_000 },
  );
  const opportunityPath = new URL(steward.url()).pathname;
  await expect(
    steward.getByRole("heading", { level: 1, name: opportunityTitle }),
  ).toBeVisible();
  await expect(steward.getByText("Need ≠ Opportunity", { exact: true })).toBeVisible();

  await signIn(proposer, request, proposerEmail);
  await publishProfile(proposer, proposerHandle, "Proposer T1");

  await proposer.goto(`/people/${stewardHandle}`);
  await proposer.getByRole("button", { name: "Seguir" }).click();
  await expect(proposer).toHaveURL(/\/people\/.*\?follow=started$/);
  await expect(
    proposer.getByRole("button", { name: "Seguindo · deixar de seguir" }),
  ).toBeVisible();

  await proposer.goto(projectPath);
  await proposer.getByRole("button", { name: "Seguir" }).click();
  await expect(proposer).toHaveURL(/\?follow=started$/);

  await proposer.goto(needPath);
  await proposer.getByRole("button", { name: "Seguir" }).click();
  await expect(proposer).toHaveURL(/\?follow=started$/);

  await proposer.goto(opportunityPath);
  await proposer.getByRole("link", { name: "Fazer uma proposta" }).click();
  await expect(proposer).toHaveURL(`${siteUrl}${opportunityPath}/propose`);

  await proposer
    .getByLabel("O que você propõe fazer?")
    .fill("Vou revisar a jornada como segunda identidade e registrar ambiguidades observáveis.");
  await proposer
    .getByLabel("Suas condições")
    .fill("Somente o escopo publicado; nenhuma autoridade adicional é presumida.");
  await proposer
    .getByLabel("Entrega esperada")
    .fill("Lista reproduzível de passos, fricções e pontos compreensíveis da experiência.");
  await proposer
    .getByLabel("Expectativa econômica")
    .fill("Voluntário; nenhum direito econômico retroativo.");
  await proposer.getByRole("button", { name: "Enviar Proposal" }).click();

  await expect(proposer).toHaveURL(
    `${siteUrl}${opportunityPath}?coordination=proposal-submitted`,
    { timeout: 15_000 },
  );
  await expect(proposer.getByText("PROPOSAL · SUBMITTED")).toBeVisible();

  await steward.goto(opportunityPath);
  await expect(steward.getByText("PROPOSAL · SUBMITTED")).toBeVisible();
  await steward
    .getByLabel("O que deve ser revisado?")
    .fill("Explicite que a observação será reproduzível e limitada à experiência T1.");
  await steward.getByRole("button", { name: "Solicitar revisão" }).click();
  await expect(steward).toHaveURL(
    `${siteUrl}${opportunityPath}?coordination=revision-requested`,
  );

  await proposer.goto(opportunityPath);
  await expect(proposer.getByText("PROPOSAL · REVISION_REQUESTED")).toBeVisible();
  await proposer
    .getByLabel("Proposal revisada")
    .fill("Vou revisar a experiência T1 e registrar passos reproduzíveis, fricções e limites observados.");
  await proposer.getByRole("button", { name: "Enviar revisão imutável" }).click();
  await expect(proposer).toHaveURL(
    `${siteUrl}${opportunityPath}?coordination=revision-submitted`,
  );
  await expect(proposer.getByText("PROPOSAL · SUBMITTED")).toBeVisible();
  await expect(proposer.getByText("v2", { exact: true })).toBeVisible();

  await steward.goto(opportunityPath);
  await expect(steward.getByText("PROPOSAL · SUBMITTED")).toBeVisible();
  await steward
    .getByLabel("Razão da aceitação")
    .fill("As versões exatas agora descrevem um acordo delimitado e compreensível.");
  await steward.getByRole("button", { name: "Aceitar versões exatas" }).click();

  await expect(steward).toHaveURL(
    /\/commitments\/[0-9a-f-]{36}\?coordination=accepted$/,
    { timeout: 20_000 },
  );
  const commitmentPath = new URL(steward.url()).pathname;
  await expect(
    steward.getByText("Commitment ≠ Contribution ≠ Evidence ≠ Outcome"),
  ).toBeVisible();
  await expect(steward.getByText("Opportunity", { exact: true })).toBeVisible();
  await expect(steward.getByText("Proposal", { exact: true })).toBeVisible();

  await proposer.goto(commitmentPath);
  await expect(
    proposer.getByText("Commitment ≠ Contribution ≠ Evidence ≠ Outcome"),
  ).toBeVisible();

  await proposer.goto("/activity");
  await expect(
    proposer.getByRole("heading", {
      name: "Atividade derivada da coordenação real.",
    }),
  ).toBeVisible();
  await expect(proposer.getByText("NEED_PUBLISHED").first()).toBeVisible();
  await expect(proposer.getByText("OPPORTUNITY_PUBLISHED").first()).toBeVisible();
  await expect(proposer.getByText("PROPOSAL_SUBMITTED").first()).toBeVisible();
  await expect(proposer.getByText("FOLLOW_STARTED").first()).toBeVisible();

  const authenticatedAs2 = await proposer.evaluate(async () => {
    const response = await fetch("/api/activity");
    return (await response.json()) as ActivityStreamsCollection;
  });
  expect(authenticatedAs2["@context"]).toBe(
    "https://www.w3.org/ns/activitystreams",
  );
  expect(authenticatedAs2.type).toBe("OrderedCollection");
  expect(authenticatedAs2.orderedItems?.some(({ type }) => type === "Accept")).toBe(true);
  expect(
    authenticatedAs2.orderedItems?.some((activity) =>
      Object.prototype.hasOwnProperty.call(activity, "payload"),
    ),
  ).toBe(false);

  const anonymousContext = await browser.newContext();
  const anonymous = await newContextPage(anonymousContext);

  await anonymous.goto(`/people/${stewardHandle}`);
  await expect(
    anonymous.getByRole("heading", { level: 1, name: "Steward T1" }),
  ).toBeVisible();

  await anonymous.goto(projectPath);
  await expect(anonymous.getByRole("heading", { level: 1, name: title })).toBeVisible();

  await anonymous.goto(needPath);
  await expect(anonymous.getByRole("heading", { level: 1, name: needTitle })).toBeVisible();

  await anonymous.goto("/activity");
  await expect(anonymous.getByText("NEED_PUBLISHED").first()).toBeVisible();
  await expect(anonymous.getByText("OPPORTUNITY_PUBLISHED").first()).toBeVisible();
  await expect(anonymous.getByText("PROPOSAL_SUBMITTED")).toHaveCount(0);
  await expect(anonymous.getByText("FOLLOW_STARTED")).toHaveCount(0);

  const anonymousAs2 = await anonymous.evaluate(async () => {
    const response = await fetch("/api/activity");
    return (await response.json()) as ActivityStreamsCollection;
  });
  expect(anonymousAs2.type).toBe("OrderedCollection");
  expect(
    anonymousAs2.orderedItems?.some(({ summary }) =>
      summary?.includes("Proposal"),
    ),
  ).toBe(false);
  expect(
    anonymousAs2.orderedItems?.some(({ type }) => type === "Follow"),
  ).toBe(false);

  await anonymous.goto(commitmentPath);
  await expect(anonymous).toHaveURL(
    new RegExp(`/login\\?next=${encodeURIComponent(commitmentPath)}`),
  );

  expect(projectPath).not.toContain("/workbench");
  expect(needPath).not.toContain("/workbench");
  expect(opportunityPath).not.toContain("/workbench");
  expect(commitmentPath).not.toContain("/workbench");

  await anonymousContext.close();
  await proposerContext.close();
  await stewardContext.close();
});

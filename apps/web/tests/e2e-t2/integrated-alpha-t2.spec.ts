import {
  expect,
  test,
  type APIRequestContext,
  type BrowserContext,
  type Page,
} from "@playwright/test";

const siteUrl = process.env.T2_SITE_URL ?? "http://127.0.0.1:3900";
const mailpitUrl = process.env.LOCAL_MAILPIT_URL ?? "http://127.0.0.1:59324";
const supabaseApiUrl =
  process.env.LOCAL_SUPABASE_API_URL ?? "http://127.0.0.1:59321";

interface MailpitMessage {
  HTML?: string;
  Text?: string;
  To?: Array<{ Address?: string }>;
}

interface ActivityStreamsCollection {
  "@context"?: string;
  type?: string;
  orderedItems?: Array<{
    type?: string;
    summary?: string;
    payload?: unknown;
  }>;
}

interface ProvProjection {
  "@context"?: { prov?: string; as?: string; cz?: string };
  "@graph"?: Array<Record<string, unknown>>;
  "cz:projectionNotice"?: string;
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

async function latestMagicLink(request: APIRequestContext, email: string) {
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
      { message: `Mailpit deve receber link de ${email}`, timeout: 25_000 },
    )
    .toMatch(
      new RegExp(
        `^${supabaseApiUrl.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}/auth/v1/verify\\?`,
      ),
    );

  await page.goto(magicLink);
  await expect(page).toHaveURL(`${siteUrl}${next}`, { timeout: 25_000 });
}

async function publishProfile(page: Page, handle: string, displayName: string) {
  await page.goto("/me");
  await page.getByLabel("Handle").fill(handle);
  await page.getByLabel("Nome exibido").fill(displayName);
  await page
    .getByLabel("Bio")
    .fill("Participante sintético local do Integrated Alpha T2; Profile não equivale a reputação.");
  await page.getByLabel("Visibilidade").selectOption("PUBLIC");
  await page.getByRole("button", { name: "Salvar Profile" }).click();
  await expect(page).toHaveURL(/\/me\?profile=updated$/, { timeout: 20_000 });
}

async function pageFor(context: BrowserContext) {
  const page = await context.newPage();
  page.setDefaultTimeout(20_000);
  return page;
}

function escaped(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

test("T2 integrated three-identity journey reaches Decision, explicit Outcome, History and PROV without Workbench", async ({
  browser,
  request,
}) => {
  const suffix = `${Date.now()}`.slice(-9);
  const stewardEmail = `t2-steward-${suffix}@celulazero.local`;
  const contributorEmail = `t2-contributor-${suffix}@celulazero.local`;
  const reviewerEmail = `t2-reviewer-${suffix}@celulazero.local`;
  const stewardHandle = `t2-steward-${suffix}`;
  const contributorHandle = `t2-contributor-${suffix}`;
  const reviewerHandle = `t2-reviewer-${suffix}`;

  const stewardContext = await browser.newContext({ locale: "pt-BR" });
  const contributorContext = await browser.newContext({ locale: "pt-BR" });
  const reviewerContext = await browser.newContext({ locale: "pt-BR" });
  const steward = await pageFor(stewardContext);
  const contributor = await pageFor(contributorContext);
  const reviewer = await pageFor(reviewerContext);

  await signIn(steward, request, stewardEmail);
  await publishProfile(steward, stewardHandle, "Steward T2");
  await signIn(contributor, request, contributorEmail);
  await publishProfile(contributor, contributorHandle, "Contributor T2");
  await signIn(reviewer, request, reviewerEmail);
  await publishProfile(reviewer, reviewerHandle, "Reviewer T2");

  await steward.goto("/projects/new");
  const title = `Projeto Integrated T2 ${suffix}`;
  await steward.getByLabel("Título").fill(title);
  await steward
    .getByLabel("Resumo público")
    .fill("Três identidades percorrem trabalho, Evidence, Verification, Decision e Outcome explícito.");
  await steward
    .getByLabel("Registro Original")
    .fill("Precisamos testar uma cooperação completa desde uma Need até consequência registrada, sem Workbench.");
  await steward
    .getByLabel("Interpretação atual")
    .fill("O sistema deve separar produção, evidência, verificação, decisão e consequência.");
  await steward
    .getByLabel("Resultado pretendido")
    .fill("Uma história reconstruível com PROV derivado e Outcome INCONCLUSIVE no teste local.");
  await steward
    .getByLabel("Necessidades atuais")
    .fill("contribuição, revisão independente, decisão contextual, proveniência");
  await steward
    .getByLabel("Regras e limites")
    .fill("Local synthetic E2E; sem deploy, contato externo, reputação universal ou inferência de utilidade real.");
  await steward.getByRole("button", { name: "Criar projeto" }).click();

  await expect
    .poll(() => new URL(steward.url()).pathname, { timeout: 25_000 })
    .toMatch(/^\/projects\/(?!new$)[a-z0-9-]+$/);
  const projectPath = new URL(steward.url()).pathname;

  await steward.getByRole("link", { name: "Expressar Need" }).click();
  const needTitle = `Need Integrated T2 ${suffix}`;
  await steward.getByLabel("Título da Need").fill(needTitle);
  await steward
    .getByLabel("O que está faltando ou precisa mudar?")
    .fill("Precisamos transformar uma necessidade em trabalho avaliável por terceiro e decisão contextual.");
  await steward
    .getByLabel("Contexto (opcional)")
    .fill("Need permanece distinta da Opportunity e da posterior Decision.");
  await steward.getByRole("button", { name: "Criar Need" }).click();
  await expect(steward).toHaveURL(new RegExp(`${escaped(projectPath)}\\?need=published$`));
  await steward.getByRole("link", { name: needTitle }).first().click();
  await expect(steward).toHaveURL(/\/needs\/[0-9a-f-]{36}$/);

  await steward
    .getByRole("link", { name: "Transformar esta Need em Opportunity" })
    .click();
  const opportunityTitle = `Opportunity Integrated T2 ${suffix}`;
  await steward.getByLabel("Título").fill(opportunityTitle);
  await steward
    .getByLabel("Sobre o que alguém pode agir?")
    .fill("Produzir uma entrega textual que possa originar Claim, Evidence e Verification atribuída.");
  await steward
    .getByLabel("Condições")
    .fill("A entrega é local, delimitada e deve declarar suas limitações.");
  await steward
    .getByLabel("Resultado esperado")
    .fill("Artifact digest-bound, Claim, Evidence, Verification e Decision contextual.");
  await steward.getByLabel("Capacidade").fill("1");
  await steward.getByRole("button", { name: /Criar opportunity/i }).click();
  await expect(steward).toHaveURL(
    /\/projects\/[a-z0-9-]+\/opportunities\/[0-9a-f-]{36}\?coordination=published$/,
    { timeout: 25_000 },
  );
  const opportunityPath = new URL(steward.url()).pathname;

  await contributor.goto(opportunityPath);
  await contributor.getByRole("link", { name: "Fazer uma proposta" }).click();
  await contributor
    .getByLabel("O que você propõe fazer?")
    .fill("Vou produzir uma saída textual observável, declarar uma Claim limitada e registrar Evidence explícita.");
  await contributor
    .getByLabel("Suas condições")
    .fill("Somente o escopo publicado; não presumo autoridade de revisão ou decisão.");
  await contributor
    .getByLabel("Entrega esperada")
    .fill("Contribution, Artifact textual, Claim e Evidence contextualizados.");
  await contributor
    .getByLabel("Expectativa econômica")
    .fill("Voluntário neste teste sintético; nenhum direito econômico retroativo.");
  await contributor.getByRole("button", { name: "Enviar Proposal" }).click();
  await expect(contributor).toHaveURL(`${siteUrl}${opportunityPath}?coordination=proposal-submitted`);

  await steward.goto(opportunityPath);
  await steward
    .getByLabel("Razão da aceitação")
    .fill("A Proposal descreve trabalho delimitado e mantém a autoridade posterior separada.");
  await steward.getByRole("button", { name: "Aceitar versões exatas" }).click();
  await expect(steward).toHaveURL(
    /\/commitments\/[0-9a-f-]{36}\?coordination=accepted$/,
    { timeout: 25_000 },
  );
  const commitmentPath = new URL(steward.url()).pathname;

  await contributor.goto(commitmentPath);
  await contributor.getByRole("link", { name: "Entregar Contribution" }).click();
  await contributor
    .getByLabel("Que trabalho foi realizado?")
    .fill("Produzi uma saída textual verificável com escopo explícito e sem afirmar consequência externa.");
  await contributor
    .getByLabel("Limitações / o que isto não estabelece")
    .fill("Não demonstra utilidade externa, adoção, PMF, verdade universal ou consequência no mundo real.");
  await contributor.getByRole("button", { name: "Registrar Contribution" }).click();
  await expect(contributor).toHaveURL(/\/contributions\/[0-9a-f-]{36}\?work=submitted$/);
  const contributionPath = new URL(contributor.url()).pathname;

  await contributor.getByRole("link", { name: "Adicionar Artifact textual" }).click();
  const artifactBody = `Artifact Integrated T2 ${suffix}\nSaída observável local para avaliação atribuída.`;
  await contributor.getByLabel("Texto exato do Artifact").fill(artifactBody);
  await contributor.getByRole("button", { name: "Criar Artifact textual" }).click();
  await expect(contributor).toHaveURL(`${siteUrl}${contributionPath}?artifact=attached`);
  await contributor.getByRole("link", { name: "Claim sobre este Artifact" }).click();

  await contributor
    .getByLabel("Afirmação da Claim")
    .fill("Este Artifact contém exatamente a saída textual produzida neste Commitment local.");
  await contributor
    .getByLabel("Escopo e limites")
    .fill("A Claim se restringe ao conteúdo e à existência do Artifact; não estabelece utilidade externa.");
  await contributor.getByRole("button", { name: "Registrar Claim" }).click();
  await expect(contributor).toHaveURL(/\/claims\/[0-9a-f-]{36}\?claim=recorded$/);
  const claimPath = new URL(contributor.url()).pathname;

  await contributor.getByRole("link", { name: "Registrar Evidence" }).click();
  await contributor.getByLabel("Relação com a Claim").selectOption("SUPPORTS");
  await contributor
    .getByLabel("Por que esta fonte importa")
    .fill("O Artifact digest-bound é a fonte explícita usada para examinar a Claim sobre seu conteúdo.");
  await contributor
    .getByLabel("Limitações")
    .fill("A fonte não demonstra consequência real, qualidade universal, adoção ou reputação.");
  await contributor.getByRole("button", { name: "Registrar Evidence" }).click();
  await expect(contributor).toHaveURL(`${siteUrl}${claimPath}?evidence=registered`);

  await steward.goto(claimPath);
  await steward.getByRole("link", { name: "Solicitar Verification" }).click();
  await steward.getByLabel("Reviewer").selectOption({ label: `Reviewer T2 (@${reviewerHandle})` });
  await steward
    .getByLabel("Critérios de revisão")
    .fill("Confirmar conteúdo, digest e limites da fonte sem converter Evidence em verdade ou Decision.");
  await steward.getByLabel("Método esperado").fill("DIGEST_AND_CONTENT_REVIEW");
  await steward.getByRole("button", { name: "Designar e solicitar Verification" }).click();
  await expect(steward).toHaveURL(/\/verifications\/[0-9a-f-]{36}\?review=requested$/);
  const verificationPath = new URL(steward.url()).pathname;

  await reviewer.goto(verificationPath);
  await expect(reviewer.getByText("INDEPENDENT", { exact: true }).first()).toBeVisible();
  await reviewer.getByLabel("Classificação").selectOption("PARTIAL");
  await reviewer
    .getByLabel("Achados")
    .fill("O conteúdo e o digest correspondem à Evidence examinada; a conclusão é limitada ao contexto local declarado.");
  await reviewer
    .getByLabel("Limitações")
    .fill("Não testei utilidade externa, adoção, consequência real ou verdade fora desta Claim.");
  await reviewer.getByRole("button", { name: "Emitir Verification" }).click();
  await expect(reviewer).toHaveURL(`${siteUrl}${verificationPath}?verification=issued`);
  await expect(reviewer.getByText("PARTIAL", { exact: true }).first()).toBeVisible();

  await steward.goto(verificationPath);
  await steward.getByRole("link", { name: "Emitir Decision contextual" }).click();
  await expect(steward).toHaveURL(/\/claims\/[0-9a-f-]{36}\/decision\/new$/);
  await steward.getByLabel("Disposição").selectOption("ACCEPT_FOR_CONTEXT");
  await steward
    .getByLabel("Razão")
    .fill("Aceito a Claim apenas neste contexto porque a Verification atribuída examinou a Evidence declarada.");
  await steward
    .getByLabel("Contexto / limitações")
    .fill("Esta Decision não generaliza verdade, reputação, adoção, utilidade externa ou consequência futura.");
  await steward.getByRole("button", { name: "Emitir Decision contextual" }).click();
  await expect(steward).toHaveURL(/\/decisions\/[0-9a-f-]{36}\?decision=issued$/);
  const decisionPath = new URL(steward.url()).pathname;
  await expect(steward.getByText("DECISION · ACCEPT_FOR_CONTEXT")).toBeVisible();

  await steward.getByLabel("Classificação do Outcome").selectOption("INCONCLUSIVE");
  await steward
    .getByLabel("Registro do Outcome")
    .fill("A consequência no mundo real não foi observada dentro deste teste automatizado local.");
  await steward
    .getByLabel("Limitações")
    .fill("E2E local verifica representação e execução, não benefício externo mensurável.");
  await steward.getByRole("button", { name: "Registrar Outcome" }).click();
  await expect(steward).toHaveURL(`${siteUrl}${decisionPath}?outcome=recorded`);
  await expect(steward.getByText("OUTCOME · INCONCLUSIVE")).toBeVisible();

  const historyPath = `${commitmentPath}/history`;
  for (const page of [steward, contributor, reviewer]) {
    await page.goto(historyPath);
    await expect(page.getByText("COORDINATION HISTORY", { exact: true })).toBeVisible();
    await expect(page.getByText("DECISION · ACCEPT_FOR_CONTEXT")).toBeVisible();
    await expect(page.getByText("OUTCOME · INCONCLUSIVE")).toBeVisible();
  }

  const prov = await steward.evaluate(async (path) => {
    const response = await fetch(path);
    return (await response.json()) as ProvProjection;
  }, `/api${commitmentPath}/prov`);
  expect(prov["@context"]?.prov).toBe("http://www.w3.org/ns/prov#");
  expect(prov["cz:projectionNotice"]).toContain("does not establish truth");
  expect(prov["@graph"]?.some((node) => JSON.stringify(node["@type"]).includes("cz:Decision"))).toBe(true);
  expect(prov["@graph"]?.some((node) => node["cz:domainType"] === "Outcome")).toBe(true);
  expect(JSON.stringify(prov)).not.toContain(artifactBody);

  await contributor.goto("/activity");
  for (const eventType of [
    "CONTRIBUTION_SUBMITTED",
    "ARTIFACT_ATTACHED",
    "CLAIM_RECORDED",
    "EVIDENCE_REGISTERED",
    "VERIFICATION_REQUESTED",
    "VERIFICATION_ISSUED",
    "DOMAIN_DECISION_ISSUED",
    "OUTCOME_RECORDED",
  ]) {
    await expect(contributor.getByText(eventType).first()).toBeVisible();
  }

  const authenticatedAs2 = await contributor.evaluate(async () => {
    const response = await fetch("/api/activity");
    return (await response.json()) as ActivityStreamsCollection;
  });
  expect(authenticatedAs2["@context"]).toBe("https://www.w3.org/ns/activitystreams");
  expect(authenticatedAs2.orderedItems?.some((item) => item.summary?.includes("Decision"))).toBe(true);
  expect(authenticatedAs2.orderedItems?.some((item) => "payload" in item)).toBe(false);

  const anonymousContext = await browser.newContext({ locale: "pt-BR" });
  const anonymous = await pageFor(anonymousContext);
  await anonymous.goto("/activity");
  for (const eventType of [
    "CONTRIBUTION_SUBMITTED",
    "ARTIFACT_ATTACHED",
    "CLAIM_RECORDED",
    "EVIDENCE_REGISTERED",
    "VERIFICATION_REQUESTED",
    "VERIFICATION_ISSUED",
    "DOMAIN_DECISION_ISSUED",
    "OUTCOME_RECORDED",
  ]) {
    await expect(anonymous.getByText(eventType)).toHaveCount(0);
  }

  for (const path of [
    projectPath,
    opportunityPath,
    commitmentPath,
    contributionPath,
    claimPath,
    verificationPath,
    decisionPath,
    historyPath,
  ]) {
    expect(path).not.toContain("/workbench");
  }

  await anonymousContext.close();
  await reviewerContext.close();
  await contributorContext.close();
  await stewardContext.close();
});

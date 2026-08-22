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

test("invited pilot signs in, creates a project and reloads persisted public state", async ({
  browser,
  page,
  request,
}) => {
  await page.goto("/login");
  await expect(page.getByRole("heading", { name: "Escrita controlada. Leitura pública." })).toBeVisible();

  await page.getByLabel("E-mail").fill(pilotEmail);
  await page.getByRole("button", { name: "Receber link local" }).click();
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
  await expect(page).toHaveURL(`${siteUrl}/projects/new`, { timeout: 15_000 });
  await expect
    .poll(
      async () =>
        (await page.context().cookies(siteUrl)).some(
          ({ name, value }) =>
            name.startsWith("sb-") &&
            name.includes("-auth-token") &&
            !name.endsWith("-code-verifier") &&
            value.length > 0,
        ),
      { message: "o callback deve persistir uma sessão no mesmo host da aplicação" },
    )
    .toBe(true);
  await expect(
    page.getByRole("heading", { name: "Plante um projeto com intenção e limites explícitos." }),
  ).toBeVisible({ timeout: 15_000 });

  const uniqueSuffix = `${Date.now()}`;
  const title = `Projeto autenticado Gate 1 ${uniqueSuffix}`;
  const originalIntent = "Preservar uma intenção original verificável pela jornada autenticada do Gate 1.";

  await page.getByLabel("Título").fill(title);
  await page
    .getByLabel("Resumo público")
    .fill("Projeto criado pelo navegador contra uma stack Supabase local e isolada.");
  await page.getByLabel("Registro Original").fill(originalIntent);
  await page
    .getByLabel("Interpretação atual")
    .fill("Demonstrar autenticação, autorização, persistência e leitura pública sem serviço externo.");
  await page
    .getByLabel("Resultado pretendido")
    .fill("O projeto continua legível depois de recarregar a página.");
  await page.getByLabel("Necessidades atuais").fill("testes, auditoria, persistência");
  await page
    .getByLabel("Regras e limites")
    .fill("Somente stack local, sem custódia, pagamento, testnet ou publicação externa.");
  await expect(page.getByLabel("Publicar após criar")).toBeChecked();

  await page.getByRole("button", { name: "Criar projeto" }).click();
  await expect(page).toHaveURL(/\/projects\/(?!new$)[a-z0-9-]+$/, { timeout: 15_000 });
  const persistedUrl = page.url();

  await expect(page.getByRole("heading", { level: 1, name: title })).toBeVisible();
  await expect(page.getByText("Registro Original · imutável")).toBeVisible();
  await expect(page.getByText(originalIntent, { exact: true })).toBeVisible();

  await page.reload();
  await expect(page).toHaveURL(persistedUrl);
  await expect(page.getByRole("heading", { level: 1, name: title })).toBeVisible();
  await expect(page.getByText(originalIntent, { exact: true })).toBeVisible();

  await page.goto("/workbench");
  await expect(page.getByRole("heading", { level: 1, name: "Operar a Célula Zero" })).toBeVisible();
  await expect(page.getByRole("heading", { level: 2, name: title })).toBeVisible();

  const opportunityTitle = `Oportunidade H1 ${uniqueSuffix}`;
  await page.getByText("Nova oportunidade").click();
  await page.getByLabel("Título da oportunidade").fill(opportunityTitle);
  await page
    .getByLabel("Problema ou necessidade")
    .fill("Precisamos conduzir uma parte real da evolução da Célula Zero dentro da própria infraestrutura.");
  await page
    .getByLabel("Condições")
    .fill("Escopo pequeno, autoridade explícita, artefato atribuível e nenhuma expansão silenciosa de escopo.");
  await page
    .getByLabel("Resultado esperado")
    .fill("Uma oportunidade real permanece visível no workbench após recarregar a página.");
  await page.getByLabel("Capacidade").fill("1");
  await expect(page.getByLabel("Publicar após criar")).toBeChecked();
  await page.getByRole("button", { name: "Criar oportunidade" }).click();

  await expect(page).toHaveURL(/\/workbench\?created=.*state=OPEN/, { timeout: 15_000 });
  await expect(page.getByRole("heading", { level: 3, name: opportunityTitle })).toBeVisible();
  await expect(page.getByText("Aberta", { exact: true })).toBeVisible();

  await page.reload();
  await expect(page.getByRole("heading", { level: 3, name: opportunityTitle })).toBeVisible();

  const anonymousContext = await browser.newContext();
  const anonymousPage = await anonymousContext.newPage();
  await anonymousPage.goto(persistedUrl);
  await expect(anonymousPage.getByRole("heading", { level: 1, name: title })).toBeVisible();
  await expect(anonymousPage.getByText(originalIntent, { exact: true })).toBeVisible();

  await anonymousPage.goto("/workbench");
  await expect(anonymousPage).toHaveURL(/\/login$/, { timeout: 15_000 });
  await anonymousContext.close();
});

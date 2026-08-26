import { defineConfig, devices } from "@playwright/test";

const siteUrl = process.env.T2_SITE_URL ?? "http://127.0.0.1:3900";
const parsed = new URL(siteUrl);
const port = parsed.port || (parsed.protocol === "https:" ? "443" : "80");
const artifactRoot = process.env.T2_PLAYWRIGHT_ARTIFACT_ROOT ?? "/tmp/celula-zero-t2-playwright";

export default defineConfig({
  testDir: "./tests/e2e-t2",
  fullyParallel: false,
  workers: 1,
  forbidOnly: Boolean(process.env.CI),
  retries: 0,
  timeout: 240_000,
  expect: { timeout: 20_000 },
  reporter: [["line"], ["html", { outputFolder: `${artifactRoot}/report`, open: "never" }]],
  outputDir: `${artifactRoot}/results`,
  use: {
    baseURL: siteUrl,
    locale: "pt-BR",
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
  },
  projects: [
    {
      name: "integrated-alpha-t2-chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: {
    command: `npm run dev -- --hostname 127.0.0.1 --port ${port}`,
    url: siteUrl,
    reuseExistingServer: false,
    timeout: 120_000,
  },
});

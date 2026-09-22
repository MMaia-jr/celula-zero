import { defineConfig, devices } from "@playwright/test";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://127.0.0.1:3100";

export default defineConfig({
  testDir: "./tests/e2e-auth",
  fullyParallel: false,
  workers: 1,
  forbidOnly: Boolean(process.env.CI),
  retries: 0,
  reporter: [
    ["line"],
    ["html", { outputFolder: "playwright-report-auth", open: "never" }],
  ],
  outputDir: "test-results-auth",
  use: {
    baseURL: siteUrl,
    locale: "pt-BR",
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
  },
  projects: [{ name: "authenticated-chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: "npm run dev -- --hostname 127.0.0.1 --port 3100",
    url: siteUrl,
    reuseExistingServer: !process.env.CI,
  },
});

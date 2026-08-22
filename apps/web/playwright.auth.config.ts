import { defineConfig, devices } from "@playwright/test";

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
    baseURL: "http://127.0.0.1:3000",
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
  },
  projects: [{ name: "authenticated-chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: "npm run dev",
    url: "http://127.0.0.1:3000",
    reuseExistingServer: !process.env.CI,
  },
});

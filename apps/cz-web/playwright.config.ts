// SPDX-License-Identifier: MPL-2.0
import { defineConfig, devices } from "@playwright/test";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { randomUUID } from "node:crypto";
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 45000,
  use: { baseURL: "http://127.0.0.1:3089", trace: "retain-on-failure" },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"] } },
    {
      name: "mobile",
      use: { ...devices["Desktop Chrome"], viewport: { width: 390, height: 844 }, isMobile: false, hasTouch: true },
    },
  ],
  webServer: [
    {
      command: "node e2e/mock-huly-accounts.mjs",
      url: "http://127.0.0.1:3090",
      reuseExistingServer: false,
      timeout: 10000,
    },
    {
      command: "next start --hostname 127.0.0.1 --port 3089",
      url: "http://127.0.0.1:3089",
      reuseExistingServer: false,
      timeout: 60000,
      env: {
        CZ_LOCAL_FOUNDATION: "1",
        CZ_HULY_ACCOUNTS_URL: "http://127.0.0.1:3090/_accounts",
        CZ_OLLAMA_BASE_URL: "http://127.0.0.1:3090",
        CZ_ESSENTHIUS_PROVIDER: "ollama-local",
        CZ_ESSENTHIUS_TEST_MODE: "deterministic",
        CZ_CODEX_BIN: "/nonexistent/codex",
        CZ_FOUNDATION_DB: join(
          tmpdir(),
          `cz-foundation-e2e-${randomUUID()}.sqlite`,
        ),
        CZ_ALLOW_ISOLATED_TEST_STORE: "1",
        CZ_NEXT_DIST_DIR: ".next-v2-validation",
        CZ_TEST_SHOW_LEGACY: process.env.CZ_TEST_SHOW_LEGACY ?? "1",
      },
    },
  ],
});

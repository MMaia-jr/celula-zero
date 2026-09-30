// SPDX-License-Identifier: MPL-2.0
import { defineConfig, devices } from "@playwright/test";
import { join } from "node:path";
import { tmpdir } from "node:os";
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
      use: { ...devices["iPhone 13"], defaultBrowserType: "chromium" },
    },
  ],
  webServer: {
    command: "next start --hostname 127.0.0.1 --port 3089",
    url: "http://127.0.0.1:3089",
    reuseExistingServer: false,
    timeout: 60000,
    env: {
      CZ_LOCAL_FOUNDATION: "1",
      CZ_FOUNDATION_DB: join(
        tmpdir(),
        `cz-foundation-e2e-${process.pid}.sqlite`,
      ),
    },
  },
});

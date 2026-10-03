// SPDX-License-Identifier: MPL-2.0
import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTypeScript from "eslint-config-next/typescript";
export default defineConfig([
  ...nextVitals,
  ...nextTypeScript,
  { settings: { next: { rootDir: "apps/cz-web/" } } },
  globalIgnores([
    "**/.next/**",
    "**/.next-v2-validation/**",
    "**/test-results/**",
    "**/playwright-report/**",
    "**/next-env.d.ts",
    "**/node_modules/**",
  ]),
]);

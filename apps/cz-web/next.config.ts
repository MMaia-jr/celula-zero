// SPDX-License-Identifier: MPL-2.0
import type { NextConfig } from "next";
const config: NextConfig = {
  distDir: process.env.CZ_NEXT_DIST_DIR ?? ".next",
  poweredByHeader: false,
  transpilePackages: [
    "@cz/identity",
    "@cz/presence",
    "@cz/cells",
    "@cz/authority",
    "@cz/records",
    "@cz/connection-fabric",
    "@cz/platform-contract",
    "@cz/platform-huly",
  ],
  serverExternalPackages: ["node:sqlite"],
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "no-referrer" },
          { key: "Cache-Control", value: "no-store" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=(), payment=()",
          },
        ],
      },
    ];
  },
};
export default config;

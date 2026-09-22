import type { NextConfig } from "next";

function supabaseConnectOrigin() {
  const configured = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  if (!configured) return null;
  try {
    const url = new URL(configured);
    return url.protocol === "https:" || url.hostname === "127.0.0.1" || url.hostname === "localhost"
      ? url.origin
      : null;
  } catch {
    return null;
  }
}

function supabaseWebSocketOrigin() {
  const origin = supabaseConnectOrigin();
  if (!origin) return null;
  return origin.replace(/^https:/, "wss:").replace(/^http:/, "ws:");
}

const configuredSupabaseOrigin = supabaseConnectOrigin();
const configuredSupabaseWebSocketOrigin = supabaseWebSocketOrigin();

const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), payment=()",
  },
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      "base-uri 'self'",
      "form-action 'self'",
      "frame-ancestors 'none'",
      "img-src 'self' data: blob:",
      "font-src 'self'",
      "style-src 'self' 'unsafe-inline'",
      process.env.NODE_ENV === "development"
        ? "script-src 'self' 'unsafe-inline' 'unsafe-eval'"
        : "script-src 'self' 'unsafe-inline'",
      ["connect-src 'self'", "http://127.0.0.1:54321", "ws://127.0.0.1:54321", configuredSupabaseOrigin, configuredSupabaseWebSocketOrigin]
        .filter(Boolean)
        .join(" "),
      "object-src 'none'",
    ].join("; "),
  },
];

const nextConfig: NextConfig = {
  allowedDevOrigins: ["127.0.0.1"],
  poweredByHeader: false,
  productionBrowserSourceMaps: false,
  async headers() {
    return [{ source: "/(.*)", headers: securityHeaders }];
  },
};

export default nextConfig;

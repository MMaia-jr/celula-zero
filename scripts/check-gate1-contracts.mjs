import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const files = {
  migration: resolve(root, "supabase/migrations/20260821190000_gate_1_foundation.sql"),
  actorPolicyFix: resolve(root, "supabase/migrations/20260822002000_fix_actor_visibility_policy.sql"),
  publicProjectCreatorAccess: resolve(
    root,
    "supabase/migrations/20260825031203_public_project_creator_access.sql",
  ),
  seed: resolve(root, "supabase/seed.sql"),
  tests: resolve(root, "supabase/tests/database/gate1.test.sql"),
  authCallback: resolve(root, "apps/web/app/auth/callback/route.ts"),
  authRedirect: resolve(root, "apps/web/lib/auth/redirect.ts"),
  authJourney: resolve(root, "apps/web/tests/e2e-auth/authenticated-project.spec.ts"),
  loginAction: resolve(root, "apps/web/app/login/actions.ts"),
  projectAction: resolve(root, "apps/web/app/projects/new/actions.ts"),
  workflow: resolve(root, ".github/workflows/gate-1-ci.yml"),
};

const [
  migration,
  actorPolicyFix,
  publicProjectCreatorAccess,
  seed,
  tests,
  authCallback,
  authRedirect,
  authJourney,
  loginAction,
  projectAction,
  workflow,
] = await Promise.all(
  Object.values(files).map((file) => readFile(file, "utf8")),
);

const contracts = [
  [migration.includes("create_project_atomic"), "atomic project creation function"],
  [migration.includes("project_intents_append_only"), "append-only project intents"],
  [migration.includes("events_append_only"), "append-only events"],
  [migration.includes("enable row level security"), "RLS enabled"],
  [migration.includes("reconcile_project"), "independent material reconciler"],
  [migration.includes("revoke all on all tables"), "minimum table grants"],
  [
    publicProjectCreatorAccess.includes("create_project_atomic") &&
      !publicProjectCreatorAccess.includes("active pilot invite required") &&
      publicProjectCreatorAccess.includes("PROJECT_STEWARD"),
    "authenticated project creation bound to project stewardship",
  ],
  [
    actorPolicyFix.includes("security definer") &&
      actorPolicyFix.includes("private.actor_is_visible(id, auth.uid())") &&
      !actorPolicyFix.includes("grant select on public.actor_memberships to anon"),
    "public actor visibility without membership disclosure",
  ],
  [!migration.toLowerCase().includes("service_role_key"), "no privileged client key"],
  [seed.includes("DEMO / SYNTHETIC"), "synthetic seed labeling"],
  [seed.includes("FAIL"), "FAIL counterexample preserved"],
  [tests.includes("pilot A cannot read pilot B draft"), "cross-tenant adversarial test"],
  [
    tests.includes("authenticated non-pilot with PERSON actor creates own project atomically") &&
      tests.includes("non-pilot project material is created once") &&
      tests.includes("creator manages own project through PROJECT_STEWARD relationship"),
    "authenticated non-pilot atomic project creation assertion",
  ],
  [
    authJourney.includes("Receber link local") &&
      authJourney.includes("Criar projeto") &&
      authJourney.includes("page.reload()") &&
      authJourney.includes("browser.newContext()"),
    "authenticated create-reload-anonymous journey",
  ],
  [workflow.includes("npm run test:e2e:auth"), "authenticated journey enforced by CI"],
  [
    authCallback.includes("redirectResponse.cookies.set") &&
      authCallback.includes("exchangeCodeForSession") &&
      authCallback.includes("client.auth.initialize()") &&
      authCallback.includes("client.auth.setSession") &&
      authRedirect.includes('!requestedNext.startsWith("//")') &&
      authRedirect.includes("configuredSiteUrl"),
    "auth callback persists session cookies on a safe redirect",
  ],
  [
    authJourney.includes('toHaveURL(`${siteUrl}/projects/new`') &&
      authJourney.includes("page.context().cookies(siteUrl)") &&
      authJourney.includes("isSupabaseSessionCookie") === false,
    "authenticated journey enforces stable origin and session cookie",
  ],
  [
    workflow.includes("playwright-auth-report") &&
      workflow.includes("apps/web/test-results-auth/"),
    "authenticated failure evidence preserved by CI",
  ],
  [
    !loginAction.includes("export const") && !projectAction.includes("export const"),
    "server action modules export async functions only",
  ],
  [
    !authJourney.toLowerCase().includes("service_role") &&
      !workflow.toLowerCase().includes("service_role") &&
      !workflow.toLowerCase().includes("secret_key"),
    "no privileged key in authenticated journey",
  ],
];

const failed = contracts.filter(([passed]) => !passed);
for (const [passed, label] of contracts) {
  process.stdout.write(`${passed ? "PASS" : "FAIL"} ${label}\n`);
}

if (failed.length > 0) process.exitCode = 1;

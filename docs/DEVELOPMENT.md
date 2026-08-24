# Development

This guide is the shortest supported path for running the current Célula Zero software locally.

Célula Zero does **not** currently claim an always-on public application. `STATE.md` is authoritative for the current operational state. This document only describes the local development environment represented in this repository.

## Prerequisites

- Git
- Node.js 24
- npm 11 or newer
- Docker or another container runtime supported by the Supabase CLI
- enough local resources to run the Supabase development stack

The repository currently pins Node through `.nvmrc` and uses Supabase CLI `2.115.0` in CI.

## 1. Clone and install

```bash
git clone https://github.com/MMaia-jr/celula-zero.git
cd celula-zero
npm ci
```

If you use `nvm`:

```bash
nvm use
```

## 2. Start the local Supabase stack

Use the same Supabase CLI version used by CI:

```bash
npx --yes supabase@2.115.0 start
npx --yes supabase@2.115.0 db reset --local
```

The current local configuration exposes the API on `127.0.0.1:54321` and the web application on port `3000`.

## 3. Configure the web application

The required public client variables are documented in `.env.example`.

Get the exact local values:

```bash
npx --yes supabase@2.115.0 status
```

Create `apps/web/.env.local` with:

```dotenv
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=<local publishable/anon key from supabase status>
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

Do not commit `.env.local`. Local environment files are ignored by Git.

These are public client configuration values for the local Supabase instance. Do not put service-role keys, passwords, personal tokens, production secrets or unrelated credentials in this file.

## 4. Run the application

From the repository root:

```bash
npm run dev
```

Then open:

```text
http://localhost:3000
```

## 5. Run deterministic checks

The standard repository check is:

```bash
npm run check
```

It currently runs:

```text
lint → typecheck → unit/component tests → domain contract checks → production build
```

The public-journey browser tests are separate:

```bash
npm run test:e2e
```

The authenticated local journey requires the local Supabase stack and configured environment:

```bash
npm run test:e2e:auth
```

Database authorization tests can be run with:

```bash
npx --yes supabase@2.115.0 test db
```

## 6. Before proposing a change

Read:

1. `README.md` — project orientation;
2. `STATE.md` — current operational state and next gate;
3. `CONTRIBUTING.md` — contribution boundaries;
4. `SECURITY.md` — responsible security reporting when relevant;
5. `CODE_OF_CONDUCT.md` — participation expectations.

Prefer an existing issue when one already contains the relevant context. For a new feature or architectural change, establish the real problem/property first rather than introducing infrastructure speculatively.

A successful local test does not by itself establish external utility, verification, adoption or canonical project state.

Preserve:

`PREPARED ≠ EXECUTED ≠ VERIFIED ≠ COMMITTED ≠ PUSHED ≠ MERGED ≠ CANONICAL`

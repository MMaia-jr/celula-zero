# CZ vNext Foundation V1 — local product tranche

From the repository root, using Node 24 and npm 11:

```sh
npm ci
npm run dev:vnext
```

Open http://127.0.0.1:3088. Choose **Entrar como Marcos**. This explicitly opens the
single-person local fixture; it does not verify an external account and is not public
signup or production authentication. Do not expose this local server to the network.

Home saves intentions; You edits the private profile, records user-reported Experiences,
and stores unverified external profile references. Cells exposes the explicit
Founder/Steward relation and authorized purpose editing. Activity retains originals and
exports a JSON snapshot. Discover clearly marks external research as unavailable.
No AI is called and no external identity is connected merely by storing its URL.

State persists in apps/cz-web/.data/foundation.sqlite (ignored). Set CZ_FOUNDATION_DB to
an absolute file path if a different local location is needed. Restart with the same
path to resume. The server only admits the explicit CZ_LOCAL_FOUNDATION=1 mode and
localhost/127.0.0.1 Host; npm dev/start commands bind to 127.0.0.1. Sessions expire after
8 hours, are server-side and revocable; session tokens are stored hashed. State and
originals persist after logout. This is not a production identity provider.

```sh
npm run check:vnext
npm run test:vnext:e2e
```

Checks require local Chromium installed for Playwright (the existing repo version).
E2E starts its own server at 3089 against a separate temporary SQLite file. It never
uses the default human state. The test database is disposable, never a remote service.

Atomic command transactions preserve original plus projection, and request keys prevent
replaying an accepted HTTP request from creating duplicate records. They do not prohibit
a human from deliberately submitting the same content as a new request. Changing a
profile creates a new original and updates the projection; earlier originals remain.

The JSON export is a readable authorized snapshot, not a full restore/identity import.
Huly, production identity, distributed storage, files, collaborative editing, background
jobs, notifications and semantic institutional memory remain explicit PROPERTY_GAPs.

No production deployment or implementation promotion is authorized by this run.
See ../../docs/CZ-VNEXT-FOUNDATION-STAGE0.md for reuse, dependency and licensing boundaries, and ../../docs/CZ-VNEXT-FOUNDATION-RESULT.md for validation and limits.

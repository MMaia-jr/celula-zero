# Célula Zero — Operations

Operational index for the current repository.

Use this after environment setup when you need to answer:

> Which existing capability should I use, under which preconditions and authority
> boundary, where must it stop, and how do I verify what happened?

For environment setup and software testing, use [DEVELOPMENT.md](DEVELOPMENT.md).
Always read `STATE.md` before acting. This index exposes capabilities; it does
not grant authority or replace current Human Direction.

Global boundaries:

`documented command ≠ authorization`

`entrypoint exists ≠ safe to run in every context`

`PREPARED ≠ EXECUTED ≠ VERIFIED ≠ COMMITTED ≠ PUSHED ≠ MERGED ≠ CANONICAL`

`VERIFIED_LOCAL N=1 ≠ production readiness ≠ external utility ≠ adoption ≠ scale`

## Quick operator map

| Intent | Entrypoint | Main risk | Stop/result | Verify | Current gap |
| --- | --- | --- | --- | --- | --- |
| Reconstruct canonical state without a model call | `npm run cz -- --check` | read/network bootstrap only | canonical controls or fail-closed STOP | Founder regression | does not discover every capability |
| Enter Founder Mode | `npm run cz` | provider/model and paid calls; accepted local replacement | exit, cap, or unresolved controls | Founder regression | no additional gap established |
| Create private Project + Need + Agreement only | `node tools/company_core_stage_headless.mjs < payload.json` | local DB writes | `AGREEMENT_DEFINED` | focused Node tests + real-run readback | documented local auth composition; no one-command auth wrapper |
| Use Project Room | `npm run room` | durable Room writes; configured AI turn | `/quit` or missing-context STOP | Room tests | fresh path to five required IDs |
| Export Room context | `npm run room:export` | local files | JSON + Markdown export | emitted hashes; portability tests | CLI file-writing verification partial |
| Build Room handoff | `npm run room:handoff` | local files | 5-file handoff package | `scripts/cz-room.test.mjs` | no new system gap established |
| Compose Room + canonical Git state | `node scripts/cz-compose-handoff.mjs` | local files | 5-file composed bundle | manifest hashes; focused response-contract test | no npm alias |
| Capture external response | `node scripts/cz-compose-handoff.mjs --capture ... < response.md` | local files | response + SHA preserved | SHA + heading validation | no dedicated end-to-end capture test |
| Validate predecessor before dependent paid call | `python3 scripts/cz-paid-call-fail-closed.py ...` | none from validator itself | reject/accept predecessor contract | `--self-test` | no package alias |
| Run an already-authorized Move2 Job | `npm run worker:move2` | DB mutation + provider/model cost | `IDLE` / `SUCCEEDED` / `FAILED` / `NEEDS_RECONCILIATION` | worker tests | late-output recovery after ambiguous dispatch remains outside GI1-003 |
| Prepare first external concierge run | `WP-HA-001-FIRST-EXTERNAL-RUN.md` | real-world/privacy risk | observed run or STOP | packet Result Package criteria | not current immediate sequencing |

## 1. Canonical resume / Founder bootstrap

Read-only entrypoint:

```bash
npm run cz -- --check
```

Use a local checkout of the canonical repository with network access sufficient
to resolve actual remote `main`.

The bootstrap checks repository identity, rejects stale local tracking state,
reads `STATE.md` from the verified SHA, and reconstructs current Human Direction
and the next Human gate.

It grants no implementation, Doing, paid-call, Remote Supabase, or Git-promotion
authority.

Expected read-only result:
- `MODEL_CALLS=0`
- `PAID_SPEND=0`

If canonical controls are unresolved, STOP rather than infer from chats,
branches, issues, snapshots or stale local files.

Verify:

```bash
python3 scripts/cz-founder-resume.test.py
```

Evidence: `scripts/cz-founder.py`,
`scripts/cz-founder-resume.test.py`,
`decisions/D021-internal-operability-before-external-doing.md`.

## 2. Founder Mode

Entrypoint:

```bash
npm run cz
```

Canonical bootstrap must pass. Interactive AI use also depends on configured
Founder local state under `~/.celula-zero` and a Vercel AI Gateway credential.

After read-only bootstrap, network/provider access and paid calls may occur
within configured caps.

An AI response is not Human Direction or execution. A proposed local file
replacement remains a proposal until the Human explicitly accepts it. That
acceptance does not imply commit, push, PR or merge.

STOP on unresolved canonical controls, configured call/session caps, or Human
exit.

Verify focused canonical-bootstrap behavior with:

```bash
python3 scripts/cz-founder-resume.test.py
```

No additional Founder implementation gap is established by discoverability
alone.

## 3. Company Core staged headless through Agreement

Target bounded path:

`authenticated Human → controlled PERSON → PRIVATE Project → Need → Agreement → AGREEMENT_DEFINED → STOP`

Entrypoint:

```bash
node tools/company_core_stage_headless.mjs < /path/to/payload.json
```

Required environment:
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_ACCESS_TOKEN`

`SUPABASE_URL` is restricted to loopback/local Supabase. The access token must
represent the authenticated Human whose canonical Profile controls the resulting
`PERSON` Actor.

Do not supply generated Actor / Project / Cycle IDs manually. Use a payload
matching the documented `project`, `need`, and `agreement` schema. The verified
N=1 payload is preserved in
`RP-GI1-002-COMPANY-CORE-STAGED-HEADLESS-N1.md`.

Mutating RPC allowlist:
- `create_project_atomic`
- `company_core_create_cycle`
- `company_core_define_agreement`

Outside this path:
- `company_core_authorize_work`
- AI Agent registration
- ANC prepare/start
- AI Gateway
- Move2

Required result:
- Project visibility `PRIVATE`
- state `AGREEMENT_DEFINED`
- `ai_run_id = NULL`
- `result_content = NULL`
- `evaluation_verdict = NULL`
- `consequence_type = NULL`

Verify:

```bash
node --test tools/company_core_stage_headless.test.mjs
```

For an authorized real run, independently read back returned IDs, visibility,
actor control, state, linkages and zero work-authorization evidence.

Evidence level: `VERIFIED_LOCAL N=1 / CANONICAL`.

A fresh local Human can compose the existing Supabase passwordless-auth path
with this staged headless entrypoint without a service-role/admin credential and
without weakening the identity boundary.

### 3.1 Fresh local Human auth/access-token bootstrap

Scope:

`local Supabase only → legitimate Human session → staged headless credential`

This is a composition of existing capabilities, not a new authentication
primitive. It does not grant Company Core authority by itself.

Preconditions:

- run from the repository root against the canonical local Supabase development
  stack;
- the local stack is already running;
- the email has a legitimate active pilot invite; the canonical local seed uses
  `pilot@celulazero.local`;
- Python 3 and the pinned Supabase CLI command below are available;
- do not run the recipe with shell tracing (`set -x`), and do not print or persist
  `SUPABASE_ACCESS_TOKEN`.

The recipe intentionally captures `supabase status -o env` and retains only the
local API URL plus the public anon/publishable client key. It does not use the
local secret/service-role key.

<!-- GI1-004-T2-AUTH-RECIPE-BEGIN -->
```bash
# Local development only. Keep shell tracing disabled so the user token is not printed.
set +x
CZ_LOCAL_AUTH_EMAIL="${CZ_LOCAL_AUTH_EMAIL:-pilot@celulazero.local}"
CZ_AUTH_EXPORTS="$(mktemp "${TMPDIR:-/tmp}/cz-gi1-004-auth.XXXXXX")" ||
  { echo "STOP: could not allocate temporary auth export file" >&2; return 1 2>/dev/null || exit 1; }
chmod 600 "$CZ_AUTH_EXPORTS"

if ! CZ_LOCAL_AUTH_EMAIL="$CZ_LOCAL_AUTH_EMAIL" python3 >"$CZ_AUTH_EXPORTS" <<'PY'
import html
import json
import os
import re
import shlex
import subprocess
import time
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path

email = os.environ["CZ_LOCAL_AUTH_EMAIL"]

status = subprocess.run(
    ["npx", "--yes", "supabase@2.115.0", "status", "-o", "env"],
    check=True,
    text=True,
    capture_output=True,
)

values = {}
for raw in status.stdout.splitlines():
    if "=" not in raw:
        continue
    key, value = raw.split("=", 1)
    values[key.strip()] = value.strip().strip('"')

api = values.get("API_URL")
anon = values.get("ANON_KEY") or values.get("PUBLISHABLE_KEY")
if not api or not anon:
    raise SystemExit("STOP: local API_URL or public client key not discoverable")

api_url = urllib.parse.urlparse(api)
if api_url.scheme not in ("http", "https") or api_url.hostname not in (
    "127.0.0.1",
    "localhost",
    "::1",
):
    raise SystemExit("STOP: refusing non-local Supabase URL")

config = Path("supabase/config.toml").read_text(encoding="utf-8")
mail_port = None
for section in ("local_smtp", "inbucket"):
    match = re.search(
        rf"^\[{re.escape(section)}\]\s*$([\s\S]*?)(?=^\[|\Z)",
        config,
        re.M,
    )
    if not match:
        continue
    port = re.search(r"^port\s*=\s*(\d+)\s*$", match.group(1), re.M)
    if port:
        mail_port = int(port.group(1))
        break
if mail_port is None:
    raise SystemExit("STOP: local Mailpit/SMTP port not discoverable")

mail = f"http://127.0.0.1:{mail_port}"

def request_json(url, *, method="GET", payload=None, headers=None, timeout=10):
    body = None if payload is None else json.dumps(payload).encode()
    merged = {"Accept": "application/json", **(headers or {})}
    if payload is not None:
        merged["Content-Type"] = "application/json"
    req = urllib.request.Request(url, data=body, method=method, headers=merged)
    try:
        with urllib.request.urlopen(req, timeout=timeout) as response:
            raw = response.read()
            return response.status, json.loads(raw or b"{}")
    except urllib.error.HTTPError as exc:
        raw = exc.read()
        try:
            detail = json.loads(raw or b"{}")
        except Exception:
            detail = {"raw": raw.decode(errors="replace")}
        raise SystemExit(
            f"STOP: HTTP {exc.code} at {urllib.parse.urlparse(url).path}: {detail}"
        )

code, _ = request_json(
    f"{api.rstrip('/')}/auth/v1/otp",
    method="POST",
    payload={"email": email, "create_user": True},
    headers={"apikey": anon},
)
if code not in (200, 201, 204):
    raise SystemExit(f"STOP: unexpected passwordless-auth status {code}")

magic = ""
deadline = time.time() + 20
while time.time() < deadline:
    try:
        _, message = request_json(f"{mail}/api/v1/message/latest", timeout=3)
    except Exception:
        time.sleep(0.5)
        continue

    recipients = message.get("To") or []
    addressed = any(
        isinstance(item, dict)
        and str(item.get("Address", "")).lower() == email.lower()
        for item in recipients
    )
    if not addressed:
        time.sleep(0.5)
        continue

    content = f"{message.get('HTML') or ''}\n{message.get('Text') or ''}"
    found = re.search(r'href=["\']([^"\']*/auth/v1/verify[^"\']*)["\']', content, re.I)
    if found:
        magic = html.unescape(found.group(1))
    else:
        found = re.search(
            r'https?://[^\s<>"\']*/auth/v1/verify[^\s<>"\']*',
            content,
            re.I,
        )
        if found:
            magic = html.unescape(found.group(0))
    if magic:
        break
    time.sleep(0.5)

if not magic:
    raise SystemExit("STOP: local passwordless email was not observed")

magic_url = urllib.parse.urlparse(magic)
if (
    magic_url.scheme,
    magic_url.hostname,
    magic_url.port,
    magic_url.path,
) != (
    api_url.scheme,
    api_url.hostname,
    api_url.port,
    "/auth/v1/verify",
):
    raise SystemExit("STOP: magic link escaped expected local Auth origin")

class NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        return None

opener = urllib.request.build_opener(NoRedirect)
location = None
try:
    with opener.open(urllib.request.Request(magic, method="GET"), timeout=10) as response:
        location = response.headers.get("Location")
except urllib.error.HTTPError as exc:
    if exc.code in (301, 302, 303, 307, 308):
        location = exc.headers.get("Location")
    else:
        raise SystemExit(f"STOP: magic-link verification returned HTTP {exc.code}")

if not location:
    raise SystemExit("STOP: passwordless verification produced no session redirect")

redirect = urllib.parse.urlparse(location)
params = {}
params.update(urllib.parse.parse_qs(redirect.query))
params.update(urllib.parse.parse_qs(redirect.fragment))
token = (params.get("access_token") or [None])[0]
if not token:
    raise SystemExit("STOP: verified local auth did not yield a usable user access token")

code, user = request_json(
    f"{api.rstrip('/')}/auth/v1/user",
    headers={"apikey": anon, "Authorization": f"Bearer {token}"},
)
if code != 200 or not user.get("id"):
    raise SystemExit("STOP: user access token could not be verified")
if str(user.get("email", "")).lower() != email.lower():
    raise SystemExit("STOP: authenticated user email mismatch")

print("export SUPABASE_URL=" + shlex.quote(api.rstrip("/")))
print("export SUPABASE_ANON_KEY=" + shlex.quote(anon))
print("export SUPABASE_ACCESS_TOKEN=" + shlex.quote(token))
print("export CZ_AUTHENTICATED_USER_ID=" + shlex.quote(str(user["id"])))
PY
then
  rm -f "$CZ_AUTH_EXPORTS"
  unset CZ_AUTH_EXPORTS
  echo "STOP: local Human passwordless authentication failed" >&2
  return 1 2>/dev/null || exit 1
fi

# shellcheck source=/dev/null
if ! . "$CZ_AUTH_EXPORTS"; then
  rm -f "$CZ_AUTH_EXPORTS"
  unset CZ_AUTH_EXPORTS
  echo "STOP: generated auth environment could not be loaded" >&2
  return 1 2>/dev/null || exit 1
fi
rm -f "$CZ_AUTH_EXPORTS"
unset CZ_AUTH_EXPORTS

test -n "${SUPABASE_URL:-}" &&
test -n "${SUPABASE_ANON_KEY:-}" &&
test -n "${SUPABASE_ACCESS_TOKEN:-}" &&
test -n "${CZ_AUTHENTICATED_USER_ID:-}" ||
  { echo "STOP: local Human authentication bootstrap incomplete" >&2; return 1 2>/dev/null || exit 1; }

printf 'LOCAL_HUMAN_AUTH=PASS\n'
printf 'AUTHENTICATED_USER_ID=%s\n' "$CZ_AUTHENTICATED_USER_ID"
printf 'ACCESS_TOKEN_PRINTED=NO\n'
```
<!-- GI1-004-T2-AUTH-RECIPE-END -->

After `LOCAL_HUMAN_AUTH=PASS`, invoke the existing staged entrypoint with an
authorized payload:

```bash
node tools/company_core_stage_headless.mjs < /path/to/payload.json
unset SUPABASE_ACCESS_TOKEN CZ_AUTHENTICATED_USER_ID
```

Expected bounded result remains:

`PRIVATE Project → Need → Agreement → AGREEMENT_DEFINED → STOP`

The auth recipe does not call `company_core_authorize_work`, any AI provider, or
Remote Supabase. A local passwordless session is not authority beyond the
existing Profile / Actor / Project contracts.

Current ergonomic limit: this is a documented multi-step local composition, not
a dedicated one-command authentication wrapper. That ergonomic absence is not
evidence that a new authentication primitive is required.

## 4. Project Room

Purpose: bounded project/cycle conversation preserving Human Original Records,
AI interpretations/syntheses, explicit Human Direction and
`DREAM → PLAN → DO → CELEBRATE`.

Entrypoint:

```bash
npm run room
```

Room fails closed unless all five are supplied:
- `ROOM_PROFILE_ID`
- `ROOM_HUMAN_ACTOR_ID`
- `ROOM_AI_ACTOR_ID`
- `ROOM_PROJECT_ID`
- `ROOM_CYCLE_ID`

Optional runtime settings include `ROOM_AI_MODEL` and `ROOM_AI_TIMEOUT_MS`.

Do not guess required IDs. If a fresh operator does not know them, the current
documented path does not show how to obtain all five legitimately. STOP.

Useful controls:
- `/status`, `/confirm`, `/respond`
- `/direction`, `/plan`, `/do`, `/celebrate`, `/child`
- `/cancel`, `/quit`

Free text records a Human contribution and starts the configured local Room AI
turn. Commands such as `/direction`, `/plan`, `/do` and `/celebrate` can change
durable Room state under their existing contracts.

Participation context does not itself grant Project authority. `/quit` exits
while preserving Room context.

Verify:

```bash
npm run test:room
npm run test:room:participation-portability
```

Current bootstrap gap:
`fresh operator → legitimate discovery of all five Room IDs`
is not yet a supported documented path. Classify `MAP FIRST`; do not remove the
checks for convenience.

## 5. Room continuity

All paths below produce local, non-canonical artifacts.

Preserve:
`local Room state ≠ Git-canonical state`
`portable context ≠ Human Direction`
`external AI response ≠ Decision`

### 5.1 Portable export

Entrypoint:

```bash
npm run room:export
```

Observed contract:
- reads current Room projection;
- writes one `.json` context file and one `.md` context file;
- prints both paths and SHA-256 values;
- `MODEL_CALL=NO`;
- `DB_WRITE=NO`;
- `CANONICAL=NO`.

Verification:
- compare emitted SHA-256 values with the files;
- `npm run test:room:participation-portability` verifies important portability
  semantics, including that participation context does not leak private operator
  identity.

Coverage limit: No dedicated end-to-end test of the export file-writing CLI is
currently established by this index.

### 5.2 Room handoff package

Entrypoint:

```bash
npm run room:handoff
```

Output:
- `CONTEXT.json`
- `CONTEXT.md`
- `PROMPT.md`
- `RESPONSE-TEMPLATE.json`
- `MANIFEST.txt`

Boundary:
- local files are written;
- Room state is read before and after generation and must remain equal;
- `MODEL_CALL=NO`;
- `DB_WRITE=NO`.

Verification: `scripts/cz-room.test.mjs` directly exercises package
construction, schema, content preservation, hashes and restrictive
file/directory modes.

### 5.3 Composed Room + Git-canonical handoff

Entrypoint:

```bash
node scripts/cz-compose-handoff.mjs
```

Preconditions:
- Room handoff context exists;
- `CONTEXT.json` exposes an explicit canonical base;
- local repository HEAD equals that exact base.

Output:
- `CONTEXT.json`
- `CONTEXT.md`
- `CANONICAL-STATE.md`
- `PROMPT.md`
- `MANIFEST.txt`

Boundary:
- local files are written;
- `MODEL_CALL=NO`;
- `DB_WRITE=NO`;
- `GIT_WRITE=NO`;
- canonical and newer local state remain separate.

Verification:
- check `MANIFEST.txt` hashes;
- `scripts/cz-compose-handoff.test.mjs` verifies the required Markdown response
  heading contract used by capture.

Coverage limit: that focused test does **not** establish a full deterministic
test of every composed-bundle construction property.

Known discoverability gap: no npm alias exposes this composed path.

### 5.4 Capture external Markdown response

Entrypoint:

```bash
node scripts/cz-compose-handoff.mjs --capture /path/to/CZ-COMPOSED-HANDOFF < response.md
```

Observed result:
- validates that the target is a composed handoff bundle;
- writes `EXTERNAL-RESPONSE-<timestamp>.md`;
- writes corresponding `.sha256`;
- preserves the original external response;
- validates required Markdown headings;
- does not convert the response into Human Direction, Decision or canonical state;
- no model call, DB write or Git write occurs in capture.

Verification:
- emitted response SHA-256;
- Markdown heading validation;
- focused `scripts/cz-compose-handoff.test.mjs`.

Coverage limit: No dedicated end-to-end capture test beyond that focused
contract is currently established.

## 6. Paid predecessor fail-closed validation

Use before another paid call when continuation depends on the predecessor
satisfying a declared response contract.

Self-test:

```bash
python3 scripts/cz-paid-call-fail-closed.py --self-test
```

General validation example:

```bash
python3 scripts/cz-paid-call-fail-closed.py /path/to/response.json   --expect-json   --require-key role   --require-key pass_or_more
```

Adapt required keys to the real contract.

Preserve:
`provider returned ≠ role completed`
`budget remaining ≠ next paid call justified`

Rejected predecessor: `STOP before next dependent paid call`.

The validator itself does not authorize another paid call. Its self-test reports
zero model, network and paid spend.

Current discoverability gap: no package alias exposes this safety capability.

## 7. Move2 durable AI Job worker

Use only when an already-authorized durable AI Job is ready for worker
execution. Do not run the worker merely to inspect the system.

Entrypoint:

```bash
npm run worker:move2
```

The package entrypoint uses the existing single-flight guard.

Required at minimum:
- `MOVE2_DATABASE_URL`

Real provider work also requires:
- `AI_GATEWAY_API_KEY`
- `AI_GATEWAY_BASE_URL`

The durable Job, AI Run, reservation and provider request must already exist
through the applicable authorized path.

The worker can mutate database state, dispatch provider/model work and incur
cost. Running it does not create Human authorization.

Result classes:
- `IDLE`
- `SUCCEEDED`
- `FAILED`
- `NEEDS_RECONCILIATION`

Ambiguous post-dispatch outcomes and unknown/oversized actual costs are
preserved for reconciliation rather than silently retried or fabricated.

Verify:

```bash
node --test scripts/move2-vs1-worker.test.mjs
```

### 7.1 Human disposition of an already-held reconciliation Job

GI1-003 adds a bounded Human-facing reconciliation surface for a Job that is
already in `NEEDS_RECONCILIATION`.

Canonical RPC:

```text
public.move2_dispose_reconciliation(
  p_actor_id,
  p_job_id,
  p_disposition,
  p_observed_actual_cost_usd,
  p_basis,
  p_command_id,
  p_idempotency_key
)
```

This is not a worker command and does not grant authority by knowing a Job ID.

Required authority and context:

- authenticated Profile controls the supplied requester Actor;
- requester Actor must be the exact Job requester;
- requester must hold `cycle.manage` for the exact Project;
- Job must still be `NEEDS_RECONCILIATION`;
- sponsored reservation must still be `HELD_FOR_RECONCILIATION`.

Supported explicit dispositions:

- `NO_CHARGE_OBSERVED`
- `CHARGE_OBSERVED_NO_OUTPUT`
- `COMPLETED_OUTPUT_COST_OBSERVED`

The disposition must match the existing reconciliation cause and AI Run state.

Observed terminal behavior:

- no-output dispatch ambiguity → Job `FAILED`;
- no-charge observation → reservation `RELEASED`;
- observed charge without output → reservation `SETTLED`;
- already-completed output + reconciled cost → Job `SUCCEEDED` and reservation
  `SETTLED`;
- settlement rechecks the sponsored hard budget atomically;
- hard-budget overflow fails closed and preserves the reconciliation hold;
- completed AI Run provider-time cost metadata is not rewritten by a later Human
  reconciliation observation;
- reconciliation creates no new PGMQ delivery and never implicitly redispatches
  the ambiguous Job.

Verify locally:

```bash
npx --yes supabase@2.115.0 test db   supabase/tests/database/move2_reconciliation_disposition.test.sql --local
node --test scripts/move2-vs1-worker.test.mjs
```

Evidence:

`RP-GI1-003-MOVE2-RECONCILIATION-DISPOSITION-N1.md`

Evidence level:

`VERIFIED_LOCAL N=1 / CANONICAL AFTER MERGE`

Preserve:

`ambiguity detected ≠ ambiguity resolved until explicit disposition`

`provider-time Original Record ≠ later Human reconciliation observation`

Known boundary:

Late provider-output recovery/import after dispatch ambiguity is outside
GI1-003. It is preserved but is not selected as current work.

## 8. First external concierge run

Status: `PREPARED / NOT EXECUTED`.

There is intentionally no generic execution command. Start from:
`WP-HA-001-FIRST-EXTERNAL-RUN.md`.

The packet requires real participant/context selection, privacy/data
minimization and separate Human authorization.

Observation chain:
`ENTRY → ACTION → RELATION → SECOND PERSON → REAL-WORLD CONSEQUENCE → RETURN`

A STOP is evidence. Current immediate sequencing comes from the newer Human
Direction in `STATE.md`.

## 9. Gap classification

### Discoverability gap

Capability exists, but operator cannot readily find its supported entrypoint or
safety boundary.

Current examples:
- composed handoff lacks npm alias;
- paid predecessor validator lacks package alias.

### Fresh-operator precondition/bootstrap gap

Capability exists and is documented, but a legitimate fresh-operator path to a
required precondition is not yet demonstrated.

Current example:
- Project Room acquisition of all five required IDs.

Company Core local Human auth/access-token composition is documented in §3.1.
The absence of a dedicated one-command auth wrapper is an ergonomic limit, not a
demonstrated missing authentication primitive.

### Substantive property gap

The behavior itself remains unresolved.

GI1-003 repaired the previously listed deterministic Move2 disposition gap for
the verified existing reconciliation classes.

An adjacent late-output recovery/import case remains explicitly outside GI1-003
and is not selected as current work.

Do not convert documentation friction into architectural absence.

## 10. Fresh-operator discoverability test

Starting from `README.md` only, a fresh competent operator should be able to
determine:
1. canonical read-only resume;
2. Founder Mode;
3. Company Core through Agreement only;
4. Project Room and required context;
5. export/handoff paths;
6. predecessor validation before dependent paid work;
7. Move2 worker boundaries;
8. STOP/result and verification for each path;
9. which gaps are discoverability, bootstrap/precondition, or substantive.

Correctly finding a real unresolved gap is not a documentation failure.

`OPERATIONS INDEX PREPARED ≠ DISCOVERABILITY VERIFIED`

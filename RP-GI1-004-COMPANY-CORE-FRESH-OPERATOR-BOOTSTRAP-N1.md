# RP-GI1-004 — Company Core Fresh-Operator Bootstrap N=1

Status:

`VERIFIED_LOCAL N=1 / PROMOTION AUTHORIZED`

Canonical base under test:

`3f87bed59edc6e4b917903274a53cdeba9b38d15`

Human Direction preserved:

`D021 / INTERNAL OPERABILITY BEFORE EXTERNAL DOING / HUMAN DIRECTION`

## Property tested

Whether a technically competent fresh local operator can reach the already
verified Company Core staged headless surface through legitimate existing Human
authentication without requiring a new authentication primitive.

Target bounded path:

`fresh Human → existing passwordless auth → legitimate user session/access token → existing staged headless → PRIVATE Project → Need → Agreement → AGREEMENT_DEFINED → STOP`

Preserve:

`authentication ≠ authority`

`documented command ≠ authorization`

`PASS N=1 ≠ universal operability ≠ production readiness ≠ external utility ≠ adoption ≠ scale`

## MAP result before execution

Read-only mapping found that the repository already had:

- Supabase passwordless first-login semantics;
- automatic Profile creation for a new auth user;
- automatic controlled `PERSON` Actor + OWNER membership;
- pilot-invite consumption into ACTIVE pilot membership;
- browser fresh-login E2E coverage;
- an existing staged headless Company Core surface requiring a legitimate
  `SUPABASE_ACCESS_TOKEN`.

The unresolved property was narrowed to the operational composition:

`fresh Human auth → legitimate user access token → existing staged headless`

No missing identity model, auth protocol, database primitive or Company Core
runtime was established by the MAP.

## GI1-004-T1 — runtime composition

Classification:

`PASS / EXECUTED_LOCAL N=1`

Authorized base:

`3f87bed59edc6e4b917903274a53cdeba9b38d15`

Observed:

- fresh Human passwordless auth: `PASS`;
- legitimate user access token: `PASS`;
- access token printed: `NO`;
- service role used: `NO`;
- admin auth used: `NO`;
- direct SQL to fabricate identity/session: `NO`;
- Company Core frontend: `NO`;
- existing staged headless tool: `UNCHANGED`;
- headless composition: `PASS`;
- Project visibility: `PRIVATE`;
- Company Core state: `AGREEMENT_DEFINED`;
- stop boundary: `AGREEMENT_DEFINED`;
- work authorization executed: `NO`;
- provider/model calls: `0`;
- implemented-system paid calls: `0`;
- Remote Supabase writes: `0`;
- canonical repository writes: `0`.

Consequence:

`new auth primitive required = NO`

T1 demonstrated that the existing auth/session mechanism and existing staged
headless capability can be composed locally without weakening authentication.

## GI1-004-T2 — documentation-first fresh path

Purpose:

Expose the already demonstrated composition through the existing operational
documentation, then test the exact documented recipe deterministically without
adding a runtime helper.

Prepared repository-content scope:

`docs/OPERATIONS.md only`

### T2 first run

Classification:

`INCONCLUSIVE / DOCUMENT RECIPE PORTABILITY DEFECT`

Observed before STOP:

- canonical origin: `PASS`;
- live main: `PASS`;
- workspace from canonical archive: `PASS`;
- static document contract: `PASS`;
- README → OPERATIONS: `PASS`;
- auth recipe discoverable: `PASS`;
- staged headless entrypoint discoverable: `PASS`;
- changed files: exactly `1`;
- changed path: `docs/OPERATIONS.md`;
- isolated local runtime: `PASS`;
- documented auth recipe extracted: `PASS`;
- execution stopped before authentication because macOS Bash rejected the
  initial heredoc-inside-command-substitution form.

Interpretation:

`document recipe portability defect ≠ auth failure ≠ Company Core failure`

### T2 recovery V1

Classification:

`INCONCLUSIVE / EXECUTOR REPLACEMENT BUG`

Observed:

- main remained unchanged;
- first T2 workspace scope remained exactly `docs/OPERATIONS.md`;
- recovery stopped before completing the document rewrite because Python
  `re.sub()` interpreted backslashes inside the replacement recipe as
  replacement-template escapes;
- runtime capability added: `NO`;
- repository helper added: `NO`;
- provider/model calls: `0`;
- Remote Supabase writes: `0`.

Interpretation:

`executor replacement bug ≠ documented-path failure`

### T2 recovery V2

Classification:

`PASS / EXECUTED_LOCAL N=1`

Observed:

- canonical origin: `PASS`;
- live main: `PASS`;
- recovery scope: exactly `docs/OPERATIONS.md`;
- replacement mode: literal document slice;
- exact extracted recipe passes local macOS Bash syntax: `PASS`;
- runtime capability files changed: `0`;
- documented auth recipe extracted: `PASS`;
- documented auth recipe executed: `PASS`;
- legitimate user session: `PASS`;
- access token printed: `NO`;
- service role used: `NO`;
- admin auth used: `NO`;
- Company Core frontend: `NO`;
- existing staged headless tool: `UNCHANGED`;
- headless composition: `PASS`;
- Project visibility: `PRIVATE`;
- Company Core state: `AGREEMENT_DEFINED`;
- stop boundary: `AGREEMENT_DEFINED`;
- work authorization executed: `NO`;
- runtime capability added: `NO`;
- repository helper/script added: `NO`;
- provider/model calls: `0`;
- Remote Supabase writes: `0`;
- final changed files: exactly `1`;
- final changed path: `docs/OPERATIONS.md`;
- live main after recovery: `PASS`.

## Demonstrated consequence

For this bounded local N=1:

`README → OPERATIONS → documented local auth recipe → legitimate Human session → existing staged headless → AGREEMENT_DEFINED = PASS`

Classification:

- auth primitives: `ADOPT`;
- Profile / PERSON / OWNER bootstrap: `ADOPT`;
- pilot authorization bootstrap: `ADOPT`;
- staged headless: `ADOPT`;
- auth-session → headless composition: `ADOPT`;
- documentation for the bounded local path: `PASS N=1`;
- new authentication primitive: `NOT REQUIRED BY OBSERVED N=1`;
- dedicated one-command auth wrapper: `ERGONOMIC LIMIT ONLY / NOT SELECTED`.

No `EXTEND` is justified by this result.

## Remaining known candidate

Project Room still has a separately documented fresh-operator precondition:

`fresh operator → legitimate acquisition of all five required Room IDs`

That property is not selected by GI1-004. Selection remains a Human Review
decision.

## What this result does not demonstrate

GI1-004 does not demonstrate:

- production deployment;
- production auth/session handling;
- remote Supabase application;
- universal fresh-operator operability;
- external utility;
- adoption;
- PMF;
- scale.

## Promotion scope

Human authorized promotion of exactly four repository paths:

1. `docs/OPERATIONS.md`
2. `RP-GI1-004-COMPANY-CORE-FRESH-OPERATOR-BOOTSTRAP-N1.md`
3. `STATE.md`
4. `scripts/cz-founder-resume.test.py`

Commit, push, PR and merge are authorized only if prechecks/regressions pass,
canonical main remains at the reviewed base before merge, and no fifth file is
touched.

Next Human gate after canonical promotion:

`GI1-005 / HUMAN REVIEW / SELECT NEXT MATERIAL INTERNAL OPERABILITY PROPERTY`

No next material property is selected by this Result Package.

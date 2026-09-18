# RP-R1 — Genesis Execution Fabric V1

Status:

`PASS N=1 / LOCAL / BOUNDED / HUMAN REVIEW ACCEPTED`

Canonical execution base:

`8216ebf348b88d67d9f93bf16d64c19c4aa9660a`

Human Review:

`D038 / HUMAN ACCEPTS R1 GENESIS EXECUTION FABRIC V1 RESULT`

Current direction:

`D037 / GENESIS READINESS BEFORE EXTERNAL TRANSFER`

## Property tested

A bounded technical Work Packet can be executed by Codex in an isolated local
workspace, deterministically checked, independently challenged by another AI,
selectively repaired after adjudication, re-reviewed, and returned to Human
Review without giving the AIs Git-promotion authority.

Observed target:

`less founder plumbing without losing authority / scope / provenance boundaries`

## Execution history

### 1. Isolated Codex implementation

Canonical base:

`8216ebf348b88d67d9f93bf16d64c19c4aa9660a`

Primary human checkout had pre-existing local changes and was not used as the
execution workspace.

An isolated detached worktree was created.

Codex:

`codex-cli 0.150.0`

First execution:

`EXIT 0`

Changed paths:

1. `package.json`
2. `tools/cz-execution-fabric.mjs`
3. `tools/cz-execution-fabric.test.mjs`

Scope:

`PASS`

Initial focused tests:

`9/9 PASS`

The first validation happened under host Node `v22.23.2`; because the repository
requires Node 24, that pass was preserved as observed evidence but was not used
as the final supported-runtime validation.

### 2. First independent Kimi review transport failure

Local Kimi Code CLI existed:

`0.38.0`

but no model was configured.

Observed:

`KIMI CLI REVIEW = NOT EXECUTED`

Error:

`No model configured`

Model calls:

`0`

Paid spend:

`0`

The candidate remained byte-preserved.

### 3. First independent Kimi review through Vercel AI Gateway

The same preserved candidate/review bundle was sent through Vercel AI Gateway
to:

`moonshotai/kimi-k2.6`

Gateway result:

`HTTP 200`

Prompt tokens:

`5292`

Completion tokens:

`3000`

Total tokens:

`8292`

Gateway-reported cost:

`USD 0.0170274`

Review result:

`FAIL`

The review identified material and non-material findings.

The review was not treated as truth or Human authority.

### 4. Adjudication

Material / supported or partially supported findings included:

- validation-command wrapper/indirect-shell weakness;
- need for post-validation scope readback;
- unassessed error-path promotion semantics;
- cheap path/shell-variant coverage;
- bounded Codex execution timeout.

Rejected findings included:

- requiring `package.json` in every future runtime packet;
- the claim that Node `spawnSync.maxBuffer` was invalid;
- porcelain-v1 coupling as a current defect;
- deep-clone requirement without concrete loss.

Preserve:

`AI REVIEW ≠ TRUTH`

`AI FINDING ≠ ACCEPTED FINDING UNTIL ADJUDICATED`

### 5. Node 24 recovery and bounded repair

An already-installed local Node 24 runtime was discovered:

`/usr/local/opt/node@24/bin/node`

Version:

`v24.19.0`

No runtime installation was required.

Codex bounded repair:

`EXIT 0`

Scope remained exactly the same three repository paths.

Final focused tests under Node 24:

`14/14 PASS`

Observed final properties include:

- strict validation executable allowlist:
  `git / node / npm`;
- absolute/path-qualified validation executables rejected;
- shell/wrapper validation executables rejected;
- `shell=false`;
- final scope readback occurs after validations;
- Codex execution timeout:
  `30 minutes`;
- unassessed error envelope does not claim Git-promotion status was checked;
- missing Codex status fails closed;
- dot-prefixed allowed path rejection covered;
- Git HEAD remained unchanged.

### 6. Independent Kimi re-review

Candidate V2 was independently re-reviewed through Vercel AI Gateway using:

`moonshotai/kimi-k2.6`

Gateway result:

`HTTP 200`

Prompt tokens:

`9645`

Completion tokens:

`1609`

Total tokens:

`11254`

Gateway-reported cost:

`USD 0.01559875`

Verdict:

`PASS`

Findings:

`NONE`

The Kimi re-review explicitly confirmed supported repairs and the rejection of
several earlier incorrect/non-material findings.

Total observed Gateway cost across the two real Kimi review calls:

`USD 0.03262615`

This is cost evidence for this episode only.

### 7. Human Review

Marcos accepted:

`R1 GENESIS EXECUTION FABRIC V1 = PASS N=1 / LOCAL / BOUNDED`

with one caveat:

the promotion patch had to be reconstructed and verified to include the two new
untracked `tools/**` files.

### 8. Promotion-artifact caveat closure

A complete patch was reconstructed from:

- tracked `package.json` delta;
- new `tools/cz-execution-fabric.mjs`;
- new `tools/cz-execution-fabric.test.mjs`.

Complete patch SHA-256:

`8dd4643a51e26b265c021dd9535426f021fce42ab43b9a1dd33cd5c2018c9ae3`

Observed:

- patch file diffs: `3`;
- new-file diffs: `2`;
- `git apply --check`: `PASS`;
- clean-base `git apply`: `PASS`;
- exact Candidate V2/applied-copy hash parity: `PASS`;
- Node runtime: `v24.19.0`;
- focused tests: `14/14 PASS`;
- scope: exact three implementation paths;
- HEAD unchanged;
- model calls: `0`;
- paid spend: `0`.

Result:

`R1 HUMAN REVIEW CAVEAT = CLOSED`

## Final implementation property

R1 V1 provides a minimal local seam in which an explicitly authorized Work
Packet can bound Codex execution and produce a machine-readable result while
preserving:

- canonical-base check;
- dirty-worktree refusal;
- exact file scope;
- argv-based validation;
- no shell interpolation;
- bounded executable policy;
- post-validation scope readback;
- timeout;
- result classification ceiling;
- explicit non-Verification / non-canonical semantics.

It does not create a generic orchestrator.

## What was learned

1. Existing Codex capability was sufficient for the first executor; no new
   agent protocol was required.
2. Kimi did not need to be a locally configured CLI to serve as an independent
   reviewer; the existing Vercel AI Gateway could transport the review.
3. Independent AI review found real issues and also produced false or inflated
   findings.
4. Human/coordinator adjudication remained necessary.
5. Supported-runtime validation matters: an earlier test pass under Node 22 did
   not replace final Node 24 validation.
6. A normal `git diff` can omit untracked new files; promotion artifacts must
   explicitly account for them.
7. The episode reduced manual technical plumbing while preserving Human
   promotion authority.

## What this result does not demonstrate

R1 does not demonstrate:

- production readiness;
- hosted/public service;
- complete founder-light operation;
- general-purpose orchestration;
- R2 Genesis Experience;
- external utility;
- adoption;
- PMF;
- scale.

## Promotion state at package preparation

`COMMIT = NO`

`PUSH = NO`

`PR = NO`

`MERGE = NO`

`REMOTE SUPABASE = NO`

`DEPLOY = NO`

`FUNDS MOVED = NO`

`OUTREACH = NO`

Canonicality is determined by later Git promotion, not by this Result Package.

## Next gate

After an separately authorized canonical promotion:

`R2 / GENESIS EXPERIENCE`

R2 must use a separate bounded Work Packet and separate Human execution
authorization.

END

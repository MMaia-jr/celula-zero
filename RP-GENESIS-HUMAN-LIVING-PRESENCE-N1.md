# Result Package — Genesis Human / Living Presence N=1

## Result

`GENESIS HUMAN / LIVING PRESENCE N=1 = PASS N=1 / WITH RECOVERED FAILURES`

Canonical base inspected for this closeout:
`0918be03ea997a434cfe5e2dfc4302708a35100d`.

Genesis Human: Marcos.

This package records one founder-local episode. It does not establish external
utility, adoption, PMF, recurrence or scale.

## Lived objects and observations

- durable execution: `80028808-5893-4599-89eb-6454549f8497`;
- execution result: `SUCCEEDED`;
- provider/model: `moonshotai / moonshotai/kimi-k2.6`;
- provider-reported cost: `USD 0.0192387500 / KNOWN`;
- AI candidate: `5db1cce3-ed18-4344-8636-ef187e99bdec`;
- contaminated Human-review capture:
  `316664c7-60c8-46ca-8725-7c8b49373f58`;
- final deliberate Human review:
  `e78a30b4-b6d6-43c3-af24-01d2b3be2b85`.

Read-only closeout confirmed exactly one referenced execution, one referenced
candidate and two reviews for that candidate. The later deliberate review has
disposition `CORRECT` and is the effective Living Presence projection. The
earlier review remains queryable and unchanged.

## Failures and recovery

1. The durable worker assumed a host `psql` binary. The host Mac did not have
   it, exposing an undocumented runtime dependency before the queued execution
   was processed.
2. No duplicate Human authorization or execution was created. The same queued
   execution was recovered after a Docker/Supabase SQL transport and
   pre-dispatch preflight were added to the existing worker.
3. The first correct Human-review attempt used line-oriented input for semantic
   fields. A multiline paste left the representation empty and CZ aborted
   safely.
4. On restart, residual pasted input advanced through successive prompts and an
   unintended review was durably recorded.
5. Because the interface did not distinguish residual terminal capture from a
   deliberate confirmation, the contaminated review was durably recorded and
   temporarily became the effective projection. This violated the intended
   boundary between terminal capture and legitimate Human authority.
6. The terminal was repaired with bounded `.finish`-terminated multiline
   capture, exact disposition/statement/representation preview and the exact
   confirmation phrase `CONFIRMAR REVISÃO`.
7. Marcos explicitly identified that capture as unintended. The contaminated
   row was not deleted or rewritten. The existing append-only review primitive
   already permitted a second review;
   no schema extension was needed for supersession.
8. Marcos deliberately appended the later correction. Review history contains
   both rows, while the latest deliberate review supplies the effective
   representation.
9. A PRIVATE Living Presence export succeeded.

## Preserved boundaries

`TERMINAL CAPTURE ≠ INTENTIONAL HUMAN STATEMENT ≠ LEGITIMATE HUMAN AUTHORITY`

`AI CANDIDATE ≠ HUMAN REPRESENTATION`

The candidate remains attributable AI interpretation. Correction or adoption
remains an attributable Human act. Append-only history preserves both the
capture failure and its deliberate supersession.

`FOUNDER N=1 ≠ EXTERNAL UTILITY ≠ ADOPTION ≠ PMF ≠ SCALE`

## Local change classification at closeout

### REQUIRED_BY_OBSERVED_PROPERTY_LOSS

- `supabase/migrations/20260914120000_genesis_human_candidate_interpretation_contract.sql`
- `supabase/migrations/20260914160000_preproject_durable_ai_execution.sql`
- `scripts/cz-living-presence.py`
- `scripts/move2-vs1-worker.mjs`
- `package.json`

These files provide the private pre-Project record/candidate/review contract,
the single durable execution path, the Human terminal entrypoint, Docker SQL
fallback/preflight, and the discoverable `npm run live` command used in the
episode.

### SUPPORTING_TEST

- `supabase/tests/database/genesis_human_candidate_interpretation_contract.test.sql`
- `supabase/tests/database/preproject_durable_ai_execution.test.sql`
- `scripts/test_cz_living_presence.py`
- `scripts/move2-vs1-worker.test.mjs`

### UNRELATED_PREEXISTING — excluded from proposed promotion

- `.gitignore`
- `apps/web/app/globals.css`
- `apps/web/app/me/actions.ts`
- `apps/web/app/me/page.tsx`
- `apps/web/app/api/me/export/route.ts`
- `apps/web/lib/data/living-presence.ts`
- `apps/web/lib/domain/export-living-presence.ts`
- `apps/web/lib/domain/profile-draft.ts`
- `apps/web/tests/living-presence-export.test.ts`
- `apps/web/tests/profile-draft.test.ts`

The web data/export work does preserve latest-effective-review plus review
history consistently, but it is an untracked broader `/me` projection absent
from the canonical base and is not required to preserve or reproduce this
terminal-lived episode. It is therefore excluded as one coherent pre-existing
web slice.

### OUT_OF_SCOPE — excluded from proposed promotion

- `apps/web/next-env.d.ts` (generated Next.js development-path drift).

## Next gate

Discovery N=1 using the effective Human-corrected Living Presence. The exact
disposition is `CORRECT`, not `ADOPT`. External transfer remains a later gate
and is not implied by this founder-local result.

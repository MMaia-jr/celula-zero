# RP — Genesis Human Authenticated Return N=1

## Authority and scope

This Result Package records the observed local authenticated-return execution.
It is not D035 and does not constitute Human Direction or Wave 1 authorization.

Target: `celula-zero-genesis-human-epoch-2`
Canonical base: `88d68f320c8bb11f3ad224ba8ea768e260012121`

## Auth reconstruction and loadability history

The exact reconstructed Auth User was present in SQL but initially invisible
to GoTrue because `instance_id` was NULL. The authorized repair set it to the
zero UUID. GoTrue then reached the row but failed loading nullable string
fields. The exact four-field normalization set `confirmation_token`,
`recovery_token`, `email_change_token_new` and `email_change` to empty strings.
Admin GET and LIST then passed.

No Profile, PERSON, OWNER, Founder, SOURCE_MATERIAL or operational row was
changed by these Auth infrastructure operations.

## Current credential reestablishment

- Auth User: `63da4fe5-0deb-408f-863d-484a7c813ab0`
- Current local identifier: `marcos@celulazero.local`
- Supported GoTrue Admin API email identity: PASS
- Second Auth User: NO
- Verified external email: NO / NOT CLAIMED
- Credential status: CURRENT / REESTABLISHED

Current Auth reestablished ≠ historical credential recovered.

## Real passwordless login

The canonical local passwordless path used `create_user=false`.

- `/auth/v1/user` exact UUID: PASS
- Tokens printed: NO
- Tokens persisted: NO

Current login pass ≠ historical credential recovery.

## Auth → Profile → PERSON → OWNER

- Profile: `63da4fe5-0deb-408f-863d-484a7c813ab0`
- PERSON: `fd96e56f-1675-4b58-84de-ea1d3a1cff82`
- OWNER relation: PASS

## Founder authenticated readback

- Founder Record: `acce49f3-0dde-46d0-afd6-0b67b6bbe871`
- Class: `ORIGINAL_RECORD`
- Visibility: `PRIVATE`
- Content SHA-256: `0652c4a2733e7e6c5bd0b8fef7cf25ce2ef4f29fec82e7312c6ae755a8e3b0b6`
- Current intention record present: YES

Recorded current intention ≠ current Human revalidation.

## Native workspace readback

- ORIGINAL_RECORD: 1
- SOURCE_MATERIAL: 5
- Candidates: 0
- Reviews: 0
- AI executions: 0
- Projects / Needs / Opportunities / Cycles: 0
- Protected semantic state: unchanged

## Native Living Presence gap

Native `living_representation(workspace)` remained empty because no candidate or
review relational history was rehydrated. The historical exact Living Presence
remains available only as SOURCE_MATERIAL. Historical LP SOURCE_MATERIAL ≠
Native Current LP relational representation.

Observed result before composition:

`AUTH_ROW_NORMALIZED_AUTH_REESTABLISHED_FOUNDER_READBACK_PASS_WITH_NATIVE_GAP`

## Historical LP Context Composition N=1

Authenticated read-only composition selected the deterministic latest exact
export by embedded `exportedAt`. Source:

- record: `preproject_records:c002541d-de46-473e-9334-ef8e7ea3c356`
- schema: `cz.living-presence.v0`
- source digest: `0a364015fdd6ddf10490cb73de94caed053cceceb9e2159db59d8e7e82ecfd18`
- evidence class: `LOCAL_EXPORTED_EXACT`
- currentness: `PRESERVED HISTORICAL CONTEXT; NOT ASSERTED CURRENT`

The composition is a pure read projection. It does not populate
`living_representation`, candidates, reviews or executions. The Founder
intention remains a separate CURRENT INTENTIONS block and the canonical
direction remains separately sourced.

Deterministic tests passed: 23/23.

## Bounded hardening follow-up

Read-only inspection of the two actual Living Presence SOURCE_MATERIAL rows
confirmed that `provenance.source_class` is the persisted evidence binding for
`LOCAL_EXPORTED_EXACT`. The projection now requires that observed class,
present `content_sha256`, an exact recomputed digest, schema
`cz.living-presence.v0`, and an offset-aware `exportedAt`. Historical snapshots
are ordered by parsed instant, with record ID only as an equal-instant
tie-breaker. Invalid, naive, missing or mismatched evidence is omitted.

The hardened deterministic suite passed `26/26`. The authenticated N=1
re-read again selected `c002541d-de46-473e-9334-ef8e7ea3c356` with digest
`0a364015fdd6ddf10490cb73de94caed053cceceb9e2159db59d8e7e82ecfd18` and
observed provenance class `LOCAL_EXPORTED_EXACT`. Native relational Living
Presence remained empty; no candidates, reviews or executions were created.

## Result

`HISTORICAL_LP_CONTEXT_COMPOSITION_PASS_LOCAL_N1`

## Not demonstrated

- uninterrupted physical continuity;
- historical credential recovery;
- native relational reconstruction of historical AI/reviews;
- external utility, adoption, PMF or scale;
- Wave 1 resumption;
- production disaster recovery or general portability beyond prior local N=1 evidence.

# D028 — Human adopts fail-closed metabolism episode readback

Class:

`DECISION / HUMAN DIRECTION`

Authority:

`HUMAN / MARCOS`

Date:

`2026-09-10`

Status in this local package:

`REPRESENTED LOCAL / NON-CANONICAL`

## 1. Human Original Record

> O readback integrado de um episódio não pode ampliar os direitos de leitura dos materiais que ele referencia. Se o caller não puder ler diretamente algum material privado não-nulo do episódio, o episode row/getter deve falhar fechado, em vez de revelar seu ID, estado ou relação.

Preserve:

`ORIGINAL RECORD ≠ INTERPRETATION ≠ DECISION ≠ IMPLEMENTATION ≠ VERIFICATION`

## 2. Execution-confirmed problem that motivated the Decision

A Human-authorized local adversarial observation against canonical base:

`9e0707bac3d3b973070381f10a0e30e18557f3a1`

established a valid same-Cell / unrelated-Project control and observed:

- direct PRIVATE Contribution read: `DENY`;
- direct PRIVATE Artifact read: `DENY`;
- direct PRIVATE Claim read: `DENY`;
- direct `k002_metabolism_episodes` row: `VISIBLE`;
- `k002_get_metabolism_episode()`: `ALLOWED`;
- the episode row/getter exposed the exact private Contribution, Artifact and Claim IDs;
- classification: `PROPERTY_LOSS=CONFIRMED`.

The observation was:

`EXECUTED LOCAL / DETERMINISTIC / NON-CANONICAL`

It was not itself a policy decision or implementation authorization.

## 3. Normative rule

`EPISODE READBACK ≠ NEW READ AUTHORITY`

For the integrated metabolism readback, a caller must not gain visibility of
private material merely because the material is linked into an episode.

For any non-null privacy-bearing material reference whose direct read is denied
to the caller, the integrated episode readback must fail closed rather than
reveal that material's identifier, state or relationship through the episode
row or getter.

For the currently execution-confirmed first slice, the direct privacy-bearing
episode references are:

- `Contribution`;
- `Artifact`;
- `Claim`.

Therefore:

`DIRECT CHILD READ = DENY → EPISODE READBACK = DENY`

and:

`SAME-CELL ACCESS ≠ RIGHT TO OBSERVE PRIVATE PROJECT WORK`

## 4. First implementation strategy authorized with this Decision

The smallest authorized local correction may:

1. compose the existing canonical direct-read semantics for Contribution,
   Artifact and Claim;
2. make the `k002_metabolism_episodes` read policy fail closed when any non-null
   referenced child is not directly readable under those semantics;
3. make `k002_get_metabolism_episode()` enforce the same centralized predicate
   before returning the integrated payload.

The correction must not create a parallel ACL, membership model, privacy
ontology, publication mechanism or retention/deletion system.

The implementation should preserve existing child authorization semantics
rather than redefine D026/D027 or the bounded reviewer exception.

## 5. Explicit boundaries

This Decision does not by itself resolve:

- sensitivity semantics;
- retention/deletion or withdrawal;
- publication/public projection;
- cross-Cell sharing;
- AI-provider disclosure;
- Claim/Evidence audience semantics beyond their current canonical read rules;
- partial/redacted episode readback;
- a universal privacy schema;
- external utility or Two-Human habitability.

The first slice may fail closed for the whole episode. Field-by-field redaction
is not required or selected by this Decision.

Preserve:

`FAIL-CLOSED EPISODE ≠ CONTENT DELETION`

`READ DENIAL ≠ AUTHORITY REVOCATION`

`D028 LOCAL GREEN ≠ T12 FULL PRIVACY COMPLETE`

`LOCAL VERIFIED ≠ COMMITTED ≠ PUSHED ≠ MERGED ≠ CANONICAL`

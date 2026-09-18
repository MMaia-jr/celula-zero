# D041 — Human accepts R4 failure/restart/recovery and clean rebuild results

Class:

`DECISION / HUMAN DIRECTION`

Decision subtype:

`HUMAN REVIEW / RESULT ACCEPTANCE + DISPOSITION`

Authority:

`HUMAN / MARCOS`

Date:

`2026-09-18`

Promotion authority:

`NOT AUTHORIZED / LOCAL CANONICAL-PACKAGE PREPARATION ONLY`

## Human Review Original Record — recovery result and disposition

Marcos explicitly stated:

> Adoto `R4 — Genesis Execution Failure / Restart / Recovery V1 = PASS N=1 / LOCAL / BOUNDED` como resultado da Human Review. Reconheço como demonstrado um episódio controlado em que uma execução real terminou `FAILED / WITHIN_SCOPE`, o processo original terminou, um novo processo reconstruiu deterministicamente canonical base, Human authorization, Work Packet, result envelope, dirty worktree, changed paths, diff/hashes e estado de não promoção, sem retry automático, Codex adicional ou mutação do repositório. Isso não demonstra hard-crash recovery, general recovery, production recovery, cross-machine recovery, founder-light autonomy, external utility, adoption, PMF ou scale. Adoto a disposição `REBUILD_FROM_CLEAN_BASE`: o candidato parcial é preservado como evidência, mas não será tratado como execução válida nem promovido diretamente. Autorizo preparar um novo Work Packet limpo, contra o mesmo `main` canônico enquanto ele permanecer em `797d0292359d6ebf1ff0034ceecdf76b0200134a`, para reproduzir somente a alteração já revisada em `docs/OPERATIONS.md`, sem failure injection, usando a Execution Fabric canônica. Não autorizo ainda executar esse novo Work Packet, Codex, commit, push, PR, merge, Kimi ou paid review, Remote Supabase, deploy, fundos, outreach ou R5.

This is the Human Review acceptance of the controlled recovery episode and the
explicit Human disposition:

`REBUILD_FROM_CLEAN_BASE`

## Human Review Original Record — clean rebuild result

After the separately authorized clean rebuild executed, Marcos explicitly
stated:

> Adoto `R4 — Rebuild From Clean Base V1 = PASS N=1 / LOCAL / BOUNDED` como resultado da Human Review. Reconheço que, após a disposição `REBUILD_FROM_CLEAN_BASE`, uma nova execução partiu de checkout limpo no mesmo main canônico, usou a Execution Fabric canônica, modificou somente `docs/OPERATIONS.md`, terminou `COMPLETED / WITHIN_SCOPE`, reproduziu exatamente o target SHA-256 `8bc137d8ca3a75826f8798fd520c2624d460b00f6338d4751e42bf767faa1c24` e o patch SHA-256 `b1b2f9ad0754e39f71a69d77c70487af16195b3b872280bdf251c64fe0ea548b`, passou fresh readback e `19/19` regressões, sem reutilizar o dirty worktree anterior e sem promoção Git. Isso não transforma o episódio `FAILED` original em PASS e não demonstra hard-crash recovery, general recovery, production recovery, cross-machine recovery, founder-light autonomy, external utility, adoption, PMF ou scale. Autorizo preparar localmente o pacote canônico de R4 com a decisão humana, Work Packet(s) necessários para preservar corretamente a proveniência da execução falha e do rebuild, Result Package, `docs/OPERATIONS.md` e reconciliação mínima de `STATE.md`, além de validação local e reconstrução do diff completo. Não autorizo ainda commit, push, PR, merge, Kimi ou paid review, Remote Supabase, deploy, fundos, outreach ou R5. STOP se o escopo precisar mudar.

This is the Human Review acceptance of the clean rebuild and local canonical
package-preparation authority.

It is not Git-promotion authority.

## Accepted R4 result boundary

Controlled recovery:

`R4 FAILURE / RESTART / RECOVERY V1 = PASS N=1 / LOCAL / BOUNDED`

Clean rebuild:

`R4 REBUILD FROM CLEAN BASE V1 = PASS N=1 / LOCAL / BOUNDED`

Preserve:

`ORIGINAL FAILED EXECUTION REMAINS FAILED`

`RECOVERY PASS ≠ ORIGINAL EXECUTION PASS`

`REBUILD PASS ≠ ORIGINAL FAILED EXECUTION BECOMES PASS`

`RECOVERY ≠ RETRY`

`RECOVERY ≠ PROMOTION`

## Accepted learning

Observed chain:

`CONTROLLED FAILED EXECUTION → ORIGINAL PROCESS ENDS → NEW PROCESS → DETERMINISTIC RECONSTRUCTION → HUMAN DISPOSITION → NEW CLEAN EXECUTION → SAME REVIEWED TARGET BYTES`

The controlled failed execution demonstrated:

- process exit `0` can coexist with structured result `FAILED`;
- exact packet/base/scope/result/partial bytes can be reconstructed by a new
  process from durable material;
- no automatic retry or promotion is required to recover the episode.

The clean rebuild demonstrated:

- the Human disposition can be enacted from a new clean base;
- the old dirty worktree need not be reused;
- the same already-reviewed target bytes can be reproduced through the
  canonical Execution Fabric.

## What is not demonstrated

R4 does not demonstrate:

- hard-crash recovery;
- arbitrary interruption recovery;
- general recovery;
- production recovery;
- cross-machine recovery;
- provider-independent recovery;
- complete founder-light autonomy;
- external utility;
- adoption;
- PMF;
- scale.

## Package-preparation authorization

Authorized repository scope for local canonical-package preparation is exactly:

1. `decisions/D041-human-accepts-r4-failure-restart-recovery-and-clean-rebuild.md`
2. `WP-R4-GENESIS-EXECUTION-FAILURE-RESTART-RECOVERY-V1.md`
3. `WP-R4-REBUILD-FROM-CLEAN-BASE-V1.md`
4. `RP-R4-GENESIS-EXECUTION-FAILURE-RESTART-RECOVERY-V1.md`
5. `docs/OPERATIONS.md`
6. `STATE.md`

Authorized:

- preserve the two effective Work Packets as distinct records;
- preserve one Result Package for the full R4 episode;
- include only the already-reviewed/rebuilt Operations change;
- minimal `STATE.md` reconciliation;
- local deterministic validation;
- complete package patch reconstruction.

Not authorized:

- commit;
- push;
- pull request;
- merge;
- Kimi;
- paid-model review;
- Remote Supabase;
- deployment;
- movement of funds;
- external outreach;
- R5.

## Next gate

`HUMAN DECISION / SELECT NEXT GENESIS READINESS PROPERTY`

No next-gate execution is authorized by D041.

END

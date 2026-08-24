# WP-HA-001-FIRST-EXTERNAL-RUN

Class: `WORK PACKET / PRODUCT EXPERIMENT PREPARATION`
State: `PREPARED / NOT EXECUTED`
Parent experiment: `tests/HABITABLE-ALPHA-001.md`
Product direction: `decisions/D007-product-discovery-to-habitable-alpha.md`

## Purpose

Prepare the first real external-user run of `HABITABLE-ALPHA-001` without
pre-emptively implementing new product capability.

The decision this packet is meant to enable is:

> Does the current canonical product plus a minimal concierge process preserve
> enough of the action/history cycle to produce real external utility, or does
> the run expose one concrete missing property that justifies a vertical slice?

## Canonical base

At packet preparation, the known canonical transition baseline is the merge of
PR #96:

`7e07f70de7cb92744b56026d33550ac92b296b86`

Execution MUST read the current `origin/main` dynamically before any future
workspace or experiment operation. This SHA is provenance, not a permanent HEAD.

## Authority

This packet MAY:

- define selection criteria for the first run;
- define the minimum concierge experience;
- define privacy/data-minimization preconditions;
- define observations and STOP gates;
- define the expected Result Package;
- use existing canonical product capabilities in a real run after separate human
  authorization for the selected people/context;
- use an existing communication channel such as WhatsApp when sufficient.

This packet DOES NOT authorize:

- implementation code;
- database/schema/migration changes;
- deployment changes;
- merging PR #95;
- contacting or enrolling a real participant before human selection/authorization;
- copying real participant personal data into GitHub;
- native messaging;
- recommendation/matching systems;
- payment or financing flows;
- blockchain/smart-contract work;
- public exposure of participant identity/history without an appropriate lawful
  basis and consent for the scenario.

## Required real-world ingredients

Before execution, the human founder must identify:

1. `EXTERNAL PARTICIPANT` — one real person who did not build Célula Zero;
2. `CONTEXT` — one small real situation understandable without protocol theory;
3. `REAL NEED / PROJECT / ACTIVITY` — something that can genuinely happen;
4. `SECOND PERSON` — another real person whose participation/relation matters;
5. `ENTRY OPTION` — at least one legitimate path available now:
   - Discover / Act;
   - Need / Create;
   - History / Context, only if a legitimate shared past occurrence exists.

Do not manufacture a past occurrence or opportunity to complete the template.

## Selection criteria

Prefer a context where:

- the participant already has a plausible reason to act independent of Célula
  Zero;
- a useful consequence can occur within a short real cycle;
- the second person is reachable through normal social coordination;
- success does not require payment, token, smart contract or a large network;
- the founder can observe enough of the process without invasive data collection;
- failure can be classified without inventing engagement metrics.

Avoid, for the first run:

- vulnerable participants where power/consent is unclear;
- regulated financial or investment activity;
- sensitive personal-data scenarios when a simpler context exists;
- contexts that require fabricated supply;
- contexts whose value depends on the participant already understanding Célula
  Zero philosophy.

## Concierge-first experience

The minimum experience is not a new frontend.

Use, in order of preference:

1. current canonical Célula Zero capabilities;
2. existing public links/artifacts;
3. a small human-facilitated explanation limited to the immediate task;
4. an existing communication channel such as WhatsApp;
5. manual recording of observations outside public GitHub when personal data is
   involved.

Do not explain the protocol as a prerequisite for action.

Do not implement a missing feature during the run. If a blocking property
appears, record it and STOP that path.

## Baseline

Before the participant encounters Célula Zero, record privately and minimally:

- what they are already trying to do;
- how they would normally try to do it;
- which people/tools/channels they would normally use;
- what information is currently missing;
- what outcome would count as useful to them.

This establishes the counterfactual baseline:

`What would likely happen without CZ?`

Do not treat stated preference as observed outcome.

## Observation chain

Record each transition separately:

`ENTRY → ACTION → RELATION → SECOND PERSON → REAL-WORLD CONSEQUENCE → RETURN`

Do not infer later states from earlier ones.

Examples:

- `interest` ≠ `commitment`;
- `commitment` ≠ `execution`;
- `execution` ≠ `result`;
- `artifact` ≠ `verification`;
- reminder-driven return ≠ spontaneous recurring utility.

## Real-world consequence

At least one materially external consequence is required for candidate utility,
for example:

- real participation actually occurs;
- a real introduction is accepted and changes who can act with whom;
- a real commitment is established;
- a contribution or artifact is actually produced;
- a real decision changes because of the interaction/context.

The following do not count alone:

- view;
- click;
- signup;
- like;
- declaration of interest;
- message sent.

## Data / LGPD preflight

Before contacting the selected participant, create a private run note containing
only the minimum necessary data.

Default:

- do not ingest address books/contact lists;
- do not request identity documents;
- do not copy external profiles when a link/reference is enough;
- do not expose participation publicly by default;
- do not put real personal data into repository fixtures;
- prefer pseudonymous run identifiers in canonical documentation;
- separate consent/participation from later public attribution.

If a personal-data property is not necessary to answer the experiment question,
do not collect it.

## STOP gates

STOP the run path and classify the reason if any of the following occurs:

1. no real participant/context/second person has been selected;
2. the opportunity or history would need to be fabricated;
3. participation requires pressure, ambiguous consent or misleading framing;
4. a personal-data need appears without a defined purpose/minimization path;
5. execution requires a new feature that has not been separately authorized;
6. the participant cannot understand any immediate action without a long
   explanation of Célula Zero;
7. the supposed consequence reduces only to engagement telemetry;
8. the founder would need to claim verification/outcome not actually observed.

A STOP is evidence. Do not patch around it during the same run unless a new
human decision authorizes a narrower experiment.

## Missing-property gate

If the run is blocked by current capability, record:

`PROPERTY LOST`
- exact user action that cannot be preserved;
- why existing process/current object cannot preserve it;
- ADOPT/MAP mechanisms considered;
- smallest EXTEND candidate;
- falsifier for the claimed missing property.

Only then may a separate implementation Work Packet be proposed.

PR #95 may be reconsidered only if one or more of its concrete properties maps
to an observed blocking property. Existing work alone is not sufficient reason
for promotion.

## Expected Result Package

After an authorized run, produce a de-identified canonical Result Package with:

### Original Record boundary
- participant wording only where consented and necessary;
- otherwise a referenced/private source with no unnecessary personal data.

### Baseline
- what would likely have happened without CZ.

### Observed transitions
For each:
- `ENTRY`;
- `ACTION`;
- `RELATION`;
- `SECOND PERSON`;
- `REAL-WORLD CONSEQUENCE`;
- `RETURN`.

Classify each as observed/not observed/not applicable/unknown.

### Product contribution
- what CZ added;
- what existing channels added;
- what would have happened anyway;
- what became easier/harder.

### Missing properties
- none, or exact property-loss statements.

### Privacy
- data actually used;
- data deliberately not collected;
- public/private boundary.

### Final classification
One of:

`PASS / FAIL / PARTIAL / INCONCLUSIVE`

A local `FAIL N=1` is negative evidence for this run, not universal falsification.

## Candidate PASS N=1

Candidate PASS requires all:

1. external participant understands at least one available action without a
   private lecture on the protocol;
2. participant voluntarily takes a real action;
3. action establishes or materially changes a relation with a second person;
4. a real-world consequence occurs;
5. CZ preserves the sequence without collapsing commitment, execution, result,
   evidence and verification;
6. a later relevant change creates a concrete reason to return/re-engage.

Without item 6, classify at most `PARTIAL` for the full habitability claim.

## Definition of done for this Work Packet

This Work Packet is ready for execution when:

- `STATE.md` points to `HABITABLE-ALPHA-001` as active priority;
- the packet is canonical;
- the human founder selects the participant, context and second person;
- privacy/data-minimization preflight is explicitly accepted;
- no implementation is assumed as prerequisite.

This document does not itself execute the external run.

END OF WP-HA-001-FIRST-EXTERNAL-RUN

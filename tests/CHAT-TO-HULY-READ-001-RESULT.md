# CHAT-TO-HULY-READ-001 — RESULT

Date: 2026-08-18

## Question

Can a GPT retrieve the real operational state of the Huly workspace through an external bridge without the human manually copying that state from Huly into the conversation?

## Hypothesis

A minimal composition using:

GPT Action → HTTPS → authenticated local bridge → Huly API

can transport Huly state to a GPT while preserving read-only access and without requiring the human to manually reconstruct or copy that state.

## Scope

This experiment tested READ transport only.

It did not test:

- autonomous decision-making;
- WRITE operations initiated by the GPT;
- GitHub integration through the bridge;
- independent verification;
- replication by another person;
- external usefulness;
- adoption;
- scalability.

## Components used

- GPT personalized Action
- OpenAPI schema exposing only `GET /status`
- API-key authentication using the Bearer scheme
- temporary HTTPS tunnel
- local read-only Huly bridge
- official Huly API client
- Huly workspace `web4`

No Huly credential, bridge secret, or temporary tunnel URL is preserved in this record.

## Observations

### Local protected HTTP

Without Bearer credential:

`GET /status` → `401 Unauthorized`

With valid Bearer credential:

`GET /status` → `200 OK`

The response contained the current Huly state.

### External HTTPS transport

Public health request:

`GET /health` → `200 OK`

External request to `/status` without Bearer credential:

`GET /status` → `401 Unauthorized`

External request to `/status` with valid Bearer credential:

`GET /status` → `200 OK`

The returned state included:

- workspace: `web4`
- Intent: `Novo App`
- state: `completed`
- result: `Runtime behavior verified`
- evidence reference: `TECH-SPIKE-HULY-001-EVIDENCE-REF`
- 3 attached Contributions

### GPT Action

The GPT Action successfully called the external bridge and returned:

- workspace `web4`
- Intent `Novo App`
- state `completed`
- result `Runtime behavior verified`
- evidence reference `TECH-SPIKE-HULY-001-EVIDENCE-REF`
- 3 Contributions

The human did not manually copy the Huly state into the GPT for this retrieval.

## Result

**EXECUTED / PASS**

The tested property was demonstrated in this N=1 execution:

> A GPT can retrieve the current Huly state through the authenticated bridge without the human acting as the manual transport layer for that state.

## What this PASS does not demonstrate

This result does NOT establish:

- evidence-ladder VERIFIED;
- independent verification;
- replication;
- usefulness to an external user;
- product-market fit;
- adoption;
- generalization;
- scalability;
- superiority over simpler architectures;
- safe autonomous WRITE capability;
- that Huly is the final architecture;
- that GPT Actions are the final integration architecture.

## Material limitation

The external endpoint used a temporary development tunnel.

Therefore availability and endpoint persistence were not tested.

## Security boundary observed

The bridge exposed only read operations during this experiment.

The protected status endpoint rejected unauthenticated requests.

Secrets are intentionally excluded from this record.

## State change

Previous state:

A GPT had no demonstrated direct path to retrieve the Huly workspace state; Marcos remained a potential manual transport layer.

New evidence:

CHAT-TO-HULY-READ-001 executed successfully.

Change:

Direct authenticated READ transport from GPT to Huly was demonstrated in N=1.

Posterior state:

READ transport is an executed capability candidate.

WRITE transport, safe action authorization, replication, external usefulness, and architectural adoption remain unproven.

## Next candidate experiment

Test the narrower property:

GPT reads current Huly state → proposes one explicit Next Move → human authorizes exactly one operation → bridge materializes exactly that authorized operation → result is read back.

This next experiment must not silently automate human legitimacy or decision authority.

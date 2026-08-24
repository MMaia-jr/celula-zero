# Security Policy

Célula Zero is an early-stage human–AI community-laboratory and local-development software project. It does not currently claim production-grade security or an always-on public service.

## Supported scope

Security reports are useful when they concern the current canonical `main` branch, especially:

- authentication and authorization;
- Supabase Row Level Security or database access boundaries;
- exposure of secrets or personal data;
- unsafe path/file handling;
- repository automation or CI behavior that could expand authority;
- vulnerabilities in the current web application that create a concrete security impact.

Historical experiments, archived research and superseded prototypes may remain useful provenance without being supported production surfaces.

## Reporting a vulnerability

Please **do not publish exploit details, credentials, personal data or a working proof of exploitation in a public issue**.

Preferred path:

1. If GitHub shows a private **Report a vulnerability** / private vulnerability reporting option for this repository, use it.
2. If no private reporting option is available, open a minimal public issue titled `Private security contact requested` without technical exploit details, secrets or affected-user data. A private channel can then be established before disclosure.

Do not include secrets merely to prove that a secret can be exposed.

## What to include privately

When a private channel is available, include only what is necessary to reproduce and evaluate the finding:

- affected component/path;
- exact revision when known;
- bounded reproduction steps;
- observed behavior;
- expected security boundary;
- impact hypothesis, clearly separated from demonstrated impact;
- relevant logs or artifacts with secrets removed.

Preserve:

`finding ≠ exploitability ≠ impact ≠ severity ≠ remediation`

## Response expectations

This project does not currently promise a formal security SLA, bounty or reward. Reports will be triaged according to demonstrated risk, available evidence and project capacity.

A report, acknowledgment or patch does not by itself establish that the whole project is secure.

## Disclosure

Coordinate public disclosure when premature publication could create unnecessary risk. Human authorization remains required for sensitive disclosure decisions.

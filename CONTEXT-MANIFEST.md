# Context Manifest

Context version: CZ-CONTEXT-001

Canonical repository:
https://github.com/MMaia-jr/celula-zero

Context source commit:
88773b8e899ac70b241044b8c33df6d45d349315

This commit is the immutable source baseline for the required reading set.
The manifest itself may exist in a later commit and therefore does not attempt to reference its own Git commit hash.

## Purpose

This manifest defines the minimum shared reading set for agents participating in the current state of Célula Zero.

Access to the repository does not by itself prove successful reconstruction of context.

Agents must report:

- which files were actually accessed;
- which files could not be accessed;
- which commit/version they used;
- any uncertainty caused by partial access.

## Required reading

1. README.md
2. STATE.md
3. PROTOCOL.md
4. rounds/R06/README.md
5. rounds/R06/DeepSeek.md
6. rounds/R06/Claude.md
7. rounds/R06/Kimi.md
8. rounds/R06/Grok.md
9. rounds/R06/Gemini.md
10. questions/backlog.jsonl
11. incidents/CZ-001.md
12. rounds/R07-prompt.md

## Raw URLs

Base:

https://raw.githubusercontent.com/MMaia-jr/celula-zero/88773b8e899ac70b241044b8c33df6d45d349315/

Required files:

- README.md
- STATE.md
- PROTOCOL.md
- rounds/R06/README.md
- rounds/R06/DeepSeek.md
- rounds/R06/Claude.md
- rounds/R06/Kimi.md
- rounds/R06/Grok.md
- rounds/R06/Gemini.md
- questions/backlog.jsonl
- incidents/CZ-001.md
- rounds/R07-prompt.md

## Verification questions

These questions are not part of the research content. They are context-integrity checks.

1. What is the context source commit defined by this manifest?
2. What is the next step recorded in STATE.md?
3. What is Grok's revalidation status in STATE.md?
4. How many questions are present in questions/backlog.jsonl?
5. Which participant is assigned to examine Gemini in rounds/R07-prompt.md?
6. Does rounds/R07-prompt.md assign any explicit action to Marcos?
7. Which required files could you not access?

## Success criterion

Context reconstruction is considered successful only if the agent:

- identifies the correct context source commit;
- accurately answers the verification questions;
- distinguishes files actually read from files inferred through summaries;
- does not invent missing content;
- reports access failures explicitly.

## Current limitation

This manifest does not make the infrastructure fully decentralized.

It is an attempt to reduce context asymmetry by giving all participants the same versioned reading set and an explicit verification mechanism.

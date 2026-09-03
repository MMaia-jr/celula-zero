import test from "node:test";
import assert from "node:assert/strict";

import {
  validateMarkdown,
} from "./cz-compose-handoff.mjs";


test(
  "composed response validator uses Markdown rather than JSON",
  () => {
    const valid = `
# CZ EXTERNAL CONTINUITY RESPONSE

## DURABLE BASELINE
x

## CANONICAL VS LOCAL
x

## AUTHORITY
x

## UNCERTAINTIES
x

## NEXT SAFE MOVE
x

## LIMITATIONS
x
`;

    assert.equal(
      validateMarkdown(valid).ok,
      true,
    );

    const invalid =
      validateMarkdown(
        "# CZ EXTERNAL CONTINUITY RESPONSE\n",
      );

    assert.equal(
      invalid.ok,
      false,
    );
  },
);

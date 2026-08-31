import test from "node:test";
import assert from "node:assert/strict";

import {
  portableContext,
  portableMarkdown,
} from "./cz-room.mjs";

test("CZ-108 participation context is portable without leaking operator identity", () => {
  const projection = {
    canonical_state: {
      base: "test-base",
      boundaries: [],
    },
    project_name: "Participation portability test",
    cycle: {
      id: "cycle-1",
      parent_cycle_id: null,
      current_phase: "DREAMING",
      state: "OPEN",
      current_direction_record_id: null,
    },

    cycle_participations: [
      {
        participation_id: "participation-claude",
        actor_id: "actor-claude",
        actor_kind: "AI_AGENT",
        actor_name: "Claude Sonnet 5 — CZ-108 Researcher",
        affiliation: "ROOM",
        social_role: "RESEARCHER",
        principal_actor_id: null,
        mode: "ASSIST",
        mandate:
          "Investigate critically while preserving human authority.",
        valid_from: "2026-08-28T17:00:00Z",
        ended_at: null,

        // These simulate fields that must never be copied to the
        // provider-independent participant representation.
        operator_profile_id: "PRIVATE-PROFILE-SHOULD-NOT-LEAK",
        operator_label: "PRIVATE-OPERATOR-SHOULD-NOT-LEAK",
      },
      {
        participation_id: "participation-ended",
        actor_id: "actor-ended",
        actor_kind: "AI_AGENT",
        actor_name: "Historical AI",
        affiliation: "ROOM",
        social_role: "CRITIC",
        principal_actor_id: null,
        mode: "ASSIST",
        mandate: "Historical bounded participation.",
        valid_from: "2026-08-27T10:00:00Z",
        ended_at: "2026-08-27T11:00:00Z",
      },
    ],

    human_original_records: [],
    ai_original_records: [],
    ai_interpretations: [],
    ai_syntheses: [],
    record_relations: [],
    human_confirmations: [],
    human_responses: [],
    human_direction: null,
    bound_canonical_objects: [],
    open_questions: [],
    known_limitations: [],
  };

  const context = portableContext(projection);

  assert.equal(context.participants.length, 2);

  const claude = context.participants[0];

  assert.deepEqual(claude, {
    participation_id: "participation-claude",
    actor_id: "actor-claude",
    actor_kind: "AI_AGENT",
    actor_name: "Claude Sonnet 5 — CZ-108 Researcher",
    affiliation: "ROOM",
    social_role: "RESEARCHER",
    principal_actor_id: null,
    mode: "ASSIST",
    mandate:
      "Investigate critically while preserving human authority.",
    valid_from: "2026-08-28T17:00:00Z",
    ended_at: null,
    active: true,
  });

  assert.equal(context.participants[1].active, false);

  const serialized = JSON.stringify(context);

  assert.equal(
    serialized.includes("PRIVATE-PROFILE-SHOULD-NOT-LEAK"),
    false,
  );

  assert.equal(
    serialized.includes("PRIVATE-OPERATOR-SHOULD-NOT-LEAK"),
    false,
  );

  assert.ok(
    context.authority_boundaries.includes(
      "Participation != authority",
    ),
  );

  const markdown = portableMarkdown(context);

  assert.match(markdown, /Claude Sonnet 5 — CZ-108 Researcher/);
  assert.match(markdown, /Affiliation: ROOM/);
  assert.match(markdown, /Social role: RESEARCHER/);
  assert.match(markdown, /Mode: ASSIST/);
  assert.match(
    markdown,
    /Investigate critically while preserving human authority/,
  );
  assert.match(markdown, /PARTICIPATION_CONTEXT_ONLY/);
});

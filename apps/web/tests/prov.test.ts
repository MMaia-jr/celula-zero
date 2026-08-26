import { describe, expect, it } from "vitest";
import type { CoordinationHistory } from "@/lib/data/history";
import { toProvJsonLd } from "@/lib/domain/prov";

function history(): CoordinationHistory {
  return {
    viewer_scope: "PARTY",
    project: {
      id: "10000000-0000-4000-8000-000000000001",
      slug: "prov-test",
      title: "PROV test",
      steward_actor_id: "20000000-0000-4000-8000-000000000001",
    },
    need: {
      id: "30000000-0000-4000-8000-000000000001",
      title: "Need test",
      statement: "Need statement for provenance test.",
      owner_actor_id: "20000000-0000-4000-8000-000000000001",
      created_at: "2026-08-25T12:00:00Z",
    },
    opportunity: {
      id: "40000000-0000-4000-8000-000000000001",
      title: "Opportunity test",
      statement: "Opportunity statement for provenance test.",
      owner_actor_id: "20000000-0000-4000-8000-000000000001",
      version: 2,
      created_at: "2026-08-25T12:01:00Z",
    },
    proposal: {
      id: "50000000-0000-4000-8000-000000000001",
      proposer_actor_id: "20000000-0000-4000-8000-000000000002",
      version: 1,
      statement: "redacted-sensitive-body",
      created_at: "2026-08-25T12:02:00Z",
    },
    commitment: {
      id: "60000000-0000-4000-8000-000000000001",
      project_id: "10000000-0000-4000-8000-000000000001",
      opportunity_id: "40000000-0000-4000-8000-000000000001",
      opportunity_version: 2,
      proposal_id: "50000000-0000-4000-8000-000000000001",
      proposal_version: 1,
      proposer_actor_id: "20000000-0000-4000-8000-000000000002",
      accepted_by_actor_id: "20000000-0000-4000-8000-000000000001",
      created_at: "2026-08-25T12:03:00Z",
    },
    actors: [
      {
        actor_id: "20000000-0000-4000-8000-000000000001",
        name: "Steward",
        handle: "steward",
      },
      {
        actor_id: "20000000-0000-4000-8000-000000000002",
        name: "Contributor",
        handle: "contributor",
      },
      {
        actor_id: "20000000-0000-4000-8000-000000000003",
        name: "Reviewer",
        handle: "reviewer",
      },
    ],
    contributions: [
      {
        id: "70000000-0000-4000-8000-000000000001",
        author_actor_id: "20000000-0000-4000-8000-000000000002",
        description: "private-contribution-body",
        limitations: "private-contribution-limitations",
        supersedes_contribution_id: null,
        submitted_at: "2026-08-25T12:04:00Z",
      },
    ],
    artifacts: [
      {
        id: "80000000-0000-4000-8000-000000000001",
        contribution_id: "70000000-0000-4000-8000-000000000001",
        created_by_actor_id: "20000000-0000-4000-8000-000000000002",
        kind: "DOCUMENT",
        uri: "urn:cz:text:sha256:test",
        digest_algorithm: "SHA256",
        digest: "a".repeat(64),
        media_type: "text/plain",
        size_bytes: 42,
        created_at: "2026-08-25T12:05:00Z",
      },
    ],
    claims: [
      {
        id: "90000000-0000-4000-8000-000000000001",
        subject_type: "ARTIFACT",
        subject_id: "80000000-0000-4000-8000-000000000001",
        author_actor_id: "20000000-0000-4000-8000-000000000002",
        statement: "private-claim-body",
        scope_description: "private-claim-scope",
        created_at: "2026-08-25T12:06:00Z",
      },
    ],
    evidence: [
      {
        id: "a0000000-0000-4000-8000-000000000001",
        claim_id: "90000000-0000-4000-8000-000000000001",
        relation: "SUPPORTS",
        source_artifact_id: "80000000-0000-4000-8000-000000000001",
        custodian_actor_id: "20000000-0000-4000-8000-000000000002",
        description: "private-evidence-body",
        limitations: "private-evidence-limits",
        digest_algorithm: "SHA256",
        digest: "a".repeat(64),
        created_at: "2026-08-25T12:07:00Z",
      },
    ],
    verification_requests: [
      {
        id: "b0000000-0000-4000-8000-000000000001",
        claim_id: "90000000-0000-4000-8000-000000000001",
        requester_actor_id: "20000000-0000-4000-8000-000000000001",
        reviewer_actor_id: "20000000-0000-4000-8000-000000000003",
        criteria: "private-review-criteria",
        expected_method: "DIGEST_AND_CONTENT_REVIEW",
        independence: "INDEPENDENT",
        conflict_codes: [],
        due_at: "2026-09-01T12:08:00Z",
        state: "COMPLETED",
        created_at: "2026-08-25T12:08:00Z",
      },
    ],
    verifications: [
      {
        id: "c0000000-0000-4000-8000-000000000001",
        request_id: "b0000000-0000-4000-8000-000000000001",
        claim_id: "90000000-0000-4000-8000-000000000001",
        verifier_actor_id: "20000000-0000-4000-8000-000000000003",
        method: "DIGEST_AND_CONTENT_REVIEW",
        findings: "private-findings-body",
        classification: "PASS",
        limitations: "private-findings-limits",
        independence: "INDEPENDENT",
        conflict_codes: [],
        evidence_item_ids: ["a0000000-0000-4000-8000-000000000001"],
        created_at: "2026-08-25T12:09:00Z",
      },
    ],
    decisions: [
      {
        id: "d0000000-0000-4000-8000-000000000001",
        claim_id: "90000000-0000-4000-8000-000000000001",
        deciding_actor_id: "20000000-0000-4000-8000-000000000001",
        authority_basis: "PROJECT_STEWARDSHIP",
        disposition: "ACCEPT_FOR_CONTEXT",
        reason: "private-decision-reason",
        limitations: "private-decision-limits",
        verification_ids: ["c0000000-0000-4000-8000-000000000001"],
        created_at: "2026-08-25T12:10:00Z",
      },
    ],
    outcomes: [
      {
        id: "e0000000-0000-4000-8000-000000000001",
        decision_id: "d0000000-0000-4000-8000-000000000001",
        reporter_actor_id: "20000000-0000-4000-8000-000000000001",
        classification: "INCONCLUSIVE",
        statement: "private-outcome-body",
        observed_at: null,
        limitations: "private-outcome-limits",
        created_at: "2026-08-25T12:11:00Z",
      },
    ],
  };
}

describe("PROV derived projection", () => {
  it("maps native coordination records without treating PROV as the source of truth", () => {
    const projection = toProvJsonLd(history(), "https://example.test");
    expect(projection["@context"].prov).toBe("http://www.w3.org/ns/prov#");
    expect(projection["@context"].as).toBe("https://www.w3.org/ns/activitystreams#");
    expect(projection["cz:projectionNotice"]).toContain("does not establish truth");

    const graph = projection["@graph"];
    expect(graph.some((node) => node["@type"] === "prov:Activity")).toBe(true);
    expect(
      graph.some(
        (node) => Array.isArray(node["@type"]) && (node["@type"] as string[]).includes("cz:Decision"),
      ),
    ).toBe(true);
    expect(graph.some((node) => node["cz:domainType"] === "Outcome")).toBe(true);
  });

  it("does not export private narrative bodies as provenance metadata", () => {
    const serialized = JSON.stringify(toProvJsonLd(history(), "https://example.test"));
    for (const forbidden of [
      "private-contribution-body",
      "private-claim-body",
      "private-evidence-body",
      "private-findings-body",
      "private-decision-reason",
      "private-outcome-body",
    ]) {
      expect(serialized).not.toContain(forbidden);
    }
  });

  it("represents the bounded reviewer relationship with actedOnBehalfOf", () => {
    const projection = toProvJsonLd(history(), "https://example.test");
    const reviewer = projection["@graph"].find(
      (node) => node["cz:actorId"] === "20000000-0000-4000-8000-000000000003",
    );
    expect(reviewer?.["prov:actedOnBehalfOf"]).toBeTruthy();
    expect(reviewer?.["cz:delegationScope"]).toBe("verification.issue / PROJECT");
  });
});

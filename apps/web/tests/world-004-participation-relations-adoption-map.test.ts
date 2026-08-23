import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

type Decision = {
  property: string;
  classification: string;
  mechanism: string | null;
  concrete_property_lost_without_custom_creation: string | null;
  falsifier?: string;
};

type Contract = {
  schema: string;
  status: string;
  epistemic_boundaries: Record<string, boolean>;
  existing_cz_foundations: Array<{
    id: string;
    classification: string;
    canonical_path: string;
    properties: string[];
    boundary: string;
  }>;
  precedents: Array<{
    id: string;
    classification: string;
    runtime: string;
    use: string[];
    boundary: string;
  }>;
  architecture_decisions: Decision[];
  minimal_real_journey_candidate: {
    journey: string[];
    property_under_test: string;
    success: string;
    failure_signal_for_extension: string;
  };
  sponsorship_boundary: {
    meaning: string;
    does_not_imply: string[];
  };
  privacy_security_constraints: string[];
  rejections: string[];
  missing: unknown[];
  next_gate: string;
};

function load(): Contract {
  return JSON.parse(
    fs.readFileSync(
      path.resolve(
        process.cwd(),
        "../../standards/world-004/participation-relations-adoption-map.v1.json",
      ),
      "utf8",
    ),
  ) as Contract;
}

function decision(c: Contract, property: string) {
  const d = c.architecture_decisions.find((x) => x.property === property);
  if (!d) throw new Error(`missing decision: ${property}`);
  return d;
}

function foundation(c: Contract, id: string) {
  const f = c.existing_cz_foundations.find((x) => x.id === id);
  if (!f) throw new Error(`missing foundation: ${id}`);
  return f;
}

function precedent(c: Contract, id: string) {
  const p = c.precedents.find((x) => x.id === id);
  if (!p) throw new Error(`missing precedent: ${id}`);
  return p;
}

describe("WORLD-004A participation and relations adoption map", () => {
  const c = load();

  it("is a precedent gate and adds no runtime claim", () => {
    expect(c.schema).toBe(
      "cz.world-004.participation-relations-adoption-map.v1",
    );
    expect(c.status).toBe("PRECEDENT_GATE_NO_RUNTIME_CHANGE");
    expect(c.missing).toEqual([]);
  });

  it("adopts B1 role assignments as contextual authority with temporal validity", () => {
    expect(foundation(c, "B1_ROLE_ASSIGNMENTS").classification).toBe(
      "ADOPT_INTERNAL",
    );
    expect(foundation(c, "B1_ROLE_ASSIGNMENTS").properties).toEqual(
      expect.arrayContaining(["valid_from", "valid_until", "revoked_at"]),
    );
    expect(decision(c, "contextual_role_with_validity").classification).toBe(
      "ADOPT_INTERNAL",
    );
  });

  it("adopts Proposal-to-Commitment as opportunity-specific participation agreement", () => {
    expect(
      decision(c, "opportunity_specific_participation_agreement"),
    ).toMatchObject({
      classification: "ADOPT_INTERNAL",
      mechanism:
        "B1 Opportunity -> Proposal -> explicit acceptance -> Commitment",
    });
    expect(
      foundation(c, "B1_OPPORTUNITY_PROPOSAL_COMMITMENT").boundary,
    ).toContain("does not automatically create Project/Cell membership");
  });

  it("keeps delegation separate from participation relationship", () => {
    expect(decision(c, "bounded_authority_delegation").classification).toBe(
      "ADOPT_INTERNAL_SEPARATE_FROM_RELATION",
    );
    expect(c.epistemic_boundaries.delegation_is_relationship).toBe(false);
  });

  it("keeps legacy project_members from becoming a second authority model", () => {
    expect(foundation(c, "GATE1_PROJECT_MEMBERS").classification).toBe(
      "MAP_LEGACY_SURFACE",
    );
    expect(foundation(c, "H1_STEWARD_AUTHORITY_BRIDGE").boundary).toContain(
      "PROJECT_STEWARD",
    );
    expect(decision(c, "legacy_project_member_role").classification).toBe(
      "MAP_LEGACY_DO_NOT_EXPAND",
    );
  });

  it("keeps pilot membership limited to lab access/onboarding", () => {
    expect(decision(c, "pilot_access_onboarding").classification).toBe(
      "ADOPT_INTERNAL_LIMITED",
    );
    expect(foundation(c, "PILOT_INVITE_ACCESS").boundary).toContain(
      "not a general-purpose Cell/Project participation model",
    );
  });

  it("maps ActivityStreams lifecycle terms without adopting social federation runtime", () => {
    expect(precedent(c, "W3C_ACTIVITYSTREAMS_2")).toMatchObject({
      classification: "MAP_EXTERNAL_EVENT_VOCABULARY",
      runtime: "NOT_NEEDED",
    });
    expect(precedent(c, "W3C_ACTIVITYSTREAMS_2").use).toEqual(
      expect.arrayContaining(["Invite", "Accept", "Reject", "Join", "Leave"]),
    );
  });

  it("maps Schema.org temporal Role semantics without granting capabilities", () => {
    expect(precedent(c, "SCHEMA_ORG_ROLE")).toMatchObject({
      classification: "MAP_EXTERNAL_RELATION_SERIALIZATION",
      runtime: "NOT_NEEDED",
    });
    expect(precedent(c, "SCHEMA_ORG_ROLE").use).toEqual(
      expect.arrayContaining(["roleName", "startDate", "endDate"]),
    );
  });

  it("uses PROV-O only for activity association/provenance", () => {
    expect(precedent(c, "W3C_PROV_O_ASSOCIATION_ROLE").classification).toBe(
      "MAP_PROVENANCE",
    );
    expect(precedent(c, "W3C_PROV_O_ASSOCIATION_ROLE").boundary).toContain(
      "not a generic organization membership lifecycle",
    );
  });

  it("studies Matrix only for lifecycle distinctions", () => {
    expect(precedent(c, "MATRIX_MEMBERSHIP_LIFECYCLE")).toMatchObject({
      classification: "STUDY_MAP_STATE_MACHINE",
      runtime: "NOT_NEEDED",
    });
    expect(precedent(c, "MATRIX_MEMBERSHIP_LIFECYCLE").use).toEqual(
      expect.arrayContaining([
        "invite distinct from join",
        "knock/request distinct from participation",
        "leave distinct from ban/kick",
      ]),
    );
  });

  it("studies Decidim membership dates/positions without importing governance runtime", () => {
    expect(precedent(c, "DECIDIM_ASSEMBLY_MEMBERS")).toMatchObject({
      classification: "STUDY_MAP_ORGANIZATIONAL_MEMBERSHIP",
      runtime: "NOT_NEEDED",
    });
    expect(precedent(c, "DECIDIM_ASSEMBLY_MEMBERS").use).toEqual(
      expect.arrayContaining(["designation date", "ceased date"]),
    );
  });

  it("keeps generic Project/Cell lifecycle as one explicit deferred extension candidate", () => {
    const d = decision(c, "generic_project_or_cell_participation_lifecycle");
    expect(d.classification).toBe("EXTEND_CANDIDATE_DEFER");
    expect(d.concrete_property_lost_without_custom_creation?.length ?? 0)
      .toBeGreaterThan(180);
    expect(d.falsifier?.length ?? 0).toBeGreaterThan(120);
  });

  it("uses process-first sponsorship rather than new persistence", () => {
    const d = decision(c, "sponsorship_apadrinhamento_relation");
    expect(d.classification).toBe("MAP_PROCESS_FIRST");
    expect(d.falsifier).toContain("no dedicated sponsorship table is needed");
    expect(c.sponsorship_boundary.does_not_imply).toEqual(
      expect.arrayContaining([
        "permanent authority",
        "universal trust",
        "endorsement of all claims/actions",
        "future income right",
        "retroactive economic right",
      ]),
    );
  });

  it("rejects generic social graph, DAO/token membership and universal reputation", () => {
    expect(decision(c, "actor_to_actor_social_graph").classification).toBe(
      "REJECT_FOR_NOW",
    );
    expect(decision(c, "universal_membership_score_or_reputation").classification)
      .toBe("REJECT");
    expect(decision(c, "token_or_dao_membership").classification).toBe(
      "REJECT_FOR_MVP",
    );
  });

  it("preserves key semantic distinctions", () => {
    expect(c.epistemic_boundaries.discovery_is_participation).toBe(false);
    expect(c.epistemic_boundaries.request_is_acceptance).toBe(false);
    expect(c.epistemic_boundaries.invitation_is_membership).toBe(false);
    expect(c.epistemic_boundaries.membership_is_contribution).toBe(false);
    expect(c.epistemic_boundaries.membership_is_authority).toBe(false);
    expect(c.epistemic_boundaries.role_is_capability).toBe(false);
    expect(c.epistemic_boundaries.commitment_is_membership).toBe(false);
    expect(c.epistemic_boundaries.leave_or_revocation_is_history_deletion).toBe(
      false,
    );
  });

  it("defines the cheapest real-user journey before generic membership implementation", () => {
    expect(c.minimal_real_journey_candidate.journey).toEqual(
      expect.arrayContaining([
        "external person discovers PUBLIC Opportunity",
        "person submits Proposal",
        "human authority accepts exact Proposal/Opportunity versions",
        "Commitment records opportunity-specific participation",
        "Contribution/Artifact records actual work separately",
      ]),
    );
    expect(c.minimal_real_journey_candidate.property_under_test).toContain(
      "without inventing generic membership",
    );
  });

  it("inherits privacy constraints for future participation records", () => {
    expect(c.privacy_security_constraints).toEqual(
      expect.arrayContaining([
        "Participation state must not silently create authorization.",
        "Authorization must remain policy/capability based.",
        "Do not infer sensitive traits from participation or relation history.",
        "Do not publish relationship history by default.",
      ]),
    );
  });

  it("rejects shortcuts that conflate relation, authority and value", () => {
    expect(c.rejections).toEqual(
      expect.arrayContaining([
        "SOCIAL_GRAPH_AS_DEFAULT_ARCHITECTURE",
        "MEMBERSHIP_IMPLIES_AUTHORITY",
        "ROLE_IMPLIES_CONTRIBUTION",
        "SPONSORSHIP_IMPLIES_ENDORSEMENT",
        "SPONSORSHIP_IMPLIES_ECONOMIC_RIGHT",
        "TOKEN_GATED_MEMBERSHIP",
        "GRAPH_DATABASE_FOR_RELATIONS_WITHOUT_DEMONSTRATED_PROPERTY",
        "UNIVERSAL_REPUTATION_FROM_PARTICIPATION_HISTORY",
      ]),
    );
  });

  it("selects revalidation of the existing participation path as the next gate", () => {
    expect(c.next_gate).toBe(
      "WORLD-004B-REVALIDATE-EXISTING-PARTICIPATION-PATH-THEN-DECIDE-DEFERRED-GENERIC-LIFECYCLE",
    );
  });
});

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
  target_expression: string;
  anti_target_expression: string;
  epistemic_boundaries: Record<string, boolean>;
  existing_cz_foundations: Array<{
    id: string;
    classification: string;
    properties: string[];
    boundary: string;
    structural_limit?: string;
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
        "../../standards/world-005/trust-demonstrated-capacity-adoption-map.v1.json",
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

describe("WORLD-005A trust and demonstrated capacity adoption map", () => {
  const c = load();

  it("is a precedent gate with contextual trust rather than universal reputation", () => {
    expect(c.schema).toBe(
      "cz.world-005.trust-demonstrated-capacity-adoption-map.v1",
    );
    expect(c.status).toBe("PRECEDENT_GATE_NO_RUNTIME_CHANGE");
    expect(c.target_expression).toContain("BASED_ON_EVIDENCE");
    expect(c.anti_target_expression).toContain("UNIVERSAL_REPUTATION_SCORE");
    expect(c.missing).toEqual([]);
  });

  it("adopts WORLD-001 only for competency identity, not Actor proficiency", () => {
    expect(foundation(c, "WORLD_001_COMPETENCY_CONCEPT").classification).toBe(
      "ADOPT_INTERNAL",
    );
    expect(foundation(c, "WORLD_001_COMPETENCY_CONCEPT").boundary).toContain(
      "No Actor competency",
    );
    expect(decision(c, "actor_proficiency_state").classification).toBe(
      "REJECT_FOR_NOW",
    );
  });

  it("adopts observable Contribution and Artifact without calling them competence", () => {
    expect(foundation(c, "B2A_CONTRIBUTION_ARTIFACT").classification).toBe(
      "ADOPT_INTERNAL",
    );
    expect(foundation(c, "B2A_CONTRIBUTION_ARTIFACT").boundary).toContain(
      "not competence or trust conclusions",
    );
  });

  it("captures the exact current structural limit of Claim subjects", () => {
    const b2b1 = foundation(c, "B2B1_CLAIM_EVIDENCE");
    expect(b2b1.classification).toBe(
      "ADOPT_INTERNAL_WITH_STRUCTURAL_LIMIT",
    );
    expect(b2b1.structural_limit).toContain(
      "only CONTRIBUTION or ARTIFACT",
    );
    expect(b2b1.structural_limit).toContain(
      "Actor + CompetencyConcept + Context",
    );
  });

  it("adopts verification while preserving all four classifications", () => {
    const v = foundation(c, "B2B2_VERIFICATION");
    expect(v.classification).toBe("ADOPT_INTERNAL");
    expect(v.properties).toEqual(
      expect.arrayContaining([
        "PASS/FAIL/PARTIAL/INCONCLUSIVE terminal classifications",
        "independence/conflict snapshot",
        "examined evidence links",
      ]),
    );
    expect(v.boundary).toContain("does not promote");
  });

  it("maps CRediT as contribution-role vocabulary, not competency", () => {
    expect(precedent(c, "NISO_CREDIT")).toMatchObject({
      classification: "MAP_CONTRIBUTION_ROLE_VOCABULARY",
      runtime: "NOT_NEEDED",
    });
    expect(precedent(c, "NISO_CREDIT").boundary).toContain(
      "not evidence that the person possesses a competency",
    );
  });

  it("maps PROV-O for provenance but not trust", () => {
    expect(precedent(c, "W3C_PROV_O")).toMatchObject({
      classification: "MAP_PROVENANCE",
      runtime: "NOT_NEEDED",
    });
    expect(precedent(c, "W3C_PROV_O").boundary).toContain(
      "does not create trust",
    );
  });

  it("maps CASE for competency interchange without attainment claims", () => {
    expect(precedent(c, "IMS_CASE_1_1")).toMatchObject({
      classification: "MAP_COMPETENCY_INTERCHANGE",
      runtime: "NOT_NEEDED",
    });
    expect(precedent(c, "IMS_CASE_1_1").boundary).toContain(
      "does not by itself prove",
    );
  });

  it("maps Open Badges externally without making VC runtime critical", () => {
    expect(precedent(c, "OPEN_BADGES_3")).toMatchObject({
      classification: "MAP_EXTERNAL_ACHIEVEMENT_CREDENTIAL",
      runtime: "NOT_NEEDED",
    });
    expect(precedent(c, "OPEN_BADGES_3").use).toEqual(
      expect.arrayContaining([
        "Achievement criteria",
        "evidence associated with attainment",
        "skill/competency alignment",
        "optional third-party endorsement",
      ]),
    );
    expect(precedent(c, "OPEN_BADGES_3").boundary).toContain(
      "Do not adopt VC/DID",
    );
  });

  it("keeps cryptographic verification separate from semantic truth", () => {
    expect(precedent(c, "W3C_VC_DATA_MODEL_2").classification).toBe(
      "STUDY_EXTERNAL_CREDENTIAL_ENVELOPE",
    );
    expect(precedent(c, "W3C_VC_DATA_MODEL_2").boundary).toContain(
      "does not make the credential's semantic claim universally true",
    );
    expect(c.epistemic_boundaries.cryptographic_verification_is_semantic_truth)
      .toBe(false);
  });

  it("adopts the existing claim/evidence/verification chain before extending", () => {
    expect(decision(c, "contestable_claim_and_evidence_chain").classification)
      .toBe("ADOPT_INTERNAL");
    expect(decision(c, "independent_or_conflicted_verification").classification)
      .toBe("ADOPT_INTERNAL");
  });

  it("identifies exactly one typed demonstrated-capacity extension candidate", () => {
    const d = decision(c, "typed_contextual_demonstrated_capacity_assertion");
    expect(d.classification).toBe("EXTEND_CANDIDATE_DEFER");
    expect(d.concrete_property_lost_without_custom_creation?.length ?? 0)
      .toBeGreaterThan(200);
    expect(d.falsifier?.length ?? 0).toBeGreaterThan(150);
  });

  it("derives contextual trust rather than persisting a scalar score", () => {
    const d = decision(c, "contextual_trust_projection");
    expect(d.classification).toBe("MAP_DERIVE_DO_NOT_PERSIST_SCORE");
    expect(d.mechanism).toContain("no scalar score");
  });

  it("keeps portable credentials external and optional", () => {
    expect(decision(c, "portable_badge_or_credential").classification).toBe(
      "MAP_EXTERNAL_ONLY",
    );
    expect(decision(c, "blockchain_did_vc_as_critical_runtime").classification)
      .toBe("REJECT_FOR_MVP");
    expect(decision(c, "token_or_nft_badge").classification).toBe(
      "REJECT_FOR_MVP",
    );
  });

  it("rejects universal reputation and global ranking", () => {
    expect(decision(c, "universal_reputation_score").classification).toBe(
      "REJECT",
    );
    expect(decision(c, "leaderboard_or_global_rank").classification).toBe(
      "REJECT",
    );
  });

  it("preserves the complete epistemic ladder", () => {
    expect(c.epistemic_boundaries.activity_is_contribution).toBe(false);
    expect(c.epistemic_boundaries.contribution_is_result).toBe(false);
    expect(c.epistemic_boundaries.result_is_evidence).toBe(false);
    expect(c.epistemic_boundaries.evidence_is_verification).toBe(false);
    expect(c.epistemic_boundaries.verification_is_competence).toBe(false);
    expect(c.epistemic_boundaries.competence_is_universal_reputation).toBe(false);
    expect(c.epistemic_boundaries.claim_is_truth).toBe(false);
    expect(c.epistemic_boundaries.verification_pass_is_universal_endorsement)
      .toBe(false);
    expect(c.epistemic_boundaries.provenance_is_trust).toBe(false);
  });

  it("tests the cheapest trust journey before a new Actor competency relation", () => {
    expect(c.minimal_real_journey_candidate.journey).toEqual(
      expect.arrayContaining([
        "candidate produces attributable Contribution and Artifact",
        "a contestable Claim describes what the work demonstrates",
        "Artifact is registered as Evidence with limitations and relation",
        "reviewer verifies exact Claim/Evidence with PASS/FAIL/PARTIAL/INCONCLUSIVE",
      ]),
    );
    expect(c.minimal_real_journey_candidate.failure_signal_for_extension)
      .toContain("without reading/parsing free-text claims");
  });

  it("treats future person-level capacity assertions as privacy-sensitive architecture", () => {
    expect(c.privacy_security_constraints).toEqual(
      expect.arrayContaining([
        "Do not publish person-level inferred skills by default.",
        "Do not infer sensitive traits from contribution, participation or verification history.",
        "Negative or failed verification must preserve context and must not become a permanent universal stigma score.",
      ]),
    );
  });

  it("rejects shortcuts that manufacture reputation", () => {
    expect(c.rejections).toEqual(
      expect.arrayContaining([
        "UNIVERSAL_REPUTATION_SCORE",
        "GLOBAL_LEADERBOARD",
        "AUTOMATED_ACTOR_PROFICIENCY_PROFILE",
        "AI_INFERRED_SKILL_AS_FACT",
        "PASS_AS_UNIVERSAL_ENDORSEMENT",
        "PROVENANCE_AS_TRUST",
        "TOKEN_OR_NFT_BADGE_FOR_MVP",
      ]),
    );
  });

  it("selects revalidation before deciding the typed capacity assertion", () => {
    expect(c.next_gate).toBe(
      "WORLD-005B-REVALIDATE-EVIDENCE-VERIFICATION-TRUST-JOURNEY-THEN-DECIDE-TYPED-CAPACITY-ASSERTION",
    );
  });
});

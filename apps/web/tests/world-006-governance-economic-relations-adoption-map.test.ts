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
  core_flow: string;
  epistemic_boundaries: Record<string, boolean>;
  existing_cz_foundations: Array<{
    id: string;
    classification: string;
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
  economic_relation_rule: { sequence: string[]; rules: string[] };
  minimal_real_journey_candidate: {
    journey: string[];
    property_under_test: string;
    success: string;
    failure_signal_for_extension: string;
  };
  privacy_security_legal_constraints: string[];
  rejections: string[];
  missing: unknown[];
  next_gate: string;
};

function load(): Contract {
  return JSON.parse(
    fs.readFileSync(
      path.resolve(
        process.cwd(),
        "../../standards/world-006/governance-economic-relations-adoption-map.v1.json",
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

describe("WORLD-006A governance and economic relations adoption map", () => {
  const c = load();

  it("is a precedent gate with no runtime change", () => {
    expect(c.schema).toBe(
      "cz.world-006.governance-economic-relations-adoption-map.v1",
    );
    expect(c.status).toBe("PRECEDENT_GATE_NO_RUNTIME_CHANGE");
    expect(c.core_flow).toBe(
      "OPPORTUNITY_TO_CONDITIONS_TO_AGREEMENT_TO_CONTRIBUTION",
    );
    expect(c.missing).toEqual([]);
  });

  it("adopts versioned policy without equating policy to law", () => {
    expect(foundation(c, "B1_POLICY_VERSIONS").classification).toBe(
      "ADOPT_INTERNAL",
    );
    expect(foundation(c, "B1_POLICY_VERSIONS").boundary).toContain(
      "does not assert legal validity",
    );
    expect(c.epistemic_boundaries.policy_is_law).toBe(false);
  });

  it("adopts contextual authority and decision records without manufacturing legitimacy", () => {
    expect(decision(c, "contextual_operational_authority").classification)
      .toBe("ADOPT_INTERNAL");
    expect(decision(c, "auditable_human_or_authorized_decision").classification)
      .toBe("ADOPT_INTERNAL");
    expect(c.epistemic_boundaries.decision_record_is_legitimacy_by_itself)
      .toBe(false);
  });

  it("keeps economic regime as context rather than a transaction or right", () => {
    expect(foundation(c, "PROJECT_ECONOMIC_REGIME").classification).toBe(
      "ADOPT_INTERNAL_LIMITED",
    );
    expect(c.epistemic_boundaries.economic_regime_is_transaction).toBe(false);
    expect(c.epistemic_boundaries.contribution_is_economic_right).toBe(false);
  });

  it("adopts exact Opportunity/Proposal/Commitment terms before new agreement infrastructure", () => {
    const f = foundation(c, "B1_OPPORTUNITY_PROPOSAL_COMMITMENT_TERMS");
    expect(f.classification).toBe("ADOPT_INTERNAL_LIMITED");
    expect(f.properties).toEqual(
      expect.arrayContaining([
        "Opportunity conditions",
        "Proposal conditions",
        "Proposal reward_expectation",
        "exact Opportunity version in Commitment",
        "exact Proposal version in Commitment",
      ]),
    );
    expect(f.boundary).toContain("not a payment ledger");
  });

  it("maps ODRL Offer/Agreement/Duty vocabulary without importing runtime or legal claims", () => {
    const p = precedent(c, "W3C_ODRL_2_2");
    expect(p).toMatchObject({
      classification: "MAP_POLICY_AGREEMENT_VOCABULARY",
      runtime: "NOT_NEEDED",
    });
    expect(p.use).toEqual(
      expect.arrayContaining([
        "Offer",
        "Agreement",
        "Permission",
        "Prohibition",
        "Duty",
        "Constraint",
      ]),
    );
    expect(p.boundary).toContain("legal compliance");
  });

  it("studies OCDS process/history without importing public-procurement schema", () => {
    const p = precedent(c, "OPEN_CONTRACTING_DATA_STANDARD_1_1_5");
    expect(p).toMatchObject({
      classification: "STUDY_MAP_CONTRACT_PROCESS_PROVENANCE",
      runtime: "NOT_NEEDED",
    });
    expect(p.use).toEqual(
      expect.arrayContaining([
        "tender/opportunity stage",
        "award/selection stage",
        "contract/agreement stage",
        "implementation stage",
      ]),
    );
  });

  it("maps Schema.org Offer and ActivityStreams events only for external/interchange semantics", () => {
    expect(precedent(c, "SCHEMA_ORG_OFFER").classification).toBe(
      "MAP_EXTERNAL_OFFER_SERIALIZATION",
    );
    expect(precedent(c, "ACTIVITYSTREAMS_OFFER_ACCEPT").classification).toBe(
      "MAP_EVENT_VOCABULARY",
    );
  });

  it("identifies structured economic terms as one deferred extension candidate", () => {
    const d = decision(c, "structured_economic_agreement_terms");
    expect(d.classification).toBe("EXTEND_CANDIDATE_DEFER");
    expect(d.concrete_property_lost_without_custom_creation?.length ?? 0)
      .toBeGreaterThan(200);
    expect(d.falsifier?.length ?? 0).toBeGreaterThan(140);
  });

  it("defers payment/fulfillment records until a real transaction exists", () => {
    const d = decision(c, "payment_or_fulfillment_record");
    expect(d.classification).toBe("DEFER_UNTIL_REAL_TRANSACTION");
    expect(d.falsifier).toContain("No actual transaction");
  });

  it("keeps voting optional rather than universal governance", () => {
    expect(decision(c, "voting_mechanism").classification).toBe(
      "MAP_OPTIONAL_PROCEDURE_NOT_DEFAULT",
    );
    expect(c.epistemic_boundaries.vote_is_legitimacy_in_every_context).toBe(
      false,
    );
  });

  it("rejects DAO/token/smart-contract/treasury defaults", () => {
    expect(decision(c, "treasury").classification).toBe("REJECT_FOR_NOW");
    expect(decision(c, "dao_or_token_gated_governance").classification).toBe(
      "REJECT_FOR_MVP",
    );
    expect(decision(c, "smart_contract_for_agreement_or_payment").classification)
      .toBe("REJECT_FOR_MVP");
  });

  it("rejects retroactive economic rights from contribution", () => {
    expect(decision(c, "retroactive_economic_right_from_contribution").classification)
      .toBe("REJECT");
    expect(c.economic_relation_rule.rules).toEqual(
      expect.arrayContaining([
        "No economic right is inferred from participation.",
        "No economic right is inferred from Contribution alone.",
        "No retroactive economic right.",
      ]),
    );
  });

  it("preserves sponsorship separation", () => {
    expect(c.epistemic_boundaries.sponsorship_is_endorsement).toBe(false);
    expect(c.epistemic_boundaries.sponsorship_is_contribution).toBe(false);
    expect(c.epistemic_boundaries.sponsorship_is_economic_right).toBe(false);
  });

  it("preserves agreement/payment separation", () => {
    expect(c.epistemic_boundaries.opportunity_is_agreement).toBe(false);
    expect(c.epistemic_boundaries.agreement_is_payment).toBe(false);
    expect(c.epistemic_boundaries.payment_proof_is_contract_validity).toBe(
      false,
    );
  });

  it("defines the cheapest real economic journey before structured terms", () => {
    expect(c.minimal_real_journey_candidate.journey).toEqual(
      expect.arrayContaining([
        "Project declares economic regime",
        "Opportunity states explicit conditions",
        "participant submits Proposal with explicit conditions/reward expectation",
        "human authority accepts exact versions and creates Commitment",
        "participant contributes",
      ]),
    );
    expect(c.minimal_real_journey_candidate.failure_signal_for_extension)
      .toContain("trapped in free text");
  });

  it("requires a separate legal/security gate before real financial services", () => {
    expect(c.privacy_security_legal_constraints).toEqual(
      expect.arrayContaining([
        "Economic-regime labels are not legal classifications.",
        "Any real payment/financial service introduces a separate legal/security gate.",
        "A ledger or cryptographic proof does not establish legal compliance.",
      ]),
    );
  });

  it("rejects economic-governance shortcuts", () => {
    expect(c.rejections).toEqual(
      expect.arrayContaining([
        "DAO_AS_DEFAULT_GOVERNANCE",
        "TOKEN_GATED_AUTHORITY",
        "RETROACTIVE_REVENUE_SHARE",
        "CONTRIBUTION_IMPLIES_PAYMENT",
        "SMART_CONTRACT_BEFORE_REAL_PROPERTY",
        "TREASURY_BEFORE_REAL_FUNDS",
        "PAYMENT_RAIL_BEFORE_REAL_TRANSACTION",
      ]),
    );
  });

  it("selects revalidation before deciding structured economic terms", () => {
    expect(c.next_gate).toBe(
      "WORLD-006B-REVALIDATE-EXISTING-AGREEMENT-PATH-THEN-DECIDE-STRUCTURED-ECONOMIC-TERMS",
    );
  });
});

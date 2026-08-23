import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

type Decision = {
  property: string;
  classification: string;
  mechanism: string | null;
  concrete_property_lost_without_custom_creation: string | null;
};

type Contract = {
  schema: string;
  status: string;
  epistemic_boundaries: Record<string, boolean>;
  precedents: Array<{
    id: string;
    classification: string;
    runtime: string;
    boundary: string;
  }>;
  architecture_decisions: Decision[];
  minimal_discovery_request: {
    user_controlled_inputs: string[];
    not_allowed_by_default: string[];
  };
  minimal_result_contract_candidate: {
    fields: string[];
    candidate_reason_codes: string[];
    boundary: string;
  };
  ordering_policy: {
    default: string;
    candidate: string[];
    forbidden_without_new_evidence: string[];
    lexical_rank_boundary: string;
  };
  privacy_security_constraints: string[];
  rejections: string[];
  missing: unknown[];
  next_gate: string;
};

function loadContract(): Contract {
  return JSON.parse(
    fs.readFileSync(
      path.resolve(
        process.cwd(),
        "../../standards/world-003/contextual-discovery-adoption-map.v1.json",
      ),
      "utf8",
    ),
  ) as Contract;
}

function decision(contract: Contract, property: string) {
  const found = contract.architecture_decisions.find(
    (item) => item.property === property,
  );
  if (!found) throw new Error(`missing decision: ${property}`);
  return found;
}

function precedent(contract: Contract, id: string) {
  const found = contract.precedents.find((item) => item.id === id);
  if (!found) throw new Error(`missing precedent: ${id}`);
  return found;
}

describe("WORLD-003A contextual discovery adoption map", () => {
  const contract = loadContract();

  it("is a precedent gate with no runtime-change claim", () => {
    expect(contract.schema).toBe(
      "cz.world-003.contextual-discovery-adoption-map.v1",
    );
    expect(contract.status).toBe("PRECEDENT_GATE_NO_RUNTIME_CHANGE");
    expect(contract.missing).toEqual([]);
  });

  it("adopts PostgreSQL full-text search before custom search infrastructure", () => {
    expect(precedent(contract, "POSTGRESQL_FULL_TEXT_SEARCH")).toMatchObject({
      classification: "ADOPT",
      runtime: "EXISTING_POSTGRESQL",
    });
    expect(decision(contract, "lexical_search")).toMatchObject({
      classification: "ADOPT",
      mechanism: "PostgreSQL full-text search",
    });
  });

  it("keeps pg_trgm optional and lexical-only", () => {
    expect(precedent(contract, "POSTGRESQL_PG_TRGM")).toMatchObject({
      classification: "ADOPT_OPTIONAL",
    });
    expect(precedent(contract, "POSTGRESQL_PG_TRGM").boundary).toContain(
      "not semantic relevance",
    );
    expect(decision(contract, "typo_tolerance").classification).toBe(
      "ADOPT_OPTIONAL",
    );
  });

  it("adopts existing PostgREST filtering/pagination instead of a new API stack", () => {
    expect(precedent(contract, "POSTGREST_FILTERING")).toMatchObject({
      classification: "ADOPT",
      runtime: "EXISTING_SUPABASE_POSTGREST",
    });
    expect(decision(contract, "explicit_faceted_filtering").classification).toBe(
      "ADOPT",
    );
  });

  it("maps OpenReferral discovery dimensions without importing its runtime/schema", () => {
    expect(precedent(contract, "OPENREFERRAL_HSDS")).toMatchObject({
      classification: "MAP",
      runtime: "NOT_NEEDED",
    });
    expect(precedent(contract, "OPENREFERRAL_HSDS").boundary).toContain(
      "not Célula Zero's internal ontology",
    );
  });

  it("uses Decidim only as a scoped-search/product interaction precedent", () => {
    expect(precedent(contract, "DECIDIM_SEARCH")).toMatchObject({
      classification: "STUDY_MAP",
      runtime: "NOT_NEEDED",
    });
  });

  it("maps Schema.org JobPosting only for external opportunity serialization", () => {
    expect(precedent(contract, "SCHEMA_ORG_JOB_POSTING")).toMatchObject({
      classification: "MAP_EXTERNAL_SERIALIZATION",
      runtime: "NOT_NEEDED",
    });
    expect(precedent(contract, "SCHEMA_ORG_JOB_POSTING").boundary).toContain(
      "narrower than CZ Opportunity",
    );
  });

  it("reuses WORLD-001 competency relations instead of creating Actor competency profiles", () => {
    expect(decision(contract, "competency_filter")).toMatchObject({
      classification: "ADOPT_INTERNAL",
      mechanism: "WORLD-001 OpportunityVersionCompetency relations",
    });
    expect(decision(contract, "actor_competency_profile_for_matching").classification)
      .toBe("REJECT_FOR_NOW");
  });

  it("makes only two narrow extension candidates for the next slice", () => {
    const extendsNow = contract.architecture_decisions.filter(
      (item) => item.classification === "EXTEND_CANDIDATE",
    );
    expect(extendsNow.map((item) => item.property).sort()).toEqual([
      "cross_object_discovery_projection",
      "explainable_inclusion_reasons",
    ]);
    for (const item of extendsNow) {
      expect(
        item.concrete_property_lost_without_custom_creation?.length ?? 0,
      ).toBeGreaterThan(100);
    }
  });

  it("keeps Need and location deferred until a real journey demonstrates loss", () => {
    expect(decision(contract, "first_class_need_entity").classification).toBe(
      "DEFER",
    );
    expect(decision(contract, "location_model").classification).toBe("DEFER");
  });

  it("rejects opaque personalized ranking and premature vector infrastructure", () => {
    expect(decision(contract, "opaque_personalized_ranking").classification).toBe(
      "REJECT",
    );
    expect(decision(contract, "embeddings_vector_database").classification).toBe(
      "REJECT_FOR_NOW",
    );
    expect(contract.rejections).toEqual(
      expect.arrayContaining([
        "UNIVERSAL_REPUTATION_SCORE",
        "OPAQUE_MATCH_SCORE",
        "AI_RECOMMENDER_AS_CRITICAL_PATH",
        "VECTOR_DB_BEFORE_LEXICAL_SEARCH_FAILURE",
        "GRAPH_DB_FOR_DISCOVERY_WITHOUT_DEMONSTRATED_PROPERTY",
      ]),
    );
  });

  it("keeps discovery inputs explicit and user-controlled", () => {
    expect(contract.minimal_discovery_request.user_controlled_inputs).toEqual(
      expect.arrayContaining([
        "text_query_optional",
        "result_types_optional",
        "competency_concept_ids_optional",
        "competency_relation_types_optional",
      ]),
    );
    expect(contract.minimal_discovery_request.not_allowed_by_default).toEqual(
      expect.arrayContaining([
        "inferred_sensitive_traits",
        "hidden_actor_profile",
        "universal_reputation_score",
        "automatic_location_tracking",
      ]),
    );
  });

  it("defines deterministic reason codes that explain inclusion without endorsing it", () => {
    expect(contract.minimal_result_contract_candidate.candidate_reason_codes).toEqual(
      expect.arrayContaining([
        "TEXT_MATCH",
        "EXPLICIT_COMPETENCY_REQUIRED_MATCH",
        "EXPLICIT_COMPETENCY_PREFERRED_MATCH",
        "EXPLICIT_COMPETENCY_LEARNING_TARGET_MATCH",
      ]),
    );
    expect(contract.minimal_result_contract_candidate.boundary).toContain(
      "do not prove relevance",
    );
  });

  it("keeps default ordering deterministic and non-personalized", () => {
    expect(contract.ordering_policy.default).toBe(
      "DETERMINISTIC_NON_PERSONALIZED",
    );
    expect(contract.ordering_policy.forbidden_without_new_evidence).toEqual(
      expect.arrayContaining([
        "hidden personalized score",
        "reputation-weighted rank",
        "AI-generated suitability score",
      ]),
    );
    expect(contract.ordering_policy.lexical_rank_boundary).toContain(
      "lexical ordering only",
    );
  });

  it("preserves privacy and lifecycle constraints in discovery", () => {
    expect(contract.privacy_security_constraints).toEqual(
      expect.arrayContaining([
        "Apply object visibility/RLS before discovery output.",
        "BLOCKED content must not be indexed or returned through a discovery projection.",
        "Do not use raw intention text to infer protected/sensitive traits.",
        "Do not persist search history by default.",
      ]),
    );
  });

  it("keeps core epistemic boundaries false", () => {
    expect(contract.epistemic_boundaries.search_result_is_recommendation).toBe(false);
    expect(contract.epistemic_boundaries.recommendation_is_endorsement).toBe(false);
    expect(contract.epistemic_boundaries.relevance_is_truth).toBe(false);
    expect(
      contract.epistemic_boundaries.shared_competency_term_is_verified_competence,
    ).toBe(false);
    expect(contract.epistemic_boundaries.lexical_rank_is_contextual_trust).toBe(false);
  });

  it("selects one external-user discovery projection as the next gate", () => {
    expect(contract.next_gate).toBe(
      "WORLD-003B-MINIMAL-DISCOVERY-PROJECTION-FOR-ONE-EXTERNAL-USER-JOURNEY",
    );
  });
});

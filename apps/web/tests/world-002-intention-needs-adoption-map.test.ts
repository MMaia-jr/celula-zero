import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

type Contract = {
  schema: string;
  world: string;
  current_cz_state: {
    project_intents: Record<string, unknown>;
    projects: Record<string, unknown>;
  };
  epistemic_boundaries: Record<string, boolean>;
  sources: Array<{ id: string; semantic_use: string; runtime: string }>;
  legal_constraints: Array<{ id: string; role: string }>;
  property_decisions: Array<{
    property: string;
    classification: string;
    sources: string[];
    external_terms?: string[];
  }>;
  extension_candidates: Array<{
    property: string;
    classification: string;
    implementation_stage: string;
    concrete_property_lost_without_extension: string;
  }>;
  rejections: Array<{ item: string; classification: string }>;
  missing: unknown[];
  next_gate: string;
};

function loadContract(): Contract {
  const file = path.resolve(
    process.cwd(),
    "../../standards/world-002/intention-needs-adoption-map.v1.json",
  );
  return JSON.parse(fs.readFileSync(file, "utf8")) as Contract;
}

function property(contract: Contract, name: string) {
  const found = contract.property_decisions.find((item) => item.property === name);
  if (!found) throw new Error(`missing property decision: ${name}`);
  return found;
}

function rejection(contract: Contract, name: string) {
  const found = contract.rejections.find((item) => item.item === name);
  if (!found) throw new Error(`missing rejection: ${name}`);
  return found;
}

describe("WORLD-002A intention and needs precedent gate", () => {
  const contract = loadContract();

  it("records current CZ gaps instead of pretending WORLD-002 is implemented", () => {
    expect(contract.schema).toBe("cz.world-002.intention-needs-adoption-map.v1");
    expect(contract.world).toBe("WORLD-002");
    expect(contract.current_cz_state.project_intents).toMatchObject({
      append_only: true,
      explicit_producer_actor: false,
      explicit_derivation_link: false,
      withdrawal_or_invalidation_lifecycle: false,
    });
    expect(contract.current_cz_state.projects).toMatchObject({
      current_intent_is_separate_text_projection: true,
      needs_is_text_array: true,
      need_provenance: false,
      need_versioning: false,
    });
  });

  it("maps provenance and revision to PROV-O without requiring RDF runtime", () => {
    expect(property(contract, "record_producer_attribution")).toMatchObject({
      classification: "MAP",
      sources: ["W3C_PROV_O", "W3C_ACTIVITYSTREAMS_2"],
    });
    expect(property(contract, "interpretation_derivation")).toMatchObject({
      classification: "MAP",
      external_terms: ["prov:wasDerivedFrom", "prov:hadPrimarySource"],
    });
    expect(property(contract, "intent_revision")).toMatchObject({
      classification: "MAP",
      external_terms: ["prov:wasRevisionOf"],
    });
    expect(contract.sources.find((source) => source.id === "W3C_PROV_O")?.runtime)
      .toBe("NOT_NEEDED");
  });

  it("maps accept/reject/withdrawal but never treats acceptance as truth", () => {
    expect(property(contract, "interpretation_accept_reject")).toMatchObject({
      classification: "MAP",
      sources: ["W3C_ACTIVITYSTREAMS_2"],
      external_terms: ["as:Accept", "as:Reject"],
    });
    expect(property(contract, "intent_withdrawal_or_invalidation")).toMatchObject({
      classification: "MAP",
    });
    expect(contract.epistemic_boundaries.acceptance_is_human_direction_not_truth)
      .toBe(true);
    expect(contract.epistemic_boundaries.interpretation_is_not_truth).toBe(true);
  });

  it("rejects ActivityStreams audience as authorization and keeps CZ RLS", () => {
    expect(property(contract, "access_control")).toMatchObject({
      classification: "ADOPT",
      sources: ["CZ_POSTGRESQL_RLS", "SOLID_WAC"],
    });
    expect(rejection(contract, "activitystreams_audience_as_authorization"))
      .toMatchObject({ classification: "REJECT" });
  });

  it("maps DPV as privacy metadata vocabulary but not legal authority", () => {
    expect(property(contract, "privacy_processing_metadata")).toMatchObject({
      classification: "MAP",
      sources: ["DPV_2_3", "LGPD", "ANPD_GUIDANCE"],
    });
    expect(contract.sources.find((source) => source.id === "DPV_2_3")?.runtime)
      .toBe("NOT_NEEDED");
    expect(contract.legal_constraints.map((item) => item.id)).toContain("LGPD");
    expect(contract.legal_constraints.map((item) => item.id)).toContain("ANPD_GUIDANCE");
    expect(rejection(contract, "consent_as_universal_lgpd_legal_basis"))
      .toMatchObject({ classification: "REJECT" });
  });

  it("does not adopt Demand or Open311 as the general Need model", () => {
    expect(property(contract, "public_goods_or_services_demand_serialization"))
      .toMatchObject({ classification: "DEFER", sources: ["SCHEMA_DEMAND"] });
    const need = contract.extension_candidates.find(
      (item) => item.property === "need_statement",
    );
    expect(need?.classification).toBe("EXTEND_CANDIDATE");
    expect(rejection(
      contract,
      "projects_needs_text_array_as_sufficient_long_term_semantic_model",
    )).toMatchObject({ classification: "REJECT" });
  });

  it("keeps ATProto and Solid as precedents rather than runtime dependencies", () => {
    expect(contract.sources.find((source) => source.id === "ATPROTO_REPOSITORY")?.runtime)
      .toBe("NOT_NEEDED");
    expect(contract.sources.find((source) => source.id === "SOLID_WAC")?.runtime)
      .toBe("NOT_NEEDED");
    expect(rejection(contract, "atproto_repository_runtime")).toMatchObject({
      classification: "NOT_NEEDED",
    });
    expect(rejection(contract, "solid_pod_or_wac_runtime")).toMatchObject({
      classification: "NOT_NEEDED",
    });
  });

  it("requires separate provenance, human decision and current projection candidates", () => {
    const candidates = new Map(
      contract.extension_candidates.map((item) => [item.property, item]),
    );
    for (const name of [
      "intent_record_provenance",
      "separate_intent_decision",
      "operative_current_intent_projection",
    ]) {
      const candidate = candidates.get(name);
      expect(candidate?.classification).toBe("EXTEND_CANDIDATE");
      expect(candidate?.implementation_stage).toBe("WORLD-002B");
      expect(candidate?.concrete_property_lost_without_extension.length)
        .toBeGreaterThan(60);
    }
  });

  it("keeps Need distinct from intention, opportunity and competency", () => {
    expect(contract.epistemic_boundaries.need_is_not_opportunity).toBe(true);
    expect(contract.epistemic_boundaries.need_is_not_competency).toBe(true);
    expect(contract.epistemic_boundaries.need_is_not_opportunity_requirement)
      .toBe(true);
  });

  it("rejects automatic AI operationalization and permanent free-text retention", () => {
    expect(rejection(
      contract,
      "ai_interpretation_becomes_operative_without_human_acceptance",
    )).toMatchObject({ classification: "REJECT" });
    expect(rejection(
      contract,
      "permanent_immutable_retention_of_all_free_text_personal_data",
    )).toMatchObject({ classification: "REJECT" });
    expect(rejection(contract, "automatic_sensitive_trait_inference"))
      .toMatchObject({ classification: "REJECT" });
  });

  it("makes no unsupported MISSING claim and identifies the next minimal gate", () => {
    expect(contract.missing).toEqual([]);
    expect(contract.next_gate).toBe(
      "WORLD-002B-INTENT-PROVENANCE-DECISION-MINIMAL",
    );
  });
});

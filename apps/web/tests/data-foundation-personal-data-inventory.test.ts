import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

type InventoryItem = {
  surface: string;
  risk: string;
  current_control: string;
  gap: string;
};

type Contract = {
  schema: string;
  status: string;
  legal_note: string;
  legal_sources: Array<{ id: string; authority: string; relevant_articles?: string[] }>;
  semantic_sources: Array<{ id: string; classification: string; runtime: string; boundary: string }>;
  epistemic_boundaries: Record<string, boolean>;
  risk_classes: Record<string, string>;
  inventory: InventoryItem[];
  property_decisions: Array<{
    property: string;
    classification: string;
    concrete_property_lost_without_extension: string;
    existing_mechanism?: string;
  }>;
  rejections: Array<{ item: string; classification: string }>;
  minimum_lifecycle_states_to_support_later: string[];
  deferred: Array<{ item: string; reason: string }>;
  missing: unknown[];
  next_gate: string;
};

function loadContract(): Contract {
  const file = path.resolve(
    process.cwd(),
    "../../standards/data-foundation/personal-data-inventory.v1.json",
  );
  return JSON.parse(fs.readFileSync(file, "utf8")) as Contract;
}

function inventory(contract: Contract, surface: string) {
  const found = contract.inventory.find((item) => item.surface === surface);
  if (!found) throw new Error(`missing inventory surface: ${surface}`);
  return found;
}

function decision(contract: Contract, property: string) {
  const found = contract.property_decisions.find((item) => item.property === property);
  if (!found) throw new Error(`missing property decision: ${property}`);
  return found;
}

function rejection(contract: Contract, item: string) {
  const found = contract.rejections.find((entry) => entry.item === item);
  if (!found) throw new Error(`missing rejection: ${item}`);
  return found;
}

describe("DATA-FOUNDATION-001A persisted personal-data inventory", () => {
  const contract = loadContract();

  it("is an inventory/lifecycle decision artifact rather than a compliance claim", () => {
    expect(contract.schema).toBe("cz.data-foundation.personal-data-inventory.v1");
    expect(contract.status).toBe("INVENTORY_AND_LIFECYCLE_DECISIONS_ONLY");
    expect(contract.legal_note).toContain("does not itself determine legal compliance");
    expect(contract.missing).toEqual([]);
  });

  it("uses current Brazilian legal sources and keeps DPV as vocabulary only", () => {
    expect(contract.legal_sources.map((source) => source.id)).toEqual(
      expect.arrayContaining(["LGPD", "ANPD_DATA_SUBJECT_RIGHTS", "ANPD_SMALL_PROCESSOR_RULES"]),
    );
    const lgpd = contract.legal_sources.find((source) => source.id === "LGPD");
    expect(lgpd?.relevant_articles).toEqual(
      expect.arrayContaining(["6", "15", "16", "18", "37", "46", "49"]),
    );
    const dpv = contract.semantic_sources.find((source) => source.id === "DPV_V2");
    expect(dpv).toMatchObject({ classification: "MAP", runtime: "NOT_NEEDED" });
    expect(dpv?.boundary).toContain("not Brazilian legal authority");
  });

  it("does not confuse pseudonymisation, hashing, visibility or provenance with legal safety", () => {
    expect(contract.epistemic_boundaries.pseudonymous_actor_id_is_not_anonymisation).toBe(true);
    expect(contract.epistemic_boundaries.hash_is_not_anonymisation).toBe(true);
    expect(contract.epistemic_boundaries.visibility_is_not_lawful_basis).toBe(true);
    expect(contract.epistemic_boundaries.provenance_is_not_lawful_basis).toBe(true);
    expect(
      contract.epistemic_boundaries
        .append_only_semantic_history_is_not_permission_for_permanent_personal_data_retention,
    ).toBe(true);
  });

  it("inventories direct identifiers and pseudonymous identity relations", () => {
    expect(inventory(contract, "profiles.display_name").risk).toBe("DIRECT_IDENTIFIER");
    expect(inventory(contract, "pilot_invites.email").risk).toBe("DIRECT_IDENTIFIER");
    expect(inventory(contract, "actors.operator_profile_id").risk).toBe("PSEUDONYMOUS_RELATION");
  });

  it("inventories the free-text project/intention surfaces that triggered this gate", () => {
    for (const surface of [
      "projects.title",
      "projects.summary",
      "projects.current_intent",
      "projects.intended_result",
      "projects.rules_and_limits",
      "project_intents.content",
    ]) {
      expect(inventory(contract, surface).risk).toBe("POTENTIAL_PERSONAL_FREE_TEXT");
    }
    expect(inventory(contract, "projects.needs").risk).toBe("POTENTIAL_PERSONAL_ARRAY");
  });

  it("treats event/decision/receipt JSON as potential duplication surfaces", () => {
    expect(inventory(contract, "events.payload").risk).toBe("POTENTIAL_PERSONAL_JSON");
    expect(inventory(contract, "decision_records.payload").risk).toBe("POTENTIAL_PERSONAL_JSON");
    expect(inventory(contract, "command_receipts.result").risk).toBe("POTENTIAL_PERSONAL_JSON");
    expect(inventory(contract, "domain_events.payload").risk).toBe("POTENTIAL_PERSONAL_JSON");
  });

  it("inventories contribution, claim, evidence and verification text", () => {
    for (const surface of [
      "contributions.description",
      "contributions.limitations",
      "claims.statement",
      "claims.scope_description",
      "evidence_items.description",
      "evidence_items.limitations",
      "verification_requests.criteria",
      "verifications.findings",
      "verifications.limitations",
    ]) {
      expect(inventory(contract, surface).risk).toBe("POTENTIAL_PERSONAL_FREE_TEXT");
    }
  });

  it("does not assume competency semantic text is technically guaranteed non-personal", () => {
    expect(inventory(contract, "competency_concepts.preferred_label").risk)
      .toBe("LIKELY_NON_PERSONAL_SEMANTIC_TEXT");
    expect(inventory(contract, "competency_concepts.statement").risk)
      .toBe("LIKELY_NON_PERSONAL_SEMANTIC_TEXT");
    expect(inventory(contract, "opportunity_version_competencies.rationale").risk)
      .toBe("POTENTIAL_PERSONAL_FREE_TEXT");
  });

  it("requires concrete extensions only where current controls lose a property", () => {
    for (const property of [
      "processing_activity_registry",
      "data_subject_access_export",
      "content_blocking_control",
      "lawful_payload_elimination_or_anonymisation",
      "event_and_receipt_data_minimisation",
    ]) {
      const d = decision(contract, property);
      expect(d.classification).toContain("EXTEND");
      expect(d.concrete_property_lost_without_extension.length).toBeGreaterThan(80);
    }
  });

  it("preserves supersession as semantic correction but does not overclaim it", () => {
    expect(decision(contract, "content_correction")).toMatchObject({
      classification: "MAP_EXISTING_PLUS_EXTEND",
    });
    expect(decision(contract, "content_correction").existing_mechanism).toContain("supersession");
    expect(
      contract.epistemic_boundaries
        .correction_by_supersession_is_not_sufficient_for_every_data_subject_right,
    ).toBe(true);
  });

  it("rejects consent-default, soft-delete-as-deletion and permanent append-only personal data", () => {
    for (const item of [
      "consent_as_default_or_universal_legal_basis",
      "append_only_database_means_append_only_personal_data",
      "soft_hide_only_as_deletion",
      "public_project_means_personal_data_can_be_retained_forever",
    ]) {
      expect(rejection(contract, item).classification).toBe("REJECT");
    }
  });

  it("requires a lifecycle richer than ACTIVE versus hidden", () => {
    expect(contract.minimum_lifecycle_states_to_support_later).toEqual(
      expect.arrayContaining([
        "ACTIVE",
        "BLOCKED",
        "SUPERSEDED",
        "REDACTED_OR_ANONYMISED_WHERE_LAWFUL",
        "ELIMINATED_WHERE_REQUIRED_AND_LAWFUL",
      ]),
    );
  });

  it("defers Need persistence and profiling until lifecycle controls exist", () => {
    const deferred = new Map(contract.deferred.map((item) => [item.item, item.reason]));
    expect(deferred.get("Need persistence")).toContain("before content lifecycle rules exist");
    expect(deferred.has("Actor competency profile")).toBe(true);
    expect(deferred.has("matching_ranking_reputation")).toBe(true);
    expect(deferred.has("automatic_sensitive_data_classification")).toBe(true);
  });

  it("has unique inventory surfaces and known risk classes only", () => {
    const surfaces = contract.inventory.map((item) => item.surface);
    expect(new Set(surfaces).size).toBe(surfaces.length);
    const risks = new Set(Object.keys(contract.risk_classes));
    for (const item of contract.inventory) {
      expect(risks.has(item.risk)).toBe(true);
    }
  });

  it("selects enforceable lifecycle control as the next gate, not Need", () => {
    expect(contract.next_gate).toBe(
      "DATA-FOUNDATION-001B-CONTENT-LIFECYCLE-CONTROL-MINIMAL",
    );
  });
});

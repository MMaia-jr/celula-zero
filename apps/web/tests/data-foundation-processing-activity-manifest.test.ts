import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

type Activity = {
  activity_id: string;
  purpose: string;
  necessity_criterion: string;
  data_surfaces: string[];
  sources: string[];
  operations: string[];
  current_recipient_classes: string[];
  lawful_basis_status: string;
  retention_status: string;
  controller_status: string;
  external_processor_status: string;
  automated_decision_status: string;
};

type Manifest = {
  schema: string;
  status: string;
  architecture_decision: {
    classification: string;
    runtime_registry: string;
    concrete_property_preserved: string;
    falsifier: string;
  };
  global_boundaries: Record<string, boolean>;
  human_direction_required: string[];
  activities: Activity[];
  inventory_coverage: {
    inventory_surface_count: number;
    mapped_surface_count: number;
    unmapped_surfaces: string[];
    coverage_claim: string;
    boundary: string;
  };
  art19_ii_readiness: Record<string, string | boolean>;
  art37_record_readiness: Record<string, string | boolean>;
  rejections: string[];
  next_gate: string;
};

type Inventory = {
  inventory: Array<{ surface: string }>;
};

function load<T>(relative: string): T {
  return JSON.parse(
    fs.readFileSync(path.resolve(process.cwd(), "../../", relative), "utf8"),
  ) as T;
}

describe("DATA-FOUNDATION-001D processing activity manifest", () => {
  const manifest = load<Manifest>(
    "standards/data-foundation/processing-activity-manifest.v1.json",
  );
  const inventory = load<Inventory>(
    "standards/data-foundation/personal-data-inventory.v1.json",
  );

  it("uses a static version-controlled manifest before runtime infrastructure", () => {
    expect(manifest.schema).toBe(
      "cz.data-foundation.processing-activity-manifest.v1",
    );
    expect(manifest.status).toBe(
      "STATIC_VERSION_CONTROLLED_MANIFEST_NOT_RUNTIME_REGISTRY",
    );
    expect(manifest.architecture_decision).toMatchObject({
      classification: "ADOPT_PROCESS_PLUS_VERSIONED_MANIFEST",
      runtime_registry: "NOT_NEEDED_YET",
    });
    expect(manifest.architecture_decision.falsifier.length).toBeGreaterThan(120);
  });

  it("maps every DATA-FOUNDATION-001A inventory surface exactly into declared processing context", () => {
    const expected = new Set(inventory.inventory.map((item) => item.surface));
    const mapped = manifest.activities.flatMap((activity) => activity.data_surfaces);
    const mappedSet = new Set(mapped);

    expect(expected.size).toBe(43);
    expect(mappedSet.size).toBe(43);
    expect([...expected].sort()).toEqual([...mappedSet].sort());
    expect(manifest.inventory_coverage.unmapped_surfaces).toEqual([]);
    expect(manifest.inventory_coverage.mapped_surface_count).toBe(43);
  });

  it("requires explicit purpose and necessity criterion for every activity", () => {
    for (const activity of manifest.activities) {
      expect(activity.purpose.length).toBeGreaterThan(50);
      expect(activity.necessity_criterion.length).toBeGreaterThan(60);
      expect(activity.data_surfaces.length).toBeGreaterThan(0);
      expect(activity.sources.length).toBeGreaterThan(0);
      expect(activity.operations.length).toBeGreaterThan(0);
    }
  });

  it("does not silently choose a lawful basis or controller", () => {
    for (const activity of manifest.activities) {
      expect(activity.lawful_basis_status).toBe(
        "UNDETERMINED_HUMAN_LEGAL_DIRECTION_REQUIRED",
      );
      expect(activity.controller_status).toBe(
        "UNDETERMINED_HUMAN_DIRECTION_REQUIRED",
      );
    }
    expect(manifest.global_boundaries.technical_purpose_is_lawful_basis).toBe(false);
    expect(manifest.global_boundaries.lawful_basis_is_automatically_consent).toBe(false);
  });

  it("does not turn retention metadata into permission for indefinite retention", () => {
    for (const activity of manifest.activities) {
      expect(activity.retention_status).toBe("UNDETERMINED_REQUIRES_POLICY");
    }
    expect(manifest.global_boundaries.retention_status_is_retention_permission).toBe(false);
  });

  it("keeps recipient classes as declarations rather than proof of actual sharing", () => {
    for (const activity of manifest.activities) {
      expect(activity.current_recipient_classes.length).toBeGreaterThan(0);
    }
    expect(
      manifest.global_boundaries.recipient_class_is_proof_of_actual_sharing,
    ).toBe(false);
    expect(manifest.human_direction_required).toContain(
      "ACTUAL_RECIPIENT_AND_SHARING_RELATIONSHIPS",
    );
  });

  it("keeps actual processors and international transfers unresolved until demonstrated", () => {
    for (const activity of manifest.activities) {
      expect(activity.external_processor_status).toBe("UNMAPPED");
    }
    expect(manifest.human_direction_required).toContain(
      "ACTUAL_EXTERNAL_PROCESSORS_AND_SUBPROCESSORS",
    );
    expect(manifest.human_direction_required).toContain(
      "INTERNATIONAL_TRANSFER_STATUS",
    );
  });

  it("preserves the project's human-authority boundary for operative intent and commitment", () => {
    const intent = manifest.activities.find(
      (activity) => activity.activity_id === "PROJECT_AND_INTENTION_SEMANTIC_HISTORY",
    );
    const coordination = manifest.activities.find(
      (activity) =>
        activity.activity_id === "COORDINATION_OPPORTUNITY_PROPOSAL_DECISION",
    );

    expect(intent?.automated_decision_status).toBe(
      "HUMAN_DIRECTION_REQUIRED_FOR_OPERATIVE_INTENT",
    );
    expect(coordination?.automated_decision_status).toBe(
      "HUMAN_ACCEPTANCE_REQUIRED_FOR_COMMITMENT",
    );
  });

  it("keeps competency coordination separate from profiling, matching and reputation", () => {
    const competency = manifest.activities.find(
      (activity) => activity.activity_id === "COMPETENCY_COORDINATION",
    );
    expect(competency?.automated_decision_status).toBe(
      "NO_MATCHING_RANKING_OR_REPUTATION_IMPLEMENTED",
    );
  });

  it("encodes data minimisation for event and receipt trails", () => {
    const audit = manifest.activities.find(
      (activity) => activity.activity_id === "AUDIT_EVENT_AND_RECEIPT_TRAIL",
    );
    expect(audit?.necessity_criterion).toContain(
      "Do not duplicate raw domain content",
    );
    expect(audit?.data_surfaces).toEqual(
      expect.arrayContaining([
        "events.payload",
        "domain_events.payload",
      ]),
    );
  });

  it("does not overclaim Article 19 II readiness", () => {
    expect(manifest.art19_ii_readiness.origin).toBe("PARTIAL_STRUCTURED");
    expect(manifest.art19_ii_readiness.criteria).toBe(
      "PARTIAL_TECHNICAL_CRITERIA_DECLARED",
    );
    expect(manifest.art19_ii_readiness.controller_identity).toBe(
      "MISSING_HUMAN_DIRECTION",
    );
    expect(manifest.art19_ii_readiness.complete_declaration_ready).toBe(false);
  });

  it("does not overclaim Article 37 processing-record readiness", () => {
    expect(manifest.art37_record_readiness.operation_manifest).toBe(
      "STATIC_VERSION_CONTROLLED_PARTIAL",
    );
    expect(manifest.art37_record_readiness.complete_processing_record_ready).toBe(
      false,
    );
  });

  it("keeps structural association distinct from personal-data classification", () => {
    expect(
      manifest.global_boundaries
        .structural_association_is_personal_data_classification,
    ).toBe(false);
    expect(
      manifest.inventory_coverage.boundary,
    ).toContain("does not classify each value as personal data");
  });

  it("explicitly rejects the shortcuts already falsified by DATA-FOUNDATION", () => {
    expect(manifest.rejections).toEqual(
      expect.arrayContaining([
        "CONSENT_AS_DEFAULT_OR_UNIVERSAL_BASIS",
        "BUILD_RUNTIME_PROCESSING_REGISTRY_BEFORE_STATIC_MANIFEST_FAILS",
        "CALL_KNOWN_SELF_EXPORT_COMPLETE_DSAR",
        "INFER_CONTROLLER_IDENTITY_FROM_GITHUB_OWNER_OR_FOUNDER",
        "ASSUME_ALL_AUTHORED_TEXT_IS_PERSONAL_DATA_OF_AUTHOR",
        "ASSUME_ALL_PUBLIC_DATA_IS_FREE_OF_LGPD_DUTIES",
      ]),
    );
  });

  it("requires human direction before destructive privacy lifecycle work", () => {
    expect(manifest.human_direction_required).toEqual(
      expect.arrayContaining([
        "LEGAL_CONTROLLER_IDENTITY_AND_CONTACT",
        "LAWFUL_BASIS_PER_PROCESSING_ACTIVITY",
        "RETENTION_OR_DELETION_CRITERIA_PER_ACTIVITY",
        "SENSITIVE_PERSONAL_DATA_HANDLING_RULES",
      ]),
    );
    expect(manifest.next_gate).toBe(
      "DATA-FOUNDATION-001E-HUMAN-CONTROLLER-LAWFUL-BASIS-RETENTION-DIRECTION",
    );
  });

  it("does not claim legal compliance", () => {
    expect(manifest.global_boundaries.manifest_is_legal_compliance).toBe(false);
    expect(manifest.global_boundaries.known_export_is_complete_article_19_ii_response).toBe(false);
  });
});

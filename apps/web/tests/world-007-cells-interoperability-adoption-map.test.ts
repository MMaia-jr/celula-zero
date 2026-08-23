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
  core_property: string;
  anti_target: string;
  epistemic_boundaries: Record<string, boolean>;
  existing_cz_foundations: Array<{
    id: string;
    classification: string;
    properties: string[];
    boundary: string;
    structural_limit?: string;
    schema?: string;
  }>;
  precedents: Array<{
    id: string;
    classification: string;
    runtime: string;
    use: string[];
    boundary: string;
  }>;
  architecture_decisions: Decision[];
  minimal_second_cell_experiment: {
    precondition: string;
    journey: string[];
    property_under_test: string;
    success: string;
    failure_signal_for_extension: string;
  };
  privacy_security_constraints: string[];
  rejections: string[];
  missing: unknown[];
  closure_rule: string;
  next_gate: string;
};

function load(): Contract {
  return JSON.parse(
    fs.readFileSync(
      path.resolve(
        process.cwd(),
        "../../standards/world-007/cells-interoperability-adoption-map.v1.json",
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

describe("WORLD-007A cells and interoperability adoption map", () => {
  const c = load();

  it("is a precedent gate and keeps local autonomy as the target", () => {
    expect(c.schema).toBe("cz.world-007.cells-interoperability-adoption-map.v1");
    expect(c.status).toBe("PRECEDENT_GATE_NO_RUNTIME_CHANGE");
    expect(c.core_property).toContain("LOCAL_CELL_AUTONOMY");
    expect(c.anti_target).toContain("GLOBAL_TRUTH");
    expect(c.missing).toEqual([]);
  });

  it("adopts Cell/local-policy authority without cross-cell authority inference", () => {
    expect(foundation(c, "B1_CELLS_AND_LOCAL_POLICY").classification)
      .toBe("ADOPT_INTERNAL");
    expect(foundation(c, "B1_CELLS_AND_LOCAL_POLICY").boundary)
      .toContain("No current record grants authority over another Cell");
  });

  it("keeps UUIDs as stable local references but not origin authority", () => {
    const f = foundation(c, "STABLE_UUID_OBJECT_IDENTIFIERS");
    expect(f.classification).toBe("ADOPT_INTERNAL_LIMITED");
    expect(f.boundary).toContain("does not identify the authoritative origin Cell");
  });

  it("adopts current portable export with an explicit cross-cell origin limit", () => {
    const f = foundation(c, "OPERATING_LOOP_PORTABLE_EXPORT");
    expect(f.classification).toBe("ADOPT_INTERNAL_LIMITED");
    expect(f.schema).toBe("cz.operating-loop.v1");
    expect(f.structural_limit).toContain("origin Cell identity/IRI");
    expect(f.boundary).toContain("does not grant authority");
  });

  it("maps ActivityStreams object/IRI envelope without rewriting CZ internals", () => {
    const p = precedent(c, "ACTIVITYSTREAMS_2");
    expect(p).toMatchObject({
      classification: "MAP_PORTABLE_OBJECT_ACTIVITY_ENVELOPE",
      runtime: "NOT_NEEDED",
    });
    expect(p.use).toEqual(expect.arrayContaining([
      "absolute IRI id",
      "type",
      "attributedTo",
      "context",
      "Link/reference",
    ]));
  });

  it("defers ActivityPub runtime until a real second Cell", () => {
    const p = precedent(c, "ACTIVITYPUB");
    expect(p).toMatchObject({
      classification: "STUDY_MAP_FEDERATION_ORIGIN_PATTERN",
      runtime: "DEFER_UNTIL_SECOND_CELL",
    });
    expect(decision(c, "activitypub_federation_runtime").classification)
      .toBe("REJECT_FOR_NOW");
  });

  it("maps JSON-LD only as optional external serialization", () => {
    const p = precedent(c, "JSON_LD_1_1");
    expect(p).toMatchObject({
      classification: "MAP_OPTIONAL_EXTERNAL_SERIALIZATION",
      runtime: "NOT_NEEDED",
    });
    expect(p.use).toEqual(expect.arrayContaining([
      "@id IRI identity",
      "@context term mapping",
      "UUID URN compatibility",
    ]));
  });

  it("maps PROV-O cross-system provenance without trust promotion", () => {
    const p = precedent(c, "W3C_PROV_O");
    expect(p.classification).toBe("MAP_CROSS_SYSTEM_PROVENANCE");
    expect(p.boundary).toContain("not truth, verification or trust");
  });

  it("maps BagIt only for future multi-file export package integrity", () => {
    expect(precedent(c, "RFC_8493_BAGIT")).toMatchObject({
      classification: "MAP_EXPORT_PACKAGE_INTEGRITY",
      runtime: "NOT_NEEDED",
    });
    expect(decision(c, "portable_export_bundle_manifest").classification)
      .toBe("MAP_OPTIONAL_DEFER");
  });

  it("maps RFC 9530 digest fields but not authentication or authorization", () => {
    const p = precedent(c, "RFC_9530_DIGEST_FIELDS");
    expect(p.classification).toBe("MAP_HTTP_REPRESENTATION_INTEGRITY");
    expect(p.boundary).toContain("does not define authentication, authorization or privacy");
    expect(c.epistemic_boundaries.digest_is_authentication).toBe(false);
    expect(c.epistemic_boundaries.digest_is_authorization).toBe(false);
  });

  it("identifies one deferred cross-cell envelope as the concrete structural candidate", () => {
    const d = decision(c, "minimal_cross_cell_reference_import_envelope");
    expect(d.classification).toBe("EXTEND_CANDIDATE_DEFER_UNTIL_SECOND_CELL");
    expect(d.mechanism).toContain("REFERENCE|IMPORTED_COPY|DERIVED");
    expect(d.concrete_property_lost_without_custom_creation?.length ?? 0)
      .toBeGreaterThan(240);
    expect(d.falsifier?.length ?? 0).toBeGreaterThan(180);
  });

  it("defers external IRI allocation rather than inventing global identity infrastructure", () => {
    expect(decision(c, "external_semantic_identifier_or_iri").classification)
      .toBe("MAP_DEFER");
  });

  it("rejects federation and graph runtimes before a demonstrated need", () => {
    expect(decision(c, "at_protocol_runtime").classification).toBe("REJECT_FOR_NOW");
    expect(decision(c, "blockchain_did_vc_ipfs_runtime").classification)
      .toBe("REJECT_FOR_MVP");
    expect(decision(c, "global_graph_database").classification).toBe("REJECT_FOR_NOW");
  });

  it("rejects global reputation, membership and governance across Cells", () => {
    expect(decision(c, "cross_cell_universal_reputation").classification).toBe("REJECT");
    expect(decision(c, "global_membership_or_governance").classification).toBe("REJECT");
  });

  it("preserves core interoperability epistemic boundaries", () => {
    expect(c.epistemic_boundaries.interoperability_is_shared_governance).toBe(false);
    expect(c.epistemic_boundaries.reference_is_import).toBe(false);
    expect(c.epistemic_boundaries.import_is_trust).toBe(false);
    expect(c.epistemic_boundaries.provenance_is_truth).toBe(false);
    expect(c.epistemic_boundaries.same_identifier_is_same_local_interpretation).toBe(false);
    expect(c.epistemic_boundaries.verification_in_cell_a_is_mandatory_acceptance_in_cell_b).toBe(false);
    expect(c.epistemic_boundaries.replication_is_adoption).toBe(false);
  });

  it("requires a real independently governed second Cell before the experiment", () => {
    expect(c.minimal_second_cell_experiment.precondition)
      .toContain("second independently governed Cell actually exists");
    expect(c.minimal_second_cell_experiment.journey).toEqual(expect.arrayContaining([
      "Cell A exports one selected object/history slice",
      "Cell B verifies digest/integrity",
      "Cell B records whether it is only referencing, importing a copy, or deriving a local object",
      "Cell B preserves source provenance and local decision authority",
    ]));
  });

  it("inherits privacy/data lifecycle constraints across Cell boundaries", () => {
    expect(c.privacy_security_constraints).toEqual(expect.arrayContaining([
      "Do not export private/personal/sensitive content merely because an object has a stable ID.",
      "Imported personal data does not become anonymous because its source used UUIDs or hashes.",
      "Do not auto-accept remote authority, roles, memberships, trust or verification decisions.",
    ]));
  });

  it("rejects premature protocol infrastructure", () => {
    expect(c.rejections).toEqual(expect.arrayContaining([
      "CUSTOM_FEDERATION_PROTOCOL_BEFORE_SECOND_CELL",
      "ACTIVITYPUB_RUNTIME_BEFORE_REAL_FEDERATION_USE",
      "BLOCKCHAIN_DID_VC_IPFS_AS_CRITICAL_PATH",
      "GLOBAL_GRAPH_DATABASE_FOR_INTEROPERABILITY",
      "GLOBAL_REPUTATION_ACROSS_CELLS",
      "IMPORT_AS_ENDORSEMENT",
    ]));
  });

  it("allows WORLD-007 closure when no second Cell exists", () => {
    expect(c.closure_rule).toContain("no real second independently governed Cell exists");
    expect(c.closure_rule).toContain("sufficient to continue");
    expect(c.next_gate).toBe(
      "CLOSE_WORLD_007_IF_NO_SECOND_CELL_THEN_INTEGRATION_REVIEW_AND_HABITABLE_ALPHA",
    );
  });
});

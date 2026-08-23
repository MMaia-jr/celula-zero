import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

type Classification =
  | "ADOPT"
  | "MAP"
  | "STUDY"
  | "DEFER"
  | "NOT_NEEDED"
  | "EXTEND_CANDIDATE";

type PropertyDecision = {
  property: string;
  classification: Classification;
  sources: string[];
  external_terms?: string[];
  cz_semantics?: string;
};

type Contract = {
  schema: string;
  world: string;
  slice: string;
  epistemic_boundary: Record<string, boolean>;
  cz_boundaries: Record<string, boolean>;
  sources: Array<{
    id: string;
    semantic_use: Classification;
    runtime: Classification;
  }>;
  property_decisions: PropertyDecision[];
  extension_candidates: Array<{
    property: string;
    classification: Classification;
    implementation_stage: string;
    roles: string[];
    concrete_property_lost_without_extension: string;
    must_be_version_scoped: boolean;
  }>;
  rejections: Array<{ item: string; classification: Classification }>;
  deferred: Array<{ item: string; reason: string }>;
  missing: unknown[];
  next_gate: string;
};

function loadContract(): Contract {
  const file = path.resolve(
    process.cwd(),
    "../../standards/world-001/semantic-adoption-map.v1.json",
  );
  return JSON.parse(fs.readFileSync(file, "utf8")) as Contract;
}

function decision(contract: Contract, property: string): PropertyDecision {
  const found = contract.property_decisions.find(
    (item) => item.property === property,
  );
  if (!found) {
    throw new Error(`missing property decision: ${property}`);
  }
  return found;
}

describe("WORLD-001A semantic adoption map", () => {
  const contract = loadContract();

  it("is a machine-readable WORLD-001 contract with no MISSING claim", () => {
    expect(contract.schema).toBe("cz.world-001.semantic-adoption-map.v1");
    expect(contract.world).toBe("WORLD-001");
    expect(contract.slice).toBe("WORLD-001A-SEMANTIC-ADOPTION-MAP");
    expect(contract.missing).toEqual([]);
    expect(contract.next_gate).toBe(
      "WORLD-001B-COMPETENCY-COORDINATION-MINIMAL",
    );
  });

  it("keeps CZ operational capabilities distinct from competency concepts", () => {
    expect(
      contract.cz_boundaries
        .competency_concept_is_not_operational_capability_definition,
    ).toBe(true);
    expect(contract.cz_boundaries.project_need_is_not_competency).toBe(true);
    expect(
      contract.cz_boundaries
        .opportunity_condition_is_not_competency_requirement,
    ).toBe(true);
  });

  it("maps REQUIRED, PREFERRED and LEARNING_TARGET without turning them into Actor proof", () => {
    expect(decision(contract, "opportunity_required")).toMatchObject({
      classification: "MAP",
      external_terms: ["ceterms:requires", "ESCO:essential"],
    });
    expect(decision(contract, "opportunity_preferred")).toMatchObject({
      classification: "MAP",
      external_terms: ["ceterms:recommends", "ESCO:optional"],
    });
    expect(decision(contract, "opportunity_learning_target")).toMatchObject({
      classification: "MAP",
      external_terms: ["ceterms:teaches"],
    });

    expect(contract.epistemic_boundary.requirement_is_not_actor_attainment).toBe(
      true,
    );
    expect(
      contract.cz_boundaries.competency_requirement_is_not_learning_target,
    ).toBe(true);
  });

  it("adopts SKOS mapping relations without requiring an RDF runtime", () => {
    const mappings = [
      ["external_alignment_exact", "skos:exactMatch"],
      ["external_alignment_close", "skos:closeMatch"],
      ["external_alignment_broad", "skos:broadMatch"],
      ["external_alignment_narrow", "skos:narrowMatch"],
      ["external_alignment_related", "skos:relatedMatch"],
    ] as const;

    for (const [property, term] of mappings) {
      expect(decision(contract, property)).toMatchObject({
        classification: "ADOPT",
        sources: ["SKOS"],
        external_terms: [term],
      });
    }

    const skos = contract.sources.find((source) => source.id === "SKOS");
    expect(skos?.runtime).toBe("NOT_NEEDED");
  });

  it("keeps provenance, source, evidence and verification epistemically bounded", () => {
    expect(contract.epistemic_boundary.provenance_is_not_truth).toBe(true);
    expect(contract.epistemic_boundary.source_is_not_truth).toBe(true);
    expect(contract.epistemic_boundary.evidence_is_not_universal_proof).toBe(
      true,
    );
    expect(
      contract.epistemic_boundary.verification_is_not_permanent_reputation,
    ).toBe(true);
  });

  it("preserves the only current CZ-specific extension candidate as version-scoped", () => {
    expect(contract.extension_candidates).toHaveLength(1);
    const candidate = contract.extension_candidates[0];
    if (!candidate) {
      throw new Error("expected exactly one extension candidate");
    }
    expect(candidate).toMatchObject({
      property: "opportunity_version_competency_relation",
      classification: "EXTEND_CANDIDATE",
      implementation_stage: "WORLD-001B",
      roles: ["REQUIRED", "PREFERRED", "LEARNING_TARGET"],
      must_be_version_scoped: true,
    });
    expect(candidate.concrete_property_lost_without_extension.length).toBeGreaterThan(
      40,
    );
  });

  it("rejects heavyweight runtimes and infrastructure instead of silently adopting them", () => {
    const rejected = new Map(
      contract.rejections.map((item) => [item.item, item.classification]),
    );

    for (const item of [
      "custom_competency_platform",
      "graph_database",
      "rdf_store",
      "elasticsearch_for_competency_semantics",
      "cass_runtime",
      "opencase_runtime",
      "opensalt_runtime",
      "moodle_runtime",
      "universal_reputation_score",
      "vector_database_for_competency_matching",
    ]) {
      expect(rejected.get(item)).toBe("NOT_NEEDED");
    }

    for (const source of contract.sources) {
      expect(source.runtime).toBe("NOT_NEEDED");
    }
  });

  it("defers person-level competency profiling and Project↔Competency", () => {
    const deferred = new Set(contract.deferred.map((item) => item.item));
    expect(deferred).toContain("actor_competency_state");
    expect(deferred).toContain("actor_proficiency");
    expect(deferred).toContain("claim_to_competency_subject");
    expect(deferred).toContain("project_to_competency_relation");
    expect(contract.cz_boundaries.actor_declaration_is_not_verification).toBe(
      true,
    );
  });

  it("uses PostgreSQL relational precedent rather than a graph-database requirement", () => {
    expect(
      decision(contract, "relational_persistence_for_case_like_graph"),
    ).toMatchObject({
      classification: "MAP",
      sources: ["CASE_BOOTCAMP"],
    });

    const graphDb = contract.rejections.find(
      (item) => item.item === "graph_database",
    );
    expect(graphDb?.classification).toBe("NOT_NEEDED");
  });

  it("contains unique source and property identifiers", () => {
    const sourceIds = contract.sources.map((source) => source.id);
    expect(new Set(sourceIds).size).toBe(sourceIds.length);

    const properties = contract.property_decisions.map(
      (item) => item.property,
    );
    expect(new Set(properties).size).toBe(properties.length);
  });
});

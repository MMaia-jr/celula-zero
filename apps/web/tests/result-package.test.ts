import { describe, expect, it } from "vitest";
import {
  parseResultPackage,
  resultPackageSchema,
} from "@/lib/domain/result-package";

const digest = "a".repeat(64);

function validPackage() {
  return {
    schema: "cz.result-package.v1" as const,
    taskCapsuleDigest: digest,
    executor: { id: "executor-a", label: "Executor A" },
    status: "EXECUTED" as const,
    whatHappened: "A tarefa delimitada foi executada.",
    artifacts: [
      {
        uri: "urn:sha256:example",
        digest: "b".repeat(64),
        mediaType: "text/markdown",
      },
    ],
    checksRun: [{ name: "targeted-test", status: "PASS" as const }],
    claims: [
      {
        statement: "A implementação produziu o artefato esperado.",
        scope: "Somente o Task Capsule testado.",
      },
    ],
    limitations: ["Não demonstra utilidade externa."],
    unexpectedChanges: [],
    nextHumanDecision: "Decidir se o resultado deve ser verificado.",
    notDone: ["Nenhum commit, push, PR ou merge foi executado."],
  };
}

describe("cz.result-package.v1", () => {
  it("accepts a bounded result for the expected capsule", () => {
    expect(parseResultPackage(validPackage(), digest).status).toBe("EXECUTED");
  });

  it("rejects a result tied to another Task Capsule", () => {
    expect(() =>
      parseResultPackage(validPackage(), "c".repeat(64)),
    ).toThrow(/pertence ao Task Capsule/);
  });

  it("rejects malformed packages", () => {
    expect(() =>
      resultPackageSchema.parse({ ...validPackage(), whatHappened: "" }),
    ).toThrow();
  });

  it("does not let executor status impersonate Verification or Outcome", () => {
    expect(() =>
      resultPackageSchema.parse({
        ...validPackage(),
        verification: "PASS",
      }),
    ).toThrow();
  });
});

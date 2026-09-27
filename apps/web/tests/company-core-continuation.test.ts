import { describe, expect, test } from "vitest";
import {
  getCompanyCoreContinuation,
  type CompanyCoreContinuation,
  type CompanyCoreState,
} from "@/lib/domain/company-core-continuation";

const cases = [
  ["NEED_CREATED", { action: "DEFINE_AGREEMENT" }],
  ["AGREEMENT_DEFINED", { action: "AUTHORIZE_WORK" }],
  ["WORK_AUTHORIZED", { action: "WAIT_FOR_EXECUTION", phase: "AUTHORIZED" }],
  ["AI_RUNNING", { action: "WAIT_FOR_EXECUTION", phase: "RUNNING" }],
  ["AI_COMPLETED", { action: "RECORD_RESULT", failurePath: false }],
  ["AI_FAILED", { action: "RECORD_RESULT", failurePath: true }],
  ["RESULT_RECORDED", { action: "RECORD_EVALUATION" }],
  ["EVALUATION_RECORDED", { action: "RECORD_CONSEQUENCE" }],
  ["CONSEQUENCE_RECORDED", { action: "COMPLETE", closed: false }],
  ["CLOSED", { action: "COMPLETE", closed: true }],
] satisfies [CompanyCoreState, CompanyCoreContinuation][];

describe("Company Core continuation", () => {
  test.each(["UNEXPECTED_RUNTIME_STATE", "", "ai_running"])(
    "preserves unrecognized runtime state %j without an executable action",
    (observedState) => {
      for (const jobState of [undefined, null, "NEEDS_RECONCILIATION"]) {
        expect(() => getCompanyCoreContinuation(observedState, jobState)).not.toThrow();
        expect(getCompanyCoreContinuation(observedState, jobState)).toEqual({
          action: "UNRECOGNIZED_STATE",
          observedState,
        });
      }
    },
  );

  test.each(cases)("projects %s with absent or ordinary job status", (state, expected) => {
    for (const jobState of [undefined, null, "QUEUED", "RUNNING", "COMPLETED", "FAILED"]) {
      expect(getCompanyCoreContinuation(state, jobState)).toEqual(expected);
    }
  });

  test("uncertain running execution requires reconciliation", () => {
    expect(getCompanyCoreContinuation("AI_RUNNING", "NEEDS_RECONCILIATION"))
      .toEqual({ action: "RECONCILE_EXECUTION" });
  });

  test.each(cases.filter(([state]) => state !== "AI_RUNNING"))(
    "reconciliation status does not override %s",
    (state, expected) => {
      expect(getCompanyCoreContinuation(state, "NEEDS_RECONCILIATION")).toEqual(expected);
    },
  );

  test("repeated projections preserve failure-path and are independent", () => {
    const first = getCompanyCoreContinuation("AI_FAILED");
    if (first.action !== "RECORD_RESULT") throw new Error("Expected result continuation");
    first.failurePath = false;
    expect(getCompanyCoreContinuation("AI_FAILED"))
      .toEqual({ action: "RECORD_RESULT", failurePath: true });
  });
});

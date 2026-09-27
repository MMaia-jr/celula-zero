export type CompanyCoreState =
  | "NEED_CREATED"
  | "AGREEMENT_DEFINED"
  | "WORK_AUTHORIZED"
  | "AI_RUNNING"
  | "AI_COMPLETED"
  | "AI_FAILED"
  | "RESULT_RECORDED"
  | "EVALUATION_RECORDED"
  | "CONSEQUENCE_RECORDED"
  | "CLOSED";

export type CompanyCoreContinuation =
  | { action: "DEFINE_AGREEMENT" }
  | { action: "AUTHORIZE_WORK" }
  | { action: "WAIT_FOR_EXECUTION"; phase: "AUTHORIZED" | "RUNNING" }
  | { action: "RECONCILE_EXECUTION" }
  | { action: "RECORD_RESULT"; failurePath: boolean }
  | { action: "RECORD_EVALUATION" }
  | { action: "RECORD_CONSEQUENCE" }
  | { action: "COMPLETE"; closed: boolean }
  | { action: "UNRECOGNIZED_STATE"; observedState: string };

/** Projects the next action without executing work or changing cycle state. */
export function getCompanyCoreContinuation(
  state: string,
  aiJobState?: string | null,
): CompanyCoreContinuation {
  switch (state) {
    case "NEED_CREATED":
      return { action: "DEFINE_AGREEMENT" };
    case "AGREEMENT_DEFINED":
      return { action: "AUTHORIZE_WORK" };
    case "WORK_AUTHORIZED":
      return { action: "WAIT_FOR_EXECUTION", phase: "AUTHORIZED" };
    case "AI_RUNNING":
      return aiJobState === "NEEDS_RECONCILIATION"
        ? { action: "RECONCILE_EXECUTION" }
        : { action: "WAIT_FOR_EXECUTION", phase: "RUNNING" };
    case "AI_COMPLETED":
    case "AI_FAILED":
      return { action: "RECORD_RESULT", failurePath: state === "AI_FAILED" };
    case "RESULT_RECORDED":
      return { action: "RECORD_EVALUATION" };
    case "EVALUATION_RECORDED":
      return { action: "RECORD_CONSEQUENCE" };
    case "CONSEQUENCE_RECORDED":
    case "CLOSED":
      return { action: "COMPLETE", closed: state === "CLOSED" };
    default:
      return { action: "UNRECOGNIZED_STATE", observedState: state };
  }
}

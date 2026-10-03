// SPDX-License-Identifier: MPL-2.0
import { createHash } from "node:crypto";
import { canAct } from "@cz/authority";
import type { PersonId } from "@cz/identity";
import type { Foundation, FoundationState } from "./foundation";
import type { IsolatedExecutionOutput } from "./execution-workspace";

function eventDigest(value: Record<string, unknown>) {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

export function completeExecutionJob(state: Foundation, actor: PersonId, jobId: string, output: IsolatedExecutionOutput, id: () => string, now: string): Foundation {
  if (actor !== state.person.id || !canAct(actor, state.cell.id, "cell.update", state.memberships, state.authorities)) throw new Error("FORBIDDEN");
  const current = (state.executionJobs ?? []).find((job) => job.id === jobId && job.requestedByActorId === actor);
  if (!current || current.status !== "RUNNING") throw new Error("EXECUTION_JOB_NOT_RUNNING");
  const next = structuredClone(state);
  const job = next.executionJobs!.find((item) => item.id === jobId)!;
  const project = next.projects?.find((item) => item.id === job.projectId && item.stewardActorId === actor);
  if (!project) throw new Error("PROJECT_NOT_FOUND_OR_NOT_STEWARD");
  const agreement = next.agreements?.find((item) => item.id === job.agreementId && item.commitmentId === job.commitmentId && item.authorizingActorId === actor);
  if (!agreement || createHash("sha256").update(JSON.stringify(agreement)).digest("hex") !== job.agreementDigest) throw new Error("EXECUTION_AGREEMENT_MISMATCH");
  job.status = "COMPLETED";
  job.completedAt = now;
  job.resultPackage = output.result;
  job.fabric = {
    classification: output.fabric.final_classification,
    scopeStatus: output.fabric.scope_status,
    changedPaths: output.fabric.changed_paths,
    validations: output.fabric.validations.map((item) => ({ argv: item.argv, exitCode: item.exit_code })),
  };
  job.resultDigest = output.resultDigest;
  job.deltaDigest = output.deltaDigest;
  job.resultFileName = output.resultFileName;
  job.deltaFileName = output.deltaFileName;
  const payload = {
    taskCapsuleDigest: job.taskCapsuleDigest,
    agreementId: job.agreementId,
    agreementDigest: job.agreementDigest,
    canonicalBase: job.canonicalBase,
    resultDigest: output.resultDigest,
    deltaDigest: output.deltaDigest,
    resultStatus: output.result.status,
    finalClassification: output.fabric.final_classification,
    changedPaths: output.fabric.changed_paths,
    validationExitCodes: output.fabric.validations.map((item) => item.exit_code),
    workItemId: job.workItemId,
    commitmentId: job.commitmentId,
  };
  const event = {
    id: id(), eventType: "CODEX_EXECUTION_RESULT_RETURNED", aggregateType: "EXECUTION", aggregateId: job.id,
    actorId: "executor:codex-cli", authorizedByActorId: actor, occurredAt: now,
    materialVersionBefore: null, materialVersionAfter: 1, payload,
  };
  project.events.push({ ...event, canonicalDigest: eventDigest(event) });
  return next;
}

export function failExecutionJob(state: FoundationState, actor: PersonId, jobId: string, errorCode: string, now: string): FoundationState {
  const next = structuredClone(state);
  const job = (next.executionJobs ?? []).find((item) => item.id === jobId && item.requestedByActorId === actor && item.status === "RUNNING");
  if (!job) return state;
  job.status = "FAILED";
  job.completedAt = now;
  job.errorCode = errorCode.slice(0, 100);
  return next;
}

export function expireStaleExecutionJobs(state: FoundationState, now: string, timeoutMs = 40 * 60 * 1000): FoundationState {
  const nowMs = Date.parse(now);
  const stale = (state.executionJobs ?? []).some((job) => job.status === "RUNNING" && Number.isFinite(Date.parse(job.startedAt)) && nowMs - Date.parse(job.startedAt) > timeoutMs);
  if (!stale) return state;
  const next = structuredClone(state);
  for (const job of next.executionJobs ?? []) {
    if (job.status === "RUNNING" && Number.isFinite(Date.parse(job.startedAt)) && nowMs - Date.parse(job.startedAt) > timeoutMs) {
      job.status = "FAILED";
      job.completedAt = now;
      job.errorCode = "EXECUTION_PROCESS_INTERRUPTED";
    }
  }
  return next;
}

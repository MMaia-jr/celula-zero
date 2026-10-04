// SPDX-License-Identifier: MPL-2.0
import { describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import { seedFoundation } from "../lib/foundation";
import { expireStaleExecutionJobs } from "../lib/execution-state";

describe("Execution Fabric continuation state", () => {
  it("marks an interrupted Codex job as failed without losing the accepted work or records", () => {
    const state = seedFoundation(randomUUID, "2026-10-02T12:00:00.000Z");
    const work = { id: randomUUID(), cellId: state.cell.id, responsiblePersonId: state.person.id, title: "Entrega aceita", context: "Tarefa delimitada", status: "active" as const, sourceRecordId: state.records[0]!.id, commitmentId: randomUUID(), taskCapsuleDigest: "a".repeat(64), createdAt: "2026-10-02T12:00:00.000Z", updatedAt: "2026-10-02T12:00:00.000Z" };
    state.workItems = [work];
    state.executionJobs = [{
      id: randomUUID(), workItemId: work.id, projectId: randomUUID(), commitmentId: work.commitmentId!, requestKey: randomUUID(),
      agreementId: randomUUID(), agreementDigest: "d".repeat(64),
      requestedByActorId: state.person.id, taskCapsuleDigest: work.taskCapsuleDigest!, canonicalBase: "50b4917593b0979d5c218c725038bf89afb1134f",
      allowedPaths: ["apps/example.ts"], validations: [["npm", "test"]], status: "RUNNING", startedAt: "2026-10-02T12:00:00.000Z",
    }];
    const originalRecordIds = state.records.map((record) => record.id);
    const recovered = expireStaleExecutionJobs(state, "2026-10-02T12:41:00.000Z");

    expect(recovered.executionJobs?.[0]).toMatchObject({ status: "FAILED", errorCode: "EXECUTION_PROCESS_INTERRUPTED" });
    expect(recovered.workItems?.[0]?.status).toBe("active");
    expect(recovered.records.map((record) => record.id)).toEqual(originalRecordIds);
    expect(expireStaleExecutionJobs(recovered, "2026-10-02T12:42:00.000Z")).toBe(recovered);
  });
});

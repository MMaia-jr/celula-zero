import { z } from "zod";
import { RESULT_PACKAGE_SCHEMA } from "@/lib/domain/task-capsule";

const artifactSchema = z
  .object({
    uri: z.string().min(1),
    digest: z.string().regex(/^[a-f0-9]{64}$/i).optional(),
    mediaType: z.string().min(1).optional(),
    description: z.string().min(1).optional(),
  })
  .strict();

const checkSchema = z
  .object({
    name: z.string().min(1),
    status: z.enum(["PASS", "FAIL", "PARTIAL", "INCONCLUSIVE", "NOT_RUN"]),
    details: z.string().min(1).optional(),
  })
  .strict();

const claimSchema = z
  .object({
    statement: z.string().min(1),
    scope: z.string().min(1),
  })
  .strict();

export const resultPackageSchema = z
  .object({
    schema: z.literal(RESULT_PACKAGE_SCHEMA),
    taskCapsuleDigest: z.string().regex(/^[a-f0-9]{64}$/i),
    executor: z
      .object({
        id: z.string().min(1),
        label: z.string().min(1),
      })
      .strict(),
    status: z.enum(["EXECUTED", "BLOCKED", "ABORTED"]),
    whatHappened: z.string().min(1),
    artifacts: z.array(artifactSchema),
    checksRun: z.array(checkSchema),
    claims: z.array(claimSchema),
    limitations: z.array(z.string().min(1)),
    unexpectedChanges: z.array(z.string().min(1)),
    nextHumanDecision: z.string().min(1),
    notDone: z.array(z.string().min(1)),
  })
  .strict();

export type ResultPackage = z.infer<typeof resultPackageSchema>;

export function parseResultPackage(
  input: unknown,
  expectedTaskCapsuleDigest: string,
): ResultPackage {
  const parsed = resultPackageSchema.parse(input);
  if (parsed.taskCapsuleDigest !== expectedTaskCapsuleDigest) {
    throw new Error(
      `Result Package pertence ao Task Capsule ${parsed.taskCapsuleDigest}, esperado ${expectedTaskCapsuleDigest}.`,
    );
  }
  return parsed;
}

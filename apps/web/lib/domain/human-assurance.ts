import type { ResultPackage } from "@/lib/domain/result-package";
import { resultPackageSchema } from "@/lib/domain/result-package";
import type { TaskCapsule } from "@/lib/domain/task-capsule";

export const HUMAN_ASSURANCE_SCHEMA = "cz.human-assurance.v1" as const;

export type ResultReturnErrorCode =
  | "INVALID_RESULT_PACKAGE"
  | "TASK_CAPSULE_MISMATCH"
  | "EXECUTOR_MISMATCH";

export class ResultReturnValidationError extends Error {
  constructor(
    public readonly code: ResultReturnErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "ResultReturnValidationError";
  }
}

export interface AssuranceIndependentSignal {
  source: string;
  label: string;
  status: "PASS" | "FAIL" | "PARTIAL" | "INCONCLUSIVE" | "INFO";
  details: string;
}

export interface HumanAssuranceView {
  schema: typeof HUMAN_ASSURANCE_SCHEMA;
  taskCapsule: {
    packetId: string;
    digest: string;
    commitmentId: string;
  };
  executor: ResultPackage["executor"];
  reportedStatus: ResultPackage["status"];
  executionReport: {
    provenance: "REPORTED_BY_EXECUTOR";
    text: string;
  };
  reportedArtifacts: ResultPackage["artifacts"];
  reportedChecks: ResultPackage["checksRun"];
  reportedClaims: ResultPackage["claims"];
  declaredLimitations: ResultPackage["limitations"];
  reportedUnexpectedChanges: ResultPackage["unexpectedChanges"];
  reportedNotDone: ResultPackage["notDone"];
  independentSignals: AssuranceIndependentSignal[];
  notVerified: string[];
  nextHumanDecision: {
    provenance: "REPORTED_BY_EXECUTOR";
    suggestion: string;
    legitimateActions: Array<{
      id: "REQUEST_VERIFICATION" | "ASK_CORRECTION" | "REJECT_RESULT";
      label: string;
      boundary: string;
    }>;
  };
}

export function validateResultReturn(
  input: unknown,
  capsule: TaskCapsule,
): ResultPackage {
  const parsed = resultPackageSchema.safeParse(input);
  if (!parsed.success) {
    throw new ResultReturnValidationError(
      "INVALID_RESULT_PACKAGE",
      "Result Package não corresponde ao schema cz.result-package.v1.",
    );
  }

  const result = parsed.data;

  if (result.taskCapsuleDigest !== capsule.digest) {
    throw new ResultReturnValidationError(
      "TASK_CAPSULE_MISMATCH",
      `Result Package pertence ao Task Capsule ${result.taskCapsuleDigest}, esperado ${capsule.digest}.`,
    );
  }

  if (result.executor.id !== capsule.authority.executorActorId) {
    throw new ResultReturnValidationError(
      "EXECUTOR_MISMATCH",
      `Executor ${result.executor.id} não corresponde ao executor autorizado ${capsule.authority.executorActorId}.`,
    );
  }

  return result;
}

export function createHumanAssuranceView(
  input: unknown,
  capsule: TaskCapsule,
  independentSignals: AssuranceIndependentSignal[] = [],
): HumanAssuranceView {
  const result = validateResultReturn(input, capsule);

  return {
    schema: HUMAN_ASSURANCE_SCHEMA,
    taskCapsule: {
      packetId: capsule.packetId,
      digest: capsule.digest,
      commitmentId: capsule.task.commitmentId,
    },
    executor: result.executor,
    reportedStatus: result.status,
    executionReport: {
      provenance: "REPORTED_BY_EXECUTOR",
      text: result.whatHappened,
    },
    reportedArtifacts: result.artifacts,
    reportedChecks: result.checksRun,
    reportedClaims: result.claims,
    declaredLimitations: result.limitations,
    reportedUnexpectedChanges: result.unexpectedChanges,
    reportedNotDone: result.notDone,
    independentSignals: [...independentSignals],
    notVerified: [
      "Receber um Result Package não verifica a veracidade do relato de execução.",
      "Checks reportados pelo executor não são Verification automaticamente.",
      "Claims reportados não são Evidence automaticamente.",
      "Artifacts reportados não demonstram Outcome, utilidade, adoção ou escala automaticamente.",
    ],
    nextHumanDecision: {
      provenance: "REPORTED_BY_EXECUTOR",
      suggestion: result.nextHumanDecision,
      legitimateActions: [
        {
          id: "REQUEST_VERIFICATION",
          label: "Preparar verificação",
          boundary:
            "Exige Claim/Evidence/Verification separados; esta visualização não cria nenhum deles.",
        },
        {
          id: "ASK_CORRECTION",
          label: "Pedir correção",
          boundary:
            "Solicitar nova execução não altera nem promove o resultado recebido.",
        },
        {
          id: "REJECT_RESULT",
          label: "Rejeitar resultado",
          boundary:
            "Rejeitar o retorno não apaga o registro original nem cria Outcome.",
        },
      ],
    },
  };
}

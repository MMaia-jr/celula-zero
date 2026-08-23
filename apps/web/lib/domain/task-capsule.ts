import { createHash } from "node:crypto";
import type {
  WorkbenchActor,
  WorkbenchCommitment,
  WorkbenchProject,
} from "@/lib/data/workbench";

export const TASK_CAPSULE_SCHEMA = "cz.task-capsule.v1" as const;
export const RESULT_PACKAGE_SCHEMA = "cz.result-package.v1" as const;

type JsonPrimitive = string | number | boolean | null;
type JsonValue = JsonPrimitive | JsonValue[] | { [key: string]: JsonValue };

function canonicalize(value: JsonValue): JsonValue {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([key, nested]) => [key, canonicalize(nested)]),
    );
  }
  return value;
}

function digestSemantic(value: JsonValue) {
  const payload = JSON.stringify(canonicalize(value));
  return createHash("sha256").update(payload).digest("hex");
}

function actorProjection(actor: WorkbenchActor) {
  return {
    id: actor.id,
    name: actor.name,
    kind: actor.kind,
    operatorLabel: actor.operatorLabel,
    roles: [...actor.roles].sort(),
  };
}

function relevantActors(
  project: WorkbenchProject,
  commitment: WorkbenchCommitment,
  ownerActorId: string,
) {
  const ids = new Set([
    project.stewardActorId,
    ownerActorId,
    commitment.proposerActorId,
    commitment.acceptedByActorId,
  ]);

  return project.actors
    .filter((actor) => ids.has(actor.id))
    .map(actorProjection)
    .sort((a, b) => a.id.localeCompare(b.id));
}

export function createTaskCapsule(
  project: WorkbenchProject,
  commitmentId: string,
) {
  const commitment = project.commitments.find((item) => item.id === commitmentId);
  if (!commitment) {
    throw new Error(`Commitment ${commitmentId} não encontrado.`);
  }

  const opportunity = project.opportunities.find(
    (item) => item.id === commitment.opportunityId,
  );
  if (!opportunity) {
    throw new Error(`Opportunity ${commitment.opportunityId} não encontrada.`);
  }

  const proposal = project.proposals.find(
    (item) => item.id === commitment.proposalId,
  );
  if (!proposal) {
    throw new Error(`Proposal ${commitment.proposalId} não encontrada.`);
  }

  const frozenOpportunity = opportunity.versions?.find(
    (version) => version.version === commitment.opportunityVersion,
  );
  if (!frozenOpportunity) {
    throw new Error(
      `Opportunity ${opportunity.id} não possui a versão congelada ${commitment.opportunityVersion}.`,
    );
  }

  const frozenProposal = proposal.versions?.find(
    (version) => version.version === commitment.proposalVersion,
  );
  if (!frozenProposal) {
    throw new Error(
      `Proposal ${proposal.id} não possui a versão congelada ${commitment.proposalVersion}.`,
    );
  }

  const semantic = {
    schema: TASK_CAPSULE_SCHEMA,
    project: {
      id: project.id,
      slug: project.slug,
      title: project.title,
      sourceLabel: project.sourceLabel,
      stewardActorId: project.stewardActorId,
    },
    actors: relevantActors(project, commitment, opportunity.ownerActorId),
    task: {
      commitmentId: commitment.id,
      opportunity: {
        id: opportunity.id,
        version: commitment.opportunityVersion,
        ownerActorId: opportunity.ownerActorId,
        title: frozenOpportunity.title,
        statement: frozenOpportunity.statement,
        conditions: frozenOpportunity.conditions,
        expectedResult: frozenOpportunity.expectedResult,
      },
      proposal: {
        id: proposal.id,
        version: commitment.proposalVersion,
        proposerActorId: proposal.proposerActorId,
        statement: frozenProposal.statement,
        conditions: frozenProposal.conditions,
        expectedDelivery: frozenProposal.expectedDelivery,
        rewardExpectation: frozenProposal.rewardExpectation,
      },
    },
    acceptance: {
      criteriaSource: "PERSISTED_TASK_SEMANTICS",
      criteria: [
        `Opportunity expected result: ${frozenOpportunity.expectedResult}`,
        `Proposal expected delivery: ${frozenProposal.expectedDelivery}`,
        `Opportunity conditions: ${frozenOpportunity.conditions}`,
        `Proposal conditions: ${frozenProposal.conditions}`,
      ],
    },
    authority: {
      authorizedByActorId: commitment.acceptedByActorId,
      executorActorId: commitment.proposerActorId,
      scope: `Commitment ${commitment.id} only`,
      createsNewAuthority: false,
    },
    executionBoundary: {
      allowed: [
        "Executar somente a entrega descrita no Commitment.",
        "Produzir artefatos necessários à entrega.",
        `Retornar um ${RESULT_PACKAGE_SCHEMA} atribuível ao executor.`,
      ],
      prohibited: [
        "Ampliar a própria autoridade ou delegação.",
        "Converter execução em Verification, Outcome ou decisão humana.",
        "Commit, push, PR ou merge sem autorização humana separada.",
        "Movimentar fundos ou criar obrigação econômica não explicitamente autorizada.",
      ],
      stopConditions: [
        "Escopo necessário excede a entrega ou condições congeladas.",
        "A tarefa exige credencial, segredo ou acesso não explicitamente concedido.",
        "Há ambiguidade material sobre autoridade ou resultado esperado.",
        "Uma mudança irreversível ou promoção canônica seria necessária.",
      ],
    },
    references: {
      operatingLoopSchema: "cz.operating-loop.v1",
      projectSlug: project.slug,
      note:
        "O Task Capsule referencia a trajetória completa em vez de duplicar história não necessária à tarefa.",
    },
    resultContract: {
      schema: RESULT_PACKAGE_SCHEMA,
      required: [
        "taskCapsuleDigest",
        "executor",
        "status",
        "whatHappened",
        "artifacts",
        "checksRun",
        "claims",
        "limitations",
        "unexpectedChanges",
        "nextHumanDecision",
        "notDone",
      ],
      epistemicBoundary:
        "Executor output é resultado/claim atribuível; não é Evidence, Verification, Outcome ou decisão humana automaticamente.",
    },
  } satisfies JsonValue;

  const digest = digestSemantic(semantic);

  return {
    ...semantic,
    packetId: `tc_${digest.slice(0, 24)}`,
    digest,
  };
}

export type TaskCapsule = ReturnType<typeof createTaskCapsule>;

export function taskCapsuleToMarkdown(capsule: TaskCapsule) {
  const lines = [
    `# Task Capsule — ${capsule.project.title}`,
    "",
    `Schema: ${capsule.schema}`,
    `Packet ID: ${capsule.packetId}`,
    `Digest: ${capsule.digest}`,
    "",
    "## Project",
    "",
    `- id: ${capsule.project.id}`,
    `- slug: ${capsule.project.slug}`,
    `- source: ${capsule.project.sourceLabel}`,
    `- steward: ${capsule.project.stewardActorId}`,
    "",
    "## Frozen task",
    "",
    `- commitment: ${capsule.task.commitmentId}`,
    `- opportunity: ${capsule.task.opportunity.id} v${capsule.task.opportunity.version}`,
    `- proposal: ${capsule.task.proposal.id} v${capsule.task.proposal.version}`,
    `- executor actor: ${capsule.authority.executorActorId}`,
    `- authorized by: ${capsule.authority.authorizedByActorId}`,
    "",
    `### ${capsule.task.opportunity.title}`,
    "",
    capsule.task.opportunity.statement,
    "",
    `**Expected result:** ${capsule.task.opportunity.expectedResult}`,
    "",
    `**Opportunity conditions:** ${capsule.task.opportunity.conditions}`,
    "",
    "**Proposal:**",
    "",
    capsule.task.proposal.statement,
    "",
    `**Expected delivery:** ${capsule.task.proposal.expectedDelivery}`,
    "",
    `**Proposal conditions:** ${capsule.task.proposal.conditions}`,
    "",
    "## Acceptance / verification criteria",
    "",
    ...capsule.acceptance.criteria.map((item) => `- ${item}`),
    "",
    "## Authority boundary",
    "",
    `- scope: ${capsule.authority.scope}`,
    `- creates new authority: ${capsule.authority.createsNewAuthority ? "YES" : "NO"}`,
    "",
    "### Allowed",
    "",
    ...capsule.executionBoundary.allowed.map((item) => `- ${item}`),
    "",
    "### Prohibited",
    "",
    ...capsule.executionBoundary.prohibited.map((item) => `- ${item}`),
    "",
    "### STOP conditions",
    "",
    ...capsule.executionBoundary.stopConditions.map((item) => `- ${item}`),
    "",
    "## Return contract",
    "",
    `Schema: ${capsule.resultContract.schema}`,
    "",
    ...capsule.resultContract.required.map((item) => `- ${item}`),
    "",
    capsule.resultContract.epistemicBoundary,
    "",
    "## Reference",
    "",
    `Full trajectory schema: ${capsule.references.operatingLoopSchema}`,
    `Project: ${capsule.references.projectSlug}`,
    "",
  ];

  return lines.join("\n");
}

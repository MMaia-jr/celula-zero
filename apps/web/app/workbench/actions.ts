"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type ServerClient = NonNullable<
  Awaited<ReturnType<typeof createSupabaseServerClient>>
>;

const projectContextSchema = z.object({
  projectId: z.string().uuid(),
  projectSlug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).max(80),
});

const commandSchema = z.object({
  commandId: z.string().uuid(),
  idempotencyKey: z.string().min(8).max(180),
});

const createOpportunitySchema = projectContextSchema
  .and(commandSchema)
  .and(
    z.object({
      title: z.string().trim().min(4).max(160),
      statement: z.string().trim().min(10).max(4000),
      conditions: z.string().trim().min(3).max(4000),
      expectedResult: z.string().trim().min(3).max(2000),
      capacity: z.coerce.number().int().min(1).max(100),
      publishNow: z.boolean(),
    }),
  );

const registerAgentSchema = projectContextSchema
  .and(commandSchema)
  .and(
    z.object({
      name: z.string().trim().min(2).max(120),
      operatorLabel: z.string().trim().min(2).max(160),
    }),
  );

const submitProposalSchema = projectContextSchema
  .and(commandSchema)
  .and(
    z.object({
      actorId: z.string().uuid(),
      opportunityId: z.string().uuid(),
      statement: z.string().trim().min(10).max(4000),
      conditions: z.string().trim().min(3).max(4000),
      expectedDelivery: z.string().trim().min(3).max(2000),
      rewardExpectation: z.string().trim().min(2).max(1000),
    }),
  );

const acceptProposalSchema = projectContextSchema
  .and(commandSchema)
  .and(
    z.object({
      proposalId: z.string().uuid(),
      opportunityVersion: z.coerce.number().int().positive(),
      proposalVersion: z.coerce.number().int().positive(),
      expectedOpportunityMaterialVersion: z.coerce.number().int().positive(),
      expectedProposalMaterialVersion: z.coerce.number().int().positive(),
      reason: z.string().trim().min(3).max(1000),
    }),
  );

const contributionSchema = projectContextSchema
  .and(commandSchema)
  .and(
    z.object({
      actorId: z.string().uuid(),
      commitmentId: z.string().uuid(),
      description: z.string().trim().min(10).max(4000),
      limitations: z.string().trim().min(2).max(2000),
    }),
  );

const artifactSchema = projectContextSchema
  .and(commandSchema)
  .and(
    z.object({
      actorId: z.string().uuid(),
      contributionId: z.string().uuid(),
      kind: z.enum(["FILE", "CODE", "DOCUMENT", "MEDIA", "LINK", "PACKAGE"]),
      uri: z.string().trim().min(3).max(2000),
      digest: z.string().regex(/^[0-9a-f]{64}$/),
      mediaType: z.string().trim().min(3).max(200),
      sizeBytes: z.preprocess(
        (value) => (value === "" || value === null ? null : value),
        z.coerce.number().int().nonnegative().nullable(),
      ),
      retentionClass: z.enum([
        "PROJECT_LIFETIME",
        "UNTIL_WITHDRAWN",
        "EXTERNAL_REFERENCE",
      ]),
    }),
  );

const claimSchema = projectContextSchema
  .and(commandSchema)
  .and(
    z.object({
      actorId: z.string().uuid(),
      subjectType: z.enum(["CONTRIBUTION", "ARTIFACT"]),
      subjectId: z.string().uuid(),
      statement: z.string().trim().min(10).max(4000),
      scopeDescription: z.string().trim().min(3).max(2000),
    }),
  );

const evidenceSchema = projectContextSchema
  .and(commandSchema)
  .and(
    z.object({
      actorId: z.string().uuid(),
      claimId: z.string().uuid(),
      sourceArtifactId: z.string().uuid(),
      relation: z.enum(["SUPPORTS", "CHALLENGES", "CONTEXTUALIZES", "REPLICATES"]),
      description: z.string().trim().min(10).max(4000),
      limitations: z.string().trim().min(2).max(2000),
    }),
  );

const requestVerificationSchema = projectContextSchema
  .and(commandSchema)
  .and(
    z.object({
      claimId: z.string().uuid(),
      criteria: z.string().trim().min(10).max(4000),
      expectedMethod: z.string().trim().min(3).max(200),
    }),
  );

const issueVerificationSchema = projectContextSchema
  .and(commandSchema)
  .and(
    z.object({
      requestId: z.string().uuid(),
      method: z.string().trim().min(3).max(200),
      findings: z.string().trim().min(10).max(4000),
      classification: z.enum(["PASS", "FAIL", "PARTIAL", "INCONCLUSIVE"]),
      limitations: z.string().trim().min(2).max(2000),
      evidenceItemIds: z.array(z.string().uuid()).min(1),
    }),
  );

function workbenchError(code: string): never {
  redirect(`/workbench?error=${encodeURIComponent(code)}`);
}

function workbenchSuccess(code: string): never {
  revalidatePath("/workbench");
  redirect(`/workbench?ok=${encodeURIComponent(code)}`);
}

async function actionContext(projectId: string, projectSlug: string) {
  const client = await createSupabaseServerClient();
  if (!client) workbenchError("BACKEND_UNAVAILABLE");

  const { data: authData } = await client.auth.getUser();
  if (!authData.user) redirect("/login");

  const { data: project, error: projectError } = await client
    .from("projects")
    .select("id, slug, steward_actor_id")
    .eq("id", projectId)
    .eq("slug", projectSlug)
    .maybeSingle();

  if (projectError || !project) workbenchError("PROJECT_NOT_FOUND");

  const { data: controller, error: controllerError } = await client
    .from("actor_memberships")
    .select("actor_id")
    .eq("profile_id", authData.user.id)
    .eq("actor_id", project.steward_actor_id)
    .in("role", ["OWNER", "OPERATOR", "REPRESENTATIVE"])
    .limit(1)
    .maybeSingle();

  if (controllerError || !controller) workbenchError("STEWARD_CONTROL_REQUIRED");

  return {
    client,
    userId: authData.user.id,
    project,
  };
}

async function requireControlledActor(
  client: ServerClient,
  userId: string,
  actorId: string,
) {
  const { data, error } = await client
    .from("actor_memberships")
    .select("actor_id")
    .eq("profile_id", userId)
    .eq("actor_id", actorId)
    .in("role", ["OWNER", "OPERATOR", "REPRESENTATIVE"])
    .limit(1)
    .maybeSingle();

  if (error || !data) workbenchError("ACTOR_CONTROL_REQUIRED");
}

function formProjectContext(formData: FormData) {
  return {
    projectId: formData.get("projectId"),
    projectSlug: formData.get("projectSlug"),
  };
}

function formCommand(formData: FormData) {
  return {
    commandId: formData.get("commandId"),
    idempotencyKey: formData.get("idempotencyKey"),
  };
}

function assertRpcOk(data: unknown, error: { message: string } | null, code: string) {
  if (error) workbenchError(code);
  const result = data as { ok?: boolean; error_code?: string } | null;
  if (!result?.ok) workbenchError(result?.error_code ?? code);
}

export async function registerProjectAgentAction(formData: FormData): Promise<void> {
  const parsed = registerAgentSchema.safeParse({
    ...formProjectContext(formData),
    ...formCommand(formData),
    name: formData.get("name"),
    operatorLabel: formData.get("operatorLabel"),
  });
  if (!parsed.success) workbenchError("INVALID_AGENT_INPUT");

  const input = parsed.data;
  const { client, project } = await actionContext(input.projectId, input.projectSlug);

  const { data, error } = await client.rpc("h2_register_project_agent", {
    p_actor_id: project.steward_actor_id,
    p_project_id: project.id,
    p_name: input.name,
    p_operator_label: input.operatorLabel,
    p_command_id: input.commandId,
    p_idempotency_key: input.idempotencyKey,
  });

  assertRpcOk(data, error, "AGENT_REGISTER_DENIED");
  workbenchSuccess("AGENT_REGISTERED");
}

export async function createOpportunityAction(formData: FormData): Promise<void> {
  const parsed = createOpportunitySchema.safeParse({
    ...formProjectContext(formData),
    ...formCommand(formData),
    title: formData.get("title"),
    statement: formData.get("statement"),
    conditions: formData.get("conditions"),
    expectedResult: formData.get("expectedResult"),
    capacity: formData.get("capacity"),
    publishNow: formData.get("publishNow") === "on",
  });

  if (!parsed.success) workbenchError("INVALID_INPUT");

  const input = parsed.data;
  const { client, project } = await actionContext(input.projectId, input.projectSlug);

  const { data: created, error: createError } = await client.rpc(
    "b1_create_opportunity",
    {
      p_actor_id: project.steward_actor_id,
      p_project_id: project.id,
      p_title: input.title,
      p_statement: input.statement,
      p_conditions: input.conditions,
      p_expected_result: input.expectedResult,
      p_capacity: input.capacity,
      p_command_id: input.commandId,
      p_idempotency_key: input.idempotencyKey,
    },
  );

  if (createError) workbenchError("CREATE_DENIED");

  const createdResult = created as {
    opportunity_id?: string;
    material_version?: number;
  } | null;

  if (!createdResult?.opportunity_id || createdResult.material_version !== 1) {
    workbenchError("CREATE_RESULT_INVALID");
  }

  if (input.publishNow) {
    const { data, error } = await client.rpc("b1_publish_opportunity", {
      p_actor_id: project.steward_actor_id,
      p_opportunity_id: createdResult.opportunity_id,
      p_expected_material_version: 1,
      p_command_id: crypto.randomUUID(),
      p_idempotency_key: `${input.idempotencyKey}:publish`,
    });

    assertRpcOk(data, error, "PUBLISH_DENIED");
  }

  workbenchSuccess(input.publishNow ? "OPPORTUNITY_OPEN" : "OPPORTUNITY_DRAFT");
}

export async function submitProposalAction(formData: FormData): Promise<void> {
  const parsed = submitProposalSchema.safeParse({
    ...formProjectContext(formData),
    ...formCommand(formData),
    actorId: formData.get("actorId"),
    opportunityId: formData.get("opportunityId"),
    statement: formData.get("statement"),
    conditions: formData.get("conditions"),
    expectedDelivery: formData.get("expectedDelivery"),
    rewardExpectation: formData.get("rewardExpectation"),
  });
  if (!parsed.success) workbenchError("INVALID_PROPOSAL_INPUT");

  const input = parsed.data;
  const { client, userId } = await actionContext(input.projectId, input.projectSlug);
  await requireControlledActor(client, userId, input.actorId);

  const { data, error } = await client.rpc("b1_submit_proposal", {
    p_actor_id: input.actorId,
    p_opportunity_id: input.opportunityId,
    p_statement: input.statement,
    p_conditions: input.conditions,
    p_expected_delivery: input.expectedDelivery,
    p_reward_expectation: input.rewardExpectation,
    p_command_id: input.commandId,
    p_idempotency_key: input.idempotencyKey,
  });

  assertRpcOk(data, error, "PROPOSAL_DENIED");
  workbenchSuccess("PROPOSAL_SUBMITTED");
}

export async function acceptProposalAction(formData: FormData): Promise<void> {
  const parsed = acceptProposalSchema.safeParse({
    ...formProjectContext(formData),
    ...formCommand(formData),
    proposalId: formData.get("proposalId"),
    opportunityVersion: formData.get("opportunityVersion"),
    proposalVersion: formData.get("proposalVersion"),
    expectedOpportunityMaterialVersion: formData.get("expectedOpportunityMaterialVersion"),
    expectedProposalMaterialVersion: formData.get("expectedProposalMaterialVersion"),
    reason: formData.get("reason"),
  });
  if (!parsed.success) workbenchError("INVALID_ACCEPT_INPUT");

  const input = parsed.data;
  const { client, project } = await actionContext(input.projectId, input.projectSlug);

  const { data, error } = await client.rpc("b1_accept_proposal", {
    p_actor_id: project.steward_actor_id,
    p_proposal_id: input.proposalId,
    p_opportunity_version: input.opportunityVersion,
    p_proposal_version: input.proposalVersion,
    p_expected_opportunity_material_version: input.expectedOpportunityMaterialVersion,
    p_expected_proposal_material_version: input.expectedProposalMaterialVersion,
    p_reason: input.reason,
    p_command_id: input.commandId,
    p_idempotency_key: input.idempotencyKey,
  });

  assertRpcOk(data, error, "ACCEPT_DENIED");
  workbenchSuccess("COMMITMENT_CREATED");
}

export async function submitContributionAction(formData: FormData): Promise<void> {
  const parsed = contributionSchema.safeParse({
    ...formProjectContext(formData),
    ...formCommand(formData),
    actorId: formData.get("actorId"),
    commitmentId: formData.get("commitmentId"),
    description: formData.get("description"),
    limitations: formData.get("limitations"),
  });
  if (!parsed.success) workbenchError("INVALID_CONTRIBUTION_INPUT");

  const input = parsed.data;
  const { client, userId } = await actionContext(input.projectId, input.projectSlug);
  await requireControlledActor(client, userId, input.actorId);

  const { data, error } = await client.rpc("b2a_submit_contribution", {
    p_actor_id: input.actorId,
    p_commitment_id: input.commitmentId,
    p_description: input.description,
    p_limitations: input.limitations,
    p_supersedes_contribution_id: null,
    p_command_id: input.commandId,
    p_idempotency_key: input.idempotencyKey,
  });

  assertRpcOk(data, error, "CONTRIBUTION_DENIED");
  workbenchSuccess("CONTRIBUTION_SUBMITTED");
}

export async function attachArtifactAction(formData: FormData): Promise<void> {
  const parsed = artifactSchema.safeParse({
    ...formProjectContext(formData),
    ...formCommand(formData),
    actorId: formData.get("actorId"),
    contributionId: formData.get("contributionId"),
    kind: formData.get("kind"),
    uri: formData.get("uri"),
    digest: formData.get("digest"),
    mediaType: formData.get("mediaType"),
    sizeBytes: formData.get("sizeBytes"),
    retentionClass: formData.get("retentionClass"),
  });
  if (!parsed.success) workbenchError("INVALID_ARTIFACT_INPUT");

  const input = parsed.data;
  const { client, userId } = await actionContext(input.projectId, input.projectSlug);
  await requireControlledActor(client, userId, input.actorId);

  const { data, error } = await client.rpc("b2a_attach_artifact", {
    p_actor_id: input.actorId,
    p_contribution_id: input.contributionId,
    p_kind: input.kind,
    p_uri: input.uri,
    p_digest: input.digest,
    p_media_type: input.mediaType,
    p_size_bytes: input.sizeBytes,
    p_retention_class: input.retentionClass,
    p_command_id: input.commandId,
    p_idempotency_key: input.idempotencyKey,
  });

  assertRpcOk(data, error, "ARTIFACT_DENIED");
  workbenchSuccess("ARTIFACT_ATTACHED");
}

export async function recordClaimAction(formData: FormData): Promise<void> {
  const parsed = claimSchema.safeParse({
    ...formProjectContext(formData),
    ...formCommand(formData),
    actorId: formData.get("actorId"),
    subjectType: formData.get("subjectType"),
    subjectId: formData.get("subjectId"),
    statement: formData.get("statement"),
    scopeDescription: formData.get("scopeDescription"),
  });
  if (!parsed.success) workbenchError("INVALID_CLAIM_INPUT");

  const input = parsed.data;
  const { client, userId } = await actionContext(input.projectId, input.projectSlug);
  await requireControlledActor(client, userId, input.actorId);

  const { data, error } = await client.rpc("b2b1_record_claim", {
    p_actor_id: input.actorId,
    p_subject_type: input.subjectType,
    p_subject_id: input.subjectId,
    p_statement: input.statement,
    p_scope_description: input.scopeDescription,
    p_supersedes_claim_id: null,
    p_command_id: input.commandId,
    p_idempotency_key: input.idempotencyKey,
  });

  assertRpcOk(data, error, "CLAIM_DENIED");
  workbenchSuccess("CLAIM_RECORDED");
}

export async function registerEvidenceAction(formData: FormData): Promise<void> {
  const parsed = evidenceSchema.safeParse({
    ...formProjectContext(formData),
    ...formCommand(formData),
    actorId: formData.get("actorId"),
    claimId: formData.get("claimId"),
    sourceArtifactId: formData.get("sourceArtifactId"),
    relation: formData.get("relation"),
    description: formData.get("description"),
    limitations: formData.get("limitations"),
  });
  if (!parsed.success) workbenchError("INVALID_EVIDENCE_INPUT");

  const input = parsed.data;
  const { client, userId } = await actionContext(input.projectId, input.projectSlug);
  await requireControlledActor(client, userId, input.actorId);

  const { data, error } = await client.rpc("b2b1_register_evidence", {
    p_actor_id: input.actorId,
    p_claim_id: input.claimId,
    p_source_artifact_id: input.sourceArtifactId,
    p_relation: input.relation,
    p_description: input.description,
    p_limitations: input.limitations,
    p_supersedes_evidence_item_id: null,
    p_command_id: input.commandId,
    p_idempotency_key: input.idempotencyKey,
  });

  assertRpcOk(data, error, "EVIDENCE_DENIED");
  workbenchSuccess("EVIDENCE_REGISTERED");
}

export async function requestVerificationAction(formData: FormData): Promise<void> {
  const parsed = requestVerificationSchema.safeParse({
    ...formProjectContext(formData),
    ...formCommand(formData),
    claimId: formData.get("claimId"),
    criteria: formData.get("criteria"),
    expectedMethod: formData.get("expectedMethod"),
  });
  if (!parsed.success) workbenchError("INVALID_VERIFICATION_REQUEST");

  const input = parsed.data;
  const { client, project } = await actionContext(input.projectId, input.projectSlug);

  const { data, error } = await client.rpc("b2b2_request_verification", {
    p_actor_id: project.steward_actor_id,
    p_claim_id: input.claimId,
    p_reviewer_actor_id: project.steward_actor_id,
    p_criteria: input.criteria,
    p_expected_method: input.expectedMethod,
    p_due_at: null,
    p_command_id: input.commandId,
    p_idempotency_key: input.idempotencyKey,
  });

  assertRpcOk(data, error, "VERIFICATION_REQUEST_DENIED");
  workbenchSuccess("VERIFICATION_REQUESTED");
}

export async function issueVerificationAction(formData: FormData): Promise<void> {
  const parsed = issueVerificationSchema.safeParse({
    ...formProjectContext(formData),
    ...formCommand(formData),
    requestId: formData.get("requestId"),
    method: formData.get("method"),
    findings: formData.get("findings"),
    classification: formData.get("classification"),
    limitations: formData.get("limitations"),
    evidenceItemIds: formData.getAll("evidenceItemId").map(String),
  });
  if (!parsed.success) workbenchError("INVALID_VERIFICATION_INPUT");

  const input = parsed.data;
  const { client, project } = await actionContext(input.projectId, input.projectSlug);

  const { data, error } = await client.rpc("b2b2_issue_verification", {
    p_actor_id: project.steward_actor_id,
    p_request_id: input.requestId,
    p_method: input.method,
    p_findings: input.findings,
    p_classification: input.classification,
    p_limitations: input.limitations,
    p_evidence_item_ids: input.evidenceItemIds,
    p_command_id: input.commandId,
    p_idempotency_key: input.idempotencyKey,
  });

  assertRpcOk(data, error, "VERIFICATION_DENIED");
  workbenchSuccess("VERIFICATION_ISSUED");
}

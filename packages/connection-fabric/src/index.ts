// SPDX-License-Identifier: MPL-2.0
import { createHash } from "node:crypto";
import { z } from "zod";

export const externalProviderSchema = z.enum(["github", "linear", "google"]);
export type ExternalProvider = z.infer<typeof externalProviderSchema>;

export const connectionOwnerSchema = z.object({
  kind: z.enum(["PERSON", "CELL", "SERVICE"]),
  id: z.string().trim().min(1).max(160),
}).strict();

export const credentialReferenceSchema = z.object({
  id: z.string().trim().min(1).max(160),
  provider: externalProviderSchema,
  store: z.enum(["OS_KEYCHAIN", "ENCRYPTED_SECRET_STORE", "SECRET_MANAGER"]),
  locator: z.string().trim().min(1).max(200).refine((value) => !/^(?:gh[pousr]_|sk-[A-Za-z]|ya29\.|eyJ[A-Za-z0-9_-]+\.)/.test(value), "Store only an opaque credential reference, never the credential value."),
  status: z.enum(["AVAILABLE", "MISSING", "REVOKED"]),
  createdAt: z.iso.datetime(),
}).strict();
export type CredentialReference = z.infer<typeof credentialReferenceSchema>;

export const authorizationGrantSchema = z.object({
  id: z.string().trim().min(1).max(160),
  connectionId: z.string().trim().min(1).max(160),
  grantedByPersonId: z.string().trim().min(1).max(160),
  scopes: z.array(z.string().trim().min(1).max(160)).max(80),
  consentRecordId: z.string().trim().min(1).max(160),
  grantedAt: z.iso.datetime(),
  expiresAt: z.iso.datetime().optional(),
  revokedAt: z.iso.datetime().optional(),
}).strict();
export type AuthorizationGrant = z.infer<typeof authorizationGrantSchema>;

export const externalAccountSchema = z.object({
  id: z.string().trim().min(1).max(160),
  provider: externalProviderSchema,
  externalSubject: z.string().trim().min(1).max(240),
  displayLabel: z.string().trim().min(1).max(160),
  observedAt: z.iso.datetime(),
  source: z.enum(["PROVIDER_READBACK", "SANDBOX_FIXTURE"]),
}).strict();
export type ExternalAccount = z.infer<typeof externalAccountSchema>;

export const externalResourceSchema = z.object({
  id: z.string().trim().min(1).max(160),
  provider: externalProviderSchema,
  accountId: z.string().trim().min(1).max(160),
  resourceType: z.enum([
    "REPOSITORY", "ISSUE", "PULL_REQUEST", "LINEAR_TEAM", "LINEAR_PROJECT",
    "LINEAR_ISSUE", "GMAIL_THREAD", "DRIVE_FILE", "GOOGLE_CALENDAR", "CALENDAR_EVENT",
  ]),
  externalId: z.string().trim().min(1).max(240),
  label: z.string().trim().min(1).max(240),
  url: z.string().url().max(2048).refine((value) => {
    try { return new URL(value).protocol === "https:"; } catch { return false; }
  }, "External resource links must use HTTPS.").optional(),
  source: z.enum(["PROVIDER_READBACK", "SANDBOX_FIXTURE"]),
  observedAt: z.iso.datetime(),
}).strict();
export type ExternalResource = z.infer<typeof externalResourceSchema>;

export const connectionSchema = z.object({
  id: z.string().trim().min(1).max(160),
  owner: connectionOwnerSchema,
  provider: externalProviderSchema,
  status: z.enum(["PENDING_AUTHORIZATION", "CONNECTED", "DEGRADED", "REVOKED"]),
  externalAccountId: z.string().trim().min(1).max(160).optional(),
  authorizationGrantId: z.string().trim().min(1).max(160).optional(),
  credentialReferenceId: z.string().trim().min(1).max(160).optional(),
  createdAt: z.iso.datetime(),
  lastVerifiedAt: z.iso.datetime().optional(),
  revokedAt: z.iso.datetime().optional(),
}).strict();
export type Connection = z.infer<typeof connectionSchema>;

export const capabilityDefinitionSchema = z.object({
  id: z.string().trim().min(1).max(160),
  provider: externalProviderSchema,
  resourceType: externalResourceSchema.shape.resourceType,
  /** Provider-side objects that must be explicitly bound before this action can run. */
  targetResourceTypes: z.array(externalResourceSchema.shape.resourceType).min(1).max(3),
  action: z.string().trim().min(1).max(120),
  access: z.enum(["READ", "DRAFT", "WRITE"]),
  costClass: z.enum(["LOCAL_ONLY", "ACCOUNT_QUOTA", "EXTERNAL_BILLING_UNKNOWN", "NO_COST_EXPECTED"]),
  latencyClass: z.enum(["INTERACTIVE", "BACKGROUND", "VARIABLE"]),
  risk: z.enum(["LOW", "MODERATE", "HIGH"]),
  reversible: z.boolean(),
  authorityRequirement: z.string().trim().min(1).max(300),
  approvalPolicy: z.enum(["READ_WITHIN_GRANTED_SCOPE", "DRAFT_ONLY", "HUMAN_CONFIRMATION", "HIGH_RISK_CONFIRMATION"]),
  provenance: z.string().trim().min(1).max(300),
}).strict();
export type CapabilityDefinition = z.infer<typeof capabilityDefinitionSchema>;

export const capabilityBindingSchema = z.object({
  id: z.string().trim().min(1).max(160),
  connectionId: z.string().trim().min(1).max(160),
  capabilityDefinitionId: z.string().trim().min(1).max(160),
  externalResourceId: z.string().trim().min(1).max(160).optional(),
  enabledAt: z.iso.datetime().optional(),
  disabledAt: z.iso.datetime().optional(),
}).strict();
export type CapabilityBinding = z.infer<typeof capabilityBindingSchema>;

export type CapabilityAvailability =
  | "AVAILABLE"
  | "AVAILABLE_WITH_HUMAN_CONFIRMATION"
  | "BACKGROUND_ONLY"
  | "CONFIGURED_BUT_UNAVAILABLE"
  | "NOT_CONFIGURED"
  | "HISTORICAL_ONLY";

export interface RegisteredCapability {
  definition: CapabilityDefinition;
  availability: CapabilityAvailability;
  reason: string;
  connectionId: string | null;
  bindingId: string | null;
  sandboxAvailable: boolean;
}

/** A connection's explicit grant pointer is the current consent boundary.
 * Older or separately retained grants are history until the connection is
 * deliberately rebound to one of them.
 */
export function activeAuthorizationGrant(
  connection: Connection,
  grants: readonly AuthorizationGrant[],
  now: string,
): AuthorizationGrant | undefined {
  if (!connection.authorizationGrantId) return undefined;
  return grants.find((grant) => grant.id === connection.authorizationGrantId
    && grant.connectionId === connection.id
    && !grant.revokedAt
    && (!grant.expiresAt || grant.expiresAt > now));
}

export const providerCapabilityCatalog: readonly CapabilityDefinition[] = [
  { id: "github:repository.read", provider: "github", resourceType: "REPOSITORY", targetResourceTypes: ["REPOSITORY"], action: "read_repository", access: "READ", costClass: "EXTERNAL_BILLING_UNKNOWN", latencyClass: "INTERACTIVE", risk: "LOW", reversible: true, authorityRequirement: "Ativo somente com grant de leitura GitHub para esta conexão.", approvalPolicy: "READ_WITHIN_GRANTED_SCOPE", provenance: "GitHub API read contract; sandbox tests are explicitly non-live." },
  { id: "github:issue.read", provider: "github", resourceType: "ISSUE", targetResourceTypes: ["ISSUE"], action: "read_issue", access: "READ", costClass: "EXTERNAL_BILLING_UNKNOWN", latencyClass: "INTERACTIVE", risk: "LOW", reversible: true, authorityRequirement: "Ativo somente com grant de leitura GitHub para esta conexão.", approvalPolicy: "READ_WITHIN_GRANTED_SCOPE", provenance: "GitHub API read contract; sandbox tests are explicitly non-live." },
  { id: "github:issue.create", provider: "github", resourceType: "ISSUE", targetResourceTypes: ["REPOSITORY"], action: "create_issue", access: "WRITE", costClass: "EXTERNAL_BILLING_UNKNOWN", latencyClass: "INTERACTIVE", risk: "MODERATE", reversible: false, authorityRequirement: "Grant de escrita e confirmação humana do conteúdo e destino.", approvalPolicy: "HUMAN_CONFIRMATION", provenance: "GitHub API write contract; no live credential is configured." },
  { id: "github:pull_request.open", provider: "github", resourceType: "PULL_REQUEST", targetResourceTypes: ["REPOSITORY"], action: "open_pull_request", access: "WRITE", costClass: "EXTERNAL_BILLING_UNKNOWN", latencyClass: "INTERACTIVE", risk: "HIGH", reversible: false, authorityRequirement: "Grant de escrita e confirmação humana explícita.", approvalPolicy: "HIGH_RISK_CONFIRMATION", provenance: "GitHub API write contract; merge and deployment remain separate authorities." },
  { id: "linear:team.read", provider: "linear", resourceType: "LINEAR_TEAM", targetResourceTypes: ["LINEAR_TEAM"], action: "read_team", access: "READ", costClass: "EXTERNAL_BILLING_UNKNOWN", latencyClass: "INTERACTIVE", risk: "LOW", reversible: true, authorityRequirement: "Ativo somente com grant de leitura Linear para esta conexão.", approvalPolicy: "READ_WITHIN_GRANTED_SCOPE", provenance: "Linear API read contract; sandbox tests are explicitly non-live." },
  { id: "linear:issue.read", provider: "linear", resourceType: "LINEAR_ISSUE", targetResourceTypes: ["LINEAR_ISSUE"], action: "read_issue", access: "READ", costClass: "EXTERNAL_BILLING_UNKNOWN", latencyClass: "INTERACTIVE", risk: "LOW", reversible: true, authorityRequirement: "Ativo somente com grant de leitura Linear para esta conexão.", approvalPolicy: "READ_WITHIN_GRANTED_SCOPE", provenance: "Linear API read contract; sandbox tests are explicitly non-live." },
  { id: "linear:issue.create", provider: "linear", resourceType: "LINEAR_ISSUE", targetResourceTypes: ["LINEAR_TEAM"], action: "create_issue", access: "WRITE", costClass: "EXTERNAL_BILLING_UNKNOWN", latencyClass: "INTERACTIVE", risk: "MODERATE", reversible: false, authorityRequirement: "Grant de escrita e confirmação humana do conteúdo e destino.", approvalPolicy: "HUMAN_CONFIRMATION", provenance: "Linear API write contract; no live credential is configured." },
  { id: "google:gmail.thread.read", provider: "google", resourceType: "GMAIL_THREAD", targetResourceTypes: ["GMAIL_THREAD"], action: "read_thread", access: "READ", costClass: "EXTERNAL_BILLING_UNKNOWN", latencyClass: "INTERACTIVE", risk: "MODERATE", reversible: true, authorityRequirement: "Somente threads cobertas por grant Gmail de leitura.", approvalPolicy: "READ_WITHIN_GRANTED_SCOPE", provenance: "Google Gmail API contract; sandbox tests are explicitly non-live." },
  { id: "google:gmail.draft", provider: "google", resourceType: "GMAIL_THREAD", targetResourceTypes: ["GMAIL_THREAD"], action: "create_draft", access: "DRAFT", costClass: "EXTERNAL_BILLING_UNKNOWN", latencyClass: "INTERACTIVE", risk: "LOW", reversible: true, authorityRequirement: "Grant Gmail de composição; enviar ainda exige confirmação.", approvalPolicy: "DRAFT_ONLY", provenance: "Google Gmail draft contract; draft is not a sent message or agreement." },
  { id: "google:drive.file.read", provider: "google", resourceType: "DRIVE_FILE", targetResourceTypes: ["DRIVE_FILE"], action: "read_file", access: "READ", costClass: "EXTERNAL_BILLING_UNKNOWN", latencyClass: "INTERACTIVE", risk: "MODERATE", reversible: true, authorityRequirement: "Somente arquivos cobertos por grant Drive de leitura.", approvalPolicy: "READ_WITHIN_GRANTED_SCOPE", provenance: "Google Drive API read contract; sandbox tests are explicitly non-live." },
  { id: "google:calendar.event.read", provider: "google", resourceType: "CALENDAR_EVENT", targetResourceTypes: ["CALENDAR_EVENT"], action: "read_event", access: "READ", costClass: "EXTERNAL_BILLING_UNKNOWN", latencyClass: "INTERACTIVE", risk: "MODERATE", reversible: true, authorityRequirement: "Somente eventos cobertos por grant Calendar de leitura.", approvalPolicy: "READ_WITHIN_GRANTED_SCOPE", provenance: "Google Calendar API contract; sandbox tests are explicitly non-live." },
  { id: "google:calendar.event.create", provider: "google", resourceType: "CALENDAR_EVENT", targetResourceTypes: ["GOOGLE_CALENDAR"], action: "create_event", access: "WRITE", costClass: "EXTERNAL_BILLING_UNKNOWN", latencyClass: "INTERACTIVE", risk: "MODERATE", reversible: true, authorityRequirement: "Grant Calendar de escrita e confirmação humana do convite.", approvalPolicy: "HUMAN_CONFIRMATION", provenance: "Google Calendar API write contract; no live credential is configured." },
] as const;

export function registerCapabilities(input: {
  connections: readonly Connection[];
  grants: readonly AuthorizationGrant[];
  bindings: readonly CapabilityBinding[];
  credentialReferences: readonly CredentialReference[];
  /** Exact actions implemented by this runtime. A provider read adapter must not imply write support. */
  liveCapabilityIds?: readonly string[];
  now?: string;
}): RegisteredCapability[] {
  const now = input.now ?? new Date().toISOString();
  return providerCapabilityCatalog.map((definition) => {
    const connections = input.connections.filter((item) => item.provider === definition.provider && item.status === "CONNECTED");
    if (!connections.length) return { definition, availability: "NOT_CONFIGURED", reason: "Nenhuma conexão real deste provedor foi autorizada.", connectionId: null, bindingId: null, sandboxAvailable: true };
    const evaluations = connections.map((connection) => {
      const grant = activeAuthorizationGrant(connection, input.grants, now);
      const credential = connection.credentialReferenceId && input.credentialReferences.find((item) => item.id === connection.credentialReferenceId && item.status === "AVAILABLE");
      const binding = input.bindings.find((item) => item.connectionId === connection.id && item.capabilityDefinitionId === definition.id && Boolean(item.enabledAt) && item.enabledAt! <= now && !item.disabledAt);
      const hasScope = grant && (grant.scopes.includes("*") || grant.scopes.includes(`${definition.provider}:${definition.action}`));
      const reason = !grant ? "Grant ausente, expirado ou revogado." : !credential ? "Referência segura de credencial indisponível." : !binding ? "Capability sem binding explícito para esta conexão/recurso." : !hasScope ? "O grant não inclui o escopo exigido por esta ação." : null;
      return { connection, grant, credential, binding, reason };
    });
    // A usable secondary account must not be hidden by an earlier stale connection.
    const usable = evaluations.find((item) => !item.reason && item.binding);
    if (usable && !input.liveCapabilityIds?.includes(definition.id)) return {
      definition,
      availability: "CONFIGURED_BUT_UNAVAILABLE",
      reason: "Conexão, credencial, grant e binding existem, mas não há adapter live instalado neste runtime.",
      connectionId: usable.connection.id,
      bindingId: usable.binding!.id,
      sandboxAvailable: true,
    };
    if (usable) return {
      definition,
      availability: definition.access === "READ" ? "AVAILABLE" : "AVAILABLE_WITH_HUMAN_CONFIRMATION",
      reason: definition.access === "READ" ? "Conexão, credencial, grant e binding ativos." : "Conexão e escopo ativos; a ação ainda exige confirmação humana pelo Action Gateway.",
      connectionId: usable.connection.id,
      bindingId: usable.binding!.id,
      sandboxAvailable: true,
    };
    const best = evaluations.find((item) => item.grant) ?? evaluations[0]!;
    return { definition, availability: "CONFIGURED_BUT_UNAVAILABLE", reason: best.reason ?? "Capability indisponível.", connectionId: best.connection.id, bindingId: best.binding?.id ?? null, sandboxAvailable: true };
  });
}

export const connectionFabricStateSchema = z.object({
  connections: z.array(connectionSchema).max(500).default([]),
  authorizationGrants: z.array(authorizationGrantSchema).max(1000).default([]),
  externalAccounts: z.array(externalAccountSchema).max(1000).default([]),
  externalResources: z.array(externalResourceSchema).max(5000).default([]),
  credentialReferences: z.array(credentialReferenceSchema).max(1000).default([]),
  capabilityBindings: z.array(capabilityBindingSchema).max(5000).default([]),
}).strict();
export type ConnectionFabricState = z.infer<typeof connectionFabricStateSchema>;

/** Parses legacy stores with no Connected World fields and validates all references without exposing credential values. */
export function parseConnectionFabricState(input: unknown): ConnectionFabricState {
  const source = input && typeof input === "object" ? input as Record<string, unknown> : {};
  const state = connectionFabricStateSchema.parse({
    connections: source.connections,
    authorizationGrants: source.authorizationGrants,
    externalAccounts: source.externalAccounts,
    externalResources: source.externalResources,
    credentialReferences: source.credentialReferences,
    capabilityBindings: source.capabilityBindings,
  });
  const byId = <T extends { id: string }>(items: readonly T[]) => new Map(items.map((item) => [item.id, item]));
  const connections = byId(state.connections);
  const grants = byId(state.authorizationGrants);
  const accounts = byId(state.externalAccounts);
  const credentials = byId(state.credentialReferences);
  const definitions = byId(providerCapabilityCatalog);
  const resources = byId(state.externalResources);
  const bindings = byId(state.capabilityBindings);
  if (connections.size !== state.connections.length || grants.size !== state.authorizationGrants.length || accounts.size !== state.externalAccounts.length || credentials.size !== state.credentialReferences.length || resources.size !== state.externalResources.length || bindings.size !== state.capabilityBindings.length)
    throw new Error("CONNECTION_FABRIC_DUPLICATE_ID");
  for (const connection of state.connections) {
    if (connection.externalAccountId && accounts.get(connection.externalAccountId)?.provider !== connection.provider) throw new Error("CONNECTION_ACCOUNT_REFERENCE_INVALID");
    if (connection.credentialReferenceId && credentials.get(connection.credentialReferenceId)?.provider !== connection.provider) throw new Error("CONNECTION_CREDENTIAL_REFERENCE_INVALID");
    if (connection.authorizationGrantId && grants.get(connection.authorizationGrantId)?.connectionId !== connection.id) throw new Error("CONNECTION_GRANT_REFERENCE_INVALID");
  }
  for (const grant of state.authorizationGrants) if (!connections.has(grant.connectionId)) throw new Error("GRANT_CONNECTION_REFERENCE_INVALID");
  const sourceRecords = Array.isArray(source.records) ? source.records as Array<Record<string, unknown>> : null;
  if (state.authorizationGrants.length && !sourceRecords) throw new Error("GRANT_CONSENT_RECORD_SOURCE_MISSING");
  for (const grant of state.authorizationGrants) {
    const connection = connections.get(grant.connectionId)!;
    const consent = sourceRecords?.find((record) => record.id === grant.consentRecordId && record.kind === "OriginalRecord" && record.purpose === "connection_authorization" && record.authorId === grant.grantedByPersonId);
    if (!consent)
      throw new Error("GRANT_CONSENT_RECORD_INVALID");
    if (connection.owner.kind === "PERSON" && grant.grantedByPersonId !== connection.owner.id) throw new Error("GRANTOR_CONNECTION_OWNER_MISMATCH");
    const visibility = consent.visibility && typeof consent.visibility === "object" ? consent.visibility as Record<string, unknown> : null;
    const consentScopeMatches = connection.owner.kind === "PERSON"
      ? visibility?.scope === "private" && visibility.ownerId === connection.owner.id
      : visibility?.scope === "cell" && (connection.owner.kind !== "CELL" || visibility.cellId === connection.owner.id);
    if (!consentScopeMatches) throw new Error("GRANT_CONSENT_VISIBILITY_INVALID");
  }
  for (const resource of state.externalResources) {
    const account = accounts.get(resource.accountId);
    if (account?.provider !== resource.provider) throw new Error("EXTERNAL_RESOURCE_ACCOUNT_REFERENCE_INVALID");
    if (account.source !== resource.source) throw new Error("EXTERNAL_RESOURCE_SOURCE_MISMATCH");
  }
  for (const binding of state.capabilityBindings) {
    const connection = connections.get(binding.connectionId);
    if (!connection) throw new Error("CAPABILITY_BINDING_CONNECTION_REFERENCE_INVALID");
    const definition = definitions.get(binding.capabilityDefinitionId);
    if (!definition || definition.provider !== connection.provider) throw new Error("CAPABILITY_BINDING_DEFINITION_REFERENCE_INVALID");
    if (binding.externalResourceId) {
      const resource = resources.get(binding.externalResourceId);
      if (!resource || resource.provider !== connection.provider || resource.accountId !== connection.externalAccountId) throw new Error("CAPABILITY_BINDING_RESOURCE_REFERENCE_INVALID");
      if (!definition.targetResourceTypes.includes(resource.resourceType)) throw new Error("CAPABILITY_BINDING_RESOURCE_TYPE_INVALID");
    }
  }
  return state;
}

export interface ProviderFixture {
  account: ExternalAccount;
  resources: readonly ExternalResource[];
}

export interface ProviderReadAdapter {
  readonly provider: ExternalProvider;
  readonly mode: "SANDBOX" | "LIVE";
  listResources(): Promise<ExternalResource[]>;
  readResource(id: string): Promise<ExternalResource | null>;
}

export interface ProviderWriteRequest {
  connectionId: string;
  capabilityId: string;
  targetResourceId: string;
  actorPersonId: string;
  requestKey: string;
  confirmationLevel: "STANDARD" | "HIGH_RISK";
  payload: { title: string; body: string };
  /** Digest shown to and confirmed by the Human in the normal CZ authorization surface. */
  confirmationDigest: string;
  confirmedAt: string;
}

export type SandboxWriteResult =
  | { status: "DENIED"; reason: string }
  | { status: "CONFLICT"; reason: "REQUEST_KEY_CONFLICT" }
  | { status: "EXECUTED"; mode: "SANDBOX"; capabilityId: string; result: ExternalResource; provenance: { source: "SANDBOX_FIXTURE"; authorizationGrantId: string; bindingId: string; requestDigest: string; confirmedAt: string } };

export function externalActionDigest(request: Pick<ProviderWriteRequest, "connectionId" | "capabilityId" | "targetResourceId" | "actorPersonId" | "requestKey" | "confirmationLevel" | "payload" | "confirmedAt">): string {
  return createHash("sha256").update(JSON.stringify({
    connectionId: request.connectionId,
    capabilityId: request.capabilityId,
    targetResourceId: request.targetResourceId,
    actorPersonId: request.actorPersonId,
    requestKey: request.requestKey,
    confirmationLevel: request.confirmationLevel,
    payload: request.payload,
    confirmedAt: request.confirmedAt,
  })).digest("hex");
}

export interface ProviderWriteAdapter {
  readonly provider: ExternalProvider;
  readonly mode: "SANDBOX";
  execute(request: ProviderWriteRequest): Promise<SandboxWriteResult>;
}

/**
 * Contract-faithful write adapter for isolated tests. It cannot make network calls,
 * write institutional state, or represent a live provider result.
 */
export function createSandboxWriteAdapter(input: {
  provider: ExternalProvider;
  state: ConnectionFabricState;
  now?: () => string;
  authorizeInstitutionalWrite: (context: { actorPersonId: string; owner: Connection["owner"] }) => boolean | Promise<boolean>;
}): ProviderWriteAdapter {
  const completed = new Map<string, { digest: string; result: SandboxWriteResult }>();
  return {
    provider: input.provider,
    mode: "SANDBOX",
    async execute(request) {
      const definition = providerCapabilityCatalog.find((item) => item.id === request.capabilityId);
      if (!definition || definition.provider !== input.provider || definition.access === "READ") return { status: "DENIED", reason: "CAPABILITY_NOT_WRITABLE" };
      if (!request.requestKey.trim() || request.requestKey.length > 160 || !request.payload.title.trim() || request.payload.title.length > 240 || request.payload.body.length > 4000) return { status: "DENIED", reason: "REQUEST_INVALID" };
      if (definition.approvalPolicy === "HIGH_RISK_CONFIRMATION" && request.confirmationLevel !== "HIGH_RISK") return { status: "DENIED", reason: "HIGH_RISK_CONFIRMATION_REQUIRED" };
      const now = input.now?.() ?? new Date().toISOString();
      const confirmationTime = Date.parse(request.confirmedAt);
      const serverTime = Date.parse(now);
      if (!Number.isFinite(confirmationTime) || !Number.isFinite(serverTime) || Math.abs(serverTime - confirmationTime) > 5 * 60_000) return { status: "DENIED", reason: "HUMAN_CONFIRMATION_EXPIRED" };
      const digest = externalActionDigest(request);
      if (request.confirmationDigest !== digest) return { status: "DENIED", reason: "HUMAN_CONFIRMATION_MISMATCH" };
      const connection = input.state.connections.find((item) => item.id === request.connectionId && item.provider === input.provider && item.status === "CONNECTED");
      if (!connection) return { status: "DENIED", reason: "CONNECTION_NOT_ACTIVE" };
      if (connection.owner.kind === "PERSON" && connection.owner.id !== request.actorPersonId) return { status: "DENIED", reason: "CONNECTION_OWNER_MISMATCH" };
      if (!await input.authorizeInstitutionalWrite({ actorPersonId: request.actorPersonId, owner: connection.owner })) return { status: "DENIED", reason: "CZ_AUTHORITY_NOT_GRANTED" };
      const grant = activeAuthorizationGrant(connection, input.state.authorizationGrants, now);
      if (!grant) return { status: "DENIED", reason: "GRANT_NOT_ACTIVE" };
      if (!grant.scopes.includes("*") && !grant.scopes.includes(`${definition.provider}:${definition.action}`)) return { status: "DENIED", reason: "SCOPE_NOT_GRANTED" };
      const credential = connection.credentialReferenceId && input.state.credentialReferences.find((item) => item.id === connection.credentialReferenceId && item.provider === input.provider && item.status === "AVAILABLE");
      if (!credential) return { status: "DENIED", reason: "CREDENTIAL_REFERENCE_UNAVAILABLE" };
      const binding = input.state.capabilityBindings.find((item) => item.connectionId === connection.id && item.capabilityDefinitionId === definition.id && item.externalResourceId === request.targetResourceId && Boolean(item.enabledAt) && item.enabledAt! <= now && !item.disabledAt);
      if (!binding) return { status: "DENIED", reason: "TARGET_BINDING_NOT_ACTIVE" };
      const target = input.state.externalResources.find((item) => item.id === request.targetResourceId && item.provider === input.provider && item.accountId === connection.externalAccountId);
      const account = input.state.externalAccounts.find((item) => item.id === connection.externalAccountId && item.provider === input.provider);
      if (!target || !account || target.source !== "SANDBOX_FIXTURE" || account.source !== "SANDBOX_FIXTURE") return { status: "DENIED", reason: "SANDBOX_FIXTURE_REQUIRED" };
      if (!definition.targetResourceTypes.includes(target.resourceType)) return { status: "DENIED", reason: "TARGET_RESOURCE_TYPE_MISMATCH" };
      if (definition.approvalPolicy === "READ_WITHIN_GRANTED_SCOPE") return { status: "DENIED", reason: "APPROVAL_POLICY_INVALID" };
      const prior = completed.get(request.requestKey);
      if (prior) return prior.digest === digest ? prior.result : { status: "CONFLICT", reason: "REQUEST_KEY_CONFLICT" };
      const resultDigest = createHash("sha256").update(`${request.requestKey}\u0000${digest}`).digest("hex");
      const result: SandboxWriteResult = {
        status: "EXECUTED", mode: "SANDBOX", capabilityId: definition.id,
        result: externalResourceSchema.parse({ id: `sandbox-result-${resultDigest.slice(0, 24)}`, provider: input.provider, accountId: account.id, resourceType: definition.resourceType, externalId: `fixture-${resultDigest.slice(0, 24)}`, label: request.payload.title.trim(), url: target.url, source: "SANDBOX_FIXTURE", observedAt: request.confirmedAt }),
        provenance: { source: "SANDBOX_FIXTURE", authorizationGrantId: grant.id, bindingId: binding.id, requestDigest: digest, confirmedAt: request.confirmedAt },
      };
      completed.set(request.requestKey, { digest, result });
      return result;
    },
  };
}

export const providerResourceTypes: Readonly<Record<ExternalProvider, readonly ExternalResource["resourceType"][]>> = {
  github: ["REPOSITORY", "ISSUE", "PULL_REQUEST"],
  linear: ["LINEAR_TEAM", "LINEAR_PROJECT", "LINEAR_ISSUE"],
  google: ["GMAIL_THREAD", "DRIVE_FILE", "GOOGLE_CALENDAR", "CALENDAR_EVENT"],
};

export type AuthorizedReadResult =
  | { status: "DENIED"; reason: string }
  | { status: "NOT_FOUND"; mode: ProviderReadAdapter["mode"] }
  | { status: "READ"; mode: ProviderReadAdapter["mode"]; capabilityId: string; resource: ExternalResource; provenance: { provider: ExternalProvider; source: ExternalResource["source"]; observedAt: string; authorizationGrantId: string; bindingId: string } };

/** A read requires both server-resolved CZ authority and a provider grant scoped to this resource. */
export async function readBoundExternalResource(input: {
  state: ConnectionFabricState;
  actorPersonId: string;
  connectionId: string;
  capabilityId: string;
  resourceId: string;
  adapter: ProviderReadAdapter;
  /** Must resolve actor membership/authority for the connection owner server-side; never derive it from client fields. */
  authorizeInstitutionalRead: (context: { actorPersonId: string; owner: Connection["owner"] }) => boolean | Promise<boolean>;
  now?: string;
}): Promise<AuthorizedReadResult> {
  const definition = providerCapabilityCatalog.find((item) => item.id === input.capabilityId);
  if (!definition || definition.access !== "READ") return { status: "DENIED", reason: "CAPABILITY_NOT_READ_ONLY" };
  const connection = input.state.connections.find((item) => item.id === input.connectionId && item.provider === definition.provider && item.status === "CONNECTED");
  if (!connection) return { status: "DENIED", reason: "CONNECTION_NOT_ACTIVE" };
  if (connection.owner.kind === "PERSON" && connection.owner.id !== input.actorPersonId) return { status: "DENIED", reason: "CONNECTION_OWNER_MISMATCH" };
  if (!await input.authorizeInstitutionalRead({ actorPersonId: input.actorPersonId, owner: connection.owner })) return { status: "DENIED", reason: "CZ_AUTHORITY_NOT_GRANTED" };
  const now = input.now ?? new Date().toISOString();
  const grant = activeAuthorizationGrant(connection, input.state.authorizationGrants, now);
  if (!grant) return { status: "DENIED", reason: "GRANT_NOT_ACTIVE" };
  if (!grant.scopes.includes("*") && !grant.scopes.includes(`${definition.provider}:${definition.action}`)) return { status: "DENIED", reason: "SCOPE_NOT_GRANTED" };
  const credential = connection.credentialReferenceId && input.state.credentialReferences.find((item) => item.id === connection.credentialReferenceId && item.provider === connection.provider && item.status === "AVAILABLE");
  if (!credential) return { status: "DENIED", reason: "CREDENTIAL_REFERENCE_UNAVAILABLE" };
  const binding = input.state.capabilityBindings.find((item) => item.connectionId === connection.id && item.capabilityDefinitionId === definition.id && item.externalResourceId === input.resourceId && Boolean(item.enabledAt) && item.enabledAt! <= now && !item.disabledAt);
  if (!binding) return { status: "DENIED", reason: "RESOURCE_BINDING_NOT_ACTIVE" };
  const registeredResource = input.state.externalResources.find((item) => item.id === input.resourceId && item.provider === connection.provider && item.accountId === connection.externalAccountId);
  if (!registeredResource) return { status: "DENIED", reason: "RESOURCE_NOT_IN_CONNECTED_ACCOUNT" };
  const account = input.state.externalAccounts.find((item) => item.id === connection.externalAccountId && item.provider === connection.provider);
  if (!account || account.source !== registeredResource.source) return { status: "DENIED", reason: "RESOURCE_SOURCE_MISMATCH" };
  if ((input.adapter.mode === "SANDBOX") !== (registeredResource.source === "SANDBOX_FIXTURE")) return { status: "DENIED", reason: "ADAPTER_MODE_SOURCE_MISMATCH" };
  if (input.adapter.provider !== connection.provider) return { status: "DENIED", reason: "ADAPTER_PROVIDER_MISMATCH" };
  const resource = await input.adapter.readResource(input.resourceId);
  if (!resource) return { status: "NOT_FOUND", mode: input.adapter.mode };
  if (resource.id !== registeredResource.id || resource.provider !== connection.provider || resource.accountId !== connection.externalAccountId) return { status: "DENIED", reason: "ADAPTER_RESOURCE_SCOPE_MISMATCH" };
  if (!definition.targetResourceTypes.includes(resource.resourceType) || resource.source !== registeredResource.source) return { status: "DENIED", reason: "ADAPTER_RESOURCE_TYPE_OR_SOURCE_MISMATCH" };
  return {
    status: "READ",
    mode: input.adapter.mode,
    capabilityId: definition.id,
    resource,
    provenance: { provider: connection.provider, source: resource.source, observedAt: resource.observedAt, authorizationGrantId: grant.id, bindingId: binding.id },
  };
}

/** Deterministic contract adapter for tests. It cannot make network calls or writes. */
export function createSandboxReadAdapter(provider: ExternalProvider, fixture: ProviderFixture): ProviderReadAdapter {
  const account = externalAccountSchema.parse(fixture.account);
  if (account.provider !== provider || account.source !== "SANDBOX_FIXTURE") throw new Error("SANDBOX_FIXTURE_PROVIDER_MISMATCH");
  const resources = fixture.resources.map((resource) => externalResourceSchema.parse(resource));
  if (resources.some((resource) => resource.provider !== provider || resource.accountId !== account.id || resource.source !== "SANDBOX_FIXTURE")) throw new Error("SANDBOX_FIXTURE_RESOURCE_MISMATCH");
  if (resources.some((resource) => !providerResourceTypes[provider].includes(resource.resourceType))) throw new Error("SANDBOX_FIXTURE_RESOURCE_TYPE_MISMATCH");
  return {
    provider,
    mode: "SANDBOX",
    async listResources() { return resources.map((resource) => ({ ...resource })); },
    async readResource(id) { return resources.find((resource) => resource.id === id) ?? null; },
  };
}

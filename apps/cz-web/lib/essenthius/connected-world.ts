// SPDX-License-Identifier: MPL-2.0
import { activeAuthorizationGrant, providerCapabilityCatalog, registerCapabilities, type CapabilityAvailability, type CapabilityDefinition, type ConnectionFabricState, type ExternalProvider } from "@cz/connection-fabric";

const providerPresentation: Record<ExternalProvider, { label: string; purpose: string }> = {
  github: { label: "GitHub", purpose: "Repositórios, issues e pull requests de software." },
  linear: { label: "Linear", purpose: "Times, projetos e issues de coordenação." },
  google: { label: "Google", purpose: "Gmail, Drive e Calendar sob escopos separados." },
};

function capabilityLabel(id: string) {
  const labels: Record<string, string> = {
    "github:repository.read": "Ler repositórios",
    "github:branch.read": "Ler branches",
    "github:commit.read": "Ler commits",
    "github:issue.read": "Ler issues",
    "github:pull_request.read": "Ler pull requests",
    "github:issue.create": "Criar issue após autorização",
    "github:pull_request.open": "Abrir pull request após confirmação de alto risco",
    "linear:team.read": "Ler times",
    "linear:issue.read": "Ler issues",
    "linear:issue.create": "Criar issue após autorização",
    "google:gmail.thread.read": "Ler threads autorizadas do Gmail",
    "google:gmail.draft": "Preparar rascunho de e-mail",
    "google:drive.file.read": "Ler arquivos autorizados do Drive",
    "google:calendar.event.read": "Ler eventos autorizados do Calendar",
    "google:calendar.event.create": "Propor evento no Calendar",
  };
  return labels[id] ?? "Ação externa";
}

function capabilityEnables(id: string) {
  const descriptions: Record<string, string> = {
    "github:repository.read": "Encontrar código e contexto em repositórios autorizados.",
    "github:branch.read": "Consultar branches do repositório autorizado.",
    "github:commit.read": "Consultar commits do repositório autorizado.",
    "github:issue.read": "Consultar issues incluídas no acesso concedido.",
    "github:pull_request.read": "Consultar pull requests incluídos no acesso concedido.",
    "github:issue.create": "Preparar uma issue para revisão antes de enviá-la.",
    "github:pull_request.open": "Preparar uma mudança de software para revisão; abrir PR exige confirmação de alto risco.",
    "linear:team.read": "Localizar equipes disponíveis na conta conectada.",
    "linear:issue.read": "Consultar issues cobertas pelo acesso concedido.",
    "linear:issue.create": "Preparar uma issue para revisão antes de criá-la.",
    "google:gmail.thread.read": "Consultar threads do Gmail cobertas pelo acesso concedido.",
    "google:gmail.draft": "Preparar um rascunho sem enviar e-mail.",
    "google:drive.file.read": "Consultar arquivos selecionados e autorizados do Drive.",
    "google:calendar.event.read": "Consultar eventos do Calendar cobertos pelo acesso concedido.",
    "google:calendar.event.create": "Preparar um evento para confirmação antes de convidar pessoas.",
  };
  return descriptions[id] ?? "Usar uma capacidade externa explicitamente autorizada.";
}

export interface ConnectedWorldCapability {
  id: string;
  label: string;
  enables: string;
  provider: ExternalProvider;
  targetResourceTypes: string[];
  access: "READ" | "DRAFT" | "WRITE";
  latency: "INTERACTIVE" | "BACKGROUND" | "VARIABLE";
  availability: CapabilityAvailability;
  authorityRequired: string;
  approvalPolicy: string;
  costClass: CapabilityDefinition["costClass"];
  costStatus: "UNKNOWN";
  risk: "LOW" | "MODERATE" | "HIGH";
  reversible: boolean;
  provenance: string;
  reason: string;
}

export interface ConnectedProvider {
  provider: ExternalProvider;
  label: string;
  purpose: string;
  status: "NOT_CONNECTED" | "CONNECTED" | "NEEDS_ATTENTION" | "SANDBOX_ONLY";
  liveUseAvailable: boolean;
  sandboxStatus: "CONTRACT_TESTS_ONLY_NOT_A_REAL_CONNECTION";
  capabilities: ConnectedWorldCapability[];
}

export interface AuthorizedExternalResourceProjection {
  id: string;
  kind: "EXTERNAL_RESOURCE";
  source: string;
  availability: "SANDBOX_ONLY" | "PROVIDER_READBACK";
  provenance: string;
}

/** Exposes only cached resource metadata whose active provider grant and resource-specific read binding remain valid.
 * Caller must resolve CZ cell.read and cell.update in the authenticated server context.
 * This is a projection of a prior read, never a live provider fetch.
 */
export function projectAuthorizedExternalResources(input: {
  state: ConnectionFabricState;
  personId: string;
  cellId: string;
  canReadCell: boolean;
  canManageConnections: boolean;
  now?: string;
}): AuthorizedExternalResourceProjection[] {
  if (!input.canReadCell) return [];
  const now = input.now ?? new Date().toISOString();
  const connections = new Map(input.state.connections
    .filter((connection) => connection.status === "CONNECTED" && connection.externalAccountId && connection.credentialReferenceId)
    .filter((connection) => connection.owner.kind === "PERSON" ? connection.owner.id === input.personId : connection.owner.kind === "CELL" && connection.owner.id === input.cellId)
    .map((connection) => [connection.id, connection]));
  return input.state.externalResources.flatMap((resource) => {
    const connection = [...connections.values()].find((item) => item.provider === resource.provider && item.externalAccountId === resource.accountId);
    if (!connection) return [];
    const credential = input.state.credentialReferences.find((item) => item.id === connection.credentialReferenceId && item.provider === connection.provider && item.status === "AVAILABLE");
    if (!credential) return [];
    const grant = activeAuthorizationGrant(connection, input.state.authorizationGrants, now);
    if (!grant) return [];
    const grantorAuthorized = grant.grantedByPersonId === input.personId && (connection.owner.kind === "PERSON" || input.canManageConnections);
    if (!grantorAuthorized) return [];
    const readBinding = input.state.capabilityBindings.find((binding) => {
      if (binding.connectionId !== connection.id || binding.externalResourceId !== resource.id || !binding.enabledAt || binding.enabledAt > now || binding.disabledAt) return false;
      const definition = providerCapabilityCatalog.find((item) => item.id === binding.capabilityDefinitionId);
      return Boolean(definition && definition.provider === resource.provider && definition.targetResourceTypes.includes(resource.resourceType) && definition.access === "READ" && (grant.scopes.includes("*") || grant.scopes.includes(`${definition.provider}:${definition.action}`)));
    });
    if (!readBinding) return [];
    return [{
      id: `external-resource:${resource.id}`,
      kind: "EXTERNAL_RESOURCE" as const,
      source: `${providerPresentation[resource.provider].label} · ${resource.label}`,
      availability: resource.source === "SANDBOX_FIXTURE" ? "SANDBOX_ONLY" as const : "PROVIDER_READBACK" as const,
      provenance: resource.source === "SANDBOX_FIXTURE"
        ? "Fixture contratual isolada; não contém leitura de conta externa real."
        : `Metadado observado do provedor em ${resource.observedAt}; é uma leitura armazenada, não uma atualização ao vivo.`,
    }];
  });
}

/** Projects real connection state. It deliberately omits account IDs, binding IDs and credential locators. */
export function projectConnectedWorld(state: ConnectionFabricState, now = new Date().toISOString()): ConnectedProvider[] {
  const registry = registerCapabilities({
    connections: state.connections,
    grants: state.authorizationGrants,
    bindings: state.capabilityBindings,
    credentialReferences: state.credentialReferences,
    now,
  });
  return (Object.keys(providerPresentation) as ExternalProvider[]).map((provider) => {
    const connections = state.connections.filter((item) => item.provider === provider);
    const providerCapabilities = registry.filter((item) => item.definition.provider === provider);
    const capabilities = providerCapabilities.map(({ definition, availability, reason }) => ({
      id: definition.id,
      label: capabilityLabel(definition.id),
      enables: capabilityEnables(definition.id),
      provider,
      targetResourceTypes: [...definition.targetResourceTypes],
      access: definition.access,
      latency: definition.latencyClass,
      availability,
      authorityRequired: definition.authorityRequirement,
      approvalPolicy: definition.approvalPolicy,
      costClass: definition.costClass,
      costStatus: "UNKNOWN" as const,
      risk: definition.risk,
      reversible: definition.reversible,
      provenance: definition.provenance,
      reason,
    }));
    const liveUseAvailable = capabilities.some((capability) => capability.availability === "AVAILABLE" || capability.availability === "AVAILABLE_WITH_HUMAN_CONFIRMATION");
    const activeConnection = connections.find((item) => {
      if (item.status !== "CONNECTED" || !item.externalAccountId || !item.credentialReferenceId) return false;
      const account = state.externalAccounts.find((candidate) => candidate.id === item.externalAccountId && candidate.provider === provider && candidate.source === "PROVIDER_READBACK");
      const credential = state.credentialReferences.find((candidate) => candidate.id === item.credentialReferenceId && candidate.provider === provider && candidate.status === "AVAILABLE");
      const grant = activeAuthorizationGrant(item, state.authorizationGrants, now);
      return Boolean(account && credential && grant);
    });
    const connected = Boolean(activeConnection);
    const hasSandboxConnection = connections.some((item) => item.status === "CONNECTED" && state.externalAccounts.some((account) => account.id === item.externalAccountId && account.provider === provider && account.source === "SANDBOX_FIXTURE"));
    const status = !connections.length ? "NOT_CONNECTED" : connected ? "CONNECTED" : hasSandboxConnection ? "SANDBOX_ONLY" : "NEEDS_ATTENTION";
    return { provider, ...providerPresentation[provider], status, liveUseAvailable, sandboxStatus: "CONTRACT_TESTS_ONLY_NOT_A_REAL_CONNECTION", capabilities };
  });
}

export const connectedWorldDefinitions = providerCapabilityCatalog;

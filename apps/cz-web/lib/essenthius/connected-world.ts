// SPDX-License-Identifier: MPL-2.0
import { providerCapabilityCatalog, registerCapabilities, type CapabilityAvailability, type ConnectionFabricState, type ExternalProvider } from "@cz/connection-fabric";

const providerPresentation: Record<ExternalProvider, { label: string; purpose: string }> = {
  github: { label: "GitHub", purpose: "Repositórios, issues e pull requests de software." },
  linear: { label: "Linear", purpose: "Times, projetos e issues de coordenação." },
  google: { label: "Google", purpose: "Gmail, Drive e Calendar sob escopos separados." },
};

function capabilityLabel(id: string) {
  const labels: Record<string, string> = {
    "github:repository.read": "Ler repositórios",
    "github:issue.read": "Ler issues",
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

export interface ConnectedWorldCapability {
  id: string;
  label: string;
  provider: ExternalProvider;
  resourceType: string;
  access: "READ" | "DRAFT" | "WRITE";
  availability: CapabilityAvailability;
  authorityRequired: string;
  approvalPolicy: string;
  costStatus: "UNKNOWN";
  risk: "LOW" | "MODERATE" | "HIGH";
  reversible: boolean;
  reason: string;
}

export interface ConnectedProvider {
  provider: ExternalProvider;
  label: string;
  purpose: string;
  status: "NOT_CONNECTED" | "CONNECTED" | "NEEDS_ATTENTION";
  liveUseAvailable: boolean;
  sandboxStatus: "CONTRACT_TESTS_ONLY_NOT_A_REAL_CONNECTION";
  capabilities: ConnectedWorldCapability[];
}

/** Projects real connection state. It deliberately omits account IDs, binding IDs and credential locators. */
export function projectConnectedWorld(state: ConnectionFabricState): ConnectedProvider[] {
  const registry = registerCapabilities({
    connections: state.connections,
    grants: state.authorizationGrants,
    bindings: state.capabilityBindings,
    credentialReferences: state.credentialReferences,
  });
  return (Object.keys(providerPresentation) as ExternalProvider[]).map((provider) => {
    const connections = state.connections.filter((item) => item.provider === provider);
    const providerCapabilities = registry.filter((item) => item.definition.provider === provider);
    const capabilities = providerCapabilities.map(({ definition, availability, reason }) => ({
      id: definition.id,
      label: capabilityLabel(definition.id),
      provider,
      resourceType: definition.resourceType,
      access: definition.access,
      availability,
      authorityRequired: definition.authorityRequirement,
      approvalPolicy: definition.approvalPolicy,
      costStatus: "UNKNOWN" as const,
      risk: definition.risk,
      reversible: definition.reversible,
      reason,
    }));
    const liveUseAvailable = capabilities.some((capability) => capability.availability === "AVAILABLE" || capability.availability === "AVAILABLE_WITH_HUMAN_CONFIRMATION");
    const connected = connections.some((item) => item.status === "CONNECTED");
    const status = !connections.length ? "NOT_CONNECTED" : connected ? "CONNECTED" : "NEEDS_ATTENTION";
    return { provider, ...providerPresentation[provider], status, liveUseAvailable, sandboxStatus: "CONTRACT_TESTS_ONLY_NOT_A_REAL_CONNECTION", capabilities };
  });
}

export const connectedWorldDefinitions = providerCapabilityCatalog;

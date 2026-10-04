// SPDX-License-Identifier: MPL-2.0
import { describe, expect, it } from "vitest";
import { providerCapabilityCatalog } from "@cz/connection-fabric";
import { projectAuthorizedExternalResources, projectConnectedWorld } from "../lib/essenthius/connected-world";

const now = "2026-10-04T12:00:00.000Z";

describe("Connected World readback", () => {
  it("projects only resource metadata with active read scope, matching resource binding and CZ authority", () => {
    const state = {
      connections: [{ id: "cell-github", owner: { kind: "CELL" as const, id: "cell-1" }, provider: "github" as const, status: "CONNECTED" as const, externalAccountId: "account-1", authorizationGrantId: "grant-1", credentialReferenceId: "credential-1", createdAt: now }],
      authorizationGrants: [{ id: "grant-1", connectionId: "cell-github", grantedByPersonId: "person-1", scopes: ["github:read_repository"], consentRecordId: "consent-1", grantedAt: now }],
      externalAccounts: [{ id: "account-1", provider: "github" as const, externalSubject: "subject-1", displayLabel: "GitHub account", observedAt: now, source: "SANDBOX_FIXTURE" as const }],
      externalResources: [{ id: "resource-1", provider: "github" as const, accountId: "account-1", resourceType: "REPOSITORY" as const, externalId: "org/repo", label: "Habitat repository fixture", source: "SANDBOX_FIXTURE" as const, observedAt: now }],
      credentialReferences: [{ id: "credential-1", provider: "github" as const, store: "OS_KEYCHAIN" as const, locator: "cz/github/account", status: "AVAILABLE" as const, createdAt: now }],
      capabilityBindings: [{ id: "binding-1", connectionId: "cell-github", capabilityDefinitionId: "github:repository.read", externalResourceId: "resource-1", enabledAt: now }],
    };
    const projected = projectAuthorizedExternalResources({ state, personId: "person-1", cellId: "cell-1", canReadCell: true, canManageConnections: true, now });
    expect(projected).toMatchObject([{ kind: "EXTERNAL_RESOURCE", source: "GitHub · Habitat repository fixture", availability: "SANDBOX_ONLY" }]);
    expect(projectAuthorizedExternalResources({ state, personId: "person-1", cellId: "cell-1", canReadCell: false, canManageConnections: true, now })).toEqual([]);
    expect(projectAuthorizedExternalResources({ state, personId: "person-1", cellId: "cell-1", canReadCell: true, canManageConnections: false, now })).toEqual([]);
    expect(projectAuthorizedExternalResources({ state: { ...state, authorizationGrants: [{ ...state.authorizationGrants[0]!, grantedByPersonId: "other-person" }] }, personId: "person-1", cellId: "cell-1", canReadCell: true, canManageConnections: true, now })).toEqual([]);
    expect(JSON.stringify(projected)).not.toContain("org/repo");
    expect(JSON.stringify(projected)).not.toContain("credential-1");
  });

  it("does not present sandbox adapters as connected accounts", () => {
    const providers = projectConnectedWorld({ connections: [], authorizationGrants: [], externalAccounts: [], externalResources: [], credentialReferences: [], capabilityBindings: [] });
    expect(providers.map((provider) => provider.provider)).toEqual(["github", "linear", "google"]);
    expect(providers.every((provider) => provider.status === "NOT_CONNECTED" && !provider.liveUseAvailable)).toBe(true);
    expect(providers.every((provider) => provider.sandboxStatus === "CONTRACT_TESTS_ONLY_NOT_A_REAL_CONNECTION")).toBe(true);
    expect(providers.flatMap((provider) => provider.capabilities).every((capability) => capability.availability === "NOT_CONFIGURED" && capability.costStatus === "UNKNOWN")).toBe(true);
    expect(providers.flatMap((provider) => provider.capabilities).every((capability) => capability.provider && capability.resourceType && capability.latency && capability.risk && capability.approvalPolicy && capability.provenance)).toBe(true);
  });

  it("keeps configured records distinct from executable live adapters and omits private references", () => {
    const githubDefinitions = providerCapabilityCatalog.filter((item) => item.provider === "github");
    const state = {
      connections: [{ id: "secret-internal-connection-id", owner: { kind: "PERSON" as const, id: "person-1" }, provider: "github" as const, status: "CONNECTED" as const, externalAccountId: "account-1", authorizationGrantId: "grant-1", credentialReferenceId: "credential-1", createdAt: now }],
      authorizationGrants: [{ id: "grant-1", connectionId: "secret-internal-connection-id", grantedByPersonId: "person-1", scopes: ["github:read_repository", "github:create_issue"], consentRecordId: "consent-1", grantedAt: now }],
      externalAccounts: [{ id: "account-1", provider: "github" as const, externalSubject: "private-subject", displayLabel: "Private account", observedAt: now, source: "PROVIDER_READBACK" as const }],
      externalResources: [],
      credentialReferences: [{ id: "credential-1", provider: "github" as const, store: "OS_KEYCHAIN" as const, locator: "private-keychain-locator", status: "AVAILABLE" as const, createdAt: now }],
      capabilityBindings: githubDefinitions.map((definition) => ({ id: `binding-${definition.id}`, connectionId: "secret-internal-connection-id", capabilityDefinitionId: definition.id, enabledAt: now })),
    };
    const github = projectConnectedWorld(state).find((provider) => provider.provider === "github")!;
    expect(github.status).toBe("CONNECTED");
    expect(github.liveUseAvailable).toBe(false);
    expect(github.capabilities.find((item) => item.id === "github:repository.read")?.availability).toBe("CONFIGURED_BUT_UNAVAILABLE");
    expect(github.capabilities.find((item) => item.id === "github:issue.create")?.availability).toBe("CONFIGURED_BUT_UNAVAILABLE");
    expect(github.capabilities.find((item) => item.id === "github:repository.read")?.reason).toContain("não há adapter live instalado");
    expect(github.capabilities.find((item) => item.id === "github:repository.read")?.enables).toContain("Encontrar código e contexto");
    const serialized = JSON.stringify(github);
    expect(serialized).not.toContain("private-keychain-locator");
    expect(serialized).not.toContain("private-subject");
    expect(serialized).not.toContain("secret-internal-connection-id");
  });

  it("shows attention when a nominally connected account has an expired grant or revoked credential", () => {
    const state = {
      connections: [{ id: "connection-1", owner: { kind: "PERSON" as const, id: "person-1" }, provider: "linear" as const, status: "CONNECTED" as const, externalAccountId: "account-1", authorizationGrantId: "grant-1", credentialReferenceId: "credential-1", createdAt: now }],
      authorizationGrants: [{ id: "grant-1", connectionId: "connection-1", grantedByPersonId: "person-1", scopes: ["linear:read_team"], consentRecordId: "consent-1", grantedAt: now, expiresAt: "2026-10-03T12:00:00.000Z" }],
      externalAccounts: [{ id: "account-1", provider: "linear" as const, externalSubject: "subject-1", displayLabel: "Team account", observedAt: now, source: "PROVIDER_READBACK" as const }],
      externalResources: [],
      credentialReferences: [{ id: "credential-1", provider: "linear" as const, store: "OS_KEYCHAIN" as const, locator: "cz/linear/account", status: "REVOKED" as const, createdAt: now }],
      capabilityBindings: [],
    };
    const linear = projectConnectedWorld(state, now).find((provider) => provider.provider === "linear")!;
    expect(linear.status).toBe("NEEDS_ATTENTION");
    expect(linear.liveUseAvailable).toBe(false);
  });

  it("never labels a sandbox fixture as a real connected account", () => {
    const state = {
      connections: [{ id: "sandbox", owner: { kind: "PERSON" as const, id: "person-1" }, provider: "github" as const, status: "CONNECTED" as const, externalAccountId: "fixture-account", authorizationGrantId: "grant-1", createdAt: now }],
      authorizationGrants: [{ id: "grant-1", connectionId: "sandbox", grantedByPersonId: "person-1", scopes: ["*"], consentRecordId: "consent-1", grantedAt: now }],
      externalAccounts: [{ id: "fixture-account", provider: "github" as const, externalSubject: "fixture", displayLabel: "Fixture", observedAt: now, source: "SANDBOX_FIXTURE" as const }],
      externalResources: [],
      credentialReferences: [],
      capabilityBindings: [],
    };
    const github = projectConnectedWorld(state, now).find((provider) => provider.provider === "github")!;
    expect(github.status).toBe("SANDBOX_ONLY");
    expect(github.liveUseAvailable).toBe(false);
  });
});

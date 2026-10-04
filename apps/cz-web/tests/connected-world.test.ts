// SPDX-License-Identifier: MPL-2.0
import { describe, expect, it } from "vitest";
import { providerCapabilityCatalog } from "@cz/connection-fabric";
import { projectConnectedWorld } from "../lib/essenthius/connected-world";

const now = "2026-10-04T12:00:00.000Z";

describe("Connected World readback", () => {
  it("does not present sandbox adapters as connected accounts", () => {
    const providers = projectConnectedWorld({ connections: [], authorizationGrants: [], externalAccounts: [], externalResources: [], credentialReferences: [], capabilityBindings: [] });
    expect(providers.map((provider) => provider.provider)).toEqual(["github", "linear", "google"]);
    expect(providers.every((provider) => provider.status === "NOT_CONNECTED" && !provider.liveUseAvailable)).toBe(true);
    expect(providers.every((provider) => provider.sandboxStatus === "CONTRACT_TESTS_ONLY_NOT_A_REAL_CONNECTION")).toBe(true);
    expect(providers.flatMap((provider) => provider.capabilities).every((capability) => capability.availability === "NOT_CONFIGURED" && capability.costStatus === "UNKNOWN")).toBe(true);
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
    const serialized = JSON.stringify(github);
    expect(serialized).not.toContain("private-keychain-locator");
    expect(serialized).not.toContain("private-subject");
    expect(serialized).not.toContain("secret-internal-connection-id");
  });
});

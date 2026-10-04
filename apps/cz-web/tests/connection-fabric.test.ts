// SPDX-License-Identifier: MPL-2.0
import { describe, expect, it } from "vitest";
import {
  capabilityBindingSchema,
  capabilityDefinitionSchema,
  connectionSchema,
  createSandboxReadAdapter,
  credentialReferenceSchema,
  externalAccountSchema,
  externalResourceSchema,
  providerCapabilityCatalog,
  parseConnectionFabricState,
  registerCapabilities,
  readBoundExternalResource,
} from "@cz/connection-fabric";

const now = "2026-10-04T12:00:00.000Z";
const account = externalAccountSchema.parse({ id: "account-fixture", provider: "github", externalSubject: "fixture-org", displayLabel: "GitHub fixture org", observedAt: now, source: "SANDBOX_FIXTURE" });
const resource = externalResourceSchema.parse({ id: "resource-fixture", provider: "github", accountId: account.id, resourceType: "REPOSITORY", externalId: "fixture-org/example", label: "Example repository fixture", source: "SANDBOX_FIXTURE", observedAt: now });

describe("Connection Fabric contracts", () => {
  it("keeps unconnected providers unavailable while making test sandbox explicit", () => {
    const registry = registerCapabilities({ connections: [], grants: [], bindings: [], credentialReferences: [], now });
    expect(registry.length).toBe(providerCapabilityCatalog.length);
    expect(registry.every((capability) => capability.availability === "NOT_CONFIGURED" && capability.sandboxAvailable)).toBe(true);
    expect(registry.every((capability) => capability.reason.includes("Nenhuma conexão real"))).toBe(true);
  });

  it("requires a current grant, safe credential reference and explicit capability binding", () => {
    const definition = providerCapabilityCatalog.find((item) => item.id === "github:repository.read")!;
    const connection = connectionSchema.parse({ id: "connection-1", owner: { kind: "PERSON", id: "person-1" }, provider: "github", status: "CONNECTED", externalAccountId: "account-1", authorizationGrantId: "grant-1", credentialReferenceId: "credential-1", createdAt: now });
    const grant = { id: "grant-1", connectionId: connection.id, grantedByPersonId: "person-1", scopes: ["github:read_repository"], consentRecordId: "consent-1", grantedAt: now };
    const credential = credentialReferenceSchema.parse({ id: "credential-1", provider: "github", store: "OS_KEYCHAIN", locator: "cz/github/person-1", status: "AVAILABLE", createdAt: now });
    const binding = capabilityBindingSchema.parse({ id: "binding-1", connectionId: connection.id, capabilityDefinitionId: definition.id, externalResourceId: "resource-1", enabledAt: now });
    const read = registerCapabilities({ connections: [connection], grants: [grant], bindings: [binding], credentialReferences: [credential], liveAdapters: ["github"], now }).find((item) => item.definition.id === definition.id)!;
    expect(read).toMatchObject({ availability: "AVAILABLE", connectionId: connection.id, bindingId: binding.id });

    const writeDefinition = providerCapabilityCatalog.find((item) => item.id === "github:issue.create")!;
    const writeBinding = capabilityBindingSchema.parse({ id: "binding-write", connectionId: connection.id, capabilityDefinitionId: writeDefinition.id, enabledAt: now });
    const withoutWriteGrant = registerCapabilities({ connections: [connection], grants: [grant], bindings: [writeBinding], credentialReferences: [credential], now }).find((item) => item.definition.id === writeDefinition.id)!;
    expect(withoutWriteGrant.availability).toBe("CONFIGURED_BUT_UNAVAILABLE");

    const withWriteGrant = registerCapabilities({ connections: [connection], grants: [{ ...grant, scopes: [...grant.scopes, "github:create_issue"] }], bindings: [writeBinding], credentialReferences: [credential], liveAdapters: ["github"], now }).find((item) => item.definition.id === writeDefinition.id)!;
    expect(withWriteGrant.availability).toBe("AVAILABLE_WITH_HUMAN_CONFIRMATION");
  });

  it("fails closed for expired grants, revoked credentials and mismatched bindings", () => {
    const connection = connectionSchema.parse({ id: "connection-1", owner: { kind: "PERSON", id: "person-1" }, provider: "linear", status: "CONNECTED", externalAccountId: "account-1", authorizationGrantId: "grant-1", credentialReferenceId: "credential-1", createdAt: now });
    const definition = providerCapabilityCatalog.find((item) => item.id === "linear:issue.read")!;
    const result = registerCapabilities({
      connections: [connection],
      grants: [{ id: "grant-1", connectionId: connection.id, grantedByPersonId: "person-1", scopes: ["*"], consentRecordId: "consent-1", grantedAt: now, expiresAt: "2026-10-03T12:00:00.000Z" }],
      bindings: [{ id: "wrong-binding", connectionId: connection.id, capabilityDefinitionId: "linear:team.read", enabledAt: now }],
      credentialReferences: [{ id: "credential-1", provider: "linear", store: "OS_KEYCHAIN", locator: "cz/linear/person-1", status: "REVOKED", createdAt: now }],
      now,
    }).find((item) => item.definition.id === definition.id)!;
    expect(result.availability).toBe("CONFIGURED_BUT_UNAVAILABLE");
    expect(result.reason).toContain("Grant ausente");
  });

  it("rejects secret values in persisted credential references", () => {
    expect(() => credentialReferenceSchema.parse({ id: "credential-1", provider: "github", store: "OS_KEYCHAIN", locator: "cz/github/person-1", status: "AVAILABLE", createdAt: now, accessToken: "ghp_not-a-real-token" })).toThrow();
    expect(() => credentialReferenceSchema.parse({ id: "credential-1", provider: "github", store: "OS_KEYCHAIN", locator: "ghp_not-a-real-token", status: "AVAILABLE", createdAt: now })).toThrow();
  });

  it("provides a deterministic read-only sandbox adapter without presenting fixture data as live", async () => {
    const adapter = createSandboxReadAdapter("github", { account, resources: [resource] });
    expect(adapter.mode).toBe("SANDBOX");
    expect(await adapter.listResources()).toEqual([resource]);
    expect(await adapter.readResource(resource.id)).toEqual(resource);
    expect(await adapter.readResource("missing")).toBeNull();
    expect(() => createSandboxReadAdapter("linear", { account, resources: [resource] })).toThrow("SANDBOX_FIXTURE_PROVIDER_MISMATCH");
    expect(() => createSandboxReadAdapter("github", { account, resources: [{ ...resource, source: "PROVIDER_READBACK" }] })).toThrow("SANDBOX_FIXTURE_RESOURCE_MISMATCH");
    const googleAccount = externalAccountSchema.parse({ ...account, id: "google-account", provider: "google" });
    const wrongType = externalResourceSchema.parse({ ...resource, id: "google-repo", accountId: googleAccount.id, provider: "google" });
    expect(() => createSandboxReadAdapter("google", { account: googleAccount, resources: [wrongType] })).toThrow("SANDBOX_FIXTURE_RESOURCE_TYPE_MISMATCH");
  });

  it("does not let an earlier stale connection hide a second fully authorized connection", () => {
    const first = connectionSchema.parse({ id: "stale", owner: { kind: "PERSON", id: "person-1" }, provider: "github", status: "CONNECTED", externalAccountId: "account-1", authorizationGrantId: "expired", credentialReferenceId: "credential-1", createdAt: now });
    const second = connectionSchema.parse({ id: "usable", owner: { kind: "PERSON", id: "person-1" }, provider: "github", status: "CONNECTED", externalAccountId: "account-2", authorizationGrantId: "active", credentialReferenceId: "credential-2", createdAt: now });
    const definition = "github:repository.read";
    const result = registerCapabilities({
      connections: [first, second],
      grants: [
        { id: "expired", connectionId: first.id, grantedByPersonId: "person-1", scopes: ["*"], consentRecordId: "record-1", grantedAt: now, expiresAt: "2026-10-03T12:00:00.000Z" },
        { id: "active", connectionId: second.id, grantedByPersonId: "person-1", scopes: ["github:read_repository"], consentRecordId: "record-2", grantedAt: now },
      ],
      bindings: [{ id: "binding-2", connectionId: second.id, capabilityDefinitionId: definition, enabledAt: now }],
      credentialReferences: [
        { id: "credential-1", provider: "github", store: "OS_KEYCHAIN", locator: "cz/github/old", status: "AVAILABLE", createdAt: now },
        { id: "credential-2", provider: "github", store: "OS_KEYCHAIN", locator: "cz/github/current", status: "AVAILABLE", createdAt: now },
      ],
      liveAdapters: ["github"],
      now,
    }).find((item) => item.definition.id === definition)!;
    expect(result).toMatchObject({ availability: "AVAILABLE", connectionId: "usable", bindingId: "binding-2" });
  });

  it("does not advertise configured state as live while the provider adapter is absent", () => {
    const connection = connectionSchema.parse({ id: "connection-1", owner: { kind: "PERSON", id: "person-1" }, provider: "linear", status: "CONNECTED", externalAccountId: "account-1", authorizationGrantId: "grant-1", credentialReferenceId: "credential-1", createdAt: now });
    const capability = registerCapabilities({
      connections: [connection],
      grants: [{ id: "grant-1", connectionId: connection.id, grantedByPersonId: "person-1", scopes: ["*"], consentRecordId: "consent-1", grantedAt: now }],
      bindings: [{ id: "binding-1", connectionId: connection.id, capabilityDefinitionId: "linear:team.read", enabledAt: now }],
      credentialReferences: [{ id: "credential-1", provider: "linear", store: "OS_KEYCHAIN", locator: "cz/linear/person-1", status: "AVAILABLE", createdAt: now }],
      now,
    }).find((item) => item.definition.id === "linear:team.read")!;
    expect(capability.availability).toBe("CONFIGURED_BUT_UNAVAILABLE");
    expect(capability.reason).toContain("não há adapter live instalado");
  });

  it("requires read scope, credential, exact resource binding and CZ-side authority separation before a provider read", async () => {
    const connection = connectionSchema.parse({ id: "connection-1", owner: { kind: "PERSON", id: "person-1" }, provider: "github", status: "CONNECTED", externalAccountId: account.id, authorizationGrantId: "grant-1", credentialReferenceId: "credential-1", createdAt: now });
    const fixtureAdapter = createSandboxReadAdapter("github", { account, resources: [resource] });
    const state = parseConnectionFabricState({
      connections: [connection],
      authorizationGrants: [{ id: "grant-1", connectionId: connection.id, grantedByPersonId: "person-1", scopes: ["github:read_repository"], consentRecordId: "consent-1", grantedAt: now }],
      records: [{ id: "consent-1", kind: "OriginalRecord", purpose: "connection_authorization", authorId: "person-1" }],
      credentialReferences: [{ id: "credential-1", provider: "github", store: "OS_KEYCHAIN", locator: "cz/github/account-fixture", status: "AVAILABLE", createdAt: now }],
      externalAccounts: [account],
      externalResources: [resource],
      capabilityBindings: [{ id: "binding-1", connectionId: connection.id, capabilityDefinitionId: "github:repository.read", externalResourceId: resource.id, enabledAt: now }],
    });
    await expect(readBoundExternalResource({ state, connectionId: connection.id, capabilityId: "github:repository.read", resourceId: resource.id, adapter: fixtureAdapter, now })).resolves.toMatchObject({ status: "READ", mode: "SANDBOX", provenance: { source: "SANDBOX_FIXTURE", authorizationGrantId: "grant-1", bindingId: "binding-1" } });
    await expect(readBoundExternalResource({ state, connectionId: connection.id, capabilityId: "github:issue.create", resourceId: resource.id, adapter: fixtureAdapter, now })).resolves.toEqual({ status: "DENIED", reason: "CAPABILITY_NOT_READ_ONLY" });
    await expect(readBoundExternalResource({ state, connectionId: connection.id, capabilityId: "github:repository.read", resourceId: "other-resource", adapter: fixtureAdapter, now })).resolves.toEqual({ status: "DENIED", reason: "RESOURCE_BINDING_NOT_ACTIVE" });
    const wrongAdapter = createSandboxReadAdapter("linear", { account: { ...account, provider: "linear" }, resources: [] });
    await expect(readBoundExternalResource({ state, connectionId: connection.id, capabilityId: "github:repository.read", resourceId: resource.id, adapter: wrongAdapter, now })).resolves.toEqual({ status: "DENIED", reason: "ADAPTER_PROVIDER_MISMATCH" });
  });

  it("validates contract entries independently", () => {
    expect(capabilityDefinitionSchema.safeParse(providerCapabilityCatalog[0]).success).toBe(true);
    expect(connectionSchema.safeParse({ id: "connection", owner: { kind: "CELL", id: "cell-1" }, provider: "google", status: "PENDING_AUTHORIZATION", createdAt: now }).success).toBe(true);
  });

  it("reads pre-fabric stores as empty and rejects broken cross-references", () => {
    expect(parseConnectionFabricState(undefined)).toEqual({ connections: [], authorizationGrants: [], externalAccounts: [], externalResources: [], credentialReferences: [], capabilityBindings: [] });
    expect(() => parseConnectionFabricState({ authorizationGrants: [{ id: "grant", connectionId: "missing", grantedByPersonId: "person", scopes: [], consentRecordId: "record", grantedAt: now }] })).toThrow("GRANT_CONNECTION_REFERENCE_INVALID");
    const connection = { id: "connection", owner: { kind: "PERSON", id: "person" }, provider: "github", status: "PENDING_AUTHORIZATION", createdAt: now };
    expect(() => parseConnectionFabricState({ connections: [connection], authorizationGrants: [{ id: "grant", connectionId: "connection", grantedByPersonId: "person", scopes: ["*"], consentRecordId: "missing-consent", grantedAt: now }], records: [] })).toThrow("GRANT_CONSENT_RECORD_INVALID");
    expect(() => parseConnectionFabricState({ connections: [{ id: "duplicate", owner: { kind: "PERSON", id: "person-1" }, provider: "github", status: "PENDING_AUTHORIZATION", createdAt: now }, { id: "duplicate", owner: { kind: "PERSON", id: "person-1" }, provider: "linear", status: "PENDING_AUTHORIZATION", createdAt: now }] })).toThrow("CONNECTION_FABRIC_DUPLICATE_ID");
  });
});

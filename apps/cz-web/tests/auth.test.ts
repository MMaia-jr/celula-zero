// SPDX-License-Identifier: MPL-2.0
import { describe, expect, it } from "vitest";
import { isFounderCredential } from "../lib/founder-credential";
import { allowsLocalFixture } from "../lib/runtime-mode";

describe("founder bootstrap credential", () => {
  it("matches case-insensitively without making the email an institutional identity", () => {
    expect(isFounderCredential("founder@example.test", "Founder@example.test")).toBe(true);
  });
  it("rejects another address and missing configuration", () => {
    expect(isFounderCredential("other@example.test", "founder@example.test")).toBe(false);
    expect(isFounderCredential("founder@example.test", undefined)).toBe(false);
  });
});

describe("local fixture boundary", () => {
  it("is enabled only on an explicit local flag and loopback host", () => {
    expect(allowsLocalFixture("1", "127.0.0.1:3088")).toBe(true);
    expect(allowsLocalFixture("1", "habitat.vercel.app")).toBe(false);
    expect(allowsLocalFixture(undefined, "localhost:3088")).toBe(false);
  });
});

// SPDX-License-Identifier: MPL-2.0
import { PropertyGapError, type PropertyGap } from "@cz/platform-contract";
/** Candidate only. Never treats an upstream Account/Space as a CZ Person/Cell. */
export const hulyMapping = [
  {
    capability: "identity",
    classification: "MAP",
    primitive: "Account / authenticated client",
    reason: "Account-to-Person binding requires explicit verified linkage.",
  },
  {
    capability: "documents",
    classification: "PLUGIN",
    primitive: "Doc / findAll / createDoc",
    reason:
      "CZ classes, append-only semantics and permissions require registered models and integration tests.",
  },
  {
    capability: "realtime",
    classification: "MAP",
    primitive: "transactor WebSocket",
    reason:
      "Authenticated event scope and lifecycle not exercised in this tranche.",
  },
  {
    capability: "files",
    classification: "SERVICE",
    primitive: "blob storage",
    reason: "Authorized upload/download adapter not configured.",
  },
] as const;
export const hulyPropertyGaps: readonly PropertyGap[] = hulyMapping.map(
  (m) => ({ capability: m.capability, reason: m.reason }),
);
export function requireHulyCapability(capability: string): never {
  throw new PropertyGapError(
    capability,
    "Huly is a candidate, not a connected backend. No SDK, core patch or live service is installed.",
  );
}

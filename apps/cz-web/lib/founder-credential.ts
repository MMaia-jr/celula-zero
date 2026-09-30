// SPDX-License-Identifier: MPL-2.0
export function isFounderCredential(candidate: string | undefined, configured: string | undefined) {
  return !!candidate && !!configured && candidate.trim().toLowerCase() === configured.trim().toLowerCase();
}

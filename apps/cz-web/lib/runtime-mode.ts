// SPDX-License-Identifier: MPL-2.0
export function allowsLocalFixture(flag: string | undefined, host: string | null) {
  return flag === "1" && !!host && /^(127\.0\.0\.1|localhost):[0-9]+$/.test(host);
}

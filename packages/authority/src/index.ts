// SPDX-License-Identifier: MPL-2.0
import type { PersonId } from "@cz/identity";
import type { Membership } from "@cz/cells";
export type Permission = "cell.read" | "cell.update";
export interface Authority {
  id: string;
  roleId: string;
  cellId: string;
  permissions: readonly Permission[];
}
export interface Mandate {
  id: string;
  personId: PersonId;
  cellId: string;
  permissions: readonly Permission[];
  startsAt: string;
  expiresAt: string;
  revoked: boolean;
  decisionRecordId: string;
}
export interface Delegation {
  id: string;
  mandateId: string;
  grantorId: PersonId;
  granteeId: PersonId;
  permissions: readonly Permission[];
  expiresAt: string;
  revoked: boolean;
}
export function canAct(
  personId: PersonId,
  cellId: string,
  permission: Permission,
  memberships: readonly Membership[],
  authorities: readonly Authority[],
): boolean {
  return memberships.some(
    (m) =>
      m.personId === personId &&
      m.cellId === cellId &&
      m.status === "active" &&
      authorities.some(
        (a) =>
          a.roleId === m.roleId &&
          a.cellId === cellId &&
          a.permissions.includes(permission),
      ),
  );
}
export function canDelegate(m: Mandate, d: Delegation, now: string): boolean {
  const time = Date.parse(now),
    start = Date.parse(m.startsAt),
    end = Date.parse(m.expiresAt),
    de = Date.parse(d.expiresAt);
  return (
    [time, start, end, de].every(Number.isFinite) &&
    !m.revoked &&
    !d.revoked &&
    d.mandateId === m.id &&
    d.grantorId === m.personId &&
    d.granteeId !== m.personId &&
    time >= start &&
    time < end &&
    time < de &&
    de <= end &&
    d.permissions.length > 0 &&
    d.permissions.every((p) => m.permissions.includes(p))
  );
}

// SPDX-License-Identifier: MPL-2.0
import type { PersonId } from "@cz/identity";
export interface Cell {
  id: string;
  name: string;
  purpose: string;
  createdAt: string;
}
export interface Relation {
  id: string;
  personId: PersonId;
  cellId: string;
  kind: "founder" | "steward";
  sourceRecordId: string;
}
export interface Membership {
  id: string;
  personId: PersonId;
  cellId: string;
  roleId: string;
  status: "active" | "revoked";
}
export interface Role {
  id: string;
  cellId: string;
  name: string;
}

// SPDX-License-Identifier: MPL-2.0
import type { FoundationState } from "./foundation";

export interface FoundationStore {
  read(): FoundationState;
  transact<R>(change: (state: FoundationState) => { state: FoundationState; result: R }): R;
}

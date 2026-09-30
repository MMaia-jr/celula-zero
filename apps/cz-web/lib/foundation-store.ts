// SPDX-License-Identifier: MPL-2.0
import type { Foundation } from "./foundation";

export interface FoundationStore {
  read(): Foundation;
  transact<R>(change: (state: Foundation) => { state: Foundation; result: R }): R;
}

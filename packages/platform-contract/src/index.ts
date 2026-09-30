// SPDX-License-Identifier: MPL-2.0
export interface Session {
  subject: string;
  provider: string;
  expiresAt: string;
}
export interface IdentitySubstrate {
  resolve(token: string): Promise<Session | null>;
}
export interface Storage<T> {
  read(): T;
  transact<R>(change: (state: T) => { state: T; result: R }): R;
}
export interface Realtime {
  subscribe(
    scope: string,
    receive: (event: { id: string; type: string }) => void,
  ): () => void;
}
export interface Documents {
  read(
    id: string,
  ): Promise<{ id: string; content: string; version: string } | null>;
  write(id: string, content: string, expectedVersion: string): Promise<string>;
}
export interface Collaboration {
  open(documentId: string): Promise<{ endpoint: string; expiresAt: string }>;
}
export interface Files {
  put(name: string, bytes: Uint8Array): Promise<{ id: string }>;
  get(id: string): Promise<Uint8Array>;
}
export interface Activity {
  append(event: {
    id: string;
    actorId: string;
    type: string;
    at: string;
  }): Promise<void>;
}
export interface Search {
  query(
    text: string,
    scope: string,
  ): Promise<Array<{ id: string; title: string }>>;
}
export interface Notifications {
  send(recipientId: string, message: string): Promise<void>;
}
export interface BackgroundJobs {
  enqueue(
    type: string,
    input: unknown,
    idempotencyKey: string,
  ): Promise<string>;
}
export interface PropertyGap {
  capability: string;
  reason: string;
}
export class PropertyGapError extends Error {
  constructor(
    readonly capability: string,
    reason: string,
  ) {
    super(`PROPERTY_GAP: ${capability}: ${reason}`);
    this.name = "PropertyGapError";
  }
}
export interface PlatformContract<T> {
  name: string;
  storage: Storage<T>;
  identity?: IdentitySubstrate;
  realtime?: Realtime;
  documents?: Documents;
  collaboration?: Collaboration;
  files?: Files;
  activity?: Activity;
  search?: Search;
  notifications?: Notifications;
  jobs?: BackgroundJobs;
  gaps: readonly PropertyGap[];
}

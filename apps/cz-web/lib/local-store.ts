// SPDX-License-Identifier: MPL-2.0
import { DatabaseSync, backup } from "node:sqlite";
import { mkdirSync, chmodSync } from "node:fs";
import { dirname } from "node:path";
import { createHash, randomBytes } from "node:crypto";
import { emptyFoundation, type FoundationState } from "./foundation";
import type { FoundationStore } from "./foundation-store";
export class LocalStore implements FoundationStore {
  readonly db: DatabaseSync;
  constructor(path: string) {
    if (path !== ":memory:")
      mkdirSync(dirname(path), { recursive: true, mode: 0o700 });
    this.db = new DatabaseSync(path);
    if (path !== ":memory:") chmodSync(path, 0o600);
    this.db.exec(
      "PRAGMA busy_timeout=5000; PRAGMA journal_mode=DELETE; CREATE TABLE IF NOT EXISTS state (id INTEGER PRIMARY KEY CHECK(id=1), body TEXT NOT NULL); CREATE TABLE IF NOT EXISTS sessions (hash TEXT PRIMARY KEY, expires INTEGER NOT NULL, provider TEXT, subject TEXT);",
    );
    const sessionColumns = this.db.prepare("PRAGMA table_info(sessions)").all() as Array<{ name: string }>;
    if (!sessionColumns.some(({ name }) => name === "provider")) this.db.exec("ALTER TABLE sessions ADD COLUMN provider TEXT");
    if (!sessionColumns.some(({ name }) => name === "subject")) this.db.exec("ALTER TABLE sessions ADD COLUMN subject TEXT");
    this.db
      .prepare("INSERT OR IGNORE INTO state(id,body) VALUES(1,?)")
      .run(JSON.stringify(emptyFoundation()));
  }
  read(): FoundationState {
    const row = this.db.prepare("SELECT body FROM state WHERE id=1").get() as {
      body: string;
    };
    const state = JSON.parse(row.body) as FoundationState;
    if (state.schema !== "cz.foundation.v1")
      throw new Error("UNSUPPORTED_STATE_VERSION");
    return state;
  }
  transact<R>(
    change: (state: FoundationState) => { state: FoundationState; result: R },
  ): R {
    this.db.exec("BEGIN IMMEDIATE");
    try {
      const { state, result } = change(this.read());
      this.db
        .prepare("UPDATE state SET body=? WHERE id=1")
        .run(JSON.stringify(state));
      this.db.exec("COMMIT");
      return result;
    } catch (error) {
      this.db.exec("ROLLBACK");
      throw error;
    }
  }
  createSession(provider: string, subject: string): string {
    const token = randomBytes(32).toString("hex");
    this.db.prepare("DELETE FROM sessions WHERE expires<=?").run(Date.now());
    this.db
      .prepare("INSERT INTO sessions(hash,expires,provider,subject) VALUES(?,?,?,?)")
      .run(this.hash(token), Date.now() + 8 * 60 * 60 * 1000, provider, subject);
    return token;
  }
  sessionIdentity(token: string | undefined): { provider: string; subject: string } | null {
    if (!token) return null;
    const row = this.db.prepare("SELECT provider,subject FROM sessions WHERE hash=? AND expires>?")
      .get(this.hash(token), Date.now()) as { provider: string | null; subject: string | null } | undefined;
    return row?.provider && row.subject ? { provider: row.provider, subject: row.subject } : null;
  }
  revoke(token: string): void {
    this.db.prepare("DELETE FROM sessions WHERE hash=?").run(this.hash(token));
  }
  async backupTo(path: string): Promise<void> {
    if (path === ":memory:") throw new Error("BACKUP_DESTINATION_INVALID");
    mkdirSync(dirname(path), { recursive: true, mode: 0o700 });
    await backup(this.db, path);
    chmodSync(path, 0o600);
  }
  private hash(token: string): string {
    return createHash("sha256").update(token).digest("hex");
  }
  close(): void {
    this.db.close();
  }
}

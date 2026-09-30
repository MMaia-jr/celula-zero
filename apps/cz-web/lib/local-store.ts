// SPDX-License-Identifier: MPL-2.0
import { DatabaseSync } from "node:sqlite";
import { mkdirSync, chmodSync } from "node:fs";
import { dirname } from "node:path";
import { createHash, randomBytes, randomUUID } from "node:crypto";
import type { Storage } from "@cz/platform-contract";
import { seedFoundation, type Foundation } from "./foundation";
export class LocalStore implements Storage<Foundation> {
  readonly db: DatabaseSync;
  constructor(path: string) {
    if (path !== ":memory:")
      mkdirSync(dirname(path), { recursive: true, mode: 0o700 });
    this.db = new DatabaseSync(path);
    if (path !== ":memory:") chmodSync(path, 0o600);
    this.db.exec(
      "PRAGMA busy_timeout=5000; PRAGMA journal_mode=DELETE; CREATE TABLE IF NOT EXISTS state (id INTEGER PRIMARY KEY CHECK(id=1), body TEXT NOT NULL); CREATE TABLE IF NOT EXISTS sessions (hash TEXT PRIMARY KEY, expires INTEGER NOT NULL);",
    );
    this.db
      .prepare("INSERT OR IGNORE INTO state(id,body) VALUES(1,?)")
      .run(
        JSON.stringify(seedFoundation(randomUUID, new Date().toISOString())),
      );
  }
  read(): Foundation {
    const row = this.db.prepare("SELECT body FROM state WHERE id=1").get() as {
      body: string;
    };
    const state = JSON.parse(row.body) as Foundation;
    if (state.schema !== "cz.foundation.v1")
      throw new Error("UNSUPPORTED_STATE_VERSION");
    return state;
  }
  transact<R>(
    change: (state: Foundation) => { state: Foundation; result: R },
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
  createSession(): string {
    const token = randomBytes(32).toString("hex");
    this.db.prepare("DELETE FROM sessions WHERE expires<=?").run(Date.now());
    this.db
      .prepare("INSERT INTO sessions(hash,expires) VALUES(?,?)")
      .run(this.hash(token), Date.now() + 8 * 60 * 60 * 1000);
    return token;
  }
  session(token: string | undefined): boolean {
    return (
      !!token &&
      !!this.db
        .prepare("SELECT hash FROM sessions WHERE hash=? AND expires>?")
        .get(this.hash(token), Date.now())
    );
  }
  revoke(token: string): void {
    this.db.prepare("DELETE FROM sessions WHERE hash=?").run(this.hash(token));
  }
  private hash(token: string): string {
    return createHash("sha256").update(token).digest("hex");
  }
  close(): void {
    this.db.close();
  }
}

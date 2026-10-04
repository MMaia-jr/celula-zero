// SPDX-License-Identifier: MPL-2.0
import { DatabaseSync } from "node:sqlite";
import { mkdtempSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { afterEach, describe, expect, it } from "vitest";
import { emptyFoundation } from "../lib/foundation";
import { LocalStore, localStoreSchemaVersion } from "../lib/local-store";

const directories: string[] = [];
afterEach(() => {
  for (const directory of directories.splice(0)) rmSync(directory, { recursive: true, force: true });
});

describe("versioned local Foundation migrations", () => {
  it("upgrades a legacy SQLite store transactionally without changing institutional state or existing sessions", () => {
    const directory = mkdtempSync(join(tmpdir(), "cz-local-migration-"));
    directories.push(directory);
    const path = join(directory, "legacy.sqlite");
    const legacy = new DatabaseSync(path);
    const body = JSON.stringify(emptyFoundation());
    legacy.exec("CREATE TABLE state (id INTEGER PRIMARY KEY CHECK(id=1), body TEXT NOT NULL); CREATE TABLE sessions (hash TEXT PRIMARY KEY, expires INTEGER NOT NULL)");
    legacy.prepare("INSERT INTO state(id,body) VALUES(1,?)").run(body);
    legacy.prepare("INSERT INTO sessions(hash,expires) VALUES(?,?)").run("preexisting-session-hash", Date.now() + 60_000);
    legacy.close();

    const store = new LocalStore(path);
    try {
      expect(store.read()).toEqual(emptyFoundation());
      expect(store.db.prepare("SELECT body FROM state WHERE id=1").get()).toEqual({ body });
      expect(store.db.prepare("SELECT hash FROM sessions WHERE hash='preexisting-session-hash'").get()).toEqual({ hash: "preexisting-session-hash" });
      expect((store.db.prepare("SELECT version,name FROM schema_migrations ORDER BY version").all())).toEqual([
        { version: 1, name: "local_state_and_sessions" },
        { version: 2, name: "session_identity_subject" },
      ]);
      expect(store.db.prepare("PRAGMA table_info(sessions)").all().map((column) => (column as { name: string }).name)).toEqual(["hash", "expires", "provider", "subject"]);
      expect(localStoreSchemaVersion).toBe(2);
      const token = store.createSession("huly", "stable-subject");
      expect(store.sessionIdentity(token)).toEqual({ provider: "huly", subject: "stable-subject" });
    } finally {
      store.close();
    }
  });

  it("does not rewrite stores whose migration ledger already matches the current version", () => {
    const directory = mkdtempSync(join(tmpdir(), "cz-local-migration-repeat-"));
    directories.push(directory);
    const path = join(directory, "foundation.sqlite");
    const first = new LocalStore(path);
    const before = first.read();
    first.close();
    const second = new LocalStore(path);
    try {
      expect(second.read()).toEqual(before);
      expect(second.db.prepare("SELECT count(*) AS count FROM schema_migrations").get()).toEqual({ count: localStoreSchemaVersion });
    } finally {
      second.close();
    }
  });
});

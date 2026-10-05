// SPDX-License-Identifier: MPL-2.0
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, chmodSync, statSync } from "node:fs";
import { resolve } from "node:path";

/** Values are exchanged with the macOS Keychain through stdin/stdout only.
 * Arguments contain the fixed service and opaque account locator, never secrets.
 */
let compiledVault: string | undefined;
function vaultExecutable() {
  if (compiledVault) return compiledVault;
  if (process.platform !== "darwin") throw new Error("SECURE_KEYCHAIN_UNAVAILABLE");
  const source = resolve(process.cwd(), "tools/keychain-vault.swift");
  const output = resolve(process.cwd(), ".data/keychain-vault");
  if (!existsSync(source)) throw new Error("SECURE_KEYCHAIN_HELPER_MISSING");
  mkdirSync(resolve(process.cwd(), ".data"), { recursive: true, mode: 0o700 });
  if (!existsSync(output) || statSync(source).mtimeMs > statSync(output).mtimeMs) {
    try {
      execFileSync("/usr/bin/swiftc", [source, "-o", output], {
        encoding: "utf8", timeout: 60_000, maxBuffer: 64 * 1024,
        env: { PATH: process.env.PATH ?? "/usr/bin:/bin:/usr/sbin:/sbin", HOME: process.env.HOME ?? "", NODE_ENV: process.env.NODE_ENV ?? "development" },
      });
      chmodSync(output, 0o700);
    } catch {
      throw new Error("SECURE_KEYCHAIN_HELPER_BUILD_FAILED");
    }
  }
  compiledVault = output;
  return output;
}

export interface SecretStore {
  get(account: string): Promise<string | null>;
  set(account: string, value: string): Promise<void>;
  delete(account: string): Promise<void>;
}

export class MacOSKeychainSecretStore implements SecretStore {
  constructor(private readonly service = "Célula Zero Genesis Alpha Connected World") {}

  private run(operation: "get" | "set" | "delete", account: string, value?: string): string | null {
    if (process.platform !== "darwin") throw new Error("SECURE_KEYCHAIN_UNAVAILABLE");
    if (!/^[a-z0-9][a-z0-9:._/-]{1,180}$/i.test(account)) throw new Error("CREDENTIAL_LOCATOR_INVALID");
    try {
      const output = execFileSync(vaultExecutable(), [operation, this.service, account], {
        encoding: "utf8", timeout: 15_000, maxBuffer: 128 * 1024,
        input: value === undefined ? "{}" : JSON.stringify({ value }),
        env: { PATH: process.env.PATH ?? "/usr/bin:/bin:/usr/sbin:/sbin", HOME: process.env.HOME ?? "", NODE_ENV: process.env.NODE_ENV ?? "development" },
      }).trim();
      if (operation === "get") return Buffer.from(output, "base64").toString("utf8");
      return null;
    } catch (error) {
      const code = (error as NodeJS.ErrnoException & { status?: number }).status;
      if (operation === "get" && code === 3) return null;
      // Suppress subprocess output: it can contain provider values or Keychain diagnostics.
      throw new Error("SECURE_KEYCHAIN_OPERATION_FAILED");
    }
  }

  async get(account: string) { return this.run("get", account); }
  async set(account: string, value: string) { this.run("set", account, value); }
  async delete(account: string) { this.run("delete", account); }
}

export class MemorySecretStore implements SecretStore {
  readonly values = new Map<string, string>();
  async get(account: string) { return this.values.get(account) ?? null; }
  async set(account: string, value: string) { this.values.set(account, value); }
  async delete(account: string) { this.values.delete(account); }
}

export function providerCredentialAccount(provider: "github" | "linear" | "google", connectionId: string, field: "access-token" | "refresh-token" | "installation-id") {
  return `${provider}:${connectionId}:${field}`;
}

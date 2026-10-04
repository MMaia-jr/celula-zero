// SPDX-License-Identifier: MPL-2.0
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { z } from "zod";

export const activeDirectionSchema = z.object({
  status: z.literal("CURRENT_HUMAN_DIRECTION_LOCAL_NOT_CANONICAL"),
  receivedAt: z.string().min(10).max(40),
  source: z.string().trim().min(1).max(240),
  campaign: z.string().trim().min(1).max(160),
  implementationProgress: z.array(z.string().trim().min(1).max(240)).max(6),
  currentPriority: z.array(z.string().trim().min(1).max(240)).min(1).max(8),
  oldOpenWorkBoundary: z.string().trim().min(1).max(300),
  canonicalBoundary: z.string().trim().min(1).max(300),
  constraints: z.array(z.string().trim().min(1).max(200)).max(8),
}).strict();

export type ActiveDirectionProjection = z.infer<typeof activeDirectionSchema>;

/** Reads an operator-maintained, local-only projection. It is never promoted to a CZ record or Git state. */
export function readActiveDirection(path = resolve(process.cwd(), ".data/current-human-direction.json")): ActiveDirectionProjection | null {
  try {
    const raw = readFileSync(path, "utf8");
    if (Buffer.byteLength(raw) > 8_000) return null;
    return activeDirectionSchema.parse(JSON.parse(raw));
  } catch {
    return null;
  }
}

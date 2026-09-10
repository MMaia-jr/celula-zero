import { describe, expect, it } from "vitest";
import {
  PARTICIPANT_CONTEXT_NOTICE,
  PARTICIPATION_NOTICE,
  tokenFromFragment,
} from "@/lib/domain/participation";

describe("participation bearer boundary", () => {
  it("reads exactly 256-bit hex tokens from URL fragments", () => {
    const token = "a".repeat(64);
    expect(tokenFromFragment(`#token=${token}`)).toBe(token);
    expect(tokenFromFragment("#token=short")).toBeNull();
  });

  it("states that acceptance grants no implicit authority", () => {
    expect(PARTICIPATION_NOTICE).toContain("role");
    expect(PARTICIPATION_NOTICE).toContain("delegation");
    expect(PARTICIPATION_NOTICE).toContain("membership");
  });

  it("keeps bounded read access distinct from membership and authority", () => {
    expect(PARTICIPANT_CONTEXT_NOTICE).toContain("read access");
    expect(PARTICIPANT_CONTEXT_NOTICE).toContain("membership");
    expect(PARTICIPANT_CONTEXT_NOTICE).toContain("role");
    expect(PARTICIPANT_CONTEXT_NOTICE).toContain("delegation");
    expect(PARTICIPANT_CONTEXT_NOTICE).toContain("authority");
  });
});

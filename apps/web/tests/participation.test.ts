import { describe,expect,it } from "vitest";
import { PARTICIPATION_NOTICE,tokenFromFragment } from "@/lib/domain/participation";
describe("participation bearer boundary",()=>{
 it("reads exactly 256-bit hex tokens from URL fragments",()=>{const token="a".repeat(64);expect(tokenFromFragment(`#token=${token}`)).toBe(token);expect(tokenFromFragment("#token=short")).toBeNull();});
 it("states that acceptance grants no implicit authority",()=>{expect(PARTICIPATION_NOTICE).toContain("role");expect(PARTICIPATION_NOTICE).toContain("delegation");expect(PARTICIPATION_NOTICE).toContain("membership");});
});

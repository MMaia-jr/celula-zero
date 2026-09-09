import { describe,expect,it } from "vitest";
import { isPublicAddressReference,WEB3_BOUNDARY } from "@/lib/domain/web3";
describe("wallet and treasury boundaries",()=>{
 it("grants no ambient rights",()=>expect(Object.values(WEB3_BOUNDARY).every((value)=>value===false)).toBe(true));
 it("accepts bounded public references and rejects whitespace",()=>{expect(isPublicAddressReference("0x1234")).toBe(true);expect(isPublicAddressReference("secret words")).toBe(false);});
});

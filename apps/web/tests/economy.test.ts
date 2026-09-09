import { describe,expect,it } from "vitest";
import { claimDecisionAuthorizesInstruction,ECONOMIC_RECORD_ORDER } from "@/lib/domain/economy";
describe("economic semantic boundary",()=>{
 it("preserves five distinct record kinds",()=>expect(new Set(ECONOMIC_RECORD_ORDER).size).toBe(5));
 it("requires an unblocked Human ACCEPT_FOR_CONTEXT",()=>{expect(claimDecisionAuthorizesInstruction("ACCEPT_FOR_CONTEXT","PERSON")).toBe(true);expect(claimDecisionAuthorizesInstruction("REJECT_FOR_CONTEXT","PERSON")).toBe(false);expect(claimDecisionAuthorizesInstruction("DEFER","PERSON")).toBe(false);expect(claimDecisionAuthorizesInstruction("ACCEPT_FOR_CONTEXT","AI_AGENT")).toBe(false);expect(claimDecisionAuthorizesInstruction("ACCEPT_FOR_CONTEXT","PERSON",true)).toBe(false);});
});

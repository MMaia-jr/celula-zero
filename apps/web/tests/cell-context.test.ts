import { describe,expect,it } from "vitest";
import { describeBuildReference } from "@/lib/domain/cell-context";

describe("Cell context currentness",()=>{
 it("never silently verifies a reported build ref",()=>expect(describeBuildReference("abc123")).toEqual({value:"abc123",status:"REPORTED_UNVERIFIED",notice:"Reported by this build; not verified against canonical Git state."}));
 it("labels absent currentness honestly",()=>expect(describeBuildReference(null).status).toBe("NOT_REPORTED"));
});

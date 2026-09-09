import { describe,expect,it } from "vitest";
import { containsForbiddenExportKey,toPortableCell } from "@/lib/domain/export-cell";
import type { CellOperatingContext } from "@/lib/domain/cell-context";

const context: CellOperatingContext={cell:{id:"c",slug:"cell",name:"Cell",createdAt:"now"},policy:null,buildReference:{value:null,status:"NOT_REPORTED",notice:"unknown"},projects:[],dragonCycles:[],companyCore:[],participation:{active:0,left:0,invitations:0},economy:{instructions:0,attempts:0,receipts:0,reconciliations:0},web3:{walletBindings:0,treasuryReferences:0,custodyGranted:false,authorityGranted:false},decisions:[],outcomes:[]};
describe("cz.cell.v1",()=>{
 it("labels snapshot and authority boundaries",()=>{const value=toPortableCell(context,"2026-09-09T00:00:00Z");expect(value.schemaVersion).toBe("cz.cell.v1");expect(value.snapshot).toBe(true);expect(value.authority).toBe(false);});
 it("fails closed on nested bearer or private material",()=>{expect(containsForbiddenExportKey({nested:{bearer_token:"x"}})).toBe(true);expect(containsForbiddenExportKey({private_key:"x"})).toBe(true);expect(containsForbiddenExportKey({privateKey:"x"})).toBe(true);expect(containsForbiddenExportKey({seedPhrase:"x"})).toBe(true);expect(()=>toPortableCell({...context,cell:{...context.cell,token:"x"}} as unknown as CellOperatingContext)).toThrow("CZ_EXPORT_PRIVATE_MATERIAL_FORBIDDEN");});
});

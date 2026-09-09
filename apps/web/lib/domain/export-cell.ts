import type { CellOperatingContext } from "@/lib/domain/cell-context";

const FORBIDDEN_KEYS = /(^|_)(token|secret|private_key|mnemonic|seed(?:_phrase)?|signature|message|proof|credential)s?$/i;

function normalizeExportKey(key: string): string {
  return key.replace(/([a-z0-9])([A-Z])/g, "$1_$2");
}

export const CELL_EXPORT_NOTICES = [
  "Export is not authority and grants no role, delegation, membership, reputation, or economic right.",
  "This is an RLS-visible snapshot, not current canonical state.",
  "Build references are reported metadata and are not silently verified.",
];

export function containsForbiddenExportKey(value: unknown): boolean {
  if (Array.isArray(value)) return value.some(containsForbiddenExportKey);
  if (!value || typeof value !== "object") return false;
  return Object.entries(value as Record<string, unknown>).some(
    ([key, child]) => FORBIDDEN_KEYS.test(normalizeExportKey(key)) || containsForbiddenExportKey(child),
  );
}

export function toPortableCell(context: CellOperatingContext, exportedAt = new Date().toISOString()) {
  if (containsForbiddenExportKey(context)) throw new Error("CZ_EXPORT_PRIVATE_MATERIAL_FORBIDDEN");
  return { schemaVersion: "cz.cell.v1", exportedAt, snapshot: true, authority: false, context, notices: CELL_EXPORT_NOTICES };
}

export const ECONOMIC_RECORD_ORDER = [
  "AGREEMENT", "ECONOMIC_INSTRUCTION", "SETTLEMENT_ATTEMPT", "SETTLEMENT_RECEIPT", "RECONCILIATION",
] as const;

export function claimDecisionAuthorizesInstruction(
  disposition: string | null,
  decidingActorKind: string | null,
  laterBlockingDisposition = false,
) {
  return disposition === "ACCEPT_FOR_CONTEXT" && decidingActorKind === "PERSON" && !laterBlockingDisposition;
}

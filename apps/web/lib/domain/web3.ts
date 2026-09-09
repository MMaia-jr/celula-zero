export const WEB3_BOUNDARY = {
  actorIsWallet: false,
  bindingGrantsRole: false,
  bindingGrantsDelegation: false,
  bindingGrantsReputation: false,
  bindingGrantsEconomicRight: false,
  treasuryReferenceGrantsCustody: false,
  treasuryReferenceGrantsSigningAuthority: false,
} as const;

export function isPublicAddressReference(value: string) {
  const candidate = value.trim();
  return candidate.length >= 3 && candidate.length <= 200 && !/\s/.test(candidate);
}

-- K002 / T12 / D029 — Evidence audience preservation in derived relation.
--
-- Execution-confirmed canonical path before this migration:
-- Claim author could not directly READ a PRIVATE Evidence item or its
-- evidence_link, but could READ a Verification and therefore the
-- verification_evidence_items row revealing the Evidence identifier.
--
-- Smallest correction:
-- relation READ requires both referenced Verification and Evidence to be
-- directly readable under their existing RLS.
--
-- The integrated metabolism getter already failed closed on the tested
-- external-participant path and is intentionally unchanged here.

drop policy if exists verification_evidence_items_read
on public.verification_evidence_items;

create policy verification_evidence_items_read
on public.verification_evidence_items
for select
to authenticated
using (
  exists (
    select 1
    from public.verifications v
    where v.id = verification_evidence_items.verification_id
  )
  and exists (
    select 1
    from public.evidence_items e
    where e.id = verification_evidence_items.evidence_item_id
  )
);

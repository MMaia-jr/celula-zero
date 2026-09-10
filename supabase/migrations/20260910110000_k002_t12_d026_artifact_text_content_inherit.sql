-- K002 / T12 / D026 — artifact text content inherits parent Artifact read access.
--
-- Property loss confirmed by local execution:
-- parent Artifact PARTIES/PROJECT was readable by the exact Commitment
-- counterparty while artifact_text_contents remained denied.
--
-- The content row has no independent social visibility semantics. Read access
-- therefore composes the already-canonical Artifact RLS instead of duplicating
-- PRIVATE/PARTIES/PROJECT logic here.
--
-- No helper, ACL, membership model, ontology, write path, retention/deletion,
-- sensitivity, publication or application behavior is introduced.

drop policy if exists artifact_text_contents_read
on public.artifact_text_contents;

create policy artifact_text_contents_read
on public.artifact_text_contents
for select
to authenticated
using (
  exists (
    select 1
    from public.artifacts a
    where a.id = artifact_text_contents.artifact_id
  )
);

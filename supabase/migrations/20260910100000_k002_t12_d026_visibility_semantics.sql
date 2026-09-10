-- K002 / T12 / D026 — minimal first-slice visibility enforcement.
--
-- Scope:
--   Contribution + Artifact read RLS only.
--
-- Adopted D026 semantics:
--   PRIVATE = originator/controller only
--   PARTIES = exact parties of the governing Commitment
--   PROJECT = originator + exact Commitment parties + legitimate Project steward
--   third-party disclosure remains explicit/contextual/material-bound
--
-- This migration does not change write paths, sensitivity, retention,
-- deletion, publication, membership, authority, UI, or any remote state.

create or replace function private.b2a_profile_is_commitment_party(
  p_commitment_id uuid,
  p_project_id uuid,
  p_cell_id uuid,
  p_profile_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = public, private, pg_temp
as $$
  select p_profile_id is not null
    and exists (
      select 1
      from public.commitments cm
      where cm.id = p_commitment_id
        and cm.project_id = p_project_id
        and cm.cell_id = p_cell_id
        and (
          private.b1_profile_controls_actor(cm.proposer_actor_id, p_profile_id)
          or private.b1_profile_controls_actor(cm.accepted_by_actor_id, p_profile_id)
        )
    );
$$;

create or replace function private.b2a_profile_is_contribution_commitment_party(
  p_contribution_id uuid,
  p_project_id uuid,
  p_cell_id uuid,
  p_profile_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = public, private, pg_temp
as $$
  select p_profile_id is not null
    and exists (
      select 1
      from public.contributions c
      join public.commitments cm
        on cm.id = c.commitment_id
      where c.id = p_contribution_id
        and c.project_id = p_project_id
        and c.cell_id = p_cell_id
        and cm.project_id = p_project_id
        and cm.cell_id = p_cell_id
        and (
          private.b1_profile_controls_actor(cm.proposer_actor_id, p_profile_id)
          or private.b1_profile_controls_actor(cm.accepted_by_actor_id, p_profile_id)
        )
    );
$$;

revoke all on function private.b2a_profile_is_commitment_party(uuid, uuid, uuid, uuid)
  from public, anon, authenticated;
revoke all on function private.b2a_profile_is_contribution_commitment_party(uuid, uuid, uuid, uuid)
  from public, anon, authenticated;

grant execute on function private.b2a_profile_is_commitment_party(uuid, uuid, uuid, uuid)
  to authenticated;
grant execute on function private.b2a_profile_is_contribution_commitment_party(uuid, uuid, uuid, uuid)
  to authenticated;

drop policy if exists contributions_read on public.contributions;
create policy contributions_read on public.contributions
for select to authenticated using (
  private.b1_current_profile_controls_actor(author_actor_id)
  or (
    visibility in ('PARTIES', 'PROJECT')
    and private.b2a_profile_is_commitment_party(
      commitment_id,
      project_id,
      cell_id,
      auth.uid()
    )
  )
  or (
    visibility = 'PROJECT'
    and private.can_manage_project(project_id, auth.uid())
  )
);

drop policy if exists artifacts_read on public.artifacts;
create policy artifacts_read on public.artifacts
for select to authenticated using (
  private.b1_current_profile_controls_actor(created_by_actor_id)
  or (
    visibility in ('PARTIES', 'PROJECT')
    and private.b2a_profile_is_contribution_commitment_party(
      contribution_id,
      project_id,
      cell_id,
      auth.uid()
    )
  )
  or (
    visibility = 'PROJECT'
    and private.can_manage_project(project_id, auth.uid())
  )
);

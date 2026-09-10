-- K002 Wave3 Phase2
-- A CellParticipation is not membership, role, delegation, or authority.
-- This RPC gives the controlled PERSON actor only the narrow context required
-- to understand and exit their own ACTIVE participation.
--
-- It deliberately does NOT widen private.b1_profile_has_cell_access() or any
-- broad Cell RLS policy.

create or replace function public.k002_get_participant_cell_context(
  p_actor_id uuid,
  p_participation_id uuid
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public, private, pg_temp
as $$
declare
  v_actor public.actors%rowtype;
  v_participation public.cell_participations%rowtype;
  v_cell public.cells%rowtype;
  v_policy_id uuid;
  v_policy_version integer;
  v_policy_state text;
  v_invitation_purpose text;
  v_projects jsonb;
begin
  if not private.b1_profile_controls_actor(p_actor_id, auth.uid()) then
    raise exception using
      errcode = '42501',
      message = 'CZ403:ACTOR_CONTROL_REQUIRED';
  end if;

  select *
  into v_actor
  from public.actors
  where id = p_actor_id;

  if not found or v_actor.kind <> 'PERSON' then
    raise exception using
      errcode = '42501',
      message = 'CZ403:PERSON_ACTOR_REQUIRED';
  end if;

  select *
  into v_participation
  from public.cell_participations
  where id = p_participation_id
    and actor_id = p_actor_id
    and status = 'ACTIVE';

  if not found then
    raise exception using
      errcode = '42501',
      message = 'CZ403:ACTIVE_PARTICIPATION_REQUIRED';
  end if;

  select *
  into v_cell
  from public.cells
  where id = v_participation.cell_id;

  if not found then
    raise exception using
      errcode = 'P0001',
      message = 'CZ404:CELL_NOT_FOUND';
  end if;

  select pv.id, pv.version, pv.state
  into v_policy_id, v_policy_version, v_policy_state
  from public.policy_versions pv
  where pv.id = v_cell.current_policy_version_id
    and pv.cell_id = v_cell.id;

  select i.purpose
  into v_invitation_purpose
  from public.cell_consents c
  join public.cell_invitations i on i.id = c.invitation_id
  where c.id = v_participation.consent_id
    and c.actor_id = p_actor_id
    and c.cell_id = v_cell.id;

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'id', p.id,
        'slug', p.slug,
        'title', p.title,
        'stage', p.stage,
        'visibility', p.visibility
      )
      order by p.created_at, p.id
    ),
    '[]'::jsonb
  )
  into v_projects
  from public.projects p
  where p.cell_id = v_cell.id
    and p.visibility = 'PUBLIC'
    and p.published_at is not null
    and p.archived_at is null;

  return jsonb_build_object(
    'schema', 'cz.participant-cell-context.v1',
    'cell', jsonb_build_object(
      'id', v_cell.id,
      'slug', v_cell.slug,
      'name', v_cell.name
    ),
    'policy', jsonb_build_object(
      'id', v_policy_id,
      'version', v_policy_version,
      'state', v_policy_state
    ),
    'participation', jsonb_build_object(
      'id', v_participation.id,
      'status', v_participation.status,
      'joined_at', v_participation.joined_at,
      'material_version', v_participation.material_version
    ),
    'invitation', jsonb_build_object(
      'purpose', v_invitation_purpose
    ),
    'projects', v_projects,
    'permissions', jsonb_build_object(
      'read_bounded_context', true,
      'leave_own_participation', true
    ),
    'boundaries', jsonb_build_object(
      'participation_grants_membership', false,
      'participation_grants_role', false,
      'participation_grants_delegation', false,
      'participation_grants_authority', false,
      'read_access_grants_authority', false
    ),
    'notice',
      'Bounded participant read access only. Participation is not membership, role, delegation, administration, or economic authority.'
  );
end;
$$;

revoke all on function public.k002_get_participant_cell_context(uuid, uuid) from public;
grant execute on function public.k002_get_participant_cell_context(uuid, uuid) to authenticated;

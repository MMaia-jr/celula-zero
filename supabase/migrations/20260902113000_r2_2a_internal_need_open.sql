-- R2-2A — INTERNAL NEED OPENING
--
-- Concrete property:
-- operational openness for project coordination != public disclosure.
--
-- Additive only:
--   DRAFT / PROJECT -> OPEN / PROJECT
--
-- Preserve:
-- Need != Opportunity
-- OPEN != PUBLIC
-- internal opening != publication
-- version history remains immutable
-- authority/idempotency/stale-version boundaries remain authoritative

insert into public.capability_definitions(code, description) values
  ('need.open', 'Open a project-scoped Need for internal coordination without publishing it.')
on conflict (code) do nothing;

insert into public.role_capabilities(role_id, capability_code) values
  ('00000000-0000-4000-8000-00000000c202', 'need.open')
on conflict do nothing;

create or replace function public.t1_open_need(
  p_actor_id uuid,
  p_need_id uuid,
  p_expected_material_version integer,
  p_command_id uuid,
  p_idempotency_key text
)
returns jsonb
language plpgsql
security definer
set search_path = public, private, pg_temp
as $$
declare
  v_need public.needs%rowtype;
  v_version public.need_versions%rowtype;
  v_replayed boolean;
  v_result jsonb;
  v_payload jsonb := jsonb_build_object(
    'need_id', p_need_id,
    'expected_material_version', p_expected_material_version
  );
  v_new_version integer;
begin
  select *
  into v_need
  from public.needs
  where id = p_need_id;

  if not found then
    raise exception using errcode = 'P0001', message = 'CZ404:NEED_NOT_FOUND';
  end if;

  perform private.b1_authorize_actor(
    p_actor_id,
    'need.open',
    'PROJECT',
    v_need.project_id
  );

  select replayed, saved_result
  into v_replayed, v_result
  from private.b1_begin_command(
    v_need.cell_id,
    p_actor_id,
    p_command_id,
    p_idempotency_key,
    'need.open',
    v_payload
  );

  if v_replayed then
    return v_result;
  end if;

  select *
  into v_need
  from public.needs
  where id = p_need_id
  for update;

  if v_need.material_version <> p_expected_material_version then
    raise exception using errcode = 'P0001', message = 'CZ409:STALE_VERSION';
  end if;

  if v_need.state <> 'DRAFT'
     or v_need.visibility <> 'PROJECT' then
    raise exception using errcode = 'P0001', message = 'CZ409:INVALID_STATE';
  end if;

  select *
  into v_version
  from public.need_versions
  where need_id = p_need_id
    and version = v_need.current_version;

  if not found then
    raise exception using
      errcode = 'integrity_constraint_violation',
      message = 'current Need version missing';
  end if;

  v_new_version := v_need.current_version + 1;

  insert into public.need_versions(
    need_id,
    version,
    title,
    statement,
    context,
    state,
    visibility,
    created_by_actor_id
  ) values (
    p_need_id,
    v_new_version,
    v_version.title,
    v_version.statement,
    v_version.context,
    'OPEN',
    'PROJECT',
    p_actor_id
  );

  update public.needs
  set
    state = 'OPEN',
    visibility = 'PROJECT',
    current_version = v_new_version,
    material_version = material_version + 1,
    updated_at = now()
  where id = p_need_id;

  perform private.b1_record_decision(
    v_need.cell_id,
    'NEED_OPEN_INTERNAL',
    'ALLOW',
    'NEED',
    p_need_id,
    p_actor_id,
    'need.open',
    'PROJECT',
    v_need.project_id,
    'authorized project-scoped Need opened for internal coordination without public disclosure',
    p_command_id,
    null,
    null,
    jsonb_build_object(
      'need_version', v_new_version,
      'state', 'OPEN',
      'visibility', 'PROJECT',
      'publication', false
    )
  );

  perform private.b1_record_event(
    v_need.cell_id,
    'NEED_OPENED',
    'NEED',
    p_need_id,
    'NEED',
    p_need_id,
    p_actor_id,
    'need.open',
    'PROJECT',
    v_need.project_id,
    p_command_id,
    v_need.material_version,
    v_need.material_version + 1,
    'PROJECT',
    jsonb_build_object(
      'version', v_new_version,
      'state', 'OPEN',
      'visibility', 'PROJECT',
      'project_id', v_need.project_id,
      'publication', false
    )
  );

  v_result := jsonb_build_object(
    'ok', true,
    'need_id', p_need_id,
    'version', v_new_version,
    'material_version', v_need.material_version + 1,
    'state', 'OPEN',
    'visibility', 'PROJECT'
  );

  perform private.b1_finish_command(
    p_actor_id,
    p_idempotency_key,
    v_result
  );

  return v_result;
end;
$$;

revoke all on function public.t1_open_need(
  uuid, uuid, integer, uuid, text
) from public;

grant execute on function public.t1_open_need(
  uuid, uuid, integer, uuid, text
) to authenticated;

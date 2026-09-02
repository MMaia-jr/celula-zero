-- R2-2B — INTERNAL OPPORTUNITY OPENING
--
-- Concrete property:
-- operational openness for project coordination != public disclosure.
--
-- Additive only:
--   Opportunity DRAFT / PROJECT -> OPEN / PROJECT
--
-- Preserve:
-- Opportunity != Proposal
-- OPEN != PUBLIC
-- internal opening != publication
-- immutable versions
-- existing authority/idempotency/stale-version boundaries

insert into public.capability_definitions(code, description) values
  ('opportunity.open', 'Open a project-scoped Opportunity for internal coordination without publishing it.')
on conflict (code) do nothing;

insert into public.role_capabilities(role_id, capability_code) values
  ('00000000-0000-4000-8000-00000000c202', 'opportunity.open')
on conflict do nothing;

create or replace function public.t1_open_opportunity(
  p_actor_id uuid,
  p_opportunity_id uuid,
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
  v_o public.opportunities%rowtype;
  v_v public.opportunity_versions%rowtype;
  v_replayed boolean;
  v_result jsonb;
  v_payload jsonb := jsonb_build_object(
    'opportunity_id', p_opportunity_id,
    'expected_material_version', p_expected_material_version
  );
  v_new_version integer;
begin
  select *
  into v_o
  from public.opportunities
  where id = p_opportunity_id;

  if not found then
    raise exception using errcode = 'P0001', message = 'CZ404:OPPORTUNITY_NOT_FOUND';
  end if;

  perform private.b1_authorize_actor(
    p_actor_id,
    'opportunity.open',
    'OPPORTUNITY',
    p_opportunity_id
  );

  select replayed, saved_result
  into v_replayed, v_result
  from private.b1_begin_command(
    v_o.cell_id,
    p_actor_id,
    p_command_id,
    p_idempotency_key,
    'opportunity.open',
    v_payload
  );

  if v_replayed then
    return v_result;
  end if;

  select *
  into v_o
  from public.opportunities
  where id = p_opportunity_id
  for update;

  if v_o.material_version <> p_expected_material_version then
    raise exception using errcode = 'P0001', message = 'CZ409:STALE_VERSION';
  end if;

  if v_o.state <> 'DRAFT'
     or v_o.visibility <> 'PROJECT' then
    raise exception using errcode = 'P0001', message = 'CZ409:INVALID_STATE';
  end if;

  select *
  into v_v
  from public.opportunity_versions
  where opportunity_id = p_opportunity_id
    and version = v_o.current_version;

  if not found then
    raise exception using
      errcode = 'integrity_constraint_violation',
      message = 'current Opportunity version missing';
  end if;

  v_new_version := v_o.current_version + 1;

  insert into public.opportunity_versions(
    opportunity_id,
    version,
    title,
    statement,
    conditions,
    expected_result,
    capacity,
    state,
    visibility,
    created_by_actor_id
  ) values (
    p_opportunity_id,
    v_new_version,
    v_v.title,
    v_v.statement,
    v_v.conditions,
    v_v.expected_result,
    v_v.capacity,
    'OPEN',
    'PROJECT',
    p_actor_id
  );

  update public.opportunities
  set
    state = 'OPEN',
    visibility = 'PROJECT',
    current_version = v_new_version,
    material_version = material_version + 1,
    updated_at = now()
  where id = p_opportunity_id;

  perform private.b1_record_decision(
    v_o.cell_id,
    'OPPORTUNITY_OPEN_INTERNAL',
    'ALLOW',
    'OPPORTUNITY',
    p_opportunity_id,
    p_actor_id,
    'opportunity.open',
    'OPPORTUNITY',
    p_opportunity_id,
    'authorized Opportunity opened for internal coordination without public disclosure',
    p_command_id,
    v_new_version,
    null,
    jsonb_build_object(
      'state', 'OPEN',
      'visibility', 'PROJECT',
      'publication', false
    )
  );

  perform private.b1_record_event(
    v_o.cell_id,
    'OPPORTUNITY_OPENED',
    'OPPORTUNITY',
    p_opportunity_id,
    'OPPORTUNITY',
    p_opportunity_id,
    p_actor_id,
    'opportunity.open',
    'OPPORTUNITY',
    p_opportunity_id,
    p_command_id,
    v_o.material_version,
    v_o.material_version + 1,
    'PROJECT',
    jsonb_build_object(
      'version', v_new_version,
      'state', 'OPEN',
      'visibility', 'PROJECT',
      'publication', false
    )
  );

  v_result := jsonb_build_object(
    'ok', true,
    'opportunity_id', p_opportunity_id,
    'version', v_new_version,
    'material_version', v_o.material_version + 1,
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

revoke all on function public.t1_open_opportunity(
  uuid, uuid, integer, uuid, text
) from public;

grant execute on function public.t1_open_opportunity(
  uuid, uuid, integer, uuid, text
) to authenticated;

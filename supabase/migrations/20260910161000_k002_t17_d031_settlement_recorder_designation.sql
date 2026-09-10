-- K002 / T17 / D031 — explicit contextual settlement-recorder designation.
--
-- Preserve:
-- ECONOMIC INSTRUCTION != SETTLEMENT RECORDING != RECONCILIATION
-- DESIGNATION != MEMBERSHIP != PROJECT STEWARDSHIP
--
-- No payment rail. No money movement. No Cell-scoped assignment.
-- The existing B1 capability resolver remains unchanged.

create or replace function private.k002_d031_require_project_responsible_person(
  p_actor_id uuid,
  p_project_id uuid
)
returns uuid
language plpgsql
stable
security definer
set search_path = public, private, pg_temp
as $$
declare
  v_project public.projects%rowtype;
begin
  select *
  into v_project
  from public.projects
  where id = p_project_id;

  if not found then
    raise exception using
      errcode = 'P0001',
      message = 'CZ404:PROJECT_NOT_FOUND';
  end if;

  if not private.b1_profile_controls_actor(p_actor_id, auth.uid()) then
    raise exception using
      errcode = '42501',
      message = 'CZ403:ACTOR_CONTROL_REQUIRED';
  end if;

  if v_project.steward_actor_id <> p_actor_id
     or not private.can_manage_project(p_project_id, auth.uid()) then
    raise exception using
      errcode = '42501',
      message = 'CZ403:PROJECT_RESPONSIBLE_PERSON_REQUIRED';
  end if;

  if not exists (
    select 1
    from public.actors
    where id = p_actor_id
      and kind = 'PERSON'
  ) then
    raise exception using
      errcode = '42501',
      message = 'CZ403:HUMAN_PROJECT_RESPONSIBLE_REQUIRED';
  end if;

  return v_project.cell_id;
end;
$$;

revoke all on function private.k002_d031_require_project_responsible_person(uuid, uuid)
from public, anon, authenticated;

create or replace function public.k002_designate_settlement_recorder(
  p_actor_id uuid,
  p_project_id uuid,
  p_recorder_actor_id uuid,
  p_command_id uuid,
  p_idempotency_key text
)
returns jsonb
language plpgsql
security definer
set search_path = public, private, pg_temp
as $$
declare
  v_cell_id uuid;
  v_policy_id uuid;
  v_role_id uuid;
  v_assignment_id uuid;
  v_capability_count integer;
  v_replayed boolean;
  v_result jsonb;
  v_payload jsonb;
begin
  v_cell_id := private.k002_d031_require_project_responsible_person(
    p_actor_id, p_project_id
  );

  if not exists (
    select 1
    from public.actors
    where id = p_recorder_actor_id
  ) then
    raise exception using
      errcode = 'P0001',
      message = 'CZ404:SETTLEMENT_RECORDER_ACTOR_NOT_FOUND';
  end if;

  if not exists (
    select 1
    from public.actors
    where id = p_recorder_actor_id
      and kind = 'PERSON'
  ) then
    raise exception using
      errcode = '22023',
      message = 'CZ422:SETTLEMENT_RECORDER_PERSON_REQUIRED';
  end if;

  v_payload := jsonb_build_object(
    'project_id', p_project_id,
    'recorder_actor_id', p_recorder_actor_id
  );

  select replayed, saved_result
  into v_replayed, v_result
  from private.b1_begin_command(
    v_cell_id,
    p_actor_id,
    p_command_id,
    p_idempotency_key,
    'settlement.recorder.designate',
    v_payload
  );

  if v_replayed then
    return v_result;
  end if;

  perform pg_advisory_xact_lock(
    hashtextextended(
      'k002-d031:' || p_project_id::text || ':' || p_recorder_actor_id::text,
      0
    )
  );

  select current_policy_version_id
  into v_policy_id
  from public.cells
  where id = v_cell_id;

  if v_policy_id is null then
    raise exception using
      errcode = 'integrity_constraint_violation',
      message = 'D031 project Cell has no current policy';
  end if;

  insert into public.role_definitions(cell_id, code, name)
  values(v_cell_id, 'SETTLEMENT_RECORDER', 'Settlement recorder')
  on conflict (cell_id, code) do nothing;

  select id
  into v_role_id
  from public.role_definitions
  where cell_id = v_cell_id
    and code = 'SETTLEMENT_RECORDER';

  if v_role_id is null then
    raise exception using
      errcode = 'integrity_constraint_violation',
      message = 'D031 SETTLEMENT_RECORDER role could not be materialized';
  end if;

  insert into public.role_capabilities(role_id, capability_code)
  values(v_role_id, 'settlement.record')
  on conflict do nothing;

  select count(*)::integer
  into v_capability_count
  from public.role_capabilities
  where role_id = v_role_id;

  if v_capability_count <> 1
     or not exists (
       select 1
       from public.role_capabilities
       where role_id = v_role_id
         and capability_code = 'settlement.record'
     ) then
    raise exception using
      errcode = 'integrity_constraint_violation',
      message = 'D031 SETTLEMENT_RECORDER must own exactly settlement.record';
  end if;

  if exists (
    select 1
    from public.role_assignments ra
    where ra.cell_id = v_cell_id
      and ra.actor_id = p_recorder_actor_id
      and ra.role_id = v_role_id
      and ra.scope_type = 'PROJECT'
      and ra.scope_id = p_project_id
      and ra.policy_version_id = v_policy_id
      and ra.valid_from <= now()
      and (ra.valid_until is null or ra.valid_until > now())
      and ra.revoked_at is null
  ) then
    raise exception using
      errcode = 'P0001',
      message = 'CZ409:SETTLEMENT_RECORDER_ALREADY_ACTIVE';
  end if;

  insert into public.role_assignments(
    cell_id,
    actor_id,
    role_id,
    scope_type,
    scope_id,
    policy_version_id,
    granted_by_actor_id
  ) values (
    v_cell_id,
    p_recorder_actor_id,
    v_role_id,
    'PROJECT',
    p_project_id,
    v_policy_id,
    p_actor_id
  )
  returning id into v_assignment_id;

  perform private.b1_record_decision(
    v_cell_id,
    'SETTLEMENT_RECORDER_DESIGNATE',
    'ALLOW',
    'ROLE_ASSIGNMENT',
    v_assignment_id,
    p_actor_id,
    'settlement.record',
    'PROJECT',
    p_project_id,
    'responsible Project PERSON explicitly designated contextual settlement recorder',
    p_command_id,
    null,
    null,
    jsonb_build_object(
      'recorder_actor_id', p_recorder_actor_id,
      'role_code', 'SETTLEMENT_RECORDER',
      'capability', 'settlement.record',
      'scope_type', 'PROJECT',
      'project_id', p_project_id,
      'economic_instruction_authority_granted', false,
      'reconciliation_authority_granted', false,
      'cell_membership_granted', false
    )
  );

  perform private.b1_record_event(
    v_cell_id,
    'SETTLEMENT_RECORDER_DESIGNATED',
    'PROJECT',
    p_project_id,
    'ROLE_ASSIGNMENT',
    v_assignment_id,
    p_actor_id,
    'settlement.record',
    'PROJECT',
    p_project_id,
    p_command_id,
    null,
    1,
    'PROJECT',
    jsonb_build_object(
      'recorder_actor_id', p_recorder_actor_id,
      'role_code', 'SETTLEMENT_RECORDER',
      'capability', 'settlement.record',
      'authority_basis', 'EXPLICIT_PROJECT_DESIGNATION'
    )
  );

  v_result := jsonb_build_object(
    'ok', true,
    'role_assignment_id', v_assignment_id,
    'project_id', p_project_id,
    'recorder_actor_id', p_recorder_actor_id,
    'role_code', 'SETTLEMENT_RECORDER',
    'capability', 'settlement.record',
    'scope_type', 'PROJECT',
    'status', 'ACTIVE'
  );

  perform private.b1_finish_command(
    p_actor_id, p_idempotency_key, v_result
  );

  return v_result;
end;
$$;

create or replace function public.k002_revoke_settlement_recorder(
  p_actor_id uuid,
  p_role_assignment_id uuid,
  p_command_id uuid,
  p_idempotency_key text
)
returns jsonb
language plpgsql
security definer
set search_path = public, private, pg_temp
as $$
declare
  v_assignment public.role_assignments%rowtype;
  v_role public.role_definitions%rowtype;
  v_cell_id uuid;
  v_current_policy_id uuid;
  v_replayed boolean;
  v_result jsonb;
  v_payload jsonb;
begin
  select *
  into v_assignment
  from public.role_assignments
  where id = p_role_assignment_id;

  if not found then
    raise exception using
      errcode = 'P0001',
      message = 'CZ404:SETTLEMENT_RECORDER_ASSIGNMENT_NOT_FOUND';
  end if;

  select *
  into v_role
  from public.role_definitions
  where id = v_assignment.role_id;

  if not found
     or v_role.code <> 'SETTLEMENT_RECORDER'
     or v_assignment.scope_type <> 'PROJECT' then
    raise exception using
      errcode = 'P0001',
      message = 'CZ409:NOT_SETTLEMENT_RECORDER_ASSIGNMENT';
  end if;

  v_cell_id := private.k002_d031_require_project_responsible_person(
    p_actor_id, v_assignment.scope_id
  );

  if v_cell_id <> v_assignment.cell_id
     or v_role.cell_id <> v_assignment.cell_id then
    raise exception using
      errcode = 'P0001',
      message = 'CZ409:SETTLEMENT_RECORDER_CONTEXT_MISMATCH';
  end if;

  select current_policy_version_id
  into v_current_policy_id
  from public.cells
  where id = v_cell_id;

  if v_assignment.policy_version_id <> v_current_policy_id
     or v_assignment.revoked_at is not null
     or v_assignment.valid_from > now()
     or (
       v_assignment.valid_until is not null
       and v_assignment.valid_until <= now()
     ) then
    raise exception using
      errcode = 'P0001',
      message = 'CZ409:SETTLEMENT_RECORDER_NOT_ACTIVE';
  end if;

  v_payload := jsonb_build_object(
    'role_assignment_id', p_role_assignment_id,
    'project_id', v_assignment.scope_id,
    'recorder_actor_id', v_assignment.actor_id
  );

  select replayed, saved_result
  into v_replayed, v_result
  from private.b1_begin_command(
    v_cell_id,
    p_actor_id,
    p_command_id,
    p_idempotency_key,
    'settlement.recorder.revoke',
    v_payload
  );

  if v_replayed then
    return v_result;
  end if;

  update public.role_assignments
  set revoked_at = now()
  where id = p_role_assignment_id
    and revoked_at is null;

  if not found then
    raise exception using
      errcode = 'P0001',
      message = 'CZ409:SETTLEMENT_RECORDER_NOT_ACTIVE';
  end if;

  perform private.b1_record_decision(
    v_cell_id,
    'SETTLEMENT_RECORDER_REVOKE',
    'ALLOW',
    'ROLE_ASSIGNMENT',
    p_role_assignment_id,
    p_actor_id,
    'settlement.record',
    'PROJECT',
    v_assignment.scope_id,
    'responsible Project PERSON explicitly revoked contextual settlement recorder',
    p_command_id,
    null,
    null,
    jsonb_build_object(
      'recorder_actor_id', v_assignment.actor_id,
      'role_code', 'SETTLEMENT_RECORDER',
      'capability', 'settlement.record',
      'scope_type', 'PROJECT',
      'project_id', v_assignment.scope_id
    )
  );

  perform private.b1_record_event(
    v_cell_id,
    'SETTLEMENT_RECORDER_REVOKED',
    'PROJECT',
    v_assignment.scope_id,
    'ROLE_ASSIGNMENT',
    p_role_assignment_id,
    p_actor_id,
    'settlement.record',
    'PROJECT',
    v_assignment.scope_id,
    p_command_id,
    1,
    2,
    'PROJECT',
    jsonb_build_object(
      'recorder_actor_id', v_assignment.actor_id,
      'role_code', 'SETTLEMENT_RECORDER',
      'capability', 'settlement.record',
      'authority_basis', 'EXPLICIT_PROJECT_REVOCATION'
    )
  );

  v_result := jsonb_build_object(
    'ok', true,
    'role_assignment_id', p_role_assignment_id,
    'project_id', v_assignment.scope_id,
    'recorder_actor_id', v_assignment.actor_id,
    'status', 'REVOKED'
  );

  perform private.b1_finish_command(
    p_actor_id, p_idempotency_key, v_result
  );

  return v_result;
end;
$$;

revoke all on function public.k002_designate_settlement_recorder(
  uuid, uuid, uuid, uuid, text
) from public;

revoke all on function public.k002_revoke_settlement_recorder(
  uuid, uuid, uuid, text
) from public;

grant execute on function public.k002_designate_settlement_recorder(
  uuid, uuid, uuid, uuid, text
) to authenticated;

grant execute on function public.k002_revoke_settlement_recorder(
  uuid, uuid, uuid, text
) to authenticated;

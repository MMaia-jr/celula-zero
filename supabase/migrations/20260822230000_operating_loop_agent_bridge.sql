-- OPERATING-LOOP-MVP: minimal bridge for an attributable AI agent operated by
-- the authenticated human steward.
--
-- This does NOT integrate an LLM, grant autonomous authority, create economic
-- rights, or weaken Gate B1 self-acceptance. It only lets a project steward
-- register a controlled AI_AGENT and grant the existing CONTRIBUTOR role in
-- the project so Proposal -> Commitment can be exercised with distinct actors.

create or replace function public.h2_register_project_agent(
  p_actor_id uuid,
  p_project_id uuid,
  p_name text,
  p_operator_label text,
  p_command_id uuid,
  p_idempotency_key text
)
returns jsonb
language plpgsql
security definer
set search_path = public, private, pg_temp
as $$
declare
  v_project public.projects%rowtype;
  v_policy_version_id uuid;
  v_profile_id uuid := auth.uid();
  v_replayed boolean;
  v_result jsonb;
  v_agent_id uuid;
  v_payload jsonb := jsonb_build_object(
    'project_id', p_project_id,
    'name', trim(p_name),
    'operator_label', trim(p_operator_label)
  );
begin
  select * into v_project
  from public.projects
  where id = p_project_id;

  if not found then
    raise exception using errcode = 'P0001', message = 'CZ404:PROJECT_NOT_FOUND';
  end if;

  if v_profile_id is null then
    raise exception using errcode = '42501', message = 'CZ403:AUTHENTICATION_REQUIRED';
  end if;

  perform private.b1_authorize_actor(
    p_actor_id, 'delegation.manage', 'PROJECT', p_project_id
  );

  if char_length(trim(p_name)) < 2 or char_length(trim(p_name)) > 120 then
    raise exception using errcode = '22023', message = 'CZ422:INVALID_AGENT_NAME';
  end if;

  if char_length(trim(p_operator_label)) < 2
     or char_length(trim(p_operator_label)) > 160 then
    raise exception using errcode = '22023', message = 'CZ422:INVALID_OPERATOR_LABEL';
  end if;

  select current_policy_version_id into v_policy_version_id
  from public.cells
  where id = v_project.cell_id;

  if v_policy_version_id is null then
    raise exception using errcode = 'P0001', message = 'CZ409:NO_ACTIVE_POLICY';
  end if;

  select replayed, saved_result into v_replayed, v_result
  from private.b1_begin_command(
    v_project.cell_id,
    p_actor_id,
    p_command_id,
    p_idempotency_key,
    'agent.register',
    v_payload
  );

  if v_replayed then
    return v_result;
  end if;

  insert into public.actors(
    kind,
    name,
    operator_profile_id,
    operator_label
  ) values (
    'AI_AGENT',
    trim(p_name),
    v_profile_id,
    trim(p_operator_label)
  )
  returning id into v_agent_id;

  insert into public.actor_memberships(actor_id, profile_id, role)
  values (v_agent_id, v_profile_id, 'OPERATOR');

  insert into public.project_members(
    project_id,
    actor_id,
    role,
    granted_by_profile_id
  ) values (
    p_project_id,
    v_agent_id,
    'CONTRIBUTOR',
    v_profile_id
  );

  insert into public.role_assignments(
    cell_id,
    actor_id,
    role_id,
    scope_type,
    scope_id,
    policy_version_id,
    granted_by_actor_id
  ) values (
    v_project.cell_id,
    v_agent_id,
    '00000000-0000-4000-8000-00000000c204',
    'PROJECT',
    p_project_id,
    v_policy_version_id,
    p_actor_id
  );

  perform private.b1_record_decision(
    v_project.cell_id,
    'AGENT_REGISTER',
    'ALLOW',
    'ACTOR',
    v_agent_id,
    p_actor_id,
    'delegation.manage',
    'PROJECT',
    p_project_id,
    'project steward registered an attributable AI agent with CONTRIBUTOR role',
    p_command_id,
    null,
    null,
    jsonb_build_object(
      'project_id', p_project_id,
      'agent_kind', 'AI_AGENT',
      'role', 'CONTRIBUTOR',
      'operator_profile_id', v_profile_id
    )
  );

  perform private.b1_record_event(
    v_project.cell_id,
    'AGENT_REGISTERED',
    'AGENT',
    v_agent_id,
    'ACTOR',
    v_agent_id,
    p_actor_id,
    'delegation.manage',
    'PROJECT',
    p_project_id,
    p_command_id,
    null,
    1,
    'PROJECT',
    jsonb_build_object(
      'project_id', p_project_id,
      'name', trim(p_name),
      'operator_label', trim(p_operator_label),
      'role', 'CONTRIBUTOR'
    )
  );

  v_result := jsonb_build_object(
    'ok', true,
    'agent_actor_id', v_agent_id,
    'project_id', p_project_id,
    'kind', 'AI_AGENT',
    'role', 'CONTRIBUTOR',
    'operator_profile_id', v_profile_id
  );

  perform private.b1_finish_command(
    p_actor_id, p_idempotency_key, v_result
  );

  return v_result;
end;
$$;

revoke all on function public.h2_register_project_agent(
  uuid, uuid, text, text, uuid, text
) from public;

grant execute on function public.h2_register_project_agent(
  uuid, uuid, text, text, uuid, text
) to authenticated;

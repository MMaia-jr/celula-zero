-- INTEGRATED-ALPHA-001 / T3 HUMAN ↔ AI COORDINATION
-- Block 1: attributable SoftwareAgent + bounded human-authorized task.
--
-- Reuse:
--   actors(kind='AI_AGENT', operator_profile_id, operator_label)
--   Gate B1 role/capability/delegation authority
--   domain_events + decision_records
--
-- Add only the concrete missing properties:
--   1. a task material record that narrows a project-scoped agent.execute
--      delegation to one explicit task + repository-relative path set;
--   2. a registration path that creates an attributable AI_AGENT without
--      silently granting project membership or CONTRIBUTOR role.
--
-- Preserve:
-- Human Operator != SoftwareAgent
-- Delegation != Execution
-- Execution != Legitimacy
-- Agent output != Verification != Decision
-- No A2A/MCP requirement is introduced here.

insert into public.capability_definitions(code, description) values
  ('agent.execute', 'Execute one human-authorized SoftwareAgent task within an explicitly bounded project context.')
on conflict (code) do nothing;

-- Human authority holders may delegate agent.execute. The AI agent receives it
-- only through an explicit bounded delegation; it receives no role assignment.
insert into public.role_capabilities(role_id, capability_code) values
  ('00000000-0000-4000-8000-00000000c201', 'agent.execute'),
  ('00000000-0000-4000-8000-00000000c202', 'agent.execute')
on conflict do nothing;

create table public.agent_tasks (
  id uuid primary key default gen_random_uuid(),
  cell_id uuid not null references public.cells(id) on delete restrict,
  project_id uuid not null references public.projects(id) on delete restrict,
  steward_actor_id uuid not null references public.actors(id) on delete restrict,
  agent_actor_id uuid not null references public.actors(id) on delete restrict,
  delegation_id uuid not null unique references public.delegations(id) on delete restrict,
  task_statement text not null check (char_length(task_statement) between 20 and 4000),
  scope_paths text[] not null check (cardinality(scope_paths) between 1 and 32),
  network_policy text not null default 'OFF' check (network_policy = 'OFF'),
  state text not null default 'AUTHORIZED'
    check (state in ('AUTHORIZED', 'RUNNING', 'COMPLETED', 'FAILED', 'CANCELLED')),
  valid_until timestamptz not null,
  material_version integer not null default 1 check (material_version > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (steward_actor_id <> agent_actor_id),
  check (valid_until > created_at)
);

create index agent_tasks_project_created
  on public.agent_tasks(project_id, created_at desc);
create index agent_tasks_agent_state
  on public.agent_tasks(agent_actor_id, state, valid_until);

create or replace function public.t3_register_bounded_agent(
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
  v_actor_kind text;
  v_profile_id uuid := auth.uid();
  v_replayed boolean;
  v_result jsonb;
  v_agent_id uuid;
  v_name text := trim(coalesce(p_name, ''));
  v_operator_label text := trim(coalesce(p_operator_label, ''));
  v_payload jsonb;
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

  select kind into v_actor_kind from public.actors where id = p_actor_id;
  if v_actor_kind <> 'PERSON' then
    raise exception using errcode = '42501', message = 'CZ403:HUMAN_STEWARD_REQUIRED';
  end if;

  if char_length(v_name) < 2 or char_length(v_name) > 120 then
    raise exception using errcode = '22023', message = 'CZ422:INVALID_AGENT_NAME';
  end if;
  if char_length(v_operator_label) < 2 or char_length(v_operator_label) > 160 then
    raise exception using errcode = '22023', message = 'CZ422:INVALID_OPERATOR_LABEL';
  end if;

  v_payload := jsonb_build_object(
    'project_id', p_project_id,
    'name', v_name,
    'operator_label', v_operator_label,
    'authority_mode', 'BOUNDED_NO_ROLE'
  );

  select replayed, saved_result
  into v_replayed, v_result
  from private.b1_begin_command(
    v_project.cell_id,
    p_actor_id,
    p_command_id,
    p_idempotency_key,
    'agent.register.bounded',
    v_payload
  );
  if v_replayed then return v_result; end if;

  insert into public.actors(kind, name, operator_profile_id, operator_label)
  values ('AI_AGENT', v_name, v_profile_id, v_operator_label)
  returning id into v_agent_id;

  insert into public.actor_memberships(actor_id, profile_id, role)
  values (v_agent_id, v_profile_id, 'OPERATOR');

  -- Deliberately NO project_members and NO role_assignments.

  perform private.b1_record_decision(
    v_project.cell_id,
    'AGENT_REGISTER_BOUNDED',
    'ALLOW',
    'ACTOR',
    v_agent_id,
    p_actor_id,
    'delegation.manage',
    'PROJECT',
    p_project_id,
    'human steward registered an attributable AI agent without implicit project role',
    p_command_id,
    null,
    null,
    jsonb_build_object(
      'project_id', p_project_id,
      'agent_kind', 'AI_AGENT',
      'operator_profile_id', v_profile_id,
      'implicit_project_role', false
    )
  );

  perform private.b1_record_event(
    v_project.cell_id,
    'AGENT_REGISTERED_BOUNDED',
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
      'name', v_name,
      'operator_label', v_operator_label,
      'implicit_project_role', false
    )
  );

  v_result := jsonb_build_object(
    'ok', true,
    'agent_actor_id', v_agent_id,
    'project_id', p_project_id,
    'kind', 'AI_AGENT',
    'operator_profile_id', v_profile_id,
    'implicit_project_role', false
  );

  perform private.b1_finish_command(p_actor_id, p_idempotency_key, v_result);
  return v_result;
end;
$$;

create or replace function public.t3_authorize_agent_task(
  p_actor_id uuid,
  p_project_id uuid,
  p_agent_actor_id uuid,
  p_task_statement text,
  p_scope_paths text[],
  p_valid_until timestamptz,
  p_delegation_command_id uuid,
  p_delegation_idempotency_key text,
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
  v_agent public.actors%rowtype;
  v_steward_kind text;
  v_profile_id uuid := auth.uid();
  v_replayed boolean;
  v_result jsonb;
  v_delegation_result jsonb;
  v_delegation_id uuid;
  v_task_id uuid;
  v_path text;
  v_statement text := trim(coalesce(p_task_statement, ''));
  v_payload jsonb;
begin
  select * into v_project from public.projects where id = p_project_id;
  if not found then
    raise exception using errcode = 'P0001', message = 'CZ404:PROJECT_NOT_FOUND';
  end if;

  perform private.b1_authorize_actor(
    p_actor_id, 'delegation.manage', 'PROJECT', p_project_id
  );

  select kind into v_steward_kind from public.actors where id = p_actor_id;
  if v_steward_kind <> 'PERSON' then
    raise exception using errcode = '42501', message = 'CZ403:HUMAN_STEWARD_REQUIRED';
  end if;

  select * into v_agent from public.actors where id = p_agent_actor_id;
  if not found or v_agent.kind <> 'AI_AGENT' then
    raise exception using errcode = '22023', message = 'CZ422:AI_AGENT_REQUIRED';
  end if;

  if v_profile_id is null
     or v_agent.operator_profile_id is distinct from v_profile_id
     or not private.b1_current_profile_controls_actor(p_agent_actor_id) then
    raise exception using errcode = '42501', message = 'CZ403:AGENT_OPERATOR_CONTROL_REQUIRED';
  end if;

  -- T3 bounded path refuses legacy/broad agent registration.
  if exists (
    select 1 from public.project_members
    where project_id = p_project_id and actor_id = p_agent_actor_id
  ) or exists (
    select 1 from public.role_assignments
    where actor_id = p_agent_actor_id
      and scope_type = 'PROJECT'
      and scope_id = p_project_id
      and revoked_at is null
      and (valid_until is null or valid_until > now())
  ) then
    raise exception using errcode = '42501', message = 'CZ403:AGENT_ROLE_AUTHORITY_NOT_BOUNDED';
  end if;

  if private.b1_has_capability(
       p_agent_actor_id, 'decision.issue', 'PROJECT', p_project_id
     )
     or private.b1_has_capability(
       p_agent_actor_id, 'delegation.manage', 'PROJECT', p_project_id
     ) then
    raise exception using errcode = '42501', message = 'CZ403:AGENT_AUTHORITY_TOO_BROAD';
  end if;

  if char_length(v_statement) < 20 or char_length(v_statement) > 4000 then
    raise exception using errcode = '22023', message = 'CZ422:INVALID_AGENT_TASK_STATEMENT';
  end if;

  if p_scope_paths is null
     or cardinality(p_scope_paths) < 1
     or cardinality(p_scope_paths) > 32
     or array_position(p_scope_paths, null) is not null then
    raise exception using errcode = '22023', message = 'CZ422:INVALID_AGENT_TASK_SCOPE';
  end if;

  foreach v_path in array p_scope_paths loop
    if char_length(v_path) < 1
       or char_length(v_path) > 500
       or v_path like '/%'
       or v_path like '%..%'
       or v_path !~ '^[A-Za-z0-9._/@\[\]-]+$' then
      raise exception using errcode = '22023', message = 'CZ422:INVALID_AGENT_TASK_PATH';
    end if;
  end loop;

  if p_valid_until <= now() then
    raise exception using errcode = '22023', message = 'CZ422:INVALID_AGENT_TASK_WINDOW';
  end if;
  if p_valid_until > now() + interval '24 hours' then
    raise exception using errcode = '22023', message = 'CZ422:AGENT_TASK_WINDOW_TOO_WIDE';
  end if;

  v_payload := jsonb_build_object(
    'project_id', p_project_id,
    'agent_actor_id', p_agent_actor_id,
    'task_statement', v_statement,
    'scope_paths', to_jsonb(p_scope_paths),
    'valid_until', p_valid_until,
    'network_policy', 'OFF'
  );

  select replayed, saved_result
  into v_replayed, v_result
  from private.b1_begin_command(
    v_project.cell_id,
    p_actor_id,
    p_command_id,
    p_idempotency_key,
    'agent.task.authorize',
    v_payload
  );
  if v_replayed then return v_result; end if;

  v_delegation_result := public.b1_grant_delegation(
    p_actor_id,
    p_agent_actor_id,
    'agent.execute',
    'PROJECT',
    p_project_id,
    p_valid_until,
    p_delegation_command_id,
    p_delegation_idempotency_key
  );

  if coalesce((v_delegation_result ->> 'ok')::boolean, false) is not true
     or v_delegation_result ->> 'delegation_id' is null then
    raise exception using errcode = '42501', message = 'CZ403:AGENT_EXECUTION_DELEGATION_DENIED';
  end if;

  v_delegation_id := (v_delegation_result ->> 'delegation_id')::uuid;

  insert into public.agent_tasks(
    cell_id,
    project_id,
    steward_actor_id,
    agent_actor_id,
    delegation_id,
    task_statement,
    scope_paths,
    network_policy,
    state,
    valid_until
  ) values (
    v_project.cell_id,
    p_project_id,
    p_actor_id,
    p_agent_actor_id,
    v_delegation_id,
    v_statement,
    p_scope_paths,
    'OFF',
    'AUTHORIZED',
    p_valid_until
  )
  returning id into v_task_id;

  perform private.b1_record_decision(
    v_project.cell_id,
    'AGENT_TASK_AUTHORIZE',
    'ALLOW',
    'AGENT_TASK',
    v_task_id,
    p_actor_id,
    'delegation.manage',
    'PROJECT',
    p_project_id,
    'human steward authorized one bounded SoftwareAgent task',
    p_command_id,
    null,
    null,
    jsonb_build_object(
      'agent_actor_id', p_agent_actor_id,
      'delegation_id', v_delegation_id,
      'capability', 'agent.execute',
      'scope_paths', to_jsonb(p_scope_paths),
      'network_policy', 'OFF',
      'valid_until', p_valid_until
    )
  );

  perform private.b1_record_event(
    v_project.cell_id,
    'AGENT_TASK_AUTHORIZED',
    'AGENT_TASK',
    v_task_id,
    'AGENT_TASK',
    v_task_id,
    p_actor_id,
    'delegation.manage',
    'PROJECT',
    p_project_id,
    p_command_id,
    null,
    1,
    'PROJECT',
    jsonb_build_object(
      'agent_actor_id', p_agent_actor_id,
      'delegation_id', v_delegation_id,
      'capability', 'agent.execute',
      'scope_paths', to_jsonb(p_scope_paths),
      'network_policy', 'OFF',
      'state', 'AUTHORIZED',
      'valid_until', p_valid_until
    )
  );

  v_result := jsonb_build_object(
    'ok', true,
    'agent_task_id', v_task_id,
    'agent_actor_id', p_agent_actor_id,
    'delegation_id', v_delegation_id,
    'capability', 'agent.execute',
    'scope_type', 'PROJECT',
    'scope_id', p_project_id,
    'network_policy', 'OFF',
    'state', 'AUTHORIZED',
    'valid_until', p_valid_until
  );

  perform private.b1_finish_command(p_actor_id, p_idempotency_key, v_result);
  return v_result;
end;
$$;

create or replace function public.t3_reconcile_agent_task(p_agent_task_id uuid)
returns text[]
language sql
stable
security definer
set search_path = public, private, pg_temp
as $$
  with material as (
    select t.*, a.kind as agent_kind, a.operator_profile_id
    from public.agent_tasks t
    join public.actors a on a.id = t.agent_actor_id
    where t.id = p_agent_task_id
  ), delegation_material as (
    select d.*
    from public.delegations d
    join material t on t.delegation_id = d.id
  ), checks as (
    select 'missing_material' as issue
    where not exists (select 1 from material)

    union all
    select 'agent_identity_mismatch'
    where exists (
      select 1 from material
      where agent_kind <> 'AI_AGENT' or operator_profile_id is null
    )

    union all
    select 'delegation_context_mismatch'
    where exists (
      select 1
      from material t
      left join delegation_material d on true
      where d.id is null
         or d.delegator_actor_id <> t.steward_actor_id
         or d.delegate_actor_id <> t.agent_actor_id
         or d.capability_code <> 'agent.execute'
         or d.scope_type <> 'PROJECT'
         or d.scope_id <> t.project_id
         or d.valid_until <> t.valid_until
         or d.status <> 'ACTIVE'
    )

    union all
    select 'implicit_project_membership'
    where exists (
      select 1
      from material t
      join public.project_members pm
        on pm.project_id = t.project_id and pm.actor_id = t.agent_actor_id
    )

    union all
    select 'implicit_role_assignment'
    where exists (
      select 1
      from material t
      join public.role_assignments ra
        on ra.actor_id = t.agent_actor_id
       and ra.scope_type = 'PROJECT'
       and ra.scope_id = t.project_id
       and ra.revoked_at is null
       and (ra.valid_until is null or ra.valid_until > now())
    )

    union all
    select 'authorization_event_count'
    where (
      select count(*)
      from public.domain_events e
      where e.aggregate_type = 'AGENT_TASK'
        and e.aggregate_id = p_agent_task_id
        and e.event_type = 'AGENT_TASK_AUTHORIZED'
    ) <> 1
  )
  select coalesce(array_agg(issue order by issue), '{}'::text[]) from checks;
$$;

alter table public.agent_tasks enable row level security;

create policy agent_tasks_read on public.agent_tasks
for select to authenticated using (
  private.b1_current_profile_controls_actor(steward_actor_id)
  or private.b1_current_profile_controls_actor(agent_actor_id)
  or private.can_manage_project(project_id, auth.uid())
);

revoke all on public.agent_tasks from anon, authenticated;
grant select on public.agent_tasks to authenticated;

revoke all on function public.t3_register_bounded_agent(
  uuid, uuid, text, text, uuid, text
) from public;
revoke all on function public.t3_authorize_agent_task(
  uuid, uuid, uuid, text, text[], timestamptz, uuid, text, uuid, text
) from public;
revoke all on function public.t3_reconcile_agent_task(uuid) from public;

grant execute on function public.t3_register_bounded_agent(
  uuid, uuid, text, text, uuid, text
) to authenticated;
grant execute on function public.t3_authorize_agent_task(
  uuid, uuid, uuid, text, text[], timestamptz, uuid, text, uuid, text
) to authenticated;
grant execute on function public.t3_reconcile_agent_task(uuid) to authenticated;

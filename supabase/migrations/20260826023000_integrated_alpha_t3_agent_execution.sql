-- INTEGRATED-ALPHA-001 / T3 HUMAN ↔ AI COORDINATION
-- Block 2: reconstructible SoftwareAgent execution record.
--
-- This migration does not create a Claim, Evidence, Verification, Decision,
-- Outcome, project role, autonomous authority, A2A transport or MCP boundary.
--
-- The execution may only start when:
--   - current authenticated profile controls the exact AI_AGENT;
--   - the Agent has an active exact agent.execute delegation for the task Project;
--   - the Agent has no project membership/role assignment for this T3 bounded path;
--   - the task is still AUTHORIZED and unexpired;
--   - network policy is OFF.
--
-- Runtime output below remains an unverified Agent result:
-- execution result != Claim entity != Evidence != Verification != Decision.

create table public.agent_task_executions (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null unique references public.agent_tasks(id) on delete restrict,
  cell_id uuid not null references public.cells(id) on delete restrict,
  project_id uuid not null references public.projects(id) on delete restrict,
  agent_actor_id uuid not null references public.actors(id) on delete restrict,
  steward_actor_id uuid not null references public.actors(id) on delete restrict,
  delegation_id uuid not null references public.delegations(id) on delete restrict,
  operator_profile_id uuid not null references public.profiles(id) on delete restrict,
  runtime_kind text not null check (runtime_kind = 'OLLAMA_LOCAL'),
  runtime_name text not null check (char_length(runtime_name) between 1 and 200),
  input_digest text not null check (input_digest ~ '^[0-9a-f]{64}$'),
  state text not null default 'STARTED'
    check (state in ('STARTED','COMPLETED','FAILED')),
  runtime_classification text
    check (
      runtime_classification is null
      or runtime_classification in (
        'NO_AUTOMATIC_PATH_FOUND',
        'AUTOMATIC_PATH_FOUND',
        'INCONCLUSIVE'
      )
    ),
  runtime_claim_text text check (
    runtime_claim_text is null
    or char_length(runtime_claim_text) between 10 and 4000
  ),
  runtime_limitations text check (
    runtime_limitations is null
    or char_length(runtime_limitations) between 2 and 4000
  ),
  output_uri text,
  output_digest text check (
    output_digest is null or output_digest ~ '^[0-9a-f]{64}$'
  ),
  output_size_bytes bigint check (
    output_size_bytes is null
    or (output_size_bytes > 0 and output_size_bytes <= 1048576)
  ),
  failure_code text check (
    failure_code is null or char_length(failure_code) between 3 and 120
  ),
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  failed_at timestamptz,
  created_at timestamptz not null default now(),
  check (
    (state = 'STARTED' and completed_at is null and failed_at is null
      and output_digest is null and failure_code is null)
    or
    (state = 'COMPLETED' and completed_at is not null and failed_at is null
      and output_digest is not null and output_uri is not null
      and output_size_bytes is not null and runtime_classification is not null
      and runtime_claim_text is not null and runtime_limitations is not null
      and failure_code is null)
    or
    (state = 'FAILED' and failed_at is not null and completed_at is null
      and failure_code is not null)
  )
);

create index agent_task_executions_agent_started
  on public.agent_task_executions(agent_actor_id, started_at desc);

create or replace function private.t3_execution_authority_is_exact(
  p_task_id uuid,
  p_agent_actor_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = public, private, pg_temp
as $$
  select exists (
    select 1
    from public.agent_tasks t
    join public.actors a on a.id = t.agent_actor_id
    join public.delegations d on d.id = t.delegation_id
    join public.cells c on c.id = t.cell_id
    where t.id = p_task_id
      and t.agent_actor_id = p_agent_actor_id
      and a.kind = 'AI_AGENT'
      and a.operator_profile_id = auth.uid()
      and t.network_policy = 'OFF'
      and t.state in ('AUTHORIZED','RUNNING')
      and t.valid_until > now()
      and d.id = t.delegation_id
      and d.delegator_actor_id = t.steward_actor_id
      and d.delegate_actor_id = t.agent_actor_id
      and d.capability_code = 'agent.execute'
      and d.scope_type = 'PROJECT'
      and d.scope_id = t.project_id
      and d.status = 'ACTIVE'
      and d.valid_from <= now()
      and d.valid_until > now()
      and d.valid_until = t.valid_until
      and d.policy_version_id = c.current_policy_version_id
      and not exists (
        select 1
        from public.project_members pm
        where pm.project_id = t.project_id
          and pm.actor_id = t.agent_actor_id
      )
      and not exists (
        select 1
        from public.role_assignments ra
        where ra.actor_id = t.agent_actor_id
          and ra.scope_type = 'PROJECT'
          and ra.scope_id = t.project_id
          and ra.revoked_at is null
          and (ra.valid_until is null or ra.valid_until > now())
      )
      and not private.b1_has_capability(
        t.agent_actor_id, 'decision.issue', 'PROJECT', t.project_id
      )
      and not private.b1_has_capability(
        t.agent_actor_id, 'delegation.manage', 'PROJECT', t.project_id
      )
  );
$$;

create or replace function public.t3_start_agent_execution(
  p_agent_actor_id uuid,
  p_task_id uuid,
  p_runtime_kind text,
  p_runtime_name text,
  p_input_digest text,
  p_command_id uuid,
  p_idempotency_key text
)
returns jsonb
language plpgsql
security definer
set search_path = public, private, pg_temp
as $$
declare
  v_task public.agent_tasks%rowtype;
  v_replayed boolean;
  v_result jsonb;
  v_execution_id uuid;
  v_payload jsonb;
  v_runtime_name text := trim(coalesce(p_runtime_name, ''));
begin
  select * into v_task
  from public.agent_tasks
  where id = p_task_id;
  if not found then
    raise exception using errcode = 'P0001', message = 'CZ404:AGENT_TASK_NOT_FOUND';
  end if;

  if v_task.agent_actor_id <> p_agent_actor_id then
    raise exception using errcode = '42501', message = 'CZ403:AGENT_TASK_ACTOR_MISMATCH';
  end if;

  perform private.b1_authorize_actor(
    p_agent_actor_id, 'agent.execute', 'PROJECT', v_task.project_id
  );

  if not private.t3_execution_authority_is_exact(p_task_id, p_agent_actor_id) then
    raise exception using errcode = '42501', message = 'CZ403:AGENT_EXECUTION_AUTHORITY_NOT_EXACT';
  end if;

  if v_task.state <> 'AUTHORIZED' then
    raise exception using errcode = 'P0001', message = 'CZ409:AGENT_TASK_NOT_AUTHORIZED';
  end if;

  if p_runtime_kind <> 'OLLAMA_LOCAL' then
    raise exception using errcode = '22023', message = 'CZ422:UNSUPPORTED_AGENT_RUNTIME';
  end if;
  if char_length(v_runtime_name) < 1 or char_length(v_runtime_name) > 200 then
    raise exception using errcode = '22023', message = 'CZ422:INVALID_AGENT_RUNTIME_NAME';
  end if;
  if p_input_digest !~ '^[0-9a-f]{64}$' then
    raise exception using errcode = '22023', message = 'CZ422:INVALID_AGENT_INPUT_DIGEST';
  end if;

  v_payload := jsonb_build_object(
    'task_id', p_task_id,
    'runtime_kind', p_runtime_kind,
    'runtime_name', v_runtime_name,
    'input_digest', p_input_digest,
    'network_policy', 'OFF'
  );

  select replayed, saved_result
  into v_replayed, v_result
  from private.b1_begin_command(
    v_task.cell_id,
    p_agent_actor_id,
    p_command_id,
    p_idempotency_key,
    'agent.execution.start',
    v_payload
  );
  if v_replayed then return v_result; end if;

  insert into public.agent_task_executions(
    task_id,
    cell_id,
    project_id,
    agent_actor_id,
    steward_actor_id,
    delegation_id,
    operator_profile_id,
    runtime_kind,
    runtime_name,
    input_digest,
    state
  ) values (
    v_task.id,
    v_task.cell_id,
    v_task.project_id,
    v_task.agent_actor_id,
    v_task.steward_actor_id,
    v_task.delegation_id,
    auth.uid(),
    p_runtime_kind,
    v_runtime_name,
    p_input_digest,
    'STARTED'
  )
  returning id into v_execution_id;

  update public.agent_tasks
  set state = 'RUNNING',
      material_version = material_version + 1,
      updated_at = now()
  where id = v_task.id
    and state = 'AUTHORIZED';

  if not found then
    raise exception using errcode = 'P0001', message = 'CZ409:AGENT_TASK_START_RACE';
  end if;

  perform private.b1_record_event(
    v_task.cell_id,
    'AGENT_EXECUTION_STARTED',
    'AGENT_EXECUTION',
    v_execution_id,
    'AGENT_TASK',
    v_task.id,
    p_agent_actor_id,
    'agent.execute',
    'PROJECT',
    v_task.project_id,
    p_command_id,
    null,
    2,
    'PROJECT',
    jsonb_build_object(
      'task_id', v_task.id,
      'delegation_id', v_task.delegation_id,
      'runtime_kind', p_runtime_kind,
      'runtime_name', v_runtime_name,
      'input_digest', p_input_digest,
      'network_policy', 'OFF'
    )
  );

  v_result := jsonb_build_object(
    'ok', true,
    'execution_id', v_execution_id,
    'task_id', v_task.id,
    'agent_actor_id', p_agent_actor_id,
    'state', 'STARTED',
    'runtime_kind', p_runtime_kind,
    'runtime_name', v_runtime_name,
    'input_digest', p_input_digest,
    'network_policy', 'OFF'
  );

  perform private.b1_finish_command(
    p_agent_actor_id, p_idempotency_key, v_result
  );
  return v_result;
end;
$$;

create or replace function public.t3_complete_agent_execution(
  p_agent_actor_id uuid,
  p_execution_id uuid,
  p_runtime_classification text,
  p_runtime_claim_text text,
  p_runtime_limitations text,
  p_output_digest text,
  p_output_size_bytes bigint,
  p_command_id uuid,
  p_idempotency_key text
)
returns jsonb
language plpgsql
security definer
set search_path = public, private, pg_temp
as $$
declare
  v_execution public.agent_task_executions%rowtype;
  v_task public.agent_tasks%rowtype;
  v_replayed boolean;
  v_result jsonb;
  v_classification text := trim(coalesce(p_runtime_classification, ''));
  v_claim text := trim(coalesce(p_runtime_claim_text, ''));
  v_limitations text := trim(coalesce(p_runtime_limitations, ''));
  v_output_uri text;
  v_payload jsonb;
begin
  select * into v_execution
  from public.agent_task_executions
  where id = p_execution_id;
  if not found then
    raise exception using errcode = 'P0001', message = 'CZ404:AGENT_EXECUTION_NOT_FOUND';
  end if;

  if v_execution.agent_actor_id <> p_agent_actor_id then
    raise exception using errcode = '42501', message = 'CZ403:AGENT_EXECUTION_ACTOR_MISMATCH';
  end if;

  select * into v_task
  from public.agent_tasks
  where id = v_execution.task_id;

  perform private.b1_authorize_actor(
    p_agent_actor_id, 'agent.execute', 'PROJECT', v_execution.project_id
  );

  if not private.t3_execution_authority_is_exact(
    v_execution.task_id, p_agent_actor_id
  ) then
    raise exception using errcode = '42501', message = 'CZ403:AGENT_EXECUTION_AUTHORITY_NOT_EXACT';
  end if;

  if v_execution.state <> 'STARTED' or v_task.state <> 'RUNNING' then
    raise exception using errcode = 'P0001', message = 'CZ409:AGENT_EXECUTION_NOT_RUNNING';
  end if;

  if v_classification not in (
    'NO_AUTOMATIC_PATH_FOUND',
    'AUTOMATIC_PATH_FOUND',
    'INCONCLUSIVE'
  ) then
    raise exception using errcode = '22023', message = 'CZ422:INVALID_AGENT_RUNTIME_CLASSIFICATION';
  end if;
  if char_length(v_claim) < 10 or char_length(v_claim) > 4000 then
    raise exception using errcode = '22023', message = 'CZ422:INVALID_AGENT_RUNTIME_CLAIM';
  end if;
  if char_length(v_limitations) < 2 or char_length(v_limitations) > 4000 then
    raise exception using errcode = '22023', message = 'CZ422:INVALID_AGENT_RUNTIME_LIMITATIONS';
  end if;
  if p_output_digest !~ '^[0-9a-f]{64}$' then
    raise exception using errcode = '22023', message = 'CZ422:INVALID_AGENT_OUTPUT_DIGEST';
  end if;
  if p_output_size_bytes is null
     or p_output_size_bytes <= 0
     or p_output_size_bytes > 1048576 then
    raise exception using errcode = '22023', message = 'CZ422:INVALID_AGENT_OUTPUT_SIZE';
  end if;

  v_output_uri := 'urn:cz:agent-output:sha256:' || p_output_digest;

  v_payload := jsonb_build_object(
    'execution_id', p_execution_id,
    'runtime_classification', v_classification,
    'output_digest', p_output_digest,
    'output_size_bytes', p_output_size_bytes,
    'output_uri', v_output_uri
  );

  select replayed, saved_result
  into v_replayed, v_result
  from private.b1_begin_command(
    v_execution.cell_id,
    p_agent_actor_id,
    p_command_id,
    p_idempotency_key,
    'agent.execution.complete',
    v_payload
  );
  if v_replayed then return v_result; end if;

  update public.agent_task_executions
  set state = 'COMPLETED',
      runtime_classification = v_classification,
      runtime_claim_text = v_claim,
      runtime_limitations = v_limitations,
      output_uri = v_output_uri,
      output_digest = p_output_digest,
      output_size_bytes = p_output_size_bytes,
      completed_at = now()
  where id = p_execution_id
    and state = 'STARTED';

  if not found then
    raise exception using errcode = 'P0001', message = 'CZ409:AGENT_EXECUTION_COMPLETE_RACE';
  end if;

  update public.agent_tasks
  set state = 'COMPLETED',
      material_version = material_version + 1,
      updated_at = now()
  where id = v_task.id
    and state = 'RUNNING';

  if not found then
    raise exception using errcode = 'P0001', message = 'CZ409:AGENT_TASK_COMPLETE_RACE';
  end if;

  perform private.b1_record_event(
    v_execution.cell_id,
    'AGENT_EXECUTION_COMPLETED',
    'AGENT_EXECUTION',
    p_execution_id,
    'AGENT_TASK',
    v_task.id,
    p_agent_actor_id,
    'agent.execute',
    'PROJECT',
    v_execution.project_id,
    p_command_id,
    null,
    3,
    'PROJECT',
    jsonb_build_object(
      'task_id', v_task.id,
      'delegation_id', v_execution.delegation_id,
      'runtime_kind', v_execution.runtime_kind,
      'runtime_name', v_execution.runtime_name,
      'runtime_classification', v_classification,
      'output_digest', p_output_digest,
      'output_size_bytes', p_output_size_bytes,
      'output_uri', v_output_uri,
      'network_policy', 'OFF',
      'result_is_unverified_agent_output', true
    )
  );

  v_result := jsonb_build_object(
    'ok', true,
    'execution_id', p_execution_id,
    'task_id', v_task.id,
    'agent_actor_id', p_agent_actor_id,
    'state', 'COMPLETED',
    'runtime_classification', v_classification,
    'output_digest', p_output_digest,
    'output_size_bytes', p_output_size_bytes,
    'output_uri', v_output_uri,
    'result_is_unverified_agent_output', true
  );

  perform private.b1_finish_command(
    p_agent_actor_id, p_idempotency_key, v_result
  );
  return v_result;
end;
$$;

create or replace function public.t3_fail_agent_execution(
  p_agent_actor_id uuid,
  p_execution_id uuid,
  p_failure_code text,
  p_command_id uuid,
  p_idempotency_key text
)
returns jsonb
language plpgsql
security definer
set search_path = public, private, pg_temp
as $$
declare
  v_execution public.agent_task_executions%rowtype;
  v_task public.agent_tasks%rowtype;
  v_failure text := upper(trim(coalesce(p_failure_code, '')));
  v_replayed boolean;
  v_result jsonb;
  v_payload jsonb;
begin
  select * into v_execution
  from public.agent_task_executions
  where id = p_execution_id;
  if not found then
    raise exception using errcode = 'P0001', message = 'CZ404:AGENT_EXECUTION_NOT_FOUND';
  end if;

  if v_execution.agent_actor_id <> p_agent_actor_id
     or not private.b1_current_profile_controls_actor(p_agent_actor_id) then
    raise exception using errcode = '42501', message = 'CZ403:AGENT_OPERATOR_CONTROL_REQUIRED';
  end if;

  if v_execution.state <> 'STARTED' then
    raise exception using errcode = 'P0001', message = 'CZ409:AGENT_EXECUTION_NOT_RUNNING';
  end if;

  if char_length(v_failure) < 3 or char_length(v_failure) > 120
     or v_failure !~ '^[A-Z0-9_]+$' then
    raise exception using errcode = '22023', message = 'CZ422:INVALID_AGENT_FAILURE_CODE';
  end if;

  select * into v_task from public.agent_tasks where id = v_execution.task_id;

  v_payload := jsonb_build_object(
    'execution_id', p_execution_id,
    'failure_code', v_failure
  );

  select replayed, saved_result
  into v_replayed, v_result
  from private.b1_begin_command(
    v_execution.cell_id,
    p_agent_actor_id,
    p_command_id,
    p_idempotency_key,
    'agent.execution.fail',
    v_payload
  );
  if v_replayed then return v_result; end if;

  update public.agent_task_executions
  set state = 'FAILED',
      failure_code = v_failure,
      failed_at = now()
  where id = p_execution_id
    and state = 'STARTED';

  update public.agent_tasks
  set state = 'FAILED',
      material_version = material_version + 1,
      updated_at = now()
  where id = v_task.id
    and state = 'RUNNING';

  -- Failure remains attributable. This first T3 execution is short-lived, so
  -- its original delegation is expected to remain active while failure is logged.
  perform private.b1_record_event(
    v_execution.cell_id,
    'AGENT_EXECUTION_FAILED',
    'AGENT_EXECUTION',
    p_execution_id,
    'AGENT_TASK',
    v_task.id,
    p_agent_actor_id,
    'agent.execute',
    'PROJECT',
    v_execution.project_id,
    p_command_id,
    null,
    3,
    'PROJECT',
    jsonb_build_object(
      'task_id', v_task.id,
      'failure_code', v_failure,
      'network_policy', 'OFF'
    )
  );

  v_result := jsonb_build_object(
    'ok', true,
    'execution_id', p_execution_id,
    'task_id', v_task.id,
    'state', 'FAILED',
    'failure_code', v_failure
  );

  perform private.b1_finish_command(
    p_agent_actor_id, p_idempotency_key, v_result
  );
  return v_result;
end;
$$;

create or replace function public.t3_reconcile_agent_execution(p_execution_id uuid)
returns text[]
language sql
stable
security definer
set search_path = public, private, pg_temp
as $$
  with material as (
    select
      e.*,
      t.state as task_state,
      t.agent_actor_id as task_agent_actor_id,
      t.steward_actor_id as task_steward_actor_id,
      t.delegation_id as task_delegation_id,
      t.project_id as task_project_id,
      t.network_policy
    from public.agent_task_executions e
    join public.agent_tasks t on t.id = e.task_id
    where e.id = p_execution_id
  ), checks as (
    select 'missing_material' as issue
    where not exists (select 1 from material)

    union all
    select 'task_execution_identity_mismatch'
    where exists (
      select 1 from material
      where agent_actor_id <> task_agent_actor_id
         or steward_actor_id <> task_steward_actor_id
         or delegation_id <> task_delegation_id
         or project_id <> task_project_id
         or network_policy <> 'OFF'
    )

    union all
    select 'completed_material_incomplete'
    where exists (
      select 1 from material
      where state = 'COMPLETED'
        and (
          task_state <> 'COMPLETED'
          or output_digest is null
          or output_uri <> 'urn:cz:agent-output:sha256:' || output_digest
          or runtime_classification is null
          or runtime_claim_text is null
          or runtime_limitations is null
          or completed_at is null
        )
    )

    union all
    select 'failed_material_incomplete'
    where exists (
      select 1 from material
      where state = 'FAILED'
        and (task_state <> 'FAILED' or failure_code is null or failed_at is null)
    )

    union all
    select 'start_event_count'
    where (
      select count(*)
      from public.domain_events de
      where de.aggregate_type = 'AGENT_EXECUTION'
        and de.aggregate_id = p_execution_id
        and de.event_type = 'AGENT_EXECUTION_STARTED'
    ) <> 1

    union all
    select 'terminal_event_count'
    where exists (
      select 1 from material where state in ('COMPLETED','FAILED')
    )
    and (
      select count(*)
      from public.domain_events de
      where de.aggregate_type = 'AGENT_EXECUTION'
        and de.aggregate_id = p_execution_id
        and de.event_type in ('AGENT_EXECUTION_COMPLETED','AGENT_EXECUTION_FAILED')
    ) <> 1
  )
  select coalesce(array_agg(issue order by issue), '{}'::text[]) from checks;
$$;

alter table public.agent_task_executions enable row level security;

create policy agent_task_executions_read
on public.agent_task_executions
for select to authenticated using (
  private.b1_current_profile_controls_actor(agent_actor_id)
  or private.b1_current_profile_controls_actor(steward_actor_id)
  or private.can_manage_project(project_id, auth.uid())
);

revoke all on public.agent_task_executions from anon, authenticated;
grant select on public.agent_task_executions to authenticated;

revoke all on function private.t3_execution_authority_is_exact(uuid,uuid) from public;
revoke all on function public.t3_start_agent_execution(
  uuid,uuid,text,text,text,uuid,text
) from public;
revoke all on function public.t3_complete_agent_execution(
  uuid,uuid,text,text,text,text,bigint,uuid,text
) from public;
revoke all on function public.t3_fail_agent_execution(
  uuid,uuid,text,uuid,text
) from public;
revoke all on function public.t3_reconcile_agent_execution(uuid) from public;

grant execute on function public.t3_start_agent_execution(
  uuid,uuid,text,text,text,uuid,text
) to authenticated;
grant execute on function public.t3_complete_agent_execution(
  uuid,uuid,text,text,text,text,bigint,uuid,text
) to authenticated;
grant execute on function public.t3_fail_agent_execution(
  uuid,uuid,text,uuid,text
) to authenticated;
grant execute on function public.t3_reconcile_agent_execution(uuid) to authenticated;

-- DDR-BE-002 — Plan → Do → Celebrate composition bridge
--
-- Backend-only continuation of DDR-BE-001.
--
-- ADOPT:
--   T1 Need
--   T3 AI_AGENT / AgentTask / AgentExecution
--   B1 authority + events + idempotency
--
-- EXTEND minimally:
--   1. CycleBinding: composition edge from DragonCycle to canonical objects.
--   2. adjacent method-phase transitions beyond DREAMING <-> PLANNING.
--   3. fractal child-cycle creation from any OPEN parent phase.
--   4. explicit cycle close after CELEBRATING.
--
-- Preserve:
-- CycleBinding != semantic conversion
-- Need != plan record
-- AgentTask != execution
-- AgentExecution != Artifact != Claim != Evidence
-- execution result != verified result
-- method phase != object state
-- child cycle != new Project
-- child cycle may emerge in any parent phase; Celebration is one regenerative path.

create table public.cycle_bindings (
  id uuid primary key default gen_random_uuid(),

  cycle_id uuid not null
    references public.dragon_cycles(id) on delete restrict,

  source_record_id uuid
    references public.cycle_records(id) on delete restrict,

  object_type text not null
    check (
      object_type in (
        'NEED',
        'AGENT_TASK',
        'AGENT_EXECUTION'
      )
    ),

  object_id uuid not null,

  relation_type text not null
    check (
      relation_type in (
        'MATERIALIZES',
        'PLANS',
        'RESULT_OF'
      )
    ),

  created_by_actor_id uuid not null
    references public.actors(id) on delete restrict,

  created_at timestamptz not null default now(),

  unique (
    cycle_id,
    object_type,
    object_id,
    relation_type
  ),

  check (
    (
      relation_type = 'MATERIALIZES'
      and object_type = 'NEED'
      and source_record_id is not null
    )
    or
    (
      relation_type = 'PLANS'
      and object_type = 'AGENT_TASK'
      and source_record_id is not null
    )
    or
    (
      relation_type = 'RESULT_OF'
      and object_type = 'AGENT_EXECUTION'
    )
  )
);

create index cycle_bindings_cycle_created
  on public.cycle_bindings(cycle_id, created_at, id);

create index cycle_bindings_object
  on public.cycle_bindings(object_type, object_id);

create trigger cycle_bindings_append_only
before update or delete on public.cycle_bindings
for each row execute function private.prevent_append_only_mutation();


create or replace function private.ddr_binding_project(
  p_object_type text,
  p_object_id uuid
)
returns uuid
language plpgsql
stable
security definer
set search_path = public, private, pg_temp
as $$
begin
  if p_object_type = 'NEED' then
    return (
      select project_id
      from public.needs
      where id = p_object_id
    );

  elsif p_object_type = 'AGENT_TASK' then
    return (
      select project_id
      from public.agent_tasks
      where id = p_object_id
    );

  elsif p_object_type = 'AGENT_EXECUTION' then
    return (
      select project_id
      from public.agent_task_executions
      where id = p_object_id
    );
  end if;

  return null;
end;
$$;

revoke all on function private.ddr_binding_project(text, uuid)
from public;


create or replace function public.ddr_bind_cycle_object(
  p_actor_id uuid,
  p_cycle_id uuid,
  p_source_record_id uuid,
  p_object_type text,
  p_object_id uuid,
  p_relation_type text,
  p_command_id uuid,
  p_idempotency_key text
)
returns jsonb
language plpgsql
security definer
set search_path = public, private, pg_temp
as $$
declare
  v_cycle public.dragon_cycles%rowtype;
  v_project public.projects%rowtype;
  v_source public.cycle_records%rowtype;
  v_object_project uuid;

  v_replayed boolean;
  v_result jsonb;

  v_binding_id uuid;
  v_before integer;

  v_payload jsonb;
begin
  select *
  into v_cycle
  from public.dragon_cycles
  where id = p_cycle_id;

  if not found then
    raise exception using
      errcode = 'P0001',
      message = 'CZ404:DRAGON_CYCLE_NOT_FOUND';
  end if;

  if v_cycle.state <> 'OPEN' then
    raise exception using
      errcode = 'P0001',
      message = 'CZ409:CYCLE_NOT_OPEN';
  end if;

  select *
  into v_project
  from public.projects
  where id = v_cycle.project_id;

  perform private.b1_authorize_actor(
    p_actor_id,
    'cycle.manage',
    'PROJECT',
    v_cycle.project_id
  );

  if v_project.steward_actor_id <> p_actor_id
     or (
       select kind from public.actors where id = p_actor_id
     ) <> 'PERSON' then
    raise exception using
      errcode = '42501',
      message = 'CZ403:HUMAN_PROJECT_STEWARD_REQUIRED';
  end if;

  if p_object_type not in (
    'NEED',
    'AGENT_TASK',
    'AGENT_EXECUTION'
  ) then
    raise exception using
      errcode = '22023',
      message = 'CZ422:UNSUPPORTED_CYCLE_BINDING_OBJECT';
  end if;

  if p_relation_type not in (
    'MATERIALIZES',
    'PLANS',
    'RESULT_OF'
  ) then
    raise exception using
      errcode = '22023',
      message = 'CZ422:INVALID_CYCLE_BINDING_RELATION';
  end if;

  if not (
    (
      p_relation_type = 'MATERIALIZES'
      and p_object_type = 'NEED'
      and p_source_record_id is not null
    )
    or
    (
      p_relation_type = 'PLANS'
      and p_object_type = 'AGENT_TASK'
      and p_source_record_id is not null
    )
    or
    (
      p_relation_type = 'RESULT_OF'
      and p_object_type = 'AGENT_EXECUTION'
    )
  ) then
    raise exception using
      errcode = '22023',
      message = 'CZ422:INVALID_CYCLE_BINDING_SHAPE';
  end if;

  if p_source_record_id is not null then
    select *
    into v_source
    from public.cycle_records
    where id = p_source_record_id;

    if not found
       or v_source.cycle_id <> p_cycle_id then
      raise exception using
        errcode = '22023',
        message = 'CZ422:BINDING_SOURCE_RECORD_MUST_BELONG_TO_CYCLE';
    end if;

    if p_relation_type in ('MATERIALIZES','PLANS')
       and v_source.phase_context <> 'PLANNING' then
      raise exception using
        errcode = '22023',
        message = 'CZ422:PLANNING_RECORD_REQUIRED_FOR_PLAN_BINDING';
    end if;
  end if;

  v_object_project := private.ddr_binding_project(
    p_object_type,
    p_object_id
  );

  if v_object_project is null then
    raise exception using
      errcode = 'P0001',
      message = 'CZ404:CYCLE_BINDING_OBJECT_NOT_FOUND';
  end if;

  if v_object_project <> v_cycle.project_id then
    raise exception using
      errcode = '22023',
      message = 'CZ422:CROSS_PROJECT_CYCLE_BINDING_DENIED';
  end if;

  if p_object_type = 'AGENT_EXECUTION'
     and p_relation_type = 'RESULT_OF'
     and not exists (
       select 1
       from public.agent_task_executions e
       where e.id = p_object_id
         and e.state = 'COMPLETED'
     ) then
    raise exception using
      errcode = 'P0001',
      message = 'CZ409:AGENT_EXECUTION_NOT_COMPLETED';
  end if;

  v_payload := jsonb_build_object(
    'cycle_id', p_cycle_id,
    'source_record_id', p_source_record_id,
    'object_type', p_object_type,
    'object_id', p_object_id,
    'relation_type', p_relation_type
  );

  select replayed, saved_result
  into v_replayed, v_result
  from private.b1_begin_command(
    v_cycle.cell_id,
    p_actor_id,
    p_command_id,
    p_idempotency_key,
    'dragon_cycle.object.bind',
    v_payload
  );

  if v_replayed then
    return v_result;
  end if;

  select material_version
  into v_before
  from public.dragon_cycles
  where id = p_cycle_id
  for update;

  insert into public.cycle_bindings(
    cycle_id,
    source_record_id,
    object_type,
    object_id,
    relation_type,
    created_by_actor_id
  ) values (
    p_cycle_id,
    p_source_record_id,
    p_object_type,
    p_object_id,
    p_relation_type,
    p_actor_id
  )
  returning id into v_binding_id;

  update public.dragon_cycles
  set material_version = material_version + 1
  where id = p_cycle_id;

  perform private.b1_record_decision(
    v_cycle.cell_id,
    'CYCLE_OBJECT_BIND',
    'ALLOW',
    'CYCLE_BINDING',
    v_binding_id,
    p_actor_id,
    'cycle.manage',
    'PROJECT',
    v_cycle.project_id,
    'human steward bound an existing canonical object to the Dragon Cycle without changing the object semantic class',
    p_command_id,
    null,
    null,
    jsonb_build_object(
      'cycle_id', p_cycle_id,
      'source_record_id', p_source_record_id,
      'object_type', p_object_type,
      'object_id', p_object_id,
      'relation_type', p_relation_type,
      'semantic_conversion', false
    )
  );

  perform private.b1_record_event(
    v_cycle.cell_id,
    'CYCLE_OBJECT_BOUND',
    'DRAGON_CYCLE',
    p_cycle_id,
    'CYCLE_BINDING',
    v_binding_id,
    p_actor_id,
    'cycle.manage',
    'PROJECT',
    v_cycle.project_id,
    p_command_id,
    v_before,
    v_before + 1,
    'PROJECT',
    jsonb_build_object(
      'source_record_id', p_source_record_id,
      'object_type', p_object_type,
      'object_id', p_object_id,
      'relation_type', p_relation_type,
      'semantic_conversion', false
    )
  );

  v_result := jsonb_build_object(
    'ok', true,
    'cycle_binding_id', v_binding_id,
    'dragon_cycle_id', p_cycle_id,
    'object_type', p_object_type,
    'object_id', p_object_id,
    'relation_type', p_relation_type,
    'material_version', v_before + 1
  );

  perform private.b1_finish_command(
    p_actor_id,
    p_idempotency_key,
    v_result
  );

  return v_result;
end;
$$;


create or replace function public.ddr_transition_cycle_phase(
  p_actor_id uuid,
  p_cycle_id uuid,
  p_to_phase text,
  p_reason text,
  p_command_id uuid,
  p_idempotency_key text
)
returns jsonb
language plpgsql
security definer
set search_path = public, private, pg_temp
as $$
declare
  v_cycle public.dragon_cycles%rowtype;
  v_project public.projects%rowtype;

  v_replayed boolean;
  v_result jsonb;

  v_before integer;
  v_from_phase text;

  v_payload jsonb;
begin
  select *
  into v_cycle
  from public.dragon_cycles
  where id = p_cycle_id;

  if not found then
    raise exception using
      errcode = 'P0001',
      message = 'CZ404:DRAGON_CYCLE_NOT_FOUND';
  end if;

  if v_cycle.state <> 'OPEN' then
    raise exception using
      errcode = 'P0001',
      message = 'CZ409:CYCLE_NOT_OPEN';
  end if;

  select *
  into v_project
  from public.projects
  where id = v_cycle.project_id;

  perform private.b1_authorize_actor(
    p_actor_id,
    'cycle.manage',
    'PROJECT',
    v_cycle.project_id
  );

  if v_project.steward_actor_id <> p_actor_id
     or (
       select kind from public.actors where id = p_actor_id
     ) <> 'PERSON' then
    raise exception using
      errcode = '42501',
      message = 'CZ403:HUMAN_PROJECT_STEWARD_REQUIRED';
  end if;

  if char_length(trim(coalesce(p_reason, ''))) < 10
     or char_length(trim(coalesce(p_reason, ''))) > 2000 then
    raise exception using
      errcode = '22023',
      message = 'CZ422:INVALID_PHASE_REASON';
  end if;

  if not (
    (v_cycle.current_phase = 'DREAMING'
      and p_to_phase = 'PLANNING')
    or
    (v_cycle.current_phase = 'PLANNING'
      and p_to_phase = 'DREAMING')
    or
    (v_cycle.current_phase = 'PLANNING'
      and p_to_phase = 'DOING')
    or
    (v_cycle.current_phase = 'DOING'
      and p_to_phase = 'PLANNING')
    or
    (v_cycle.current_phase = 'DOING'
      and p_to_phase = 'CELEBRATING')
    or
    (v_cycle.current_phase = 'CELEBRATING'
      and p_to_phase = 'DOING')
  ) then
    raise exception using
      errcode = 'P0001',
      message = 'CZ409:INVALID_ADJACENT_PHASE_TRANSITION';
  end if;

  if v_cycle.current_phase = 'DREAMING'
     and p_to_phase = 'PLANNING'
     and v_cycle.current_direction_record_id is null then
    raise exception using
      errcode = 'P0001',
      message = 'CZ409:HUMAN_DIRECTION_REQUIRED_BEFORE_PLANNING';
  end if;

  v_payload := jsonb_build_object(
    'cycle_id', p_cycle_id,
    'from_phase', v_cycle.current_phase,
    'to_phase', p_to_phase,
    'reason', trim(p_reason)
  );

  select replayed, saved_result
  into v_replayed, v_result
  from private.b1_begin_command(
    v_cycle.cell_id,
    p_actor_id,
    p_command_id,
    p_idempotency_key,
    'dragon_cycle.phase.transition',
    v_payload
  );

  if v_replayed then
    return v_result;
  end if;

  select current_phase, material_version
  into v_from_phase, v_before
  from public.dragon_cycles
  where id = p_cycle_id
  for update;

  update public.dragon_cycles
  set current_phase = p_to_phase,
      material_version = material_version + 1
  where id = p_cycle_id;

  perform private.b1_record_decision(
    v_cycle.cell_id,
    'CYCLE_PHASE_CHANGE',
    'ALLOW',
    'DRAGON_CYCLE',
    p_cycle_id,
    p_actor_id,
    'cycle.manage',
    'PROJECT',
    v_cycle.project_id,
    trim(p_reason),
    p_command_id,
    null,
    null,
    jsonb_build_object(
      'from_phase', v_from_phase,
      'to_phase', p_to_phase
    )
  );

  perform private.b1_record_event(
    v_cycle.cell_id,
    'CYCLE_PHASE_CHANGED',
    'DRAGON_CYCLE',
    p_cycle_id,
    'DRAGON_CYCLE',
    p_cycle_id,
    p_actor_id,
    'cycle.manage',
    'PROJECT',
    v_cycle.project_id,
    p_command_id,
    v_before,
    v_before + 1,
    'PROJECT',
    jsonb_build_object(
      'from_phase', v_from_phase,
      'to_phase', p_to_phase,
      'reason', trim(p_reason)
    )
  );

  v_result := jsonb_build_object(
    'ok', true,
    'dragon_cycle_id', p_cycle_id,
    'from_phase', v_from_phase,
    'to_phase', p_to_phase,
    'material_version', v_before + 1
  );

  perform private.b1_finish_command(
    p_actor_id,
    p_idempotency_key,
    v_result
  );

  return v_result;
end;
$$;


create or replace function public.ddr_open_child_cycle(
  p_actor_id uuid,
  p_parent_cycle_id uuid,
  p_origin_record_id uuid,
  p_command_id uuid,
  p_idempotency_key text
)
returns jsonb
language plpgsql
security definer
set search_path = public, private, pg_temp
as $$
declare
  v_parent public.dragon_cycles%rowtype;
  v_project public.projects%rowtype;
  v_origin public.cycle_records%rowtype;

  v_replayed boolean;
  v_result jsonb;

  v_child_id uuid;
  v_participation_id uuid;

  v_payload jsonb;
begin
  select *
  into v_parent
  from public.dragon_cycles
  where id = p_parent_cycle_id;

  if not found then
    raise exception using
      errcode = 'P0001',
      message = 'CZ404:PARENT_CYCLE_NOT_FOUND';
  end if;

  if v_parent.state <> 'OPEN' then
    raise exception using
      errcode = 'P0001',
      message = 'CZ409:PARENT_CYCLE_NOT_OPEN';
  end if;

  select *
  into v_project
  from public.projects
  where id = v_parent.project_id;

  perform private.b1_authorize_actor(
    p_actor_id,
    'cycle.manage',
    'PROJECT',
    v_parent.project_id
  );

  if v_project.steward_actor_id <> p_actor_id
     or (
       select kind from public.actors where id = p_actor_id
     ) <> 'PERSON' then
    raise exception using
      errcode = '42501',
      message = 'CZ403:HUMAN_PROJECT_STEWARD_REQUIRED';
  end if;

  select *
  into v_origin
  from public.cycle_records
  where id = p_origin_record_id;

  if not found
     or v_origin.cycle_id <> p_parent_cycle_id then
    raise exception using
      errcode = '22023',
      message = 'CZ422:CHILD_ORIGIN_MUST_BELONG_TO_PARENT';
  end if;

  v_payload := jsonb_build_object(
    'parent_cycle_id', p_parent_cycle_id,
    'origin_record_id', p_origin_record_id,
    'origin_phase', v_origin.phase_context,
    'project_id', v_parent.project_id
  );

  select replayed, saved_result
  into v_replayed, v_result
  from private.b1_begin_command(
    v_parent.cell_id,
    p_actor_id,
    p_command_id,
    p_idempotency_key,
    'dragon_cycle.child.open',
    v_payload
  );

  if v_replayed then
    return v_result;
  end if;

  insert into public.dragon_cycles(
    cell_id,
    project_id,
    parent_cycle_id,
    origin_record_id,
    current_phase,
    current_direction_record_id,
    state,
    visibility,
    material_version,
    opened_by_actor_id
  ) values (
    v_parent.cell_id,
    v_parent.project_id,
    p_parent_cycle_id,
    p_origin_record_id,
    'DREAMING',
    null,
    'OPEN',
    'PROJECT',
    1,
    p_actor_id
  )
  returning id into v_child_id;

  insert into public.cycle_participations(
    cycle_id,
    actor_id,
    affiliation,
    social_role,
    principal_actor_id,
    mode,
    mandate,
    created_by_actor_id
  ) values (
    v_child_id,
    p_actor_id,
    'SELF',
    'STEWARD',
    null,
    'SELF',
    'Human project steward who opened this fractal child Dragon Cycle.',
    p_actor_id
  )
  returning id into v_participation_id;

  perform private.b1_record_decision(
    v_parent.cell_id,
    'CHILD_DRAGON_CYCLE_OPEN',
    'ALLOW',
    'DRAGON_CYCLE',
    v_child_id,
    p_actor_id,
    'cycle.manage',
    'PROJECT',
    v_parent.project_id,
    'human steward opened a child Dragon Cycle from an attributed record without requiring a specific parent phase',
    p_command_id,
    null,
    null,
    jsonb_build_object(
      'parent_cycle_id', p_parent_cycle_id,
      'origin_record_id', p_origin_record_id,
      'origin_phase', v_origin.phase_context,
      'fractal_child', true
    )
  );

  perform private.b1_record_event(
    v_parent.cell_id,
    'DRAGON_CYCLE_OPENED',
    'DRAGON_CYCLE',
    v_child_id,
    'DRAGON_CYCLE',
    v_child_id,
    p_actor_id,
    'cycle.manage',
    'PROJECT',
    v_parent.project_id,
    p_command_id,
    null,
    1,
    'PROJECT',
    jsonb_build_object(
      'phase', 'DREAMING',
      'state', 'OPEN',
      'parent_cycle_id', p_parent_cycle_id,
      'origin_record_id', p_origin_record_id,
      'origin_phase', v_origin.phase_context,
      'fractal_child', true
    )
  );

  perform private.b1_record_event(
    v_parent.cell_id,
    'CHILD_CYCLE_OPENED',
    'DRAGON_CYCLE',
    p_parent_cycle_id,
    'DRAGON_CYCLE',
    v_child_id,
    p_actor_id,
    'cycle.manage',
    'PROJECT',
    v_parent.project_id,
    p_command_id,
    null,
    null,
    'PROJECT',
    jsonb_build_object(
      'child_cycle_id', v_child_id,
      'origin_record_id', p_origin_record_id,
      'origin_phase', v_origin.phase_context
    )
  );

  perform private.b1_record_event(
    v_parent.cell_id,
    'CYCLE_PARTICIPANT_ADDED',
    'DRAGON_CYCLE',
    v_child_id,
    'CYCLE_PARTICIPATION',
    v_participation_id,
    p_actor_id,
    'cycle.manage',
    'PROJECT',
    v_parent.project_id,
    p_command_id,
    1,
    1,
    'PROJECT',
    jsonb_build_object(
      'actor_id', p_actor_id,
      'affiliation', 'SELF',
      'social_role', 'STEWARD',
      'mode', 'SELF'
    )
  );

  v_result := jsonb_build_object(
    'ok', true,
    'dragon_cycle_id', v_child_id,
    'parent_cycle_id', p_parent_cycle_id,
    'origin_record_id', p_origin_record_id,
    'origin_phase', v_origin.phase_context,
    'phase', 'DREAMING',
    'state', 'OPEN',
    'material_version', 1
  );

  perform private.b1_finish_command(
    p_actor_id,
    p_idempotency_key,
    v_result
  );

  return v_result;
end;
$$;


create or replace function public.ddr_close_cycle(
  p_actor_id uuid,
  p_cycle_id uuid,
  p_reason text,
  p_command_id uuid,
  p_idempotency_key text
)
returns jsonb
language plpgsql
security definer
set search_path = public, private, pg_temp
as $$
declare
  v_cycle public.dragon_cycles%rowtype;
  v_project public.projects%rowtype;

  v_replayed boolean;
  v_result jsonb;

  v_before integer;

  v_payload jsonb;
begin
  select *
  into v_cycle
  from public.dragon_cycles
  where id = p_cycle_id;

  if not found then
    raise exception using
      errcode = 'P0001',
      message = 'CZ404:DRAGON_CYCLE_NOT_FOUND';
  end if;

  if v_cycle.state <> 'OPEN' then
    raise exception using
      errcode = 'P0001',
      message = 'CZ409:CYCLE_NOT_OPEN';
  end if;

  if v_cycle.current_phase <> 'CELEBRATING' then
    raise exception using
      errcode = 'P0001',
      message = 'CZ409:CYCLE_CLOSE_REQUIRES_CELEBRATING';
  end if;

  select *
  into v_project
  from public.projects
  where id = v_cycle.project_id;

  perform private.b1_authorize_actor(
    p_actor_id,
    'cycle.manage',
    'PROJECT',
    v_cycle.project_id
  );

  if v_project.steward_actor_id <> p_actor_id
     or (
       select kind from public.actors where id = p_actor_id
     ) <> 'PERSON' then
    raise exception using
      errcode = '42501',
      message = 'CZ403:HUMAN_PROJECT_STEWARD_REQUIRED';
  end if;

  if char_length(trim(coalesce(p_reason, ''))) < 10
     or char_length(trim(coalesce(p_reason, ''))) > 2000 then
    raise exception using
      errcode = '22023',
      message = 'CZ422:INVALID_CLOSE_REASON';
  end if;

  v_payload := jsonb_build_object(
    'cycle_id', p_cycle_id,
    'reason', trim(p_reason)
  );

  select replayed, saved_result
  into v_replayed, v_result
  from private.b1_begin_command(
    v_cycle.cell_id,
    p_actor_id,
    p_command_id,
    p_idempotency_key,
    'dragon_cycle.close',
    v_payload
  );

  if v_replayed then
    return v_result;
  end if;

  select material_version
  into v_before
  from public.dragon_cycles
  where id = p_cycle_id
  for update;

  update public.dragon_cycles
  set state = 'CLOSED',
      material_version = material_version + 1,
      closed_at = now()
  where id = p_cycle_id;

  perform private.b1_record_decision(
    v_cycle.cell_id,
    'DRAGON_CYCLE_CLOSE',
    'ALLOW',
    'DRAGON_CYCLE',
    p_cycle_id,
    p_actor_id,
    'cycle.manage',
    'PROJECT',
    v_cycle.project_id,
    trim(p_reason),
    p_command_id,
    null,
    null,
    jsonb_build_object(
      'phase', 'CELEBRATING',
      'state', 'CLOSED'
    )
  );

  perform private.b1_record_event(
    v_cycle.cell_id,
    'DRAGON_CYCLE_CLOSED',
    'DRAGON_CYCLE',
    p_cycle_id,
    'DRAGON_CYCLE',
    p_cycle_id,
    p_actor_id,
    'cycle.manage',
    'PROJECT',
    v_cycle.project_id,
    p_command_id,
    v_before,
    v_before + 1,
    'PROJECT',
    jsonb_build_object(
      'phase', 'CELEBRATING',
      'state', 'CLOSED',
      'reason', trim(p_reason)
    )
  );

  v_result := jsonb_build_object(
    'ok', true,
    'dragon_cycle_id', p_cycle_id,
    'state', 'CLOSED',
    'phase', 'CELEBRATING',
    'material_version', v_before + 1
  );

  perform private.b1_finish_command(
    p_actor_id,
    p_idempotency_key,
    v_result
  );

  return v_result;
end;
$$;


alter table public.cycle_bindings
enable row level security;

revoke all on public.cycle_bindings
from anon, authenticated;

grant select on public.cycle_bindings
to authenticated;

create policy cycle_bindings_read_participant
on public.cycle_bindings
for select
to authenticated
using (
  private.ddr_can_read_cycle(cycle_id)
);

revoke all on function public.ddr_bind_cycle_object(
  uuid,uuid,uuid,text,uuid,text,uuid,text
) from public;

revoke all on function public.ddr_open_child_cycle(
  uuid,uuid,uuid,uuid,text
) from public;

revoke all on function public.ddr_close_cycle(
  uuid,uuid,text,uuid,text
) from public;

grant execute on function public.ddr_bind_cycle_object(
  uuid,uuid,uuid,text,uuid,text,uuid,text
) to authenticated;

grant execute on function public.ddr_open_child_cycle(
  uuid,uuid,uuid,uuid,text
) to authenticated;

grant execute on function public.ddr_close_cycle(
  uuid,uuid,text,uuid,text
) to authenticated;

-- CYCLE 011 / COMPANY CORE v0.1 — Company Operating Cycle
-- Maps NEED → AGREEMENT → WORK → AI CONTRIBUTION → RESULT → EVALUATION → ECONOMIC CONSEQUENCE
-- Reuses: needs, dragon_cycles, cycle_records, ai_runs (ANC-001), projects, cells, actors

-- Company Core Cycle: one full economic operating instance
-- State machine tracks founder traversal through the loop.
create table public.company_core_cycles (
  id uuid primary key default gen_random_uuid(),
  cell_id uuid not null references public.cells(id) on delete restrict,
  project_id uuid not null references public.projects(id) on delete restrict,
  dragon_cycle_id uuid not null references public.dragon_cycles(id) on delete restrict,
  owner_actor_id uuid not null references public.actors(id) on delete restrict,

  -- Need (maps to existing Need semantics; ADOPT where faithful, EXTEND where missing)
  need_id uuid references public.needs(id) on delete restrict,
  need_title text not null check (char_length(trim(need_title)) between 4 and 160),
  need_problem text not null check (char_length(trim(need_problem)) between 10 and 4000),
  need_desired_result text not null check (char_length(trim(need_desired_result)) between 10 and 2000),
  need_context text not null default '' check (char_length(need_context) <= 2000),
  need_priority text check (need_priority in ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
  need_constraints text check (need_constraints is null or char_length(need_constraints) <= 2000),
  need_confidentiality text check (need_confidentiality is null or char_length(need_confidentiality) <= 1000),

  -- Agreement / Work Definition (EXTEND: existing primitives do not capture bounded work conditions)
  agreement_expected_result text check (agreement_expected_result is null or char_length(trim(agreement_expected_result)) between 3 and 2000),
  agreement_scope text check (agreement_scope is null or char_length(trim(agreement_scope)) between 3 and 2000),
  agreement_exclusions text check (agreement_exclusions is null or char_length(agreement_exclusions) <= 2000),
  agreement_dependencies text check (agreement_dependencies is null or char_length(agreement_dependencies) <= 2000),
  agreement_evaluation_criterion text check (agreement_evaluation_criterion is null or char_length(trim(agreement_evaluation_criterion)) between 3 and 2000),
  agreement_budget_boundary text check (agreement_budget_boundary is null or char_length(agreement_budget_boundary) <= 1000),
  agreement_authority text check (agreement_authority is null or char_length(agreement_authority) <= 2000),
  agreement_deadline timestamptz,

  -- AI Run linkage (ADOPT ai_runs table)
  ai_run_id uuid references public.ai_runs(id) on delete restrict,

  -- Result (recorded by founder after reviewing AI output; AI output ≠ Result automatically)
  result_content text check (result_content is null or char_length(trim(result_content)) between 1 and 8000),
  result_recorded_by_actor_id uuid references public.actors(id) on delete restrict,
  result_recorded_at timestamptz,

  -- Evaluation (founder evaluates whether Need was actually addressed)
  evaluation_verdict text check (evaluation_verdict in ('USEFUL', 'PARTIAL', 'NOT_USEFUL', 'INCONCLUSIVE')),
  evaluation_rationale text check (evaluation_rationale is null or char_length(trim(evaluation_rationale)) <= 2000),
  evaluation_recorded_by_actor_id uuid references public.actors(id) on delete restrict,
  evaluation_recorded_at timestamptz,

  -- Economic / Operational Consequence (what actually changed)
  consequence_founder_time_minutes integer check (consequence_founder_time_minutes is null or consequence_founder_time_minutes >= 0),
  consequence_ai_cost_usd numeric(20,10) check (consequence_ai_cost_usd is null or consequence_ai_cost_usd >= 0),
  consequence_description text check (consequence_description is null or char_length(trim(consequence_description)) <= 4000),
  consequence_type text check (consequence_type in ('TIME_SAVED', 'DECISION_ENABLED', 'TASK_COMPLETED', 'AVOIDED_COST', 'NEW_CAPABILITY', 'OPPORTUNITY_CREATED', 'MONEY_SPENT', 'MONEY_EARNED', 'OTHER')),
  consequence_recorded_by_actor_id uuid references public.actors(id) on delete restrict,
  consequence_recorded_at timestamptz,

  -- State machine
  state text not null default 'NEED_CREATED'
    check (state in (
      'NEED_CREATED',
      'AGREEMENT_DEFINED',
      'WORK_AUTHORIZED',
      'AI_RUNNING',
      'AI_COMPLETED',
      'AI_FAILED',
      'RESULT_RECORDED',
      'EVALUATION_RECORDED',
      'CONSEQUENCE_RECORDED',
      'CLOSED'
    )),

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  -- Integrity: later stages require earlier stages
  check (
    (state = 'NEED_CREATED'
      and agreement_expected_result is null
      and ai_run_id is null
      and result_content is null
      and evaluation_verdict is null
      and consequence_type is null)
    or
    (state = 'AGREEMENT_DEFINED'
      and agreement_expected_result is not null
      and ai_run_id is null
      and result_content is null
      and evaluation_verdict is null
      and consequence_type is null)
    or
    (state in ('WORK_AUTHORIZED','AI_RUNNING')
      and agreement_expected_result is not null
      and result_content is null
      and evaluation_verdict is null
      and consequence_type is null)
    or
    (state in ('AI_COMPLETED','AI_FAILED')
      and agreement_expected_result is not null
      and result_content is null
      and evaluation_verdict is null
      and consequence_type is null)
    or
    (state = 'RESULT_RECORDED'
      and agreement_expected_result is not null
      and result_content is not null
      and evaluation_verdict is null
      and consequence_type is null)
    or
    (state = 'EVALUATION_RECORDED'
      and agreement_expected_result is not null
      and result_content is not null
      and evaluation_verdict is not null
      and consequence_type is null)
    or
    (state in ('CONSEQUENCE_RECORDED','CLOSED')
      and agreement_expected_result is not null
      and result_content is not null
      and evaluation_verdict is not null
      and consequence_type is not null)
  )
);

create index company_core_cycles_project_created on public.company_core_cycles(project_id, created_at desc, id);
create index company_core_cycles_owner_created on public.company_core_cycles(owner_actor_id, created_at desc, id);
create index company_core_cycles_dragon_cycle on public.company_core_cycles(dragon_cycle_id);

-- Authorize: only the cycle owner or project steward can manage a cycle
create or replace function private.can_manage_company_core_cycle(p_cycle_id uuid, p_profile_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1 from public.company_core_cycles ccc
    join public.projects p on p.id = ccc.project_id
    join public.actors a on a.id = ccc.owner_actor_id
    where ccc.id = p_cycle_id
      and a.operator_profile_id = p_profile_id
  )
  or exists (
    select 1 from public.company_core_cycles ccc
    join public.project_members pm on pm.project_id = ccc.project_id
    join public.actor_memberships am on am.actor_id = pm.actor_id
    where ccc.id = p_cycle_id
      and pm.role = 'PROJECT_STEWARD'
      and am.profile_id = p_profile_id
      and am.role in ('OWNER', 'OPERATOR', 'REPRESENTATIVE')
  );
$$;

-- Create a Company Core cycle
create or replace function public.company_core_create_cycle(
  p_actor_id uuid,
  p_project_id uuid,
  p_need_title text,
  p_need_problem text,
  p_need_desired_result text,
  p_need_context text,
  p_need_priority text,
  p_need_constraints text,
  p_need_confidentiality text,
  p_command_id uuid,
  p_idempotency_key text
)
returns jsonb
language plpgsql
security definer
set search_path = public, private, pg_temp
as $$
declare
  v_need_id uuid;
  v_cell_id uuid;
  v_profile_id uuid := auth.uid();
  v_cycle_id uuid;
  v_dragon_cycle_id uuid;
  v_replayed boolean;
  v_result jsonb;
  v_payload jsonb;
begin
  select cell_id into v_cell_id from public.projects where id = p_project_id;
  if v_cell_id is null then
    raise exception using errcode = 'P0001', message = 'CZ404:PROJECT_NOT_FOUND';
  end if;

  select replayed, saved_result into v_replayed, v_result
  from private.b1_begin_command(v_cell_id, p_actor_id, p_command_id, p_idempotency_key, 'company_core.create_cycle',
    jsonb_build_object('project_id', p_project_id, 'need_title', p_need_title));
  if v_replayed then return v_result; end if;

  -- Open a DragonCycle for this Company Core instance
  select (public.ddr_open_cycle(
    p_actor_id, p_project_id, null, null,
    gen_random_uuid(), 'company-core-cycle-' || p_command_id::text
  ) ->> 'dragon_cycle_id')::uuid into v_dragon_cycle_id;


  select (public.t1_create_need(
    p_actor_id,
    p_project_id,
    p_need_title,
    p_need_problem,
    coalesce(p_need_context, ''),
    gen_random_uuid(),
    'company-core-need-' || p_command_id::text
  )->>'need_id')::uuid
  into v_need_id;

insert into public.company_core_cycles (
    cell_id, project_id, need_id, dragon_cycle_id, owner_actor_id,
    need_title, need_problem, need_desired_result, need_context,
    need_priority, need_constraints, need_confidentiality,
    state
  ) values (
    v_cell_id, p_project_id, v_need_id, v_dragon_cycle_id, p_actor_id,
    trim(p_need_title), trim(p_need_problem), trim(p_need_desired_result), coalesce(trim(p_need_context), ''),
    p_need_priority, nullif(trim(p_need_constraints), ''), nullif(trim(p_need_confidentiality), ''),
    'NEED_CREATED'
  ) returning id into v_cycle_id;

  v_payload := jsonb_build_object('cycle_id', v_cycle_id, 'dragon_cycle_id', v_dragon_cycle_id);
  perform private.b1_record_event(v_cell_id, 'COMPANY_CORE_CYCLE_CREATED', 'COMPANY_CORE_CYCLE', v_cycle_id,
    'DRAGON_CYCLE', v_dragon_cycle_id, p_actor_id, 'cycle.manage', 'PROJECT', p_project_id, p_command_id,
    1, 2, 'PROJECT', v_payload);

  v_result := jsonb_build_object('ok', true, 'cycle_id', v_cycle_id, 'dragon_cycle_id', v_dragon_cycle_id, 'state', 'NEED_CREATED');
  perform private.b1_finish_command(p_actor_id, p_idempotency_key, v_result);
  return v_result;
end;
$$;

-- Define Agreement for a Company Core cycle
create or replace function public.company_core_define_agreement(
  p_actor_id uuid,
  p_cycle_id uuid,
  p_expected_result text,
  p_scope text,
  p_exclusions text,
  p_dependencies text,
  p_evaluation_criterion text,
  p_budget_boundary text,
  p_authority text,
  p_deadline timestamptz,
  p_command_id uuid,
  p_idempotency_key text
)
returns jsonb
language plpgsql
security definer
set search_path = public, private, pg_temp
as $$
declare
  v_cycle public.company_core_cycles%rowtype;
  v_replayed boolean;
  v_result jsonb;
begin
  select * into v_cycle from public.company_core_cycles where id = p_cycle_id;
  if not found then raise exception using errcode = 'P0001', message = 'CZ404:CYCLE_NOT_FOUND'; end if;
  if v_cycle.owner_actor_id <> p_actor_id then raise exception using errcode = '42501', message = 'CZ403:OWNER_REQUIRED'; end if;
  if v_cycle.state <> 'NEED_CREATED' then raise exception using errcode = 'P0001', message = 'CZ409:CYCLE_NOT_NEED_CREATED'; end if;

  select replayed, saved_result into v_replayed, v_result
  from private.b1_begin_command(v_cycle.cell_id, p_actor_id, p_command_id, p_idempotency_key, 'company_core.define_agreement',
    jsonb_build_object('cycle_id', p_cycle_id));
  if v_replayed then return v_result; end if;

  update public.company_core_cycles set
    agreement_expected_result = trim(p_expected_result),
    agreement_scope = nullif(trim(p_scope), ''),
    agreement_exclusions = nullif(trim(p_exclusions), ''),
    agreement_dependencies = nullif(trim(p_dependencies), ''),
    agreement_evaluation_criterion = trim(p_evaluation_criterion),
    agreement_budget_boundary = nullif(trim(p_budget_boundary), ''),
    agreement_authority = nullif(trim(p_authority), ''),
    agreement_deadline = p_deadline,
    state = 'AGREEMENT_DEFINED',
    updated_at = now()
  where id = p_cycle_id;

  perform private.b1_record_event(v_cycle.cell_id, 'COMPANY_CORE_AGREEMENT_DEFINED', 'COMPANY_CORE_CYCLE', p_cycle_id,
    'COMPANY_CORE_CYCLE', p_cycle_id, p_actor_id, 'cycle.manage', 'PROJECT', v_cycle.project_id, p_command_id,
    1, 2, 'PROJECT', jsonb_build_object('evaluation_criterion', trim(p_evaluation_criterion)));

  v_result := jsonb_build_object('ok', true, 'cycle_id', p_cycle_id, 'state', 'AGREEMENT_DEFINED');
  perform private.b1_finish_command(p_actor_id, p_idempotency_key, v_result);
  return v_result;
end;
$$;

-- Authorize work (transition to WORK_AUTHORIZED)
create or replace function public.company_core_authorize_work(
  p_actor_id uuid,
  p_cycle_id uuid,
  p_command_id uuid,
  p_idempotency_key text
)
returns jsonb
language plpgsql
security definer
set search_path = public, private, pg_temp
as $$
declare
  v_cycle public.company_core_cycles%rowtype;
  v_replayed boolean;
  v_result jsonb;
begin
  select * into v_cycle from public.company_core_cycles where id = p_cycle_id;
  if not found then raise exception using errcode = 'P0001', message = 'CZ404:CYCLE_NOT_FOUND'; end if;
  if v_cycle.owner_actor_id <> p_actor_id then raise exception using errcode = '42501', message = 'CZ403:OWNER_REQUIRED'; end if;
  if v_cycle.state <> 'AGREEMENT_DEFINED' then raise exception using errcode = 'P0001', message = 'CZ409:CYCLE_NOT_AGREEMENT_DEFINED'; end if;

  select replayed, saved_result into v_replayed, v_result
  from private.b1_begin_command(v_cycle.cell_id, p_actor_id, p_command_id, p_idempotency_key, 'company_core.authorize_work',
    jsonb_build_object('cycle_id', p_cycle_id));
  if v_replayed then return v_result; end if;

  update public.company_core_cycles set state = 'WORK_AUTHORIZED', updated_at = now() where id = p_cycle_id;

  perform private.b1_record_event(v_cycle.cell_id, 'COMPANY_CORE_WORK_AUTHORIZED', 'COMPANY_CORE_CYCLE', p_cycle_id,
    'COMPANY_CORE_CYCLE', p_cycle_id, p_actor_id, 'cycle.manage', 'PROJECT', v_cycle.project_id, p_command_id,
    1, 2, 'PROJECT', jsonb_build_object('ai_run_authorized', true, 'human_direction', false));

  v_result := jsonb_build_object('ok', true, 'cycle_id', p_cycle_id, 'state', 'WORK_AUTHORIZED');
  perform private.b1_finish_command(p_actor_id, p_idempotency_key, v_result);
  return v_result;
end;
$$;

-- Record AI Run linkage and transition state after external execution
create or replace function public.company_core_attach_ai_run(
  p_actor_id uuid,
  p_cycle_id uuid,
  p_ai_run_id uuid,
  p_command_id uuid,
  p_idempotency_key text
)
returns jsonb
language plpgsql
security definer
set search_path = public, private, pg_temp
as $$
declare
  v_cycle public.company_core_cycles%rowtype;
  v_run public.ai_runs%rowtype;
  v_replayed boolean;
  v_result jsonb;
  v_new_state text;
begin
  select * into v_cycle from public.company_core_cycles where id = p_cycle_id;
  if not found then raise exception using errcode = 'P0001', message = 'CZ404:CYCLE_NOT_FOUND'; end if;
  if v_cycle.owner_actor_id <> p_actor_id then raise exception using errcode = '42501', message = 'CZ403:OWNER_REQUIRED'; end if;
  if v_cycle.state not in ('WORK_AUTHORIZED','AI_RUNNING') then raise exception using errcode = 'P0001', message = 'CZ409:CYCLE_NOT_WORK_AUTHORIZED'; end if;

  select * into v_run from public.ai_runs where id = p_ai_run_id;
  if not found then raise exception using errcode = 'P0001', message = 'CZ404:AI_RUN_NOT_FOUND'; end if;

  v_new_state := case when v_run.state = 'COMPLETED' then 'AI_COMPLETED' when v_run.state = 'FAILED' then 'AI_FAILED' else v_cycle.state end;

  select replayed, saved_result into v_replayed, v_result
  from private.b1_begin_command(v_cycle.cell_id, p_actor_id, p_command_id, p_idempotency_key, 'company_core.attach_ai_run',
    jsonb_build_object('cycle_id', p_cycle_id, 'ai_run_id', p_ai_run_id, 'run_state', v_run.state));
  if v_replayed then return v_result; end if;

  update public.company_core_cycles set
    ai_run_id = p_ai_run_id,
    state = v_new_state,
    updated_at = now()
  where id = p_cycle_id;

  perform private.b1_record_event(v_cycle.cell_id, 'COMPANY_CORE_AI_RUN_ATTACHED', 'COMPANY_CORE_CYCLE', p_cycle_id,
    'AI_RUN', p_ai_run_id, p_actor_id, 'cycle.manage', 'PROJECT', v_cycle.project_id, p_command_id,
    1, 2, 'PROJECT', jsonb_build_object('ai_run_state', v_run.state, 'cycle_state', v_new_state));

  v_result := jsonb_build_object('ok', true, 'cycle_id', p_cycle_id, 'state', v_new_state, 'ai_run_id', p_ai_run_id);
  perform private.b1_finish_command(p_actor_id, p_idempotency_key, v_result);
  return v_result;
end;
$$;

-- Record Result (founder selects/records the deliverable after reviewing AI output)
create or replace function public.company_core_record_result(
  p_actor_id uuid,
  p_cycle_id uuid,
  p_result_content text,
  p_command_id uuid,
  p_idempotency_key text
)
returns jsonb
language plpgsql
security definer
set search_path = public, private, pg_temp
as $$
declare
  v_cycle public.company_core_cycles%rowtype;
  v_replayed boolean;
  v_result jsonb;
begin
  select * into v_cycle from public.company_core_cycles where id = p_cycle_id;
  if not found then raise exception using errcode = 'P0001', message = 'CZ404:CYCLE_NOT_FOUND'; end if;
  if v_cycle.owner_actor_id <> p_actor_id then raise exception using errcode = '42501', message = 'CZ403:OWNER_REQUIRED'; end if;
  if v_cycle.state not in ('AI_COMPLETED','AI_FAILED') then raise exception using errcode = 'P0001', message = 'CZ409:CYCLE_NOT_AI_TERMINAL'; end if;

  select replayed, saved_result into v_replayed, v_result
  from private.b1_begin_command(v_cycle.cell_id, p_actor_id, p_command_id, p_idempotency_key, 'company_core.record_result',
    jsonb_build_object('cycle_id', p_cycle_id));
  if v_replayed then return v_result; end if;

  update public.company_core_cycles set
    result_content = trim(p_result_content),
    result_recorded_by_actor_id = p_actor_id,
    result_recorded_at = now(),
    state = 'RESULT_RECORDED',
    updated_at = now()
  where id = p_cycle_id;

  perform private.b1_record_event(v_cycle.cell_id, 'COMPANY_CORE_RESULT_RECORDED', 'COMPANY_CORE_CYCLE', p_cycle_id,
    'COMPANY_CORE_CYCLE', p_cycle_id, p_actor_id, 'cycle.manage', 'PROJECT', v_cycle.project_id, p_command_id,
    1, 2, 'PROJECT', jsonb_build_object('recorded_by_human', true, 'ai_output_automatic_result', false));

  v_result := jsonb_build_object('ok', true, 'cycle_id', p_cycle_id, 'state', 'RESULT_RECORDED');
  perform private.b1_finish_command(p_actor_id, p_idempotency_key, v_result);
  return v_result;
end;
$$;

-- Record Evaluation
create or replace function public.company_core_record_evaluation(
  p_actor_id uuid,
  p_cycle_id uuid,
  p_verdict text,
  p_rationale text,
  p_command_id uuid,
  p_idempotency_key text
)
returns jsonb
language plpgsql
security definer
set search_path = public, private, pg_temp
as $$
declare
  v_cycle public.company_core_cycles%rowtype;
  v_replayed boolean;
  v_result jsonb;
begin
  select * into v_cycle from public.company_core_cycles where id = p_cycle_id;
  if not found then raise exception using errcode = 'P0001', message = 'CZ404:CYCLE_NOT_FOUND'; end if;
  if v_cycle.owner_actor_id <> p_actor_id then raise exception using errcode = '42501', message = 'CZ403:OWNER_REQUIRED'; end if;
  if v_cycle.state <> 'RESULT_RECORDED' then raise exception using errcode = 'P0001', message = 'CZ409:CYCLE_NOT_RESULT_RECORDED'; end if;
  if p_verdict not in ('USEFUL','PARTIAL','NOT_USEFUL','INCONCLUSIVE') then raise exception using errcode = 'P0001', message = 'CZ422:INVALID_VERDICT'; end if;

  select replayed, saved_result into v_replayed, v_result
  from private.b1_begin_command(v_cycle.cell_id, p_actor_id, p_command_id, p_idempotency_key, 'company_core.record_evaluation',
    jsonb_build_object('cycle_id', p_cycle_id, 'verdict', p_verdict));
  if v_replayed then return v_result; end if;

  update public.company_core_cycles set
    evaluation_verdict = p_verdict,
    evaluation_rationale = nullif(trim(p_rationale), ''),
    evaluation_recorded_by_actor_id = p_actor_id,
    evaluation_recorded_at = now(),
    state = 'EVALUATION_RECORDED',
    updated_at = now()
  where id = p_cycle_id;

  perform private.b1_record_event(v_cycle.cell_id, 'COMPANY_CORE_EVALUATION_RECORDED', 'COMPANY_CORE_CYCLE', p_cycle_id,
    'COMPANY_CORE_CYCLE', p_cycle_id, p_actor_id, 'cycle.manage', 'PROJECT', v_cycle.project_id, p_command_id,
    1, 2, 'PROJECT', jsonb_build_object('verdict', p_verdict, 'recorded_by_human', true));

  v_result := jsonb_build_object('ok', true, 'cycle_id', p_cycle_id, 'state', 'EVALUATION_RECORDED');
  perform private.b1_finish_command(p_actor_id, p_idempotency_key, v_result);
  return v_result;
end;
$$;

-- Record Economic/Operational Consequence
create or replace function public.company_core_record_consequence(
  p_actor_id uuid,
  p_cycle_id uuid,
  p_founder_time_minutes integer,
  p_ai_cost_usd numeric,
  p_description text,
  p_consequence_type text,
  p_command_id uuid,
  p_idempotency_key text
)
returns jsonb
language plpgsql
security definer
set search_path = public, private, pg_temp
as $$
declare
  v_cycle public.company_core_cycles%rowtype;
  v_replayed boolean;
  v_result jsonb;
begin
  select * into v_cycle from public.company_core_cycles where id = p_cycle_id;
  if not found then raise exception using errcode = 'P0001', message = 'CZ404:CYCLE_NOT_FOUND'; end if;
  if v_cycle.owner_actor_id <> p_actor_id then raise exception using errcode = '42501', message = 'CZ403:OWNER_REQUIRED'; end if;
  if v_cycle.state <> 'EVALUATION_RECORDED' then raise exception using errcode = 'P0001', message = 'CZ409:CYCLE_NOT_EVALUATION_RECORDED'; end if;
  if p_consequence_type not in ('TIME_SAVED','DECISION_ENABLED','TASK_COMPLETED','AVOIDED_COST','NEW_CAPABILITY','OPPORTUNITY_CREATED','MONEY_SPENT','MONEY_EARNED','OTHER') then
    raise exception using errcode = 'P0001', message = 'CZ422:INVALID_CONSEQUENCE_TYPE';
  end if;

  select replayed, saved_result into v_replayed, v_result
  from private.b1_begin_command(v_cycle.cell_id, p_actor_id, p_command_id, p_idempotency_key, 'company_core.record_consequence',
    jsonb_build_object('cycle_id', p_cycle_id, 'consequence_type', p_consequence_type));
  if v_replayed then return v_result; end if;

  update public.company_core_cycles set
    consequence_founder_time_minutes = p_founder_time_minutes,
    consequence_ai_cost_usd = p_ai_cost_usd,
    consequence_description = trim(p_description),
    consequence_type = p_consequence_type,
    consequence_recorded_by_actor_id = p_actor_id,
    consequence_recorded_at = now(),
    state = 'CONSEQUENCE_RECORDED',
    updated_at = now()
  where id = p_cycle_id;

  perform private.b1_record_event(v_cycle.cell_id, 'COMPANY_CORE_CONSEQUENCE_RECORDED', 'COMPANY_CORE_CYCLE', p_cycle_id,
    'COMPANY_CORE_CYCLE', p_cycle_id, p_actor_id, 'cycle.manage', 'PROJECT', v_cycle.project_id, p_command_id,
    1, 2, 'PROJECT', jsonb_build_object('consequence_type', p_consequence_type, 'recorded_by_human', true));

  v_result := jsonb_build_object('ok', true, 'cycle_id', p_cycle_id, 'state', 'CONSEQUENCE_RECORDED');
  perform private.b1_finish_command(p_actor_id, p_idempotency_key, v_result);
  return v_result;
end;
$$;

-- Close cycle (optional terminal state)
create or replace function public.company_core_close_cycle(
  p_actor_id uuid,
  p_cycle_id uuid,
  p_command_id uuid,
  p_idempotency_key text
)
returns jsonb
language plpgsql
security definer
set search_path = public, private, pg_temp
as $$
declare
  v_cycle public.company_core_cycles%rowtype;
  v_replayed boolean;
  v_result jsonb;
begin
  select * into v_cycle from public.company_core_cycles where id = p_cycle_id;
  if not found then raise exception using errcode = 'P0001', message = 'CZ404:CYCLE_NOT_FOUND'; end if;
  if v_cycle.owner_actor_id <> p_actor_id then raise exception using errcode = '42501', message = 'CZ403:OWNER_REQUIRED'; end if;
  if v_cycle.state not in ('CONSEQUENCE_RECORDED','AI_FAILED') then raise exception using errcode = 'P0001', message = 'CZ409:CYCLE_NOT_TERMINAL'; end if;

  select replayed, saved_result into v_replayed, v_result
  from private.b1_begin_command(v_cycle.cell_id, p_actor_id, p_command_id, p_idempotency_key, 'company_core.close_cycle',
    jsonb_build_object('cycle_id', p_cycle_id));
  if v_replayed then return v_result; end if;

  update public.company_core_cycles set state = 'CLOSED', updated_at = now() where id = p_cycle_id;

  perform private.b1_record_event(v_cycle.cell_id, 'COMPANY_CORE_CYCLE_CLOSED', 'COMPANY_CORE_CYCLE', p_cycle_id,
    'COMPANY_CORE_CYCLE', p_cycle_id, p_actor_id, 'cycle.manage', 'PROJECT', v_cycle.project_id, p_command_id,
    1, 2, 'PROJECT', jsonb_build_object('final_state', v_cycle.state));

  v_result := jsonb_build_object('ok', true, 'cycle_id', p_cycle_id, 'state', 'CLOSED');
  perform private.b1_finish_command(p_actor_id, p_idempotency_key, v_result);
  return v_result;
end;
$$;

-- RLS
alter table public.company_core_cycles enable row level security;
revoke all on public.company_core_cycles from anon, authenticated;
grant select on public.company_core_cycles to authenticated;

create policy company_core_cycles_read_owner_or_steward on public.company_core_cycles for select to authenticated
  using (private.can_manage_company_core_cycle(id, auth.uid()));

create policy company_core_cycles_insert_owner on public.company_core_cycles for insert to authenticated
  with check (owner_actor_id in (
    select a.id from public.actors a
    where a.operator_profile_id = auth.uid() and a.kind = 'PERSON'
  ));

-- Grant RPC functions
revoke all on function public.company_core_create_cycle(uuid,uuid,text,text,text,text,text,text,text,uuid,text) from public;
revoke all on function public.company_core_define_agreement(uuid,uuid,text,text,text,text,text,text,text,timestamptz,uuid,text) from public;
revoke all on function public.company_core_authorize_work(uuid,uuid,uuid,text) from public;
revoke all on function public.company_core_attach_ai_run(uuid,uuid,uuid,uuid,text) from public;
revoke all on function public.company_core_record_result(uuid,uuid,text,uuid,text) from public;
revoke all on function public.company_core_record_evaluation(uuid,uuid,text,text,uuid,text) from public;
revoke all on function public.company_core_record_consequence(uuid,uuid,integer,numeric,text,text,uuid,text) from public;
revoke all on function public.company_core_close_cycle(uuid,uuid,uuid,text) from public;

grant execute on function public.company_core_create_cycle(uuid,uuid,text,text,text,text,text,text,text,uuid,text) to authenticated;
grant execute on function public.company_core_define_agreement(uuid,uuid,text,text,text,text,text,text,text,timestamptz,uuid,text) to authenticated;
grant execute on function public.company_core_authorize_work(uuid,uuid,uuid,text) to authenticated;
grant execute on function public.company_core_attach_ai_run(uuid,uuid,uuid,uuid,text) to authenticated;
grant execute on function public.company_core_record_result(uuid,uuid,text,uuid,text) to authenticated;
grant execute on function public.company_core_record_evaluation(uuid,uuid,text,text,uuid,text) to authenticated;
grant execute on function public.company_core_record_consequence(uuid,uuid,integer,numeric,text,text,uuid,text) to authenticated;
grant execute on function public.company_core_close_cycle(uuid,uuid,uuid,text) to authenticated;

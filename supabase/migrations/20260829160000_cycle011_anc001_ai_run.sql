-- CYCLE 011 / ANC-001 — Attributable AI Run
-- AI_RUN remains distinct from AgentTask, AgentExecution, CycleRecord, Claim,
-- Evidence, Verification and Decision. Provider/model are runtime metadata.

create table public.ai_runs (
  id uuid primary key default gen_random_uuid(),
  cell_id uuid not null references public.cells(id) on delete restrict,
  project_id uuid not null references public.projects(id) on delete restrict,
  cycle_id uuid not null references public.dragon_cycles(id) on delete restrict,
  agent_actor_id uuid not null references public.actors(id) on delete restrict,
  requested_by_actor_id uuid not null references public.actors(id) on delete restrict,
  purpose text not null check (char_length(trim(purpose)) between 3 and 1000),
  provider text not null check (char_length(trim(provider)) between 1 and 120),
  model text not null check (char_length(trim(model)) between 1 and 240),
  context_manifest jsonb not null check (jsonb_typeof(context_manifest) = 'object'),
  context_manifest_canonical text not null,
  context_digest text not null check (context_digest ~ '^[0-9a-f]{64}$'),
  input_digest text not null check (input_digest ~ '^[0-9a-f]{64}$'),
  state text not null default 'PREPARED'
    check (state in ('PREPARED','RUNNING','COMPLETED','FAILED')),
  output_uri text,
  output_digest text check (output_digest is null or output_digest ~ '^[0-9a-f]{64}$'),
  output_size_bytes bigint check (output_size_bytes is null or output_size_bytes between 1 and 1048576),
  input_tokens bigint check (input_tokens is null or input_tokens >= 0),
  output_tokens bigint check (output_tokens is null or output_tokens >= 0),
  total_tokens bigint check (total_tokens is null or total_tokens >= 0),
  cost_usd numeric(20,10) check (cost_usd is null or cost_usd >= 0),
  cost_source text not null default 'UNKNOWN'
    check (cost_source in ('PROVIDER_REPORTED','CALCULATED','UNKNOWN')),
  failure_code text,
  cycle_record_id uuid unique references public.cycle_records(id) on delete restrict,
  started_at timestamptz,
  completed_at timestamptz,
  failed_at timestamptz,
  created_at timestamptz not null default now(),
  check (requested_by_actor_id <> agent_actor_id),
  check (total_tokens is null or input_tokens is null or output_tokens is null or total_tokens = input_tokens + output_tokens),
  check ((cost_source = 'UNKNOWN') = (cost_usd is null)),
  check (
    (state = 'PREPARED' and started_at is null and completed_at is null and failed_at is null
      and output_uri is null and output_digest is null and cycle_record_id is null and failure_code is null)
    or
    (state = 'RUNNING' and started_at is not null and completed_at is null and failed_at is null
      and output_uri is null and output_digest is null and cycle_record_id is null and failure_code is null)
    or
    (state = 'COMPLETED' and started_at is not null and completed_at is not null and failed_at is null
      and output_uri is not null and output_digest is not null and output_size_bytes is not null
      and cycle_record_id is not null and failure_code is null)
    or
    (state = 'FAILED' and completed_at is null and failed_at is not null
      and output_uri is null and output_digest is null and output_size_bytes is null
      and cycle_record_id is null and failure_code is not null)
  )
);

create index ai_runs_project_cycle_created on public.ai_runs(project_id, cycle_id, created_at, id);
create index ai_runs_agent_created on public.ai_runs(agent_actor_id, created_at, id);

create or replace function private.anc001_context_digest(p_context_manifest_canonical text)
returns text
language sql
immutable
set search_path = public, extensions, pg_temp
as $$
  select encode(extensions.digest(convert_to(p_context_manifest_canonical, 'UTF8'), 'sha256'), 'hex');
$$;

create or replace function private.anc001_validate_context_manifest(
  p_manifest jsonb,
  p_project_id uuid,
  p_cycle_id uuid,
  p_agent_actor_id uuid,
  p_purpose text
)
returns void
language plpgsql
security definer
set search_path = public, private, extensions, pg_temp
as $$
declare
  v_record jsonb;
  v_file jsonb;
begin
  if p_manifest ->> 'manifest_version' <> 'cz.ai-context.v1'
     or p_manifest ->> 'project_id' <> p_project_id::text
     or p_manifest ->> 'cycle_id' <> p_cycle_id::text
     or p_manifest ->> 'agent_actor_id' <> p_agent_actor_id::text
     or p_manifest ->> 'purpose' <> trim(p_purpose)
     or jsonb_typeof(p_manifest -> 'cycle_records') <> 'array'
     or jsonb_typeof(p_manifest -> 'repository_files') <> 'array'
     or jsonb_typeof(p_manifest -> 'prohibited_inferences') <> 'array'
     or jsonb_array_length(p_manifest -> 'prohibited_inferences') = 0
     or char_length(trim(coalesce(p_manifest ->> 'task', ''))) = 0
     or char_length(trim(coalesce(p_manifest ->> 'authority', ''))) = 0 then
    raise exception using errcode = '22023', message = 'CZ422:INVALID_AI_CONTEXT_MANIFEST';
  end if;

  for v_record in select value from jsonb_array_elements(p_manifest -> 'cycle_records') loop
    if coalesce(v_record ->> 'id', '') !~ '^[0-9a-f-]{36}$'
       or coalesce(v_record ->> 'content_digest', '') !~ '^[0-9a-f]{64}$'
       or not exists (
         select 1 from public.cycle_records r
         where r.id = (v_record ->> 'id')::uuid
           and r.cycle_id = p_cycle_id
           and r.content_class = v_record ->> 'content_class'
           and encode(extensions.digest(convert_to(r.content, 'UTF8'), 'sha256'), 'hex') = v_record ->> 'content_digest'
       ) then
      raise exception using errcode = '22023', message = 'CZ422:INVALID_AI_CONTEXT_RECORD';
    end if;
  end loop;

  for v_file in select value from jsonb_array_elements(p_manifest -> 'repository_files') loop
    if char_length(coalesce(v_file ->> 'path', '')) = 0
       or (v_file ->> 'path') like '/%'
       or (v_file ->> 'path') ~ '(^|/)\.\.(/|$)'
       or coalesce(v_file ->> 'digest', '') !~ '^[0-9a-f]{64}$'
       or coalesce((v_file ->> 'size_bytes')::bigint, -1) < 0 then
      raise exception using errcode = '22023', message = 'CZ422:INVALID_AI_CONTEXT_FILE';
    end if;
  end loop;
exception when invalid_text_representation then
  raise exception using errcode = '22023', message = 'CZ422:INVALID_AI_CONTEXT_MANIFEST';
end;
$$;

create or replace function private.anc001_authorize_requester(
  p_requester_actor_id uuid,
  p_project_id uuid
)
returns void
language plpgsql
security definer
set search_path = public, private, pg_temp
as $$
begin
  perform private.b1_authorize_actor(p_requester_actor_id, 'cycle.manage', 'PROJECT', p_project_id);
  if not exists (
    select 1 from public.projects p
    join public.actors a on a.id = p_requester_actor_id
    where p.id = p_project_id and p.steward_actor_id = p_requester_actor_id and a.kind = 'PERSON'
  ) then
    raise exception using errcode = '42501', message = 'CZ403:HUMAN_PROJECT_STEWARD_REQUIRED';
  end if;
end;
$$;

create or replace function public.anc001_prepare_ai_run(
  p_requester_actor_id uuid,
  p_project_id uuid,
  p_cycle_id uuid,
  p_agent_actor_id uuid,
  p_purpose text,
  p_provider text,
  p_model text,
  p_context_manifest jsonb,
  p_context_manifest_canonical text,
  p_input_digest text,
  p_command_id uuid,
  p_idempotency_key text
)
returns jsonb
language plpgsql
security definer
set search_path = public, private, extensions, pg_temp
as $$
declare
  v_cycle public.dragon_cycles%rowtype;
  v_replayed boolean;
  v_result jsonb;
  v_run_id uuid;
  v_context_digest text;
  v_canonical_manifest jsonb;
  v_payload jsonb;
begin
  perform private.anc001_authorize_requester(p_requester_actor_id, p_project_id);
  select * into v_cycle from public.dragon_cycles where id = p_cycle_id;
  if not found then raise exception using errcode = 'P0001', message = 'CZ404:DRAGON_CYCLE_NOT_FOUND'; end if;
  if v_cycle.project_id <> p_project_id then raise exception using errcode = '22023', message = 'CZ422:CYCLE_PROJECT_MISMATCH'; end if;
  if v_cycle.state <> 'OPEN' then raise exception using errcode = 'P0001', message = 'CZ409:CYCLE_NOT_OPEN'; end if;
  if not exists (select 1 from public.actors where id = p_agent_actor_id and kind = 'AI_AGENT') then
    raise exception using errcode = '22023', message = 'CZ422:AI_AGENT_REQUIRED';
  end if;
  if not exists (
    select 1 from public.cycle_participations
    where cycle_id = p_cycle_id and actor_id = p_agent_actor_id and ended_at is null
  ) then raise exception using errcode = '42501', message = 'CZ403:ACTIVE_AI_CYCLE_PARTICIPATION_REQUIRED'; end if;
  if coalesce(p_input_digest, '') !~ '^[0-9a-f]{64}$' then raise exception using errcode = '22023', message = 'CZ422:INVALID_INPUT_DIGEST'; end if;
  begin
    v_canonical_manifest := p_context_manifest_canonical::jsonb;
  exception when invalid_text_representation then
    raise exception using errcode = '22023', message = 'CZ422:INVALID_CANONICAL_CONTEXT_MANIFEST';
  end;
  if v_canonical_manifest is distinct from p_context_manifest then
    raise exception using errcode = '22023', message = 'CZ422:CANONICAL_CONTEXT_MISMATCH';
  end if;
  perform private.anc001_validate_context_manifest(p_context_manifest, p_project_id, p_cycle_id, p_agent_actor_id, p_purpose);
  v_context_digest := private.anc001_context_digest(p_context_manifest_canonical);
  v_payload := jsonb_build_object('project_id', p_project_id, 'cycle_id', p_cycle_id, 'agent_actor_id', p_agent_actor_id,
    'purpose', trim(p_purpose), 'provider', trim(p_provider), 'model', trim(p_model),
    'context_digest', v_context_digest, 'input_digest', p_input_digest);
  select replayed, saved_result into v_replayed, v_result
  from private.b1_begin_command(v_cycle.cell_id, p_requester_actor_id, p_command_id, p_idempotency_key, 'ai_run.prepare', v_payload);
  if v_replayed then return v_result; end if;
  insert into public.ai_runs(cell_id, project_id, cycle_id, agent_actor_id, requested_by_actor_id, purpose,
    provider, model, context_manifest, context_manifest_canonical, context_digest, input_digest)
  values (v_cycle.cell_id, p_project_id, p_cycle_id, p_agent_actor_id, p_requester_actor_id, trim(p_purpose),
    trim(p_provider), trim(p_model), p_context_manifest, p_context_manifest_canonical, v_context_digest, p_input_digest)
  returning id into v_run_id;
  perform private.b1_record_event(v_cycle.cell_id, 'AI_RUN_PREPARED', 'AI_RUN', v_run_id, 'AI_RUN', v_run_id,
    p_requester_actor_id, 'cycle.manage', 'PROJECT', p_project_id, p_command_id, null, 1, 'PROJECT',
    jsonb_build_object('agent_actor_id', p_agent_actor_id, 'context_digest', v_context_digest, 'authority_granted', false));
  v_result := jsonb_build_object('ok', true, 'ai_run_id', v_run_id, 'state', 'PREPARED', 'context_digest', v_context_digest);
  perform private.b1_finish_command(p_requester_actor_id, p_idempotency_key, v_result);
  return v_result;
end;
$$;

create or replace function public.anc001_start_ai_run(p_requester_actor_id uuid, p_ai_run_id uuid, p_command_id uuid, p_idempotency_key text)
returns jsonb language plpgsql security definer set search_path = public, private, pg_temp as $$
declare v_run public.ai_runs%rowtype; v_replayed boolean; v_result jsonb;
begin
  select * into v_run from public.ai_runs where id = p_ai_run_id;
  if not found then raise exception using errcode = 'P0001', message = 'CZ404:AI_RUN_NOT_FOUND'; end if;
  perform private.anc001_authorize_requester(p_requester_actor_id, v_run.project_id);
  if v_run.requested_by_actor_id <> p_requester_actor_id then raise exception using errcode = '42501', message = 'CZ403:AI_RUN_REQUESTER_REQUIRED'; end if;
  select replayed, saved_result into v_replayed, v_result from private.b1_begin_command(v_run.cell_id, p_requester_actor_id,
    p_command_id, p_idempotency_key, 'ai_run.start', jsonb_build_object('ai_run_id', p_ai_run_id));
  if v_replayed then return v_result; end if;
  update public.ai_runs set state = 'RUNNING', started_at = now() where id = p_ai_run_id and state = 'PREPARED';
  if not found then raise exception using errcode = 'P0001', message = 'CZ409:AI_RUN_NOT_PREPARED'; end if;
  perform private.b1_record_event(v_run.cell_id, 'AI_RUN_STARTED', 'AI_RUN', p_ai_run_id, 'AI_RUN', p_ai_run_id,
    p_requester_actor_id, 'cycle.manage', 'PROJECT', v_run.project_id, p_command_id, 1, 2, 'PROJECT');
  v_result := jsonb_build_object('ok', true, 'ai_run_id', p_ai_run_id, 'state', 'RUNNING');
  perform private.b1_finish_command(p_requester_actor_id, p_idempotency_key, v_result); return v_result;
end; $$;

create or replace function public.anc001_complete_ai_run(
  p_requester_actor_id uuid, p_ai_run_id uuid, p_content_class text, p_output text, p_output_digest text,
  p_output_size_bytes bigint, p_input_tokens bigint, p_output_tokens bigint, p_total_tokens bigint,
  p_cost_usd numeric, p_cost_source text, p_command_id uuid, p_idempotency_key text
)
returns jsonb language plpgsql security definer set search_path = public, private, extensions, pg_temp as $$
declare v_run public.ai_runs%rowtype; v_cycle public.dragon_cycles%rowtype; v_record_id uuid; v_replayed boolean; v_result jsonb; v_ddr_result jsonb; v_actual_digest text; v_actual_size bigint;
begin
  select * into v_run from public.ai_runs where id = p_ai_run_id;
  if not found then raise exception using errcode = 'P0001', message = 'CZ404:AI_RUN_NOT_FOUND'; end if;
  perform private.anc001_authorize_requester(p_requester_actor_id, v_run.project_id);
  if v_run.requested_by_actor_id <> p_requester_actor_id then raise exception using errcode = '42501', message = 'CZ403:AI_RUN_REQUESTER_REQUIRED'; end if;
  if v_run.state <> 'RUNNING' then raise exception using errcode = 'P0001', message = 'CZ409:AI_RUN_NOT_RUNNING'; end if;
  select * into v_cycle from public.dragon_cycles where id = v_run.cycle_id and project_id = v_run.project_id and state = 'OPEN';
  if not found then raise exception using errcode = 'P0001', message = 'CZ409:AI_RUN_CONTEXT_NOT_ACTIVE'; end if;
  if not exists (select 1 from public.cycle_participations where cycle_id = v_run.cycle_id and actor_id = v_run.agent_actor_id and ended_at is null) then
    raise exception using errcode = '42501', message = 'CZ403:ACTIVE_AI_CYCLE_PARTICIPATION_REQUIRED'; end if;
  if p_content_class not in ('INTERPRETATION','SYNTHESIS') then raise exception using errcode = '22023', message = 'CZ422:AI_RECORD_CLASS_DENIED'; end if;
  if char_length(trim(coalesce(p_output, ''))) not between 1 and 8000 then raise exception using errcode = '22023', message = 'CZ422:INVALID_AI_OUTPUT'; end if;
  v_actual_digest := encode(extensions.digest(convert_to(trim(p_output), 'UTF8'), 'sha256'), 'hex');
  v_actual_size := octet_length(convert_to(trim(p_output), 'UTF8'));
  if p_output_digest <> v_actual_digest or p_output_size_bytes <> v_actual_size then raise exception using errcode = '22023', message = 'CZ422:AI_OUTPUT_PROVENANCE_MISMATCH'; end if;
  if p_input_tokens < 0 or p_output_tokens < 0 or p_total_tokens < 0 or (p_total_tokens is not null and p_input_tokens is not null and p_output_tokens is not null and p_total_tokens <> p_input_tokens + p_output_tokens) then
    raise exception using errcode = '22023', message = 'CZ422:INVALID_TOKEN_USAGE'; end if;
  if p_cost_source not in ('PROVIDER_REPORTED','CALCULATED','UNKNOWN') or (p_cost_source = 'UNKNOWN' and p_cost_usd is not null) or p_cost_usd < 0 then
    raise exception using errcode = '22023', message = 'CZ422:INVALID_COST_OBSERVATION'; end if;
  select replayed, saved_result into v_replayed, v_result from private.b1_begin_command(v_run.cell_id, p_requester_actor_id, p_command_id,
    p_idempotency_key, 'ai_run.complete', jsonb_build_object('ai_run_id', p_ai_run_id, 'output_digest', p_output_digest, 'content_class', p_content_class));
  if v_replayed then return v_result; end if;
  v_ddr_result := public.ddr_record_cycle_record(
    v_run.agent_actor_id,
    v_run.cycle_id,
    p_content_class,
    trim(p_output),
    jsonb_build_object('source_type', 'AI_RUN', 'ai_run_id', p_ai_run_id, 'provider', v_run.provider, 'model', v_run.model,
      'requested_by_actor_id', v_run.requested_by_actor_id, 'context_digest', v_run.context_digest,
      'input_digest', v_run.input_digest, 'output_digest', p_output_digest,
      'human_direction', false, 'verification', false),
    gen_random_uuid(),
    'anc001-ddr-record:' || p_ai_run_id::text
  );
  v_record_id := (v_ddr_result ->> 'cycle_record_id')::uuid;
  update public.ai_runs set state = 'COMPLETED', output_uri = 'urn:cz:ai-output:sha256:' || p_output_digest,
    output_digest = p_output_digest, output_size_bytes = p_output_size_bytes, input_tokens = p_input_tokens,
    output_tokens = p_output_tokens, total_tokens = p_total_tokens, cost_usd = p_cost_usd, cost_source = p_cost_source,
    cycle_record_id = v_record_id, completed_at = now() where id = p_ai_run_id and state = 'RUNNING';
  perform private.b1_record_event(v_run.cell_id, 'AI_RUN_COMPLETED', 'AI_RUN', p_ai_run_id, 'CYCLE_RECORD', v_record_id,
    p_requester_actor_id, 'cycle.manage', 'PROJECT', v_run.project_id, p_command_id, 2, 3, 'PROJECT',
    jsonb_build_object('agent_actor_id', v_run.agent_actor_id, 'content_class', p_content_class, 'output_digest', p_output_digest,
      'authority_granted', false, 'human_direction', false, 'verification', false));
  v_result := jsonb_build_object('ok', true, 'ai_run_id', p_ai_run_id, 'state', 'COMPLETED', 'cycle_record_id', v_record_id);
  perform private.b1_finish_command(p_requester_actor_id, p_idempotency_key, v_result); return v_result;
end; $$;

create or replace function public.anc001_fail_ai_run(p_requester_actor_id uuid, p_ai_run_id uuid, p_failure_code text, p_command_id uuid, p_idempotency_key text)
returns jsonb language plpgsql security definer set search_path = public, private, pg_temp as $$
declare v_run public.ai_runs%rowtype; v_replayed boolean; v_result jsonb;
begin
  select * into v_run from public.ai_runs where id = p_ai_run_id;
  if not found then raise exception using errcode = 'P0001', message = 'CZ404:AI_RUN_NOT_FOUND'; end if;
  perform private.anc001_authorize_requester(p_requester_actor_id, v_run.project_id);
  if v_run.requested_by_actor_id <> p_requester_actor_id then raise exception using errcode = '42501', message = 'CZ403:AI_RUN_REQUESTER_REQUIRED'; end if;
  if char_length(trim(coalesce(p_failure_code, ''))) not between 1 and 120 then raise exception using errcode = '22023', message = 'CZ422:INVALID_FAILURE_CODE'; end if;
  select replayed, saved_result into v_replayed, v_result from private.b1_begin_command(v_run.cell_id, p_requester_actor_id, p_command_id,
    p_idempotency_key, 'ai_run.fail', jsonb_build_object('ai_run_id', p_ai_run_id, 'failure_code', trim(p_failure_code)));
  if v_replayed then return v_result; end if;
  update public.ai_runs set state = 'FAILED', failure_code = trim(p_failure_code), failed_at = now()
    where id = p_ai_run_id and state in ('PREPARED','RUNNING');
  if not found then raise exception using errcode = 'P0001', message = 'CZ409:AI_RUN_TERMINAL'; end if;
  perform private.b1_record_event(v_run.cell_id, 'AI_RUN_FAILED', 'AI_RUN', p_ai_run_id, 'AI_RUN', p_ai_run_id,
    p_requester_actor_id, 'cycle.manage', 'PROJECT', v_run.project_id, p_command_id, null, 3, 'PROJECT',
    jsonb_build_object('failure_code', trim(p_failure_code), 'output_created', false, 'cycle_record_created', false));
  v_result := jsonb_build_object('ok', true, 'ai_run_id', p_ai_run_id, 'state', 'FAILED', 'failure_code', trim(p_failure_code));
  perform private.b1_finish_command(p_requester_actor_id, p_idempotency_key, v_result); return v_result;
end; $$;

alter table public.ai_runs enable row level security;
revoke all on public.ai_runs from anon, authenticated;
grant select on public.ai_runs to authenticated;
create policy ai_runs_read_cycle_participant on public.ai_runs for select to authenticated using (private.ddr_can_read_cycle(cycle_id));

revoke all on function public.anc001_prepare_ai_run(uuid,uuid,uuid,uuid,text,text,text,jsonb,text,text,uuid,text) from public;
revoke all on function public.anc001_start_ai_run(uuid,uuid,uuid,text) from public;
revoke all on function public.anc001_complete_ai_run(uuid,uuid,text,text,text,bigint,bigint,bigint,bigint,numeric,text,uuid,text) from public;
revoke all on function public.anc001_fail_ai_run(uuid,uuid,text,uuid,text) from public;
grant execute on function public.anc001_prepare_ai_run(uuid,uuid,uuid,uuid,text,text,text,jsonb,text,text,uuid,text) to authenticated;
grant execute on function public.anc001_start_ai_run(uuid,uuid,uuid,text) to authenticated;
grant execute on function public.anc001_complete_ai_run(uuid,uuid,text,text,text,bigint,bigint,bigint,bigint,numeric,text,uuid,text) to authenticated;
grant execute on function public.anc001_fail_ai_run(uuid,uuid,text,uuid,text) to authenticated;

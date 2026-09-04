-- MOVE2-VS1 — durable, sponsored, MOCK-only AI Job plane.
-- A Job, its reservation, its PGMQ delivery and its AI Run are distinct.

create extension if not exists pgmq;
select pgmq.create('move2_vs1_ai_jobs');

do $$ begin
  create role move2_vs1_worker nologin noinherit;
exception when duplicate_object then null;
end $$;

create table public.sponsored_budget_pools (
  id uuid primary key default gen_random_uuid(),
  cell_id uuid not null references public.cells(id) on delete restrict,
  name text not null check (char_length(trim(name)) between 1 and 120),
  hard_limit_usd numeric(20,10) not null check (hard_limit_usd >= 0),
  settled_usd numeric(20,10) not null default 0 check (settled_usd >= 0),
  created_at timestamptz not null default now(),
  unique (cell_id, name),
  unique (id, cell_id),
  check (settled_usd <= hard_limit_usd)
);

create table public.sponsored_budget_reservations (
  id uuid primary key default gen_random_uuid(),
  pool_id uuid not null references public.sponsored_budget_pools(id) on delete restrict,
  cell_id uuid not null references public.cells(id) on delete restrict,
  amount_usd numeric(20,10) not null check (amount_usd > 0),
  state text not null default 'ACTIVE' check (state in ('ACTIVE','SETTLED','RELEASED','HELD_FOR_RECONCILIATION')),
  settled_usd numeric(20,10) check (settled_usd is null or settled_usd >= 0),
  created_at timestamptz not null default now(),
  settled_at timestamptz,
  unique (id, cell_id),
  foreign key (pool_id, cell_id) references public.sponsored_budget_pools(id, cell_id) on delete restrict,
  check ((state = 'SETTLED' and settled_usd is not null and settled_at is not null)
    or (state <> 'SETTLED' and settled_usd is null and settled_at is null))
);

create table public.ai_jobs (
  id uuid primary key default gen_random_uuid(),
  cell_id uuid not null references public.cells(id) on delete restrict,
  project_id uuid not null references public.projects(id) on delete restrict,
  requester_actor_id uuid not null references public.actors(id) on delete restrict,
  agent_actor_id uuid not null references public.actors(id) on delete restrict,
  ai_run_id uuid not null unique references public.ai_runs(id) on delete restrict,
  reservation_id uuid not null unique,
  provider text not null default 'MOCK' check (provider = 'MOCK'),
  state text not null default 'QUEUED' check (state in ('QUEUED','CLAIMED','DISPATCHING','SUCCEEDED','FAILED','CANCELLED','NEEDS_RECONCILIATION')),
  queue_message_id bigint unique,
  claim_token uuid,
  claim_expires_at timestamptz,
  dispatch_fence uuid unique,
  dispatch_started_at timestamptz,
  result jsonb,
  failure_code text,
  created_at timestamptz not null default now(),
  completed_at timestamptz,
  foreign key (reservation_id, cell_id) references public.sponsored_budget_reservations(id, cell_id) on delete restrict,
  check (requester_actor_id <> agent_actor_id),
  check ((state = 'QUEUED' and claim_token is null and dispatch_fence is null)
    or (state = 'CLAIMED' and claim_token is not null and claim_expires_at is not null and dispatch_fence is null)
    or (state in ('DISPATCHING','NEEDS_RECONCILIATION') and claim_token is not null and dispatch_fence is not null and dispatch_started_at is not null)
    or state in ('SUCCEEDED','FAILED','CANCELLED')),
  check ((state = 'SUCCEEDED' and result is not null and completed_at is not null)
    or state <> 'SUCCEEDED')
);

create index sponsored_budget_reservations_active on public.sponsored_budget_reservations(pool_id, amount_usd)
  where state in ('ACTIVE','HELD_FOR_RECONCILIATION');
create index ai_jobs_project_created on public.ai_jobs(project_id, created_at, id);

create or replace function private.move2_assert_budget(p_pool_id uuid)
returns void language plpgsql security definer set search_path = public, pg_temp as $$
declare v_pool public.sponsored_budget_pools%rowtype; v_reserved numeric;
begin
  select * into v_pool from public.sponsored_budget_pools where id = p_pool_id for update;
  if not found then raise exception using errcode='P0001', message='CZ404:SPONSORED_POOL_NOT_FOUND'; end if;
  select coalesce(sum(amount_usd),0) into v_reserved from public.sponsored_budget_reservations
    where pool_id=p_pool_id and state in ('ACTIVE','HELD_FOR_RECONCILIATION');
  if v_pool.settled_usd + v_reserved > v_pool.hard_limit_usd then
    raise exception using errcode='P0001', message='CZ409:SPONSORED_BUDGET_EXHAUSTED';
  end if;
end $$;

create or replace function public.move2_enqueue_sponsored_mock_job(
  p_requester_actor_id uuid, p_project_id uuid, p_cycle_id uuid, p_agent_actor_id uuid,
  p_pool_id uuid, p_reservation_usd numeric, p_purpose text, p_model text,
  p_context_manifest jsonb, p_context_manifest_canonical text, p_input_digest text,
  p_command_id uuid, p_idempotency_key text
) returns jsonb language plpgsql security definer
set search_path = public, private, pgmq, extensions, pg_temp as $$
declare v_run jsonb; v_run_id uuid; v_job_id uuid; v_reservation_id uuid; v_cell_id uuid; v_message_id bigint;
begin
  if p_reservation_usd is null or p_reservation_usd <= 0 then
    raise exception using errcode='22023', message='CZ422:INVALID_SPONSORED_RESERVATION';
  end if;
  perform private.anc001_authorize_requester(p_requester_actor_id, p_project_id);
  select cell_id into v_cell_id from public.projects where id=p_project_id;
  if not found then raise exception using errcode='P0001', message='CZ404:PROJECT_NOT_FOUND'; end if;
  -- The ANC receipt does not contain the sponsored terms. Serialize this wider
  -- command envelope, then validate those terms explicitly on replay.
  perform pg_advisory_xact_lock(hashtextextended(p_requester_actor_id::text||':'||p_idempotency_key,0));
  v_run := public.anc001_prepare_ai_run(p_requester_actor_id,p_project_id,p_cycle_id,p_agent_actor_id,
    p_purpose,'MOCK',p_model,p_context_manifest,p_context_manifest_canonical,p_input_digest,p_command_id,p_idempotency_key);
  v_run_id := (v_run->>'ai_run_id')::uuid;
  if exists (select 1 from public.ai_jobs where ai_run_id=v_run_id) then
    select j.id into v_job_id from public.ai_jobs j
      join public.sponsored_budget_reservations r on r.id=j.reservation_id
      where j.ai_run_id=v_run_id and r.pool_id=p_pool_id and r.amount_usd=p_reservation_usd;
    if v_job_id is null then raise exception using errcode='P0001',message='CZ409:AI_JOB_IDEMPOTENCY_CONFLICT'; end if;
    return jsonb_build_object('ok',true,'job_id',v_job_id,'ai_run_id',v_run_id,'state',(select state from public.ai_jobs where id=v_job_id),'replayed',true);
  end if;
  perform 1 from public.sponsored_budget_pools where id=p_pool_id and cell_id=v_cell_id for update;
  if not found then raise exception using errcode='42501', message='CZ403:SPONSORED_POOL_CELL_MISMATCH'; end if;
  perform private.move2_assert_budget(p_pool_id);
  if (select settled_usd + coalesce((select sum(amount_usd) from public.sponsored_budget_reservations
      where pool_id=p_pool_id and state in ('ACTIVE','HELD_FOR_RECONCILIATION')),0) + p_reservation_usd
      from public.sponsored_budget_pools where id=p_pool_id) >
     (select hard_limit_usd from public.sponsored_budget_pools where id=p_pool_id) then
    raise exception using errcode='P0001', message='CZ409:SPONSORED_BUDGET_EXHAUSTED';
  end if;
  insert into public.sponsored_budget_reservations(pool_id,cell_id,amount_usd)
    values(p_pool_id,v_cell_id,p_reservation_usd) returning id into v_reservation_id;
  insert into public.ai_jobs(cell_id,project_id,requester_actor_id,agent_actor_id,ai_run_id,reservation_id)
    values(v_cell_id,p_project_id,p_requester_actor_id,p_agent_actor_id,v_run_id,v_reservation_id) returning id into v_job_id;
  v_message_id := pgmq.send('move2_vs1_ai_jobs',jsonb_build_object('job_id',v_job_id));
  update public.ai_jobs set queue_message_id=v_message_id where id=v_job_id;
  return jsonb_build_object('ok',true,'job_id',v_job_id,'ai_run_id',v_run_id,'state','QUEUED','replayed',false);
end $$;

create or replace function private.move2_worker_claim(p_visibility_seconds integer default 30)
returns jsonb language plpgsql security definer set search_path = public, pgmq, pg_temp as $$
declare v_msg record; v_job public.ai_jobs%rowtype; v_token uuid;
begin
  if p_visibility_seconds not between 1 and 3600 then raise exception using errcode='22023',message='CZ422:INVALID_VISIBILITY_TIMEOUT'; end if;
  select * into v_msg from pgmq.read('move2_vs1_ai_jobs',p_visibility_seconds,1) limit 1;
  if not found then return null; end if;
  if jsonb_typeof(v_msg.message) <> 'object'
     or not (v_msg.message ? 'job_id')
     or v_msg.message <> jsonb_build_object(
       'job_id',
       v_msg.message -> 'job_id'
     ) then
    perform pgmq.archive('move2_vs1_ai_jobs',v_msg.msg_id); return null;
  end if;
  select * into v_job from public.ai_jobs where id=(v_msg.message->>'job_id')::uuid and queue_message_id=v_msg.msg_id for update;
  if not found then perform pgmq.archive('move2_vs1_ai_jobs',v_msg.msg_id); return null; end if;
  if v_job.state in ('SUCCEEDED','FAILED','CANCELLED') then
    perform pgmq.archive('move2_vs1_ai_jobs',v_msg.msg_id); return null;
  end if;
  if v_job.state in ('DISPATCHING','NEEDS_RECONCILIATION') then
    if v_job.state='DISPATCHING' then update public.ai_jobs set state='NEEDS_RECONCILIATION',failure_code='WORKER_LOST_AFTER_DISPATCH' where id=v_job.id; end if;
    perform pgmq.archive('move2_vs1_ai_jobs',v_msg.msg_id); return null;
  end if;
  if v_job.state not in ('QUEUED','CLAIMED') or (v_job.state='CLAIMED' and v_job.claim_expires_at > now()) then return null; end if;
  v_token:=gen_random_uuid();
  update public.ai_jobs set state='CLAIMED',claim_token=v_token,claim_expires_at=now()+make_interval(secs=>p_visibility_seconds) where id=v_job.id;
  return jsonb_build_object('job_id',v_job.id,'claim_token',v_token,'message_id',v_msg.msg_id,'provider','MOCK');
exception when invalid_text_representation then
  perform pgmq.archive('move2_vs1_ai_jobs',v_msg.msg_id); return null;
end $$;

create or replace function private.move2_worker_begin_dispatch(p_job_id uuid,p_claim_token uuid,p_dispatch_fence uuid)
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare v_job public.ai_jobs%rowtype;
begin
  select * into v_job from public.ai_jobs where id=p_job_id for update;
  if not found then raise exception using errcode='P0001',message='CZ404:AI_JOB_NOT_FOUND'; end if;
  if v_job.state<>'CLAIMED' or v_job.claim_token<>p_claim_token or v_job.claim_expires_at<=now() then
    raise exception using errcode='P0001',message='CZ409:AI_JOB_CLAIM_INVALID'; end if;
  update public.ai_runs set state='RUNNING',started_at=now() where id=v_job.ai_run_id and state='PREPARED';
  if not found then raise exception using errcode='P0001',message='CZ409:AI_RUN_NOT_PREPARED'; end if;
  update public.ai_jobs set state='DISPATCHING',dispatch_fence=p_dispatch_fence,dispatch_started_at=now() where id=p_job_id;
  perform private.b1_record_event(v_job.cell_id,'AI_RUN_STARTED','AI_RUN',v_job.ai_run_id,'AI_RUN',v_job.ai_run_id,
    v_job.agent_actor_id,'cycle.record','PROJECT',v_job.project_id,p_dispatch_fence,1,2,'PROJECT',
    jsonb_build_object('authority_basis','PREAUTHORIZED_AI_JOB','worker_is_agent',false,'provider','MOCK'));
  return jsonb_build_object('job_id',v_job.id,'ai_run_id',v_job.ai_run_id,'agent_actor_id',v_job.agent_actor_id,
    'requester_actor_id',v_job.requester_actor_id,'provider','MOCK','model',(select model from public.ai_runs where id=v_job.ai_run_id));
end $$;

create or replace function private.move2_worker_complete_mock(
  p_job_id uuid,p_claim_token uuid,p_dispatch_fence uuid,p_output text,p_output_digest text,p_output_size_bytes bigint,p_message_id bigint
) returns jsonb language plpgsql security definer set search_path=public,private,extensions,pgmq,pg_temp as $$
declare v_job public.ai_jobs%rowtype; v_run public.ai_runs%rowtype; v_cycle public.dragon_cycles%rowtype; v_record_id uuid; v_actual text; v_res public.sponsored_budget_reservations%rowtype;
begin
  select * into v_job from public.ai_jobs where id=p_job_id for update;
  if not found or v_job.state<>'DISPATCHING' or v_job.claim_token<>p_claim_token or v_job.dispatch_fence<>p_dispatch_fence or v_job.queue_message_id<>p_message_id then
    raise exception using errcode='P0001',message='CZ409:AI_JOB_DISPATCH_FENCE_INVALID'; end if;
  select * into v_run from public.ai_runs where id=v_job.ai_run_id and state='RUNNING';
  select * into v_cycle from public.dragon_cycles where id=v_run.cycle_id and project_id=v_job.project_id and cell_id=v_job.cell_id and state='OPEN' for update;
  if v_run.id is null or v_cycle.id is null or v_run.agent_actor_id<>v_job.agent_actor_id or v_run.requested_by_actor_id<>v_job.requester_actor_id then
    raise exception using errcode='P0001',message='CZ409:AI_JOB_CONTEXT_NOT_ACTIVE'; end if;
  if not exists(select 1 from public.cycle_participations where cycle_id=v_run.cycle_id and actor_id=v_run.agent_actor_id and ended_at is null) then
    raise exception using errcode='42501',message='CZ403:ACTIVE_AI_CYCLE_PARTICIPATION_REQUIRED'; end if;
  if char_length(trim(coalesce(p_output,''))) not between 1 and 8000 then raise exception using errcode='22023',message='CZ422:INVALID_AI_OUTPUT'; end if;
  v_actual:=encode(extensions.digest(convert_to(trim(p_output),'UTF8'),'sha256'),'hex');
  if p_output_digest<>v_actual or p_output_size_bytes<>octet_length(convert_to(trim(p_output),'UTF8')) then raise exception using errcode='22023',message='CZ422:AI_OUTPUT_PROVENANCE_MISMATCH'; end if;
  insert into public.cycle_records(cycle_id,author_actor_id,content_class,phase_context,content,visibility,provenance)
    values(v_run.cycle_id,v_run.agent_actor_id,'SYNTHESIS',v_cycle.current_phase,trim(p_output),'PROJECT',
      jsonb_build_object('source_type','AI_RUN','ai_run_id',v_run.id,'provider','MOCK','model',v_run.model,'requested_by_actor_id',v_run.requested_by_actor_id,
       'context_digest',v_run.context_digest,'input_digest',v_run.input_digest,'output_digest',p_output_digest,'human_direction',false,'verification',false,
       'claim',false,'evidence',false,'decision',false)) returning id into v_record_id;
  update public.dragon_cycles set material_version=material_version+1 where id=v_cycle.id;
  perform private.b1_record_event(v_job.cell_id,'CYCLE_RECORD_CREATED','DRAGON_CYCLE',v_cycle.id,'CYCLE_RECORD',v_record_id,
    v_run.agent_actor_id,'cycle.record','PROJECT',v_job.project_id,p_dispatch_fence,v_cycle.material_version,v_cycle.material_version+1,'PROJECT',
    jsonb_build_object('content_class','SYNTHESIS','phase_context',v_cycle.current_phase,'authority_basis','PREAUTHORIZED_AI_JOB',
      'worker_is_agent',false,'human_direction',false,'verification',false));
  update public.ai_runs set state='COMPLETED',output_uri='urn:cz:ai-output:sha256:'||p_output_digest,output_digest=p_output_digest,
    output_size_bytes=p_output_size_bytes,input_tokens=0,output_tokens=0,total_tokens=0,cost_usd=0,cost_source='CALCULATED',cycle_record_id=v_record_id,completed_at=now() where id=v_run.id;
  perform private.b1_record_event(v_job.cell_id,'AI_RUN_COMPLETED','AI_RUN',v_run.id,'CYCLE_RECORD',v_record_id,
    v_run.agent_actor_id,'cycle.record','PROJECT',v_job.project_id,p_dispatch_fence,2,3,'PROJECT',
    jsonb_build_object('agent_actor_id',v_run.agent_actor_id,'content_class','SYNTHESIS','output_digest',p_output_digest,
      'provider','MOCK','authority_granted',false,'worker_is_agent',false,'human_direction',false,'verification',false));
  select * into v_res from public.sponsored_budget_reservations where id=v_job.reservation_id for update;
  update public.sponsored_budget_reservations set state='SETTLED',settled_usd=0,settled_at=now() where id=v_res.id and state='ACTIVE';
  update public.ai_jobs set state='SUCCEEDED',result=jsonb_build_object('ai_run_id',v_run.id,'cycle_record_id',v_record_id,'output_digest',p_output_digest,
    'agent_actor_id',v_run.agent_actor_id,'completed',true,'verified',false),completed_at=now() where id=v_job.id;
  perform pgmq.archive('move2_vs1_ai_jobs',p_message_id);
  return (select result from public.ai_jobs where id=v_job.id);
end $$;

create or replace function private.move2_worker_mark_uncertain(p_job_id uuid,p_claim_token uuid,p_dispatch_fence uuid,p_message_id bigint)
returns boolean language plpgsql security definer set search_path=public,pgmq,pg_temp as $$
begin
  update public.ai_jobs set state='NEEDS_RECONCILIATION',failure_code='DISPATCH_OUTCOME_UNKNOWN'
   where id=p_job_id and state='DISPATCHING' and claim_token=p_claim_token and dispatch_fence=p_dispatch_fence and queue_message_id=p_message_id;
  if not found then return false; end if;
  update public.sponsored_budget_reservations set state='HELD_FOR_RECONCILIATION'
    where id=(select reservation_id from public.ai_jobs where id=p_job_id) and state='ACTIVE';
  perform pgmq.archive('move2_vs1_ai_jobs',p_message_id); return true;
end $$;

alter table public.sponsored_budget_pools enable row level security;
alter table public.sponsored_budget_reservations enable row level security;
alter table public.ai_jobs enable row level security;
revoke all on public.sponsored_budget_pools,public.sponsored_budget_reservations,public.ai_jobs from anon,authenticated,move2_vs1_worker;
grant select on public.sponsored_budget_pools to authenticated;
grant select on public.ai_jobs to authenticated;
create policy sponsored_pool_cell_read on public.sponsored_budget_pools for select to authenticated using(private.b1_current_profile_has_cell_access(cell_id));
create policy ai_jobs_cell_read on public.ai_jobs for select to authenticated using(private.b1_current_profile_has_cell_access(cell_id));

revoke all on function public.move2_enqueue_sponsored_mock_job(uuid,uuid,uuid,uuid,uuid,numeric,text,text,jsonb,text,text,uuid,text) from public;
grant execute on function public.move2_enqueue_sponsored_mock_job(uuid,uuid,uuid,uuid,uuid,numeric,text,text,jsonb,text,text,uuid,text) to authenticated;
revoke all on function private.move2_assert_budget(uuid),private.move2_worker_claim(integer),private.move2_worker_begin_dispatch(uuid,uuid,uuid),private.move2_worker_complete_mock(uuid,uuid,uuid,text,text,bigint,bigint),private.move2_worker_mark_uncertain(uuid,uuid,uuid,bigint) from public;
grant usage on schema private to move2_vs1_worker;
grant execute on function private.move2_worker_claim(integer),private.move2_worker_begin_dispatch(uuid,uuid,uuid),private.move2_worker_complete_mock(uuid,uuid,uuid,text,text,bigint,bigint),private.move2_worker_mark_uncertain(uuid,uuid,uuid,bigint) to move2_vs1_worker;

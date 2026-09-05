-- HABITABLE-V0-VS1 — one durable Moonshot/Kimi path through Vercel AI Gateway.
-- The private request is execution material, not a public Company Core record.

alter table public.ai_jobs drop constraint ai_jobs_provider_check;
alter table public.ai_jobs add constraint ai_jobs_provider_check
  check (provider in ('MOCK','moonshotai'));

create table private.ai_job_inference_requests (
  job_id uuid primary key references public.ai_jobs(id) on delete restrict,
  provider text not null check (provider = 'moonshotai'),
  model text not null check (model = 'moonshotai/kimi-k2.6'),
  envelope jsonb not null check (jsonb_typeof(envelope) = 'object'),
  envelope_canonical text not null,
  envelope_digest text not null check (envelope_digest ~ '^[0-9a-f]{64}$'),
  created_at timestamptz not null default now(),
  check (envelope_canonical = envelope::text)
);

revoke all on private.ai_job_inference_requests from public, anon, authenticated, move2_vs1_worker;

create or replace function public.company_core_authorize_and_enqueue_ai(
  p_actor_id uuid,
  p_cycle_id uuid,
  p_agent_actor_id uuid,
  p_pool_id uuid,
  p_reservation_usd numeric,
  p_inference_envelope jsonb,
  p_context_manifest jsonb,
  p_context_manifest_canonical text,
  p_command_id uuid,
  p_idempotency_key text
) returns jsonb language plpgsql security definer
set search_path=public,private,pgmq,extensions,pg_temp as $$
declare
  v_cycle public.company_core_cycles%rowtype;
  v_authorized jsonb;
  v_run jsonb;
  v_run_id uuid;
  v_job_id uuid;
  v_reservation_id uuid;
  v_message_id bigint;
  v_canonical text;
  v_digest text;
  v_purpose text;
begin
  select * into v_cycle from public.company_core_cycles where id=p_cycle_id for update;
  if not found then raise exception using errcode='P0001',message='CZ404:CYCLE_NOT_FOUND'; end if;
  perform private.b1_authorize_actor(p_actor_id,'cycle.manage','PROJECT',v_cycle.project_id);
  if v_cycle.owner_actor_id<>p_actor_id then raise exception using errcode='42501',message='CZ403:OWNER_REQUIRED'; end if;
  if p_reservation_usd is null or p_reservation_usd<=0 then
    raise exception using errcode='22023',message='CZ422:INVALID_SPONSORED_RESERVATION';
  end if;
  if p_inference_envelope is null
     or jsonb_typeof(p_inference_envelope)<>'object'
     or (select coalesce(array_agg(k order by k),'{}'::text[]) from jsonb_object_keys(p_inference_envelope) k)
        <> array['max_tokens','messages','model','provider','temperature']::text[]
     or p_inference_envelope->>'provider'<>'moonshotai'
     or p_inference_envelope->>'model'<>'moonshotai/kimi-k2.6'
     or jsonb_typeof(p_inference_envelope->'messages')<>'array'
     or jsonb_array_length(p_inference_envelope->'messages')<2
     or p_inference_envelope->'messages'->0->>'role'<>'system'
     or jsonb_typeof(p_inference_envelope->'temperature')<>'number'
     or jsonb_typeof(p_inference_envelope->'max_tokens')<>'number'
     or (p_inference_envelope->>'max_tokens')::integer<=0 then
    raise exception using errcode='22023',message='CZ422:INVALID_INFERENCE_ENVELOPE';
  end if;
  if exists (
    select 1 from jsonb_array_elements(p_inference_envelope->'messages') m
    where jsonb_typeof(m)<>'object' or m->>'role' not in ('system','user','assistant')
      or jsonb_typeof(m->'content')<>'string'
  ) then raise exception using errcode='22023',message='CZ422:INVALID_INFERENCE_MESSAGES'; end if;

  v_canonical:=p_inference_envelope::text;
  v_digest:=encode(extensions.digest(convert_to(v_canonical,'UTF8'),'sha256'),'hex');
  -- Recover the already-linked execution before attempting a lifecycle
  -- transition. Independent worker progress must not break command replay.
  if v_cycle.ai_run_id is not null then
    perform private.anc001_authorize_requester(p_actor_id, v_cycle.project_id);
    select j.id into v_job_id from public.ai_jobs j
      join public.sponsored_budget_reservations r on r.id=j.reservation_id
      join private.ai_job_inference_requests q on q.job_id=j.id
      join public.ai_runs ar on ar.id=j.ai_run_id
      where j.ai_run_id=v_cycle.ai_run_id and j.provider='moonshotai'
        and j.requester_actor_id=p_actor_id and j.agent_actor_id=p_agent_actor_id
        and r.pool_id=p_pool_id and r.amount_usd=p_reservation_usd
        and q.provider='moonshotai' and q.model='moonshotai/kimi-k2.6'
        and q.envelope_digest=v_digest
        and ar.provider='moonshotai' and ar.model='moonshotai/kimi-k2.6'
        and ar.requested_by_actor_id=p_actor_id and ar.agent_actor_id=p_agent_actor_id
        and ar.input_digest=v_digest;
    if v_job_id is null then raise exception using errcode='P0001',message='CZ409:AI_JOB_IDEMPOTENCY_CONFLICT'; end if;
    return jsonb_build_object('ok',true,'cycle_id',p_cycle_id,'state',v_cycle.state,
      'job_id',v_job_id,'ai_run_id',v_cycle.ai_run_id,'inference_envelope_digest',v_digest,'replayed',true);
  end if;

  -- One transaction: any later error rolls back this human authorization too.
  v_authorized:=public.company_core_authorize_work(
    p_actor_id,p_cycle_id,p_command_id,p_idempotency_key||':authorize');

  perform 1 from public.sponsored_budget_pools
    where id=p_pool_id and cell_id=v_cycle.cell_id for update;
  if not found then raise exception using errcode='42501',message='CZ403:SPONSORED_POOL_CELL_MISMATCH'; end if;
  perform private.move2_assert_budget(p_pool_id);
  if (select settled_usd + coalesce((select sum(amount_usd) from public.sponsored_budget_reservations
      where pool_id=p_pool_id and state in ('ACTIVE','HELD_FOR_RECONCILIATION')),0) + p_reservation_usd
      from public.sponsored_budget_pools where id=p_pool_id) >
     (select hard_limit_usd from public.sponsored_budget_pools where id=p_pool_id) then
    raise exception using errcode='P0001',message='CZ409:SPONSORED_BUDGET_EXHAUSTED';
  end if;

  v_purpose:='Company Core cycle '||p_cycle_id::text||': '||v_cycle.need_title;
  v_run:=public.anc001_prepare_ai_run(
    p_actor_id,v_cycle.project_id,v_cycle.dragon_cycle_id,p_agent_actor_id,v_purpose,
    'moonshotai','moonshotai/kimi-k2.6',p_context_manifest,p_context_manifest_canonical,v_digest,
    gen_random_uuid(),p_idempotency_key||':prepare');
  v_run_id:=(v_run->>'ai_run_id')::uuid;

  insert into public.sponsored_budget_reservations(pool_id,cell_id,amount_usd)
    values(p_pool_id,v_cycle.cell_id,p_reservation_usd) returning id into v_reservation_id;
  insert into public.ai_jobs(cell_id,project_id,requester_actor_id,agent_actor_id,ai_run_id,reservation_id,provider)
    values(v_cycle.cell_id,v_cycle.project_id,p_actor_id,p_agent_actor_id,v_run_id,v_reservation_id,'moonshotai')
    returning id into v_job_id;
  insert into private.ai_job_inference_requests(job_id,provider,model,envelope,envelope_canonical,envelope_digest)
    values(v_job_id,'moonshotai','moonshotai/kimi-k2.6',p_inference_envelope,v_canonical,v_digest);
  v_message_id:=pgmq.send('move2_vs1_ai_jobs',jsonb_build_object('job_id',v_job_id));
  update public.ai_jobs set queue_message_id=v_message_id where id=v_job_id;
  update public.company_core_cycles set ai_run_id=v_run_id,updated_at=now() where id=p_cycle_id;
  perform private.b1_record_event(v_cycle.cell_id,'COMPANY_CORE_AI_JOB_ENQUEUED','COMPANY_CORE_CYCLE',p_cycle_id,
    'AI_RUN',v_run_id,p_actor_id,'cycle.manage','PROJECT',v_cycle.project_id,p_command_id,2,3,'PROJECT',
    jsonb_build_object('job_id',v_job_id,'provider','moonshotai','model','moonshotai/kimi-k2.6',
      'reservation_usd',p_reservation_usd,'inference_envelope_digest',v_digest));
  return jsonb_build_object('ok',true,'cycle_id',p_cycle_id,'state','WORK_AUTHORIZED',
    'job_id',v_job_id,'ai_run_id',v_run_id,'inference_envelope_digest',v_digest);
end $$;

create or replace function private.move2_worker_claim(p_visibility_seconds integer default 30)
returns jsonb language plpgsql security definer set search_path=public,pgmq,pg_temp as $$
declare v_msg record; v_job public.ai_jobs%rowtype; v_token uuid;
begin
  if p_visibility_seconds not between 1 and 3600 then raise exception using errcode='22023',message='CZ422:INVALID_VISIBILITY_TIMEOUT'; end if;
  select * into v_msg from pgmq.read('move2_vs1_ai_jobs',p_visibility_seconds,1) limit 1;
  if not found then return null; end if;
  if jsonb_typeof(v_msg.message)<>'object' or not(v_msg.message?'job_id')
     or v_msg.message<>jsonb_build_object('job_id',v_msg.message->'job_id') then
    perform pgmq.archive('move2_vs1_ai_jobs',v_msg.msg_id); return null;
  end if;
  select * into v_job from public.ai_jobs where id=(v_msg.message->>'job_id')::uuid and queue_message_id=v_msg.msg_id for update;
  if not found then perform pgmq.archive('move2_vs1_ai_jobs',v_msg.msg_id); return null; end if;
  if v_job.state in ('SUCCEEDED','FAILED','CANCELLED') then perform pgmq.archive('move2_vs1_ai_jobs',v_msg.msg_id); return null; end if;
  if v_job.state in ('DISPATCHING','NEEDS_RECONCILIATION') then
    if v_job.state='DISPATCHING' then
      update public.ai_jobs set state='NEEDS_RECONCILIATION',failure_code='WORKER_LOST_AFTER_DISPATCH' where id=v_job.id;
      update public.sponsored_budget_reservations set state='HELD_FOR_RECONCILIATION' where id=v_job.reservation_id and state='ACTIVE';
    end if;
    perform pgmq.archive('move2_vs1_ai_jobs',v_msg.msg_id); return null;
  end if;
  if v_job.state not in ('QUEUED','CLAIMED') or (v_job.state='CLAIMED' and v_job.claim_expires_at>now()) then return null; end if;
  v_token:=gen_random_uuid();
  update public.ai_jobs set state='CLAIMED',claim_token=v_token,claim_expires_at=now()+make_interval(secs=>p_visibility_seconds) where id=v_job.id;
  return jsonb_build_object('job_id',v_job.id,'claim_token',v_token,'message_id',v_msg.msg_id,'provider',v_job.provider);
exception when invalid_text_representation then
  perform pgmq.archive('move2_vs1_ai_jobs',v_msg.msg_id); return null;
end $$;

create or replace function private.move2_worker_begin_dispatch(p_job_id uuid,p_claim_token uuid,p_dispatch_fence uuid)
returns jsonb language plpgsql security definer set search_path=public,private,pg_temp as $$
declare v_job public.ai_jobs%rowtype; v_request private.ai_job_inference_requests%rowtype;
begin
  select * into v_job from public.ai_jobs where id=p_job_id for update;
  if not found then raise exception using errcode='P0001',message='CZ404:AI_JOB_NOT_FOUND'; end if;
  if v_job.state<>'CLAIMED' or v_job.claim_token<>p_claim_token or v_job.claim_expires_at<=now() then
    raise exception using errcode='P0001',message='CZ409:AI_JOB_CLAIM_INVALID'; end if;
  if v_job.provider='moonshotai' then
    select * into v_request from private.ai_job_inference_requests where job_id=v_job.id;
    if not found then raise exception using errcode='P0001',message='CZ409:DURABLE_INFERENCE_REQUEST_MISSING'; end if;
  elsif v_job.provider<>'MOCK' then raise exception using errcode='22023',message='CZ422:PROVIDER_DENIED'; end if;
  update public.ai_runs set state='RUNNING',started_at=now() where id=v_job.ai_run_id and state='PREPARED';
  if not found then raise exception using errcode='P0001',message='CZ409:AI_RUN_NOT_PREPARED'; end if;
  update public.ai_jobs set state='DISPATCHING',dispatch_fence=p_dispatch_fence,dispatch_started_at=now() where id=p_job_id;
  update public.company_core_cycles set state='AI_RUNNING',updated_at=now()
    where ai_run_id=v_job.ai_run_id and state='WORK_AUTHORIZED';
  perform private.b1_record_event(v_job.cell_id,'AI_RUN_STARTED','AI_RUN',v_job.ai_run_id,'AI_RUN',v_job.ai_run_id,
    v_job.agent_actor_id,'cycle.record','PROJECT',v_job.project_id,p_dispatch_fence,1,2,'PROJECT',
    jsonb_build_object('authority_basis','PREAUTHORIZED_AI_JOB','worker_is_agent',false,'provider',v_job.provider));
  return jsonb_build_object('job_id',v_job.id,'ai_run_id',v_job.ai_run_id,'provider',v_job.provider,
    'model',(select model from public.ai_runs where id=v_job.ai_run_id),
    'request_canonical',case when v_job.provider='moonshotai' then v_request.envelope_canonical else null end,
    'request_digest',case when v_job.provider='moonshotai' then v_request.envelope_digest else null end);
end $$;

create or replace function private.move2_worker_complete_provider(
  p_job_id uuid,p_claim_token uuid,p_dispatch_fence uuid,p_output text,p_output_digest text,p_output_size_bytes bigint,
  p_input_tokens bigint,p_output_tokens bigint,p_total_tokens bigint,p_actual_cost_usd numeric,p_cost_source text,p_message_id bigint
) returns jsonb language plpgsql security definer set search_path=public,private,extensions,pgmq,pg_temp as $$
declare v_job public.ai_jobs%rowtype; v_run public.ai_runs%rowtype; v_cycle public.dragon_cycles%rowtype;
  v_record_id uuid; v_actual text; v_res public.sponsored_budget_reservations%rowtype; v_reconcile boolean;
begin
  select * into v_job from public.ai_jobs where id=p_job_id for update;
  if not found or v_job.provider<>'moonshotai' or v_job.state<>'DISPATCHING' or v_job.claim_token<>p_claim_token
     or v_job.dispatch_fence<>p_dispatch_fence or v_job.queue_message_id<>p_message_id then
    raise exception using errcode='P0001',message='CZ409:AI_JOB_DISPATCH_FENCE_INVALID'; end if;
  select * into v_run from public.ai_runs where id=v_job.ai_run_id and state='RUNNING';
  select * into v_cycle from public.dragon_cycles where id=v_run.cycle_id and project_id=v_job.project_id and cell_id=v_job.cell_id and state='OPEN' for update;
  if v_run.id is null or v_cycle.id is null or v_run.agent_actor_id<>v_job.agent_actor_id
     or v_run.requested_by_actor_id<>v_job.requester_actor_id then
    raise exception using errcode='P0001',message='CZ409:AI_JOB_CONTEXT_NOT_ACTIVE'; end if;
  if not exists(select 1 from public.cycle_participations
      where cycle_id=v_run.cycle_id and actor_id=v_run.agent_actor_id and ended_at is null) then
    raise exception using errcode='42501',message='CZ403:ACTIVE_AI_CYCLE_PARTICIPATION_REQUIRED'; end if;
  if char_length(trim(coalesce(p_output,''))) not between 1 and 8000 then raise exception using errcode='22023',message='CZ422:INVALID_AI_OUTPUT'; end if;
  v_actual:=encode(extensions.digest(convert_to(trim(p_output),'UTF8'),'sha256'),'hex');
  if p_output_digest<>v_actual or p_output_size_bytes<>octet_length(convert_to(trim(p_output),'UTF8')) then
    raise exception using errcode='22023',message='CZ422:AI_OUTPUT_PROVENANCE_MISMATCH'; end if;
  if p_input_tokens<0 or p_output_tokens<0 or p_total_tokens<>p_input_tokens+p_output_tokens then
    raise exception using errcode='22023',message='CZ422:INVALID_TOKEN_USAGE'; end if;
  if p_cost_source not in ('PROVIDER_REPORTED','UNKNOWN')
     or (p_cost_source='UNKNOWN' and p_actual_cost_usd is not null)
     or (p_cost_source='PROVIDER_REPORTED' and (p_actual_cost_usd is null or p_actual_cost_usd<0)) then
    raise exception using errcode='22023',message='CZ422:INVALID_COST'; end if;
  insert into public.cycle_records(cycle_id,author_actor_id,content_class,phase_context,content,visibility,provenance)
    values(v_run.cycle_id,v_run.agent_actor_id,'SYNTHESIS',v_cycle.current_phase,trim(p_output),'PROJECT',
      jsonb_build_object('source_type','AI_RUN','ai_run_id',v_run.id,'provider','moonshotai','model',v_run.model,
       'requested_by_actor_id',v_run.requested_by_actor_id,'context_digest',v_run.context_digest,'input_digest',v_run.input_digest,
       'output_digest',p_output_digest,'human_direction',false,'verification',false,'claim',false,'evidence',false,'decision',false)) returning id into v_record_id;
  update public.dragon_cycles set material_version=material_version+1 where id=v_cycle.id;
  perform private.b1_record_event(v_job.cell_id,'CYCLE_RECORD_CREATED','DRAGON_CYCLE',v_cycle.id,'CYCLE_RECORD',v_record_id,
    v_run.agent_actor_id,'cycle.record','PROJECT',v_job.project_id,p_dispatch_fence,v_cycle.material_version,v_cycle.material_version+1,'PROJECT',
    jsonb_build_object('content_class','SYNTHESIS','phase_context',v_cycle.current_phase,'authority_basis','PREAUTHORIZED_AI_JOB',
      'worker_is_agent',false,'human_direction',false,'verification',false));
  update public.ai_runs set state='COMPLETED',output_uri='urn:cz:ai-output:sha256:'||p_output_digest,output_digest=p_output_digest,
    output_size_bytes=p_output_size_bytes,input_tokens=p_input_tokens,output_tokens=p_output_tokens,total_tokens=p_total_tokens,
    cost_usd=p_actual_cost_usd,cost_source=p_cost_source,cycle_record_id=v_record_id,completed_at=now() where id=v_run.id;
  perform private.b1_record_event(v_job.cell_id,'AI_RUN_COMPLETED','AI_RUN',v_run.id,'CYCLE_RECORD',v_record_id,
    v_run.agent_actor_id,'cycle.record','PROJECT',v_job.project_id,p_dispatch_fence,2,3,'PROJECT',
    jsonb_build_object('agent_actor_id',v_run.agent_actor_id,'content_class','SYNTHESIS','output_digest',p_output_digest,
      'provider','moonshotai','authority_granted',false,'worker_is_agent',false,'human_direction',false,'verification',false));
  select * into v_res from public.sponsored_budget_reservations where id=v_job.reservation_id for update;
  v_reconcile:=p_actual_cost_usd is null or p_actual_cost_usd>v_res.amount_usd;
  if v_reconcile then
    update public.sponsored_budget_reservations set state='HELD_FOR_RECONCILIATION' where id=v_res.id and state='ACTIVE';
    update public.ai_jobs set state='NEEDS_RECONCILIATION',failure_code=case when p_actual_cost_usd is null then 'ACTUAL_COST_UNKNOWN' else 'ACTUAL_COST_EXCEEDS_RESERVATION' end,
      result=jsonb_build_object('ai_run_id',v_run.id,'cycle_record_id',v_record_id,'output_digest',p_output_digest,'actual_cost_usd',p_actual_cost_usd,
        'cost_source',p_cost_source,'completed',true,'verified',false),completed_at=now() where id=v_job.id;
  else
    update public.sponsored_budget_pools set settled_usd=settled_usd+p_actual_cost_usd where id=v_res.pool_id;
    update public.sponsored_budget_reservations set state='SETTLED',settled_usd=p_actual_cost_usd,settled_at=now() where id=v_res.id and state='ACTIVE';
    update public.ai_jobs set state='SUCCEEDED',result=jsonb_build_object('ai_run_id',v_run.id,'cycle_record_id',v_record_id,'output_digest',p_output_digest,
      'actual_cost_usd',p_actual_cost_usd,'cost_source',p_cost_source,'completed',true,'verified',false),completed_at=now() where id=v_job.id;
  end if;
  update public.company_core_cycles set state='AI_COMPLETED',updated_at=now() where ai_run_id=v_run.id and state='AI_RUNNING';
  perform pgmq.archive('move2_vs1_ai_jobs',p_message_id);
  return (select result||jsonb_build_object('job_state',state) from public.ai_jobs where id=v_job.id);
end $$;

create or replace function private.move2_worker_fail_provider(
  p_job_id uuid,p_claim_token uuid,p_dispatch_fence uuid,p_failure_code text,p_message_id bigint
) returns boolean language plpgsql security definer set search_path=public,pgmq,pg_temp as $$
declare v_job public.ai_jobs%rowtype;
begin
  select * into v_job from public.ai_jobs where id=p_job_id for update;
  if not found or v_job.provider<>'moonshotai' or v_job.state<>'DISPATCHING' or v_job.claim_token<>p_claim_token
     or v_job.dispatch_fence<>p_dispatch_fence or v_job.queue_message_id<>p_message_id then return false; end if;
  update public.ai_runs set state='FAILED',failure_code=left(trim(p_failure_code),120),failed_at=now() where id=v_job.ai_run_id and state='RUNNING';
  update public.sponsored_budget_reservations set state='RELEASED' where id=v_job.reservation_id and state='ACTIVE';
  update public.ai_jobs set state='FAILED',failure_code=left(trim(p_failure_code),120),completed_at=now() where id=v_job.id;
  update public.company_core_cycles set state='AI_FAILED',updated_at=now() where ai_run_id=v_job.ai_run_id and state='AI_RUNNING';
  perform pgmq.archive('move2_vs1_ai_jobs',p_message_id); return true;
end $$;

revoke all on function public.company_core_authorize_and_enqueue_ai(uuid,uuid,uuid,uuid,numeric,jsonb,jsonb,text,uuid,text) from public;
grant execute on function public.company_core_authorize_and_enqueue_ai(uuid,uuid,uuid,uuid,numeric,jsonb,jsonb,text,uuid,text) to authenticated;
revoke all on function private.move2_worker_complete_provider(uuid,uuid,uuid,text,text,bigint,bigint,bigint,bigint,numeric,text,bigint),private.move2_worker_fail_provider(uuid,uuid,uuid,text,bigint) from public;
grant execute on function private.move2_worker_complete_provider(uuid,uuid,uuid,text,text,bigint,bigint,bigint,bigint,numeric,text,bigint),private.move2_worker_fail_provider(uuid,uuid,uuid,text,bigint) to move2_vs1_worker;

-- Repair Company Core actor-control boundaries without altering the historical migration.
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

  perform private.b1_authorize_actor(
    p_actor_id,
    'cycle.manage',
    'PROJECT',
    p_project_id
  );

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

  perform private.b1_authorize_actor(
    p_actor_id,
    'cycle.manage',
    'PROJECT',
    v_cycle.project_id
  );

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

  perform private.b1_authorize_actor(
    p_actor_id,
    'cycle.manage',
    'PROJECT',
    v_cycle.project_id
  );

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

  perform private.b1_authorize_actor(
    p_actor_id,
    'cycle.manage',
    'PROJECT',
    v_cycle.project_id
  );

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

  perform private.b1_authorize_actor(
    p_actor_id,
    'cycle.manage',
    'PROJECT',
    v_cycle.project_id
  );

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

  perform private.b1_authorize_actor(
    p_actor_id,
    'cycle.manage',
    'PROJECT',
    v_cycle.project_id
  );

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

  perform private.b1_authorize_actor(
    p_actor_id,
    'cycle.manage',
    'PROJECT',
    v_cycle.project_id
  );

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

  perform private.b1_authorize_actor(
    p_actor_id,
    'cycle.manage',
    'PROJECT',
    v_cycle.project_id
  );

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

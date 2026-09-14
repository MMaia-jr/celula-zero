-- Provider-neutral durable execution receipt below Project/Cycle AI Runs.
-- VS1 exposes only PREPROJECT_HUMAN; existing ai_runs/ai_jobs remain unchanged.

create table public.ai_executions (
  id uuid primary key default gen_random_uuid(),
  context_type text not null check (context_type='PREPROJECT_HUMAN'),
  subject_actor_id uuid not null references public.actors(id) on delete restrict,
  requested_by_actor_id uuid not null references public.actors(id) on delete restrict,
  agent_actor_id uuid not null references public.actors(id) on delete restrict,
  authorization_id uuid not null unique references public.preproject_interpretation_authorizations(id) on delete restrict,
  purpose text not null check (char_length(trim(purpose)) between 3 and 1000),
  provider text not null check (char_length(trim(provider)) between 1 and 120),
  model text not null check (char_length(trim(model)) between 1 and 240),
  request_digest text not null check (request_digest ~ '^[0-9a-f]{64}$'),
  idempotency_key text not null check (char_length(idempotency_key) between 8 and 200),
  max_calls integer not null default 1 check (max_calls=1),
  max_output_tokens bigint not null check (max_output_tokens between 1 and 1000000),
  max_spend_usd numeric(20,10) check (max_spend_usd is null or max_spend_usd>0),
  state text not null default 'QUEUED' check (state in ('QUEUED','CLAIMED','DISPATCHING','SUCCEEDED','FAILED','NEEDS_RECONCILIATION')),
  queue_message_id bigint unique,
  claim_token uuid,
  claim_expires_at timestamptz,
  dispatch_fence uuid unique,
  started_at timestamptz,
  completed_at timestamptz,
  output_digest text check (output_digest is null or output_digest ~ '^[0-9a-f]{64}$'),
  input_tokens bigint check (input_tokens is null or input_tokens>=0),
  output_tokens bigint check (output_tokens is null or output_tokens>=0),
  total_tokens bigint check (total_tokens is null or total_tokens>=0),
  cost_usd numeric(20,10) check (cost_usd is null or cost_usd>=0),
  cost_source text not null default 'UNKNOWN' check (cost_source in ('PROVIDER_REPORTED','CALCULATED','UNKNOWN')),
  failure_code text,
  created_at timestamptz not null default now(),
  unique(requested_by_actor_id,authorization_id),
  unique(requested_by_actor_id,idempotency_key),
  check(subject_actor_id<>agent_actor_id and requested_by_actor_id<>agent_actor_id),
  check(total_tokens is null or input_tokens is null or output_tokens is null or total_tokens=input_tokens+output_tokens),
  check((cost_source='UNKNOWN')=(cost_usd is null))
);

create table private.ai_execution_requests (
  execution_id uuid primary key references public.ai_executions(id) on delete restrict,
  authorization_id uuid not null unique references public.preproject_interpretation_authorizations(id) on delete restrict,
  selected_inputs jsonb not null check(jsonb_typeof(selected_inputs)='array'),
  request_envelope jsonb not null check(jsonb_typeof(request_envelope)='object'),
  request_canonical text not null,
  request_digest text not null check(request_digest ~ '^[0-9a-f]{64}$'),
  created_at timestamptz not null default now(),
  check(request_canonical=request_envelope::text)
);

alter table public.preproject_candidate_interpretations
  add constraint preproject_candidate_execution_fkey foreign key(execution_id) references public.ai_executions(id) on delete restrict;
create index ai_executions_subject_created on public.ai_executions(subject_actor_id,created_at,id);
create trigger ai_executions_append_only before delete on public.ai_executions for each row execute function private.prevent_append_only_mutation();

create unique index actors_one_preproject_private_interpreter_per_profile
  on public.actors(operator_profile_id)
  where kind='AI_AGENT' and name='CZ · Intérprete privado' and operator_label='CZ_PREPROJECT_PRIVATE_INTERPRETER';

create or replace function public.register_preproject_ai_agent(p_requester_actor_id uuid)
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare v_profile uuid:=auth.uid(); v_agent uuid;
begin
 if v_profile is null then raise exception using errcode='42501',message='CZ401:AUTHENTICATION_REQUIRED'; end if;
 if not exists(select 1 from public.actor_memberships am join public.actors a on a.id=am.actor_id where am.actor_id=p_requester_actor_id and am.profile_id=v_profile and am.role='OWNER' and a.kind='PERSON') then raise exception using errcode='42501',message='CZ403:CONTROLLED_HUMAN_REQUESTER_REQUIRED'; end if;
 perform pg_advisory_xact_lock(hashtextextended('CZ_PREPROJECT_PRIVATE_INTERPRETER:'||v_profile::text,0));
 select id into v_agent from public.actors where kind='AI_AGENT' and operator_profile_id=v_profile and name='CZ · Intérprete privado' and operator_label='CZ_PREPROJECT_PRIVATE_INTERPRETER';
 if found then return jsonb_build_object('ok',true,'agent_actor_id',v_agent,'kind','AI_AGENT','project_created',false,'replayed',true); end if;
 insert into public.actors(kind,name,operator_profile_id,operator_label) values('AI_AGENT','CZ · Intérprete privado',v_profile,'CZ_PREPROJECT_PRIVATE_INTERPRETER') returning id into v_agent;
 insert into public.actor_memberships(actor_id,profile_id,role) values(v_agent,v_profile,'OPERATOR');
 return jsonb_build_object('ok',true,'agent_actor_id',v_agent,'kind','AI_AGENT','project_created',false,'replayed',false);
end $$;

create or replace function public.authorize_and_enqueue_preproject_ai_execution(
 p_subject_actor_id uuid,p_requester_actor_id uuid,p_selected_inputs jsonb,p_purpose text,p_agent_actor_id uuid,
 p_provider text,p_model text,p_max_output_tokens bigint,p_max_spend_usd numeric,p_idempotency_key text
) returns jsonb language plpgsql security definer set search_path=public,private,pgmq,extensions,pg_temp as $$
declare v_profile uuid:=auth.uid(); v_inputs jsonb; v_envelope jsonb; v_canonical text; v_digest text; v_execution public.ai_executions%rowtype; v_message bigint; v_auth_result jsonb; v_authorization uuid; v_purpose text:=trim(coalesce(p_purpose,''));
begin
 if v_profile is null then raise exception using errcode='42501',message='CZ401:AUTHENTICATION_REQUIRED'; end if;
 if not exists(select 1 from public.actor_memberships am join public.actors a on a.id=am.actor_id where am.actor_id=p_subject_actor_id and am.profile_id=v_profile and am.role in ('OWNER','REPRESENTATIVE') and a.kind='PERSON') then raise exception using errcode='42501',message='CZ403:CONTROLLED_PERSON_REQUIRED'; end if;
 if not exists(select 1 from public.actor_memberships am join public.actors a on a.id=am.actor_id where am.actor_id=p_requester_actor_id and am.profile_id=v_profile and am.role='OWNER' and a.kind='PERSON') then raise exception using errcode='42501',message='CZ403:CONTROLLED_HUMAN_REQUESTER_REQUIRED'; end if;
 if not exists(select 1 from public.actors where id=p_agent_actor_id and kind='AI_AGENT' and operator_profile_id=v_profile) then raise exception using errcode='42501',message='CZ403:CONTROLLED_AI_AGENT_REQUIRED'; end if;
 perform private.validate_preproject_interpretation_inputs(p_subject_actor_id,p_selected_inputs);
 if char_length(v_purpose) not between 3 and 1000 or p_provider not in ('MOCK','moonshotai') or (p_provider='moonshotai' and p_model<>'moonshotai/kimi-k2.6') or p_max_output_tokens not between 1 and 1000000 or char_length(coalesce(p_idempotency_key,'')) not between 8 and 200 then raise exception using errcode='22023',message='CZ422:INVALID_PREPROJECT_EXECUTION_TERMS'; end if;
 select jsonb_agg(jsonb_build_object('record_id',r.id,'record_class',r.record_class,'content_sha256',r.content_sha256,'content',r.content) order by x.ordinality)
 into v_inputs from jsonb_array_elements(p_selected_inputs) with ordinality x(item,ordinality) join public.preproject_records r on r.id=(x.item->>'record_id')::uuid;
 v_envelope:=jsonb_build_object('provider',p_provider,'model',p_model,'messages',jsonb_build_array(jsonb_build_object('role','system','content','Produce one private candidate interpretation. Separate Human statements, sources, inference, uncertainty, and missing context. Do not assert truth, identity, verification, adoption, or Project intent.'),jsonb_build_object('role','user','content',jsonb_build_object('purpose',v_purpose,'authorized_inputs',v_inputs)::text)),'temperature',0.2,'max_tokens',p_max_output_tokens);
 v_canonical:=v_envelope::text; v_digest:=encode(extensions.digest(convert_to(v_canonical,'UTF8'),'sha256'),'hex');
 perform pg_advisory_xact_lock(hashtextextended(p_requester_actor_id::text||':'||p_idempotency_key,0));
 select * into v_execution from public.ai_executions where requested_by_actor_id=p_requester_actor_id and idempotency_key=p_idempotency_key;
 if found then
  if v_execution.subject_actor_id<>p_subject_actor_id or v_execution.agent_actor_id<>p_agent_actor_id or v_execution.purpose<>v_purpose or v_execution.provider<>p_provider or v_execution.model<>p_model or v_execution.request_digest<>v_digest or v_execution.max_output_tokens<>p_max_output_tokens or v_execution.max_spend_usd is distinct from p_max_spend_usd then raise exception using errcode='P0001',message='CZ409:AI_EXECUTION_IDEMPOTENCY_CONFLICT'; end if;
  return jsonb_build_object('ok',true,'authorization_id',v_execution.authorization_id,'execution_id',v_execution.id,'state',v_execution.state,'replayed',true);
 end if;
 v_auth_result:=public.authorize_preproject_interpretation(p_subject_actor_id,p_requester_actor_id,p_agent_actor_id,v_purpose,p_selected_inputs,jsonb_build_object('execution_command_key',p_idempotency_key,'max_calls',1,'provider',p_provider,'model',p_model,'max_output_tokens',p_max_output_tokens,'max_spend_usd',p_max_spend_usd));
 v_authorization:=(v_auth_result->>'authorization_id')::uuid;
 insert into public.ai_executions(context_type,subject_actor_id,requested_by_actor_id,agent_actor_id,authorization_id,purpose,provider,model,request_digest,idempotency_key,max_output_tokens,max_spend_usd)
 values('PREPROJECT_HUMAN',p_subject_actor_id,p_requester_actor_id,p_agent_actor_id,v_authorization,v_purpose,p_provider,p_model,v_digest,p_idempotency_key,p_max_output_tokens,p_max_spend_usd) returning * into v_execution;
 insert into private.ai_execution_requests(execution_id,authorization_id,selected_inputs,request_envelope,request_canonical,request_digest) values(v_execution.id,v_authorization,p_selected_inputs,v_envelope,v_canonical,v_digest);
 v_message:=pgmq.send('move2_vs1_ai_jobs',jsonb_build_object('execution_id',v_execution.id)); update public.ai_executions set queue_message_id=v_message where id=v_execution.id;
 return jsonb_build_object('ok',true,'authorization_id',v_authorization,'execution_id',v_execution.id,'state','QUEUED','replayed',false,'request_digest',v_digest);
end $$;

create or replace function private.move2_worker_claim(p_visibility_seconds integer default 30)
returns jsonb language plpgsql security definer set search_path=public,pgmq,pg_temp as $$
declare v_msg record; v_job public.ai_jobs%rowtype; v_execution public.ai_executions%rowtype; v_token uuid;
begin
 if p_visibility_seconds not between 1 and 3600 then raise exception using errcode='22023',message='CZ422:INVALID_VISIBILITY_TIMEOUT'; end if;
 select * into v_msg from pgmq.read('move2_vs1_ai_jobs',p_visibility_seconds,1) limit 1; if not found then return null; end if;
 if jsonb_typeof(v_msg.message)<>'object' then perform pgmq.archive('move2_vs1_ai_jobs',v_msg.msg_id); return null; end if;
 if v_msg.message=jsonb_build_object('job_id',v_msg.message->'job_id') then
  select * into v_job from public.ai_jobs where id=(v_msg.message->>'job_id')::uuid and queue_message_id=v_msg.msg_id for update;
  if not found or v_job.state in ('SUCCEEDED','FAILED','CANCELLED') then perform pgmq.archive('move2_vs1_ai_jobs',v_msg.msg_id); return null; end if;
  if v_job.state in ('DISPATCHING','NEEDS_RECONCILIATION') then if v_job.state='DISPATCHING' then update public.ai_jobs set state='NEEDS_RECONCILIATION',failure_code='WORKER_LOST_AFTER_DISPATCH' where id=v_job.id; end if; perform pgmq.archive('move2_vs1_ai_jobs',v_msg.msg_id); return null; end if;
  if v_job.state not in ('QUEUED','CLAIMED') or (v_job.state='CLAIMED' and v_job.claim_expires_at>now()) then return null; end if;
  v_token:=gen_random_uuid(); update public.ai_jobs set state='CLAIMED',claim_token=v_token,claim_expires_at=now()+make_interval(secs=>p_visibility_seconds) where id=v_job.id;
  return jsonb_build_object('execution_kind','PROJECT_AI_JOB','job_id',v_job.id,'claim_token',v_token,'message_id',v_msg.msg_id,'provider',v_job.provider);
 elsif v_msg.message=jsonb_build_object('execution_id',v_msg.message->'execution_id') then
  select * into v_execution from public.ai_executions where id=(v_msg.message->>'execution_id')::uuid and queue_message_id=v_msg.msg_id for update;
  if not found or v_execution.state in ('SUCCEEDED','FAILED') then perform pgmq.archive('move2_vs1_ai_jobs',v_msg.msg_id); return null; end if;
  if v_execution.state in ('DISPATCHING','NEEDS_RECONCILIATION') then if v_execution.state='DISPATCHING' then update public.ai_executions set state='NEEDS_RECONCILIATION',failure_code='WORKER_LOST_AFTER_DISPATCH' where id=v_execution.id; end if; perform pgmq.archive('move2_vs1_ai_jobs',v_msg.msg_id); return null; end if;
  if v_execution.state not in ('QUEUED','CLAIMED') or (v_execution.state='CLAIMED' and v_execution.claim_expires_at>now()) then return null; end if;
  v_token:=gen_random_uuid(); update public.ai_executions set state='CLAIMED',claim_token=v_token,claim_expires_at=now()+make_interval(secs=>p_visibility_seconds) where id=v_execution.id;
  return jsonb_build_object('execution_kind','PREPROJECT_HUMAN','execution_id',v_execution.id,'claim_token',v_token,'message_id',v_msg.msg_id,'provider',v_execution.provider);
 end if;
 perform pgmq.archive('move2_vs1_ai_jobs',v_msg.msg_id); return null;
exception when invalid_text_representation then perform pgmq.archive('move2_vs1_ai_jobs',v_msg.msg_id); return null;
end $$;

create or replace function private.preproject_worker_begin_dispatch(p_execution_id uuid,p_claim_token uuid,p_dispatch_fence uuid)
returns jsonb language plpgsql security definer set search_path=public,private,pg_temp as $$
declare v_execution public.ai_executions%rowtype; v_request private.ai_execution_requests%rowtype;
begin
 select * into v_execution from public.ai_executions where id=p_execution_id for update;
 if not found or v_execution.state<>'CLAIMED' or v_execution.claim_token<>p_claim_token or v_execution.claim_expires_at<=now() then raise exception using errcode='P0001',message='CZ409:AI_EXECUTION_CLAIM_INVALID'; end if;
 select * into v_request from private.ai_execution_requests where execution_id=p_execution_id;
 if v_request.request_digest<>v_execution.request_digest then raise exception using errcode='22023',message='CZ422:AI_EXECUTION_REQUEST_MISMATCH'; end if;
 update public.ai_executions set state='DISPATCHING',dispatch_fence=p_dispatch_fence,started_at=now() where id=p_execution_id;
 return jsonb_build_object('execution_id',v_execution.id,'agent_actor_id',v_execution.agent_actor_id,'provider',v_execution.provider,'model',v_execution.model,'request_canonical',v_request.request_canonical,'request_digest',v_request.request_digest,'max_output_tokens',v_execution.max_output_tokens,'max_spend_usd',v_execution.max_spend_usd);
end $$;

create or replace function private.preproject_worker_complete_provider(p_execution_id uuid,p_claim_token uuid,p_dispatch_fence uuid,p_output text,p_output_digest text,p_input_tokens bigint,p_output_tokens bigint,p_total_tokens bigint,p_cost_usd numeric,p_cost_source text,p_message_id bigint)
returns jsonb language plpgsql security definer set search_path=public,private,extensions,pgmq,pg_temp as $$
declare v_execution public.ai_executions%rowtype; v_actual text; v_candidate uuid;
begin
 select * into v_execution from public.ai_executions where id=p_execution_id for update;
 if not found or v_execution.state<>'DISPATCHING' or v_execution.claim_token<>p_claim_token or v_execution.dispatch_fence<>p_dispatch_fence or v_execution.queue_message_id<>p_message_id then raise exception using errcode='P0001',message='CZ409:AI_EXECUTION_DISPATCH_FENCE_INVALID'; end if;
 v_actual:=encode(extensions.digest(convert_to(p_output,'UTF8'),'sha256'),'hex');
 if p_output_digest<>v_actual or p_total_tokens<>p_input_tokens+p_output_tokens or p_output_tokens>v_execution.max_output_tokens or p_cost_source not in ('PROVIDER_REPORTED','CALCULATED','UNKNOWN') or (p_cost_source='UNKNOWN')<>(p_cost_usd is null) then raise exception using errcode='22023',message='CZ422:AI_EXECUTION_RESULT_MISMATCH'; end if;
 if v_execution.max_spend_usd is not null and (p_cost_usd is null or p_cost_usd>v_execution.max_spend_usd) then update public.ai_executions set state='NEEDS_RECONCILIATION',output_digest=p_output_digest,input_tokens=p_input_tokens,output_tokens=p_output_tokens,total_tokens=p_total_tokens,cost_usd=p_cost_usd,cost_source=p_cost_source,failure_code=case when p_cost_usd is null then 'ACTUAL_COST_UNKNOWN_WITH_AUTHORIZED_CEILING' else 'ACTUAL_COST_EXCEEDS_AUTHORIZATION' end,completed_at=now() where id=p_execution_id; perform pgmq.archive('move2_vs1_ai_jobs',p_message_id); return jsonb_build_object('execution_id',p_execution_id,'state','NEEDS_RECONCILIATION'); end if;
 insert into public.preproject_candidate_interpretations(authorization_id,subject_actor_id,actual_producer_actor_id,execution_id,content,content_sha256,provenance,execution_class,provider,model,started_at,completed_at,input_tokens,output_tokens,total_tokens,cost_usd,cost_status)
 values(v_execution.authorization_id,v_execution.subject_actor_id,v_execution.agent_actor_id,v_execution.id,p_output,p_output_digest,jsonb_build_object('execution_id',v_execution.id,'request_digest',v_execution.request_digest),'CZ_EXECUTED_AI_OUTPUT',v_execution.provider,v_execution.model,v_execution.started_at,now(),p_input_tokens,p_output_tokens,p_total_tokens,p_cost_usd,case when p_cost_usd is null then 'UNKNOWN' else 'KNOWN' end) returning id into v_candidate;
 update public.ai_executions set state='SUCCEEDED',output_digest=p_output_digest,input_tokens=p_input_tokens,output_tokens=p_output_tokens,total_tokens=p_total_tokens,cost_usd=p_cost_usd,cost_source=p_cost_source,completed_at=now() where id=p_execution_id;
 perform pgmq.archive('move2_vs1_ai_jobs',p_message_id); return jsonb_build_object('execution_id',p_execution_id,'candidate_id',v_candidate,'state','SUCCEEDED');
end $$;

create or replace function private.preproject_worker_complete_mock(p_execution_id uuid,p_claim_token uuid,p_dispatch_fence uuid,p_output text,p_output_digest text,p_message_id bigint)
returns jsonb language plpgsql security definer set search_path=public,private,extensions,pgmq,pg_temp as $$
declare v_execution public.ai_executions%rowtype; v_actual text; v_candidate uuid;
begin
 select * into v_execution from public.ai_executions where id=p_execution_id for update;
 if not found or v_execution.provider<>'MOCK' or v_execution.state<>'DISPATCHING' or v_execution.claim_token<>p_claim_token or v_execution.dispatch_fence<>p_dispatch_fence or v_execution.queue_message_id<>p_message_id then raise exception using errcode='P0001',message='CZ409:AI_EXECUTION_DISPATCH_FENCE_INVALID'; end if;
 v_actual:=encode(extensions.digest(convert_to(p_output,'UTF8'),'sha256'),'hex'); if p_output_digest<>v_actual then raise exception using errcode='22023',message='CZ422:AI_EXECUTION_RESULT_MISMATCH'; end if;
 insert into public.preproject_candidate_interpretations(authorization_id,subject_actor_id,execution_id,content,content_sha256,provenance,execution_class,provider,model,started_at,completed_at,input_tokens,output_tokens,total_tokens,cost_usd,cost_status)
 values(v_execution.authorization_id,v_execution.subject_actor_id,v_execution.id,p_output,p_output_digest,jsonb_build_object('execution_id',v_execution.id,'request_digest',v_execution.request_digest,'synthetic',true),'SYNTHETIC_TEST_OUTPUT','MOCK',v_execution.model,v_execution.started_at,now(),0,0,0,0,'KNOWN') returning id into v_candidate;
 update public.ai_executions set state='SUCCEEDED',output_digest=p_output_digest,input_tokens=0,output_tokens=0,total_tokens=0,cost_usd=0,cost_source='CALCULATED',completed_at=now() where id=p_execution_id;
 perform pgmq.archive('move2_vs1_ai_jobs',p_message_id); return jsonb_build_object('execution_id',p_execution_id,'candidate_id',v_candidate,'state','SUCCEEDED','synthetic',true);
end $$;

create or replace function private.preproject_worker_fail(p_execution_id uuid,p_claim_token uuid,p_dispatch_fence uuid,p_failure_code text,p_message_id bigint)
returns boolean language plpgsql security definer set search_path=public,pgmq,pg_temp as $$ begin update public.ai_executions set state='FAILED',failure_code=left(trim(p_failure_code),120),completed_at=now() where id=p_execution_id and state='DISPATCHING' and claim_token=p_claim_token and dispatch_fence=p_dispatch_fence and queue_message_id=p_message_id; if not found then return false; end if; perform pgmq.archive('move2_vs1_ai_jobs',p_message_id); return true; end $$;
create or replace function private.preproject_worker_mark_uncertain(p_execution_id uuid,p_claim_token uuid,p_dispatch_fence uuid,p_message_id bigint)
returns boolean language plpgsql security definer set search_path=public,pgmq,pg_temp as $$ begin update public.ai_executions set state='NEEDS_RECONCILIATION',failure_code='DISPATCH_OUTCOME_UNKNOWN',completed_at=now() where id=p_execution_id and state='DISPATCHING' and claim_token=p_claim_token and dispatch_fence=p_dispatch_fence and queue_message_id=p_message_id; if not found then return false; end if; perform pgmq.archive('move2_vs1_ai_jobs',p_message_id); return true; end $$;

alter table public.ai_executions enable row level security;
revoke all on public.ai_executions from public,anon,authenticated,move2_vs1_worker;
grant select on public.ai_executions to authenticated;
create policy ai_executions_subject_read on public.ai_executions for select to authenticated using(exists(select 1 from public.actor_memberships am where am.actor_id=subject_actor_id and am.profile_id=auth.uid() and am.role in ('OWNER','REPRESENTATIVE')));
revoke all on private.ai_execution_requests from public,anon,authenticated,move2_vs1_worker;
revoke all on function public.authorize_and_enqueue_preproject_ai_execution(uuid,uuid,jsonb,text,uuid,text,text,bigint,numeric,text) from public,anon;
revoke all on function public.register_preproject_ai_agent(uuid) from public,anon;
grant execute on function public.authorize_and_enqueue_preproject_ai_execution(uuid,uuid,jsonb,text,uuid,text,text,bigint,numeric,text) to authenticated;
grant execute on function public.register_preproject_ai_agent(uuid) to authenticated;
revoke all on function private.preproject_worker_begin_dispatch(uuid,uuid,uuid),private.preproject_worker_complete_provider(uuid,uuid,uuid,text,text,bigint,bigint,bigint,numeric,text,bigint),private.preproject_worker_complete_mock(uuid,uuid,uuid,text,text,bigint),private.preproject_worker_fail(uuid,uuid,uuid,text,bigint),private.preproject_worker_mark_uncertain(uuid,uuid,uuid,bigint) from public,anon,authenticated;
grant execute on function private.preproject_worker_begin_dispatch(uuid,uuid,uuid),private.preproject_worker_complete_provider(uuid,uuid,uuid,text,text,bigint,bigint,bigint,numeric,text,bigint),private.preproject_worker_complete_mock(uuid,uuid,uuid,text,text,bigint),private.preproject_worker_fail(uuid,uuid,uuid,text,bigint),private.preproject_worker_mark_uncertain(uuid,uuid,uuid,bigint) to move2_vs1_worker;

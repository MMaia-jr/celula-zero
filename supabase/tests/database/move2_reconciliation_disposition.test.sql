begin;
create extension if not exists pgtap with schema extensions;
select no_plan();

select ok(
  to_regprocedure('public.move2_dispose_reconciliation(uuid,uuid,text,numeric,text,uuid,text)') is not null,
  'Move2 reconciliation disposition RPC exists'
);
select ok(
  has_function_privilege('authenticated','public.move2_dispose_reconciliation(uuid,uuid,text,numeric,text,uuid,text)','execute'),
  'authenticated may execute reconciliation disposition'
);
select ok(
  not has_function_privilege('anon','public.move2_dispose_reconciliation(uuid,uuid,text,numeric,text,uuid,text)','execute'),
  'anon may not execute reconciliation disposition'
);
select ok(
  not has_function_privilege('move2_vs1_worker','public.move2_dispose_reconciliation(uuid,uuid,text,numeric,text,uuid,text)','execute'),
  'Move2 worker may not disposition reconciliation'
);

insert into auth.users(id,aud,role,email,raw_app_meta_data,raw_user_meta_data,created_at,updated_at) values
('bd010000-0000-4000-8000-000000000001','authenticated','authenticated','gi1-003-owner@example.test','{"provider":"email","providers":["email"]}','{}',now(),now()),
('bd010000-0000-4000-8000-000000000002','authenticated','authenticated','gi1-003-other@example.test','{"provider":"email","providers":["email"]}','{}',now(),now());
insert into public.pilot_memberships(profile_id,status,source) values
('bd010000-0000-4000-8000-000000000001','ACTIVE','SEED'),
('bd010000-0000-4000-8000-000000000002','ACTIVE','SEED');

create temporary table gi1(
  k text primary key,
  u uuid,
  j jsonb,
  n numeric,
  t text
);

select set_config('request.jwt.claim.sub','bd010000-0000-4000-8000-000000000001',true);
insert into gi1(k,u) select 'owner',actor_id from public.actor_memberships
where profile_id='bd010000-0000-4000-8000-000000000001' and role='OWNER';
insert into gi1(k,u) select 'other_owner',actor_id from public.actor_memberships
where profile_id='bd010000-0000-4000-8000-000000000002' and role='OWNER';

insert into gi1(k,j)
select 'project',to_jsonb(x)
from public.create_project_atomic(
  'GI1-003 project',
  'gi1-003-reconciliation',
  'Deterministic Move2 reconciliation fixture.',
  'Dispose already ambiguous jobs without redispatch.',
  'Human authority precedes reconciliation.',
  'Preserve original AI Run metadata and append reconciliation facts.',
  'No provider calls.',
  array['gi1-003'],
  'VOLUNTARY',
  'OPEN',
  false
) x;
update gi1 set u=(j->>'project_id')::uuid where k='project';

insert into gi1(k,j)
select 'agent',public.t3_register_bounded_agent(
  (select u from gi1 where k='owner'),
  (select u from gi1 where k='project'),
  'GI1-003 AI',
  'Bounded deterministic fixture',
  'bd020000-0000-4000-8000-000000000001',
  'gi1-003-agent'
);
update gi1 set u=(j->>'agent_actor_id')::uuid where k='agent';

insert into public.sponsored_budget_pools(cell_id,name,hard_limit_usd)
select cell_id,'GI1 no charge',1 from public.projects where id=(select u from gi1 where k='project');
insert into gi1(k,u) select 'pool_nocharge',id from public.sponsored_budget_pools where name='GI1 no charge';
insert into public.sponsored_budget_pools(cell_id,name,hard_limit_usd)
select cell_id,'GI1 charged no output',1 from public.projects where id=(select u from gi1 where k='project');
insert into gi1(k,u) select 'pool_charged',id from public.sponsored_budget_pools where name='GI1 charged no output';
insert into public.sponsored_budget_pools(cell_id,name,hard_limit_usd)
select cell_id,'GI1 unknown cost',1 from public.projects where id=(select u from gi1 where k='project');
insert into gi1(k,u) select 'pool_unknown',id from public.sponsored_budget_pools where name='GI1 unknown cost';
insert into public.sponsored_budget_pools(cell_id,name,hard_limit_usd)
select cell_id,'GI1 over reservation',1 from public.projects where id=(select u from gi1 where k='project');
insert into gi1(k,u) select 'pool_over',id from public.sponsored_budget_pools where name='GI1 over reservation';
insert into public.sponsored_budget_pools(cell_id,name,hard_limit_usd)
select cell_id,'GI1 hard stop',0.55 from public.projects where id=(select u from gi1 where k='project');
insert into gi1(k,u) select 'pool_hard_stop',id from public.sponsored_budget_pools where name='GI1 hard stop';

create function pg_temp.gi1_env(s text default '') returns jsonb
language sql immutable as $$
  select jsonb_build_object(
    'provider','moonshotai',
    'model','moonshotai/kimi-k2.6',
    'messages',jsonb_build_array(
      jsonb_build_object('role','system','content','Deterministic fixture only.'),
      jsonb_build_object('role','user','content','GI1-003 fixture '||s)
    ),
    'temperature',0.3,
    'max_tokens',4096
  )
$$;

create function pg_temp.gi1_make_cycle(s text) returns uuid
language plpgsql as $$
declare
  c uuid;
  d uuid;
  r jsonb;
begin
  r:=public.company_core_create_cycle(
    (select u from gi1 where k='owner'),
    (select u from gi1 where k='project'),
    'Need '||s,
    'Deterministic reconciliation problem statement.',
    'A terminal reconciled state with budget disposition.',
    'GI1-003 local fixture.',
    'HIGH',
    'No provider calls.',
    'Internal fixture.',
    gen_random_uuid(),
    'gi1-create-'||s
  );
  c:=(r->>'cycle_id')::uuid;
  select dragon_cycle_id into d from public.company_core_cycles where id=c;
  perform public.company_core_define_agreement(
    (select u from gi1 where k='owner'),
    c,
    'Deterministic reconciliation result.',
    'Bounded Move2 reconciliation.',
    'No late-output import.',
    'Existing Move2 durable Job plane.',
    'Terminal Job and reservation with no redispatch.',
    'Sponsored hard budget only.',
    'Human requester only; no delegated Human Direction.',
    null,
    gen_random_uuid(),
    'gi1-agree-'||s
  );
  perform public.ddr_add_cycle_ai_participant(
    (select u from gi1 where k='owner'),
    d,
    (select u from gi1 where k='agent'),
    'ROOM','RESEARCHER',null,'ASSIST','Synthesis only.',
    gen_random_uuid(),
    'gi1-part-'||s
  );
  return c;
end
$$;

create function pg_temp.gi1_enqueue(c uuid,p uuid,a numeric,s text,p_idempotency_key text) returns jsonb
language plpgsql as $$
declare
  d uuid;
  m jsonb;
  purpose text;
begin
  select dragon_cycle_id,'Company Core cycle '||id::text||': '||need_title
  into d,purpose
  from public.company_core_cycles where id=c;
  m:=jsonb_build_object(
    'manifest_version','cz.ai-context.v1',
    'project_id',(select u from gi1 where k='project'),
    'cycle_id',d,
    'agent_actor_id',(select u from gi1 where k='agent'),
    'purpose',purpose,
    'task','Produce deterministic fixture synthesis.',
    'cycle_records','[]'::jsonb,
    'repository_files','[]'::jsonb,
    'authority','Assist only; no human authority is delegated.',
    'prohibited_inferences',jsonb_build_array('Human Direction','Claim','Evidence','Verification','Decision')
  );
  return public.company_core_authorize_and_enqueue_ai(
    (select u from gi1 where k='owner'),
    c,
    (select u from gi1 where k='agent'),
    p,
    a,
    pg_temp.gi1_env(s),
    m,
    m::text,
    gen_random_uuid(),
    p_idempotency_key
  );
end
$$;

create function pg_temp.gi1_prepare_job(s text,p uuid,a numeric,p_idempotency_key text) returns uuid
language plpgsql as $$
declare
  c uuid;
  r jsonb;
begin
  c:=pg_temp.gi1_make_cycle(s);
  r:=pg_temp.gi1_enqueue(c,p,a,s,p_idempotency_key);
  return (r->>'job_id')::uuid;
end
$$;

create function pg_temp.gi1_dispatch(j uuid) returns jsonb
language plpgsql as $$
declare
  cl jsonb;
  fence uuid:=gen_random_uuid();
  ctx jsonb;
begin
  cl:=private.move2_worker_claim(30);
  if cl is null or cl->>'job_id'<>j::text then
    raise exception 'GI1_FIXTURE_UNEXPECTED_CLAIM';
  end if;
  ctx:=private.move2_worker_begin_dispatch(
    j,
    (cl->>'claim_token')::uuid,
    fence
  );
  return cl||jsonb_build_object('fence',fence,'context',ctx);
end
$$;

create function pg_temp.gi1_mark_uncertain(j uuid) returns jsonb
language plpgsql as $$
declare
  d jsonb;
begin
  d:=pg_temp.gi1_dispatch(j);
  if not private.move2_worker_mark_uncertain(
    j,
    (d->>'claim_token')::uuid,
    (d->>'fence')::uuid,
    (d->>'message_id')::bigint
  ) then
    raise exception 'GI1_FIXTURE_MARK_UNCERTAIN_FAILED';
  end if;
  return d;
end
$$;

create function pg_temp.gi1_complete_provider(j uuid,o text,c numeric,src text) returns jsonb
language plpgsql as $$
declare
  d jsonb;
  normalized text:=trim(o);
  digest text;
  size_bytes bigint;
begin
  d:=pg_temp.gi1_dispatch(j);
  digest:=encode(extensions.digest(convert_to(normalized,'UTF8'),'sha256'),'hex');
  size_bytes:=octet_length(convert_to(normalized,'UTF8'));
  return private.move2_worker_complete_provider(
    j,
    (d->>'claim_token')::uuid,
    (d->>'fence')::uuid,
    normalized,
    digest,
    size_bytes,
    10,5,15,
    c,
    src,
    (d->>'message_id')::bigint
  );
end
$$;

-- -------------------------------------------------------------------------
-- Case 1: DISPATCH_OUTCOME_UNKNOWN -> NO_CHARGE_OBSERVED.
-- -------------------------------------------------------------------------
insert into gi1(k,u) values(
  'job_nocharge',
  pg_temp.gi1_prepare_job('nocharge',(select u from gi1 where k='pool_nocharge'),0.5,'gi1-enqueue-nocharge')
);
select pg_temp.gi1_mark_uncertain((select u from gi1 where k='job_nocharge'));
insert into gi1(k,u) values('cmd_nocharge',gen_random_uuid());

select is((select state from public.ai_jobs where id=(select u from gi1 where k='job_nocharge')),'NEEDS_RECONCILIATION','dispatch ambiguity is held for reconciliation');
select is((select failure_code from public.ai_jobs where id=(select u from gi1 where k='job_nocharge')),'DISPATCH_OUTCOME_UNKNOWN','dispatch ambiguity reason is preserved');
select is((select r.state from public.sponsored_budget_reservations r join public.ai_jobs j on j.reservation_id=r.id where j.id=(select u from gi1 where k='job_nocharge')),'HELD_FOR_RECONCILIATION','dispatch ambiguity holds sponsored reservation');
select is((select r.state from public.ai_runs r join public.ai_jobs j on j.ai_run_id=r.id where j.id=(select u from gi1 where k='job_nocharge')),'RUNNING','dispatch ambiguity keeps AI Run non-terminal before disposition');
select is((select c.state from public.company_core_cycles c join public.ai_jobs j on j.ai_run_id=c.ai_run_id where j.id=(select u from gi1 where k='job_nocharge')),'AI_RUNNING','Company Core remains AI_RUNNING before dispatch disposition');
select is((select count(*)::integer from pgmq.q_move2_vs1_ai_jobs where message->>'job_id'=(select u::text from gi1 where k='job_nocharge')),0,'ambiguous delivery is archived before reconciliation');

select set_config('request.jwt.claim.sub','bd010000-0000-4000-8000-000000000002',true);
select throws_ok(
  format(
    'select public.move2_dispose_reconciliation(%L::uuid,%L::uuid,%L,null,%L,%L::uuid,%L)',
    (select u from gi1 where k='owner'),
    (select u from gi1 where k='job_nocharge'),
    'NO_CHARGE_OBSERVED',
    'Provider billing check found no charge.',
    (select u from gi1 where k='cmd_nocharge'),
    'gi1-dispose-nocharge'
  ),
  '42501','CZ403:ACTOR_CONTROL_REQUIRED',
  'outsider cannot disposition by supplying requester Actor UUID'
);
select set_config('request.jwt.claim.sub','bd010000-0000-4000-8000-000000000001',true);

insert into gi1(k,j)
select 'result_nocharge',public.move2_dispose_reconciliation(
  (select u from gi1 where k='owner'),
  (select u from gi1 where k='job_nocharge'),
  'NO_CHARGE_OBSERVED',
  null,
  'Provider billing check found no charge.',
  (select u from gi1 where k='cmd_nocharge'),
  'gi1-dispose-nocharge'
);

select is((select state from public.ai_jobs where id=(select u from gi1 where k='job_nocharge')),'FAILED','no-charge dispatch ambiguity terminates Job as FAILED');
select is((select failure_code from public.ai_jobs where id=(select u from gi1 where k='job_nocharge')),'RECONCILED_NO_CHARGE','terminal Job records reconciled no-charge outcome');
select is((select r.state from public.sponsored_budget_reservations r join public.ai_jobs j on j.reservation_id=r.id where j.id=(select u from gi1 where k='job_nocharge')),'RELEASED','no-charge confirmation releases reservation');
select is((select settled_usd from public.sponsored_budget_pools where id=(select u from gi1 where k='pool_nocharge')),0::numeric,'no-charge disposition does not settle spend');
select is((select r.state from public.ai_runs r join public.ai_jobs j on j.ai_run_id=r.id where j.id=(select u from gi1 where k='job_nocharge')),'FAILED','no-output ambiguous AI Run terminates FAILED');
select is((select c.state from public.company_core_cycles c join public.ai_jobs j on j.ai_run_id=c.ai_run_id where j.id=(select u from gi1 where k='job_nocharge')),'AI_FAILED','Company Core follows failed ambiguous AI Run');
select is((select result->'reconciliation'->>'original_failure_code' from public.ai_jobs where id=(select u from gi1 where k='job_nocharge')),'DISPATCH_OUTCOME_UNKNOWN','terminal result preserves original ambiguity reason');
select is((select result->'reconciliation'->>'redispatched' from public.ai_jobs where id=(select u from gi1 where k='job_nocharge')),'false','reconciliation records no redispatch');
select is((select count(*)::integer from public.domain_events where event_type='AI_JOB_RECONCILIATION_DISPOSED' and aggregate_id=(select u from gi1 where k='job_nocharge')),1,'exactly one reconciliation event is appended');
select is((select count(*)::integer from pgmq.q_move2_vs1_ai_jobs where message->>'job_id'=(select u::text from gi1 where k='job_nocharge')),0,'disposition creates no new queue delivery');

select is(
  public.move2_dispose_reconciliation(
    (select u from gi1 where k='owner'),
    (select u from gi1 where k='job_nocharge'),
    'NO_CHARGE_OBSERVED',null,
    'Provider billing check found no charge.',
    (select u from gi1 where k='cmd_nocharge'),
    'gi1-dispose-nocharge'
  )::text,
  (select j::text from gi1 where k='result_nocharge'),
  'exact reconciliation replay returns saved result after terminal transition'
);
select is((select count(*)::integer from public.domain_events where event_type='AI_JOB_RECONCILIATION_DISPOSED' and aggregate_id=(select u from gi1 where k='job_nocharge')),1,'exact replay appends no second reconciliation event');
select throws_ok(
  format(
    'select public.move2_dispose_reconciliation(%L::uuid,%L::uuid,%L,0.25,%L,%L::uuid,%L)',
    (select u from gi1 where k='owner'),
    (select u from gi1 where k='job_nocharge'),
    'CHARGE_OBSERVED_NO_OUTPUT',
    'Changed payload must not replay.',
    (select u from gi1 where k='cmd_nocharge'),
    'gi1-dispose-nocharge'
  ),
  'P0001','CZ409:IDEMPOTENCY_CONFLICT',
  'same idempotency key with changed reconciliation facts fails closed'
);

-- -------------------------------------------------------------------------
-- Case 2: WORKER_LOST_AFTER_DISPATCH -> CHARGE_OBSERVED_NO_OUTPUT.
-- The current worker-loss transition is already covered by Move2 tests; this
-- fixture reuses the same durable ambiguous state and switches only the
-- existing reason code so the disposition branch is exercised deterministically.
-- -------------------------------------------------------------------------
insert into gi1(k,u) values(
  'job_charged',
  pg_temp.gi1_prepare_job('charged',(select u from gi1 where k='pool_charged'),0.5,'gi1-enqueue-charged')
);
select pg_temp.gi1_mark_uncertain((select u from gi1 where k='job_charged'));
update public.ai_jobs set failure_code='WORKER_LOST_AFTER_DISPATCH' where id=(select u from gi1 where k='job_charged');
insert into gi1(k,u) values('cmd_charged',gen_random_uuid());

select is((select failure_code from public.ai_jobs where id=(select u from gi1 where k='job_charged')),'WORKER_LOST_AFTER_DISPATCH','worker-loss reconciliation reason fixture is explicit');
select public.move2_dispose_reconciliation(
  (select u from gi1 where k='owner'),
  (select u from gi1 where k='job_charged'),
  'CHARGE_OBSERVED_NO_OUTPUT',
  0.25,
  'Provider billing record shows a charge; no output was recoverable.',
  (select u from gi1 where k='cmd_charged'),
  'gi1-dispose-charged'
);
select is((select state from public.ai_jobs where id=(select u from gi1 where k='job_charged')),'FAILED','charged no-output ambiguity terminates Job FAILED');
select is((select failure_code from public.ai_jobs where id=(select u from gi1 where k='job_charged')),'RECONCILED_CHARGED_NO_OUTPUT','charged no-output terminal code is explicit');
select is((select r.state from public.sponsored_budget_reservations r join public.ai_jobs j on j.reservation_id=r.id where j.id=(select u from gi1 where k='job_charged')),'SETTLED','confirmed charge settles reservation');
select is((select r.settled_usd from public.sponsored_budget_reservations r join public.ai_jobs j on j.reservation_id=r.id where j.id=(select u from gi1 where k='job_charged')),0.25::numeric,'confirmed charge settles exact observed amount');
select is((select settled_usd from public.sponsored_budget_pools where id=(select u from gi1 where k='pool_charged')),0.25::numeric,'confirmed charge increments pool settled spend');
select is((select r.state from public.ai_runs r join public.ai_jobs j on j.ai_run_id=r.id where j.id=(select u from gi1 where k='job_charged')),'FAILED','charged no-output AI Run terminates FAILED without inventing output');
select is((select r.cycle_record_id from public.ai_runs r join public.ai_jobs j on j.ai_run_id=r.id where j.id=(select u from gi1 where k='job_charged')),null::uuid,'charged no-output disposition creates no AI output record');
select is((select c.state from public.company_core_cycles c join public.ai_jobs j on j.ai_run_id=c.ai_run_id where j.id=(select u from gi1 where k='job_charged')),'AI_FAILED','Company Core follows charged no-output failure');
select is((select count(*)::integer from pgmq.q_move2_vs1_ai_jobs where message->>'job_id'=(select u::text from gi1 where k='job_charged')),0,'charged disposition does not redispatch');

-- -------------------------------------------------------------------------
-- Case 3: ACTUAL_COST_UNKNOWN with completed output -> confirmed cost.
-- AI Run provider-time metadata remains unchanged; later reconciliation is
-- represented in accounting + Job result + append-only event.
-- -------------------------------------------------------------------------
insert into gi1(k,u) values(
  'job_unknown',
  pg_temp.gi1_prepare_job('unknown',(select u from gi1 where k='pool_unknown'),0.5,'gi1-enqueue-unknown')
);
select pg_temp.gi1_complete_provider((select u from gi1 where k='job_unknown'),'unknown-cost output',null,'UNKNOWN');
insert into gi1(k,j)
select 'unknown_before',jsonb_build_object(
  'cycle_record_id',r.cycle_record_id,
  'output_digest',r.output_digest,
  'cost_source',r.cost_source,
  'cost_usd',r.cost_usd
)
from public.ai_runs r join public.ai_jobs j on j.ai_run_id=r.id
where j.id=(select u from gi1 where k='job_unknown');
insert into gi1(k,u) values('cmd_unknown',gen_random_uuid());

select is((select state from public.ai_jobs where id=(select u from gi1 where k='job_unknown')),'NEEDS_RECONCILIATION','unknown provider cost requires reconciliation');
select is((select failure_code from public.ai_jobs where id=(select u from gi1 where k='job_unknown')),'ACTUAL_COST_UNKNOWN','unknown-cost reason is explicit');
select is((select r.state from public.ai_runs r join public.ai_jobs j on j.ai_run_id=r.id where j.id=(select u from gi1 where k='job_unknown')),'COMPLETED','unknown cost preserves completed AI output');
select is((select c.state from public.company_core_cycles c join public.ai_jobs j on j.ai_run_id=c.ai_run_id where j.id=(select u from gi1 where k='job_unknown')),'AI_COMPLETED','Company Core already reflects completed output');

select public.move2_dispose_reconciliation(
  (select u from gi1 where k='owner'),
  (select u from gi1 where k='job_unknown'),
  'COMPLETED_OUTPUT_COST_OBSERVED',
  0.40,
  'Later billing observation confirms the actual completed-output cost.',
  (select u from gi1 where k='cmd_unknown'),
  'gi1-dispose-unknown'
);
select is((select state from public.ai_jobs where id=(select u from gi1 where k='job_unknown')),'SUCCEEDED','completed unknown-cost Job becomes SUCCEEDED after accounting disposition');
select is((select failure_code from public.ai_jobs where id=(select u from gi1 where k='job_unknown')),null::text,'successful completed-output disposition clears Job failure code');
select is((select r.state from public.sponsored_budget_reservations r join public.ai_jobs j on j.reservation_id=r.id where j.id=(select u from gi1 where k='job_unknown')),'SETTLED','unknown-cost reservation settles after confirmed amount');
select is((select r.settled_usd from public.sponsored_budget_reservations r join public.ai_jobs j on j.reservation_id=r.id where j.id=(select u from gi1 where k='job_unknown')),0.40::numeric,'unknown-cost reservation records reconciled amount');
select is((select settled_usd from public.sponsored_budget_pools where id=(select u from gi1 where k='pool_unknown')),0.40::numeric,'unknown-cost settlement updates pool');
select is((select r.state from public.ai_runs r join public.ai_jobs j on j.ai_run_id=r.id where j.id=(select u from gi1 where k='job_unknown')),'COMPLETED','reconciliation does not rewrite completed AI Run state');
select is((select r.cost_source from public.ai_runs r join public.ai_jobs j on j.ai_run_id=r.id where j.id=(select u from gi1 where k='job_unknown')),'UNKNOWN','AI Run preserves original provider-time UNKNOWN cost source');
select is((select r.cost_usd from public.ai_runs r join public.ai_jobs j on j.ai_run_id=r.id where j.id=(select u from gi1 where k='job_unknown')),null::numeric,'AI Run preserves original unknown provider-time cost');
select is((select r.cycle_record_id::text from public.ai_runs r join public.ai_jobs j on j.ai_run_id=r.id where j.id=(select u from gi1 where k='job_unknown')),(select j->>'cycle_record_id' from gi1 where k='unknown_before'),'completed output record identity is preserved');
select is((select r.output_digest from public.ai_runs r join public.ai_jobs j on j.ai_run_id=r.id where j.id=(select u from gi1 where k='job_unknown')),(select j->>'output_digest' from gi1 where k='unknown_before'),'completed output digest is preserved');
select is((select c.state from public.company_core_cycles c join public.ai_jobs j on j.ai_run_id=c.ai_run_id where j.id=(select u from gi1 where k='job_unknown')),'AI_COMPLETED','Company Core completed state is preserved');
select is((select (result->'reconciliation'->>'observed_actual_cost_usd')::numeric from public.ai_jobs where id=(select u from gi1 where k='job_unknown')),0.40::numeric,'Job records later reconciliation cost separately from AI Run Original Record');
select is((select count(*)::integer from pgmq.q_move2_vs1_ai_jobs where message->>'job_id'=(select u::text from gi1 where k='job_unknown')),0,'completed-output reconciliation does not redispatch');

-- -------------------------------------------------------------------------
-- Case 4: ACTUAL_COST_EXCEEDS_RESERVATION but still fits hard pool limit.
-- Exact provider-reported cost must match the reconciliation input.
-- -------------------------------------------------------------------------
insert into gi1(k,u) values(
  'job_over',
  pg_temp.gi1_prepare_job('over',(select u from gi1 where k='pool_over'),0.5,'gi1-enqueue-over')
);
select pg_temp.gi1_complete_provider((select u from gi1 where k='job_over'),'over-reservation output',0.60,'PROVIDER_REPORTED');
insert into gi1(k,u) values('cmd_over',gen_random_uuid());

select is((select state from public.ai_jobs where id=(select u from gi1 where k='job_over')),'NEEDS_RECONCILIATION','over-reservation provider cost requires reconciliation');
select is((select failure_code from public.ai_jobs where id=(select u from gi1 where k='job_over')),'ACTUAL_COST_EXCEEDS_RESERVATION','over-reservation reason is explicit');
select throws_ok(
  format(
    'select public.move2_dispose_reconciliation(%L::uuid,%L::uuid,%L,0.61,%L,%L::uuid,%L)',
    (select u from gi1 where k='owner'),
    (select u from gi1 where k='job_over'),
    'COMPLETED_OUTPUT_COST_OBSERVED',
    'Mismatched amount must fail.',
    (select u from gi1 where k='cmd_over'),
    'gi1-dispose-over-mismatch'
  ),
  'P0001','CZ409:RECONCILIATION_COST_MISMATCH',
  'provider-reported over-reservation cost cannot be rewritten by reconciliation'
);
select is((select state from public.ai_jobs where id=(select u from gi1 where k='job_over')),'NEEDS_RECONCILIATION','cost mismatch leaves Job held');
select is((select r.state from public.sponsored_budget_reservations r join public.ai_jobs j on j.reservation_id=r.id where j.id=(select u from gi1 where k='job_over')),'HELD_FOR_RECONCILIATION','cost mismatch leaves reservation held');

select public.move2_dispose_reconciliation(
  (select u from gi1 where k='owner'),
  (select u from gi1 where k='job_over'),
  'COMPLETED_OUTPUT_COST_OBSERVED',
  0.60,
  'Provider-reported actual cost is confirmed for settlement.',
  (select u from gi1 where k='cmd_over'),
  'gi1-dispose-over'
);
select is((select state from public.ai_jobs where id=(select u from gi1 where k='job_over')),'SUCCEEDED','over-reservation Job succeeds after exact cost settlement');
select is((select r.settled_usd from public.sponsored_budget_reservations r join public.ai_jobs j on j.reservation_id=r.id where j.id=(select u from gi1 where k='job_over')),0.60::numeric,'over-reservation settles above reservation when hard pool permits');
select is((select settled_usd from public.sponsored_budget_pools where id=(select u from gi1 where k='pool_over')),0.60::numeric,'over-reservation exact actual cost reaches pool accounting');
select is((select r.cost_usd from public.ai_runs r join public.ai_jobs j on j.ai_run_id=r.id where j.id=(select u from gi1 where k='job_over')),0.60::numeric,'provider-reported AI Run cost is unchanged');
select is((select r.cost_source from public.ai_runs r join public.ai_jobs j on j.ai_run_id=r.id where j.id=(select u from gi1 where k='job_over')),'PROVIDER_REPORTED','provider-reported AI Run source is unchanged');
select is((select count(*)::integer from pgmq.q_move2_vs1_ai_jobs where message->>'job_id'=(select u::text from gi1 where k='job_over')),0,'over-reservation disposition does not redispatch');

-- -------------------------------------------------------------------------
-- Case 5: actual cost cannot be settled beyond sponsored hard limit.
-- The whole disposition fails atomically and remains held for Human review.
-- -------------------------------------------------------------------------
insert into gi1(k,u) values(
  'job_hard_stop',
  pg_temp.gi1_prepare_job('hard-stop',(select u from gi1 where k='pool_hard_stop'),0.5,'gi1-enqueue-hard-stop')
);
select pg_temp.gi1_complete_provider((select u from gi1 where k='job_hard_stop'),'hard-stop output',0.60,'PROVIDER_REPORTED');
insert into gi1(k,u) values('cmd_hard_stop',gen_random_uuid());

select throws_ok(
  format(
    'select public.move2_dispose_reconciliation(%L::uuid,%L::uuid,%L,0.60,%L,%L::uuid,%L)',
    (select u from gi1 where k='owner'),
    (select u from gi1 where k='job_hard_stop'),
    'COMPLETED_OUTPUT_COST_OBSERVED',
    'Observed charge exceeds remaining sponsored hard limit.',
    (select u from gi1 where k='cmd_hard_stop'),
    'gi1-dispose-hard-stop'
  ),
  'P0001','CZ409:SPONSORED_BUDGET_EXHAUSTED',
  'reconciliation cannot settle beyond sponsored hard limit'
);
select is((select state from public.ai_jobs where id=(select u from gi1 where k='job_hard_stop')),'NEEDS_RECONCILIATION','hard-budget failure leaves Job in reconciliation');
select is((select r.state from public.sponsored_budget_reservations r join public.ai_jobs j on j.reservation_id=r.id where j.id=(select u from gi1 where k='job_hard_stop')),'HELD_FOR_RECONCILIATION','hard-budget failure leaves reservation held');
select is((select settled_usd from public.sponsored_budget_pools where id=(select u from gi1 where k='pool_hard_stop')),0::numeric,'hard-budget failure changes no settled spend');
select is((select r.state from public.ai_runs r join public.ai_jobs j on j.ai_run_id=r.id where j.id=(select u from gi1 where k='job_hard_stop')),'COMPLETED','hard-budget failure preserves completed output');
select is((select count(*)::integer from public.domain_events where event_type='AI_JOB_RECONCILIATION_DISPOSED' and aggregate_id=(select u from gi1 where k='job_hard_stop')),0,'failed budget disposition appends no false reconciliation event');
select is((select count(*)::integer from public.command_receipts where actor_id=(select u from gi1 where k='owner') and idempotency_key='gi1-dispose-hard-stop'),0,'failed budget disposition leaves no completed or stuck command receipt');
select is((select count(*)::integer from pgmq.q_move2_vs1_ai_jobs where message->>'job_id'=(select u::text from gi1 where k='job_hard_stop')),0,'hard-budget failure does not redispatch');

select * from finish();
rollback;

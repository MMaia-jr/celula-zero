begin;
create extension if not exists pgtap with schema extensions;
select no_plan();

select has_table('private','ai_job_inference_requests','private durable inference request exists');
select ok(not has_table_privilege('anon','private.ai_job_inference_requests','select'),'anon cannot read private envelope');
select ok(not has_table_privilege('authenticated','private.ai_job_inference_requests','select'),'authenticated cannot read private envelope');
select ok(not has_table_privilege('move2_vs1_worker','private.ai_job_inference_requests','select'),'worker cannot browse private envelope');

insert into auth.users(id,aud,role,email,raw_app_meta_data,raw_user_meta_data,created_at,updated_at) values
('be010000-0000-4000-8000-000000000001','authenticated','authenticated','hv-owner@example.test','{"provider":"email","providers":["email"]}','{}',now(),now()),
('be010000-0000-4000-8000-000000000002','authenticated','authenticated','hv-other@example.test','{"provider":"email","providers":["email"]}','{}',now(),now());
insert into public.pilot_memberships(profile_id,status,source) values
('be010000-0000-4000-8000-000000000001','ACTIVE','SEED'),('be010000-0000-4000-8000-000000000002','ACTIVE','SEED');
create temporary table hv(k text primary key,u uuid,j jsonb);
select set_config('request.jwt.claim.sub','be010000-0000-4000-8000-000000000001',true);
insert into hv(k,u) select 'owner',actor_id from public.actor_memberships where profile_id='be010000-0000-4000-8000-000000000001' and role='OWNER';
insert into hv(k,u) select 'other_owner',actor_id from public.actor_memberships where profile_id='be010000-0000-4000-8000-000000000002' and role='OWNER';
insert into hv(k,j) select 'project',to_jsonb(x) from public.create_project_atomic('HV project','hv-real-provider','Behavioral real-provider fixture.','Exercise one durable path.','Human authority precedes execution.','Attributed synthesis.','No external inference.',array['hv'],'VOLUNTARY','OPEN',false) x;
update hv set u=(j->>'project_id')::uuid where k='project';
insert into hv(k,j) select 'agent',public.t3_register_bounded_agent((select u from hv where k='owner'),(select u from hv where k='project'),'HV AI','Bounded synthesis','be020000-0000-4000-8000-000000000001','hv-agent');
update hv set u=(j->>'agent_actor_id')::uuid where k='agent';
insert into hv(k,j) select 'agent2',public.t3_register_bounded_agent((select u from hv where k='owner'),(select u from hv where k='project'),'HV Other AI','Mismatch falsifier','be020000-0000-4000-8000-000000000002','hv-agent-2');
update hv set u=(j->>'agent_actor_id')::uuid where k='agent2';
insert into public.sponsored_budget_pools(cell_id,name,hard_limit_usd) select cell_id,'HV main',10 from public.projects where id=(select u from hv where k='project');
insert into hv(k,u) select 'pool',id from public.sponsored_budget_pools where name='HV main';
insert into public.sponsored_budget_pools(cell_id,name,hard_limit_usd) select cell_id,'HV small',0.1 from public.projects where id=(select u from hv where k='project');
insert into hv(k,u) select 'small',id from public.sponsored_budget_pools where name='HV small';

create function pg_temp.env(s text default '') returns jsonb language sql immutable as $$select jsonb_build_object('provider','moonshotai','model','moonshotai/kimi-k2.6','messages',jsonb_build_array(jsonb_build_object('role','system','content','Bounded synthesis only.'),jsonb_build_object('role','user','content','Fixture synthesis.'||s)),'temperature',0.3,'max_tokens',4096)$$;
create function pg_temp.make_cycle(s text) returns uuid language plpgsql as $$declare c uuid; d uuid; r jsonb; begin
 r:=public.company_core_create_cycle((select u from hv where k='owner'),(select u from hv where k='project'),'Need '||s,'Fixture problem statement.','Desired fixture result.','Context','HIGH','No authority','Internal',gen_random_uuid(),'hv-create-'||s); c:=(r->>'cycle_id')::uuid;
 select dragon_cycle_id into d from public.company_core_cycles where id=c;
 perform public.company_core_define_agreement((select u from hv where k='owner'),c,'Synthesis','Bounded','No decisions','Fixture','Human review','Sponsored only','Assist only; no human authority is delegated.',null,gen_random_uuid(),'hv-agree-'||s);
 perform public.ddr_add_cycle_ai_participant((select u from hv where k='owner'),d,(select u from hv where k='agent'),'ROOM','RESEARCHER',null,'ASSIST','Synthesis only.',gen_random_uuid(),'hv-part-'||s); return c; end$$;
create function pg_temp.enqueue_envelope(c uuid,p uuid,a numeric,e jsonb,p_idempotency_key text) returns jsonb language plpgsql as $$declare d uuid; m jsonb; purpose text; begin
 select dragon_cycle_id,'Company Core cycle '||id::text||': '||need_title into d,purpose from public.company_core_cycles where id=c;
 m:=jsonb_build_object('manifest_version','cz.ai-context.v1','project_id',(select u from hv where k='project'),'cycle_id',d,'agent_actor_id',(select u from hv where k='agent'),'purpose',purpose,'task','Produce synthesis.','cycle_records','[]'::jsonb,'repository_files','[]'::jsonb,'authority','Assist only; no human authority is delegated.','prohibited_inferences',jsonb_build_array('Human Direction','Claim','Evidence','Verification','Decision'));
 return public.company_core_authorize_and_enqueue_ai((select u from hv where k='owner'),c,(select u from hv where k='agent'),p,a,e,m,m::text,gen_random_uuid(),p_idempotency_key); end$$;
create function pg_temp.enqueue(c uuid,p uuid,a numeric,s text,p_idempotency_key text) returns jsonb language sql as $$select pg_temp.enqueue_envelope(c,p,a,pg_temp.env(s),p_idempotency_key)$$;

-- Company Core public RPCs require control of the supplied Actor, even when
-- state-dependent validation would otherwise fail first.
insert into hv(k,u) values('authority_create_command',gen_random_uuid());
insert into hv(k,j) select 'authority_create',public.company_core_create_cycle(
  (select u from hv where k='owner'),(select u from hv where k='project'),
  'Authority boundary','Actor UUID knowledge is not authority.','Deny spoofed commands.',
  'Behavioral authority falsifier.','HIGH','No delegated authority','Internal',
  (select u from hv where k='authority_create_command'),'hv-authority-create');
update hv set u=(j->>'cycle_id')::uuid where k='authority_create';
select is(
  (public.company_core_create_cycle(
    (select u from hv where k='owner'),(select u from hv where k='project'),
    'Authority boundary','Actor UUID knowledge is not authority.','Deny spoofed commands.',
    'Behavioral authority falsifier.','HIGH','No delegated authority','Internal',
    (select u from hv where k='authority_create_command'),'hv-authority-create')->>'cycle_id')::uuid,
  (select u from hv where k='authority_create'),
  'legitimate owner create_cycle replay returns the same cycle');

select set_config('request.jwt.claim.sub','be010000-0000-4000-8000-000000000002',true);
select throws_ok(format($q$select public.company_core_create_cycle(%L::uuid,%L::uuid,'Authority boundary','Actor UUID knowledge is not authority.','Deny spoofed commands.','Behavioral authority falsifier.','HIGH','No delegated authority','Internal',%L::uuid,'hv-authority-create')$q$,
  (select u from hv where k='owner'),(select u from hv where k='project'),(select u from hv where k='authority_create_command')),
  '42501','CZ403:ACTOR_CONTROL_REQUIRED','outsider cannot replay create_cycle by supplying owner Actor UUID');
select throws_ok(format($q$select public.company_core_define_agreement(%L::uuid,%L::uuid,'Expected','Scope','Exclusions','Dependencies','Criterion','Budget','Authority',null,gen_random_uuid(),'hv-spoof-define')$q$,
  (select u from hv where k='owner'),(select u from hv where k='authority_create')),
  '42501','CZ403:ACTOR_CONTROL_REQUIRED','outsider cannot define_agreement by supplying owner Actor UUID');
select throws_ok(format('select public.company_core_authorize_work(%L::uuid,%L::uuid,gen_random_uuid(),%L)',
  (select u from hv where k='owner'),(select u from hv where k='authority_create'),'hv-spoof-authorize'),
  '42501','CZ403:ACTOR_CONTROL_REQUIRED','outsider cannot authorize_work by supplying owner Actor UUID');
select throws_ok(format('select public.company_core_attach_ai_run(%L::uuid,%L::uuid,gen_random_uuid(),gen_random_uuid(),%L)',
  (select u from hv where k='owner'),(select u from hv where k='authority_create'),'hv-spoof-attach'),
  '42501','CZ403:ACTOR_CONTROL_REQUIRED','outsider cannot attach_ai_run by supplying owner Actor UUID before state validation');
select throws_ok(format('select public.company_core_record_result(%L::uuid,%L::uuid,%L,gen_random_uuid(),%L)',
  (select u from hv where k='owner'),(select u from hv where k='authority_create'),'spoofed result','hv-spoof-result'),
  '42501','CZ403:ACTOR_CONTROL_REQUIRED','outsider cannot record_result by supplying owner Actor UUID before state validation');
select throws_ok(format('select public.company_core_record_evaluation(%L::uuid,%L::uuid,%L,%L,gen_random_uuid(),%L)',
  (select u from hv where k='owner'),(select u from hv where k='authority_create'),'USEFUL','spoofed evaluation','hv-spoof-evaluation'),
  '42501','CZ403:ACTOR_CONTROL_REQUIRED','outsider cannot record_evaluation by supplying owner Actor UUID before state validation');
select throws_ok(format('select public.company_core_record_consequence(%L::uuid,%L::uuid,1,0,%L,%L,gen_random_uuid(),%L)',
  (select u from hv where k='owner'),(select u from hv where k='authority_create'),'spoofed consequence','OTHER','hv-spoof-consequence'),
  '42501','CZ403:ACTOR_CONTROL_REQUIRED','outsider cannot record_consequence by supplying owner Actor UUID before state validation');
select throws_ok(format('select public.company_core_close_cycle(%L::uuid,%L::uuid,gen_random_uuid(),%L)',
  (select u from hv where k='owner'),(select u from hv where k='authority_create'),'hv-spoof-close'),
  '42501','CZ403:ACTOR_CONTROL_REQUIRED','outsider cannot close_cycle by supplying owner Actor UUID before state validation');
select set_config('request.jwt.claim.sub','be010000-0000-4000-8000-000000000001',true);

insert into hv(k,u) values('c1',pg_temp.make_cycle('main'));
insert into hv(k,u) values('outsider_fresh_cycle',pg_temp.make_cycle('outsider-fresh'));
insert into hv(k,j) values('before_outsider_fresh',jsonb_build_object(
  'jobs',(select count(*) from public.ai_jobs),
  'reservations',(select count(*) from public.sponsored_budget_reservations),
  'queue',(select count(*) from pgmq.q_move2_vs1_ai_jobs)));
select set_config('request.jwt.claim.sub','be010000-0000-4000-8000-000000000002',true);
select throws_ok(format('select pg_temp.enqueue(%L::uuid,%L::uuid,0.5,%L,%L)',(select u from hv where k='outsider_fresh_cycle'),(select u from hv where k='pool'),'fresh','hv-outsider-fresh'),'42501','CZ403:ACTOR_CONTROL_REQUIRED','outsider cannot freshly enqueue by spoofing owner Actor UUID');
select is((select count(*) from public.ai_jobs),(select (j->>'jobs')::bigint from hv where k='before_outsider_fresh'),'outsider fresh attempt creates no Job');
select is((select count(*) from public.sponsored_budget_reservations),(select (j->>'reservations')::bigint from hv where k='before_outsider_fresh'),'outsider fresh attempt creates no reservation');
select is((select count(*) from pgmq.q_move2_vs1_ai_jobs),(select (j->>'queue')::bigint from hv where k='before_outsider_fresh'),'outsider fresh attempt creates no queue delivery');
select set_config('request.jwt.claim.sub','be010000-0000-4000-8000-000000000001',true);

insert into hv(k,u) values('extra_envelope_cycle',pg_temp.make_cycle('extra-envelope'));
insert into hv(k,j) values('before_extra_envelope',jsonb_build_object(
  'jobs',(select count(*) from public.ai_jobs),
  'reservations',(select count(*) from public.sponsored_budget_reservations),
  'queue',(select count(*) from pgmq.q_move2_vs1_ai_jobs)));
select throws_ok(format('select pg_temp.enqueue_envelope(%L::uuid,%L::uuid,0.5,(pg_temp.env(%L)||jsonb_build_object(%L,true)),%L)',(select u from hv where k='extra_envelope_cycle'),(select u from hv where k='pool'),'extra','stream','hv-extra-envelope'),'22023','CZ422:INVALID_INFERENCE_ENVELOPE','unknown top-level inference envelope key is rejected');
select is((select count(*) from public.ai_jobs),(select (j->>'jobs')::bigint from hv where k='before_extra_envelope'),'invalid envelope creates no Job');
select is((select count(*) from public.sponsored_budget_reservations),(select (j->>'reservations')::bigint from hv where k='before_extra_envelope'),'invalid envelope creates no reservation');
select is((select count(*) from pgmq.q_move2_vs1_ai_jobs),(select (j->>'queue')::bigint from hv where k='before_extra_envelope'),'invalid envelope creates no queue delivery');

insert into hv(k,j) select 'j1',pg_temp.enqueue((select u from hv where k='c1'),(select u from hv where k='pool'),0.5,'','hv-main'); update hv set u=(j->>'job_id')::uuid where k='j1';
select is((select envelope from private.ai_job_inference_requests where job_id=(select u from hv where k='j1')),pg_temp.env(''),'exact durable moonshotai envelope is retained');
select is((select envelope_digest from private.ai_job_inference_requests where job_id=(select u from hv where k='j1')),encode(extensions.digest(convert_to(pg_temp.env('')::text,'UTF8'),'sha256'),'hex'),'exact envelope digest is retained');
insert into hv(k,j) select 'rq',pg_temp.enqueue((select u from hv where k='c1'),(select u from hv where k='pool'),0.5,'','hv-main');
select is((select j->>'job_id' from hv where k='rq'),(select u::text from hv where k='j1'),'identical replay before progress returns Job');
select is((select count(*)::integer from public.ai_jobs where id=(select u from hv where k='j1')),1,'exactly one Job');
select is((select count(*)::integer from public.sponsored_budget_reservations r join public.ai_jobs j on j.reservation_id=r.id where j.id=(select u from hv where k='j1')),1,'exactly one reservation');
select is((select count(*)::integer from pgmq.q_move2_vs1_ai_jobs where message->>'job_id'=(select u::text from hv where k='j1')),1,'exactly one logical queue delivery');
insert into hv(k,j) values('before_outsider_replay',jsonb_build_object(
  'jobs',(select count(*) from public.ai_jobs),
  'reservations',(select count(*) from public.sponsored_budget_reservations),
  'queue',(select count(*) from pgmq.q_move2_vs1_ai_jobs)));
select set_config('request.jwt.claim.sub','be010000-0000-4000-8000-000000000002',true);
select throws_ok(format('select pg_temp.enqueue(%L::uuid,%L::uuid,0.5,%L,%L)',(select u from hv where k='c1'),(select u from hv where k='pool'),'','hv-main'),'42501','CZ403:ACTOR_CONTROL_REQUIRED','outsider cannot recover Job by spoofing requester actor on exact replay');
select is((select count(*) from public.ai_jobs),(select (j->>'jobs')::bigint from hv where k='before_outsider_replay'),'outsider replay leaves Job count unchanged');
select is((select count(*) from public.sponsored_budget_reservations),(select (j->>'reservations')::bigint from hv where k='before_outsider_replay'),'outsider replay leaves reservation count unchanged');
select is((select count(*) from pgmq.q_move2_vs1_ai_jobs),(select (j->>'queue')::bigint from hv where k='before_outsider_replay'),'outsider replay leaves queue count unchanged');
select set_config('request.jwt.claim.sub','be010000-0000-4000-8000-000000000001',true);
insert into hv(k,j) select 'owner_replay',pg_temp.enqueue((select u from hv where k='c1'),(select u from hv where k='pool'),0.5,'','hv-main');
select is((select j->>'job_id' from hv where k='owner_replay'),(select u::text from hv where k='j1'),'legitimate owner exact replay still returns same Job');
select throws_ok(format('select pg_temp.enqueue(%L::uuid,%L::uuid,0.5,%L,%L)',(select u from hv where k='c1'),(select u from hv where k='pool'),'changed','hv-main'),'P0001','CZ409:AI_JOB_IDEMPOTENCY_CONFLICT','incompatible replay fails closed');

grant anon,authenticated,move2_vs1_worker to postgres;
set local role anon; do $$begin begin perform 1 from private.ai_job_inference_requests; raise exception 'unexpected read'; exception when insufficient_privilege then null; end; end$$; reset role;
set local role authenticated; do $$begin begin perform 1 from private.ai_job_inference_requests; raise exception 'unexpected read'; exception when insufficient_privilege then null; end; end$$; reset role;
select pass('anon and authenticated reads fail behaviorally');

insert into hv(k,j) values('claim1',private.move2_worker_claim(30));
select is((select j->>'provider' from hv where k='claim1'),'moonshotai','claim returns actual provider');
insert into hv(k,u) values('f1','be030000-0000-4000-8000-000000000001');
grant select on table hv to move2_vs1_worker;
set local role move2_vs1_worker;
do $$begin begin perform 1 from private.ai_job_inference_requests; raise exception 'unexpected worker browse'; exception when insufficient_privilege then null; end; end$$;
select private.move2_worker_begin_dispatch((select u from hv where k='j1'),(select (j->>'claim_token')::uuid from hv where k='claim1'),(select u from hv where k='f1'));
reset role; revoke anon,authenticated,move2_vs1_worker from postgres;
select pass('worker receives envelope only through intended private function');
select is((select state from public.company_core_cycles where id=(select u from hv where k='c1')),'AI_RUNNING','begin dispatch projects AI_RUNNING');
insert into hv(k,j) select 'rr',pg_temp.enqueue((select u from hv where k='c1'),(select u from hv where k='pool'),0.5,'','hv-main');
select is((select j->>'job_id' from hv where k='rr'),(select u::text from hv where k='j1'),'identical replay after AI_RUNNING returns Job');

create function pg_temp.complete(jid uuid,outp text,cost numeric,source text) returns jsonb language sql as $$select private.move2_worker_complete_provider(jid,(select claim_token from public.ai_jobs where id=jid),(select dispatch_fence from public.ai_jobs where id=jid),outp,encode(extensions.digest(convert_to(trim(outp),'UTF8'),'sha256'),'hex'),octet_length(convert_to(trim(outp),'UTF8')),1,1,2,cost,source,(select queue_message_id from public.ai_jobs where id=jid))$$;
select throws_ok(format($q$select private.move2_worker_complete_provider(%L::uuid,(select claim_token from public.ai_jobs where id=%L::uuid),(select dispatch_fence from public.ai_jobs where id=%L::uuid),'output',repeat('0',64),6,1,1,2,0.4,'PROVIDER_REPORTED',(select queue_message_id from public.ai_jobs where id=%L::uuid))$q$,(select u from hv where k='j1'),(select u from hv where k='j1'),(select u from hv where k='j1'),(select u from hv where k='j1')),'22023','CZ422:AI_OUTPUT_PROVENANCE_MISMATCH','digest mismatch fails');

update public.ai_runs set agent_actor_id=(select u from hv where k='agent2') where id=(select ai_run_id from public.ai_jobs where id=(select u from hv where k='j1'));
select throws_ok(format('select pg_temp.complete(%L::uuid,%L,0.4,%L)',(select u from hv where k='j1'),'output','PROVIDER_REPORTED'),'P0001','CZ409:AI_JOB_CONTEXT_NOT_ACTIVE','mismatched AI Actor fails');
update public.ai_runs set agent_actor_id=(select agent_actor_id from public.ai_jobs where id=(select u from hv where k='j1')) where id=(select ai_run_id from public.ai_jobs where id=(select u from hv where k='j1'));
update public.ai_runs set requested_by_actor_id=(select u from hv where k='other_owner') where id=(select ai_run_id from public.ai_jobs where id=(select u from hv where k='j1'));
select throws_ok(format('select pg_temp.complete(%L::uuid,%L,0.4,%L)',(select u from hv where k='j1'),'output','PROVIDER_REPORTED'),'P0001','CZ409:AI_JOB_CONTEXT_NOT_ACTIVE','mismatched requester fails');
update public.ai_runs set requested_by_actor_id=(select requester_actor_id from public.ai_jobs where id=(select u from hv where k='j1')) where id=(select ai_run_id from public.ai_jobs where id=(select u from hv where k='j1'));
update public.cycle_participations set ended_at=now() where cycle_id=(select cycle_id from public.ai_runs where id=(select ai_run_id from public.ai_jobs where id=(select u from hv where k='j1'))) and actor_id=(select u from hv where k='agent');
select throws_ok(format('select pg_temp.complete(%L::uuid,%L,0.4,%L)',(select u from hv where k='j1'),'output','PROVIDER_REPORTED'),'42501','CZ403:ACTIVE_AI_CYCLE_PARTICIPATION_REQUIRED','inactive AI participation fails');
update public.cycle_participations set ended_at=null where cycle_id=(select cycle_id from public.ai_runs where id=(select ai_run_id from public.ai_jobs where id=(select u from hv where k='j1'))) and actor_id=(select u from hv where k='agent');

select pg_temp.complete((select u from hv where k='j1'),'output',0.4,'PROVIDER_REPORTED');
select is((select state from public.ai_runs where id=(select ai_run_id from public.ai_jobs where id=(select u from hv where k='j1'))),'COMPLETED','known cost completes Run');
select is((select state from public.ai_jobs where id=(select u from hv where k='j1')),'SUCCEEDED','known cost succeeds Job');
select is((select state from public.sponsored_budget_reservations where id=(select reservation_id from public.ai_jobs where id=(select u from hv where k='j1'))),'SETTLED','known cost settles reservation');
select is((select settled_usd from public.sponsored_budget_reservations where id=(select reservation_id from public.ai_jobs where id=(select u from hv where k='j1'))),0.4::numeric,'settled amount equals actual cost');
select is((select state from public.company_core_cycles where id=(select u from hv where k='c1')),'AI_COMPLETED','Company Core is AI_COMPLETED');
select is((pg_temp.enqueue((select u from hv where k='c1'),(select u from hv where k='pool'),0.5,'','hv-main')->>'job_id'),(select u::text from hv where k='j1'),'identical replay after AI_COMPLETED returns Job');
select is((select content_class from public.cycle_records where id=(select cycle_record_id from public.ai_runs where id=(select ai_run_id from public.ai_jobs where id=(select u from hv where k='j1')))),'SYNTHESIS','AI output is SYNTHESIS');
select is((select author_actor_id from public.cycle_records where id=(select cycle_record_id from public.ai_runs where id=(select ai_run_id from public.ai_jobs where id=(select u from hv where k='j1')))),(select u from hv where k='agent'),'AI Actor authored output');
select ok((select provenance @> '{"human_direction":false,"claim":false,"evidence":false,"verification":false,"decision":false}' from public.cycle_records where id=(select cycle_record_id from public.ai_runs where id=(select ai_run_id from public.ai_jobs where id=(select u from hv where k='j1')))),'provenance denies Human Direction, Claim, Evidence, Verification, Decision');

-- Exercise UNKNOWN and over-reservation completion using independent cycles.
insert into hv(k,u) values('cu',pg_temp.make_cycle('unknown')),('co',pg_temp.make_cycle('over'));
insert into hv(k,j) select 'ju',pg_temp.enqueue((select u from hv where k='cu'),(select u from hv where k='pool'),0.5,'u','hv-u'); update hv set u=(j->>'job_id')::uuid where k='ju';
insert into hv(k,j) values('clu',private.move2_worker_claim(30)); select private.move2_worker_begin_dispatch((select u from hv where k='ju'),(select (j->>'claim_token')::uuid from hv where k='clu'),'be030000-0000-4000-8000-000000000002'); select pg_temp.complete((select u from hv where k='ju'),'unknown',null,'UNKNOWN');
select is((select state from public.ai_runs where id=(select ai_run_id from public.ai_jobs where id=(select u from hv where k='ju'))),'COMPLETED','UNKNOWN cost preserves completed output');
select is((select state from public.ai_jobs where id=(select u from hv where k='ju')),'NEEDS_RECONCILIATION','UNKNOWN cost reconciles');
select is((select state from public.sponsored_budget_reservations where id=(select reservation_id from public.ai_jobs where id=(select u from hv where k='ju'))),'HELD_FOR_RECONCILIATION','UNKNOWN cost stays held');
select is((select state from public.company_core_cycles where id=(select u from hv where k='cu')),'AI_COMPLETED','UNKNOWN cost projects AI_COMPLETED');
insert into hv(k,j) select 'jo',pg_temp.enqueue((select u from hv where k='co'),(select u from hv where k='pool'),0.5,'o','hv-o'); update hv set u=(j->>'job_id')::uuid where k='jo';
insert into hv(k,j) values('clo',private.move2_worker_claim(30)); select private.move2_worker_begin_dispatch((select u from hv where k='jo'),(select (j->>'claim_token')::uuid from hv where k='clo'),'be030000-0000-4000-8000-000000000003'); select pg_temp.complete((select u from hv where k='jo'),'over',0.6,'PROVIDER_REPORTED');
select is((select state from public.ai_jobs where id=(select u from hv where k='jo')),'NEEDS_RECONCILIATION','cost above reservation is not false success');
select is((select state from public.sponsored_budget_reservations where id=(select reservation_id from public.ai_jobs where id=(select u from hv where k='jo'))),'HELD_FOR_RECONCILIATION','cost above reservation stays held');
select isnt((select cycle_record_id from public.ai_runs where id=(select ai_run_id from public.ai_jobs where id=(select u from hv where k='jo'))),null::uuid,'cost above reservation preserves output');

-- Database remains authoritative for Cell and budget admission.
select set_config('request.jwt.claim.sub','be010000-0000-4000-8000-000000000002',true);
insert into hv(k,j) select 'other_project',to_jsonb(x) from public.create_project_atomic('Other','hv-other','Other cell fixture summary for isolation testing.','Original intent for the other-cell isolation fixture.','Current intent for the other-cell isolation fixture.','Other-cell resources must remain isolated.','No authority.',array['x'],'VOLUNTARY','OPEN',false) x; update hv set u=(j->>'project_id')::uuid where k='other_project';
insert into public.sponsored_budget_pools(cell_id,name,hard_limit_usd) select cell_id,'HV other pool',1 from public.projects where id=(select u from hv where k='other_project'); insert into hv(k,u) select 'other_pool',id from public.sponsored_budget_pools where name='HV other pool';
select set_config('request.jwt.claim.sub','be010000-0000-4000-8000-000000000001',true); insert into hv(k,u) values('cm',pg_temp.make_cycle('mismatch')),('cb',pg_temp.make_cycle('budget'));
select throws_ok(format('select pg_temp.enqueue(%L::uuid,%L::uuid,0.1,%L,%L)',(select u from hv where k='cm'),(select u from hv where k='other_pool'),'m','hv-m'),'42501','CZ403:SPONSORED_POOL_CELL_MISMATCH','pool and Cell mismatch fails');
select is((select state from public.company_core_cycles where id=(select u from hv where k='cm')),'AGREEMENT_DEFINED','pool mismatch rolls back authorization');
select throws_ok(format('select pg_temp.enqueue(%L::uuid,%L::uuid,0.2,%L,%L)',(select u from hv where k='cb'),(select u from hv where k='small'),'b','hv-b'),'P0001','CZ409:SPONSORED_BUDGET_EXHAUSTED','budget exhaustion fails');
select is((select state from public.company_core_cycles where id=(select u from hv where k='cb')),'AGREEMENT_DEFINED','budget exhaustion rolls back transactionally');

select * from finish();
rollback;

begin;
create extension if not exists pgtap with schema extensions;
select no_plan();

select has_table('public','ai_jobs','Job is distinct durable domain material');
select has_table('public','sponsored_budget_pools','sponsored pool exists');
select has_table('public','sponsored_budget_reservations','reservation is distinct material');
select has_function('public','move2_enqueue_sponsored_mock_job',array['uuid','uuid','uuid','uuid','uuid','numeric','text','text','jsonb','text','text','uuid','text'],'human enqueue boundary exists');
select has_function('private','move2_worker_claim',array['integer'],'narrow worker claim exists');
select ok(not has_table_privilege('move2_vs1_worker','public.ai_jobs','SELECT'),'worker cannot browse jobs');
select ok(not has_function_privilege('move2_vs1_worker','public.anc001_start_ai_run(uuid,uuid,uuid,text)','EXECUTE'),'worker cannot invoke Human ANC start path');
select ok(has_function_privilege('move2_vs1_worker','private.move2_worker_claim(integer)','EXECUTE'),'worker can only enter claim lifecycle');

insert into auth.users(id,aud,role,email,raw_app_meta_data,raw_user_meta_data,created_at,updated_at) values
('ac010000-0000-4000-8000-000000000001','authenticated','authenticated','move2-steward@example.test','{"provider":"email","providers":["email"]}','{"name":"MOVE2 Steward"}',now(),now()),
('ac010000-0000-4000-8000-000000000002','authenticated','authenticated','move2-outsider@example.test','{"provider":"email","providers":["email"]}','{"name":"MOVE2 Outsider"}',now(),now());
insert into public.pilot_memberships(profile_id,status,source) values
('ac010000-0000-4000-8000-000000000001','ACTIVE','SEED'),('ac010000-0000-4000-8000-000000000002','ACTIVE','SEED')
on conflict(profile_id) do update set status='ACTIVE';

create temporary table m2(key text primary key,value uuid,result jsonb,n numeric);
insert into m2(key,value) select 'steward',actor_id from public.actor_memberships where profile_id='ac010000-0000-4000-8000-000000000001' and role='OWNER';
insert into m2(key,value) select 'outsider',actor_id from public.actor_memberships where profile_id='ac010000-0000-4000-8000-000000000002' and role='OWNER';
select set_config('request.jwt.claim.sub','ac010000-0000-4000-8000-000000000001',true);
insert into m2(key,result) select 'project',to_jsonb(x) from public.create_project_atomic(
  'MOVE2 durable job','move2-durable-job','Private deterministic Job fixture with durable sponsored execution.',
  'Authorize one bounded MOCK Job.','Keep Job, Run, queue and reservation distinct.','One attributable MOCK synthesis.',
  'No network, paid model, evidence, verification or decision.',array['durability'],'VOLUNTARY','OPEN',false) x;
update m2 set value=(result->>'project_id')::uuid where key='project';
insert into m2(key,result) select 'cycle',public.ddr_open_cycle((select value from m2 where key='steward'),(select value from m2 where key='project'),null,null,'ac020000-0000-4000-8000-000000000001','m2-cycle');
update m2 set value=(result->>'dragon_cycle_id')::uuid where key='cycle';
insert into m2(key,result) select 'agent',public.t3_register_bounded_agent((select value from m2 where key='steward'),(select value from m2 where key='project'),'MOVE2 MOCK Agent','Bounded deterministic agent','ac020000-0000-4000-8000-000000000002','m2-agent');
update m2 set value=(result->>'agent_actor_id')::uuid where key='agent';
select public.ddr_add_cycle_ai_participant((select value from m2 where key='steward'),(select value from m2 where key='cycle'),(select value from m2 where key='agent'),'ROOM','RESEARCHER',null,'ASSIST','Attributed synthesis only.','ac020000-0000-4000-8000-000000000003','m2-participant');
insert into m2(key,result) select 'source',public.ddr_record_cycle_record((select value from m2 where key='steward'),(select value from m2 where key='cycle'),'ORIGINAL_RECORD','MOVE2 bounded source.','{"source":"human"}','ac020000-0000-4000-8000-000000000004','m2-source');
update m2 set value=(result->>'cycle_record_id')::uuid where key='source';
insert into public.sponsored_budget_pools(cell_id,name,hard_limit_usd) select cell_id,'MOVE2 fixture',1.0000000000 from public.projects where id=(select value from m2 where key='project') returning id;
insert into m2(key,value) select 'pool',id from public.sponsored_budget_pools where name='MOVE2 fixture';

create temporary table m2_manifest as select jsonb_build_object(
 'manifest_version','cz.ai-context.v1','project_id',(select value from m2 where key='project'),'cycle_id',(select value from m2 where key='cycle'),
 'agent_actor_id',(select value from m2 where key='agent'),'purpose','Bounded synthesis','task','Synthesize only the selected record.',
 'cycle_records',jsonb_build_array(jsonb_build_object('id',(select value from m2 where key='source'),'content_class','ORIGINAL_RECORD','content_digest',encode(extensions.digest(convert_to('MOVE2 bounded source.','UTF8'),'sha256'),'hex'))),
 'repository_files','[]'::jsonb,'authority','Assist only; no human authority is delegated.','prohibited_inferences',jsonb_build_array('Decision','Verification','Evidence','Human Direction')) manifest;
alter table m2_manifest add column canonical text;
update m2_manifest set canonical=format('{"agent_actor_id":"%s","authority":"Assist only; no human authority is delegated.","cycle_id":"%s","cycle_records":[{"content_class":"ORIGINAL_RECORD","content_digest":"%s","id":"%s"}],"manifest_version":"cz.ai-context.v1","prohibited_inferences":["Decision","Verification","Evidence","Human Direction"],"project_id":"%s","purpose":"Bounded synthesis","repository_files":[],"task":"Synthesize only the selected record."}',
 (select value from m2 where key='agent'),(select value from m2 where key='cycle'),encode(extensions.digest(convert_to('MOVE2 bounded source.','UTF8'),'sha256'),'hex'),(select value from m2 where key='source'),(select value from m2 where key='project'));

insert into m2(key,result) select 'job',public.move2_enqueue_sponsored_mock_job((select value from m2 where key='steward'),(select value from m2 where key='project'),(select value from m2 where key='cycle'),(select value from m2 where key='agent'),(select value from m2 where key='pool'),0.6000000000,'Bounded synthesis','mock-v1',(select manifest from m2_manifest),(select canonical from m2_manifest),repeat('a',64),'ac020000-0000-4000-8000-000000000005','m2-job-0001');
update m2 set value=(result->>'job_id')::uuid where key='job';
select is((select state from public.ai_jobs where id=(select value from m2 where key='job')),'QUEUED','reservation exists before executable Job is queued');
select is((select state from public.ai_runs where id=(select ai_run_id from public.ai_jobs where id=(select value from m2 where key='job'))),'PREPARED','Job does not equal AI Run');
select is((select state from public.sponsored_budget_reservations where id=(select reservation_id from public.ai_jobs where id=(select value from m2 where key='job'))),'ACTIVE','capacity is actively reserved');
select is((select message->>'job_id' from pgmq.q_move2_vs1_ai_jobs where msg_id=(select queue_message_id from public.ai_jobs where id=(select value from m2 where key='job'))),(select value::text from m2 where key='job'),'queue carries only authoritative job id');

select throws_ok(format($q$select public.move2_enqueue_sponsored_mock_job('%s','%s','%s','%s','%s',0.5,'Bounded synthesis','mock-v1',%L::jsonb,%L,repeat('b',64),'ac020000-0000-4000-8000-000000000006','m2-over-0001')$q$,
 (select value from m2 where key='steward'),(select value from m2 where key='project'),(select value from m2 where key='cycle'),(select value from m2 where key='agent'),(select value from m2 where key='pool'),(select manifest::text from m2_manifest),(select canonical from m2_manifest)),
 'P0001','CZ409:SPONSORED_BUDGET_EXHAUSTED','hard sponsored budget fails closed');

select set_config('request.jwt.claim.sub','ac010000-0000-4000-8000-000000000002',true);
set local role authenticated;
select is((select count(*)::integer from public.ai_jobs),0,'other Cell cannot read private Job');
reset role;
select set_config('request.jwt.claim.sub','ac010000-0000-4000-8000-000000000001',true);

-- LOCAL TEST HARNESS ONLY:
-- allow the administrative test session to shed privileges into the exact
-- NOLOGIN worker role. This membership is transactional and is revoked below.
-- It does not establish or model production worker credential distribution.
-- Preserve the exact identifiers before shedding administrative privileges.
select set_config(
  'cz.test.move2_steward',
  (select value::text from m2 where key='steward'),
  true
);
select set_config(
  'cz.test.move2_ai_run',
  (
    select ai_run_id::text
    from public.ai_jobs
    where id=(select value from m2 where key='job')
  ),
  true
);

grant move2_vs1_worker to postgres;

-- Execute the real worker operations as the narrow worker role.
-- Do not require that role to see or execute the pgTAP framework itself.
set local role move2_vs1_worker;

select private.move2_worker_claim(30);

do $worker_browse$
begin
  begin
    perform 1 from public.ai_jobs limit 1;

    raise exception using
      errcode='P0001',
      message='CZTEST:WORKER_JOB_BROWSE_UNEXPECTEDLY_ALLOWED';
  exception
    when insufficient_privilege then
      null;
  end;
end
$worker_browse$;

do $worker_human_authority$
begin
  begin
    perform public.anc001_start_ai_run(
      current_setting('cz.test.move2_steward')::uuid,
      current_setting('cz.test.move2_ai_run')::uuid,
      gen_random_uuid(),
      'worker-denied-0001'
    );

    raise exception using
      errcode='P0001',
      message='CZTEST:WORKER_HUMAN_AUTHORITY_UNEXPECTEDLY_ALLOWED';
  exception
    when insufficient_privilege then
      null;
  end;
end
$worker_human_authority$;

reset role;

revoke move2_vs1_worker from postgres;

-- Assertions belong to the test harness, not to the production worker.
select is(
  (
    select state
    from public.ai_jobs
    where id=(select value from m2 where key='job')
  ),
  'CLAIMED',
  'independent narrow worker can claim after enqueue transaction'
);

select pass(
  'worker cannot browse unrelated Job state'
);

select pass(
  'worker cannot call Human authority path'
);

insert into m2(key,value) select 'first_claim_token',claim_token from public.ai_jobs where id=(select value from m2 where key='job');
update public.ai_jobs set claim_expires_at=clock_timestamp()-interval '1 second' where id=(select value from m2 where key='job');
update pgmq.q_move2_vs1_ai_jobs set vt=clock_timestamp()-interval '1 second' where msg_id=(select queue_message_id from public.ai_jobs where id=(select value from m2 where key='job'));
insert into m2(key,result) values('reclaim',private.move2_worker_claim(30));
select isnt((select result->>'claim_token' from m2 where key='reclaim'),(select value::text from m2 where key='first_claim_token'),'worker death before dispatch becomes safely reclaimable');
select is((select state from public.ai_runs where id=(select ai_run_id from public.ai_jobs where id=(select value from m2 where key='job'))),'PREPARED','pre-dispatch reclaim creates no execution attempt');
select private.move2_worker_begin_dispatch((select value from m2 where key='job'),(select (result->>'claim_token')::uuid from m2 where key='reclaim'),'ac030000-0000-4000-8000-000000000001');
select ok(private.move2_worker_mark_uncertain((select value from m2 where key='job'),(select (result->>'claim_token')::uuid from m2 where key='reclaim'),'ac030000-0000-4000-8000-000000000001',(select queue_message_id from public.ai_jobs where id=(select value from m2 where key='job'))),'uncertain dispatch is explicitly marked');
select is((select state from public.ai_jobs where id=(select value from m2 where key='job')),'NEEDS_RECONCILIATION','uncertain dispatch cannot automatically retry');
select is((select state from public.sponsored_budget_reservations where id=(select reservation_id from public.ai_jobs where id=(select value from m2 where key='job'))),'HELD_FOR_RECONCILIATION','uncertain dispatch retains economic hold');

select cmp_ok((select p.settled_usd+coalesce(sum(r.amount_usd) filter(where r.state in ('ACTIVE','HELD_FOR_RECONCILIATION')),0) from public.sponsored_budget_pools p left join public.sponsored_budget_reservations r on r.pool_id=p.id where p.id=(select value from m2 where key='pool') group by p.id),'<=',(select hard_limit_usd from public.sponsored_budget_pools where id=(select value from m2 where key='pool')),'settled plus held never exceeds hard limit');

insert into m2(key,result) select 'terminal_job',public.move2_enqueue_sponsored_mock_job((select value from m2 where key='steward'),(select value from m2 where key='project'),(select value from m2 where key='cycle'),(select value from m2 where key='agent'),(select value from m2 where key='pool'),0.1000000000,'Bounded synthesis','mock-v1',(select manifest from m2_manifest),(select canonical from m2_manifest),repeat('d',64),'ac020000-0000-4000-8000-000000000007','m2-terminal-0001');
update m2 set value=(result->>'job_id')::uuid where key='terminal_job';
update public.sponsored_budget_reservations set state='RELEASED' where id=(select reservation_id from public.ai_jobs where id=(select value from m2 where key='terminal_job'));
update public.ai_jobs set state='CANCELLED' where id=(select value from m2 where key='terminal_job');
select is(private.move2_worker_claim(30),null::jsonb,'terminal stale queue delivery is not executable');
select is((select count(*)::integer from pgmq.q_move2_vs1_ai_jobs where msg_id=(select queue_message_id from public.ai_jobs where id=(select value from m2 where key='terminal_job'))),0,'terminal stale queue delivery is archived');

-- Synthetic preparedness shock: one user/context, not 100 users or demonstrated scale.
insert into public.sponsored_budget_pools(cell_id,name,hard_limit_usd)
  select cell_id,'MOVE2 N100',10.0000000000 from public.projects where id=(select value from m2 where key='project');
insert into m2(key,value) select 'stress_pool',id from public.sponsored_budget_pools where name='MOVE2 N100';
do $stress$
declare i integer; v_result jsonb;
begin
  for i in 1..100 loop
    v_result:=public.move2_enqueue_sponsored_mock_job(
      (select value from m2 where key='steward'),(select value from m2 where key='project'),(select value from m2 where key='cycle'),
      (select value from m2 where key='agent'),(select value from m2 where key='stress_pool'),0.1000000000,'Bounded synthesis','mock-v1',
      (select manifest from m2_manifest),(select canonical from m2_manifest),repeat('c',64),gen_random_uuid(),'m2-stress-'||i);
  end loop;
end $stress$;
select is((select count(*)::integer from public.ai_jobs j join public.sponsored_budget_reservations r on r.id=j.reservation_id where r.pool_id=(select value from m2 where key='stress_pool')),100,'N=100 synthetic Jobs admitted at exact hard limit');
select is((select count(*)::integer from public.ai_jobs j join public.sponsored_budget_reservations r on r.id=j.reservation_id where r.pool_id=(select value from m2 where key='stress_pool') and j.state='QUEUED'),100,'N=100 synthetic Jobs durably queued');

do $stress_worker$
declare i integer; v_claim jsonb; v_fence uuid; v_output text:='Deterministic sponsored MOCK synthesis.'; v_digest text;
begin
  v_digest:=encode(extensions.digest(convert_to(v_output,'UTF8'),'sha256'),'hex');
  for i in 1..100 loop
    v_claim:=private.move2_worker_claim(30);
    if v_claim is null then raise exception 'N100 worker unexpectedly idle at %',i; end if;
    v_fence:=gen_random_uuid();
    perform private.move2_worker_begin_dispatch((v_claim->>'job_id')::uuid,(v_claim->>'claim_token')::uuid,v_fence);
    perform private.move2_worker_complete_mock((v_claim->>'job_id')::uuid,(v_claim->>'claim_token')::uuid,v_fence,v_output,v_digest,octet_length(convert_to(v_output,'UTF8')),(v_claim->>'message_id')::bigint);
  end loop;
end $stress_worker$;

select is((select count(*)::integer from public.ai_jobs j join public.sponsored_budget_reservations r on r.id=j.reservation_id where r.pool_id=(select value from m2 where key='stress_pool') and j.state='SUCCEEDED'),100,'N100 terminal Jobs = 100');
select is((select count(distinct j.ai_run_id)::integer from public.ai_jobs j join public.sponsored_budget_reservations r on r.id=j.reservation_id where r.pool_id=(select value from m2 where key='stress_pool')),100,'N100 unique execution attempts = 100 and duplicate attempts = 0');
select is((select count(*)::integer from public.ai_jobs j join public.sponsored_budget_reservations r on r.id=j.reservation_id where r.pool_id=(select value from m2 where key='stress_pool') and j.state='NEEDS_RECONCILIATION'),0,'N100 reconciliation count = 0');
select is((select count(*)::integer from public.sponsored_budget_reservations where pool_id=(select value from m2 where key='stress_pool') and state in ('ACTIVE','HELD_FOR_RECONCILIATION')),0,'N100 active reservations = 0');
select is((select settled_usd from public.sponsored_budget_pools where id=(select value from m2 where key='stress_pool')),0::numeric,'N100 settled amount = 0');
select is((select coalesce(sum(amount_usd),0) from public.sponsored_budget_reservations where pool_id=(select value from m2 where key='stress_pool') and state in ('ACTIVE','HELD_FOR_RECONCILIATION')),0::numeric,'N100 reserved amount = 0');
select is((select hard_limit_usd from public.sponsored_budget_pools where id=(select value from m2 where key='stress_pool')),10::numeric,'N100 hard limit = 10 synthetic USD');
select is((select count(*)::integer from public.ai_jobs j join public.sponsored_budget_reservations r on r.id=j.reservation_id where r.pool_id=(select value from m2 where key='stress_pool') and j.cell_id<>(select cell_id from public.sponsored_budget_pools where id=(select value from m2 where key='stress_pool'))),0,'N100 cross-Cell leakage observed NO');

select * from finish();
rollback;

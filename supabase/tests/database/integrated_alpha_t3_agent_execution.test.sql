begin;

create extension if not exists pgtap with schema extensions;
select no_plan();

select has_table(
  'public','agent_task_executions',
  'T3 Block2 has reconstructible SoftwareAgent execution material'
);

select has_function(
  'public','t3_start_agent_execution',
  array['uuid','uuid','text','text','text','uuid','text'],
  'SoftwareAgent execution start command exists'
);
select has_function(
  'public','t3_complete_agent_execution',
  array['uuid','uuid','text','text','text','text','bigint','uuid','text'],
  'SoftwareAgent execution completion command exists'
);
select has_function(
  'public','t3_fail_agent_execution',
  array['uuid','uuid','text','uuid','text'],
  'SoftwareAgent execution failure command exists'
);
select has_function(
  'public','t3_reconcile_agent_execution',
  array['uuid'],
  'SoftwareAgent execution reconciliation exists'
);

select ok(
  has_function_privilege(
    'authenticated',
    'public.t3_start_agent_execution(uuid,uuid,text,text,text,uuid,text)',
    'EXECUTE'
  ),
  'authenticated may invoke execution start'
);
select ok(
  not has_function_privilege(
    'anon',
    'public.t3_start_agent_execution(uuid,uuid,text,text,text,uuid,text)',
    'EXECUTE'
  ),
  'anon cannot invoke execution start'
);
select ok(
  not has_function_privilege(
    'anon',
    'public.t3_complete_agent_execution(uuid,uuid,text,text,text,text,bigint,uuid,text)',
    'EXECUTE'
  ),
  'anon cannot complete SoftwareAgent execution'
);

insert into auth.users(
  id,aud,role,email,raw_app_meta_data,raw_user_meta_data,created_at,updated_at
) values (
  'a7000000-0000-4000-8000-000000000001',
  'authenticated','authenticated','t3-exec-steward@example.test',
  '{"provider":"email","providers":["email"]}',
  '{"name":"T3 Exec Steward"}',now(),now()
);

insert into public.pilot_memberships(profile_id,status,source)
values ('a7000000-0000-4000-8000-000000000001','ACTIVE','SEED')
on conflict (profile_id) do update set status='ACTIVE';

create temporary table t3x(
  key text primary key,
  value uuid,
  result jsonb,
  count_value bigint
);

insert into t3x(key,value)
select 'steward_actor',actor_id
from public.actor_memberships
where profile_id='a7000000-0000-4000-8000-000000000001'
  and role='OWNER';

select set_config(
  'request.jwt.claim.sub',
  'a7000000-0000-4000-8000-000000000001',
  true
);

insert into t3x(key,result)
select 'project',to_jsonb(x)
from public.create_project_atomic(
  'Projeto T3 Execution',
  'projeto-t3-execution',
  'Projeto local determinístico para testar execução atribuível de SoftwareAgent sob autoridade humana limitada.',
  'O operador humano e o SoftwareAgent devem permanecer identidades distintas durante toda a execução.',
  'Executar uma tarefa limitada sem converter execução em legitimidade, Verification ou Decision.',
  'Um execution record reconstruível com início e conclusão explícitos.',
  'Sem rede externa, deploy, contato externo, serviço pago, decisão autônoma ou autoridade implícita.',
  array['agent-execution','bounded-authority'],
  'VOLUNTARY','OPEN',true
) x;
update t3x set value=(result->>'project_id')::uuid where key='project';

insert into t3x(key,result)
select 'agent', public.t3_register_bounded_agent(
  (select value from t3x where key='steward_actor'),
  (select value from t3x where key='project'),
  'CZ-Agent-Execution-Test',
  'T3 deterministic local operator',
  'b7000000-0000-4000-8000-000000000001',
  't3-exec-agent-register'
);
update t3x set value=(result->>'agent_actor_id')::uuid where key='agent';

insert into t3x(key,result)
select 'task', public.t3_authorize_agent_task(
  (select value from t3x where key='steward_actor'),
  (select value from t3x where key='project'),
  (select value from t3x where key='agent'),
  'Inspect the Decision to Outcome boundary using only the exact repository-relative paths authorized for this task.',
  array[
    'supabase/migrations/20260825235000_integrated_alpha_t2_decision_outcome_history.sql',
    'apps/web/lib/data/decisions.ts'
  ]::text[],
  now() + interval '2 hours',
  'b7000000-0000-4000-8000-000000000002',
  't3-exec-delegation',
  'b7000000-0000-4000-8000-000000000003',
  't3-exec-task-authorize'
);
update t3x set value=(result->>'agent_task_id')::uuid where key='task';

insert into t3x(key,count_value)
select 'claims_before', count(*) from public.claims;
insert into t3x(key,count_value)
select 'decisions_before', count(*) from public.domain_decisions;
insert into t3x(key,count_value)
select 'outcomes_before', count(*) from public.outcomes;

insert into t3x(key,result)
select 'execution', public.t3_start_agent_execution(
  (select value from t3x where key='agent'),
  (select value from t3x where key='task'),
  'OLLAMA_LOCAL',
  'fixture-model',
  repeat('a',64),
  'b7000000-0000-4000-8000-000000000004',
  't3-exec-start'
);
update t3x set value=(result->>'execution_id')::uuid where key='execution';

select is(
  (select state from public.agent_task_executions
   where id=(select value from t3x where key='execution')),
  'STARTED',
  'execution is explicitly STARTED'
);

select is(
  (select state from public.agent_tasks
   where id=(select value from t3x where key='task')),
  'RUNNING',
  'task is RUNNING only after execution start'
);

select is(
  (select runtime_kind from public.agent_task_executions
   where id=(select value from t3x where key='execution')),
  'OLLAMA_LOCAL',
  'first real runtime class is local Ollama only'
);

select is(
  (select operator_profile_id from public.agent_task_executions
   where id=(select value from t3x where key='execution')),
  'a7000000-0000-4000-8000-000000000001'::uuid,
  'execution preserves accountable operator profile'
);

select is(
  (select authorized_by_actor_id
   from public.domain_events
   where aggregate_type='AGENT_EXECUTION'
     and aggregate_id=(select value from t3x where key='execution')
     and event_type='AGENT_EXECUTION_STARTED'),
  (select value from t3x where key='agent'),
  'canonical B1 event recorder keeps executing SoftwareAgent in authorized_by_actor_id'
);

select is(
  (
    select d.delegator_actor_id
    from public.domain_events de
    join public.delegations d on d.id=de.delegation_id
    where de.aggregate_type='AGENT_EXECUTION'
      and de.aggregate_id=(select value from t3x where key='execution')
      and de.event_type='AGENT_EXECUTION_STARTED'
  ),
  (select value from t3x where key='steward_actor'),
  'execution event delegation preserves the human steward as authority source'
);

select is(
  (
    select d.delegate_actor_id
    from public.domain_events de
    join public.delegations d on d.id=de.delegation_id
    where de.aggregate_type='AGENT_EXECUTION'
      and de.aggregate_id=(select value from t3x where key='execution')
      and de.event_type='AGENT_EXECUTION_STARTED'
  ),
  (select value from t3x where key='agent'),
  'execution event delegation preserves the SoftwareAgent as delegate'
);

select is(
  (select actor_id
   from public.domain_events
   where aggregate_type='AGENT_EXECUTION'
     and aggregate_id=(select value from t3x where key='execution')
     and event_type='AGENT_EXECUTION_STARTED'),
  (select value from t3x where key='agent'),
  'execution event attributes execution to SoftwareAgent'
);

select lives_ok(
  $$
    select public.t3_complete_agent_execution(
      (select value from t3x where key='agent'),
      (select value from t3x where key='execution'),
      'NO_AUTOMATIC_PATH_FOUND',
      'No automatic Decision to Outcome creation path was found within the bounded fixture inspection.',
      'This is unverified fixture output used only to test execution material semantics.',
      repeat('b',64),
      512,
      'b7000000-0000-4000-8000-000000000005',
      't3-exec-complete'
    )
  $$,
  'SoftwareAgent execution can complete under the same bounded authority'
);

select is(
  (select state from public.agent_task_executions
   where id=(select value from t3x where key='execution')),
  'COMPLETED',
  'execution becomes COMPLETED explicitly'
);

select is(
  (select state from public.agent_tasks
   where id=(select value from t3x where key='task')),
  'COMPLETED',
  'task becomes COMPLETED explicitly'
);

select is(
  (select output_uri from public.agent_task_executions
   where id=(select value from t3x where key='execution')),
  'urn:cz:agent-output:sha256:' || repeat('b',64),
  'execution output URI is digest-bound'
);

select is(
  public.t3_reconcile_agent_execution(
    (select value from t3x where key='execution')
  ),
  '{}'::text[],
  'completed execution reconciles with task and event history'
);

select is(
  (select count(*) from public.claims),
  (select count_value from t3x where key='claims_before'),
  'runtime completion does not silently create a Claim entity'
);

select is(
  (select count(*) from public.domain_decisions),
  (select count_value from t3x where key='decisions_before'),
  'runtime completion does not silently create a domain Decision'
);

select is(
  (select count(*) from public.outcomes),
  (select count_value from t3x where key='outcomes_before'),
  'runtime completion does not silently create an Outcome'
);

select throws_ok(
  $$
    select public.t3_start_agent_execution(
      (select value from t3x where key='agent'),
      (select value from t3x where key='task'),
      'REMOTE_API',
      'forbidden-runtime',
      repeat('c',64),
      'b7000000-0000-4000-8000-000000000006',
      't3-remote-runtime-denied'
    )
  $$,
  '42501',
  'CZ403:AGENT_EXECUTION_AUTHORITY_NOT_EXACT',
  'completed task cannot be restarted because exact execution authority is no longer valid'
);

select * from finish();
rollback;

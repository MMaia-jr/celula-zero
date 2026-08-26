begin;

create extension if not exists pgtap with schema extensions;
select no_plan();

select has_table('public', 'agent_tasks', 'T3 has explicit bounded agent task material');
select has_function(
  'public',
  't3_register_bounded_agent',
  array['uuid','uuid','text','text','uuid','text'],
  'bounded SoftwareAgent registration exists'
);
select has_function(
  'public',
  't3_authorize_agent_task',
  array['uuid','uuid','uuid','text','text[]','timestamp with time zone','uuid','text','uuid','text'],
  'bounded human task authorization exists'
);
select has_function(
  'public',
  't3_reconcile_agent_task',
  array['uuid'],
  'agent task reconciler exists'
);

select ok(
  has_function_privilege(
    'authenticated',
    'public.t3_register_bounded_agent(uuid,uuid,text,text,uuid,text)',
    'EXECUTE'
  ),
  'authenticated may invoke bounded agent registration'
);
select ok(
  not has_function_privilege(
    'anon',
    'public.t3_register_bounded_agent(uuid,uuid,text,text,uuid,text)',
    'EXECUTE'
  ),
  'anon cannot invoke bounded agent registration'
);
select ok(
  has_function_privilege(
    'authenticated',
    'public.t3_authorize_agent_task(uuid,uuid,uuid,text,text[],timestamp with time zone,uuid,text,uuid,text)',
    'EXECUTE'
  ),
  'authenticated may invoke bounded task authorization'
);
select ok(
  not has_function_privilege(
    'anon',
    'public.t3_authorize_agent_task(uuid,uuid,uuid,text,text[],timestamp with time zone,uuid,text,uuid,text)',
    'EXECUTE'
  ),
  'anon cannot authorize agent tasks'
);

insert into auth.users(
  id, aud, role, email, raw_app_meta_data, raw_user_meta_data, created_at, updated_at
) values
(
  'a5000000-0000-4000-8000-000000000001',
  'authenticated','authenticated','t3-steward@example.test',
  '{"provider":"email","providers":["email"]}',
  '{"name":"T3 Steward"}', now(), now()
),
(
  'a5000000-0000-4000-8000-000000000002',
  'authenticated','authenticated','t3-outsider@example.test',
  '{"provider":"email","providers":["email"]}',
  '{"name":"T3 Outsider"}', now(), now()
);

insert into public.pilot_memberships(profile_id, status, source)
values
  ('a5000000-0000-4000-8000-000000000001', 'ACTIVE', 'SEED'),
  ('a5000000-0000-4000-8000-000000000002', 'ACTIVE', 'SEED')
on conflict (profile_id) do update set status='ACTIVE';

create temporary table t3(
  key text primary key,
  value uuid,
  result jsonb
);

insert into t3(key, value)
select 'steward_actor', actor_id
from public.actor_memberships
where profile_id='a5000000-0000-4000-8000-000000000001'
  and role='OWNER';

insert into t3(key, value)
select 'outsider_actor', actor_id
from public.actor_memberships
where profile_id='a5000000-0000-4000-8000-000000000002'
  and role='OWNER';

select set_config('request.jwt.claim.sub','a5000000-0000-4000-8000-000000000001',true);

insert into t3(key, result)
select 'project', to_jsonb(x)
from public.create_project_atomic(
  'Projeto Integrated T3 Agent Authority',
  'projeto-integrated-t3-agent-authority',
  'Projeto local para testar autoridade humana limitada sobre um SoftwareAgent atribuível.',
  'Preservar operador humano, agente de software, delegação e execução como entidades distintas.',
  'Testar a fronteira Decision para Outcome sem permitir legitimidade implícita ao agente.',
  'Uma tarefa limitada e reconstruível para inspeção técnica do T2.4.',
  'Sem rede, deploy, contato externo, serviço pago, autoridade econômica ou decisão autônoma.',
  array['software-agent','bounded-authority','decision-outcome'],
  'VOLUNTARY','OPEN',true
) x;

update t3 set value=(result->>'project_id')::uuid where key='project';

insert into t3(key, result)
select 'agent', public.t3_register_bounded_agent(
  (select value from t3 where key='steward_actor'),
  (select value from t3 where key='project'),
  'CZ-Agent-001',
  'T3 Steward local operator',
  'b5000000-0000-4000-8000-000000000001',
  't3-agent-register'
);
update t3 set value=(result->>'agent_actor_id')::uuid where key='agent';

select ok(
  (select value from t3 where key='agent') <>
  (select value from t3 where key='steward_actor'),
  'SoftwareAgent Actor is distinct from human steward Actor'
);

select is(
  (select kind from public.actors where id=(select value from t3 where key='agent')),
  'AI_AGENT',
  'registered actor is AI_AGENT'
);

select is(
  (select operator_profile_id from public.actors where id=(select value from t3 where key='agent')),
  'a5000000-0000-4000-8000-000000000001'::uuid,
  'SoftwareAgent preserves accountable operator profile'
);

select is(
  (select count(*)::integer
   from public.project_members
   where project_id=(select value from t3 where key='project')
     and actor_id=(select value from t3 where key='agent')),
  0,
  'bounded T3 registration creates no implicit project membership'
);

select is(
  (select count(*)::integer
   from public.role_assignments
   where actor_id=(select value from t3 where key='agent')
     and scope_type='PROJECT'
     and scope_id=(select value from t3 where key='project')
     and revoked_at is null),
  0,
  'bounded T3 registration creates no implicit role assignment'
);

insert into t3(key, result)
select 'task', public.t3_authorize_agent_task(
  (select value from t3 where key='steward_actor'),
  (select value from t3 where key='project'),
  (select value from t3 where key='agent'),
  'Inspect the T2 Decision to Outcome boundary and determine whether issuing a Decision can automatically create an Outcome.',
  array[
    'supabase/migrations/20260825235000_integrated_alpha_t2_decision_outcome_history.sql',
    'apps/web/lib/data/decisions.ts',
    'apps/web/app/decisions/[decisionId]/actions.ts',
    'supabase/tests/database/integrated_alpha_t2_decision_outcome_history.test.sql'
  ]::text[],
  now() + interval '2 hours',
  'b5000000-0000-4000-8000-000000000002',
  't3-agent-execute-delegation',
  'b5000000-0000-4000-8000-000000000003',
  't3-agent-task-authorize'
);
update t3 set value=(result->>'agent_task_id')::uuid where key='task';

select is(
  (select state from public.agent_tasks where id=(select value from t3 where key='task')),
  'AUTHORIZED',
  'agent task starts explicitly AUTHORIZED, not executed'
);

select is(
  (select network_policy from public.agent_tasks where id=(select value from t3 where key='task')),
  'OFF',
  'first T3 task has network OFF'
);

select is(
  (select cardinality(scope_paths) from public.agent_tasks where id=(select value from t3 where key='task')),
  4,
  'task preserves the exact bounded repository path set'
);

select ok(
  private.b1_has_capability(
    (select value from t3 where key='agent'),
    'agent.execute',
    'PROJECT',
    (select value from t3 where key='project')
  ),
  'agent receives exact agent.execute capability through bounded delegation'
);

select ok(
  not private.b1_has_capability(
    (select value from t3 where key='agent'),
    'decision.issue',
    'PROJECT',
    (select value from t3 where key='project')
  ),
  'agent does not acquire decision.issue'
);

select ok(
  not private.b1_has_capability(
    (select value from t3 where key='agent'),
    'delegation.manage',
    'PROJECT',
    (select value from t3 where key='project')
  ),
  'agent does not acquire delegation.manage'
);

select is(
  (
    select concat_ws('|',
      d.capability_code,
      d.scope_type,
      d.scope_id::text,
      d.delegate_actor_id::text,
      d.delegator_actor_id::text,
      d.status
    )
    from public.agent_tasks t
    join public.delegations d on d.id=t.delegation_id
    where t.id=(select value from t3 where key='task')
  ),
  (
    select concat_ws('|',
      'agent.execute',
      'PROJECT',
      (select value::text from t3 where key='project'),
      (select value::text from t3 where key='agent'),
      (select value::text from t3 where key='steward_actor'),
      'ACTIVE'
    )
  ),
  'delegation is exact agent.execute / PROJECT / agent / human steward'
);

select is(
  public.t3_reconcile_agent_task((select value from t3 where key='task')),
  '{}'::text[],
  'agent task material reconciles with bounded delegation and event'
);

select is(
  (select count(*)::integer
   from public.domain_events
   where aggregate_type='AGENT_TASK'
     and aggregate_id=(select value from t3 where key='task')
     and event_type='AGENT_TASK_AUTHORIZED'),
  1,
  'exactly one task authorization event exists'
);

select throws_ok(
  $$
    select public.t3_authorize_agent_task(
      (select value from t3 where key='steward_actor'),
      (select value from t3 where key='project'),
      (select value from t3 where key='agent'),
      'Attempt an overlong authorization window that must fail before any delegation is created.',
      array['apps/web/lib/data/decisions.ts']::text[],
      now() + interval '25 hours',
      'b5000000-0000-4000-8000-000000000004',
      't3-too-long-delegation',
      'b5000000-0000-4000-8000-000000000005',
      't3-too-long-task'
    )
  $$,
  '22023',
  'CZ422:AGENT_TASK_WINDOW_TOO_WIDE',
  'agent task validity is bounded to at most 24 hours'
);

select throws_ok(
  $$
    select public.t3_authorize_agent_task(
      (select value from t3 where key='steward_actor'),
      (select value from t3 where key='project'),
      (select value from t3 where key='agent'),
      'Attempt a path traversal outside the explicitly authorized repository-relative task scope.',
      array['../secret']::text[],
      now() + interval '1 hour',
      'b5000000-0000-4000-8000-000000000006',
      't3-bad-path-delegation',
      'b5000000-0000-4000-8000-000000000007',
      't3-bad-path-task'
    )
  $$,
  '22023',
  'CZ422:INVALID_AGENT_TASK_PATH',
  'task scope rejects path traversal'
);

select set_config('request.jwt.claim.sub','a5000000-0000-4000-8000-000000000002',true);

select throws_ok(
  $$
    select public.t3_authorize_agent_task(
      (select value from t3 where key='outsider_actor'),
      (select value from t3 where key='project'),
      (select value from t3 where key='agent'),
      'An unrelated human must not be able to authorize this SoftwareAgent inside another steward project.',
      array['apps/web/lib/data/decisions.ts']::text[],
      now() + interval '1 hour',
      'b5000000-0000-4000-8000-000000000008',
      't3-outsider-delegation',
      'b5000000-0000-4000-8000-000000000009',
      't3-outsider-task'
    )
  $$,
  '42501',
  'CZ403:CAPABILITY_DENIED',
  'unrelated human cannot authorize the project SoftwareAgent'
);

select * from finish();
rollback;

begin;

create extension if not exists pgtap with schema extensions;

select no_plan();

select has_table(
  'public',
  'cycle_bindings',
  'DDR-BE-002 has minimal composition bridge to canonical objects'
);

select has_function(
  'public',
  'ddr_bind_cycle_object',
  array['uuid','uuid','uuid','text','uuid','text','uuid','text'],
  'CycleBinding command exists'
);

select has_function(
  'public',
  'ddr_open_child_cycle',
  array['uuid','uuid','uuid','uuid','text'],
  'fractal child-cycle command exists'
);

select has_function(
  'public',
  'ddr_close_cycle',
  array['uuid','uuid','text','uuid','text'],
  'explicit Celebration close command exists'
);

select has_trigger(
  'public',
  'cycle_bindings',
  'cycle_bindings_append_only',
  'CycleBindings are append-only'
);


insert into auth.users(
  id,
  aud,
  role,
  email,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at
) values (
  'd3000000-0000-4000-8000-000000000001',
  'authenticated',
  'authenticated',
  'ddr-be002-steward@example.test',
  '{"provider":"email","providers":["email"]}',
  '{"name":"DDR BE002 Steward"}',
  now(),
  now()
);

insert into public.pilot_memberships(
  profile_id,
  status,
  source
) values (
  'd3000000-0000-4000-8000-000000000001',
  'ACTIVE',
  'SEED'
)
on conflict (profile_id)
do update set status = 'ACTIVE';


create temporary table ddr_be002(
  key text primary key,
  value uuid,
  result jsonb
);


insert into ddr_be002(key, value)
select 'steward_actor', actor_id
from public.actor_memberships
where profile_id = 'd3000000-0000-4000-8000-000000000001'
  and role = 'OWNER';


select set_config(
  'request.jwt.claim.sub',
  'd3000000-0000-4000-8000-000000000001',
  true
);


insert into ddr_be002(key, result)
select 'project', to_jsonb(x)
from public.create_project_atomic(
  'Projeto DDR BE002',
  'projeto-ddr-be002',
  'Projeto local para atravessar Planning, Doing e Celebrating usando objetos canônicos existentes.',
  'Transformar um Dream em plano, trabalho atribuível, resultado e novo Dream sem criar task engine paralela.',
  'Compor DragonCycle com Need e T3 usando CycleBinding sem alterar as classes semânticas existentes.',
  'Um ciclo completo e reconstruível no backend até um child DragonCycle.',
  'Sem frontend, deploy, dinheiro, utilidade externa ou inferência de adoção.',
  array['plan','doing','celebration','recursion'],
  'VOLUNTARY',
  'OPEN',
  true
) x;

update ddr_be002
set value = (result ->> 'project_id')::uuid
where key = 'project';


insert into ddr_be002(key, result)
select 'cycle', public.ddr_open_cycle(
  (select value from ddr_be002 where key = 'steward_actor'),
  (select value from ddr_be002 where key = 'project'),
  null,
  null,
  'd4000000-0000-4000-8000-000000000001',
  'ddr-be002-root-cycle'
);

update ddr_be002
set value = (result ->> 'dragon_cycle_id')::uuid
where key = 'cycle';


insert into ddr_be002(key, result)
select 'dream', public.ddr_record_cycle_record(
  (select value from ddr_be002 where key = 'steward_actor'),
  (select value from ddr_be002 where key = 'cycle'),
  'ORIGINAL_RECORD',
  'Quero demonstrar que um Dream pode gerar plano, trabalho real no backend, resultado, aprendizagem e um novo ciclo sem duplicar T1, T2 ou T3.',
  '{}'::jsonb,
  'd4000000-0000-4000-8000-000000000002',
  'ddr-be002-dream'
);

update ddr_be002
set value = (result ->> 'cycle_record_id')::uuid
where key = 'dream';


select public.ddr_set_cycle_direction(
  (select value from ddr_be002 where key = 'steward_actor'),
  (select value from ddr_be002 where key = 'cycle'),
  (select value from ddr_be002 where key = 'dream'),
  'd4000000-0000-4000-8000-000000000003',
  'ddr-be002-direction'
);


select public.ddr_transition_cycle_phase(
  (select value from ddr_be002 where key = 'steward_actor'),
  (select value from ddr_be002 where key = 'cycle'),
  'PLANNING',
  'A direção humana está explícita e agora será decomposta em uma ação backend mínima.',
  'd4000000-0000-4000-8000-000000000004',
  'ddr-be002-to-planning'
);


insert into ddr_be002(key, result)
select 'plan_record', public.ddr_record_cycle_record(
  (select value from ddr_be002 where key = 'steward_actor'),
  (select value from ddr_be002 where key = 'cycle'),
  'ORIGINAL_RECORD',
  'Primeiro precisamos representar uma necessidade concreta e depois executar uma inspeção limitada por um SoftwareAgent.',
  '{}'::jsonb,
  'd4000000-0000-4000-8000-000000000005',
  'ddr-be002-plan-record'
);

update ddr_be002
set value = (result ->> 'cycle_record_id')::uuid
where key = 'plan_record';


insert into ddr_be002(key, result)
select 'need', public.t1_create_need(
  (select value from ddr_be002 where key = 'steward_actor'),
  (select value from ddr_be002 where key = 'project'),
  'Need DDR BE002',
  'Precisamos demonstrar uma ponte reconstruível entre Planning e trabalho canônico existente.',
  'O Need materializa parte do plano sem transformar o CycleRecord no próprio Need.',
  'd4000000-0000-4000-8000-000000000006',
  'ddr-be002-create-need'
);

update ddr_be002
set value = (result ->> 'need_id')::uuid
where key = 'need';


insert into ddr_be002(key, result)
select 'need_binding', public.ddr_bind_cycle_object(
  (select value from ddr_be002 where key = 'steward_actor'),
  (select value from ddr_be002 where key = 'cycle'),
  (select value from ddr_be002 where key = 'plan_record'),
  'NEED',
  (select value from ddr_be002 where key = 'need'),
  'MATERIALIZES',
  'd4000000-0000-4000-8000-000000000007',
  'ddr-be002-bind-need'
);

select is(
  (
    select concat_ws('|', object_type, relation_type)
    from public.cycle_bindings
    where id = (
      select (result ->> 'cycle_binding_id')::uuid
      from ddr_be002
      where key = 'need_binding'
    )
  ),
  'NEED|MATERIALIZES',
  'Planning record materializes a real T1 Need without semantic collapse'
);


-- Prove fractality before Celebration: a Planning record may already seed a child cycle.
insert into ddr_be002(key, result)
select 'planning_child', public.ddr_open_child_cycle(
  (select value from ddr_be002 where key = 'steward_actor'),
  (select value from ddr_be002 where key = 'cycle'),
  (select value from ddr_be002 where key = 'plan_record'),
  'd4000000-0000-4000-8000-000000000008',
  'ddr-be002-planning-child'
);

update ddr_be002
set value = (result ->> 'dragon_cycle_id')::uuid
where key = 'planning_child';

select is(
  (
    select parent_cycle_id
    from public.dragon_cycles
    where id = (
      select value from ddr_be002 where key = 'planning_child'
    )
  ),
  (select value from ddr_be002 where key = 'cycle'),
  'fractal child cycle may originate during PLANNING'
);


insert into ddr_be002(key, result)
select 'executor', public.t3_register_bounded_agent(
  (select value from ddr_be002 where key = 'steward_actor'),
  (select value from ddr_be002 where key = 'project'),
  'DDR BE002 Executor',
  'DDR BE002 local human-controlled operator',
  'd4000000-0000-4000-8000-000000000009',
  'ddr-be002-register-executor'
);

update ddr_be002
set value = (result ->> 'agent_actor_id')::uuid
where key = 'executor';


insert into ddr_be002(key, result)
select 'task', public.t3_authorize_agent_task(
  (select value from ddr_be002 where key = 'steward_actor'),
  (select value from ddr_be002 where key = 'project'),
  (select value from ddr_be002 where key = 'executor'),
  'Inspect the canonical STATE.md boundary and produce one bounded local execution result for DDR-BE-002.',
  array['STATE.md']::text[],
  now() + interval '2 hours',
  'd4000000-0000-4000-8000-000000000010',
  'ddr-be002-agent-delegation',
  'd4000000-0000-4000-8000-000000000011',
  'ddr-be002-agent-task'
);

update ddr_be002
set value = (result ->> 'agent_task_id')::uuid
where key = 'task';


insert into ddr_be002(key, result)
select 'task_binding', public.ddr_bind_cycle_object(
  (select value from ddr_be002 where key = 'steward_actor'),
  (select value from ddr_be002 where key = 'cycle'),
  (select value from ddr_be002 where key = 'plan_record'),
  'AGENT_TASK',
  (select value from ddr_be002 where key = 'task'),
  'PLANS',
  'd4000000-0000-4000-8000-000000000012',
  'ddr-be002-bind-task'
);

select is(
  (
    select concat_ws('|', object_type, relation_type)
    from public.cycle_bindings
    where id = (
      select (result ->> 'cycle_binding_id')::uuid
      from ddr_be002
      where key = 'task_binding'
    )
  ),
  'AGENT_TASK|PLANS',
  'Planning record points to canonical bounded T3 AgentTask'
);


select public.ddr_transition_cycle_phase(
  (select value from ddr_be002 where key = 'steward_actor'),
  (select value from ddr_be002 where key = 'cycle'),
  'DOING',
  'O plano já possui Need e AgentTask canônicos e agora a ação delimitada será executada.',
  'd4000000-0000-4000-8000-000000000013',
  'ddr-be002-to-doing'
);

select is(
  (
    select current_phase
    from public.dragon_cycles
    where id = (select value from ddr_be002 where key = 'cycle')
  ),
  'DOING',
  'cycle enters DOING without changing T1 or T3 object state semantics'
);


insert into ddr_be002(key, result)
select 'execution', public.t3_start_agent_execution(
  (select value from ddr_be002 where key = 'executor'),
  (select value from ddr_be002 where key = 'task'),
  'OLLAMA_LOCAL',
  'ddr-be002-contract-runtime',
  repeat('a', 64),
  'd4000000-0000-4000-8000-000000000014',
  'ddr-be002-execution-start'
);

update ddr_be002
set value = (result ->> 'execution_id')::uuid
where key = 'execution';


select throws_ok(
  $$
    select public.ddr_bind_cycle_object(
      (select value from ddr_be002 where key = 'steward_actor'),
      (select value from ddr_be002 where key = 'cycle'),
      null,
      'AGENT_EXECUTION',
      (select value from ddr_be002 where key = 'execution'),
      'RESULT_OF',
      'd4000000-0000-4000-8000-000000000015',
      'ddr-be002-bind-running-execution'
    )
  $$,
  'P0001',
  'CZ409:AGENT_EXECUTION_NOT_COMPLETED',
  'running AgentExecution cannot masquerade as a completed cycle result'
);


select public.t3_complete_agent_execution(
  (select value from ddr_be002 where key = 'executor'),
  (select value from ddr_be002 where key = 'execution'),
  'INCONCLUSIVE',
  'The bounded runtime produced a reconstructible technical output but does not establish external utility or truth.',
  'Synthetic deterministic database-contract execution; no external user and no automatic Verification.',
  repeat('b', 64),
  128,
  'd4000000-0000-4000-8000-000000000016',
  'ddr-be002-execution-complete'
);


insert into ddr_be002(key, result)
select 'execution_binding', public.ddr_bind_cycle_object(
  (select value from ddr_be002 where key = 'steward_actor'),
  (select value from ddr_be002 where key = 'cycle'),
  null,
  'AGENT_EXECUTION',
  (select value from ddr_be002 where key = 'execution'),
  'RESULT_OF',
  'd4000000-0000-4000-8000-000000000017',
  'ddr-be002-bind-execution-result'
);

select is(
  (
    select concat_ws('|', object_type, relation_type)
    from public.cycle_bindings
    where id = (
      select (result ->> 'cycle_binding_id')::uuid
      from ddr_be002
      where key = 'execution_binding'
    )
  ),
  'AGENT_EXECUTION|RESULT_OF',
  'completed unverified T3 execution is contextualized as a cycle result without becoming Evidence'
);


select is(
  (
    select state
    from public.agent_task_executions
    where id = (select value from ddr_be002 where key = 'execution')
  ),
  'COMPLETED',
  'canonical T3 execution is actually COMPLETED'
);

select is(
  (
    select count(*)::integer
    from public.claims
    where project_id = (select value from ddr_be002 where key = 'project')
  ),
  0,
  'AgentExecution and CycleBinding create no Claim automatically'
);


select public.ddr_transition_cycle_phase(
  (select value from ddr_be002 where key = 'steward_actor'),
  (select value from ddr_be002 where key = 'cycle'),
  'CELEBRATING',
  'A ação delimitada terminou e agora o ciclo integra resultado, limites, aprendizagem e novos sonhos.',
  'd4000000-0000-4000-8000-000000000018',
  'ddr-be002-to-celebrating'
);


insert into ddr_be002(key, result)
select 'learning', public.ddr_record_cycle_record(
  (select value from ddr_be002 where key = 'steward_actor'),
  (select value from ddr_be002 where key = 'cycle'),
  'ORIGINAL_RECORD',
  'Aprendemos que DragonCycle pode contextualizar T1 e T3 sem converter execução em evidência, decisão ou reputação.',
  '{}'::jsonb,
  'd4000000-0000-4000-8000-000000000019',
  'ddr-be002-learning'
);

update ddr_be002
set value = (result ->> 'cycle_record_id')::uuid
where key = 'learning';


insert into ddr_be002(key, result)
select 'new_dream', public.ddr_record_cycle_record(
  (select value from ddr_be002 where key = 'steward_actor'),
  (select value from ddr_be002 where key = 'cycle'),
  'ORIGINAL_RECORD',
  'Novo sonho: conectar uma contribuição ou artefato real ao ciclo e depois atravessar Claim, Evidence e Verification sem colapsar suas diferenças.',
  '{}'::jsonb,
  'd4000000-0000-4000-8000-000000000020',
  'ddr-be002-new-dream'
);

update ddr_be002
set value = (result ->> 'cycle_record_id')::uuid
where key = 'new_dream';


insert into ddr_be002(key, result)
select 'celebration_child', public.ddr_open_child_cycle(
  (select value from ddr_be002 where key = 'steward_actor'),
  (select value from ddr_be002 where key = 'cycle'),
  (select value from ddr_be002 where key = 'new_dream'),
  'd4000000-0000-4000-8000-000000000021',
  'ddr-be002-celebration-child'
);

update ddr_be002
set value = (result ->> 'dragon_cycle_id')::uuid
where key = 'celebration_child';


select is(
  (
    select concat_ws(
      '|',
      current_phase,
      state,
      parent_cycle_id::text,
      origin_record_id::text
    )
    from public.dragon_cycles
    where id = (
      select value from ddr_be002 where key = 'celebration_child'
    )
  ),
  (
    select concat_ws(
      '|',
      'DREAMING',
      'OPEN',
      (select value::text from ddr_be002 where key = 'cycle'),
      (select value::text from ddr_be002 where key = 'new_dream')
    )
  ),
  'Celebration produces an explicit new child Dream without mutating the parent cycle into a new Project'
);


select public.ddr_close_cycle(
  (select value from ddr_be002 where key = 'steward_actor'),
  (select value from ddr_be002 where key = 'cycle'),
  'The parent cycle completed its bounded Dream Plan Do Celebrate journey and its learning remains linked to child cycles.',
  'd4000000-0000-4000-8000-000000000022',
  'ddr-be002-close-parent'
);


select is(
  (
    select state
    from public.dragon_cycles
    where id = (select value from ddr_be002 where key = 'cycle')
  ),
  'CLOSED',
  'completed parent DragonCycle closes explicitly'
);

select is(
  (
    select state
    from public.dragon_cycles
    where id = (
      select value from ddr_be002 where key = 'celebration_child'
    )
  ),
  'OPEN',
  'closing parent does not close the new child Dream'
);


-- Cross-project objects cannot be smuggled into this DragonCycle.
insert into ddr_be002(key, result)
select 'other_project', to_jsonb(x)
from public.create_project_atomic(
  'Outro Projeto DDR BE002',
  'outro-projeto-ddr-be002',
  'Segundo projeto usado apenas para testar isolamento de CycleBinding.',
  'Preservar fronteiras entre projetos mesmo usando uma ponte polimórfica.',
  'Um objeto de outro projeto deve ser recusado deterministicamente.',
  'Cross-project CycleBinding deve falhar.',
  'Sem efeitos externos.',
  array['isolation'],
  'VOLUNTARY',
  'OPEN',
  true
) x;

update ddr_be002
set value = (result ->> 'project_id')::uuid
where key = 'other_project';


insert into ddr_be002(key, result)
select 'other_need', public.t1_create_need(
  (select value from ddr_be002 where key = 'steward_actor'),
  (select value from ddr_be002 where key = 'other_project'),
  'Need externo ao ciclo',
  'Este Need pertence deliberadamente a outro Project e não pode ser ligado ao ciclo original.',
  'Fixture de isolamento.',
  'd4000000-0000-4000-8000-000000000023',
  'ddr-be002-other-need'
);

update ddr_be002
set value = (result ->> 'need_id')::uuid
where key = 'other_need';


-- Parent is closed now, so use the still-open celebration child for the
-- cross-project rejection, with a child Planning record.
insert into ddr_be002(key, result)
select 'child_direction', public.ddr_record_cycle_record(
  (select value from ddr_be002 where key = 'steward_actor'),
  (select value from ddr_be002 where key = 'celebration_child'),
  'ORIGINAL_RECORD',
  'Quero preservar isolamento de projetos antes de qualquer nova coordenação.',
  '{}'::jsonb,
  'd4000000-0000-4000-8000-000000000024',
  'ddr-be002-child-direction'
);

update ddr_be002
set value = (result ->> 'cycle_record_id')::uuid
where key = 'child_direction';

select public.ddr_set_cycle_direction(
  (select value from ddr_be002 where key = 'steward_actor'),
  (select value from ddr_be002 where key = 'celebration_child'),
  (select value from ddr_be002 where key = 'child_direction'),
  'd4000000-0000-4000-8000-000000000025',
  'ddr-be002-child-set-direction'
);

select public.ddr_transition_cycle_phase(
  (select value from ddr_be002 where key = 'steward_actor'),
  (select value from ddr_be002 where key = 'celebration_child'),
  'PLANNING',
  'O child cycle agora entra em Planning apenas para testar o isolamento de objetos entre Projects.',
  'd4000000-0000-4000-8000-000000000026',
  'ddr-be002-child-to-planning'
);

insert into ddr_be002(key, result)
select 'child_plan', public.ddr_record_cycle_record(
  (select value from ddr_be002 where key = 'steward_actor'),
  (select value from ddr_be002 where key = 'celebration_child'),
  'ORIGINAL_RECORD',
  'Este registro tentará referenciar um Need externo e o backend deve impedir a ligação.',
  '{}'::jsonb,
  'd4000000-0000-4000-8000-000000000027',
  'ddr-be002-child-plan'
);

update ddr_be002
set value = (result ->> 'cycle_record_id')::uuid
where key = 'child_plan';


select throws_ok(
  $$
    select public.ddr_bind_cycle_object(
      (select value from ddr_be002 where key = 'steward_actor'),
      (select value from ddr_be002 where key = 'celebration_child'),
      (select value from ddr_be002 where key = 'child_plan'),
      'NEED',
      (select value from ddr_be002 where key = 'other_need'),
      'MATERIALIZES',
      'd4000000-0000-4000-8000-000000000028',
      'ddr-be002-cross-project-binding'
    )
  $$,
  '22023',
  'CZ422:CROSS_PROJECT_CYCLE_BINDING_DENIED',
  'CycleBinding cannot cross Project boundary'
);


select is(
  (
    select count(*)::integer
    from public.domain_events
    where aggregate_type = 'DRAGON_CYCLE'
      and aggregate_id = (select value from ddr_be002 where key = 'cycle')
      and event_type = 'CYCLE_OBJECT_BOUND'
  ),
  3,
  'root cycle reconstructibly binds Need, AgentTask and completed AgentExecution'
);

select is(
  (
    select count(*)::integer
    from public.dragon_cycles
    where parent_cycle_id = (
      select value from ddr_be002 where key = 'cycle'
    )
  ),
  2,
  'root cycle has both Planning-fractal and Celebration-regenerative child cycles'
);


select * from finish();

rollback;

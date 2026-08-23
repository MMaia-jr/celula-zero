begin;

create extension if not exists pgtap with schema extensions;
select no_plan();

select has_function(
  'public',
  'h2_register_project_agent',
  array['uuid','uuid','text','text','uuid','text'],
  'Operating Loop agent registration bridge exists'
);

create temporary table operating_loop_fixture (
  key text primary key,
  value uuid,
  result jsonb
);

insert into public.pilot_invites(email, label)
values ('operating-loop-steward@example.test', 'Operating Loop steward');

insert into auth.users(
  id, aud, role, email, raw_app_meta_data, raw_user_meta_data, created_at, updated_at
) values (
  '51000000-0000-4000-8000-000000000001',
  'authenticated',
  'authenticated',
  'operating-loop-steward@example.test',
  '{"provider":"email","providers":["email"]}',
  '{"name":"Operating Loop Steward"}',
  now(),
  now()
);

insert into operating_loop_fixture(key, value)
select 'steward_actor', actor_id
from public.actor_memberships
where profile_id = '51000000-0000-4000-8000-000000000001'
  and role = 'OWNER';

select set_config(
  'request.jwt.claim.sub',
  '51000000-0000-4000-8000-000000000001',
  true
);

insert into operating_loop_fixture(key, result)
select 'project', to_jsonb(x)
from public.create_project_atomic(
  'Operating Loop Test',
  'operating-loop-test',
  'Projeto isolado para testar um ciclo operacional humano-agente.',
  'Preservar autoria, autoridade e evidência em atores distintos.',
  'Permitir que um agente atribuível proponha e contribua sob decisão humana explícita.',
  'Um commitment real entre steward e agente controlado pelo operador.',
  'Sem autonomia financeira, sem reputação universal e sem self-acceptance.',
  array['proposta', 'contribuição', 'verificação'],
  'VOLUNTARY',
  'ACTIVE',
  true
) x;

update operating_loop_fixture
set value = (result ->> 'project_id')::uuid
where key = 'project';

insert into operating_loop_fixture(key, result)
select 'agent', public.h2_register_project_agent(
  (select value from operating_loop_fixture where key = 'steward_actor'),
  (select value from operating_loop_fixture where key = 'project'),
  'Executor IA do teste',
  'Operado pelo steward do piloto',
  '52000000-0000-4000-8000-000000000001',
  'operating-loop-agent-0001'
);

update operating_loop_fixture
set value = (result ->> 'agent_actor_id')::uuid
where key = 'agent';

select is(
  (
    select kind
    from public.actors
    where id = (select value from operating_loop_fixture where key = 'agent')
  ),
  'AI_AGENT',
  'registered participant is explicitly an AI_AGENT'
);

select is(
  (
    select operator_profile_id
    from public.actors
    where id = (select value from operating_loop_fixture where key = 'agent')
  ),
  '51000000-0000-4000-8000-000000000001'::uuid,
  'AI agent preserves its human operator profile'
);

select ok(
  exists(
    select 1
    from public.actor_memberships
    where actor_id = (select value from operating_loop_fixture where key = 'agent')
      and profile_id = '51000000-0000-4000-8000-000000000001'
      and role = 'OPERATOR'
  ),
  'operator controls the registered AI agent'
);

select ok(
  exists(
    select 1
    from public.project_members
    where project_id = (select value from operating_loop_fixture where key = 'project')
      and actor_id = (select value from operating_loop_fixture where key = 'agent')
      and role = 'CONTRIBUTOR'
  ),
  'AI agent is a project CONTRIBUTOR'
);

select ok(
  exists(
    select 1
    from public.role_assignments
    where actor_id = (select value from operating_loop_fixture where key = 'agent')
      and role_id = '00000000-0000-4000-8000-00000000c204'
      and scope_type = 'PROJECT'
      and scope_id = (select value from operating_loop_fixture where key = 'project')
      and revoked_at is null
  ),
  'AI agent receives only the existing project-scoped CONTRIBUTOR role'
);

select is(
  (
    select count(*)::integer
    from public.domain_events
    where event_type = 'AGENT_REGISTERED'
      and aggregate_id = (select value from operating_loop_fixture where key = 'agent')
  ),
  1,
  'agent registration is represented in the domain-event trail'
);

-- Same idempotency key replays instead of creating a second actor.
update operating_loop_fixture
set result = public.h2_register_project_agent(
  (select value from operating_loop_fixture where key = 'steward_actor'),
  (select value from operating_loop_fixture where key = 'project'),
  'Executor IA do teste',
  'Operado pelo steward do piloto',
  '52000000-0000-4000-8000-000000000001',
  'operating-loop-agent-0001'
)
where key = 'agent';

select is(
  (select result ->> 'agent_actor_id' from operating_loop_fixture where key = 'agent'),
  (select value::text from operating_loop_fixture where key = 'agent'),
  'agent registration is idempotent'
);

insert into operating_loop_fixture(key, result)
select 'opportunity', public.b1_create_opportunity(
  (select value from operating_loop_fixture where key = 'steward_actor'),
  (select value from operating_loop_fixture where key = 'project'),
  'Executar o Operating Loop',
  'Testar Proposal para um agente atribuível sem autoaceitação.',
  'O steward decide e o agente executa sob atribuição explícita.',
  'Um commitment persistido entre atores distintos.',
  1,
  '52000000-0000-4000-8000-000000000002',
  'operating-loop-create-0001'
);

update operating_loop_fixture
set value = (result ->> 'opportunity_id')::uuid
where key = 'opportunity';

update operating_loop_fixture
set result = public.b1_publish_opportunity(
  (select value from operating_loop_fixture where key = 'steward_actor'),
  value,
  1,
  '52000000-0000-4000-8000-000000000003',
  'operating-loop-publish-0001'
)
where key = 'opportunity';

insert into operating_loop_fixture(key, result)
select 'proposal', public.b1_submit_proposal(
  (select value from operating_loop_fixture where key = 'agent'),
  (select value from operating_loop_fixture where key = 'opportunity'),
  'O agente propõe executar o trabalho sob o escopo publicado.',
  'Sem expansão silenciosa de autoridade ou direito econômico.',
  'Entrega atribuída e verificável sob o commitment.',
  'Sem recompensa econômica neste teste.',
  '52000000-0000-4000-8000-000000000004',
  'operating-loop-proposal-0001'
);

update operating_loop_fixture
set value = (result ->> 'proposal_id')::uuid
where key = 'proposal';

update operating_loop_fixture
set result = public.b1_accept_proposal(
  (select value from operating_loop_fixture where key = 'steward_actor'),
  value,
  2,
  1,
  2,
  1,
  'Steward aceita explicitamente a proposta do agente.',
  '52000000-0000-4000-8000-000000000005',
  'operating-loop-accept-0001'
)
where key = 'proposal';

insert into operating_loop_fixture(key, value)
select
  'commitment',
  (select id from public.commitments where proposal_id = (
    select value from operating_loop_fixture where key = 'proposal'
  ));

select isnt(
  (
    select proposer_actor_id
    from public.commitments
    where id = (select value from operating_loop_fixture where key = 'commitment')
  ),
  (
    select accepted_by_actor_id
    from public.commitments
    where id = (select value from operating_loop_fixture where key = 'commitment')
  ),
  'proposal and acceptance remain attributable to distinct actors'
);

select is(
  (
    select proposer_actor_id
    from public.commitments
    where id = (select value from operating_loop_fixture where key = 'commitment')
  ),
  (select value from operating_loop_fixture where key = 'agent'),
  'AI agent is the committed contributor'
);

select is(
  (
    select accepted_by_actor_id
    from public.commitments
    where id = (select value from operating_loop_fixture where key = 'commitment')
  ),
  (select value from operating_loop_fixture where key = 'steward_actor'),
  'human steward is the explicit accepter'
);

select * from finish();
rollback;

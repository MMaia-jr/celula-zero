begin;

create extension if not exists pgtap with schema extensions;
select no_plan();

select has_column(
  'public',
  'opportunities',
  'need_id',
  'Opportunity can preserve an optional first-class Need relation'
);

select has_function(
  'public',
  't1_create_opportunity_for_need',
  array['uuid','uuid','uuid','text','text','text','text','integer','uuid','text'],
  'Need-aware Opportunity command exists'
);

select has_function(
  'public',
  't1_submit_public_proposal_revision',
  array['uuid','uuid','integer','text','text','text','text','uuid','text'],
  'bounded public Proposal revision command exists'
);

insert into auth.users(
  id, aud, role, email, raw_app_meta_data, raw_user_meta_data, created_at, updated_at
) values
(
  '93000000-0000-4000-8000-000000000001',
  'authenticated',
  'authenticated',
  't1-coordination-steward@example.test',
  '{"provider":"email","providers":["email"]}',
  '{"name":"T1 Coordination Steward"}',
  now(),
  now()
),
(
  '93000000-0000-4000-8000-000000000002',
  'authenticated',
  'authenticated',
  't1-coordination-proposer@example.test',
  '{"provider":"email","providers":["email"]}',
  '{"name":"T1 Coordination Proposer"}',
  now(),
  now()
);

create temporary table t1_coordination_fixture(
  key text primary key,
  value uuid,
  result jsonb
);

insert into t1_coordination_fixture(key, value)
select 'steward_actor', actor_id
from public.actor_memberships
where profile_id = '93000000-0000-4000-8000-000000000001'
  and role = 'OWNER';

insert into t1_coordination_fixture(key, value)
select 'proposer_actor', actor_id
from public.actor_memberships
where profile_id = '93000000-0000-4000-8000-000000000002'
  and role = 'OWNER';

select set_config(
  'request.jwt.claim.sub',
  '93000000-0000-4000-8000-000000000001',
  true
);

insert into t1_coordination_fixture(key, result)
select 'project', to_jsonb(x)
from public.create_project_atomic(
  'Projeto T1 Coordination',
  'projeto-t1-coordination',
  'Projeto público para testar Need, Opportunity, Proposal e Commitment sem Workbench.',
  'Transformar uma Need identificável em uma oportunidade com condições explícitas.',
  'Preservar objetos e autoridade distintos durante a formação de um Commitment.',
  'Um Commitment reconstruível entre duas identidades reais do teste.',
  'Sem converter aceitação em contribuição, evidência, reputação ou resultado.',
  array['legacy-summary-label'],
  'VOLUNTARY',
  'OPEN',
  true
) x;

update t1_coordination_fixture
set value = (result ->> 'project_id')::uuid
where key = 'project';

insert into t1_coordination_fixture(key, result)
select 'need', public.t1_create_need(
  (select value from t1_coordination_fixture where key = 'steward_actor'),
  (select value from t1_coordination_fixture where key = 'project'),
  'Revisão externa do fluxo',
  'Precisamos que uma segunda identidade consiga propor e formar um acordo delimitado.',
  'A Need existe antes da Opportunity e não é uma oferta por si só.',
  '94000000-0000-4000-8000-000000000001',
  't1-coordination-need-create'
);

update t1_coordination_fixture
set value = (result ->> 'need_id')::uuid
where key = 'need';

update t1_coordination_fixture
set result = public.t1_publish_need(
  (select value from t1_coordination_fixture where key = 'steward_actor'),
  value,
  1,
  '94000000-0000-4000-8000-000000000002',
  't1-coordination-need-publish'
)
where key = 'need';

insert into t1_coordination_fixture(key, result)
select 'opportunity', public.t1_create_opportunity_for_need(
  (select value from t1_coordination_fixture where key = 'steward_actor'),
  (select value from t1_coordination_fixture where key = 'project'),
  (select value from t1_coordination_fixture where key = 'need'),
  'Revisar a jornada pública',
  'Uma segunda identidade deve conseguir avaliar e propor uma entrega delimitada.',
  'A proposta deve preservar condições, versão e autoria.',
  'Uma Proposal revisável que possa ser aceita em versão exata.',
  1,
  '94000000-0000-4000-8000-000000000003',
  't1-coordination-opportunity-create'
);

update t1_coordination_fixture
set value = (result ->> 'opportunity_id')::uuid
where key = 'opportunity';

select is(
  (
    select need_id
    from public.opportunities
    where id = (select value from t1_coordination_fixture where key = 'opportunity')
  ),
  (select value from t1_coordination_fixture where key = 'need'),
  'Opportunity preserves the first-class Need relation'
);

select is(
  (
    select material_version
    from public.opportunities
    where id = (select value from t1_coordination_fixture where key = 'opportunity')
  ),
  2,
  'Need relation is a reconstructible material transition after creation'
);

select is(
  (
    select count(*)::integer
    from public.domain_events
    where aggregate_type = 'OPPORTUNITY'
      and aggregate_id = (select value from t1_coordination_fixture where key = 'opportunity')
      and event_type = 'OPPORTUNITY_LINKED_TO_NEED'
  ),
  1,
  'Need-to-Opportunity relation has one domain event'
);

update t1_coordination_fixture
set result = public.b1_publish_opportunity(
  (select value from t1_coordination_fixture where key = 'steward_actor'),
  value,
  2,
  '94000000-0000-4000-8000-000000000004',
  't1-coordination-opportunity-publish'
)
where key = 'opportunity';

select is(
  (
    select state
    from public.opportunities
    where id = (select value from t1_coordination_fixture where key = 'opportunity')
  ),
  'OPEN',
  'linked Opportunity can be published with the exact post-link material version'
);

select set_config(
  'request.jwt.claim.sub',
  '93000000-0000-4000-8000-000000000002',
  true
);

insert into t1_coordination_fixture(key, result)
select 'proposal', public.b1_submit_public_proposal(
  (select value from t1_coordination_fixture where key = 'proposer_actor'),
  (select value from t1_coordination_fixture where key = 'opportunity'),
  'Posso revisar a jornada pública como uma segunda identidade delimitada.',
  'A revisão considera apenas o escopo publicado e não concede autoridade adicional.',
  'Entrego observações reproduzíveis da jornada proposta.',
  'Voluntário neste teste.',
  '94000000-0000-4000-8000-000000000005',
  't1-coordination-proposal-submit'
);

update t1_coordination_fixture
set value = (result ->> 'proposal_id')::uuid
where key = 'proposal';

select is(
  (
    select count(*)::integer
    from public.role_assignments
    where actor_id = (select value from t1_coordination_fixture where key = 'proposer_actor')
  ),
  0,
  'public Proposal submission grants no coordination role'
);

select set_config(
  'request.jwt.claim.sub',
  '93000000-0000-4000-8000-000000000001',
  true
);

select is(
  (
    select count(*)::integer
    from public.t1_get_visible_coordination_actor_labels(
      (select value from t1_coordination_fixture where key = 'opportunity')
    )
    where actor_id = (select value from t1_coordination_fixture where key = 'proposer_actor')
  ),
  1,
  'steward can resolve the attributable proposer Actor label without exposing Profile credentials'
);

update t1_coordination_fixture
set result = public.b1_request_proposal_revision(
  (select value from t1_coordination_fixture where key = 'steward_actor'),
  value,
  1,
  'Clarifique a entrega esperada antes de qualquer aceitação.',
  '94000000-0000-4000-8000-000000000006',
  't1-coordination-proposal-request-revision'
)
where key = 'proposal';

select is(
  (
    select state
    from public.proposals
    where id = (select value from t1_coordination_fixture where key = 'proposal')
  ),
  'REVISION_REQUESTED',
  'steward can request revision through existing B1 authority'
);

select set_config(
  'request.jwt.claim.sub',
  '93000000-0000-4000-8000-000000000002',
  true
);

update t1_coordination_fixture
set result = public.t1_submit_public_proposal_revision(
  (select value from t1_coordination_fixture where key = 'proposer_actor'),
  value,
  2,
  'Posso revisar a jornada e registrar exatamente quais passos foram compreensíveis.',
  'A revisão permanece no escopo publicado e registra limites observados.',
  'Entrego uma lista reproduzível de passos, bloqueios e ambiguidades encontrados.',
  'Voluntário; nenhuma expectativa econômica retroativa.',
  '94000000-0000-4000-8000-000000000007',
  't1-coordination-proposal-revise'
)
where key = 'proposal';

select is(
  (
    select current_version
    from public.proposals
    where id = (select value from t1_coordination_fixture where key = 'proposal')
  ),
  2,
  'public proposer creates a new immutable Proposal version after request'
);

select is(
  (
    select material_version
    from public.proposals
    where id = (select value from t1_coordination_fixture where key = 'proposal')
  ),
  3,
  'revision advances Proposal material state'
);

select is(
  (
    select count(*)::integer
    from public.role_assignments
    where actor_id = (select value from t1_coordination_fixture where key = 'proposer_actor')
  ),
  0,
  'public Proposal revision still grants no coordination role'
);

select is(
  (
    select count(*)::integer
    from public.delegations
    where delegate_actor_id = (select value from t1_coordination_fixture where key = 'proposer_actor')
  ),
  0,
  'public Proposal revision grants no delegation'
);

select set_config(
  'request.jwt.claim.sub',
  '93000000-0000-4000-8000-000000000001',
  true
);

insert into t1_coordination_fixture(key, result)
select 'commitment', public.b1_accept_proposal(
  (select value from t1_coordination_fixture where key = 'steward_actor'),
  (select value from t1_coordination_fixture where key = 'proposal'),
  (
    select current_version
    from public.opportunities
    where id = (select value from t1_coordination_fixture where key = 'opportunity')
  ),
  (
    select current_version
    from public.proposals
    where id = (select value from t1_coordination_fixture where key = 'proposal')
  ),
  (
    select material_version
    from public.opportunities
    where id = (select value from t1_coordination_fixture where key = 'opportunity')
  ),
  (
    select material_version
    from public.proposals
    where id = (select value from t1_coordination_fixture where key = 'proposal')
  ),
  'Aceito estas versões exatas para formar um Commitment delimitado.',
  '94000000-0000-4000-8000-000000000008',
  't1-coordination-proposal-accept'
);

update t1_coordination_fixture
set value = (result ->> 'commitment_id')::uuid
where key = 'commitment';

select is(
  (
    select state
    from public.proposals
    where id = (select value from t1_coordination_fixture where key = 'proposal')
  ),
  'ACCEPTED',
  'exact reviewed Proposal becomes ACCEPTED'
);

select is(
  (
    select count(*)::integer
    from public.commitments
    where id = (select value from t1_coordination_fixture where key = 'commitment')
  ),
  1,
  'acceptance creates exactly one Commitment'
);

select is(
  (
    select proposal_version
    from public.commitments
    where id = (select value from t1_coordination_fixture where key = 'commitment')
  ),
  2,
  'Commitment pins the revised Proposal version'
);

select is(
  (
    select count(*)::integer
    from public.contributions
    where commitment_id = (select value from t1_coordination_fixture where key = 'commitment')
  ),
  0,
  'Commitment creates no Contribution'
);

select is(
  public.b1_reconcile_opportunity(
    (select value from t1_coordination_fixture where key = 'opportunity')
  ),
  '{}'::text[],
  'linked Opportunity remains reconcilable after acceptance'
);

select is(
  public.b1_reconcile_proposal(
    (select value from t1_coordination_fixture where key = 'proposal')
  ),
  '{}'::text[],
  'revised and accepted Proposal remains reconcilable'
);

select * from finish();
rollback;

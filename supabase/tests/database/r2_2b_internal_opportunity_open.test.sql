begin;

create extension if not exists pgtap with schema extensions;
select no_plan();

select has_function(
  'public',
  't1_open_opportunity',
  array['uuid','uuid','integer','uuid','text'],
  'R2-2B internal Opportunity open command exists'
);

select ok(
  exists(select 1 from public.capability_definitions where code='opportunity.open'),
  'opportunity.open capability exists'
);

select ok(
  exists(
    select 1 from public.role_capabilities
    where role_id='00000000-0000-4000-8000-00000000c202'
      and capability_code='opportunity.open'
  ),
  'PROJECT_STEWARD receives opportunity.open'
);

insert into auth.users(
  id,aud,role,email,raw_app_meta_data,raw_user_meta_data,created_at,updated_at
) values
(
  '94100000-0000-4000-8000-000000000001',
  'authenticated','authenticated','r22b-steward@example.test',
  '{"provider":"email","providers":["email"]}',
  '{"name":"R2-2B Steward"}',
  now(),now()
),
(
  '94100000-0000-4000-8000-000000000002',
  'authenticated','authenticated','r22b-contributor@example.test',
  '{"provider":"email","providers":["email"]}',
  '{"name":"R2-2B Contributor"}',
  now(),now()
);

select set_config('request.jwt.claim.sub','94100000-0000-4000-8000-000000000001',true);

create temporary table r22b_fixture(
  key text primary key,
  value uuid,
  result jsonb
);

insert into r22b_fixture(key,value)
select 'steward_actor',actor_id
from public.actor_memberships
where profile_id='94100000-0000-4000-8000-000000000001'
  and role='OWNER';

insert into r22b_fixture(key,value)
select 'contributor_actor',actor_id
from public.actor_memberships
where profile_id='94100000-0000-4000-8000-000000000002'
  and role='OWNER';

insert into r22b_fixture(key,result)
select 'project',to_jsonb(x)
from public.create_project_atomic(
  'Projeto R2 2B Internal Opportunity',
  'projeto-r2-2b-internal-opportunity',
  'Projeto isolado para testar Opportunity OPEN PROJECT.',
  'Separar abertura operacional de publicação pública.',
  'Permitir Proposal e Commitment sem exposição pública da Opportunity.',
  'Opportunity interna aberta, Proposal válida e Commitment reconstruível.',
  'Sem publicação pública da Opportunity interna.',
  array['r2-2b'],
  'VOLUNTARY',
  'OPEN',
  true
) x;

update r22b_fixture
set value=(result->>'project_id')::uuid
where key='project';

insert into r22b_fixture(key,result)
select 'need',public.t1_create_need(
  (select value from r22b_fixture where key='steward_actor'),
  (select value from r22b_fixture where key='project'),
  'Need interna R2 2B',
  'Precisamos coordenar uma Opportunity sem publica-la.',
  'Teste isolado R2-2B.',
  '94200000-0000-4000-8000-000000000001',
  'r22b-create-need-001'
);

update r22b_fixture
set value=(result->>'need_id')::uuid
where key='need';

update r22b_fixture
set result=public.t1_open_need(
  (select value from r22b_fixture where key='steward_actor'),
  value,
  1,
  '94200000-0000-4000-8000-000000000002',
  'r22b-open-need-001'
)
where key='need';

insert into r22b_fixture(key,result)
select 'opportunity_internal',public.t1_create_opportunity_for_need(
  (select value from r22b_fixture where key='steward_actor'),
  (select value from r22b_fixture where key='project'),
  (select value from r22b_fixture where key='need'),
  'Opportunity interna R2 2B',
  'Opportunity operacional que deve permanecer somente no projeto.',
  'Sem publicação pública.',
  'Permitir uma Proposal interna válida e um Commitment.',
  1,
  '94200000-0000-4000-8000-000000000003',
  'r22b-create-opportunity-001'
);

update r22b_fixture
set value=(result->>'opportunity_id')::uuid
where key='opportunity_internal';

select set_config(
  'cz.r22b.opp_internal',
  (select value::text from r22b_fixture where key='opportunity_internal'),
  true
);

select is(
  (
    select state||'/'||visibility
    from public.opportunities
    where id=(select value from r22b_fixture where key='opportunity_internal')
  ),
  'DRAFT/PROJECT',
  'fresh linked Opportunity begins DRAFT/PROJECT'
);

update r22b_fixture
set result=public.t1_open_opportunity(
  (select value from r22b_fixture where key='steward_actor'),
  value,
  2,
  '94200000-0000-4000-8000-000000000004',
  'r22b-open-opportunity-001'
)
where key='opportunity_internal';

select is(
  (select result->>'state' from r22b_fixture where key='opportunity_internal'),
  'OPEN',
  'internal opening moves Opportunity to OPEN'
);

select is(
  (select result->>'visibility' from r22b_fixture where key='opportunity_internal'),
  'PROJECT',
  'internal opening preserves PROJECT visibility'
);

select is(
  (
    select count(*)::integer
    from public.opportunity_versions
    where opportunity_id=(select value from r22b_fixture where key='opportunity_internal')
  ),
  2,
  'internal opening creates one new immutable Opportunity version'
);

select is(
  (
    select state||'/'||visibility
    from public.opportunity_versions
    where opportunity_id=(select value from r22b_fixture where key='opportunity_internal')
      and version=1
  ),
  'DRAFT/PROJECT',
  'Opportunity version 1 remains DRAFT/PROJECT'
);

select is(
  (
    select state||'/'||visibility
    from public.opportunity_versions
    where opportunity_id=(select value from r22b_fixture where key='opportunity_internal')
      and version=2
  ),
  'OPEN/PROJECT',
  'Opportunity version 2 is OPEN/PROJECT'
);

select is(
  (
    select count(*)::integer
    from public.domain_events
    where aggregate_type='OPPORTUNITY'
      and aggregate_id=(select value from r22b_fixture where key='opportunity_internal')
      and event_type='OPPORTUNITY_OPENED'
      and visibility='PROJECT'
      and payload->>'publication'='false'
  ),
  1,
  'internal opening emits one PROJECT OPPORTUNITY_OPENED event'
);

select is(
  (
    select count(*)::integer
    from public.domain_events
    where aggregate_type='OPPORTUNITY'
      and aggregate_id=(select value from r22b_fixture where key='opportunity_internal')
      and event_type='OPPORTUNITY_PUBLISHED'
  ),
  0,
  'internal opening emits no OPPORTUNITY_PUBLISHED'
);

select set_config('request.jwt.claim.sub','',true);
set local role anon;

select is(
  (
    select count(*)::integer
    from public.opportunities
    where id=current_setting('cz.r22b.opp_internal')::uuid
  ),
  0,
  'anonymous reader cannot see OPEN/PROJECT Opportunity'
);

reset role;
select set_config('request.jwt.claim.sub','94100000-0000-4000-8000-000000000001',true);

select is(
  (
    public.t1_open_opportunity(
      (select value from r22b_fixture where key='steward_actor'),
      (select value from r22b_fixture where key='opportunity_internal'),
      2,
      '94200000-0000-4000-8000-000000000004',
      'r22b-open-opportunity-001'
    )->>'state'
  ),
  'OPEN',
  'exact idempotent replay returns saved result'
);

select is(
  (
    select count(*)::integer
    from public.opportunity_versions
    where opportunity_id=(select value from r22b_fixture where key='opportunity_internal')
  ),
  2,
  'idempotent replay creates no third Opportunity version'
);

select throws_ok(
  format(
    'select public.t1_open_opportunity(%L::uuid,%L::uuid,2,%L::uuid,%L)',
    (select value from r22b_fixture where key='steward_actor'),
    (select value from r22b_fixture where key='opportunity_internal'),
    '94200000-0000-4000-8000-000000000005',
    'r22b-stale-001'
  ),
  'P0001',
  'CZ409:STALE_VERSION',
  'stale Opportunity material version is rejected'
);

select throws_ok(
  format(
    'select public.t1_open_opportunity(%L::uuid,%L::uuid,3,%L::uuid,%L)',
    (select value from r22b_fixture where key='steward_actor'),
    (select value from r22b_fixture where key='opportunity_internal'),
    '94200000-0000-4000-8000-000000000006',
    'r22b-invalid-state-001'
  ),
  'P0001',
  'CZ409:INVALID_STATE',
  'already OPEN Opportunity cannot be internally opened again'
);

-- Existing publication path remains intact on a separate DRAFT Opportunity.
insert into r22b_fixture(key,result)
select 'opportunity_public',public.t1_create_opportunity_for_need(
  (select value from r22b_fixture where key='steward_actor'),
  (select value from r22b_fixture where key='project'),
  (select value from r22b_fixture where key='need'),
  'Opportunity publica separada R2 2B',
  'Controle de regressao do comando existente de publicacao.',
  'Publicacao permitida somente neste fixture separado.',
  'OPEN PUBLIC no fixture de controle.',
  1,
  '94200000-0000-4000-8000-000000000007',
  'r22b-create-opportunity-public-001'
);

update r22b_fixture
set value=(result->>'opportunity_id')::uuid
where key='opportunity_public';

update r22b_fixture
set result=public.b1_publish_opportunity(
  (select value from r22b_fixture where key='steward_actor'),
  value,
  2,
  '94200000-0000-4000-8000-000000000008',
  'r22b-publish-control-001'
)
where key='opportunity_public';

select is(
  (select result->>'state' from r22b_fixture where key='opportunity_public'),
  'OPEN',
  'existing publish path still opens separate DRAFT Opportunity'
);

select is(
  (select result->>'visibility' from r22b_fixture where key='opportunity_public'),
  'PUBLIC',
  'existing publish path still makes separate control Opportunity PUBLIC'
);

-- Give the distinct contributor the existing CONTRIBUTOR role on only this Opportunity.
insert into public.role_assignments(
  cell_id,actor_id,role_id,scope_type,scope_id,policy_version_id,granted_by_actor_id
)
select
  o.cell_id,
  (select value from r22b_fixture where key='contributor_actor'),
  '00000000-0000-4000-8000-00000000c204',
  'OPPORTUNITY',
  o.id,
  c.current_policy_version_id,
  (select value from r22b_fixture where key='steward_actor')
from public.opportunities o
join public.cells c on c.id=o.cell_id
where o.id=(select value from r22b_fixture where key='opportunity_internal');

select set_config('request.jwt.claim.sub','94100000-0000-4000-8000-000000000002',true);

insert into r22b_fixture(key,result)
select 'proposal',public.b1_submit_proposal(
  (select value from r22b_fixture where key='contributor_actor'),
  (select value from r22b_fixture where key='opportunity_internal'),
  'Posso realizar a contribuicao interna prevista neste teste.',
  'Somente dentro do escopo R2-2B.',
  'Uma entrega interna verificavel.',
  'Sem direito economico; fixture deterministico.',
  '94200000-0000-4000-8000-000000000009',
  'r22b-proposal-001'
);

update r22b_fixture
set value=(result->>'proposal_id')::uuid
where key='proposal';

select is(
  (select result->>'state' from r22b_fixture where key='proposal'),
  'SUBMITTED',
  'existing proposal.submit accepts OPEN/PROJECT Opportunity for authorized contributor'
);

select set_config('request.jwt.claim.sub','94100000-0000-4000-8000-000000000001',true);

insert into r22b_fixture(key,result)
select 'commitment',public.b1_accept_proposal(
  (select value from r22b_fixture where key='steward_actor'),
  (select value from r22b_fixture where key='proposal'),
  2,
  1,
  3,
  1,
  'Aceite deterministico para provar composicao interna Opportunity -> Proposal -> Commitment.',
  '94200000-0000-4000-8000-000000000010',
  'r22b-accept-proposal-001'
);

update r22b_fixture
set value=(result->>'commitment_id')::uuid
where key='commitment';

select ok(
  (select value from r22b_fixture where key='commitment') is not null,
  'existing acceptance path creates Commitment from internal OPEN/PROJECT Opportunity'
);

select is(
  (
    select count(*)::integer
    from public.commitments
    where id=(select value from r22b_fixture where key='commitment')
      and proposer_actor_id=(select value from r22b_fixture where key='contributor_actor')
      and accepted_by_actor_id=(select value from r22b_fixture where key='steward_actor')
  ),
  1,
  'Commitment preserves distinct proposer and acceptor actors'
);

select * from finish();
rollback;

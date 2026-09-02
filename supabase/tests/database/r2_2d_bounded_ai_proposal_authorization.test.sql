begin;

create extension if not exists pgtap with schema extensions;
select no_plan();

select has_function(
  'public',
  't1_authorize_ai_proposal',
  array['uuid','uuid','uuid','uuid','timestamp with time zone','uuid','text'],
  'R2-2D bounded AI proposal authorization command exists'
);

select ok(
  exists(select 1 from public.capability_definitions where code='proposal.authorize_ai'),
  'proposal.authorize_ai capability exists'
);

select ok(
  exists(
    select 1 from public.role_capabilities
    where role_id='00000000-0000-4000-8000-00000000c202'
      and capability_code='proposal.authorize_ai'
  ),
  'PROJECT_STEWARD receives proposal.authorize_ai'
);

insert into auth.users(
  id,aud,role,email,raw_app_meta_data,raw_user_meta_data,created_at,updated_at
) values (
  '95100000-0000-4000-8000-000000000001',
  'authenticated','authenticated','r22d-steward@example.test',
  '{"provider":"email","providers":["email"]}',
  '{"name":"R2-2D Steward"}',
  now(),now()
);

select set_config('request.jwt.claim.sub','95100000-0000-4000-8000-000000000001',true);

create temporary table r22d_fixture(
  key text primary key,
  value uuid,
  result jsonb
);

insert into r22d_fixture(key,value)
select 'steward_actor',actor_id
from public.actor_memberships
where profile_id='95100000-0000-4000-8000-000000000001'
  and role='OWNER';

insert into r22d_fixture(key,result)
select 'project',to_jsonb(x)
from public.create_project_atomic(
  'Projeto R2 2D GPT Proposer',
  'projeto-r2-2d-gpt-proposer',
  'Fixture para autorização limitada de AI proposer.',
  'Autorizar AI somente em uma Opportunity.',
  'Provar Proposal e Commitment sem role ampla.',
  'AI Proposal atribuível e Commitment aceito por humano distinto.',
  'Sem publicação pública nem role permanente.',
  array['r2-2d'],
  'VOLUNTARY',
  'OPEN',
  true
) x;

update r22d_fixture
set value=(result->>'project_id')::uuid
where key='project';

insert into r22d_fixture(key,result)
select 'agent',public.t3_register_bounded_agent(
  (select value from r22d_fixture where key='steward_actor'),
  (select value from r22d_fixture where key='project'),
  'GPT R2-2D Test',
  'OpenAI GPT / bounded proposer fixture',
  '95200000-0000-4000-8000-000000000001',
  'r22d-register-agent-001'
);

update r22d_fixture
set value=(result->>'agent_actor_id')::uuid
where key='agent';

select is(
  (
    select count(*)::integer
    from public.role_assignments
    where actor_id=(select value from r22d_fixture where key='agent')
      and revoked_at is null
  ),
  0,
  'bounded AI begins with no role assignment'
);

insert into r22d_fixture(key,result)
select 'need',public.t1_create_need(
  (select value from r22d_fixture where key='steward_actor'),
  (select value from r22d_fixture where key='project'),
  'Need R2 2D bounded proposer',
  'Precisamos de uma AI Proposal atribuível sem role ampla.',
  'Teste isolado da fronteira de autoridade.',
  '95200000-0000-4000-8000-000000000002',
  'r22d-create-need-001'
);

update r22d_fixture
set value=(result->>'need_id')::uuid
where key='need';

update r22d_fixture
set result=public.t1_open_need(
  (select value from r22d_fixture where key='steward_actor'),
  value,
  1,
  '95200000-0000-4000-8000-000000000003',
  'r22d-open-need-001'
)
where key='need';

insert into r22d_fixture(key,result)
select 'opportunity',public.t1_create_opportunity_for_need(
  (select value from r22d_fixture where key='steward_actor'),
  (select value from r22d_fixture where key='project'),
  (select value from r22d_fixture where key='need'),
  'Opportunity R2 2D bounded proposer',
  'Receber uma Proposal atribuível da AI sob autorização limitada.',
  'Somente projeto; nenhum role amplo.',
  'Proposal submetida pela AI e aceita por humano distinto.',
  1,
  '95200000-0000-4000-8000-000000000004',
  'r22d-create-opportunity-001'
);

update r22d_fixture
set value=(result->>'opportunity_id')::uuid
where key='opportunity';

update r22d_fixture
set result=public.t1_open_opportunity(
  (select value from r22d_fixture where key='steward_actor'),
  value,
  2,
  '95200000-0000-4000-8000-000000000005',
  'r22d-open-opportunity-001'
)
where key='opportunity';

select ok(
  not private.b1_has_capability(
    (select value from r22d_fixture where key='agent'),
    'proposal.submit',
    'OPPORTUNITY',
    (select value from r22d_fixture where key='opportunity')
  ),
  'AI lacks proposal.submit before bounded authorization'
);

insert into r22d_fixture(key,result)
select 'authorization',public.t1_authorize_ai_proposal(
  (select value from r22d_fixture where key='steward_actor'),
  (select value from r22d_fixture where key='project'),
  (select value from r22d_fixture where key='opportunity'),
  (select value from r22d_fixture where key='agent'),
  now()+interval '10 minutes',
  '95200000-0000-4000-8000-000000000006',
  'r22d-authorize-ai-proposal-001'
);

update r22d_fixture
set value=(result->>'delegation_id')::uuid
where key='authorization';

select ok(
  private.b1_has_capability(
    (select value from r22d_fixture where key='agent'),
    'proposal.submit',
    'OPPORTUNITY',
    (select value from r22d_fixture where key='opportunity')
  ),
  'bounded delegation gives AI proposal.submit only at target Opportunity'
);

select is(
  (
    select count(*)::integer
    from public.role_assignments
    where actor_id=(select value from r22d_fixture where key='agent')
      and revoked_at is null
  ),
  0,
  'authorization grants no role assignment'
);

select ok(
  not private.b1_has_capability(
    (select value from r22d_fixture where key='agent'),
    'proposal.submit',
    'PROJECT',
    (select value from r22d_fixture where key='project')
  ),
  'bounded authorization does not grant project-wide proposal.submit'
);

insert into r22d_fixture(key,result)
select 'proposal',public.b1_submit_proposal(
  (select value from r22d_fixture where key='agent'),
  (select value from r22d_fixture where key='opportunity'),
  'Como GPT de teste, proponho executar a contribuição interna delimitada associada a esta Opportunity.',
  'Autoridade apenas nesta Opportunity; sem decisão, publicação ou direito econômico.',
  'Um resultado atribuível ligado ao Commitment.',
  'Nenhum direito econômico; fixture interno N=1.',
  '95200000-0000-4000-8000-000000000007',
  'r22d-submit-proposal-001'
);

update r22d_fixture
set value=(result->>'proposal_id')::uuid
where key='proposal';

select is(
  (select result->>'state' from r22d_fixture where key='proposal'),
  'SUBMITTED',
  'AI submits Proposal using bounded Opportunity-scoped authority'
);

update r22d_fixture
set result=public.b1_revoke_delegation(
  (select value from r22d_fixture where key='steward_actor'),
  value,
  1,
  '95200000-0000-4000-8000-000000000008',
  'r22d-revoke-ai-proposal-001'
)
where key='authorization';

select is(
  (select result->>'state' from r22d_fixture where key='authorization'),
  'REVOKED',
  'human steward revokes bounded delegation immediately after Proposal'
);

select ok(
  not private.b1_has_capability(
    (select value from r22d_fixture where key='agent'),
    'proposal.submit',
    'OPPORTUNITY',
    (select value from r22d_fixture where key='opportunity')
  ),
  'AI loses proposal.submit after revocation'
);

select throws_ok(
  format(
    'select public.b1_submit_proposal(%L::uuid,%L::uuid,%L,%L,%L,%L,%L::uuid,%L)',
    (select value from r22d_fixture where key='agent'),
    (select value from r22d_fixture where key='opportunity'),
    'Second proposal must not be created.',
    'Authority was already revoked.',
    'No delivery.',
    'No reward.',
    '95200000-0000-4000-8000-000000000009',
    'r22d-second-proposal-denied-001'
  ),
  '42501',
  'CZ403:CAPABILITY_DENIED',
  'AI cannot submit another Proposal after bounded authorization is revoked'
);

insert into r22d_fixture(key,result)
select 'commitment',public.b1_accept_proposal(
  (select value from r22d_fixture where key='steward_actor'),
  (select value from r22d_fixture where key='proposal'),
  (select current_version from public.opportunities
   where id=(select value from r22d_fixture where key='opportunity')),
  (select current_version from public.proposals
   where id=(select value from r22d_fixture where key='proposal')),
  (select material_version from public.opportunities
   where id=(select value from r22d_fixture where key='opportunity')),
  (select material_version from public.proposals
   where id=(select value from r22d_fixture where key='proposal')),
  'Human steward accepts the exact AI-authored Proposal under bounded authority.',
  '95200000-0000-4000-8000-000000000010',
  'r22d-accept-ai-proposal-001'
);

update r22d_fixture
set value=(result->>'commitment_id')::uuid
where key='commitment';

select ok(
  (select value from r22d_fixture where key='commitment') is not null,
  'acceptance creates Commitment'
);

select is(
  (
    select count(*)::integer
    from public.commitments
    where id=(select value from r22d_fixture where key='commitment')
      and proposer_actor_id=(select value from r22d_fixture where key='agent')
      and accepted_by_actor_id=(select value from r22d_fixture where key='steward_actor')
      and proposer_actor_id<>accepted_by_actor_id
  ),
  1,
  'Commitment preserves AI proposer != human acceptor'
);

select is(
  (
    select state||'/'||visibility
    from public.opportunities
    where id=(select value from r22d_fixture where key='opportunity')
  ),
  'CLOSED/PROJECT',
  'capacity-one internal Opportunity closes without becoming PUBLIC'
);

select is(
  (
    select count(*)::integer
    from public.domain_events
    where visibility='PUBLIC'
      and (
        aggregate_id=(select value from r22d_fixture where key='opportunity')
        or object_id=(select value from r22d_fixture where key='opportunity')
      )
  ),
  0,
  'bounded AI proposal path emits no public Opportunity event'
);

select * from finish();
rollback;

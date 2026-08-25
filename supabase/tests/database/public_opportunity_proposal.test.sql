begin;

create extension if not exists pgtap with schema extensions;
select no_plan();

select has_function(
  'public',
  'b1_submit_public_proposal',
  array['uuid','uuid','text','text','text','text','uuid','text'],
  'public proposal entry command exists'
);

create temporary table public_proposal_fixture (
  key text primary key,
  value uuid,
  result jsonb
);

-- Only the steward is a pilot member. The external proposer deliberately has
-- no pilot_membership and no role_assignment.
insert into public.pilot_invites(email, label)
values ('public-proposal-steward@example.test', 'public proposal steward');

insert into auth.users(
  id, aud, role, email, raw_app_meta_data, raw_user_meta_data, created_at, updated_at
) values
(
  '71000000-0000-4000-8000-000000000001',
  'authenticated',
  'authenticated',
  'public-proposal-steward@example.test',
  '{"provider":"email","providers":["email"]}',
  '{"name":"Public Proposal Steward"}',
  now(),
  now()
),
(
  '71000000-0000-4000-8000-000000000002',
  'authenticated',
  'authenticated',
  'public-proposal-outsider@example.test',
  '{"provider":"email","providers":["email"]}',
  '{"name":"Public Proposal Outsider"}',
  now(),
  now()
);

insert into public_proposal_fixture(key, value)
select 'steward_actor', actor_id
from public.actor_memberships
where profile_id = '71000000-0000-4000-8000-000000000001'
  and role = 'OWNER';

insert into public_proposal_fixture(key, value)
select 'outsider_actor', actor_id
from public.actor_memberships
where profile_id = '71000000-0000-4000-8000-000000000002'
  and role = 'OWNER';

select set_config(
  'request.jwt.claim.sub',
  '71000000-0000-4000-8000-000000000001',
  true
);

insert into public_proposal_fixture(key, result)
select 'project', to_jsonb(x)
from public.create_project_atomic(
  'Projeto Public Proposal',
  'projeto-public-proposal',
  'Projeto público usado para testar uma proposta externa sem privilégio amplo.',
  'Permitir uma entrada externa limitada a uma proposta contra uma oportunidade real.',
  'Manter Proposal distinta de Commitment e preservar autoridade contextual.',
  'Uma proposta externa privada entre proponente e steward.',
  'Sem wallet, fundos ou papel global de contributor.',
  array['proposta externa'],
  'VOLUNTARY',
  'OPEN',
  true
) x;

update public_proposal_fixture
set value = (result ->> 'project_id')::uuid
where key = 'project';

-- The B1 role bridge is contextual and explicit for this fixture.
insert into public.role_assignments(
  cell_id,
  actor_id,
  role_id,
  scope_type,
  scope_id,
  policy_version_id,
  granted_by_actor_id
) values (
  '00000000-0000-4000-8000-00000000c001',
  (select value from public_proposal_fixture where key = 'steward_actor'),
  '00000000-0000-4000-8000-00000000c202',
  'PROJECT',
  (select value from public_proposal_fixture where key = 'project'),
  '00000000-0000-4000-8000-00000000c101',
  (select value from public_proposal_fixture where key = 'steward_actor')
);

insert into public_proposal_fixture(key, result)
select 'opportunity', public.b1_create_opportunity(
  (select value from public_proposal_fixture where key = 'steward_actor'),
  (select value from public_proposal_fixture where key = 'project'),
  'Frontend público',
  'Precisamos de uma entrega de frontend claramente delimitada.',
  'Escopo e limites devem permanecer explícitos.',
  'Uma entrega revisável e verificável.',
  2,
  '72000000-0000-4000-8000-000000000001',
  'public-proposal-create-001'
);

update public_proposal_fixture
set value = (result ->> 'opportunity_id')::uuid
where key = 'opportunity';

update public_proposal_fixture
set result = public.b1_publish_opportunity(
  (select value from public_proposal_fixture where key = 'steward_actor'),
  value,
  1,
  '72000000-0000-4000-8000-000000000002',
  'public-proposal-publish-001'
)
where key = 'opportunity';

select set_config(
  'request.jwt.claim.sub',
  '71000000-0000-4000-8000-000000000002',
  true
);

select is(
  (
    select count(*)::integer
    from public.pilot_memberships
    where profile_id = '71000000-0000-4000-8000-000000000002'
  ),
  0,
  'external proposer is not silently promoted into pilot membership'
);

select is(
  (
    select count(*)::integer
    from public.role_assignments
    where actor_id = (select value from public_proposal_fixture where key = 'outsider_actor')
  ),
  0,
  'external proposer starts with no role assignment'
);

insert into public_proposal_fixture(key, result)
select 'proposal', public.b1_submit_public_proposal(
  (select value from public_proposal_fixture where key = 'outsider_actor'),
  (select value from public_proposal_fixture where key = 'opportunity'),
  'Posso executar esta oportunidade como uma entrega delimitada.',
  'Trabalho somente dentro do escopo publicado.',
  'Entrego o frontend acordado com evidência reproduzível.',
  'Voluntário neste teste.',
  '72000000-0000-4000-8000-000000000003',
  'public-proposal-submit-001'
);

update public_proposal_fixture
set value = (result ->> 'proposal_id')::uuid
where key = 'proposal';

select is(
  (select result ->> 'state' from public_proposal_fixture where key = 'proposal'),
  'SUBMITTED',
  'controlled external PERSON can submit to PUBLIC/OPEN opportunity'
);

select is(
  (
    select visibility
    from public.proposals
    where id = (select value from public_proposal_fixture where key = 'proposal')
  ),
  'PROJECT',
  'public entry does not make Proposal public'
);

select is(
  (
    select count(*)::integer
    from public.commitments
    where proposal_id = (select value from public_proposal_fixture where key = 'proposal')
  ),
  0,
  'Proposal submission creates no Commitment'
);

select is(
  (
    select count(*)::integer
    from public.role_assignments
    where actor_id = (select value from public_proposal_fixture where key = 'outsider_actor')
  ),
  0,
  'successful public proposal grants no role assignment'
);

select is(
  (
    select count(*)::integer
    from public.delegations
    where delegate_actor_id = (select value from public_proposal_fixture where key = 'outsider_actor')
  ),
  0,
  'successful public proposal grants no delegation'
);

select is(
  (
    select count(*)::integer
    from public.decision_records
    where target_id = (select value from public_proposal_fixture where key = 'proposal')
      and decision_type = 'PUBLIC_PROPOSAL_SUBMIT'
      and payload ->> 'authorization_basis' = 'PUBLIC_OPEN_OPPORTUNITY'
  ),
  1,
  'public-entry authorization basis is preserved as a decision record'
);

-- The steward cannot use the public-entry path against its own opportunity.
select set_config(
  'request.jwt.claim.sub',
  '71000000-0000-4000-8000-000000000001',
  true
);

select throws_ok(
  format(
    'select public.b1_submit_public_proposal(%L::uuid,%L::uuid,%L,%L,%L,%L,%L::uuid,%L)',
    (select value from public_proposal_fixture where key = 'steward_actor'),
    (select value from public_proposal_fixture where key = 'opportunity'),
    'Tentativa do owner pela porta pública.',
    'Não deve ser aceita.',
    'Nenhuma entrega.',
    'Sem economia.',
    '72000000-0000-4000-8000-000000000004',
    'public-proposal-owner-denied'
  ),
  '42501',
  'CZ403:OPPORTUNITY_OWNER_PUBLIC_PROPOSAL_DENIED',
  'opportunity owner cannot manufacture a public external proposal'
);

select * from finish();

rollback;

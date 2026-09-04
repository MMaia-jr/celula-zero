begin;

create extension if not exists pgtap with schema extensions;
select plan(31);

insert into auth.users(id, email, encrypted_password, email_confirmed_at, raw_user_meta_data)
values
  ('91000000-0000-4000-8000-000000000001', 'participant-a@example.test', '', now(), '{"name":"Pessoa A"}'),
  ('91000000-0000-4000-8000-000000000002', 'participant-b@example.test', '', now(), '{"name":"Pessoa B"}');

create temporary table participant_fixture(key text primary key, value uuid);
grant select on participant_fixture to authenticated;
insert into participant_fixture
select 'actor_a', actor_id from public.actor_memberships where profile_id = '91000000-0000-4000-8000-000000000001'
union all
select 'actor_b', actor_id from public.actor_memberships where profile_id = '91000000-0000-4000-8000-000000000002';

select set_config('request.jwt.claim.sub', '91000000-0000-4000-8000-000000000001', true);
insert into participant_fixture(key, value)
select 'project_a', project_id from public.create_project_atomic(
  'Projeto privado A', 'participant-private-a', 'Resumo privado da Pessoa A para isolamento.',
  'Intenção original privada da Pessoa A.', 'Intenção corrente privada da Pessoa A.',
  'Entregar resultado privado verificável A.', 'Somente membros ativos da Cell A.',
  array['isolamento A'], 'VOLUNTARY', 'ACTIVE', false
);
insert into participant_fixture
select 'cell_a', cell_id from public.projects where id = (select value from participant_fixture where key = 'project_a');
insert into participant_fixture(key, value)
select 'project_a_2', project_id from public.create_project_atomic(
  'Segundo projeto A', 'participant-private-a-two', 'Segundo resumo privado da Pessoa A para reuso.',
  'Segunda intenção original privada da Pessoa A.', 'Segunda intenção corrente privada da Pessoa A.',
  'Entregar outro resultado privado verificável A.', 'Reutilizar a Cell privada já ativa.',
  array['reuso A'], 'VOLUNTARY', 'ACTIVE', false
);

select set_config('request.jwt.claim.sub', '91000000-0000-4000-8000-000000000002', true);
insert into participant_fixture(key, value)
select 'project_b', project_id from public.create_project_atomic(
  'Projeto privado B', 'participant-private-b', 'Resumo privado da Pessoa B para isolamento.',
  'Intenção original privada da Pessoa B.', 'Intenção corrente privada da Pessoa B.',
  'Entregar resultado privado verificável B.', 'Somente membros ativos da Cell B.',
  array['isolamento B'], 'VOLUNTARY', 'ACTIVE', false
);
insert into participant_fixture
select 'cell_b', cell_id from public.projects where id = (select value from participant_fixture where key = 'project_b');

select isnt((select value from participant_fixture where key='cell_a'), (select value from participant_fixture where key='cell_b'), 'A and B receive distinct private Cells');
select is((select cell_id from public.projects where id=(select value from participant_fixture where key='project_a')), (select value from participant_fixture where key='cell_a'), 'Project A belongs to Cell A');
select is((select cell_id from public.projects where id=(select value from participant_fixture where key='project_a_2')), (select value from participant_fixture where key='cell_a'), 'A second project reuses the active Cell A');
select is((select cell_id from public.projects where id=(select value from participant_fixture where key='project_b')), (select value from participant_fixture where key='cell_b'), 'Project B belongs to Cell B');
select is((select count(*)::integer from public.role_assignments where actor_id=(select value from participant_fixture where key='actor_a') and scope_type='CELL' and scope_id=(select value from participant_fixture where key='cell_a') and revoked_at is null), 1, 'Pessoa A has one explicit active CELL membership');
select is((select count(*)::integer from public.role_assignments where actor_id=(select value from participant_fixture where key='actor_b') and scope_type='CELL' and scope_id=(select value from participant_fixture where key='cell_b') and revoked_at is null), 1, 'Pessoa B has one explicit active CELL membership');
select is((select rd.code from public.role_assignments ra join public.role_definitions rd on rd.id=ra.role_id where ra.actor_id=(select value from participant_fixture where key='actor_a') and ra.scope_type='CELL' and ra.scope_id=(select value from participant_fixture where key='cell_a') and ra.revoked_at is null), 'CELL_MEMBER', 'automatic Cell membership uses CELL_MEMBER');
select is((select count(*)::integer from public.role_capabilities rc join public.role_definitions rd on rd.id=rc.role_id where rd.cell_id=(select value from participant_fixture where key='cell_a') and rd.code='CELL_MEMBER'), 0, 'CELL_MEMBER has zero capabilities');
select is((select count(*)::integer from public.role_assignments ra join public.role_definitions rd on rd.id=ra.role_id where ra.actor_id=(select value from participant_fixture where key='actor_a') and ra.scope_type='PROJECT' and ra.scope_id=(select value from participant_fixture where key='project_a') and rd.code='PROJECT_STEWARD' and ra.revoked_at is null), 1, 'PROJECT_STEWARD assignment is limited to Project A');
select is((select array_agg(rc.capability_code order by rc.capability_code) from public.role_capabilities rc join public.role_definitions rd on rd.id=rc.role_id where rd.cell_id=(select value from participant_fixture where key='cell_a') and rd.code='PROJECT_STEWARD'), (select array_agg(capability_code order by capability_code) from public.role_capabilities where role_id='00000000-0000-4000-8000-00000000c202'), 'contextual PROJECT_STEWARD has exactly the canonical capabilities');

-- Least-privilege boundary: authenticated callers must not be able to use the
-- arbitrary-profile helper as a cross-profile membership oracle. Authenticated
-- policies use b1_current_profile_has_cell_access(), which binds identity to
-- auth.uid(), while the arbitrary-profile helper remains internal.
select set_config('request.jwt.claim.sub', '91000000-0000-4000-8000-000000000001', true);
set local role authenticated;
select throws_ok(
  $$select private.participant_has_active_cell_membership(
      (select value from participant_fixture where key='cell_a'),
      '91000000-0000-4000-8000-000000000002'
    )$$,
  '42501',
  null,
  'authenticated cannot query another profile through arbitrary-profile membership helper'
);
reset role;

select set_config('request.jwt.claim.sub', '91000000-0000-4000-8000-000000000001', true);
set local role authenticated;
select is((select count(*)::integer from public.cells where id=(select value from participant_fixture where key='cell_a')), 1, 'A reads Cell A');
select is((select count(*)::integer from public.cells where id=(select value from participant_fixture where key='cell_b')), 0, 'A cannot read Cell B');
select is((select count(*)::integer from public.projects where id=(select value from participant_fixture where key='project_a')), 1, 'A reads Project A');
select is((select count(*)::integer from public.projects where id=(select value from participant_fixture where key='project_b')), 0, 'A cannot read private Project B');
select is((select count(*)::integer from public.project_intents where project_id=(select value from participant_fixture where key='project_b')), 0, 'A cannot read Project B intents');
select throws_ok($$update public.projects set title='Ataque cruzado de A' where id=(select value from participant_fixture where key='project_b')$$, '42501', null, 'A cannot directly write Project B');
reset role;
select throws_ok(
  format('select public.b1_create_opportunity(%L::uuid,%L::uuid,%L,%L,%L,%L,1,%L::uuid,%L)',
    (select value from participant_fixture where key='actor_a'), (select value from participant_fixture where key='project_b'),
    'Ataque A em B', 'Tentativa cruzada de criar oportunidade.', 'Sem autorização na Cell B.',
    'A escrita deve ser negada.', '92000000-0000-4000-8000-000000000001', 'participant-cross-a-b'),
  '42501', 'CZ403:CAPABILITY_DENIED', 'A cannot write into Project B through an RPC');

-- Adversarial boundary: a PROJECT-only assignment inside Cell A must not make B
-- a Cell A member or expose the Cell. Explicit CELL membership is required.
insert into public.role_definitions(id, cell_id, code, name)
values (
  '93000000-0000-4000-8000-000000000001',
  (select value from participant_fixture where key='cell_a'),
  'PARTICIPANT_BOUNDARY_TEST',
  'Participant boundary without project authority'
);
insert into public.role_assignments(
  cell_id, actor_id, role_id, scope_type, scope_id,
  policy_version_id, granted_by_actor_id
)
select
  f.value,
  (select value from participant_fixture where key='actor_b'),
  '93000000-0000-4000-8000-000000000001',
  'PROJECT',
  (select value from participant_fixture where key='project_a'),
  c.current_policy_version_id,
  (select value from participant_fixture where key='actor_a')
from participant_fixture f
join public.cells c on c.id = f.value
where f.key = 'cell_a';

select is(
  private.participant_has_active_cell_membership(
    (select value from participant_fixture where key='cell_a'),
    '91000000-0000-4000-8000-000000000002'
  ),
  false,
  'PROJECT-only assignment in Cell A does not grant B Cell A membership'
);
select set_config('request.jwt.claim.sub', '91000000-0000-4000-8000-000000000002', true);
set local role authenticated;
select is(
  (select count(*)::integer from public.cells
    where id=(select value from participant_fixture where key='cell_a')),
  0,
  'PROJECT-only assignment in Cell A does not grant B Cell A read access'
);
reset role;

insert into public.role_assignments(
  cell_id, actor_id, role_id, scope_type, scope_id,
  policy_version_id, granted_by_actor_id
)
select
  f.value,
  (select value from participant_fixture where key='actor_b'),
  '93000000-0000-4000-8000-000000000001',
  'CELL',
  f.value,
  c.current_policy_version_id,
  (select value from participant_fixture where key='actor_a')
from participant_fixture f
join public.cells c on c.id = f.value
where f.key = 'cell_a';

select ok(
  private.participant_has_active_cell_membership(
    (select value from participant_fixture where key='cell_a'),
    '91000000-0000-4000-8000-000000000002'
  ),
  'explicit CELL assignment makes B an active member of Cell A'
);
select is(
  private.can_manage_project(
    (select value from participant_fixture where key='project_a'),
    '91000000-0000-4000-8000-000000000002'
  ),
  false,
  'same-Cell membership without Project A stewardship cannot manage Project A'
);
select set_config('request.jwt.claim.sub', '91000000-0000-4000-8000-000000000002', true);
set local role authenticated;
select throws_ok(
  $$update public.projects set title='Ataque interno de B' where id=(select value from participant_fixture where key='project_a')$$,
  '42501', null, 'same-Cell member B cannot directly write Project A'
);
reset role;
select throws_ok(
  format('select public.b1_create_opportunity(%L::uuid,%L::uuid,%L,%L,%L,%L,1,%L::uuid,%L)',
    (select value from participant_fixture where key='actor_b'), (select value from participant_fixture where key='project_a'),
    'Ataque interno B em A', 'Tentativa sem stewardship de criar oportunidade.',
    'Membership na mesma Cell não concede autoridade no Project A.',
    'A escrita deve ser negada.', '92000000-0000-4000-8000-000000000003', 'participant-same-cell-b-a'),
  '42501', 'CZ403:CAPABILITY_DENIED',
  'same-Cell member B cannot write into Project A through b1_create_opportunity'
);

select set_config('request.jwt.claim.sub', '91000000-0000-4000-8000-000000000002', true);
set local role authenticated;
select is((select count(*)::integer from public.cells where id=(select value from participant_fixture where key='cell_b')), 1, 'B reads Cell B');
select is((select count(*)::integer from public.cells where id=(select value from participant_fixture where key='cell_a')), 1, 'B reads Cell A through active same-Cell membership');
select is((select count(*)::integer from public.projects where id=(select value from participant_fixture where key='project_b')), 1, 'B reads Project B');
select is((select count(*)::integer from public.projects where id=(select value from participant_fixture where key='project_a')), 0, 'B cannot read private Project A');
select is((select count(*)::integer from public.events where project_id=(select value from participant_fixture where key='project_a')), 0, 'B cannot read Project A events');
select throws_ok($$update public.projects set title='Ataque cruzado de B' where id=(select value from participant_fixture where key='project_a')$$, '42501', null, 'B cannot directly write Project A');
reset role;
select throws_ok(
  format('select public.b1_create_opportunity(%L::uuid,%L::uuid,%L,%L,%L,%L,1,%L::uuid,%L)',
    (select value from participant_fixture where key='actor_b'), (select value from participant_fixture where key='project_a'),
    'Ataque B em A', 'Tentativa cruzada de criar oportunidade.', 'Sem autorização na Cell A.',
    'A escrita deve ser negada.', '92000000-0000-4000-8000-000000000002', 'participant-cross-b-a'),
  '42501', 'CZ403:CAPABILITY_DENIED', 'B cannot write into Project A through an RPC');

select * from finish();
rollback;

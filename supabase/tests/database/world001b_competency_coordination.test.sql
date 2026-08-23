begin;

create extension if not exists pgtap with schema extensions;
select no_plan();

select has_table(
  'public', 'competency_concepts',
  'WORLD-001B has competency concepts distinct from operational capabilities'
);
select has_table(
  'public', 'opportunity_version_competencies',
  'WORLD-001B has version-scoped opportunity competency relations'
);
select has_function(
  'public', 'world001b_define_competency',
  array[
    'uuid','uuid','text','text','text','text','text','text','text','text',
    'uuid','uuid','text'
  ],
  'WORLD-001B exposes attributed competency definition command'
);
select has_function(
  'public', 'world001b_declare_opportunity_competency',
  array['uuid','uuid','integer','uuid','text','text','uuid','text'],
  'WORLD-001B exposes version-scoped declaration command'
);
select has_function(
  'public', 'world001b_reconcile_opportunity_competencies',
  array['uuid'],
  'WORLD-001B exposes competency snapshot reconciler'
);

select ok(
  to_regclass('public.actor_competencies') is null
  and to_regclass('public.actor_proficiencies') is null
  and to_regclass('public.competency_reputation') is null,
  'WORLD-001B creates no Actor competency, proficiency or reputation profile'
);

select is(
  (
    select count(*)::integer
    from public.capability_definitions
    where code in ('competency.define', 'opportunity.competency_declare')
  ),
  2,
  'operational authorization capabilities exist separately from competency concepts'
);

select ok(
  exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'competency_concepts'
      and policyname = 'competency_concepts_read'
      and position('created_in_project_id' in coalesce(qual, '')) > 0
  ),
  'private competency concept read is scoped to its origin project, not any project in the cell'
);

select is(
  has_function_privilege(
    'authenticated',
    'public.world001b_reconcile_opportunity_competencies(uuid)',
    'EXECUTE'
  ),
  false,
  'SECURITY DEFINER reconciler is internal and not executable by ordinary authenticated clients'
);

create temporary table world001b_fixture (
  key text primary key,
  value uuid,
  result jsonb
);
grant select on world001b_fixture to anon, authenticated;

insert into public.pilot_invites(email, label)
values ('world001b-steward@example.test', 'WORLD-001B steward');

insert into auth.users(
  id, aud, role, email, raw_app_meta_data, raw_user_meta_data, created_at, updated_at
) values (
  '71000000-0000-4000-8000-000000000001',
  'authenticated',
  'authenticated',
  'world001b-steward@example.test',
  '{"provider":"email","providers":["email"]}',
  '{"name":"WORLD-001B Steward"}',
  now(),
  now()
);

insert into world001b_fixture(key, value)
select 'steward_actor', actor_id
from public.actor_memberships
where profile_id = '71000000-0000-4000-8000-000000000001'
  and role = 'OWNER';

select set_config(
  'request.jwt.claim.sub',
  '71000000-0000-4000-8000-000000000001',
  true
);

insert into world001b_fixture(key, result)
select 'project', to_jsonb(x)
from public.create_project_atomic(
  'Projeto WORLD 001B',
  'projeto-world-001b',
  'Projeto de teste para competências contextuais em oportunidades versionadas.',
  'Preservar requisito, preferência e alvo de aprendizagem sem perfilar pessoas.',
  'Usar conceitos de competência como metadados não pessoais da oportunidade.',
  'Uma oportunidade publicada preserva exatamente seus metadados de competência.',
  'Sem ActorSkill, ranking, reputação, matching ou runtime externo.',
  array['competências contextuais', 'coordenação'],
  'VOLUNTARY',
  'OPEN',
  true
) x;

update world001b_fixture
set value = (result ->> 'project_id')::uuid
where key = 'project';

select ok(
  exists (
    select 1
    from public.role_assignments ra
    join public.role_capabilities rc on rc.role_id = ra.role_id
    where ra.actor_id = (select value from world001b_fixture where key='steward_actor')
      and ra.scope_type = 'PROJECT'
      and ra.scope_id = (select value from world001b_fixture where key='project')
      and rc.capability_code = 'competency.define'
  ),
  'project steward receives competency.define as bounded operational authority'
);

insert into world001b_fixture(key, result)
select 'local_competency', public.world001b_define_competency(
  (select value from world001b_fixture where key='steward_actor'),
  (select value from world001b_fixture where key='project'),
  'Modelagem relacional em PostgreSQL',
  'Capacidade de representar entidades e relações contextuais em PostgreSQL.',
  'pt-BR',
  'LOCAL',
  null,
  null,
  null,
  null,
  null,
  '71000000-0000-4000-8000-000000000101',
  'world001b-define-local-0001'
);

update world001b_fixture
set value = (result ->> 'competency_id')::uuid
where key = 'local_competency';

select is(
  (
    select origin_type
    from public.competency_concepts
    where id = (select value from world001b_fixture where key='local_competency')
  ),
  'LOCAL',
  'local competency preserves local provenance'
);

select ok(
  (
    select source_system is null
      and source_uri is null
      and source_identifier is null
      and source_version is null
    from public.competency_concepts
    where id = (select value from world001b_fixture where key='local_competency')
  ),
  'local competency cannot pretend to have external provenance'
);

select throws_ok(
  format(
    'select public.world001b_define_competency(%L::uuid,%L::uuid,%L,%L,%L,%L,null,null,null,null,null,%L::uuid,%L)',
    (select value from world001b_fixture where key='steward_actor'),
    (select value from world001b_fixture where key='project'),
    'Conceito externo incompleto',
    'Conceito externo sem fonte suficiente deve falhar explicitamente.',
    'pt-BR',
    'EXTERNAL_REFERENCE',
    '71000000-0000-4000-8000-000000000102',
    'world001b-invalid-external-0001'
  ),
  'P0001',
  'CZ422:EXTERNAL_COMPETENCY_PROVENANCE_REQUIRED',
  'external competency requires explicit source provenance'
);

insert into world001b_fixture(key, result)
select 'external_competency', public.world001b_define_competency(
  (select value from world001b_fixture where key='steward_actor'),
  (select value from world001b_fixture where key='project'),
  'Database design and administration',
  'External competency reference used only as an attributed vocabulary source.',
  'en',
  'EXTERNAL_REFERENCE',
  'TEST_VOCABULARY',
  'https://example.test/competencies/example-database-design',
  'example-database-design',
  'test-v1',
  null,
  '71000000-0000-4000-8000-000000000103',
  'world001b-define-external-0001'
);

update world001b_fixture
set value = (result ->> 'competency_id')::uuid
where key = 'external_competency';

select is(
  (
    select source_system
    from public.competency_concepts
    where id = (select value from world001b_fixture where key='external_competency')
  ),
  'TEST_VOCABULARY',
  'external source is preserved as provenance, not truth'
);

select is(
  (
    select (result ->> 'provenance_is_truth')::boolean
    from world001b_fixture
    where key='external_competency'
  ),
  false,
  'command result explicitly preserves provenance != truth'
);

insert into world001b_fixture(key, result)
select 'preferred_competency', public.world001b_define_competency(
  (select value from world001b_fixture where key='steward_actor'),
  (select value from world001b_fixture where key='project'),
  'Documentação técnica contextual',
  'Capacidade de registrar decisões e limites técnicos de forma contextual e verificável.',
  'pt-BR',
  'LOCAL',
  null,
  null,
  null,
  null,
  null,
  '71000000-0000-4000-8000-000000000104',
  'world001b-define-preferred-0001'
);

update world001b_fixture
set value = (result ->> 'competency_id')::uuid
where key = 'preferred_competency';

insert into world001b_fixture(key, result)
select 'opportunity', public.b1_create_opportunity(
  (select value from world001b_fixture where key='steward_actor'),
  (select value from world001b_fixture where key='project'),
  'Implementar um mapa relacional mínimo',
  'Construir uma representação relacional pequena e verificável.',
  'Preservar semântica, proveniência e versão da oportunidade.',
  'Migration e testes locais sem frontend ou profiling.',
  2,
  '71000000-0000-4000-8000-000000000201',
  'world001b-create-opportunity-0001'
);

update world001b_fixture
set value = (result ->> 'opportunity_id')::uuid
where key = 'opportunity';

insert into world001b_fixture(key, result)
select 'required_link', public.world001b_declare_opportunity_competency(
  (select value from world001b_fixture where key='steward_actor'),
  (select value from world001b_fixture where key='opportunity'),
  1,
  (select value from world001b_fixture where key='local_competency'),
  'REQUIRED',
  'A entrega exige modelagem relacional suficiente para alterar o schema com segurança.',
  '71000000-0000-4000-8000-000000000202',
  'world001b-declare-required-0001'
);

update world001b_fixture
set value = (result ->> 'opportunity_competency_id')::uuid
where key = 'required_link';

select is(
  (
    select (result ->> 'material_version')::integer
    from world001b_fixture
    where key='required_link'
  ),
  2,
  'declaring competency advances opportunity material version'
);

select is(
  (
    select (result ->> 'requirement_is_actor_attainment')::boolean
    from world001b_fixture
    where key='required_link'
  ),
  false,
  'REQUIRED remains declaration, not proof of Actor attainment'
);

insert into world001b_fixture(key, result)
select 'learning_link', public.world001b_declare_opportunity_competency(
  (select value from world001b_fixture where key='steward_actor'),
  (select value from world001b_fixture where key='opportunity'),
  2,
  (select value from world001b_fixture where key='external_competency'),
  'LEARNING_TARGET',
  'A oportunidade também pode desenvolver esta competência durante a participação.',
  '71000000-0000-4000-8000-000000000203',
  'world001b-declare-learning-0001'
);

update world001b_fixture
set value = (result ->> 'opportunity_competency_id')::uuid
where key = 'learning_link';

insert into world001b_fixture(key, result)
select 'preferred_link_v1', public.world001b_declare_opportunity_competency(
  (select value from world001b_fixture where key='steward_actor'),
  (select value from world001b_fixture where key='opportunity'),
  3,
  (select value from world001b_fixture where key='preferred_competency'),
  'PREFERRED',
  'Documentação técnica é desejável, mas não é requisito duro de entrada.',
  '71000000-0000-4000-8000-000000000204',
  'world001b-declare-preferred-v1-0001'
);

update world001b_fixture
set value = (result ->> 'opportunity_competency_id')::uuid
where key = 'preferred_link_v1';

select is(
  (
    select count(*)::integer
    from public.opportunity_version_competencies
    where opportunity_id = (select value from world001b_fixture where key='opportunity')
      and opportunity_version = 1
  ),
  3,
  'draft OpportunityVersion v1 has REQUIRED, PREFERRED and LEARNING_TARGET relations'
);

select is(
  (
    select relation
    from public.opportunity_version_competencies
    where id = (select value from world001b_fixture where key='learning_link')
  ),
  'LEARNING_TARGET',
  'learning target is distinct from prerequisite requirement'
);

update world001b_fixture
set result = public.b1_revise_opportunity(
  (select value from world001b_fixture where key='steward_actor'),
  value,
  4,
  'Implementar um mapa relacional mínimo — revisão explícita',
  'Nova versão preserva a história anterior e permite corrigir metadados sem reescrever v1.',
  'Declarar novamente as competências que pertencem a esta nova versão.',
  'Migration e testes locais sem frontend ou profiling.',
  2,
  '71000000-0000-4000-8000-000000000205',
  'world001b-revise-after-competency-0001'
)
where key = 'opportunity';

select is(
  (
    select current_version
    from public.opportunities
    where id = (select value from world001b_fixture where key='opportunity')
  ),
  2,
  'explicit revision after competency declarations creates a new DRAFT OpportunityVersion'
);

select is(
  (
    select count(*)::integer
    from public.opportunity_version_competencies
    where opportunity_id = (select value from world001b_fixture where key='opportunity')
      and opportunity_version = 1
  ),
  3,
  'prior DRAFT v1 preserves its three competency declarations'
);

select is(
  (
    select count(*)::integer
    from public.opportunity_version_competencies
    where opportunity_id = (select value from world001b_fixture where key='opportunity')
      and opportunity_version = 2
  ),
  0,
  'new DRAFT v2 receives no implicit competency carryover'
);

insert into world001b_fixture(key, result)
select 'required_link_v2', public.world001b_declare_opportunity_competency(
  (select value from world001b_fixture where key='steward_actor'),
  (select value from world001b_fixture where key='opportunity'),
  5,
  (select value from world001b_fixture where key='preferred_competency'),
  'REQUIRED',
  'Na revisão explícita, documentação contextual passa a ser requisito da entrega.',
  '71000000-0000-4000-8000-000000000206',
  'world001b-declare-required-v2-0001'
);

insert into world001b_fixture(key, result)
select 'preferred_link_v2', public.world001b_declare_opportunity_competency(
  (select value from world001b_fixture where key='steward_actor'),
  (select value from world001b_fixture where key='opportunity'),
  6,
  (select value from world001b_fixture where key='local_competency'),
  'PREFERRED',
  'Modelagem relacional prévia é desejável, mas pode ser aprofundada durante a execução.',
  '71000000-0000-4000-8000-000000000207',
  'world001b-declare-preferred-v2-0001'
);

insert into world001b_fixture(key, result)
select 'learning_link_v2', public.world001b_declare_opportunity_competency(
  (select value from world001b_fixture where key='steward_actor'),
  (select value from world001b_fixture where key='opportunity'),
  7,
  (select value from world001b_fixture where key='external_competency'),
  'LEARNING_TARGET',
  'A referência externa continua sendo um alvo explícito de aprendizagem.',
  '71000000-0000-4000-8000-000000000208',
  'world001b-declare-learning-v2-0001'
);

select is(
  (
    select count(*)::integer
    from public.opportunity_version_competencies
    where opportunity_id = (select value from world001b_fixture where key='opportunity')
      and opportunity_version = 2
      and relation = 'PREFERRED'
  ),
  1,
  'PREFERRED is exercised directly as a contextual non-required relation'
);

update world001b_fixture
set result = public.b1_publish_opportunity(
  (select value from world001b_fixture where key='steward_actor'),
  value,
  8,
  '71000000-0000-4000-8000-000000000209',
  'world001b-publish-0001'
)
where key = 'opportunity';

select is(
  (
    select current_version
    from public.opportunities
    where id = (select value from world001b_fixture where key='opportunity')
  ),
  3,
  'publication creates immutable public OpportunityVersion v3 from revised DRAFT v2'
);

select is(
  (
    select count(*)::integer
    from public.opportunity_version_competencies
    where opportunity_id = (select value from world001b_fixture where key='opportunity')
      and opportunity_version = 3
  ),
  3,
  'publication carries competency snapshot into public OpportunityVersion'
);

select is(
  (
    select count(*)::integer
    from public.opportunity_version_competencies
    where opportunity_id = (select value from world001b_fixture where key='opportunity')
      and opportunity_version = 3
      and inherited_from_link_id is not null
  ),
  3,
  'published relations retain inherited_from provenance'
);

select is(
  (
    select count(*)::integer
    from public.opportunity_version_competencies published
    join public.opportunity_versions ov
      on ov.opportunity_id = published.opportunity_id
     and ov.version = published.opportunity_version
    where published.opportunity_id = (select value from world001b_fixture where key='opportunity')
      and published.opportunity_version = 3
      and published.materialized_by_actor_id = ov.created_by_actor_id
  ),
  3,
  'publication records who materialized inherited competency relations'
);

select is(
  public.world001b_reconcile_opportunity_competencies(
    (select value from world001b_fixture where key='opportunity')
  ),
  '{}'::text[],
  'published competency snapshot reconciles'
);

select throws_ok(
  format(
    'update public.competency_concepts set preferred_label=%L where id=%L::uuid',
    'mutação proibida',
    (select value from world001b_fixture where key='local_competency')
  ),
  '23000',
  'competency_concepts is append-only',
  'competency concept history is append-only'
);

select throws_ok(
  format(
    'delete from public.opportunity_version_competencies where id=%L::uuid',
    (select value from world001b_fixture where key='required_link')
  ),
  '23000',
  'opportunity_version_competencies is append-only',
  'opportunity competency declarations are append-only'
);

select set_config('request.jwt.claim.sub', '', true);
set local role anon;

select is(
  (
    select count(*)::integer
    from public.opportunity_version_competencies
  ),
  3,
  'anonymous reader with no authenticated JWT subject sees only published v3 competency relations'
);

select is(
  (
    select count(*)::integer
    from public.competency_concepts
  ),
  3,
  'all concepts referenced by the public opportunity are publicly readable'
);

reset role;
select set_config(
  'request.jwt.claim.sub',
  '71000000-0000-4000-8000-000000000001',
  true
);

select is(
  (
    select count(*)::integer
    from public.opportunity_version_competencies
    where opportunity_id = (select value from world001b_fixture where key='opportunity')
  ),
  9,
  'authorized steward can read v1, revised v2 and published v3 competency history'
);

insert into public.opportunity_versions(
  opportunity_id, version, title, statement, conditions, expected_result,
  capacity, state, visibility, created_by_actor_id
)
select
  ov.opportunity_id, 4, ov.title, ov.statement, ov.conditions, ov.expected_result,
  ov.capacity, 'CLOSED', 'PUBLIC', ov.created_by_actor_id
from public.opportunity_versions ov
where ov.opportunity_id = (select value from world001b_fixture where key='opportunity')
  and ov.version = 3;

select is(
  (
    select count(*)::integer
    from public.opportunity_version_competencies
    where opportunity_id = (select value from world001b_fixture where key='opportunity')
      and opportunity_version = 4
  ),
  3,
  'state-only CLOSED v4 preserves the three-competency snapshot'
);

select is(
  (
    select count(*)::integer
    from public.opportunity_version_competencies v4
    join public.opportunity_version_competencies v3
      on v3.id = v4.inherited_from_link_id
    where v4.opportunity_id = (select value from world001b_fixture where key='opportunity')
      and v4.opportunity_version = 4
      and v3.opportunity_version = 3
  ),
  3,
  'CLOSED v4 snapshot provenance chains back to the OPEN v3 version'
);

select is(
  (
    select count(*)::integer
    from public.command_receipts
    where command_type in ('competency.define', 'opportunity.competency_declare')
      and status = 'COMPLETED'
  ),
  9,
  'three definitions and six declarations are attributable and idempotency-recorded'
);

select is(
  (
    select count(*)::integer
    from public.domain_events
    where event_type in ('COMPETENCY_DEFINED', 'OPPORTUNITY_COMPETENCY_DECLARED')
  ),
  9,
  'three definitions and six declarations produce attributable domain events'
);

select * from finish();
rollback;

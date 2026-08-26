begin;

create extension if not exists pgtap with schema extensions;
select no_plan();

select has_table('public', 'needs', 'first-class Need material table exists');
select has_table('public', 'need_versions', 'immutable Need versions exist');
select has_function(
  'public',
  't1_create_need',
  array['uuid','uuid','text','text','text','uuid','text'],
  'Need creation command exists'
);
select has_function(
  'public',
  't1_publish_need',
  array['uuid','uuid','integer','uuid','text'],
  'Need publication command exists'
);
select has_function(
  'public',
  'list_public_profiles',
  array[]::text[],
  'bounded public Profile discovery exists'
);

insert into auth.users(
  id, aud, role, email, raw_app_meta_data, raw_user_meta_data, created_at, updated_at
) values
(
  '91000000-0000-4000-8000-000000000001',
  'authenticated', 'authenticated', 't1-foundation-steward@example.test',
  '{"provider":"email","providers":["email"]}',
  '{"name":"T1 Foundation Steward"}',
  now(), now()
),
(
  '91000000-0000-4000-8000-000000000002',
  'authenticated', 'authenticated', 't1-foundation-outsider@example.test',
  '{"provider":"email","providers":["email"]}',
  '{"name":"T1 Foundation Outsider"}',
  now(), now()
);

select set_config('request.jwt.claim.sub', '91000000-0000-4000-8000-000000000001', true);

select is(
  public.update_my_profile(
    't1_steward',
    'T1 Foundation Steward',
    'Public Profile used by the T1 social foundation test.',
    'PUBLIC'
  ) ->> 'visibility',
  'PUBLIC',
  'steward explicitly publishes own Profile'
);

create temporary table t1_foundation_fixture(
  key text primary key,
  value uuid,
  result jsonb
);

insert into t1_foundation_fixture(key, value)
select 'steward_actor', actor_id
from public.actor_memberships
where profile_id = '91000000-0000-4000-8000-000000000001'
  and role = 'OWNER';

insert into t1_foundation_fixture(key, value)
select 'outsider_actor', actor_id
from public.actor_memberships
where profile_id = '91000000-0000-4000-8000-000000000002'
  and role = 'OWNER';

insert into t1_foundation_fixture(key, result)
select 'project', to_jsonb(x)
from public.create_project_atomic(
  'Projeto T1 Social Foundation',
  'projeto-t1-social-foundation',
  'Projeto público para demonstrar Need independente e descoberta social.',
  'Preservar uma Need como objeto distinto antes de qualquer Opportunity.',
  'Tornar a falta contextual observável sem fabricar uma oferta ou compromisso.',
  'Uma Need pública atribuível e independentemente reconstruível.',
  'Sem converter rótulos legados em registros históricos de Need.',
  array['legacy-label-only'],
  'VOLUNTARY',
  'OPEN',
  true
) x;

update t1_foundation_fixture
set value = (result ->> 'project_id')::uuid
where key = 'project';

select ok(
  private.b1_has_capability(
    (select value from t1_foundation_fixture where key = 'steward_actor'),
    'need.create',
    'PROJECT',
    (select value from t1_foundation_fixture where key = 'project')
  ),
  'PROJECT_STEWARD receives bounded need.create capability'
);

insert into t1_foundation_fixture(key, result)
select 'need', public.t1_create_need(
  (select value from t1_foundation_fixture where key = 'steward_actor'),
  (select value from t1_foundation_fixture where key = 'project'),
  'Need independente',
  'Precisamos preservar uma necessidade identificável antes da Opportunity.',
  'Contexto da T1: o rótulo legado não é um Original Record de Need.',
  '92000000-0000-4000-8000-000000000001',
  't1-need-create-001'
);

update t1_foundation_fixture
set value = (result ->> 'need_id')::uuid
where key = 'need';

select set_config(
  'cz.t1.need_id',
  (select value::text from t1_foundation_fixture where key = 'need'),
  true
);

select is(
  (select result ->> 'state' from t1_foundation_fixture where key = 'need'),
  'DRAFT',
  'Need begins as DRAFT'
);
select is(
  (select result ->> 'visibility' from t1_foundation_fixture where key = 'need'),
  'PROJECT',
  'Need begins PROJECT-visible'
);
select is(
  (
    select count(*)::integer from public.need_versions
    where need_id = (select value from t1_foundation_fixture where key = 'need')
  ),
  1,
  'Need draft has one immutable version'
);

select set_config('request.jwt.claim.sub', '', true);
set local role anon;
select is(
  (
    select count(*)::integer from public.needs
    where id = current_setting('cz.t1.need_id')::uuid
  ),
  0,
  'anonymous reader cannot see project-visible Need draft'
);
reset role;

select set_config('request.jwt.claim.sub', '91000000-0000-4000-8000-000000000001', true);

update t1_foundation_fixture
set result = public.t1_publish_need(
  (select value from t1_foundation_fixture where key = 'steward_actor'),
  value,
  1,
  '92000000-0000-4000-8000-000000000002',
  't1-need-publish-001'
)
where key = 'need';

select is(
  (select result ->> 'state' from t1_foundation_fixture where key = 'need'),
  'OPEN',
  'separate command publishes Need as OPEN'
);
select is(
  (select result ->> 'visibility' from t1_foundation_fixture where key = 'need'),
  'PUBLIC',
  'separate command publishes Need as PUBLIC'
);
select is(
  (
    select count(*)::integer from public.need_versions
    where need_id = (select value from t1_foundation_fixture where key = 'need')
  ),
  2,
  'publication creates a second immutable Need version'
);
select is(
  (
    select count(*)::integer from public.domain_events
    where aggregate_type = 'NEED'
      and aggregate_id = (select value from t1_foundation_fixture where key = 'need')
  ),
  2,
  'Need creation and publication are reconstructible domain events'
);
select is(
  (
    select count(*)::integer from public.domain_events
    where aggregate_type = 'NEED'
      and aggregate_id = (select value from t1_foundation_fixture where key = 'need')
      and event_type = 'NEED_PUBLISHED'
      and visibility = 'PUBLIC'
  ),
  1,
  'Need publication event is explicitly PUBLIC'
);

select set_config('request.jwt.claim.sub', '', true);
set local role anon;
select is(
  (
    select count(*)::integer from public.needs
    where id = current_setting('cz.t1.need_id')::uuid
  ),
  1,
  'anonymous reader can see published public Need'
);
select is(
  (select count(*)::integer from public.list_public_profiles() where handle = 't1_steward'),
  1,
  'public Profile discovery returns explicitly public Profile'
);
select is(
  (
    select count(*)::integer from public.list_public_profiles()
    where display_name = 'T1 Foundation Outsider'
  ),
  0,
  'public Profile discovery does not expose private Profile'
);
reset role;

select set_config('request.jwt.claim.sub', '91000000-0000-4000-8000-000000000002', true);

select throws_ok(
  format(
    'select public.t1_create_need(%L::uuid,%L::uuid,%L,%L,%L,%L::uuid,%L)',
    (select value from t1_foundation_fixture where key = 'outsider_actor'),
    (select value from t1_foundation_fixture where key = 'project'),
    'Need sem autoridade',
    'Este ator não conduz o projeto e não pode criar Need nele.',
    '',
    '92000000-0000-4000-8000-000000000003',
    't1-need-denied-001'
  ),
  '42501',
  'CZ403:CAPABILITY_DENIED',
  'non-steward cannot create a project-scoped Need'
);

select is(
  (
    select needs[1] from public.projects
    where id = (select value from t1_foundation_fixture where key = 'project')
  ),
  'legacy-label-only',
  'legacy project needs[] remains untouched and is not rewritten as Need history'
);

select * from finish();
rollback;

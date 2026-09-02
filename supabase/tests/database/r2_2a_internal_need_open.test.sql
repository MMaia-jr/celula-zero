begin;

create extension if not exists pgtap with schema extensions;
select no_plan();

select has_function(
  'public',
  't1_open_need',
  array['uuid','uuid','integer','uuid','text'],
  'R2-2A internal Need open command exists'
);

select ok(
  exists (
    select 1
    from public.capability_definitions
    where code = 'need.open'
  ),
  'need.open capability exists'
);

select ok(
  exists (
    select 1
    from public.role_capabilities
    where role_id = '00000000-0000-4000-8000-00000000c202'
      and capability_code = 'need.open'
  ),
  'PROJECT_STEWARD receives need.open capability'
);

insert into auth.users(
  id, aud, role, email, raw_app_meta_data, raw_user_meta_data, created_at, updated_at
) values
(
  '93100000-0000-4000-8000-000000000001',
  'authenticated', 'authenticated', 'r22a-steward@example.test',
  '{"provider":"email","providers":["email"]}',
  '{"name":"R2-2A Steward"}',
  now(), now()
),
(
  '93100000-0000-4000-8000-000000000002',
  'authenticated', 'authenticated', 'r22a-outsider@example.test',
  '{"provider":"email","providers":["email"]}',
  '{"name":"R2-2A Outsider"}',
  now(), now()
);

select set_config('request.jwt.claim.sub', '93100000-0000-4000-8000-000000000001', true);

create temporary table r22a_fixture(
  key text primary key,
  value uuid,
  result jsonb
);

insert into r22a_fixture(key, value)
select 'steward_actor', actor_id
from public.actor_memberships
where profile_id = '93100000-0000-4000-8000-000000000001'
  and role = 'OWNER';

insert into r22a_fixture(key, value)
select 'outsider_actor', actor_id
from public.actor_memberships
where profile_id = '93100000-0000-4000-8000-000000000002'
  and role = 'OWNER';

insert into r22a_fixture(key, result)
select 'project', to_jsonb(x)
from public.create_project_atomic(
  'Projeto R2 2A Internal Need',
  'projeto-r2-2a-internal-need',
  'Projeto de teste isolado da abertura interna de Need.',
  'Preservar coordenação interna sem publicação pública.',
  'Demonstrar OPEN PROJECT como estado operacional.',
  'Need interno aberto e aceito pelo bridge Need para Opportunity.',
  'Nenhuma publicação do Need interno.',
  array['r2-2a'],
  'VOLUNTARY',
  'OPEN',
  true
) x;

update r22a_fixture
set value = (result ->> 'project_id')::uuid
where key = 'project';

select ok(
  private.b1_has_capability(
    (select value from r22a_fixture where key = 'steward_actor'),
    'need.open',
    'PROJECT',
    (select value from r22a_fixture where key = 'project')
  ),
  'project steward has need.open in the test project'
);

insert into r22a_fixture(key, result)
select 'need_internal', public.t1_create_need(
  (select value from r22a_fixture where key = 'steward_actor'),
  (select value from r22a_fixture where key = 'project'),
  'Need interna para coordenacao',
  'Precisamos abrir esta Need para coordenacao interna sem torna-la publica.',
  'R2-2A: propriedade testada = operational openness without public disclosure.',
  '93200000-0000-4000-8000-000000000001',
  'r22a-create-internal-001'
);

update r22a_fixture
set value = (result ->> 'need_id')::uuid
where key = 'need_internal';

select set_config(
  'cz.r22a.need_internal',
  (select value::text from r22a_fixture where key = 'need_internal'),
  true
);

select is(
  (select result ->> 'state' from r22a_fixture where key = 'need_internal'),
  'DRAFT',
  'fresh Need begins DRAFT'
);

select is(
  (select result ->> 'visibility' from r22a_fixture where key = 'need_internal'),
  'PROJECT',
  'fresh Need begins PROJECT-visible'
);

update r22a_fixture
set result = public.t1_open_need(
  (select value from r22a_fixture where key = 'steward_actor'),
  value,
  1,
  '93200000-0000-4000-8000-000000000002',
  'r22a-open-internal-001'
)
where key = 'need_internal';

select is(
  (select result ->> 'state' from r22a_fixture where key = 'need_internal'),
  'OPEN',
  'internal open moves Need to OPEN'
);

select is(
  (select result ->> 'visibility' from r22a_fixture where key = 'need_internal'),
  'PROJECT',
  'internal open preserves PROJECT visibility'
);

select is(
  (
    select count(*)::integer
    from public.need_versions
    where need_id = (select value from r22a_fixture where key = 'need_internal')
  ),
  2,
  'internal open creates exactly one new immutable Need version'
);

select is(
  (
    select state || '/' || visibility
    from public.need_versions
    where need_id = (select value from r22a_fixture where key = 'need_internal')
      and version = 1
  ),
  'DRAFT/PROJECT',
  'Need version 1 remains DRAFT/PROJECT'
);

select is(
  (
    select state || '/' || visibility
    from public.need_versions
    where need_id = (select value from r22a_fixture where key = 'need_internal')
      and version = 2
  ),
  'OPEN/PROJECT',
  'Need version 2 is OPEN/PROJECT'
);

select is(
  (
    select v1.title || '|' || v1.statement || '|' || v1.context
    from public.need_versions v1
    where v1.need_id = (select value from r22a_fixture where key = 'need_internal')
      and v1.version = 1
  ),
  (
    select v2.title || '|' || v2.statement || '|' || v2.context
    from public.need_versions v2
    where v2.need_id = (select value from r22a_fixture where key = 'need_internal')
      and v2.version = 2
  ),
  'internal open preserves Need narrative content exactly'
);

select is(
  (
    select count(*)::integer
    from public.domain_events
    where aggregate_type = 'NEED'
      and aggregate_id = (select value from r22a_fixture where key = 'need_internal')
      and event_type = 'NEED_OPENED'
      and visibility = 'PROJECT'
      and payload ->> 'publication' = 'false'
  ),
  1,
  'internal open emits exactly one PROJECT-visible NEED_OPENED with publication=false'
);

select is(
  (
    select count(*)::integer
    from public.domain_events
    where aggregate_type = 'NEED'
      and aggregate_id = (select value from r22a_fixture where key = 'need_internal')
      and event_type = 'NEED_PUBLISHED'
  ),
  0,
  'internal open does not emit NEED_PUBLISHED'
);

select set_config('request.jwt.claim.sub', '', true);
set local role anon;

select is(
  (
    select count(*)::integer
    from public.needs
    where id = current_setting('cz.r22a.need_internal')::uuid
  ),
  0,
  'anonymous reader cannot see OPEN/PROJECT Need'
);

reset role;
select set_config('request.jwt.claim.sub', '93100000-0000-4000-8000-000000000001', true);

-- Exact successful command replay must be idempotent even though current state is now OPEN.
select is(
  (
    public.t1_open_need(
      (select value from r22a_fixture where key = 'steward_actor'),
      (select value from r22a_fixture where key = 'need_internal'),
      1,
      '93200000-0000-4000-8000-000000000002',
      'r22a-open-internal-001'
    ) ->> 'state'
  ),
  'OPEN',
  'exact replay returns saved successful result'
);

select is(
  (
    select count(*)::integer
    from public.need_versions
    where need_id = (select value from r22a_fixture where key = 'need_internal')
  ),
  2,
  'idempotent replay creates no third version'
);

select is(
  (
    select count(*)::integer
    from public.domain_events
    where aggregate_type = 'NEED'
      and aggregate_id = (select value from r22a_fixture where key = 'need_internal')
      and event_type = 'NEED_OPENED'
  ),
  1,
  'idempotent replay creates no duplicate NEED_OPENED'
);

select throws_ok(
  format(
    'select public.t1_open_need(%L::uuid,%L::uuid,1,%L::uuid,%L)',
    (select value from r22a_fixture where key = 'steward_actor'),
    (select value from r22a_fixture where key = 'need_internal'),
    '93200000-0000-4000-8000-000000000003',
    'r22a-stale-001'
  ),
  'P0001',
  'CZ409:STALE_VERSION',
  'stale material version is rejected'
);

select throws_ok(
  format(
    'select public.t1_open_need(%L::uuid,%L::uuid,2,%L::uuid,%L)',
    (select value from r22a_fixture where key = 'steward_actor'),
    (select value from r22a_fixture where key = 'need_internal'),
    '93200000-0000-4000-8000-000000000004',
    'r22a-invalid-state-001'
  ),
  'P0001',
  'CZ409:INVALID_STATE',
  'already OPEN Need cannot be opened again with a new command'
);

select set_config('request.jwt.claim.sub', '93100000-0000-4000-8000-000000000002', true);

select throws_ok(
  format(
    'select public.t1_open_need(%L::uuid,%L::uuid,2,%L::uuid,%L)',
    (select value from r22a_fixture where key = 'outsider_actor'),
    (select value from r22a_fixture where key = 'need_internal'),
    '93200000-0000-4000-8000-000000000005',
    'r22a-unauthorized-001'
  ),
  '42501',
  'CZ403:CAPABILITY_DENIED',
  'actor without project need.open authority is denied'
);

select set_config('request.jwt.claim.sub', '93100000-0000-4000-8000-000000000001', true);

-- Existing public publication behavior must remain unchanged on a separate fresh Need.
insert into r22a_fixture(key, result)
select 'need_public', public.t1_create_need(
  (select value from r22a_fixture where key = 'steward_actor'),
  (select value from r22a_fixture where key = 'project'),
  'Need publica separada',
  'Esta Need existe apenas para provar que o fluxo antigo de publicacao nao regrediu.',
  'R2-2A regression control.',
  '93200000-0000-4000-8000-000000000006',
  'r22a-create-public-001'
);

update r22a_fixture
set value = (result ->> 'need_id')::uuid
where key = 'need_public';

update r22a_fixture
set result = public.t1_publish_need(
  (select value from r22a_fixture where key = 'steward_actor'),
  value,
  1,
  '93200000-0000-4000-8000-000000000007',
  'r22a-publish-public-001'
)
where key = 'need_public';

select is(
  (select result ->> 'state' from r22a_fixture where key = 'need_public'),
  'OPEN',
  'existing publication path still opens a fresh DRAFT Need'
);

select is(
  (select result ->> 'visibility' from r22a_fixture where key = 'need_public'),
  'PUBLIC',
  'existing publication path still makes that separate Need PUBLIC'
);

-- Target composition: existing Need -> Opportunity bridge must accept OPEN/PROJECT.
insert into r22a_fixture(key, result)
select 'opportunity', public.t1_create_opportunity_for_need(
  (select value from r22a_fixture where key = 'steward_actor'),
  (select value from r22a_fixture where key = 'project'),
  (select value from r22a_fixture where key = 'need_internal'),
  'Opportunity interna R2 2A',
  'Opportunity ligada a uma Need OPEN/PROJECT sem exigir publicacao da Need.',
  'Somente coordenacao interna neste teste.',
  'Uma Opportunity DRAFT ligada ao Need interno.',
  1,
  '93200000-0000-4000-8000-000000000008',
  'r22a-create-opportunity-001'
);

update r22a_fixture
set value = (result ->> 'opportunity_id')::uuid
where key = 'opportunity';

select is(
  (
    select need_id
    from public.opportunities
    where id = (select value from r22a_fixture where key = 'opportunity')
  ),
  (select value from r22a_fixture where key = 'need_internal'),
  'existing Need -> Opportunity bridge links the OPEN/PROJECT Need'
);

select is(
  (
    select state || '/' || visibility
    from public.needs
    where id = (select value from r22a_fixture where key = 'need_internal')
  ),
  'OPEN/PROJECT',
  'Need remains OPEN/PROJECT after Opportunity creation'
);

select * from finish();
rollback;

begin;

create extension if not exists pgtap with schema extensions;
select no_plan();

select has_function(
  'public',
  'world003b_discover',
  array['text','text[]','text[]','text[]','uuid[]','text[]','integer'],
  'WORLD-003B discovery projection exists'
);

select is(
  has_function_privilege(
    'anon',
    'public.world003b_discover(text,text[],text[],text[],uuid[],text[],integer)',
    'EXECUTE'
  ),
  true,
  'anonymous external caller can use public discovery projection'
);

select is(
  has_function_privilege(
    'authenticated',
    'public.world003b_discover(text,text[],text[],text[],uuid[],text[],integer)',
    'EXECUTE'
  ),
  true,
  'authenticated caller can use the same explicit discovery projection'
);

select ok(
  to_regclass('public.search_history') is null
  and to_regclass('public.actor_competencies') is null
  and to_regclass('public.need_statements') is null,
  'slice creates no search history, Actor competency profile or Need entity'
);

create temporary table world003b_fixture(
  key text primary key,
  value uuid,
  result jsonb,
  text_value text,
  int_value integer
);
grant select on world003b_fixture to anon, authenticated;

insert into public.pilot_invites(email,label)
values ('world003b@example.test','WORLD-003B steward');

insert into auth.users(
  id,aud,role,email,raw_app_meta_data,raw_user_meta_data,created_at,updated_at
) values (
  '75000000-0000-4000-8000-000000000001',
  'authenticated','authenticated','world003b@example.test',
  '{"provider":"email","providers":["email"]}',
  '{"name":"WORLD-003B Steward"}',
  now(),now()
);

insert into world003b_fixture(key,value)
select 'actor',actor_id
from public.actor_memberships
where profile_id='75000000-0000-4000-8000-000000000001'
  and role='OWNER';

select set_config(
  'request.jwt.claim.sub',
  '75000000-0000-4000-8000-000000000001',
  true
);

-- Public project A.
insert into world003b_fixture(key,result)
select 'project_a',to_jsonb(x)
from public.create_project_atomic(
  'Ocean Robotics Learning Lab',
  'world003b-ocean-robotics',
  'Public learning project for ocean robotics, sensor telemetry and collaborative data analysis.',
  'BLOCKED-INTENT-003B-A original human intention remains separate from discovery metadata.',
  'Public interpretation for an ocean robotics learning project with explicit human direction.',
  'Produce a small verified analysis of ocean sensor telemetry.',
  'Use only public project metadata for discovery; do not infer participant traits.',
  array['robotics','data analysis'],
  'VOLUNTARY',
  'OPEN',
  true
) x;

update world003b_fixture
set value=(result->>'project_id')::uuid
where key='project_a';

insert into world003b_fixture(key,value)
select 'intent_a',current_intent_record_id
from public.projects
where id=(select value from world003b_fixture where key='project_a');

-- Define an explicit competency concept.
insert into world003b_fixture(key,result)
select 'competency_python',public.world001b_define_competency(
  (select value from world003b_fixture where key='actor'),
  (select value from world003b_fixture where key='project_a'),
  'Python data analysis',
  'Use Python to inspect, transform and explain structured observational datasets.',
  'en',
  'LOCAL',
  null,null,null,null,null,
  '75000000-0000-4000-8000-000000000101',
  'world003b-competency-python-0001'
);

update world003b_fixture
set value=(result->>'competency_id')::uuid
where key='competency_python';

-- Public opportunity A.
insert into world003b_fixture(key,result)
select 'opp_a',public.b1_create_opportunity(
  (select value from world003b_fixture where key='actor'),
  (select value from world003b_fixture where key='project_a'),
  'Analyze ocean sensor telemetry',
  'Use explicit project data to produce a small analysis of ocean telemetry and document the reasoning.',
  'Work from the provided public dataset and record limitations.',
  'A concise reproducible analysis with stated limitations.',
  2,
  '75000000-0000-4000-8000-000000000102',
  'world003b-create-opp-a-0001'
);

update world003b_fixture
set value=(result->>'opportunity_id')::uuid,
    int_value=(result->>'material_version')::integer
where key='opp_a';

insert into world003b_fixture(key,result)
select 'opp_a_competency',public.world001b_declare_opportunity_competency(
  (select value from world003b_fixture where key='actor'),
  (select value from world003b_fixture where key='opp_a'),
  (select int_value from world003b_fixture where key='opp_a'),
  (select value from world003b_fixture where key='competency_python'),
  'REQUIRED',
  'The task explicitly requires Python data analysis for the supplied telemetry.',
  '75000000-0000-4000-8000-000000000103',
  'world003b-declare-opp-a-python-0001'
);

update world003b_fixture
set int_value=(
  select (result->>'material_version')::integer
  from world003b_fixture
  where key='opp_a_competency'
)
where key='opp_a';

select is(
  (select int_value from world003b_fixture where key='opp_a'),
  2,
  'fixture carries WORLD-001B material version forward before publication'
);

insert into world003b_fixture(key,result)
select 'opp_a_publish',public.b1_publish_opportunity(
  (select value from world003b_fixture where key='actor'),
  (select value from world003b_fixture where key='opp_a'),
  (select int_value from world003b_fixture where key='opp_a'),
  '75000000-0000-4000-8000-000000000104',
  'world003b-publish-opp-a-0001'
);

-- A draft opportunity in a public project must remain undiscoverable.
insert into world003b_fixture(key,result)
select 'opp_draft',public.b1_create_opportunity(
  (select value from world003b_fixture where key='actor'),
  (select value from world003b_fixture where key='project_a'),
  'Hidden Draft Signal',
  'HIDDEN-DRAFT-TOKEN-003B must never appear in anonymous discovery.',
  'Draft only.',
  'No public result.',
  1,
  '75000000-0000-4000-8000-000000000105',
  'world003b-create-hidden-draft-0001'
);

-- Public project B provides an unrelated result.
insert into world003b_fixture(key,result)
select 'project_b',to_jsonb(x)
from public.create_project_atomic(
  'Community Garden Mapping',
  'world003b-community-garden',
  'Public project for mapping community gardens and documenting local cultivation practices.',
  'Human intention for a public community garden mapping project and transparent participation.',
  'Public interpretation for collaborative garden mapping and documentation.',
  'Create a small public map of documented community garden resources.',
  'No inferred location tracking; contributors choose what they disclose.',
  array['mapping','documentation'],
  'VOLUNTARY',
  'ACTIVE',
  true
) x;

update world003b_fixture
set value=(result->>'project_id')::uuid
where key='project_b';

-- Private project must never be discoverable.
insert into world003b_fixture(key,result)
select 'project_private',to_jsonb(x)
from public.create_project_atomic(
  'Private Secret Research',
  'world003b-private-secret',
  'PRIVATE-SECRET-TOKEN-003B is intentionally private and excluded from public discovery.',
  'Private original intention for a project that must never be exposed through anonymous discovery.',
  'Private interpretation that must remain outside public discovery surfaces.',
  'Keep this synthetic project private.',
  'Private means no anonymous discovery projection.',
  array['private synthetic'],
  'VOLUNTARY',
  'OPEN',
  false
) x;

-- Block current raw intent for public Project A; discovery must still expose
-- only public project metadata and never bypass the content block.
insert into world003b_fixture(key,result)
select 'block_intent_a',public.data001b_block_project_intent_content(
  (select value from world003b_fixture where key='actor'),
  (select value from world003b_fixture where key='intent_a'),
  'PURPOSE_OR_NECESSITY_REVIEW',
  '75000000-0000-4000-8000-000000000106',
  'world003b-block-current-intent-a-0001'
);

insert into world003b_fixture(key,int_value)
select 'receipts_before_discovery',count(*)::integer
from public.command_receipts;

select set_config('request.jwt.claim.sub','',true);
set local role anon;

select is(
  (
    select count(*)::integer
    from public.world003b_discover(
      'ocean',
      null,null,null,null,null,50
    )
  ),
  2,
  'anonymous text query finds exactly the public ocean Project and published Opportunity'
);

select is(
  (
    select count(*)::integer
    from public.world003b_discover(
      'robotics',
      array['PROJECT']::text[],
      null,null,null,null,50
    )
  ),
  1,
  'explicit PROJECT type filter returns the matching public project only'
);

select ok(
  exists (
    select 1
    from public.world003b_discover(
      'ocean',
      array['PROJECT']::text[],
      array['OPEN']::text[],
      null,null,null,50
    ) d
    where d.result_type='PROJECT'
      and d.matched_reason_codes @> array[
        'TEXT_MATCH',
        'EXPLICIT_TYPE_FILTER_MATCH',
        'EXPLICIT_STATE_FILTER_MATCH'
      ]::text[]
  ),
  'project result explains text/type/state inclusion deterministically'
);

select is(
  (
    select count(*)::integer
    from public.world003b_discover(
      'PRIVATE-SECRET-TOKEN-003B',
      null,null,null,null,null,50
    )
  ),
  0,
  'private project text cannot be discovered anonymously'
);

select is(
  (
    select count(*)::integer
    from public.world003b_discover(
      'HIDDEN-DRAFT-TOKEN-003B',
      array['OPPORTUNITY']::text[],
      null,null,null,null,50
    )
  ),
  0,
  'draft project-scoped opportunity cannot be discovered anonymously'
);

select is(
  (
    select count(*)::integer
    from public.world003b_discover(
      'BLOCKED-INTENT-003B-A',
      null,null,null,null,null,50
    )
  ),
  0,
  'blocked project-intent content is not a discovery search surface'
);

select ok(
  exists (
    select 1
    from public.world003b_discover(
      null,
      array['OPPORTUNITY']::text[],
      null,
      array['OPEN']::text[],
      array[(select value from world003b_fixture where key='competency_python')]::uuid[],
      array['REQUIRED']::text[],
      50
    ) d
    where d.object_id=(select value from world003b_fixture where key='opp_a')
      and d.matched_competency_concept_ids @>
        array[(select value from world003b_fixture where key='competency_python')]::uuid[]
      and d.matched_reason_codes @>
        array['EXPLICIT_COMPETENCY_REQUIRED_MATCH']::text[]
  ),
  'explicit competency filter finds exact published Opportunity and explains REQUIRED relation'
);

select is(
  (
    select count(*)::integer
    from public.world003b_discover(
      null,
      array['OPPORTUNITY']::text[],
      null,
      array['OPEN']::text[],
      array[(select value from world003b_fixture where key='competency_python')]::uuid[],
      array['PREFERRED']::text[],
      50
    )
  ),
  0,
  'relation filter does not convert REQUIRED into PREFERRED'
);

select is(
  (
    select count(*)::integer
    from public.world003b_discover(
      'garden',
      null,null,null,
      array[(select value from world003b_fixture where key='competency_python')]::uuid[],
      null,
      50
    )
  ),
  0,
  'combined text and competency filters require both explicit conditions'
);

select ok(
  not exists (
    select 1
    from public.world003b_discover(
      null,null,null,null,null,null,50
    ) d
    where to_jsonb(d) ?| array[
      'current_intent',
      'needs',
      'steward_actor_id',
      'owner_actor_id',
      'profile_id',
      'score',
      'rank',
      'reputation'
    ]
  ),
  'result contract exposes no raw intent, needs, Actor/profile identifiers or opaque score'
);

select ok(
  not exists (
    select 1
    from public.world003b_discover(
      null,null,null,null,null,null,50
    ) d
    where to_jsonb(d)::text like '%BLOCKED-INTENT-003B-A%'
       or to_jsonb(d)::text like '%PRIVATE-SECRET-TOKEN-003B%'
       or to_jsonb(d)::text like '%HIDDEN-DRAFT-TOKEN-003B%'
  ),
  'default discovery output contains none of the blocked/private/draft sentinel text'
);

select is(
  (
    select count(*)::integer
    from public.world003b_discover(
      null,
      array['PROJECT']::text[],
      array['COMPLETED']::text[],
      null,null,null,50
    )
  ),
  0,
  'explicit project-stage filter is deterministic'
);

select throws_ok(
  $$select * from public.world003b_discover(
    null,array['PERSON']::text[],null,null,null,null,50
  )$$,
  'P0001',
  'CZ422:INVALID_DISCOVERY_RESULT_TYPE',
  'invalid result type is rejected'
);

select throws_ok(
  $$select * from public.world003b_discover(
    null,null,null,null,null,array['EXPERT']::text[],50
  )$$,
  'P0001',
  'CZ422:INVALID_COMPETENCY_RELATION_FILTER',
  'invalid competency relation is rejected'
);

select throws_ok(
  $$select * from public.world003b_discover(
    null,null,null,null,null,null,101
  )$$,
  'P0001',
  'CZ422:DISCOVERY_LIMIT_OUT_OF_RANGE',
  'query limit is bounded'
);


select throws_ok(
  $$select * from public.world003b_discover(
    repeat('x',501),null,null,null,null,null,50
  )$$,
  'P0001',
  'CZ422:DISCOVERY_TEXT_QUERY_TOO_LONG',
  'anonymous text query length is bounded'
);

select throws_ok(
  $$select * from public.world003b_discover(
    null,null,null,null,
    array[
      '00000000-0000-4000-8000-000000000001'::uuid,
      '00000000-0000-4000-8000-000000000002'::uuid,
      '00000000-0000-4000-8000-000000000003'::uuid,
      '00000000-0000-4000-8000-000000000004'::uuid,
      '00000000-0000-4000-8000-000000000005'::uuid,
      '00000000-0000-4000-8000-000000000006'::uuid,
      '00000000-0000-4000-8000-000000000007'::uuid,
      '00000000-0000-4000-8000-000000000008'::uuid,
      '00000000-0000-4000-8000-000000000009'::uuid,
      '00000000-0000-4000-8000-000000000010'::uuid,
      '00000000-0000-4000-8000-000000000011'::uuid,
      '00000000-0000-4000-8000-000000000012'::uuid,
      '00000000-0000-4000-8000-000000000013'::uuid,
      '00000000-0000-4000-8000-000000000014'::uuid,
      '00000000-0000-4000-8000-000000000015'::uuid,
      '00000000-0000-4000-8000-000000000016'::uuid,
      '00000000-0000-4000-8000-000000000017'::uuid,
      '00000000-0000-4000-8000-000000000018'::uuid,
      '00000000-0000-4000-8000-000000000019'::uuid,
      '00000000-0000-4000-8000-000000000020'::uuid,
      '00000000-0000-4000-8000-000000000021'::uuid,
      '00000000-0000-4000-8000-000000000022'::uuid,
      '00000000-0000-4000-8000-000000000023'::uuid,
      '00000000-0000-4000-8000-000000000024'::uuid,
      '00000000-0000-4000-8000-000000000025'::uuid,
      '00000000-0000-4000-8000-000000000026'::uuid
    ]::uuid[],
    null,50
  )$$,
  'P0001',
  'CZ422:INVALID_COMPETENCY_FILTER',
  'anonymous competency filter cardinality is bounded'
);

select throws_ok(
  $$select * from public.world003b_discover(
    null,array['PROJECT',null]::text[],null,null,null,null,50
  )$$,
  'P0001',
  'CZ422:INVALID_DISCOVERY_RESULT_TYPE_FILTER',
  'null filter elements are rejected rather than interpreted ambiguously'
);

reset role;
select set_config(
  'request.jwt.claim.sub',
  '75000000-0000-4000-8000-000000000001',
  true
);

select is(
  (
    select count(*)::integer
    from public.command_receipts
  ),
  (select int_value from world003b_fixture where key='receipts_before_discovery'),
  'discovery persists no command/search history'
);

select is(
  (
    select count(*)::integer
    from public.opportunities
    where id=(select value from world003b_fixture where key='opp_a')
      and state='OPEN'
      and visibility='PUBLIC'
  ),
  1,
  'discovery does not mutate published opportunity state'
);

select is(
  public.b1_reconcile_opportunity(
    (select value from world003b_fixture where key='opp_a')
  ),
  '{}'::text[],
  'published opportunity remains reconciled after discovery'
);

select is(
  public.world001b_reconcile_opportunity_competencies(
    (select value from world003b_fixture where key='opp_a')
  ),
  '{}'::text[],
  'WORLD-001 competency snapshot remains reconciled after discovery'
);

select is(
  public.world002b_reconcile_project_intent(
    (select value from world003b_fixture where key='project_a')
  ),
  '{}'::text[],
  'WORLD-002 blocked operative intent remains reconciled after discovery'
);

select * from finish();
rollback;

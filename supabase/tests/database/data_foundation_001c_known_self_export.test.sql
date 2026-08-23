begin;

create extension if not exists pgtap with schema extensions;
select no_plan();

select has_function(
  'public',
  'data001c_export_known_self_data',
  array[]::text[],
  'DATA-FOUNDATION-001C known-self-data export exists'
);

select is(
  has_function_privilege(
    'authenticated',
    'public.data001c_export_known_self_data()',
    'EXECUTE'
  ),
  true,
  'authenticated profile can execute self export'
);

select is(
  has_function_privilege(
    'anon',
    'public.data001c_export_known_self_data()',
    'EXECUTE'
  ),
  false,
  'anonymous caller cannot execute self export'
);

select ok(
  to_regclass('public.data_subject_requests') is null
  and to_regclass('public.processing_activity_registry') is null
  and to_regclass('public.need_statements') is null,
  'slice creates no DSAR workflow, processing registry or Need persistence'
);

create temporary table data001c_fixture(
  key text primary key,
  value uuid,
  result jsonb,
  text_value text
);
grant select on data001c_fixture to authenticated;

-- Profile A.
insert into public.pilot_invites(email,label)
values ('data001c-a@example.test','DATA-FOUNDATION-001C profile A');

insert into auth.users(
  id,aud,role,email,raw_app_meta_data,raw_user_meta_data,created_at,updated_at
) values (
  '74000000-0000-4000-8000-000000000001',
  'authenticated','authenticated','data001c-a@example.test',
  '{"provider":"email","providers":["email"]}',
  '{"name":"Profile A"}',
  now(),now()
);

insert into data001c_fixture(key,value)
select 'actor_a',actor_id
from public.actor_memberships
where profile_id='74000000-0000-4000-8000-000000000001'
  and role='OWNER';

select set_config(
  'request.jwt.claim.sub',
  '74000000-0000-4000-8000-000000000001',
  true
);

insert into data001c_fixture(key,result)
select 'project_a',to_jsonb(x)
from public.create_project_atomic(
  'Projeto DATA FOUNDATION 001C A',
  'projeto-data-foundation-001c-a',
  'Projeto de teste de exportação estrutural conhecida do profile A.',
  'ORIGINAL-SELF-DATA-001C-A conteúdo humano original que deve aparecer antes do bloqueio.',
  'Interpretação inicial do projeto A sem alegação de completude de dados pessoais.',
  'Provar exportação autoconsciente das próprias limitações.',
  'Sem DSAR completo, sem portabilidade e sem Need.',
  array['known association export'],
  'VOLUNTARY',
  'OPEN',
  true
) x;

update data001c_fixture
set value=(result->>'project_id')::uuid
where key='project_a';

insert into data001c_fixture(key,value)
select 'original_a',id
from public.project_intents
where project_id=(select value from data001c_fixture where key='project_a')
  and kind='ORIGINAL'
  and version=1;

insert into data001c_fixture(key,text_value)
select 'original_content_a',content
from public.project_intents
where id=(select value from data001c_fixture where key='original_a');

insert into data001c_fixture(key,result)
values ('export_a_before',public.data001c_export_known_self_data());

select is(
  (select result->>'schema' from data001c_fixture where key='export_a_before'),
  'cz.known-self-data-export.v1',
  'export has explicit portable schema'
);

select is(
  (select result->>'subject_profile_id' from data001c_fixture where key='export_a_before'),
  '74000000-0000-4000-8000-000000000001',
  'export is bound to authenticated profile with no arbitrary target parameter'
);

select is(
  (select result#>>'{profile,account_email}' from data001c_fixture where key='export_a_before'),
  'data001c-a@example.test',
  'export returns own direct account email'
);

select is(
  (select result#>>'{profile,display_name}' from data001c_fixture where key='export_a_before'),
  'Profile A',
  'export returns own profile display name'
);

select is(
  (select (result#>>'{boundaries,complete_dsar}')::boolean
   from data001c_fixture where key='export_a_before'),
  false,
  'known export explicitly does not claim complete DSAR'
);

select is(
  (select (result#>>'{boundaries,portability_transfer}')::boolean
   from data001c_fixture where key='export_a_before'),
  false,
  'known export explicitly does not claim portability transfer'
);

select is(
  (select (result#>>'{boundaries,free_text_mention_detection}')::boolean
   from data001c_fixture where key='export_a_before'),
  false,
  'known export admits it cannot discover arbitrary free-text mentions'
);

select is(
  (select (result#>>'{boundaries,purpose_criteria_registry_complete}')::boolean
   from data001c_fixture where key='export_a_before'),
  false,
  'known export admits processing purpose/criteria registry is incomplete'
);

select ok(
  (select result->'known_gaps' from data001c_fixture where key='export_a_before')
    ? 'NOT_A_COMPLETE_ARTICLE_19_II_DECLARATION',
  'Article 19 II completeness gap is explicit'
);

select is(
  jsonb_array_length(
    (select result->'controlled_actors'
     from data001c_fixture where key='export_a_before')
  ),
  1,
  'profile A export contains its controlled PERSON actor'
);

select ok(
  exists (
    select 1
    from jsonb_array_elements(
      (select result->'known_project_intent_associations'
       from data001c_fixture where key='export_a_before')
    ) x
    where x->>'intent_id' =
      (select value::text from data001c_fixture where key='original_a')
      and x->>'content_state'='ACTIVE'
      and x->>'content'=
        (select text_value from data001c_fixture where key='original_content_a')
      and (x->'association_types') ? 'CONTENT_ORIGIN_CONTROLLED_ACTOR'
  ),
  'active exact human-origin content is included with structural association type'
);

-- Block exact ORIGINAL content. It is non-operative, so this tests that the
-- self-export itself cannot bypass lifecycle blocking.
insert into data001c_fixture(key,result)
select 'block_original_a',public.data001b_block_project_intent_content(
  (select value from data001c_fixture where key='actor_a'),
  (select value from data001c_fixture where key='original_a'),
  'PURPOSE_OR_NECESSITY_REVIEW',
  '74000000-0000-4000-8000-000000000101',
  'data001c-block-original-a-0001'
);

insert into data001c_fixture(key,result)
values ('export_a_after_block',public.data001c_export_known_self_data());

select ok(
  exists (
    select 1
    from jsonb_array_elements(
      (select result->'known_project_intent_associations'
       from data001c_fixture where key='export_a_after_block')
    ) x
    where x->>'intent_id' =
      (select value::text from data001c_fixture where key='original_a')
      and x->>'content_state'='BLOCKED'
      and not (x ? 'content')
  ),
  'blocked semantic association remains exported without raw content'
);

select ok(
  (select result::text from data001c_fixture where key='export_a_after_block')
    not like '%ORIGINAL-SELF-DATA-001C-A%',
  'SECURITY DEFINER self export cannot bypass blocked raw content'
);

select is(
  (select (result#>>'{boundaries,blocked_content_bypassed}')::boolean
   from data001c_fixture where key='export_a_after_block'),
  false,
  'export contract explicitly preserves block dominance'
);

-- Profile B proves self-only isolation.
insert into public.pilot_invites(email,label)
values ('data001c-b@example.test','DATA-FOUNDATION-001C profile B');

insert into auth.users(
  id,aud,role,email,raw_app_meta_data,raw_user_meta_data,created_at,updated_at
) values (
  '74000000-0000-4000-8000-000000000002',
  'authenticated','authenticated','data001c-b@example.test',
  '{"provider":"email","providers":["email"]}',
  '{"name":"Profile B"}',
  now(),now()
);

select set_config(
  'request.jwt.claim.sub',
  '74000000-0000-4000-8000-000000000002',
  true
);

insert into data001c_fixture(key,result)
select 'project_b',to_jsonb(x)
from public.create_project_atomic(
  'Projeto DATA FOUNDATION 001C B',
  'projeto-data-foundation-001c-b',
  'Projeto de teste separado pertencente exclusivamente ao profile B.',
  'ORIGINAL-SELF-DATA-001C-B conteúdo original pertencente estruturalmente ao profile B.',
  'Interpretação inicial independente do projeto B.',
  'Provar isolamento do export self-only.',
  'Sem acesso cruzado ao profile A.',
  array['self only'],
  'VOLUNTARY',
  'OPEN',
  false
) x;

insert into data001c_fixture(key,result)
values ('export_b',public.data001c_export_known_self_data());

select is(
  (select result#>>'{profile,account_email}' from data001c_fixture where key='export_b'),
  'data001c-b@example.test',
  'profile B export returns only B account email'
);

select ok(
  (select result::text from data001c_fixture where key='export_b')
    not like '%data001c-a@example.test%',
  'profile B export does not leak profile A direct identifier'
);

select ok(
  (select result::text from data001c_fixture where key='export_b')
    not like '%ORIGINAL-SELF-DATA-001C-A%',
  'profile B export does not leak profile A intent content'
);

select ok(
  (select result::text from data001c_fixture where key='export_b')
    like '%ORIGINAL-SELF-DATA-001C-B%',
  'profile B sees own structurally-originated active content'
);

-- Return to A and verify exact associations remain stable.
select set_config(
  'request.jwt.claim.sub',
  '74000000-0000-4000-8000-000000000001',
  true
);

select is(
  (select count(*)::integer
   from jsonb_array_elements(
     public.data001c_export_known_self_data()
       ->'known_project_intent_associations'
   ) x
   where x->>'project_id' =
     (select value::text from data001c_fixture where key='project_a')),
  2,
  'profile A export contains exactly its two Gate-1 project-intent associations'
);

select ok(
  not (
    public.data001c_export_known_self_data()::text
      like '%ORIGINAL-SELF-DATA-001C-A%'
  ),
  'blocked A original remains absent on repeated export'
);

select is(
  (public.data001c_export_known_self_data()
    #>>'{boundaries,structural_association_is_personal_data_classification}')::boolean,
  false,
  'structural relation is explicitly not a legal personal-data classification'
);

select is(
  (public.data001c_export_known_self_data()
    #>>'{boundaries,legal_compliance_claim}')::boolean,
  false,
  'export does not claim legal compliance'
);

select * from finish();
rollback;

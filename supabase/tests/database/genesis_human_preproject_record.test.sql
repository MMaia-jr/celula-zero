begin;

create extension if not exists pgtap with schema extensions;
select no_plan();

insert into auth.users(id,aud,role,email,raw_app_meta_data,raw_user_meta_data,created_at,updated_at)
values
('91300000-0000-4000-8000-000000000001','authenticated','authenticated','preproject-one@example.test','{"provider":"email","providers":["email"]}','{"name":"Preproject One"}',now(),now()),
('91300000-0000-4000-8000-000000000002','authenticated','authenticated','preproject-two@example.test','{"provider":"email","providers":["email"]}','{"name":"Preproject Two"}',now(),now());

create temporary table baseline_counts as select
  (select count(*) from public.projects) projects,
  (select count(*) from public.cells) cells,
  (select count(*) from public.dragon_cycles) cycles,
  (select count(*) from public.commitments) commitments,
  (select count(*) from public.contributions) contributions;

set local role authenticated;
select set_config('request.jwt.claim.sub','91300000-0000-4000-8000-000000000001',true);

create temporary table created_record as
select public.record_preproject_human_text(
  (select actor_id from public.actor_memberships where profile_id=auth.uid() and role='OWNER'),
  'SOURCE_MATERIAL',
  E'# Caminho\nconteúdo UTF-8 exato: ação\n',
  '{"supplied_path":"/controlled/trajetoria.md","supplied_filename":"trajetoria.md","media_type":"text/markdown; charset=utf-8","byte_size":42,"source_status":"SOURCE_NOT_TRUTH_OR_IDENTITY"}'::jsonb
) result;

select is((select result->>'visibility' from created_record),'PRIVATE','RPC fixes visibility PRIVATE');
select is(
  (select content from public.preproject_records where id=(select (result->>'record_id')::uuid from created_record)),
  E'# Caminho\nconteúdo UTF-8 exato: ação\n',
  'exact UTF-8 content round-trips'
);
select is(
  (select content_sha256 from public.preproject_records where id=(select (result->>'record_id')::uuid from created_record)),
  encode(extensions.digest(convert_to(E'# Caminho\nconteúdo UTF-8 exato: ação\n','UTF8'),'sha256'),'hex'),
  'digest matches exact imported UTF-8 bytes'
);
select is(
  (select provenance->>'supplied_path' from public.preproject_records where id=(select (result->>'record_id')::uuid from created_record)),
  '/controlled/trajetoria.md',
  'source path provenance is preserved'
);
select is((select count(*)::integer from public.preproject_records),1,'one source mutation exists');

select set_config('request.jwt.claim.sub','91300000-0000-4000-8000-000000000002',true);
select is((select count(*)::integer from public.preproject_records),0,'another Profile cannot read private record');
select throws_ok(
  format('select public.record_preproject_human_text(%L::uuid,%L,%L,%L::jsonb)',
    (select result->>'owner_actor_id' from created_record),'ORIGINAL_RECORD','impersonation','{}'),
  '42501','CZ403:CONTROLLED_PERSON_REQUIRED','caller cannot impersonate another PERSON'
);

select set_config('request.jwt.claim.sub','91300000-0000-4000-8000-000000000001',true);
select is((select count(*)::integer from public.preproject_records),1,'controlling Profile/PERSON can read');
select throws_ok(
  format('update public.preproject_records set content=%L where id=%L::uuid','changed',(select result->>'record_id' from created_record)),
  '42501',null,'authenticated direct update is denied'
);
select throws_ok(
  format('delete from public.preproject_records where id=%L::uuid',(select result->>'record_id' from created_record)),
  '42501',null,'authenticated direct delete is denied'
);

reset role;
select set_config('request.jwt.claim.sub','',true);
set local role anon;
select throws_ok(
  $$select public.record_preproject_human_text('00000000-0000-0000-0000-000000000000','ORIGINAL_RECORD','x','{}')$$,
  '42501',null,'unauthenticated caller cannot execute write RPC'
);
select throws_ok($$select * from public.preproject_records$$,'42501',null,'unauthenticated caller cannot read');

reset role;
select is((select projects from baseline_counts),(select count(*) from public.projects),'no Project created');
select is((select cells from baseline_counts),(select count(*) from public.cells),'no Cell created');
select is((select cycles from baseline_counts),(select count(*) from public.dragon_cycles),'no Cycle created');
select is((select commitments from baseline_counts),(select count(*) from public.commitments),'no Commitment created');
select is((select contributions from baseline_counts),(select count(*) from public.contributions),'no Contribution created');
select is((select count(*)::integer from public.preproject_records where record_class not in ('ORIGINAL_RECORD','SOURCE_MATERIAL')),0,'no interpretation or adoption class can be inferred');

select * from finish();
rollback;

begin;
create extension if not exists pgtap with schema extensions;
select no_plan();
insert into auth.users(id,aud,role,email,raw_app_meta_data,raw_user_meta_data,created_at,updated_at) values
('91400000-0000-4000-8000-000000000001','authenticated','authenticated','reviewer@example.test','{"provider":"email","providers":["email"]}','{"name":"Actual Reviewer"}',now(),now()),
('91400000-0000-4000-8000-000000000002','authenticated','authenticated','subject@example.test','{"provider":"email","providers":["email"]}','{"name":"Represented Subject"}',now(),now()),
('91400000-0000-4000-8000-000000000003','authenticated','authenticated','unrelated@example.test','{"provider":"email","providers":["email"]}','{"name":"Unrelated Human"}',now(),now());
insert into public.actors(id,kind,name,operator_profile_id,operator_label) values
('91400000-0000-4000-8000-0000000000aa','AI_AGENT','Claimed Contract AI','91400000-0000-4000-8000-000000000001','SYNTHETIC_TEST');
create temporary table subjects as select
 (select actor_id from public.actor_memberships where profile_id='91400000-0000-4000-8000-000000000001' and role='OWNER') reviewer,
 (select actor_id from public.actor_memberships where profile_id='91400000-0000-4000-8000-000000000002' and role='OWNER') subject;
grant select on subjects to authenticated;
insert into public.actor_memberships(actor_id,profile_id,role) select subject,'91400000-0000-4000-8000-000000000001','REPRESENTATIVE' from subjects;
create temporary table baseline as select (select count(*) from public.projects) projects,(select count(*) from public.cells) cells,(select count(*) from public.dragon_cycles) cycles,(select count(*) from public.commitments) commitments,(select count(*) from public.contributions) contributions;

set local role authenticated;
select set_config('request.jwt.claim.sub','91400000-0000-4000-8000-000000000002',true);
create temporary table human_input as select public.record_preproject_human_text((select subject from subjects),'ORIGINAL_RECORD','Exact represented Human statement','{"capture":"SYNTHETIC_CONTRACT_TEST"}') result;
create temporary table selection as select jsonb_build_array(jsonb_build_object('record_id',result->>'record_id','record_class','ORIGINAL_RECORD','content_sha256',result->>'content_sha256')) inputs from human_input;

select set_config('request.jwt.claim.sub','91400000-0000-4000-8000-000000000001',true);
select throws_ok(format('select public.authorize_preproject_interpretation(%L::uuid,%L::uuid,null,%L,%L::jsonb,%L::jsonb)',(select subject from subjects),(select subject from subjects),'demo',(select inputs::text from selection),'{}'),'42501','CZ403:CONTROLLED_HUMAN_AUTHORIZER_REQUIRED','representative cannot falsely attribute authorization to subject');
select throws_ok(format('select public.authorize_preproject_interpretation(%L::uuid,%L::uuid,null,%L,%L::jsonb,%L::jsonb)',(select subject from subjects),(select reviewer from subjects),'demo',(select jsonb_set(inputs,'{0,content_sha256}',to_jsonb(repeat('f',64)))::text from selection),'{}'),'22023','CZ422:PREPROJECT_INPUT_MISMATCH','authorized input digest substitution fails closed');
create temporary table synthetic_auth as select public.authorize_preproject_interpretation((select subject from subjects),(select reviewer from subjects),null,'Synthetic bounded candidate',(select inputs from selection),'{}') result;
create temporary table synthetic_candidate as select public.record_preproject_candidate_interpretation((select subject from subjects),(select reviewer from subjects),null,(select (result->>'authorization_id')::uuid from synthetic_auth),'Fixed deterministic output.','SYNTHETIC_TEST_OUTPUT',null,null,'{"provider_call":false}') result;
select is((select actual_producer_actor_id from public.preproject_candidate_interpretations),null,'synthetic output has no actual AI producer');
select is((select claimed_ai_actor_id from public.preproject_candidate_interpretations),null,'synthetic output has no claimed AI producer');
select is((select imported_by_actor_id from public.preproject_candidate_interpretations),(select reviewer from subjects),'synthetic recording is attributed to actual controlling Human');

create temporary table external_auth as select public.authorize_preproject_interpretation((select subject from subjects),(select reviewer from subjects),'91400000-0000-4000-8000-0000000000aa','Import one external candidate',(select inputs from selection),'{}') result;
select public.record_preproject_candidate_interpretation((select subject from subjects),(select reviewer from subjects),'91400000-0000-4000-8000-0000000000aa',(select (result->>'authorization_id')::uuid from external_auth),'Unattested pasted output.','EXTERNAL_AI_OUTPUT_UNATTESTED','claimed-provider','claimed-model','{"attestation":false}');
select is((select actual_producer_actor_id from public.preproject_candidate_interpretations where execution_class='EXTERNAL_AI_OUTPUT_UNATTESTED'),null,'unattested external output has no actual producer');
select is((select claimed_ai_actor_id from public.preproject_candidate_interpretations where execution_class='EXTERNAL_AI_OUTPUT_UNATTESTED'),'91400000-0000-4000-8000-0000000000aa'::uuid,'external AI remains claimed only');
select is((select imported_by_actor_id from public.preproject_candidate_interpretations where execution_class='EXTERNAL_AI_OUTPUT_UNATTESTED'),(select reviewer from subjects),'external import preserves importing Human');
select throws_ok(format('select public.record_preproject_candidate_interpretation(%L::uuid,%L::uuid,null,%L::uuid,%L,%L,null,null,%L::jsonb)',(select subject from subjects),(select reviewer from subjects),(select result->>'authorization_id' from synthetic_auth),'forged','CZ_EXECUTED_AI_OUTPUT','{}'),'42501','CZ403:CZ_EXECUTED_OUTPUT_REQUIRES_CONTROLLED_EXECUTOR','Human cannot forge CZ-executed output');

create temporary table review as select public.review_preproject_candidate_interpretation((select subject from subjects),(select reviewer from subjects),(select (result->>'candidate_id')::uuid from synthetic_candidate),'PARTLY_REPRESENTATIVE','Only partly.','Human-authored correction.') result;
select is((select subject_actor_id from public.preproject_interpretation_reviews),(select subject from subjects),'review preserves represented subject');
select is((select reviewer_actor_id from public.preproject_interpretation_reviews),(select reviewer from subjects),'review preserves actual reviewing Human Actor');
select isnt((select subject_actor_id from public.preproject_interpretation_reviews),(select reviewer_actor_id from public.preproject_interpretation_reviews),'representative review does not collapse subject and reviewer');
select is((select content from public.preproject_candidate_interpretations where execution_class='SYNTHETIC_TEST_OUTPUT'),'Fixed deterministic output.','Human correction does not mutate candidate');
select throws_ok('update public.preproject_interpretation_reviews set disposition=''ADOPT''','42501',null,'review history is append-only');
select throws_ok('delete from public.preproject_candidate_interpretations','42501',null,'candidate history is append-only');

select has_column('public','preproject_candidate_interpretations','execution_id','candidate reserves provider-neutral execution reference');

select set_config('request.jwt.claim.sub','91400000-0000-4000-8000-000000000002',true);
select is((select count(*)::int from public.preproject_candidate_interpretations),2,'represented subject owner can read candidates');
select set_config('request.jwt.claim.sub','91400000-0000-4000-8000-000000000003',true);
select is((select count(*)::int from public.preproject_candidate_interpretations),0,'unrelated Human cannot read candidates');
select is((select count(*)::int from public.preproject_interpretation_reviews),0,'unrelated Human cannot read reviews');
reset role; set local role anon;
select throws_ok('select * from public.preproject_candidate_interpretations','42501',null,'anon cannot read private candidates');
reset role;
select is((select count(*) from public.projects),(select projects from baseline),'no Project side effect');
select is((select count(*) from public.cells),(select cells from baseline),'no Cell side effect');
select is((select count(*) from public.dragon_cycles),(select cycles from baseline),'no Cycle side effect');
select is((select count(*) from public.commitments),(select commitments from baseline),'no Commitment side effect');
select is((select count(*) from public.contributions),(select contributions from baseline),'no Contribution side effect');
select * from finish();
rollback;

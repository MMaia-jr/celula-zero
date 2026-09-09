begin;
create extension if not exists pgtap with schema extensions;
select no_plan();
select has_table('public','economic_instructions','EconomicInstruction is distinct');
select has_table('public','settlement_attempts','SettlementAttempt is distinct');
select has_table('public','settlement_receipts','SettlementReceipt is distinct');
select has_table('public','settlement_reconciliations','Reconciliation is distinct');
select has_column('public','economic_instructions','agreement_id','instruction may reference but does not replace Agreement');
select has_column('public','economic_instructions','authorizing_domain_decision_id','claim-dependent instruction binds contextual Decision');
select hasnt_column('public','economic_instructions','evaluation_verdict','USEFUL evaluation is not economic authorization');
select hasnt_column('public','settlement_attempts','provider_credentials','provider credentials are absent');
select has_trigger('public','economic_instructions','economic_instructions_append_only','instructions are append-only');
select has_trigger('public','settlement_receipts','settlement_receipts_append_only','receipts are append-only');
select has_trigger('public','settlement_reconciliations','settlement_reconciliations_append_only','reconciliation is append-only');
select has_function('public','k002_create_economic_instruction',array['uuid','uuid','uuid','uuid','uuid','uuid','uuid','numeric','text','text','text','uuid','text'],'economic instruction command exists');

insert into auth.users(id,aud,role,email,raw_app_meta_data,raw_user_meta_data,created_at,updated_at)
values('93000000-0000-4000-8000-000000000002','authenticated','authenticated','k2-ai-operator@test','{}','{"name":"K2 AI Operator"}',now(),now());
insert into public.actors(id,kind,name,operator_profile_id,operator_label) values
 ('93000000-0000-4000-8000-000000000001','AI_AGENT','K2 economic AI','93000000-0000-4000-8000-000000000002','test')
on conflict(id) do nothing;
select throws_ok($$select private.k002_require_person_authorizer('93000000-0000-4000-8000-000000000001')$$,'CZ403:HUMAN_ECONOMIC_AUTHORIZER_REQUIRED','AI cannot be final economic authorizer');
select * from finish();
rollback;

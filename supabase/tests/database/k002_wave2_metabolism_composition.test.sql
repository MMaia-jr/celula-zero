begin;
create extension if not exists pgtap with schema extensions;
select no_plan();

select has_table('public','k002_metabolism_episodes','thin episode composition seam exists');
select hasnt_column('public','k002_metabolism_episodes','state','composition seam is not a second state machine');
select hasnt_column('public','k002_metabolism_episodes','payload','canonical payloads are not copied');
select has_trigger('public','k002_metabolism_episodes','k002_metabolism_episodes_append_only','composition linkage is append-only');
select has_function('public','k002_compose_metabolism_episode',array['uuid','uuid','uuid','uuid','uuid','uuid','uuid','text'],'composition command exists');
select has_function('public','k002_authorize_episode_economic_instruction',array['uuid','uuid','uuid','uuid','uuid','numeric','text','text','text','uuid','text'],'guarded episode authorization exists');
select has_function('public','k002_get_metabolism_episode',array['uuid'],'fresh operator readback exists');

insert into auth.users(id,aud,role,email,raw_app_meta_data,raw_user_meta_data,created_at,updated_at)
values
 ('94000000-0000-4000-8000-000000000001','authenticated','authenticated','wave2-human@test','{}','{"name":"Wave2 Human"}',now(),now()),
 ('94000000-0000-4000-8000-000000000002','authenticated','authenticated','wave2-ai-operator@test','{}','{"name":"Wave2 AI Operator"}',now(),now());
insert into public.actors(id,kind,name,operator_profile_id,operator_label) values
 ('94000000-0000-4000-8000-0000000000a1','AI_AGENT','Wave2 AI','94000000-0000-4000-8000-000000000002','deterministic test');
insert into public.actor_memberships(actor_id,profile_id,role) values
 ('94000000-0000-4000-8000-0000000000a1','94000000-0000-4000-8000-000000000002','OPERATOR');

select set_config('request.jwt.claim.sub','94000000-0000-4000-8000-000000000001',true);
create temporary table w2(key text primary key,value uuid,result jsonb);
insert into w2(key,value) select 'human',actor_id from public.actor_memberships
 where profile_id='94000000-0000-4000-8000-000000000001' and role='OWNER';
insert into w2(key,value) select 'proposer',actor_id from public.actor_memberships
 where profile_id='94000000-0000-4000-8000-000000000002' and role='OWNER';
insert into w2(key,value) values('ai','94000000-0000-4000-8000-0000000000a1');
insert into w2(key,result) select 'project',to_jsonb(x) from public.create_project_atomic(
 'K002 Wave2 metabolism','k002-wave2-metabolism','Deterministic local composition rehearsal only.',
 'Compose canonical records without authority transfer.','Evaluation remains distinct from verification and decisions.',
 'One reconstructible bounded episode.','No external, model, payment, network or chain call.',
 array['k002','wave2'],'VOLUNTARY','OPEN',false) x;
update w2 set value=(result->>'project_id')::uuid where key='project';
insert into w2(key,value) select 'cell',cell_id from public.projects
 where id=(select value from w2 where key='project');

insert into w2(key,result) select 'cycle',public.company_core_create_cycle(
 (select value from w2 where key='human'),(select value from w2 where key='project'),
 'Bounded metabolism need','Prove that canonical stages compose without becoming a parallel truth system.',
 'A deterministic reconstructible episode with fail-closed economic authorization.','Local fixture only.','HIGH',
 'No external calls.','Synthetic test data.',gen_random_uuid(),'w2-cycle');
update w2 set value=(result->>'cycle_id')::uuid where key='cycle';
update w2 set value=(select project_id from public.company_core_cycles
 where id=(select value from w2 where key='cycle')) where key='project';
update w2 set value=(select cell_id from public.company_core_cycles
 where id=(select value from w2 where key='cycle')) where key='cell';
update public.company_core_cycles set agreement_expected_result='A bounded useful result',agreement_scope='Local only',
 agreement_evaluation_criterion='Useful for the bounded need',result_content='Deterministic result record',
 result_recorded_by_actor_id=(select value from w2 where key='human'),result_recorded_at=now(),
 evaluation_verdict='USEFUL',evaluation_rationale='Useful does not authorize economics.',
 evaluation_recorded_by_actor_id=(select value from w2 where key='human'),evaluation_recorded_at=now(),
 state='EVALUATION_RECORDED' where id=(select value from w2 where key='cycle');

insert into public.opportunities(id,cell_id,project_id,owner_actor_id,state,visibility,current_version,material_version,capacity)
select '94100000-0000-4000-8000-000000000001',(select value from w2 where key='cell'),value,
 (select value from w2 where key='human'),'OPEN','PROJECT',1,1,1 from w2 where key='project';
insert into public.opportunity_versions(opportunity_id,version,title,statement,conditions,expected_result,capacity,state,visibility,created_by_actor_id)
values('94100000-0000-4000-8000-000000000001',1,'Bounded prospective work','Perform bounded deterministic work.','Prospective terms apply before work.','One observable result.',1,'OPEN','PROJECT',(select value from w2 where key='human'));
insert into public.proposals(id,cell_id,opportunity_id,proposer_actor_id,state,visibility,current_version,material_version)
values
 ('94100000-0000-4000-8000-000000000101',(select value from w2 where key='cell'),'94100000-0000-4000-8000-000000000001',(select value from w2 where key='proposer'),'ACCEPTED','PROJECT',1,1),
 ('94100000-0000-4000-8000-000000000102',(select value from w2 where key='cell'),'94100000-0000-4000-8000-000000000001',(select value from w2 where key='proposer'),'ACCEPTED','PROJECT',1,1);
insert into public.proposal_versions(proposal_id,version,statement,conditions,expected_delivery,reward_expectation,created_by_actor_id)
values
 ('94100000-0000-4000-8000-000000000101',1,'Perform the bounded work.','Prospective acceptance basis is Human authorization.','A deterministic artifact.','Synthetic units only.',(select value from w2 where key='proposer')),
 ('94100000-0000-4000-8000-000000000102',1,'Unrelated bounded work.','Different prospective agreement.','Another artifact.','Synthetic units only.',(select value from w2 where key='proposer'));
insert into public.commitments(id,cell_id,project_id,opportunity_id,opportunity_version,proposal_id,proposal_version,proposer_actor_id,accepted_by_actor_id)
select '94100000-0000-4000-8000-000000000201',(select value from w2 where key='cell'),value,'94100000-0000-4000-8000-000000000001',1,'94100000-0000-4000-8000-000000000101',1,
 (select value from w2 where key='proposer'),(select value from w2 where key='human') from w2 where key='project';
insert into public.commitments(id,cell_id,project_id,opportunity_id,opportunity_version,proposal_id,proposal_version,proposer_actor_id,accepted_by_actor_id)
select '94100000-0000-4000-8000-000000000202',(select value from w2 where key='cell'),value,'94100000-0000-4000-8000-000000000001',1,'94100000-0000-4000-8000-000000000102',1,
 (select value from w2 where key='proposer'),(select value from w2 where key='human') from w2 where key='project';
insert into public.contributions(id,cell_id,project_id,commitment_id,author_actor_id,description,limitations)
select '94100000-0000-4000-8000-000000000301',(select value from w2 where key='cell'),value,'94100000-0000-4000-8000-000000000201',
 (select value from w2 where key='human'),'Bounded deterministic contribution for Wave2.','No external validity claimed.' from w2 where key='project';
insert into public.artifacts(id,cell_id,project_id,contribution_id,created_by_actor_id,kind,uri,digest,media_type,retention_class)
select '94100000-0000-4000-8000-000000000401',(select value from w2 where key='cell'),value,'94100000-0000-4000-8000-000000000301',
 (select value from w2 where key='human'),'DOCUMENT','urn:k002:wave2:artifact',repeat('a',64),'text/plain','PROJECT_LIFETIME' from w2 where key='project';
insert into public.claims(id,cell_id,project_id,subject_type,subject_id,author_actor_id,statement,scope_description)
select '94100000-0000-4000-8000-000000000501',(select value from w2 where key='cell'),value,'ARTIFACT','94100000-0000-4000-8000-000000000401',
 (select value from w2 where key='human'),'The deterministic artifact exists in this local database.','Only this local fixture.' from w2 where key='project';
insert into public.evidence_items(id,cell_id,project_id,source_artifact_id,custodian_actor_id,description,limitations,digest_algorithm,digest,retention_class)
select '94100000-0000-4000-8000-000000000601',(select value from w2 where key='cell'),value,'94100000-0000-4000-8000-000000000401',
 (select value from w2 where key='human'),'Artifact used explicitly as evidence for the bounded claim.','Does not establish truth.','SHA256',repeat('a',64),'PROJECT_LIFETIME' from w2 where key='project';
insert into public.evidence_links(evidence_item_id,claim_id,relation,declared_by_actor_id)
values('94100000-0000-4000-8000-000000000601','94100000-0000-4000-8000-000000000501','SUPPORTS',(select value from w2 where key='human'));
insert into public.verification_requests(id,cell_id,project_id,claim_id,requester_actor_id,reviewer_actor_id,criteria,expected_method,conflict_codes,independence,visibility,sensitivity,state,completed_at)
select '94100000-0000-4000-8000-000000000701',(select value from w2 where key='cell'),value,'94100000-0000-4000-8000-000000000501',
 (select value from w2 where key='human'),(select value from w2 where key='human'),'Check the bounded local fixture only.','LOCAL_SQL',array['REVIEWER_IS_REQUESTER'],'NON_INDEPENDENT','PROJECT','NORMAL','COMPLETED',now() from w2 where key='project';
insert into public.verifications(id,request_id,cell_id,project_id,claim_id,verifier_actor_id,method,findings,classification,limitations,conflict_codes,independence,visibility,sensitivity)
select '94100000-0000-4000-8000-000000000702','94100000-0000-4000-8000-000000000701',(select value from w2 where key='cell'),value,'94100000-0000-4000-8000-000000000501',
 (select value from w2 where key='human'),'LOCAL_SQL','The bounded local fixture is present.','PASS','Non-independent deterministic rehearsal.',array['REVIEWER_IS_REQUESTER'],'NON_INDEPENDENT','PROJECT','NORMAL' from w2 where key='project';
insert into public.verification_evidence_items values('94100000-0000-4000-8000-000000000702','94100000-0000-4000-8000-000000000601',now());

insert into public.domain_decisions(id,cell_id,project_id,claim_id,deciding_actor_id,authority_basis,disposition,reason,limitations,visibility,sensitivity,created_at)
select x.id,(select value from w2 where key='cell'),p.value,'94100000-0000-4000-8000-000000000501',(select value from w2 where key='human'),
 'PROJECT_STEWARDSHIP',x.disposition,x.reason,'Contextual decision only.','PROJECT','NORMAL',x.created_at
from w2 p cross join (values
 ('94100000-0000-4000-8000-000000000801'::uuid,'ACCEPT_FOR_CONTEXT','Human accepts only for this bounded context.',now()-interval '3 minutes'),
 ('94100000-0000-4000-8000-000000000802'::uuid,'REJECT_FOR_CONTEXT','Human rejects the claim for this bounded context.',now()-interval '2 minutes'),
 ('94100000-0000-4000-8000-000000000803'::uuid,'DEFER','Human defers the claim pending more context.',now()-interval '1 minute')) x(id,disposition,reason,created_at)
where p.key='project';
insert into public.domain_decision_verifications(decision_id,verification_id)
select id,'94100000-0000-4000-8000-000000000702' from public.domain_decisions where id in
 ('94100000-0000-4000-8000-000000000801','94100000-0000-4000-8000-000000000802','94100000-0000-4000-8000-000000000803');

insert into w2(key,result) select 'episode',public.k002_compose_metabolism_episode((select value from w2 where key='human'),
 (select value from w2 where key='cycle'),'94100000-0000-4000-8000-000000000201','94100000-0000-4000-8000-000000000301',
 '94100000-0000-4000-8000-000000000401','94100000-0000-4000-8000-000000000501','94200000-0000-4000-8000-000000000001','w2-compose');
update w2 set value=(result->>'episode_id')::uuid where key='episode';

-- A01/A02: USEFUL Evaluation cannot override REJECT or DEFER.
select throws_ok(format('select public.k002_authorize_episode_economic_instruction(%L,%L,%L,%L,%L,1,%L,%L,%L,%L,%L)',
 (select value from w2 where key='human'),(select value from w2 where key='episode'),'94100000-0000-4000-8000-000000000501','94100000-0000-4000-8000-000000000802',
 (select value from w2 where key='human'),'TEST','UNIT','Rejected must block','94200000-0000-4000-8000-000000000002','w2-reject'),
 'CZ403:CLAIM_NOT_ACCEPTED_FOR_CONTEXT','A01 USEFUL plus REJECT is blocked');
select throws_ok(format('select public.k002_authorize_episode_economic_instruction(%L,%L,%L,%L,%L,1,%L,%L,%L,%L,%L)',
 (select value from w2 where key='human'),(select value from w2 where key='episode'),'94100000-0000-4000-8000-000000000501','94100000-0000-4000-8000-000000000803',
 (select value from w2 where key='human'),'TEST','UNIT','Deferred must block','94200000-0000-4000-8000-000000000003','w2-defer'),
 'CZ403:CLAIM_NOT_ACCEPTED_FOR_CONTEXT','A02 DEFER is blocked');

-- A03: canonical Decision command refuses ACCEPT without Verification.
select throws_ok(format('select public.t2d_issue_domain_decision(%L,%L,%L::uuid[],%L,%L,%L,%L,%L)',
 (select value from w2 where key='human'),'94100000-0000-4000-8000-000000000501','{}','ACCEPT_FOR_CONTEXT',
 'Acceptance without verification must fail.','No verification.','94200000-0000-4000-8000-000000000004','w2-no-verification'),
 'CZ409:DECISION_VERIFICATION_REQUIRED','A03 ACCEPT without relevant Verification is blocked');

-- Make ACCEPT latest for the valid path, then prove AI cannot authorize it.
insert into public.domain_decisions(id,cell_id,project_id,claim_id,deciding_actor_id,authority_basis,disposition,reason,limitations,visibility,sensitivity,created_at)
select '94100000-0000-4000-8000-000000000804',(select value from w2 where key='cell'),value,'94100000-0000-4000-8000-000000000501',
 (select value from w2 where key='human'),'PROJECT_STEWARDSHIP','ACCEPT_FOR_CONTEXT','Human accepts after reviewing the verification.','Bounded context only.','PROJECT','NORMAL',now() from w2 where key='project';
insert into public.domain_decision_verifications values('94100000-0000-4000-8000-000000000804','94100000-0000-4000-8000-000000000702',now());
insert into public.role_assignments(cell_id,actor_id,role_id,scope_type,scope_id,policy_version_id,granted_by_actor_id)
select (select value from w2 where key='cell'),(select value from w2 where key='ai'),
 (select id from public.role_definitions where cell_id=(select value from w2 where key='cell') and code='PROJECT_STEWARD'),
 'PROJECT',value,(select current_policy_version_id from public.cells where id=(select value from w2 where key='cell')),
 (select value from w2 where key='human') from w2 where key='project';
select set_config('request.jwt.claim.sub','94000000-0000-4000-8000-000000000002',true);
select throws_ok(format('select public.k002_authorize_episode_economic_instruction(%L,%L,%L,%L,%L,1,%L,%L,%L,%L,%L)',
 (select value from w2 where key='ai'),(select value from w2 where key='episode'),'94100000-0000-4000-8000-000000000501','94100000-0000-4000-8000-000000000804',
 (select value from w2 where key='human'),'TEST','UNIT','AI must not authorize','94200000-0000-4000-8000-000000000005','w2-ai'),
 'CZ403:HUMAN_ECONOMIC_AUTHORIZER_REQUIRED','A04 AI cannot be final economic authorizer');
select set_config('request.jwt.claim.sub','94000000-0000-4000-8000-000000000001',true);

select throws_ok(format('select public.k002_compose_metabolism_episode(%L,%L,%L,%L,null,null,%L,%L)',
 (select value from w2 where key='human'),(select value from w2 where key='cycle'),'94100000-0000-4000-8000-000000000202','94100000-0000-4000-8000-000000000301','94200000-0000-4000-8000-000000000006','w2-wrong-agreement'),
 'CZ409:EPISODE_CONTRIBUTION_CONTEXT_MISMATCH','A05 claim/work/agreement context mismatch is blocked');
select throws_ok(format('select public.k002_compose_metabolism_episode(%L,%L,null,null,null,null,%L,%L)',
 (select value from w2 where key='human'),(select value from w2 where key='cycle'),'94200000-0000-4000-8000-000000000007','w2-no-agreement'),
 'CZ409:EPISODE_AGREEMENT_CONTEXT_MISMATCH','A06 no episode-level consequence without prospective Agreement basis');

-- Valid claim-independent consequence still uses the episode's prospective Agreement.
insert into w2(key,result) select 'instruction',public.k002_authorize_episode_economic_instruction(
 (select value from w2 where key='human'),(select value from w2 where key='episode'),null,null,(select value from w2 where key='human'),
 5,'TEST','UNIT','Prospective claim-independent deterministic stipend.',
 '94200000-0000-4000-8000-000000000008','w2-instruction');
update w2 set value=(result->>'economic_instruction_id')::uuid where key='instruction';
select is((select result->>'external_call' from w2 where key='instruction'),'false','A12 authorization performs no external call');

-- A08 replay returns the same one logical record.
insert into w2(key,result) select 'instruction_replay',public.k002_authorize_episode_economic_instruction(
 (select value from w2 where key='human'),(select value from w2 where key='episode'),null,null,(select value from w2 where key='human'),
 5,'TEST','UNIT','Prospective claim-independent deterministic stipend.',
 '94200000-0000-4000-8000-000000000008','w2-instruction');
select is((select result->>'economic_instruction_id' from w2 where key='instruction_replay'),
 (select value::text from w2 where key='instruction'),'A08 replay preserves one logical instruction');
select is((select count(*) from public.economic_instructions where id=(select value from w2 where key='instruction')),1::bigint,'A08 exactly one canonical record exists');

-- A09: five deterministic failure/network-state fixtures; these are records, not rail validation.
insert into public.settlement_attempts(cell_id,economic_instruction_id,recorded_by_actor_id,provider_namespace,provider_attempt_reference,state,attempted_at,failure_code,limitations)
select (select value from w2 where key='cell'),(select value from w2 where key='instruction'),(select value from w2 where key='human'),
 'SIMULATED_ONLY',x.ref,x.state,now(),x.failure,'Deterministic fixture only; no real rail, provider, network, model or chain was called or validated.'
from (values ('prepared-timeout','PREPARED',null),('submitted-interrupt','SUBMITTED',null),('failed-provider','FAILED','PROVIDER_ERROR'),
 ('failed-network','FAILED','NETWORK_UNAVAILABLE'),('unknown-response','UNKNOWN',null)) x(ref,state,failure);
select is((select count(*) from public.settlement_attempts where provider_namespace='SIMULATED_ONLY'),5::bigint,'A09 five distinct deterministic failure fixtures recorded');
select is((select count(distinct provider_attempt_reference) from public.settlement_attempts where provider_namespace='SIMULATED_ONLY'),5::bigint,'A09 failure fixtures remain distinct');

insert into public.settlement_receipts(id,cell_id,settlement_attempt_id,recorded_by_actor_id,provider_receipt_reference,classification,amount,asset_namespace,asset_reference,limitations)
select '94300000-0000-4000-8000-000000000001',(select value from w2 where key='cell'),id,(select value from w2 where key='human'),
 'mismatched-receipt','CONFIRMED',7,'TEST','WRONG_UNIT','Original simulated receipt; amount and asset mismatch instruction.'
from public.settlement_attempts where provider_namespace='SIMULATED_ONLY' and provider_attempt_reference='submitted-interrupt';
insert into public.settlement_reconciliations(cell_id,economic_instruction_id,settlement_receipt_id,reconciled_by_actor_id,disposition,reason)
values((select value from w2 where key='cell'),(select value from w2 where key='instruction'),'94300000-0000-4000-8000-000000000001',
 (select value from w2 where key='human'),'MISMATCH','Amount and asset do not match the original instruction; unresolved.');
select is((select amount from public.settlement_receipts where id='94300000-0000-4000-8000-000000000001'),7::numeric,'A07 original receipt remains unchanged');
select is((select disposition from public.settlement_reconciliations where settlement_receipt_id='94300000-0000-4000-8000-000000000001'),'MISMATCH','A07 mismatch is explicit and never auto-truth');

select is((public.k002_get_metabolism_episode((select value from w2 where key='episode'))#>>'{stages,agreement,object_id}'),'94100000-0000-4000-8000-000000000201','A11 readback exposes canonical Agreement id');
select is((public.k002_get_metabolism_episode((select value from w2 where key='episode'))#>>'{stages,verification,status}'),'COMPLETED','A11 readback reconstructs Verification stage');
select is((public.k002_get_metabolism_episode((select value from w2 where key='episode'))#>>'{stages,reconciliation,status}'),'UNRESOLVED','A07/A11 mismatch remains unresolved in fresh readback');
select is((public.k002_get_metabolism_episode((select value from w2 where key='episode'))->>'external_rails_validated'),'false','A09/A12 readback explicitly denies real rail validation');

-- A10: abandoned composition is explicit; missing linkage never means success.
insert into w2(key,result) select 'cycle2',public.company_core_create_cycle((select value from w2 where key='human'),(select value from w2 where key='project'),
 'Abandoned bounded need','This episode intentionally stops before work and evidence are linked.','Expose every missing stage explicitly.',
 'Deterministic abandonment fixture.','LOW','No external calls.','Synthetic.',gen_random_uuid(),'w2-cycle-abandoned');
update w2 set value=(result->>'cycle_id')::uuid where key='cycle2';
insert into w2(key,result) select 'episode2',public.k002_compose_metabolism_episode((select value from w2 where key='human'),
 (select value from w2 where key='cycle2'),'94100000-0000-4000-8000-000000000202',null,null,null,
 '94200000-0000-4000-8000-000000000009','w2-compose-abandoned');
update w2 set value=(result->>'episode_id')::uuid where key='episode2';
select is((public.k002_get_metabolism_episode((select value from w2 where key='episode2'))#>>'{stages,contribution,status}'),'MISSING','A10 missing work is explicit, not success');
select is((public.k002_get_metabolism_episode((select value from w2 where key='episode2'))#>>'{stages,reconciliation,status}'),'MISSING','A10 absent reconciliation is explicit, not settlement');
select throws_ok(format('select public.k002_authorize_episode_economic_instruction(%L,%L,%L,%L,%L,1,%L,%L,%L,%L,%L)',
 (select value from w2 where key='human'),(select value from w2 where key='episode2'),'94100000-0000-4000-8000-000000000501','94100000-0000-4000-8000-000000000804',
 (select value from w2 where key='human'),'TEST','UNIT','Missing claim link must block','94200000-0000-4000-8000-000000000010','w2-abandoned-block'),
 'CZ409:EPISODE_CLAIM_CONTEXT_MISMATCH','A10 unresolved episode fails closed');

select is((select count(*) from public.settlement_attempts where provider_namespace<>'SIMULATED_ONLY'),0::bigint,'A12 deterministic suite records no external provider call');
select * from finish();
rollback;

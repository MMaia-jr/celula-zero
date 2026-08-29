begin;
create extension if not exists pgtap with schema extensions;
select no_plan();

select has_table('public','ai_runs','ANC-001 has attributable AI Run material');
select has_function('public','anc001_prepare_ai_run',array['uuid','uuid','uuid','uuid','text','text','text','jsonb','text','text','uuid','text'],'prepare command exists');
select has_function('public','anc001_complete_ai_run',array['uuid','uuid','text','text','text','bigint','bigint','bigint','bigint','numeric','text','uuid','text'],'completion command exists');
select hasnt_table('public','ai_run_claims', 'AI Run does not introduce inferred Claim material');

create temporary table anc_context_vector(manifest jsonb, canonical text, expected_digest text);
insert into anc_context_vector values (
  '{"manifest_version":"cz.ai-context-vector.v1","nested":{"z":"é","a":1},"values":[true,null,3]}'::jsonb,
  '{"manifest_version":"cz.ai-context-vector.v1","nested":{"a":1,"z":"é"},"values":[true,null,3]}',
  '630f9802cdc6cd8b13f5962cbc4d8fea1c0ed1034fdf5174721211e6accc2993'
);
select is(
  private.anc001_context_digest((select canonical from anc_context_vector)),
  (select expected_digest from anc_context_vector),
  'versioned cross-runtime vector hashes exact canonical UTF-8 text'
);
select is(
  (select canonical::jsonb from anc_context_vector),
  (select manifest from anc_context_vector),
  'versioned cross-runtime canonical text parses to the semantic manifest'
);

insert into auth.users(id,aud,role,email,raw_app_meta_data,raw_user_meta_data,created_at,updated_at) values
('ab010000-0000-4000-8000-000000000001','authenticated','authenticated','anc001-steward@example.test','{"provider":"email","providers":["email"]}','{"name":"ANC Steward"}',now(),now()),
('ab010000-0000-4000-8000-000000000002','authenticated','authenticated','anc001-outsider@example.test','{"provider":"email","providers":["email"]}','{"name":"ANC Outsider"}',now(),now());
insert into public.pilot_memberships(profile_id,status,source) values
('ab010000-0000-4000-8000-000000000001','ACTIVE','SEED'),
('ab010000-0000-4000-8000-000000000002','ACTIVE','SEED')
on conflict(profile_id) do update set status='ACTIVE';

create temporary table anc(key text primary key,value uuid,result jsonb,count_value bigint);
insert into anc(key,value) select 'steward',actor_id from public.actor_memberships where profile_id='ab010000-0000-4000-8000-000000000001' and role='OWNER';
insert into anc(key,value) select 'outsider',actor_id from public.actor_memberships where profile_id='ab010000-0000-4000-8000-000000000002' and role='OWNER';
select set_config('request.jwt.claim.sub','ab010000-0000-4000-8000-000000000001',true);

insert into anc(key,result) select 'project',to_jsonb(x) from public.create_project_atomic(
  'Projeto ANC 001','projeto-anc-001','Projeto determinístico para validar uma execução de IA atribuível dentro de um único DragonCycle.',
  'Autorizar contexto limitado sem transformar saída de IA em autoridade humana ou verdade verificada.',
  'Preservar entrada, saída, proveniência e observações econômicas sem fabricar valores.',
  'Um AI Run reconstruível e no máximo um CycleRecord de interpretação ou síntese.',
  'Sem rede, modelo externo, deploy, autoridade autônoma, evidência, verificação ou decisão inferida.',
  array['ai-run','attribution'],'VOLUNTARY','OPEN',true) x;
update anc set value=(result->>'project_id')::uuid where key='project';

insert into anc(key,result) select 'cycle',public.ddr_open_cycle(
  (select value from anc where key='steward'),(select value from anc where key='project'),null,null,
  'ab020000-0000-4000-8000-000000000001','anc-cycle-open');
update anc set value=(result->>'dragon_cycle_id')::uuid where key='cycle';

insert into anc(key,result) select 'agent',public.t3_register_bounded_agent(
  (select value from anc where key='steward'),(select value from anc where key='project'),
  'ANC Attributable Agent','ANC deterministic MOCK operator','ab020000-0000-4000-8000-000000000002','anc-agent-register');
update anc set value=(result->>'agent_actor_id')::uuid where key='agent';

select public.ddr_add_cycle_ai_participant(
  (select value from anc where key='steward'),(select value from anc where key='cycle'),(select value from anc where key='agent'),
  'ROOM','RESEARCHER',null,'ASSIST','Produce only attributed interpretations or syntheses from the explicit bounded manifest.',
  'ab020000-0000-4000-8000-000000000003','anc-agent-participate');

insert into anc(key,result) select 'source',public.ddr_record_cycle_record(
  (select value from anc where key='steward'),(select value from anc where key='cycle'),'ORIGINAL_RECORD','Human supplied bounded source record.',
  '{"source":"human"}'::jsonb,'ab020000-0000-4000-8000-000000000004','anc-source');
update anc set value=(result->>'cycle_record_id')::uuid where key='source';

create temporary table anc_manifest as select jsonb_build_object(
  'manifest_version','cz.ai-context.v1','project_id',(select value from anc where key='project'),
  'cycle_id',(select value from anc where key='cycle'),'agent_actor_id',(select value from anc where key='agent'),
  'purpose','Bounded synthesis','task','Synthesize the selected record only.',
  'cycle_records',jsonb_build_array(jsonb_build_object('id',(select value from anc where key='source'),
    'content_class','ORIGINAL_RECORD','content_digest',encode(extensions.digest(convert_to('Human supplied bounded source record.','UTF8'),'sha256'),'hex'))),
  'repository_files','[]'::jsonb,'authority','Assist only; no human authority is delegated.',
  'prohibited_inferences',jsonb_build_array('Decision','Verification','Evidence','Human Direction')) manifest;
alter table anc_manifest add column canonical text;
update anc_manifest set canonical = format(
  '{"agent_actor_id":"%s","authority":"Assist only; no human authority is delegated.","cycle_id":"%s","cycle_records":[{"content_class":"ORIGINAL_RECORD","content_digest":"%s","id":"%s"}],"manifest_version":"cz.ai-context.v1","prohibited_inferences":["Decision","Verification","Evidence","Human Direction"],"project_id":"%s","purpose":"Bounded synthesis","repository_files":[],"task":"Synthesize the selected record only."}',
  (select value from anc where key='agent'), (select value from anc where key='cycle'),
  encode(extensions.digest(convert_to('Human supplied bounded source record.','UTF8'),'sha256'),'hex'),
  (select value from anc where key='source'), (select value from anc where key='project')
);

insert into anc(key,count_value) select 'roles_before',count(*) from public.role_assignments;
insert into anc(key,count_value) select 'delegations_before',count(*) from public.delegations;
insert into anc(key,count_value) select 'claims_before',count(*) from public.claims;
insert into anc(key,count_value) select 'evidence_before',count(*) from public.evidence_items;
insert into anc(key,count_value) select 'verifications_before',count(*) from public.verifications;
insert into anc(key,count_value) select 'decisions_before',count(*) from public.domain_decisions;

insert into anc(key,result) select 'run',public.anc001_prepare_ai_run(
  (select value from anc where key='steward'),(select value from anc where key='project'),(select value from anc where key='cycle'),
  (select value from anc where key='agent'),'Bounded synthesis','MOCK','mock-deterministic-v1',(select manifest from anc_manifest),
  (select canonical from anc_manifest),repeat('b',64),'ab020000-0000-4000-8000-000000000005','anc-run-prepare');
update anc set value=(result->>'ai_run_id')::uuid where key='run';

select is((select state from public.ai_runs where id=(select value from anc where key='run')),'PREPARED','run is explicitly PREPARED');
select is((select requested_by_actor_id from public.ai_runs where id=(select value from anc where key='run')),(select value from anc where key='steward'),'requester is the exact human steward');
select is((select kind from public.actors where id=(select agent_actor_id from public.ai_runs where id=(select value from anc where key='run'))),'AI_AGENT','target is an existing AI_AGENT');
select is((select context_manifest_canonical from public.ai_runs where id=(select value from anc where key='run')),(select canonical from anc_manifest),'exact canonical context text is stored');
select is(private.anc001_context_digest((select canonical from anc_manifest)),(select context_digest from public.ai_runs where id=(select value from anc where key='run')),'context digest uses exact canonical UTF-8 bytes');

select set_config('request.jwt.claim.sub','ab010000-0000-4000-8000-000000000002',true);
select throws_ok(format($q$select public.anc001_prepare_ai_run('%s','%s','%s','%s','Bounded synthesis','MOCK','model',%L::jsonb,%L,'%s','ab020000-0000-4000-8000-000000000006','outsider')$q$,
  (select value from anc where key='outsider'),(select value from anc where key='project'),(select value from anc where key='cycle'),
  (select value from anc where key='agent'),(select manifest::text from anc_manifest),(select canonical from anc_manifest),repeat('c',64)),
  '42501',null,'human without project/cycle authority cannot prepare a run');
select set_config('request.jwt.claim.sub','ab010000-0000-4000-8000-000000000001',true);

select throws_ok(format($q$select public.anc001_prepare_ai_run('%s','%s','%s','%s','Bounded synthesis','MOCK','model',%L::jsonb,%L,'%s','ab020000-0000-4000-8000-000000000012','mismatched-canonical')$q$,
  (select value from anc where key='steward'),(select value from anc where key='project'),(select value from anc where key='cycle'),
  (select value from anc where key='agent'),(select manifest::text from anc_manifest),
  replace((select canonical from anc_manifest),'Bounded synthesis','Altered synthesis'),repeat('c',64)),
  '22023','CZ422:CANONICAL_CONTEXT_MISMATCH','prepare rejects canonical text whose JSON differs from semantic manifest');
select throws_ok(format($q$select public.anc001_prepare_ai_run('%s','%s','%s','%s','Bounded synthesis','MOCK','model',%L::jsonb,%L,'%s','ab020000-0000-4000-8000-000000000013','false-canonical')$q$,
  (select value from anc where key='steward'),(select value from anc where key='project'),(select value from anc where key='cycle'),
  (select value from anc where key='agent'),(select manifest::text from anc_manifest),'{false canonical JSON',repeat('c',64)),
  '22023','CZ422:INVALID_CANONICAL_CONTEXT_MANIFEST','prepare rejects false canonical representation');

select public.anc001_start_ai_run((select value from anc where key='steward'),(select value from anc where key='run'),
  'ab020000-0000-4000-8000-000000000007','anc-run-start');
insert into anc(key,count_value) select 'material_version_before',material_version from public.dragon_cycles where id=(select value from anc where key='cycle');
insert into anc(key,result) select 'complete',public.anc001_complete_ai_run(
  (select value from anc where key='steward'),(select value from anc where key='run'),'SYNTHESIS','Deterministic attributed synthesis.',
  encode(extensions.digest(convert_to('Deterministic attributed synthesis.','UTF8'),'sha256'),'hex'),
  octet_length(convert_to('Deterministic attributed synthesis.','UTF8')),null,null,null,null,'UNKNOWN',
  'ab020000-0000-4000-8000-000000000008','anc-run-complete');

select is((select state from public.ai_runs where id=(select value from anc where key='run')),'COMPLETED','run completes explicitly');
select is((select cost_source from public.ai_runs where id=(select value from anc where key='run')),'UNKNOWN','unknown cost remains explicit');
select is((select cost_usd from public.ai_runs where id=(select value from anc where key='run')),null::numeric,'unknown cost remains null');
select is((select author_actor_id from public.cycle_records where id=(select cycle_record_id from public.ai_runs where id=(select value from anc where key='run'))),(select value from anc where key='agent'),'materialized record is authored by exact AI actor');
select is((select content_class from public.cycle_records where id=(select cycle_record_id from public.ai_runs where id=(select value from anc where key='run'))),'SYNTHESIS','AI materialization uses an allowed epistemic class');
select is((select count(*)::integer from public.cycle_records where provenance->>'ai_run_id'=(select value::text from anc where key='run')),1,'completed run creates exactly one CycleRecord');
select is((select material_version::bigint from public.dragon_cycles where id=(select value from anc where key='cycle')),(select count_value + 1 from anc where key='material_version_before'),'DDR increments material_version');
select is((select count(*)::integer from public.domain_events where event_type='CYCLE_RECORD_CREATED' and object_id=(select cycle_record_id from public.ai_runs where id=(select value from anc where key='run'))),1,'DDR emits CYCLE_RECORD_CREATED exactly once');
select is((select payload->>'authority_basis' from public.domain_events where event_type='CYCLE_RECORD_CREATED' and object_id=(select cycle_record_id from public.ai_runs where id=(select value from anc where key='run'))),'ACTIVE_CYCLE_PARTICIPATION','DDR event records active participation authority basis');
select is((select count(*)::integer from public.domain_events where event_type='AI_RUN_COMPLETED' and aggregate_id=(select value from anc where key='run')),1,'AI_RUN_COMPLETED remains a distinct event');
select is((select current_direction_record_id from public.dragon_cycles where id=(select value from anc where key='cycle')),null::uuid,'AI completion does not create Human Direction');
select is((select count(*) from public.claims),(select count_value from anc where key='claims_before'),'completion creates no Claim');
select is((select count(*) from public.evidence_items),(select count_value from anc where key='evidence_before'),'completion creates no Evidence');
select is((select count(*) from public.verifications),(select count_value from anc where key='verifications_before'),'completion creates no Verification');
select is((select count(*) from public.domain_decisions),(select count_value from anc where key='decisions_before'),'completion creates no Decision');
select is((select count(*)::integer from public.role_assignments where actor_id=(select value from anc where key='agent')),0,'bounded AI has no project role');
select is((select count(*) from public.role_assignments),(select count_value from anc where key='roles_before'),'run grants no role');
select is((select count(*) from public.delegations),(select count_value from anc where key='delegations_before'),'run grants no delegation');

insert into anc(key,result) select 'failed_run',public.anc001_prepare_ai_run(
  (select value from anc where key='steward'),(select value from anc where key='project'),(select value from anc where key='cycle'),
  (select value from anc where key='agent'),'Bounded synthesis','MOCK','different-runtime-model',(select manifest || '{"purpose":"Bounded synthesis"}'::jsonb from anc_manifest),
  (select canonical from anc_manifest),repeat('d',64),'ab020000-0000-4000-8000-000000000009','anc-failed-prepare');
update anc set value=(result->>'ai_run_id')::uuid where key='failed_run';
select public.anc001_start_ai_run((select value from anc where key='steward'),(select value from anc where key='failed_run'),
  'ab020000-0000-4000-8000-000000000010','anc-failed-start');
select public.anc001_fail_ai_run((select value from anc where key='steward'),(select value from anc where key='failed_run'),'MOCK_PROVIDER_FAILURE',
  'ab020000-0000-4000-8000-000000000011','anc-failed-fail');
select is((select state from public.ai_runs where id=(select value from anc where key='failed_run')),'FAILED','provider failure is preserved');
select is((select cycle_record_id from public.ai_runs where id=(select value from anc where key='failed_run')),null::uuid,'failed run fabricates no CycleRecord');
select is((select agent_actor_id from public.ai_runs where id=(select value from anc where key='failed_run')),(select value from anc where key='agent'),'provider/model change does not change Actor identity');

select * from finish();
rollback;

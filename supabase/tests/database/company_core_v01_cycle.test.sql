begin;
create extension if not exists pgtap with schema extensions;
select no_plan();

-- Schema assertions
select has_table('public','company_core_cycles','Company Core v0.1 has cycle material');
select has_column('public','company_core_cycles','need_title','need_title exists on Company Core cycle');
select has_column('public','company_core_cycles','agreement_expected_result','agreement_expected_result exists on Company Core cycle');
select has_column('public','company_core_cycles','ai_run_id','ai_run_id exists on Company Core cycle');
select has_column('public','company_core_cycles','evaluation_verdict','evaluation_verdict exists on Company Core cycle');
select has_column('public','company_core_cycles','consequence_type','consequence_type exists on Company Core cycle');

select has_function('public','company_core_create_cycle',array['uuid','uuid','text','text','text','text','text','text','text','uuid','text'],'create cycle command exists');
select has_function('public','company_core_define_agreement',array['uuid','uuid','text','text','text','text','text','text','text','timestamptz','uuid','text'],'define agreement command exists');
select has_function('public','company_core_authorize_work',array['uuid','uuid','uuid','text'],'authorize work command exists');
select has_function('public','company_core_attach_ai_run',array['uuid','uuid','uuid','uuid','text'],'attach ai run command exists');
select has_function('public','company_core_record_result',array['uuid','uuid','text','uuid','text'],'record result command exists');
select has_function('public','company_core_record_evaluation',array['uuid','uuid','text','text','uuid','text'],'record evaluation command exists');
select has_function('public','company_core_record_consequence',array['uuid','uuid','integer','numeric','text','text','uuid','text'],'record consequence command exists');
select has_function('public','company_core_close_cycle',array['uuid','uuid','uuid','text'],'close cycle command exists');

-- Seed users and memberships
insert into auth.users(id,aud,role,email,raw_app_meta_data,raw_user_meta_data,created_at,updated_at) values
('cc010000-0000-4000-8000-000000000001','authenticated','authenticated','cc-steward@example.test','{"provider":"email","providers":["email"]}','{"name":"CC Steward"}',now(),now())
on conflict(id) do nothing;

insert into public.pilot_memberships(profile_id,status,source) values
('cc010000-0000-4000-8000-000000000001','ACTIVE','SEED')
on conflict(profile_id) do update set status='ACTIVE';

select set_config('request.jwt.claim.sub','cc010000-0000-4000-8000-000000000001',true);

-- Resolve actor
select set_config('request.jwt.claim.sub','cc010000-0000-4000-8000-000000000001',true);

create temporary table cc(key text primary key, value uuid, result jsonb);

insert into cc(key,value) select 'steward',actor_id from public.actor_memberships where profile_id='cc010000-0000-4000-8000-000000000001' and role='OWNER';

insert into cc(key,result) select 'project',to_jsonb(x) from public.create_project_atomic(
  'Projeto Company Core v0.1','projeto-cc-v01','Projeto determinístico para validar o ciclo operacional da empresa.',
  'Preservar a intenção original do Company Core.',
  'Interpretação atual: testar o loop NEED → CONSEQUENCE.',
  'Um ciclo completo registrado e reconstruível.',
  'Sem deploy, sem mutação de banco hospedado, sem autoridade autônoma.',
  array['company-core','cycle-011'],'VOLUNTARY','OPEN',true) x;
update cc set value=(result->>'project_id')::uuid where key='project';

-- Create cycle
insert into cc(key,result) select 'cycle',public.company_core_create_cycle(
  (select value from cc where key='steward'),
  (select value from cc where key='project'),
  'Escolher próxima ação de maior valor',
  'Com recursos atuais, qual ação nas próximas duas semanas aumenta capacidade econômica?',
  'Recomendação acionável com ação principal, benefício, pressupostos, custo, teste barato, falsificador e primeiro passo.',
  'Contexto de teste determinístico.',
  'HIGH',
  'Sem nova arquitetura prematura.',
  'Público para teste interno.',
  'cc010000-0000-4000-8000-000000000001',
  'cc-create-001'
);
update cc set value=(result->>'cycle_id')::uuid where key='cycle';

select is(
  (select result->>'state' from cc where key='cycle'),
  'NEED_CREATED',
  'cycle starts at NEED_CREATED'
);

-- Define agreement
insert into cc(key,result) select 'agreement',public.company_core_define_agreement(
  (select value from cc where key='steward'),
  (select value from cc where key='cycle'),
  'Recomendação acionável validada.',
  'Análise de próxima ação econômica dentro de recursos atuais.',
  'Nova arquitetura, contratação, investimento externo.',
  'Company Core v0.1 operacional, recursos atuais conhecidos.',
  'Permite ao fundador aceitar, rejeitar ou modificar sem nova arquitetura.',
  'Zero orçamento adicional além de inference cost.',
  'Fundador decide; IA recomenda apenas.',
  null,
  'cc010000-0000-4000-8000-000000000002',
  'cc-agreement-001'
);

select is(
  (select result->>'state' from cc where key='agreement'),
  'AGREEMENT_DEFINED',
  'agreement transitions to AGREEMENT_DEFINED'
);

-- Authorize work
insert into cc(key,result) select 'auth',public.company_core_authorize_work(
  (select value from cc where key='steward'),
  (select value from cc where key='cycle'),
  'cc010000-0000-4000-8000-000000000003',
  'cc-auth-001'
);

select is(
  (select result->>'state' from cc where key='auth'),
  'WORK_AUTHORIZED',
  'authorization transitions to WORK_AUTHORIZED'
);

-- Verify state integrity: cannot record result before AI run
select throws_ok(
  $$ select public.company_core_record_result(
    (select value from cc where key='steward'),
    (select value from cc where key='cycle'),
    'Resultado antecipado.',
    'cc010000-0000-4000-8000-000000000099',
    'cc-invalid-result'
  ) $$,
  'P0001',
  'CZ409:CYCLE_NOT_AI_TERMINAL',
  'cannot record result before AI is terminal'
);

-- Verify state integrity: cannot record evaluation before result
select throws_ok(
  $$ select public.company_core_record_evaluation(
    (select value from cc where key='steward'),
    (select value from cc where key='cycle'),
    'USEFUL',
    null,
    'cc010000-0000-4000-8000-000000000099',
    'cc-invalid-eval'
  ) $$,
  'P0001',
  'CZ409:CYCLE_NOT_RESULT_RECORDED',
  'cannot record evaluation before result'
);

-- Verify state integrity: cannot record consequence before evaluation
select throws_ok(
  $$ select public.company_core_record_consequence(
    (select value from cc where key='steward'),
    (select value from cc where key='cycle'),
    30,
    0.0001,
    'Consequência antecipada.',
    'TIME_SAVED',
    'cc010000-0000-4000-8000-000000000099',
    'cc-invalid-cons'
  ) $$,
  'P0001',
  'CZ409:CYCLE_NOT_EVALUATION_RECORDED',
  'cannot record consequence before evaluation'
);

-- Verify RLS: outsider cannot read.
-- Preserve the target id before switching away from the postgres test role.
select set_config(
  'app.company_core_test_cycle_id',
  (select value::text from cc where key='cycle'),
  true
);
select set_config(
  'request.jwt.claim.sub',
  'cc020000-0000-4000-8000-000000000002',
  true
);
select set_config('request.jwt.claim.role','authenticated',true);

set local role authenticated;

select set_config(
  'app.company_core_outsider_count',
  (
    select count(*)::text
    from public.company_core_cycles
    where id = current_setting('app.company_core_test_cycle_id')::uuid
  ),
  true
);

reset role;

select is(
  current_setting('app.company_core_outsider_count')::bigint,
  0::bigint,
  'outsider cannot see cycle through RLS'
);

select * from finish();
rollback;

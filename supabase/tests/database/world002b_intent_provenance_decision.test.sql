begin;
create extension if not exists pgtap with schema extensions;
select no_plan();

select has_column('public','project_intents','recorded_by_actor_id','recorder Actor is explicit');
select has_column('public','project_intents','content_origin_actor_id','content-origin Actor is explicit');
select has_column('public','project_intents','source_intent_id','exact derivation source is explicit');
select has_column('public','projects','current_intent_record_id','project has exact operative-intent pointer');
select has_function('public','world002b_record_interpretation',array['uuid','uuid','uuid','text','uuid','uuid','text'],'interpretation command exists');
select has_function('public','world002b_revise_original',array['uuid','uuid','uuid','text','uuid','text'],'original revision command exists');
select has_function('public','world002b_decide_intent',array['uuid','uuid','uuid','text','uuid','text'],'separate human-decision command exists');
select has_function('public','world002b_reconcile_project_intent',array['uuid'],'intent reconciler exists');

select is(
  has_function_privilege('authenticated','public.world002b_reconcile_project_intent(uuid)','EXECUTE'),
  false,
  'SECURITY DEFINER reconciler remains internal'
);

select is(
  (select count(*)::integer from public.capability_definitions
   where code in ('intent.interpret','intent.revise_original','intent.decide')),
  3,
  'three bounded intent capabilities are registered'
);

create temporary table world002b_fixture(
  key text primary key,
  value uuid,
  result jsonb
);
grant select on world002b_fixture to anon,authenticated;

insert into public.pilot_invites(email,label)
values('world002b-steward@example.test','WORLD-002B steward');

insert into auth.users(
  id,aud,role,email,raw_app_meta_data,raw_user_meta_data,created_at,updated_at
) values(
  '72000000-0000-4000-8000-000000000001',
  'authenticated','authenticated','world002b-steward@example.test',
  '{"provider":"email","providers":["email"]}',
  '{"name":"WORLD-002B Steward"}',
  now(),now()
);

insert into world002b_fixture(key,value)
select 'steward_actor',actor_id
from public.actor_memberships
where profile_id='72000000-0000-4000-8000-000000000001'
  and role='OWNER';

select set_config('request.jwt.claim.sub','72000000-0000-4000-8000-000000000001',true);

insert into world002b_fixture(key,result)
select 'project',to_jsonb(x)
from public.create_project_atomic(
  'Projeto WORLD 002B',
  'projeto-world-002b',
  'Projeto de teste para intenção, interpretação, proveniência e direção humana.',
  'Preservar a intenção humana original sem confundi-la com interpretações posteriores.',
  'Usar uma interpretação explicitamente aceita como projeção operativa do projeto.',
  'Uma trilha reconciliável de intenção, interpretação, decisão e retirada.',
  'Sem matching, ranking, perfil de competência ou inferência sensível automática.',
  array['proveniência','direção humana'],
  'VOLUNTARY','OPEN',true
) x;

update world002b_fixture set value=(result->>'project_id')::uuid where key='project';

insert into world002b_fixture(key,value)
select 'original_v1',id from public.project_intents
where project_id=(select value from world002b_fixture where key='project')
  and kind='ORIGINAL' and version=1;

insert into world002b_fixture(key,value)
select 'interpretation_v1',id from public.project_intents
where project_id=(select value from world002b_fixture where key='project')
  and kind='INTERPRETATION' and version=1;

select is(
  (select provenance_status from public.project_intents
   where id=(select value from world002b_fixture where key='original_v1')),
  'ATTRIBUTED',
  'new ORIGINAL is attributed'
);

select is(
  (select content_origin_actor_id from public.project_intents
   where id=(select value from world002b_fixture where key='original_v1')),
  (select value from world002b_fixture where key='steward_actor'),
  'ORIGINAL preserves exact human content-origin Actor'
);

select is(
  (select provenance_status from public.project_intents
   where id=(select value from world002b_fixture where key='interpretation_v1')),
  'RECORDED_ORIGIN_UNSPECIFIED',
  'legacy-compatible creation does not invent interpretation producer'
);

select is(
  (select source_intent_id from public.project_intents
   where id=(select value from world002b_fixture where key='interpretation_v1')),
  (select value from world002b_fixture where key='original_v1'),
  'initial interpretation derives from exact ORIGINAL'
);

select is(
  (select current_intent_record_id from public.projects
   where id=(select value from world002b_fixture where key='project')),
  (select value from world002b_fixture where key='interpretation_v1'),
  'project points to exact operative record'
);

select is(
  (select count(*)::integer from public.decision_records
   where decision_type='INTENT_ACCEPT'
     and target_type='PROJECT_INTENT'
     and target_id=(select value from world002b_fixture where key='interpretation_v1')),
  1,
  'initial human direction is separate from intent content row'
);

select is(
  public.world002b_reconcile_project_intent(
    (select value from world002b_fixture where key='project')
  ),
  '{}'::text[],
  'initial intent projection reconciles'
);

insert into world002b_fixture(key,result)
select 'agent',public.h2_register_project_agent(
  (select value from world002b_fixture where key='steward_actor'),
  (select value from world002b_fixture where key='project'),
  'WORLD-002B AI Interpreter',
  'Operated by WORLD-002B steward fixture',
  '72000000-0000-4000-8000-000000000101',
  'world002b-agent-register-0001'
);

update world002b_fixture set value=(result->>'agent_actor_id')::uuid where key='agent';

select ok(
  exists(
    select 1 from public.role_assignments ra
    join public.role_capabilities rc on rc.role_id=ra.role_id
    where ra.actor_id=(select value from world002b_fixture where key='agent')
      and ra.scope_type='PROJECT'
      and ra.scope_id=(select value from world002b_fixture where key='project')
      and rc.capability_code='intent.interpret'
  ),
  'AI contributor may record interpretation'
);

select ok(
  not exists(
    select 1 from public.role_assignments ra
    join public.role_capabilities rc on rc.role_id=ra.role_id
    where ra.actor_id=(select value from world002b_fixture where key='agent')
      and ra.scope_type='PROJECT'
      and ra.scope_id=(select value from world002b_fixture where key='project')
      and rc.capability_code='intent.decide'
  ),
  'AI contributor has no default human-decision capability'
);

insert into world002b_fixture(key,result)
select 'ai_interpretation',public.world002b_record_interpretation(
  (select value from world002b_fixture where key='agent'),
  (select value from world002b_fixture where key='project'),
  (select value from world002b_fixture where key='original_v1'),
  'Interpretação produzida pelo agente: preservar intenção humana e tornar a derivação explícita.',
  (select value from world002b_fixture where key='agent'),
  '72000000-0000-4000-8000-000000000102',
  'world002b-agent-interpret-0001'
);

update world002b_fixture set value=(result->>'intent_id')::uuid where key='ai_interpretation';

select is(
  (select origin_mechanism from public.project_intents
   where id=(select value from world002b_fixture where key='ai_interpretation')),
  'AI_AGENT_INTERPRETATION',
  'AI interpretation preserves AI-agent mechanism'
);

select is(
  (select content_origin_actor_id from public.project_intents
   where id=(select value from world002b_fixture where key='ai_interpretation')),
  (select value from world002b_fixture where key='agent'),
  'AI interpretation preserves exact AI Agent origin'
);

select is(
  (select (result->>'operative')::boolean from world002b_fixture where key='ai_interpretation'),
  false,
  'recorded interpretation is non-operative'
);

select set_config('request.jwt.claim.sub','',true);
set local role anon;

select is(
  (select count(*)::integer from public.project_intents
   where project_id=(select value from world002b_fixture where key='project')),
  1,
  'anonymous reader sees only exact operative intent of public project'
);

select is(
  (select count(*)::integer from public.project_intents
   where id=(select value from world002b_fixture where key='ai_interpretation')),
  0,
  'unaccepted AI interpretation is private'
);

reset role;
select set_config('request.jwt.claim.sub','72000000-0000-4000-8000-000000000001',true);

select throws_ok(
  format(
    'select public.world002b_decide_intent(%L::uuid,%L::uuid,%L::uuid,%L,%L::uuid,%L)',
    (select value from world002b_fixture where key='agent'),
    (select value from world002b_fixture where key='project'),
    (select value from world002b_fixture where key='ai_interpretation'),
    'ACCEPT',
    '72000000-0000-4000-8000-000000000103',
    'world002b-agent-self-accept-0001'
  ),
  '42501','CZ403:CAPABILITY_DENIED',
  'AI contributor cannot accept its own interpretation'
);

insert into world002b_fixture(key,result)
select 'accept_ai',public.world002b_decide_intent(
  (select value from world002b_fixture where key='steward_actor'),
  (select value from world002b_fixture where key='project'),
  (select value from world002b_fixture where key='ai_interpretation'),
  'ACCEPT',
  '72000000-0000-4000-8000-000000000104',
  'world002b-human-accept-ai-0001'
);

select is(
  (select current_intent_record_id from public.projects
   where id=(select value from world002b_fixture where key='project')),
  (select value from world002b_fixture where key='ai_interpretation'),
  'human ACCEPT makes exact AI interpretation operative'
);

select is(
  (select actor_id from public.decision_records
   where decision_type='INTENT_ACCEPT'
     and target_id=(select value from world002b_fixture where key='ai_interpretation')
   order by created_at desc,id desc limit 1),
  (select value from world002b_fixture where key='steward_actor'),
  'operative AI interpretation has separately attributed human decision'
);

select is(
  (select (result->>'acceptance_is_truth')::boolean from world002b_fixture where key='accept_ai'),
  false,
  'acceptance is explicitly not truth'
);

insert into world002b_fixture(key,result)
select 'ai_rejected',public.world002b_record_interpretation(
  (select value from world002b_fixture where key='agent'),
  (select value from world002b_fixture where key='project'),
  (select value from world002b_fixture where key='ai_interpretation'),
  'Segunda interpretação do agente para testar rejeição sem mudar a projeção.',
  (select value from world002b_fixture where key='agent'),
  '72000000-0000-4000-8000-000000000105',
  'world002b-agent-interpret-0002'
);
update world002b_fixture set value=(result->>'intent_id')::uuid where key='ai_rejected';

update world002b_fixture
set result=public.world002b_decide_intent(
  (select value from world002b_fixture where key='steward_actor'),
  (select value from world002b_fixture where key='project'),
  value,'REJECT',
  '72000000-0000-4000-8000-000000000106',
  'world002b-human-reject-0001'
)
where key='ai_rejected';

select is(
  (select current_intent_record_id from public.projects
   where id=(select value from world002b_fixture where key='project')),
  (select value from world002b_fixture where key='ai_interpretation'),
  'REJECT does not alter current projection'
);

insert into world002b_fixture(key,result)
select 'original_v2',public.world002b_revise_original(
  (select value from world002b_fixture where key='steward_actor'),
  (select value from world002b_fixture where key='project'),
  (select value from world002b_fixture where key='original_v1'),
  'Revisão humana explícita da intenção original preservando integralmente a versão anterior.',
  '72000000-0000-4000-8000-000000000107',
  'world002b-revise-original-0001'
);
update world002b_fixture set value=(result->>'intent_id')::uuid where key='original_v2';

select is(
  (select source_intent_id from public.project_intents
   where id=(select value from world002b_fixture where key='original_v2')),
  (select value from world002b_fixture where key='original_v1'),
  'ORIGINAL revision preserves exact revision source'
);

select is(
  (select count(*)::integer from public.project_intents
   where project_id=(select value from world002b_fixture where key='project')
     and kind='ORIGINAL'),
  2,
  'original revision preserves original v1'
);

select is(
  (select count(*)::integer from public.project_intents
   where project_id=(select value from world002b_fixture where key='project')
     and kind='ORIGINAL'
     and source_intent_id is null),
  1,
  'WORLD-002B preserves exactly one root ORIGINAL while allowing append-only revisions'
);

update world002b_fixture
set result=public.world002b_decide_intent(
  (select value from world002b_fixture where key='steward_actor'),
  (select value from world002b_fixture where key='project'),
  value,'ACCEPT',
  '72000000-0000-4000-8000-000000000108',
  'world002b-accept-original-v2-0001'
)
where key='original_v2';

select is(
  (select current_intent_record_id from public.projects
   where id=(select value from world002b_fixture where key='project')),
  (select value from world002b_fixture where key='original_v2'),
  'accepted ORIGINAL revision can become operative'
);

update world002b_fixture
set result=public.world002b_decide_intent(
  (select value from world002b_fixture where key='steward_actor'),
  (select value from world002b_fixture where key='project'),
  value,'WITHDRAW',
  '72000000-0000-4000-8000-000000000109',
  'world002b-withdraw-original-v2-0001'
)
where key='original_v2';

select is(
  (select current_intent_record_id from public.projects
   where id=(select value from world002b_fixture where key='project')),
  null::uuid,
  'WITHDRAW leaves no operative intent instead of inventing a fallback'
);

select is(
  (select current_intent from public.projects
   where id=(select value from world002b_fixture where key='project')),
  'Nenhuma intenção operativa está atualmente selecionada.',
  'WITHDRAW neutralizes the legacy current_intent cache instead of retaining withdrawn text'
);

select isnt(
  (select current_intent from public.projects
   where id=(select value from world002b_fixture where key='project')),
  (select content from public.project_intents
   where id=(select value from world002b_fixture where key='original_v2')),
  'withdrawn intent text is not retained in the public project cache'
);

select is(
  (select (result->>'current_intent_text_is_primary_source')::boolean
   from world002b_fixture where key='original_v2'),
  false,
  'legacy text cache remains non-canonical after neutralization'
);

select set_config('request.jwt.claim.sub','',true);
set local role anon;
select is(
  (select count(*)::integer from public.project_intents
   where project_id=(select value from world002b_fixture where key='project')),
  0,
  'withdrawn public project exposes no intent record'
);
select is(
  (select current_intent from public.projects
   where id=(select value from world002b_fixture where key='project')),
  'Nenhuma intenção operativa está atualmente selecionada.',
  'anonymous public-project read cannot recover withdrawn text from legacy current_intent'
);
reset role;

select set_config('request.jwt.claim.sub','72000000-0000-4000-8000-000000000001',true);

select is(
  public.world002b_reconcile_project_intent(
    (select value from world002b_fixture where key='project')
  ),
  '{}'::text[],
  'withdrawn state reconciles'
);

select is(
  public.reconcile_project(
    (select value from world002b_fixture where key='project')
  ),
  '{}'::text[],
  'Gate-1 reconciliation accepts one root ORIGINAL plus append-only revisions'
);

select throws_ok(
  format(
    'update public.project_intents set content=%L where id=%L::uuid',
    'Tentativa de alterar um registro append-only com texto suficientemente longo.',
    (select value from world002b_fixture where key='original_v1')
  ),
  '23000','project_intents is append-only',
  'WORLD-002B does not weaken append-only history'
);

select ok(
  not exists(
    select 1 from public.domain_events
    where event_type in (
      'INTENT_INTERPRETATION_RECORDED','ORIGINAL_INTENT_REVISED',
      'INTENT_ACCEPT','INTENT_REJECT','INTENT_WITHDRAW'
    )
      and (payload ? 'content' or payload ? 'current_intent')
  ),
  'domain events do not duplicate free-text intent content'
);

select * from finish();
rollback;

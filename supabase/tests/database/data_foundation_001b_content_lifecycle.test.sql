begin;

create extension if not exists pgtap with schema extensions;
select no_plan();

select has_table('public','project_intent_content_blocks',
  'DATA-FOUNDATION-001B has narrow per-object content blocking');

select has_function(
  'public',
  'data001b_block_project_intent_content',
  array['uuid','uuid','text','uuid','text'],
  'content-block command exists'
);

select has_function(
  'public',
  'data001b_reconcile_project_intent_content',
  array['uuid'],
  'content-block reconciler exists'
);

select has_function(
  'public',
  'data001b_project_intent_shell',
  array['uuid'],
  'safe project-intent shell projection exists'
);

select is(
  has_function_privilege(
    'authenticated',
    'public.data001b_reconcile_project_intent_content(uuid)',
    'EXECUTE'
  ),
  false,
  'SECURITY DEFINER content reconciler is internal'
);

select is(
  (select count(*)::integer
   from public.capability_definitions
   where code='privacy.intent_content_block'),
  1,
  'one bounded privacy content-block capability exists'
);

select is(
  (select count(*)::integer
   from public.role_capabilities
   where capability_code='privacy.intent_content_block'
     and role_id in (
       '00000000-0000-4000-8000-00000000c201',
       '00000000-0000-4000-8000-00000000c202'
     )),
  2,
  'Cell Admin and Project Steward receive default block authority'
);

select ok(
  not exists (
    select 1
    from public.role_capabilities
    where capability_code='privacy.intent_content_block'
      and role_id in (
        '00000000-0000-4000-8000-00000000c204',
        '00000000-0000-4000-8000-00000000c205'
      )
  ),
  'Contributor and Agent Operator receive no default block authority'
);

select ok(
  to_regclass('public.need_statements') is null
  and to_regclass('public.personal_data_profiles') is null,
  'slice creates neither Need persistence nor a personal profile subsystem'
);

create temporary table data001b_fixture (
  key text primary key,
  value uuid,
  result jsonb,
  text_value text
);
grant select on data001b_fixture to anon, authenticated;

insert into public.pilot_invites(email,label)
values ('data001b-steward@example.test','DATA-FOUNDATION-001B steward');

insert into auth.users(
  id,aud,role,email,raw_app_meta_data,raw_user_meta_data,created_at,updated_at
) values (
  '73000000-0000-4000-8000-000000000001',
  'authenticated',
  'authenticated',
  'data001b-steward@example.test',
  '{"provider":"email","providers":["email"]}',
  '{"name":"DATA-FOUNDATION-001B Steward"}',
  now(),now()
);

insert into data001b_fixture(key,value)
select 'steward_actor',actor_id
from public.actor_memberships
where profile_id='73000000-0000-4000-8000-000000000001'
  and role='OWNER';

select set_config(
  'request.jwt.claim.sub',
  '73000000-0000-4000-8000-000000000001',
  true
);

insert into data001b_fixture(key,result)
select 'project',to_jsonb(x)
from public.create_project_atomic(
  'Projeto DATA FOUNDATION 001B',
  'projeto-data-foundation-001b',
  'Projeto público de teste para bloquear conteúdo sem apagar história semântica.',
  'Preservar intenção humana sem transformar append-only em retenção irrestrita.',
  'Esta interpretação operativa contém TEXTO-BLOQUEAVEL-001B para testar suspensão de leitura.',
  'Bloqueio de conteúdo independente de retirada semântica.',
  'Sem Need, profiling, ranking ou alegação automática de legalidade.',
  array['lifecycle de conteúdo'],
  'VOLUNTARY',
  'OPEN',
  true
) x;

update data001b_fixture
set value=(result->>'project_id')::uuid
where key='project';

insert into data001b_fixture(key,value)
select 'current_intent',current_intent_record_id
from public.projects
where id=(select value from data001b_fixture where key='project');

insert into data001b_fixture(key,text_value)
select 'raw_content',content
from public.project_intents
where id=(select value from data001b_fixture where key='current_intent');

select is(
  public.world002b_reconcile_project_intent(
    (select value from data001b_fixture where key='project')
  ),
  '{}'::text[],
  'WORLD-002B reconciles before blocking'
);

select set_config('request.jwt.claim.sub','',true);
set local role anon;

select is(
  (select count(*)::integer
   from public.project_intents
   where id=(select value from data001b_fixture where key='current_intent')),
  1,
  'anonymous reader can read operative intent before block'
);

select is(
  (select current_intent
   from public.projects
   where id=(select value from data001b_fixture where key='project')),
  (select text_value from data001b_fixture where key='raw_content'),
  'legacy cache contains operative content before block'
);

select is(
  (select content_state
   from public.data001b_project_intent_shell(
     (select value from data001b_fixture where key='current_intent')
   )),
  'ACTIVE',
  'anonymous safe shell exposes ACTIVE state before block'
);

select ok(
  not (
    select to_jsonb(s) ? 'content'
    from public.data001b_project_intent_shell(
      (select value from data001b_fixture where key='current_intent')
    ) s
  ),
  'safe shell projection has no raw content field'
);

reset role;
select set_config(
  'request.jwt.claim.sub',
  '73000000-0000-4000-8000-000000000001',
  true
);

insert into data001b_fixture(key,result)
select 'agent',public.h2_register_project_agent(
  (select value from data001b_fixture where key='steward_actor'),
  (select value from data001b_fixture where key='project'),
  'DATA-FOUNDATION-001B agent',
  'Operated by test steward',
  '73000000-0000-4000-8000-000000000101',
  'data001b-register-agent-0001'
);

update data001b_fixture
set value=(result->>'agent_actor_id')::uuid
where key='agent';

select ok(
  not exists (
    select 1
    from public.role_assignments ra
    join public.role_capabilities rc on rc.role_id=ra.role_id
    where ra.actor_id=(select value from data001b_fixture where key='agent')
      and ra.scope_type='PROJECT'
      and ra.scope_id=(select value from data001b_fixture where key='project')
      and rc.capability_code='privacy.intent_content_block'
  ),
  'AI project contributor has no privacy block authority'
);

select throws_ok(
  format(
    'select public.data001b_block_project_intent_content(%L::uuid,%L::uuid,%L,%L::uuid,%L)',
    (select value from data001b_fixture where key='agent'),
    (select value from data001b_fixture where key='current_intent'),
    'SECURITY_PRECAUTION',
    '73000000-0000-4000-8000-000000000102',
    'data001b-agent-block-0001'
  ),
  '42501',
  'CZ403:CAPABILITY_DENIED',
  'AI contributor cannot block without authority'
);

select throws_ok(
  format(
    'select public.data001b_block_project_intent_content(%L::uuid,%L::uuid,%L,%L::uuid,%L)',
    (select value from data001b_fixture where key='steward_actor'),
    (select value from data001b_fixture where key='current_intent'),
    'DELETE_IT_BECAUSE_I_SAID_SO',
    '73000000-0000-4000-8000-000000000103',
    'data001b-invalid-reason-0001'
  ),
  'P0001',
  'CZ422:INVALID_CONTENT_BLOCK_REASON',
  'reason is a bounded code rather than a free-form legal assertion'
);

insert into data001b_fixture(key,result)
select 'block',public.data001b_block_project_intent_content(
  (select value from data001b_fixture where key='steward_actor'),
  (select value from data001b_fixture where key='current_intent'),
  'PURPOSE_OR_NECESSITY_REVIEW',
  '73000000-0000-4000-8000-000000000104',
  'data001b-block-current-0001'
);

select is(
  (select result->>'content_state' from data001b_fixture where key='block'),
  'BLOCKED',
  'block returns explicit BLOCKED state'
);

select is(
  (select (result->>'semantic_record_preserved')::boolean
   from data001b_fixture where key='block'),
  true,
  'semantic record is preserved'
);

select is(
  (select (result->>'content_eliminated')::boolean
   from data001b_fixture where key='block'),
  false,
  'BLOCKED is not elimination'
);

select is(
  (select (result->>'content_anonymised')::boolean
   from data001b_fixture where key='block'),
  false,
  'BLOCKED is not anonymisation'
);

select is(
  (select (result->>'intent_withdrawn')::boolean
   from data001b_fixture where key='block'),
  false,
  'blocking does not silently withdraw intent'
);

select is(
  (select (result->>'legal_compliance_determined')::boolean
   from data001b_fixture where key='block'),
  false,
  'blocking does not claim legal compliance conclusion'
);

select is(
  (select count(*)::integer
   from public.project_intent_content_blocks
   where project_intent_id=
     (select value from data001b_fixture where key='current_intent')),
  1,
  'one exact content block exists'
);

select is(
  (select reason_code
   from public.project_intent_content_blocks
   where project_intent_id=
     (select value from data001b_fixture where key='current_intent')),
  'PURPOSE_OR_NECESSITY_REVIEW',
  'block stores bounded reason code'
);

select is(
  (select count(*)::integer
   from public.decision_records
   where decision_type='INTENT_CONTENT_BLOCK'
     and target_type='PROJECT_INTENT'
     and target_id=
       (select value from data001b_fixture where key='current_intent')),
  1,
  'block has one attributed decision record'
);

select is(
  (select count(*)::integer
   from public.domain_events
   where event_type='INTENT_CONTENT_BLOCKED'
     and object_type='PROJECT_INTENT'
     and object_id=
       (select value from data001b_fixture where key='current_intent')),
  1,
  'block has one domain event'
);

select ok(
  not exists (
    select 1
    from public.domain_events
    where event_type='INTENT_CONTENT_BLOCKED'
      and (
        payload ? 'content'
        or payload ? 'current_intent'
        or payload::text like '%TEXTO-BLOQUEAVEL-001B%'
      )
  ),
  'domain event does not duplicate raw intent content'
);

select is(
  (select current_intent_record_id
   from public.projects
   where id=(select value from data001b_fixture where key='project')),
  (select value from data001b_fixture where key='current_intent'),
  'operative semantic pointer is preserved'
);

select is(
  (select current_intent
   from public.projects
   where id=(select value from data001b_fixture where key='project')),
  'Conteúdo da intenção operativa bloqueado para leitura ordinária.',
  'legacy public cache is neutralised'
);

select is(
  (select count(*)::integer
   from public.project_intents
   where id=(select value from data001b_fixture where key='current_intent')
     and content=(select text_value from data001b_fixture where key='raw_content')),
  1,
  'raw content and semantic row remain physically preserved in 001B'
);

select is(
  public.data001b_reconcile_project_intent_content(
    (select value from data001b_fixture where key='current_intent')
  ),
  '{}'::text[],
  'content control reconciles'
);

select is(
  public.world002b_reconcile_project_intent(
    (select value from data001b_fixture where key='project')
  ),
  '{}'::text[],
  'WORLD-002B reconciler accepts neutral cache for blocked current record'
);

select is(
  public.reconcile_project(
    (select value from data001b_fixture where key='project')
  ),
  '{}'::text[],
  'Gate-1 material/event reconciliation remains valid'
);

select throws_ok(
  format(
    'select public.world002b_decide_intent(%L::uuid,%L::uuid,%L::uuid,%L,%L::uuid,%L)',
    (select value from data001b_fixture where key='steward_actor'),
    (select value from data001b_fixture where key='project'),
    (select value from data001b_fixture where key='current_intent'),
    'ACCEPT',
    '73000000-0000-4000-8000-000000000105',
    'data001b-reaccept-blocked-0001'
  ),
  'P0001',
  'CZ409:INTENT_CONTENT_BLOCKED',
  'blocked content cannot be reaccepted into legacy cache'
);

select set_config('request.jwt.claim.sub','',true);
set local role anon;

select is(
  (select count(*)::integer
   from public.project_intents
   where id=(select value from data001b_fixture where key='current_intent')),
  0,
  'anonymous reader cannot read blocked raw intent'
);

select is(
  (select current_intent
   from public.projects
   where id=(select value from data001b_fixture where key='project')),
  'Conteúdo da intenção operativa bloqueado para leitura ordinária.',
  'anonymous reader gets only neutral project cache'
);

select is(
  (select content_state
   from public.data001b_project_intent_shell(
     (select value from data001b_fixture where key='current_intent')
   )),
  'BLOCKED',
  'anonymous reader still sees semantic shell with BLOCKED state'
);

select is(
  (select operative
   from public.data001b_project_intent_shell(
     (select value from data001b_fixture where key='current_intent')
   )),
  true,
  'blocked shell preserves the human-selected operative pointer'
);

reset role;
select set_config(
  'request.jwt.claim.sub',
  '73000000-0000-4000-8000-000000000001',
  true
);
set local role authenticated;

select is(
  (select count(*)::integer
   from public.project_intents
   where id=(select value from data001b_fixture where key='current_intent')),
  0,
  'ordinary authenticated steward read is also blocked'
);

select is(
  (select count(*)::integer
   from public.data001b_project_intent_shell(
     (select value from data001b_fixture where key='current_intent')
   )),
  1,
  'authenticated steward retains semantic shell visibility without raw content'
);

select throws_ok(
  format(
    'insert into public.project_intent_content_blocks(project_intent_id,project_id,blocked_by_actor_id,reason_code,command_id) values (%L::uuid,%L::uuid,%L::uuid,%L,%L::uuid)',
    (select value from data001b_fixture where key='current_intent'),
    (select value from data001b_fixture where key='project'),
    (select value from data001b_fixture where key='steward_actor'),
    'CONTROLLER_DIRECTION',
    '73000000-0000-4000-8000-000000000106'
  ),
  '42501',
  null,
  'authenticated client cannot directly mutate block table'
);

reset role;

select throws_ok(
  format(
    'update public.project_intent_content_blocks set reason_code=%L where project_intent_id=%L::uuid',
    'CONTROLLER_DIRECTION',
    (select value from data001b_fixture where key='current_intent')
  ),
  '23000',
  'project_intent_content_blocks is append-only',
  'even privileged UPDATE cannot rewrite block history'
);

select throws_ok(
  format(
    'delete from public.project_intent_content_blocks where project_intent_id=%L::uuid',
    (select value from data001b_fixture where key='current_intent')
  ),
  '23000',
  'project_intent_content_blocks is append-only',
  'even privileged DELETE cannot silently unblock content'
);

select set_config(
  'request.jwt.claim.sub',
  '73000000-0000-4000-8000-000000000001',
  true
);

select is(
  public.data001b_block_project_intent_content(
    (select value from data001b_fixture where key='steward_actor'),
    (select value from data001b_fixture where key='current_intent'),
    'PURPOSE_OR_NECESSITY_REVIEW',
    '73000000-0000-4000-8000-000000000104',
    'data001b-block-current-0001'
  ),
  (select result from data001b_fixture where key='block'),
  'same idempotency key replays same logical response'
);

select throws_ok(
  format(
    'select public.data001b_block_project_intent_content(%L::uuid,%L::uuid,%L,%L::uuid,%L)',
    (select value from data001b_fixture where key='steward_actor'),
    (select value from data001b_fixture where key='current_intent'),
    'CONTROLLER_DIRECTION',
    '73000000-0000-4000-8000-000000000107',
    'data001b-block-current-0002'
  ),
  'P0001',
  'CZ409:INTENT_CONTENT_ALREADY_BLOCKED',
  'second block cannot overwrite original control reason'
);

select is(
  (select count(*)::integer
   from public.command_receipts
   where command_type='privacy.intent_content_block'
     and status='COMPLETED'),
  1,
  'one successful content-block command receipt is preserved'
);

alter table public.project_intent_content_blocks
  disable trigger project_intent_content_blocks_append_only;

delete from public.project_intent_content_blocks
where project_intent_id =
  (select value from data001b_fixture where key='current_intent');

alter table public.project_intent_content_blocks
  enable trigger project_intent_content_blocks_append_only;

select is(
  public.data001b_reconcile_project_intent_content(
    (select value from data001b_fixture where key='current_intent')
  ),
  array['decision_without_block','domain_event_without_block']::text[],
  'reconciler detects synthetic privileged deletion of active block control'
);

select * from finish();
rollback;

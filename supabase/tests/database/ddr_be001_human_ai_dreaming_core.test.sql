begin;

create extension if not exists pgtap with schema extensions;

select no_plan();

select has_table(
  'public',
  'dragon_cycles',
  'DDR-BE-001 has explicit DragonCycle material'
);

select has_table(
  'public',
  'cycle_participations',
  'DDR-BE-001 has contextual Human/AI participation'
);

select has_table(
  'public',
  'cycle_records',
  'DDR-BE-001 has attributed immutable CycleRecords'
);

select has_table(
  'public',
  'cycle_record_relations',
  'DDR-BE-001 has attributed semantic relations'
);

select has_function(
  'public',
  'ddr_open_cycle',
  array['uuid','uuid','uuid','uuid','uuid','text'],
  'Dragon Cycle open command exists'
);

select has_function(
  'public',
  'ddr_add_cycle_ai_participant',
  array['uuid','uuid','uuid','text','text','uuid','text','text','uuid','text'],
  'bounded AI participation command exists'
);

select has_function(
  'public',
  'ddr_record_cycle_record',
  array['uuid','uuid','text','text','jsonb','uuid','text'],
  'attributed CycleRecord command exists'
);

select has_function(
  'public',
  'ddr_relate_cycle_records',
  array['uuid','uuid','uuid','uuid','text','uuid','text'],
  'CycleRecord semantic relation command exists'
);

select has_function(
  'public',
  'ddr_set_cycle_direction',
  array['uuid','uuid','uuid','uuid','text'],
  'Human Direction selection command exists'
);

select has_function(
  'public',
  'ddr_transition_cycle_phase',
  array['uuid','uuid','text','text','uuid','text'],
  'bounded method phase transition command exists'
);

select ok(
  has_function_privilege(
    'authenticated',
    'private.ddr_can_read_cycle(uuid)',
    'EXECUTE'
  ),
  'authenticated can execute RLS helper required to read DragonCycle'
);

select has_trigger(
  'public',
  'cycle_records',
  'cycle_records_append_only',
  'CycleRecords are append-only'
);

select has_trigger(
  'public',
  'cycle_record_relations',
  'cycle_record_relations_append_only',
  'CycleRecord relations are append-only'
);

insert into auth.users(
  id,
  aud,
  role,
  email,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at
) values
(
  'd1000000-0000-4000-8000-000000000001',
  'authenticated',
  'authenticated',
  'ddr-be001-steward@example.test',
  '{"provider":"email","providers":["email"]}',
  '{"name":"DDR BE001 Steward"}',
  now(),
  now()
),
(
  'd1000000-0000-4000-8000-000000000002',
  'authenticated',
  'authenticated',
  'ddr-be001-outsider@example.test',
  '{"provider":"email","providers":["email"]}',
  '{"name":"DDR BE001 Outsider"}',
  now(),
  now()
);

insert into public.pilot_memberships(
  profile_id,
  status,
  source
) values
(
  'd1000000-0000-4000-8000-000000000001',
  'ACTIVE',
  'SEED'
),
(
  'd1000000-0000-4000-8000-000000000002',
  'ACTIVE',
  'SEED'
)
on conflict (profile_id)
do update set status = 'ACTIVE';

create temporary table ddr_be001(
  key text primary key,
  value uuid,
  result jsonb
);

insert into ddr_be001(key, value)
select 'steward_actor', actor_id
from public.actor_memberships
where profile_id = 'd1000000-0000-4000-8000-000000000001'
  and role = 'OWNER';

insert into ddr_be001(key, value)
select 'outsider_actor', actor_id
from public.actor_memberships
where profile_id = 'd1000000-0000-4000-8000-000000000002'
  and role = 'OWNER';

select set_config(
  'request.jwt.claim.sub',
  'd1000000-0000-4000-8000-000000000001',
  true
);

insert into ddr_be001(key, result)
select 'project', to_jsonb(x)
from public.create_project_atomic(
  'Projeto DDR BE001',
  'projeto-ddr-be001',
  'Projeto local para validar o núcleo semântico Human AI da Dragon Dream Room.',
  'Preservar um Dream humano original antes de qualquer interpretação de IA.',
  'Validar Pinakarri digital, síntese atribuída e direção humana sem frontend.',
  'Backend reconstruível até a passagem explícita de Dreaming para Planning.',
  'Sem frontend, dinheiro, deploy, adoção ou inferência automática de consenso.',
  array['dragon-cycle','pinakarri','human-ai'],
  'VOLUNTARY',
  'OPEN',
  true
) x;

update ddr_be001
set value = (result ->> 'project_id')::uuid
where key = 'project';

select ok(
  private.b1_has_capability(
    (select value from ddr_be001 where key = 'steward_actor'),
    'cycle.manage',
    'PROJECT',
    (select value from ddr_be001 where key = 'project')
  ),
  'PROJECT_STEWARD receives cycle.manage'
);

insert into ddr_be001(key, result)
select 'cycle', public.ddr_open_cycle(
  (select value from ddr_be001 where key = 'steward_actor'),
  (select value from ddr_be001 where key = 'project'),
  null,
  null,
  'd2000000-0000-4000-8000-000000000001',
  'ddr-be001-cycle-open'
);

update ddr_be001
set value = (result ->> 'dragon_cycle_id')::uuid
where key = 'cycle';

select is(
  (
    select current_phase
    from public.dragon_cycles
    where id = (select value from ddr_be001 where key = 'cycle')
  ),
  'DREAMING',
  'DragonCycle begins in DREAMING'
);

select is(
  (
    select count(*)::integer
    from public.cycle_participations
    where cycle_id = (select value from ddr_be001 where key = 'cycle')
      and actor_id = (select value from ddr_be001 where key = 'steward_actor')
      and affiliation = 'SELF'
      and social_role = 'STEWARD'
      and mode = 'SELF'
  ),
  1,
  'human steward enters as explicit SELF participant'
);

select throws_ok(
  $$
    select public.ddr_transition_cycle_phase(
      (select value from ddr_be001 where key = 'steward_actor'),
      (select value from ddr_be001 where key = 'cycle'),
      'PLANNING',
      'Attempt Planning before a Human Direction exists.',
      'd2000000-0000-4000-8000-000000000002',
      'ddr-be001-too-early-planning'
    )
  $$,
  'P0001',
  'CZ409:HUMAN_DIRECTION_REQUIRED_BEFORE_PLANNING',
  'Dreaming cannot become Planning without explicit Human Direction'
);

insert into ddr_be001(key, result)
select 'ai', public.t3_register_bounded_agent(
  (select value from ddr_be001 where key = 'steward_actor'),
  (select value from ddr_be001 where key = 'project'),
  'DDR Room Facilitator',
  'DDR BE001 human-controlled local operator',
  'd2000000-0000-4000-8000-000000000003',
  'ddr-be001-register-room-ai'
);

update ddr_be001
set value = (result ->> 'agent_actor_id')::uuid
where key = 'ai';

select ok(
  not private.b1_has_capability(
    (select value from ddr_be001 where key = 'ai'),
    'cycle.manage',
    'PROJECT',
    (select value from ddr_be001 where key = 'project')
  ),
  'Room AI receives no cycle.manage authority implicitly'
);

insert into ddr_be001(key, result)
select 'ai_participation', public.ddr_add_cycle_ai_participant(
  (select value from ddr_be001 where key = 'steward_actor'),
  (select value from ddr_be001 where key = 'cycle'),
  (select value from ddr_be001 where key = 'ai'),
  'ROOM',
  'FACILITATOR',
  null,
  'ASSIST',
  'Listen, restate and synthesize without creating Human Direction or collective legitimacy.',
  'd2000000-0000-4000-8000-000000000004',
  'ddr-be001-add-room-ai'
);

select is(
  (
    select concat_ws(
      '|',
      affiliation,
      social_role,
      mode
    )
    from public.cycle_participations
    where id = (
      select (result ->> 'cycle_participation_id')::uuid
      from ddr_be001
      where key = 'ai_participation'
    )
  ),
  'ROOM|FACILITATOR|ASSIST',
  'Room AI participation preserves affiliation, social role and non-authoritative mode'
);

insert into ddr_be001(key, result)
select 'human_original', public.ddr_record_cycle_record(
  (select value from ddr_be001 where key = 'steward_actor'),
  (select value from ddr_be001 where key = 'cycle'),
  'ORIGINAL_RECORD',
  'Quero descobrir como humanos e diferentes IAs podem sonhar, construir e aprender juntos sem apagar autoria, divergência ou autoridade humana.',
  '{}'::jsonb,
  'd2000000-0000-4000-8000-000000000005',
  'ddr-be001-human-original'
);

update ddr_be001
set value = (result ->> 'cycle_record_id')::uuid
where key = 'human_original';

insert into ddr_be001(key, result)
select 'ai_interpretation', public.ddr_record_cycle_record(
  (select value from ddr_be001 where key = 'ai'),
  (select value from ddr_be001 where key = 'cycle'),
  'INTERPRETATION',
  'Minha interpretação é que o sonho busca colaboração humano IA com memória e ação, mas sem transformar síntese de IA em posição ou autoridade humana.',
  jsonb_build_object(
    'producer_kind',
    'AI_AGENT',
    'inference',
    'SIMULATED_FOR_DATABASE_CONTRACT'
  ),
  'd2000000-0000-4000-8000-000000000006',
  'ddr-be001-ai-interpretation'
);

update ddr_be001
set value = (result ->> 'cycle_record_id')::uuid
where key = 'ai_interpretation';

select public.ddr_relate_cycle_records(
  (select value from ddr_be001 where key = 'ai'),
  (select value from ddr_be001 where key = 'cycle'),
  (select value from ddr_be001 where key = 'ai_interpretation'),
  (select value from ddr_be001 where key = 'human_original'),
  'RESTATES',
  'd2000000-0000-4000-8000-000000000007',
  'ddr-be001-ai-restates-human'
);

select is(
  (
    select count(*)::integer
    from public.cycle_record_relations
    where cycle_id = (select value from ddr_be001 where key = 'cycle')
      and source_record_id = (
        select value from ddr_be001 where key = 'ai_interpretation'
      )
      and target_record_id = (
        select value from ddr_be001 where key = 'human_original'
      )
      and relation_type = 'RESTATES'
  ),
  1,
  'AI interpretation explicitly RESTATES the human Original Record'
);

select throws_ok(
  $$
    select public.ddr_relate_cycle_records(
      (select value from ddr_be001 where key = 'ai'),
      (select value from ddr_be001 where key = 'cycle'),
      (select value from ddr_be001 where key = 'ai_interpretation'),
      (select value from ddr_be001 where key = 'human_original'),
      'CONFIRMS',
      'd2000000-0000-4000-8000-000000000008',
      'ddr-be001-ai-cannot-confirm-human'
    )
  $$,
  '42501',
  'CZ403:HUMAN_CONFIRMATION_REQUIRED',
  'AI cannot silently confirm its own interpretation as the human position'
);

select public.ddr_relate_cycle_records(
  (select value from ddr_be001 where key = 'steward_actor'),
  (select value from ddr_be001 where key = 'cycle'),
  (select value from ddr_be001 where key = 'human_original'),
  (select value from ddr_be001 where key = 'ai_interpretation'),
  'CONFIRMS',
  'd2000000-0000-4000-8000-000000000009',
  'ddr-be001-human-confirms-ai'
);

select is(
  (
    select asserted_by_actor_id
    from public.cycle_record_relations
    where cycle_id = (select value from ddr_be001 where key = 'cycle')
      and relation_type = 'CONFIRMS'
    limit 1
  ),
  (select value from ddr_be001 where key = 'steward_actor'),
  'confirmation remains directly attributed to the human'
);

insert into ddr_be001(key, result)
select 'ai_synthesis', public.ddr_record_cycle_record(
  (select value from ddr_be001 where key = 'ai'),
  (select value from ddr_be001 where key = 'cycle'),
  'SYNTHESIS',
  'Síntese proposta: construir primeiro uma Dragon Dream Room em que humanos e IAs tenham papéis visíveis, provenance explícita e autoridade humana preservada.',
  jsonb_build_object(
    'producer_kind',
    'AI_AGENT',
    'inference',
    'SIMULATED_FOR_DATABASE_CONTRACT'
  ),
  'd2000000-0000-4000-8000-000000000010',
  'ddr-be001-ai-synthesis'
);

update ddr_be001
set value = (result ->> 'cycle_record_id')::uuid
where key = 'ai_synthesis';

select public.ddr_relate_cycle_records(
  (select value from ddr_be001 where key = 'ai'),
  (select value from ddr_be001 where key = 'cycle'),
  (select value from ddr_be001 where key = 'ai_synthesis'),
  (select value from ddr_be001 where key = 'human_original'),
  'DERIVES_FROM',
  'd2000000-0000-4000-8000-000000000011',
  'ddr-be001-synthesis-derives-human'
);

select public.ddr_relate_cycle_records(
  (select value from ddr_be001 where key = 'ai'),
  (select value from ddr_be001 where key = 'cycle'),
  (select value from ddr_be001 where key = 'ai_synthesis'),
  (select value from ddr_be001 where key = 'ai_interpretation'),
  'DERIVES_FROM',
  'd2000000-0000-4000-8000-000000000012',
  'ddr-be001-synthesis-derives-interpretation'
);

select is(
  (
    select current_direction_record_id
    from public.dragon_cycles
    where id = (select value from ddr_be001 where key = 'cycle')
  ),
  null::uuid,
  'AI synthesis does not automatically become Human Direction'
);

select throws_ok(
  $$
    select public.ddr_set_cycle_direction(
      (select value from ddr_be001 where key = 'ai'),
      (select value from ddr_be001 where key = 'cycle'),
      (select value from ddr_be001 where key = 'ai_synthesis'),
      'd2000000-0000-4000-8000-000000000013',
      'ddr-be001-ai-cannot-set-direction'
    )
  $$,
  '42501',
  'CZ403:CAPABILITY_DENIED',
  'Room AI cannot set direction merely because it participates'
);

select public.ddr_set_cycle_direction(
  (select value from ddr_be001 where key = 'steward_actor'),
  (select value from ddr_be001 where key = 'cycle'),
  (select value from ddr_be001 where key = 'ai_synthesis'),
  'd2000000-0000-4000-8000-000000000014',
  'ddr-be001-human-sets-direction'
);

select is(
  (
    select current_direction_record_id
    from public.dragon_cycles
    where id = (select value from ddr_be001 where key = 'cycle')
  ),
  (select value from ddr_be001 where key = 'ai_synthesis'),
  'human may explicitly adopt an AI-authored synthesis as current direction'
);

select is(
  (
    select actor_id
    from public.decision_records
    where decision_type = 'CYCLE_DIRECTION_SET'
      and target_type = 'DRAGON_CYCLE'
      and target_id = (select value from ddr_be001 where key = 'cycle')
    order by created_at desc
    limit 1
  ),
  (select value from ddr_be001 where key = 'steward_actor'),
  'Human Direction authority remains attributed to human steward'
);

select public.ddr_transition_cycle_phase(
  (select value from ddr_be001 where key = 'steward_actor'),
  (select value from ddr_be001 where key = 'cycle'),
  'PLANNING',
  'The human has explicitly selected a direction and authorizes moving from Dreaming into Planning.',
  'd2000000-0000-4000-8000-000000000015',
  'ddr-be001-dreaming-to-planning'
);

select is(
  (
    select current_phase
    from public.dragon_cycles
    where id = (select value from ddr_be001 where key = 'cycle')
  ),
  'PLANNING',
  'cycle enters PLANNING only after explicit Human Direction'
);

select set_config(
  'request.jwt.claim.sub',
  'd1000000-0000-4000-8000-000000000002',
  true
);

select throws_ok(
  $$
    select public.ddr_record_cycle_record(
      (select value from ddr_be001 where key = 'outsider_actor'),
      (select value from ddr_be001 where key = 'cycle'),
      'ORIGINAL_RECORD',
      'Outsider must not enter the Dream Circle merely because the Project exists.',
      '{}'::jsonb,
      'd2000000-0000-4000-8000-000000000016',
      'ddr-be001-outsider-record'
    )
  $$,
  '42501',
  'CZ403:ACTIVE_CYCLE_PARTICIPATION_REQUIRED',
  'non-participant cannot write into the Dragon Cycle'
);

select set_config(
  'cz.ddr.be001_cycle_id',
  (select value::text from ddr_be001 where key = 'cycle'),
  true
);

set local role authenticated;

select is(
  (
    select count(*)::integer
    from public.dragon_cycles
    where id = current_setting('cz.ddr.be001_cycle_id')::uuid
  ),
  0,
  'outsider cannot read participant-only Dragon Cycle through RLS'
);

reset role;

select set_config(
  'request.jwt.claim.sub',
  'd1000000-0000-4000-8000-000000000001',
  true
);

select throws_ok(
  $$
    update public.cycle_records
    set content = 'Mutated content that must never replace the attributed original.'
    where id = (
      select value from ddr_be001 where key = 'human_original'
    )
  $$,
  '23000',
  'cycle_records is append-only',
  'CycleRecord cannot be silently mutated'
);

select is(
  (
    select count(*)::integer
    from public.domain_events
    where aggregate_type = 'DRAGON_CYCLE'
      and aggregate_id = (select value from ddr_be001 where key = 'cycle')
      and event_type = 'CYCLE_DIRECTION_SET'
  ),
  1,
  'exactly one explicit Human Direction event exists'
);

select is(
  (
    select count(*)::integer
    from public.domain_events
    where aggregate_type = 'DRAGON_CYCLE'
      and aggregate_id = (select value from ddr_be001 where key = 'cycle')
      and event_type = 'CYCLE_PHASE_CHANGED'
  ),
  1,
  'Dreaming to Planning transition is reconstructible from event spine'
);

select * from finish();

rollback;

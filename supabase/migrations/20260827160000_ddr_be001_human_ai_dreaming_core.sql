-- DDR-BE-001 — Human + AI Dreaming Core
--
-- Backend-only semantic slice.
--
-- Demonstrates:
--   DragonCycle
--   Human steward participation
--   Room/Personal AI participation without implicit authority
--   attributed immutable CycleRecords
--   Pinakarri relations: RESTATES / CONFIRMS / CORRECTS
--   AI synthesis distinct from Human Direction
--   DREAMING <-> PLANNING transition
--
-- Does NOT demonstrate:
--   real LLM inference
--   T1/T2/T3 work execution inside the cycle
--   Doing
--   Celebration
--   child-cycle regeneration
--   external utility / adoption / PMF / scale
--
-- Preserve:
-- Project != DragonCycle
-- method phase != material state != epistemic class
-- participation != authority
-- AI output != Human Direction
-- synthesis != collective decision
-- Original Record != Interpretation != Synthesis
-- CycleRecord != Claim != Evidence != Verification != Decision

insert into public.capability_definitions(code, description) values
  (
    'cycle.manage',
    'Manage one project-scoped Dragon Cycle projection without granting participant speech or AI authority implicitly.'
  )
on conflict (code) do nothing;

insert into public.role_capabilities(role_id, capability_code) values
  ('00000000-0000-4000-8000-00000000c201', 'cycle.manage'),
  ('00000000-0000-4000-8000-00000000c202', 'cycle.manage')
on conflict do nothing;

create table public.dragon_cycles (
  id uuid primary key default gen_random_uuid(),
  cell_id uuid not null references public.cells(id) on delete restrict,
  project_id uuid not null references public.projects(id) on delete restrict,

  parent_cycle_id uuid references public.dragon_cycles(id) on delete restrict,
  origin_record_id uuid,

  current_phase text not null default 'DREAMING'
    check (current_phase in ('DREAMING','PLANNING','DOING','CELEBRATING')),

  current_direction_record_id uuid,

  state text not null default 'OPEN'
    check (state in ('OPEN','CLOSED','ABANDONED')),

  visibility text not null default 'PROJECT'
    check (visibility = 'PROJECT'),

  material_version integer not null default 1
    check (material_version > 0),

  opened_by_actor_id uuid not null references public.actors(id) on delete restrict,
  created_at timestamptz not null default now(),
  closed_at timestamptz,

  check (
    (state = 'OPEN' and closed_at is null)
    or
    (state in ('CLOSED','ABANDONED') and closed_at is not null)
  ),

  check (
    (parent_cycle_id is null and origin_record_id is null)
    or
    (parent_cycle_id is not null and origin_record_id is not null)
  )
);

create index dragon_cycles_project_created
  on public.dragon_cycles(project_id, created_at, id);

create index dragon_cycles_parent
  on public.dragon_cycles(parent_cycle_id)
  where parent_cycle_id is not null;

create table public.cycle_participations (
  id uuid primary key default gen_random_uuid(),
  cycle_id uuid not null references public.dragon_cycles(id) on delete restrict,
  actor_id uuid not null references public.actors(id) on delete restrict,

  affiliation text not null
    check (affiliation in ('SELF','PERSONAL','ROOM')),

  social_role text not null
    check (
      social_role in (
        'STEWARD',
        'PARTICIPANT',
        'FACILITATOR',
        'RESEARCHER',
        'CRITIC',
        'ARCHIVIST',
        'OBSERVER'
      )
    ),

  principal_actor_id uuid references public.actors(id) on delete restrict,

  mode text not null
    check (mode in ('SELF','ASSIST','AMPLIFY')),

  mandate text not null default ''
    check (char_length(mandate) <= 2000),

  created_by_actor_id uuid not null references public.actors(id) on delete restrict,
  valid_from timestamptz not null default now(),
  ended_at timestamptz,

  unique (cycle_id, actor_id),

  check (principal_actor_id is null or principal_actor_id <> actor_id),

  check (
    (
      affiliation = 'SELF'
      and mode = 'SELF'
      and principal_actor_id is null
    )
    or
    (
      affiliation = 'ROOM'
      and mode in ('ASSIST','AMPLIFY')
      and principal_actor_id is null
    )
    or
    (
      affiliation = 'PERSONAL'
      and mode in ('ASSIST','AMPLIFY')
      and principal_actor_id is not null
    )
  )
);

create index cycle_participations_cycle_active
  on public.cycle_participations(cycle_id, actor_id)
  where ended_at is null;

create table public.cycle_records (
  id uuid primary key default gen_random_uuid(),
  cycle_id uuid not null references public.dragon_cycles(id) on delete restrict,
  author_actor_id uuid not null references public.actors(id) on delete restrict,

  content_class text not null
    check (
      content_class in (
        'ORIGINAL_RECORD',
        'INTERPRETATION',
        'SYNTHESIS'
      )
    ),

  phase_context text not null
    check (
      phase_context in (
        'DREAMING',
        'PLANNING',
        'DOING',
        'CELEBRATING'
      )
    ),

  content text not null
    check (char_length(content) between 1 and 8000),

  visibility text not null default 'PROJECT'
    check (visibility = 'PROJECT'),

  provenance jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default now()
);

create index cycle_records_cycle_created
  on public.cycle_records(cycle_id, created_at, id);

create index cycle_records_author_created
  on public.cycle_records(author_actor_id, created_at, id);

create trigger cycle_records_append_only
before update or delete on public.cycle_records
for each row execute function private.prevent_append_only_mutation();

create table public.cycle_record_relations (
  id uuid primary key default gen_random_uuid(),
  cycle_id uuid not null references public.dragon_cycles(id) on delete restrict,

  source_record_id uuid not null
    references public.cycle_records(id) on delete restrict,

  target_record_id uuid not null
    references public.cycle_records(id) on delete restrict,

  relation_type text not null
    check (
      relation_type in (
        'RESPONDS_TO',
        'RESTATES',
        'CONFIRMS',
        'CORRECTS',
        'DERIVES_FROM'
      )
    ),

  asserted_by_actor_id uuid not null
    references public.actors(id) on delete restrict,

  created_at timestamptz not null default now(),

  check (source_record_id <> target_record_id),

  unique (
    cycle_id,
    source_record_id,
    target_record_id,
    relation_type,
    asserted_by_actor_id
  )
);

create index cycle_record_relations_cycle
  on public.cycle_record_relations(cycle_id, created_at, id);

create trigger cycle_record_relations_append_only
before update or delete on public.cycle_record_relations
for each row execute function private.prevent_append_only_mutation();

alter table public.dragon_cycles
  add constraint dragon_cycles_origin_record_fk
  foreign key (origin_record_id)
  references public.cycle_records(id)
  on delete restrict;

alter table public.dragon_cycles
  add constraint dragon_cycles_direction_record_fk
  foreign key (current_direction_record_id)
  references public.cycle_records(id)
  on delete restrict;

create or replace function private.ddr_can_read_cycle(p_cycle_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, private, pg_temp
as $$
  select auth.uid() is not null and exists (
    select 1
    from public.dragon_cycles c
    where c.id = p_cycle_id
      and (
        private.can_manage_project(c.project_id, auth.uid())
        or exists (
          select 1
          from public.cycle_participations cp
          where cp.cycle_id = c.id
            and cp.ended_at is null
            and private.b1_profile_controls_actor(cp.actor_id, auth.uid())
        )
      )
  );
$$;

revoke all on function private.ddr_can_read_cycle(uuid) from public;
grant execute on function private.ddr_can_read_cycle(uuid) to authenticated;

create or replace function private.ddr_current_profile_active_participant(
  p_cycle_id uuid,
  p_actor_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = public, private, pg_temp
as $$
  select
    private.b1_profile_controls_actor(p_actor_id, auth.uid())
    and exists (
      select 1
      from public.cycle_participations cp
      where cp.cycle_id = p_cycle_id
        and cp.actor_id = p_actor_id
        and cp.ended_at is null
    );
$$;

create or replace function public.ddr_open_cycle(
  p_actor_id uuid,
  p_project_id uuid,
  p_parent_cycle_id uuid,
  p_origin_record_id uuid,
  p_command_id uuid,
  p_idempotency_key text
)
returns jsonb
language plpgsql
security definer
set search_path = public, private, pg_temp
as $$
declare
  v_project public.projects%rowtype;
  v_parent public.dragon_cycles%rowtype;
  v_actor_kind text;
  v_replayed boolean;
  v_result jsonb;
  v_cycle_id uuid;
  v_participation_id uuid;
  v_payload jsonb;
begin
  select * into v_project
  from public.projects
  where id = p_project_id;

  if not found then
    raise exception using errcode = 'P0001', message = 'CZ404:PROJECT_NOT_FOUND';
  end if;

  perform private.b1_authorize_actor(
    p_actor_id,
    'cycle.manage',
    'PROJECT',
    p_project_id
  );

  select kind into v_actor_kind
  from public.actors
  where id = p_actor_id;

  if v_actor_kind <> 'PERSON'
     or v_project.steward_actor_id <> p_actor_id then
    raise exception using
      errcode = '42501',
      message = 'CZ403:HUMAN_PROJECT_STEWARD_REQUIRED';
  end if;

  if (p_parent_cycle_id is null) <> (p_origin_record_id is null) then
    raise exception using
      errcode = '22023',
      message = 'CZ422:PARENT_AND_ORIGIN_MUST_PAIR';
  end if;

  if p_parent_cycle_id is not null then
    select * into v_parent
    from public.dragon_cycles
    where id = p_parent_cycle_id;

    if not found then
      raise exception using
        errcode = 'P0001',
        message = 'CZ404:PARENT_CYCLE_NOT_FOUND';
    end if;

    if v_parent.project_id <> p_project_id then
      raise exception using
        errcode = '22023',
        message = 'CZ422:PARENT_PROJECT_MISMATCH';
    end if;

    if v_parent.state <> 'OPEN'
       or v_parent.current_phase <> 'CELEBRATING' then
      raise exception using
        errcode = 'P0001',
        message = 'CZ409:PARENT_NOT_CELEBRATING';
    end if;

    if not exists (
      select 1
      from public.cycle_records r
      where r.id = p_origin_record_id
        and r.cycle_id = p_parent_cycle_id
    ) then
      raise exception using
        errcode = '22023',
        message = 'CZ422:INVALID_CHILD_ORIGIN_RECORD';
    end if;
  end if;

  v_payload := jsonb_build_object(
    'project_id', p_project_id,
    'parent_cycle_id', p_parent_cycle_id,
    'origin_record_id', p_origin_record_id
  );

  select replayed, saved_result
  into v_replayed, v_result
  from private.b1_begin_command(
    v_project.cell_id,
    p_actor_id,
    p_command_id,
    p_idempotency_key,
    'dragon_cycle.open',
    v_payload
  );

  if v_replayed then
    return v_result;
  end if;

  insert into public.dragon_cycles(
    cell_id,
    project_id,
    parent_cycle_id,
    origin_record_id,
    current_phase,
    state,
    visibility,
    material_version,
    opened_by_actor_id
  ) values (
    v_project.cell_id,
    p_project_id,
    p_parent_cycle_id,
    p_origin_record_id,
    'DREAMING',
    'OPEN',
    'PROJECT',
    1,
    p_actor_id
  )
  returning id into v_cycle_id;

  insert into public.cycle_participations(
    cycle_id,
    actor_id,
    affiliation,
    social_role,
    principal_actor_id,
    mode,
    mandate,
    created_by_actor_id
  ) values (
    v_cycle_id,
    p_actor_id,
    'SELF',
    'STEWARD',
    null,
    'SELF',
    'Human project steward who opened this Dragon Cycle.',
    p_actor_id
  )
  returning id into v_participation_id;

  perform private.b1_record_decision(
    v_project.cell_id,
    'DRAGON_CYCLE_OPEN',
    'ALLOW',
    'DRAGON_CYCLE',
    v_cycle_id,
    p_actor_id,
    'cycle.manage',
    'PROJECT',
    p_project_id,
    'human project steward opened a project-scoped Dragon Cycle',
    p_command_id,
    null,
    null,
    jsonb_build_object(
      'parent_cycle_id', p_parent_cycle_id,
      'origin_record_id', p_origin_record_id
    )
  );

  perform private.b1_record_event(
    v_project.cell_id,
    'DRAGON_CYCLE_OPENED',
    'DRAGON_CYCLE',
    v_cycle_id,
    'DRAGON_CYCLE',
    v_cycle_id,
    p_actor_id,
    'cycle.manage',
    'PROJECT',
    p_project_id,
    p_command_id,
    null,
    1,
    'PROJECT',
    jsonb_build_object(
      'phase', 'DREAMING',
      'state', 'OPEN',
      'parent_cycle_id', p_parent_cycle_id,
      'origin_record_id', p_origin_record_id
    )
  );

  perform private.b1_record_event(
    v_project.cell_id,
    'CYCLE_PARTICIPANT_ADDED',
    'DRAGON_CYCLE',
    v_cycle_id,
    'CYCLE_PARTICIPATION',
    v_participation_id,
    p_actor_id,
    'cycle.manage',
    'PROJECT',
    p_project_id,
    p_command_id,
    1,
    1,
    'PROJECT',
    jsonb_build_object(
      'actor_id', p_actor_id,
      'affiliation', 'SELF',
      'social_role', 'STEWARD',
      'mode', 'SELF'
    )
  );

  v_result := jsonb_build_object(
    'ok', true,
    'dragon_cycle_id', v_cycle_id,
    'project_id', p_project_id,
    'phase', 'DREAMING',
    'state', 'OPEN',
    'material_version', 1
  );

  perform private.b1_finish_command(
    p_actor_id,
    p_idempotency_key,
    v_result
  );

  return v_result;
end;
$$;

create or replace function public.ddr_add_cycle_ai_participant(
  p_actor_id uuid,
  p_cycle_id uuid,
  p_ai_actor_id uuid,
  p_affiliation text,
  p_social_role text,
  p_principal_actor_id uuid,
  p_mode text,
  p_mandate text,
  p_command_id uuid,
  p_idempotency_key text
)
returns jsonb
language plpgsql
security definer
set search_path = public, private, pg_temp
as $$
declare
  v_cycle public.dragon_cycles%rowtype;
  v_project public.projects%rowtype;
  v_ai public.actors%rowtype;
  v_replayed boolean;
  v_result jsonb;
  v_participation_id uuid;
  v_before integer;
  v_payload jsonb;
begin
  select * into v_cycle
  from public.dragon_cycles
  where id = p_cycle_id;

  if not found then
    raise exception using errcode = 'P0001', message = 'CZ404:DRAGON_CYCLE_NOT_FOUND';
  end if;

  if v_cycle.state <> 'OPEN' then
    raise exception using errcode = 'P0001', message = 'CZ409:CYCLE_NOT_OPEN';
  end if;

  select * into v_project
  from public.projects
  where id = v_cycle.project_id;

  perform private.b1_authorize_actor(
    p_actor_id,
    'cycle.manage',
    'PROJECT',
    v_cycle.project_id
  );

  if v_project.steward_actor_id <> p_actor_id
     or (select kind from public.actors where id = p_actor_id) <> 'PERSON' then
    raise exception using
      errcode = '42501',
      message = 'CZ403:HUMAN_PROJECT_STEWARD_REQUIRED';
  end if;

  select * into v_ai
  from public.actors
  where id = p_ai_actor_id;

  if not found or v_ai.kind <> 'AI_AGENT' then
    raise exception using errcode = '22023', message = 'CZ422:AI_AGENT_REQUIRED';
  end if;

  if not private.b1_current_profile_controls_actor(p_ai_actor_id) then
    raise exception using
      errcode = '42501',
      message = 'CZ403:AI_OPERATOR_CONTROL_REQUIRED';
  end if;

  if p_affiliation not in ('ROOM','PERSONAL') then
    raise exception using errcode = '22023', message = 'CZ422:INVALID_AI_AFFILIATION';
  end if;

  if p_mode not in ('ASSIST','AMPLIFY') then
    raise exception using
      errcode = '22023',
      message = 'CZ422:AI_AUTHORITY_MODE_NOT_AVAILABLE_IN_BE001';
  end if;

  if p_social_role not in (
    'PARTICIPANT',
    'FACILITATOR',
    'RESEARCHER',
    'CRITIC',
    'ARCHIVIST'
  ) then
    raise exception using errcode = '22023', message = 'CZ422:INVALID_AI_SOCIAL_ROLE';
  end if;

  if p_affiliation = 'ROOM' and p_principal_actor_id is not null then
    raise exception using
      errcode = '22023',
      message = 'CZ422:ROOM_AI_HAS_NO_PERSONAL_PRINCIPAL';
  end if;

  if p_affiliation = 'PERSONAL'
     and p_principal_actor_id is distinct from p_actor_id then
    raise exception using
      errcode = '22023',
      message = 'CZ422:PERSONAL_AI_PRINCIPAL_MISMATCH';
  end if;

  if char_length(trim(coalesce(p_mandate, ''))) < 3
     or char_length(trim(coalesce(p_mandate, ''))) > 2000 then
    raise exception using errcode = '22023', message = 'CZ422:INVALID_AI_MANDATE';
  end if;

  if exists (
    select 1
    from public.cycle_participations cp
    where cp.cycle_id = p_cycle_id
      and cp.actor_id = p_ai_actor_id
  ) then
    raise exception using errcode = 'P0001', message = 'CZ409:CYCLE_PARTICIPANT_EXISTS';
  end if;

  v_payload := jsonb_build_object(
    'cycle_id', p_cycle_id,
    'ai_actor_id', p_ai_actor_id,
    'affiliation', p_affiliation,
    'social_role', p_social_role,
    'principal_actor_id', p_principal_actor_id,
    'mode', p_mode,
    'mandate', trim(p_mandate)
  );

  select replayed, saved_result
  into v_replayed, v_result
  from private.b1_begin_command(
    v_cycle.cell_id,
    p_actor_id,
    p_command_id,
    p_idempotency_key,
    'dragon_cycle.ai_participant.add',
    v_payload
  );

  if v_replayed then
    return v_result;
  end if;

  select material_version into v_before
  from public.dragon_cycles
  where id = p_cycle_id
  for update;

  insert into public.cycle_participations(
    cycle_id,
    actor_id,
    affiliation,
    social_role,
    principal_actor_id,
    mode,
    mandate,
    created_by_actor_id
  ) values (
    p_cycle_id,
    p_ai_actor_id,
    p_affiliation,
    p_social_role,
    p_principal_actor_id,
    p_mode,
    trim(p_mandate),
    p_actor_id
  )
  returning id into v_participation_id;

  update public.dragon_cycles
  set material_version = material_version + 1
  where id = p_cycle_id;

  perform private.b1_record_decision(
    v_cycle.cell_id,
    'CYCLE_AI_PARTICIPANT_ADD',
    'ALLOW',
    'CYCLE_PARTICIPATION',
    v_participation_id,
    p_actor_id,
    'cycle.manage',
    'PROJECT',
    v_cycle.project_id,
    'human steward added an operator-controlled AI participant without implicit decision or execution authority',
    p_command_id,
    null,
    null,
    jsonb_build_object(
      'ai_actor_id', p_ai_actor_id,
      'affiliation', p_affiliation,
      'social_role', p_social_role,
      'mode', p_mode,
      'implicit_project_role', false,
      'implicit_authority', false
    )
  );

  perform private.b1_record_event(
    v_cycle.cell_id,
    'CYCLE_PARTICIPANT_ADDED',
    'DRAGON_CYCLE',
    p_cycle_id,
    'CYCLE_PARTICIPATION',
    v_participation_id,
    p_actor_id,
    'cycle.manage',
    'PROJECT',
    v_cycle.project_id,
    p_command_id,
    v_before,
    v_before + 1,
    'PROJECT',
    jsonb_build_object(
      'actor_id', p_ai_actor_id,
      'actor_kind', 'AI_AGENT',
      'affiliation', p_affiliation,
      'social_role', p_social_role,
      'principal_actor_id', p_principal_actor_id,
      'mode', p_mode,
      'implicit_authority', false
    )
  );

  v_result := jsonb_build_object(
    'ok', true,
    'cycle_participation_id', v_participation_id,
    'dragon_cycle_id', p_cycle_id,
    'ai_actor_id', p_ai_actor_id,
    'material_version', v_before + 1
  );

  perform private.b1_finish_command(
    p_actor_id,
    p_idempotency_key,
    v_result
  );

  return v_result;
end;
$$;

create or replace function public.ddr_record_cycle_record(
  p_actor_id uuid,
  p_cycle_id uuid,
  p_content_class text,
  p_content text,
  p_provenance jsonb,
  p_command_id uuid,
  p_idempotency_key text
)
returns jsonb
language plpgsql
security definer
set search_path = public, private, pg_temp
as $$
declare
  v_cycle public.dragon_cycles%rowtype;
  v_replayed boolean;
  v_result jsonb;
  v_record_id uuid;
  v_before integer;
  v_payload jsonb;
begin
  select * into v_cycle
  from public.dragon_cycles
  where id = p_cycle_id;

  if not found then
    raise exception using errcode = 'P0001', message = 'CZ404:DRAGON_CYCLE_NOT_FOUND';
  end if;

  if v_cycle.state <> 'OPEN' then
    raise exception using errcode = 'P0001', message = 'CZ409:CYCLE_NOT_OPEN';
  end if;

  if not private.ddr_current_profile_active_participant(
    p_cycle_id,
    p_actor_id
  ) then
    raise exception using
      errcode = '42501',
      message = 'CZ403:ACTIVE_CYCLE_PARTICIPATION_REQUIRED';
  end if;

  if p_content_class not in (
    'ORIGINAL_RECORD',
    'INTERPRETATION',
    'SYNTHESIS'
  ) then
    raise exception using errcode = '22023', message = 'CZ422:INVALID_RECORD_CLASS';
  end if;

  if char_length(trim(coalesce(p_content, ''))) < 1
     or char_length(trim(coalesce(p_content, ''))) > 8000 then
    raise exception using errcode = '22023', message = 'CZ422:INVALID_RECORD_CONTENT';
  end if;

  v_payload := jsonb_build_object(
    'cycle_id', p_cycle_id,
    'content_class', p_content_class,
    'content', trim(p_content),
    'provenance', coalesce(p_provenance, '{}'::jsonb),
    'phase_context', v_cycle.current_phase
  );

  select replayed, saved_result
  into v_replayed, v_result
  from private.b1_begin_command(
    v_cycle.cell_id,
    p_actor_id,
    p_command_id,
    p_idempotency_key,
    'dragon_cycle.record.create',
    v_payload
  );

  if v_replayed then
    return v_result;
  end if;

  select material_version into v_before
  from public.dragon_cycles
  where id = p_cycle_id
  for update;

  insert into public.cycle_records(
    cycle_id,
    author_actor_id,
    content_class,
    phase_context,
    content,
    visibility,
    provenance
  ) values (
    p_cycle_id,
    p_actor_id,
    p_content_class,
    v_cycle.current_phase,
    trim(p_content),
    'PROJECT',
    coalesce(p_provenance, '{}'::jsonb)
  )
  returning id into v_record_id;

  update public.dragon_cycles
  set material_version = material_version + 1
  where id = p_cycle_id;

  perform private.b1_record_event(
    v_cycle.cell_id,
    'CYCLE_RECORD_CREATED',
    'DRAGON_CYCLE',
    p_cycle_id,
    'CYCLE_RECORD',
    v_record_id,
    p_actor_id,
    'cycle.record',
    'PROJECT',
    v_cycle.project_id,
    p_command_id,
    v_before,
    v_before + 1,
    'PROJECT',
    jsonb_build_object(
      'content_class', p_content_class,
      'phase_context', v_cycle.current_phase,
      'authority_basis', 'ACTIVE_CYCLE_PARTICIPATION'
    )
  );

  v_result := jsonb_build_object(
    'ok', true,
    'cycle_record_id', v_record_id,
    'dragon_cycle_id', p_cycle_id,
    'content_class', p_content_class,
    'phase_context', v_cycle.current_phase,
    'material_version', v_before + 1
  );

  perform private.b1_finish_command(
    p_actor_id,
    p_idempotency_key,
    v_result
  );

  return v_result;
end;
$$;

create or replace function public.ddr_relate_cycle_records(
  p_actor_id uuid,
  p_cycle_id uuid,
  p_source_record_id uuid,
  p_target_record_id uuid,
  p_relation_type text,
  p_command_id uuid,
  p_idempotency_key text
)
returns jsonb
language plpgsql
security definer
set search_path = public, private, pg_temp
as $$
declare
  v_cycle public.dragon_cycles%rowtype;
  v_source public.cycle_records%rowtype;
  v_target public.cycle_records%rowtype;
  v_actor_kind text;
  v_replayed boolean;
  v_result jsonb;
  v_relation_id uuid;
  v_before integer;
  v_payload jsonb;
begin
  select * into v_cycle
  from public.dragon_cycles
  where id = p_cycle_id;

  if not found then
    raise exception using errcode = 'P0001', message = 'CZ404:DRAGON_CYCLE_NOT_FOUND';
  end if;

  if v_cycle.state <> 'OPEN' then
    raise exception using errcode = 'P0001', message = 'CZ409:CYCLE_NOT_OPEN';
  end if;

  if not private.ddr_current_profile_active_participant(
    p_cycle_id,
    p_actor_id
  ) then
    raise exception using
      errcode = '42501',
      message = 'CZ403:ACTIVE_CYCLE_PARTICIPATION_REQUIRED';
  end if;

  select * into v_source
  from public.cycle_records
  where id = p_source_record_id;

  if not found then
    raise exception using errcode = 'P0001', message = 'CZ404:SOURCE_RECORD_NOT_FOUND';
  end if;

  select * into v_target
  from public.cycle_records
  where id = p_target_record_id;

  if not found then
    raise exception using errcode = 'P0001', message = 'CZ404:TARGET_RECORD_NOT_FOUND';
  end if;

  if v_source.cycle_id <> p_cycle_id
     or v_target.cycle_id <> p_cycle_id then
    raise exception using
      errcode = '22023',
      message = 'CZ422:CROSS_CYCLE_RELATION_DENIED';
  end if;

  if v_source.author_actor_id <> p_actor_id then
    raise exception using
      errcode = '42501',
      message = 'CZ403:SOURCE_RECORD_AUTHOR_REQUIRED';
  end if;

  if p_relation_type not in (
    'RESPONDS_TO',
    'RESTATES',
    'CONFIRMS',
    'CORRECTS',
    'DERIVES_FROM'
  ) then
    raise exception using errcode = '22023', message = 'CZ422:INVALID_RECORD_RELATION';
  end if;

  select kind into v_actor_kind
  from public.actors
  where id = p_actor_id;

  if p_relation_type = 'RESTATES' then
    if v_source.content_class <> 'INTERPRETATION'
       or v_target.content_class <> 'ORIGINAL_RECORD' then
      raise exception using
        errcode = '22023',
        message = 'CZ422:INVALID_RESTATEMENT_SHAPE';
    end if;
  elsif p_relation_type = 'CONFIRMS' then
    if v_actor_kind <> 'PERSON' then
      raise exception using
        errcode = '42501',
        message = 'CZ403:HUMAN_CONFIRMATION_REQUIRED';
    end if;

    if v_source.content_class <> 'ORIGINAL_RECORD'
       or v_target.content_class <> 'INTERPRETATION' then
      raise exception using
        errcode = '22023',
        message = 'CZ422:INVALID_CONFIRMATION_SHAPE';
    end if;

    if not exists (
      select 1
      from public.cycle_record_relations rr
      where rr.cycle_id = p_cycle_id
        and rr.source_record_id = p_target_record_id
        and rr.target_record_id = p_source_record_id
        and rr.relation_type = 'RESTATES'
    ) then
      raise exception using
        errcode = '22023',
        message = 'CZ422:CONFIRMATION_REQUIRES_RESTATEMENT';
    end if;
  elsif p_relation_type = 'CORRECTS' then
    if v_actor_kind <> 'PERSON' then
      raise exception using
        errcode = '42501',
        message = 'CZ403:HUMAN_CORRECTION_REQUIRED';
    end if;

    if v_source.content_class <> 'ORIGINAL_RECORD'
       or v_target.content_class <> 'INTERPRETATION' then
      raise exception using
        errcode = '22023',
        message = 'CZ422:INVALID_CORRECTION_SHAPE';
    end if;

    if not exists (
      select 1
      from public.cycle_record_relations rr
      join public.cycle_records original
        on original.id = rr.target_record_id
      where rr.cycle_id = p_cycle_id
        and rr.source_record_id = p_target_record_id
        and rr.relation_type = 'RESTATES'
        and original.author_actor_id = p_actor_id
    ) then
      raise exception using
        errcode = '22023',
        message = 'CZ422:CORRECTION_REQUIRES_OWN_RESTATEMENT';
    end if;
  elsif p_relation_type = 'DERIVES_FROM' then
    if v_source.content_class not in ('INTERPRETATION','SYNTHESIS') then
      raise exception using
        errcode = '22023',
        message = 'CZ422:DERIVATION_SOURCE_CLASS_REQUIRED';
    end if;
  end if;

  v_payload := jsonb_build_object(
    'cycle_id', p_cycle_id,
    'source_record_id', p_source_record_id,
    'target_record_id', p_target_record_id,
    'relation_type', p_relation_type
  );

  select replayed, saved_result
  into v_replayed, v_result
  from private.b1_begin_command(
    v_cycle.cell_id,
    p_actor_id,
    p_command_id,
    p_idempotency_key,
    'dragon_cycle.record.relate',
    v_payload
  );

  if v_replayed then
    return v_result;
  end if;

  select material_version into v_before
  from public.dragon_cycles
  where id = p_cycle_id
  for update;

  insert into public.cycle_record_relations(
    cycle_id,
    source_record_id,
    target_record_id,
    relation_type,
    asserted_by_actor_id
  ) values (
    p_cycle_id,
    p_source_record_id,
    p_target_record_id,
    p_relation_type,
    p_actor_id
  )
  returning id into v_relation_id;

  update public.dragon_cycles
  set material_version = material_version + 1
  where id = p_cycle_id;

  perform private.b1_record_event(
    v_cycle.cell_id,
    'CYCLE_RECORD_RELATION_CREATED',
    'DRAGON_CYCLE',
    p_cycle_id,
    'CYCLE_RECORD_RELATION',
    v_relation_id,
    p_actor_id,
    'cycle.record',
    'PROJECT',
    v_cycle.project_id,
    p_command_id,
    v_before,
    v_before + 1,
    'PROJECT',
    jsonb_build_object(
      'source_record_id', p_source_record_id,
      'target_record_id', p_target_record_id,
      'relation_type', p_relation_type,
      'authority_basis', 'ACTIVE_CYCLE_PARTICIPATION'
    )
  );

  v_result := jsonb_build_object(
    'ok', true,
    'cycle_record_relation_id', v_relation_id,
    'dragon_cycle_id', p_cycle_id,
    'relation_type', p_relation_type,
    'material_version', v_before + 1
  );

  perform private.b1_finish_command(
    p_actor_id,
    p_idempotency_key,
    v_result
  );

  return v_result;
end;
$$;

create or replace function public.ddr_set_cycle_direction(
  p_actor_id uuid,
  p_cycle_id uuid,
  p_direction_record_id uuid,
  p_command_id uuid,
  p_idempotency_key text
)
returns jsonb
language plpgsql
security definer
set search_path = public, private, pg_temp
as $$
declare
  v_cycle public.dragon_cycles%rowtype;
  v_project public.projects%rowtype;
  v_direction public.cycle_records%rowtype;
  v_replayed boolean;
  v_result jsonb;
  v_before integer;
  v_payload jsonb;
begin
  select * into v_cycle
  from public.dragon_cycles
  where id = p_cycle_id;

  if not found then
    raise exception using errcode = 'P0001', message = 'CZ404:DRAGON_CYCLE_NOT_FOUND';
  end if;

  if v_cycle.state <> 'OPEN' then
    raise exception using errcode = 'P0001', message = 'CZ409:CYCLE_NOT_OPEN';
  end if;

  select * into v_project
  from public.projects
  where id = v_cycle.project_id;

  perform private.b1_authorize_actor(
    p_actor_id,
    'cycle.manage',
    'PROJECT',
    v_cycle.project_id
  );

  if v_project.steward_actor_id <> p_actor_id
     or (select kind from public.actors where id = p_actor_id) <> 'PERSON' then
    raise exception using
      errcode = '42501',
      message = 'CZ403:HUMAN_PROJECT_STEWARD_REQUIRED';
  end if;

  select * into v_direction
  from public.cycle_records
  where id = p_direction_record_id;

  if not found or v_direction.cycle_id <> p_cycle_id then
    raise exception using
      errcode = '22023',
      message = 'CZ422:DIRECTION_RECORD_MUST_BELONG_TO_CYCLE';
  end if;

  v_payload := jsonb_build_object(
    'cycle_id', p_cycle_id,
    'direction_record_id', p_direction_record_id
  );

  select replayed, saved_result
  into v_replayed, v_result
  from private.b1_begin_command(
    v_cycle.cell_id,
    p_actor_id,
    p_command_id,
    p_idempotency_key,
    'dragon_cycle.direction.set',
    v_payload
  );

  if v_replayed then
    return v_result;
  end if;

  select material_version into v_before
  from public.dragon_cycles
  where id = p_cycle_id
  for update;

  update public.dragon_cycles
  set current_direction_record_id = p_direction_record_id,
      material_version = material_version + 1
  where id = p_cycle_id;

  perform private.b1_record_decision(
    v_cycle.cell_id,
    'CYCLE_DIRECTION_SET',
    'ALLOW',
    'DRAGON_CYCLE',
    p_cycle_id,
    p_actor_id,
    'cycle.manage',
    'PROJECT',
    v_cycle.project_id,
    'authorized human steward selected a CycleRecord as current direction; record authorship remains distinct from direction authority',
    p_command_id,
    null,
    null,
    jsonb_build_object(
      'direction_record_id', p_direction_record_id,
      'direction_record_author_id', v_direction.author_actor_id,
      'direction_record_class', v_direction.content_class
    )
  );

  perform private.b1_record_event(
    v_cycle.cell_id,
    'CYCLE_DIRECTION_SET',
    'DRAGON_CYCLE',
    p_cycle_id,
    'CYCLE_RECORD',
    p_direction_record_id,
    p_actor_id,
    'cycle.manage',
    'PROJECT',
    v_cycle.project_id,
    p_command_id,
    v_before,
    v_before + 1,
    'PROJECT',
    jsonb_build_object(
      'direction_record_id', p_direction_record_id,
      'direction_record_author_id', v_direction.author_actor_id,
      'direction_record_class', v_direction.content_class,
      'human_direction_actor_id', p_actor_id
    )
  );

  v_result := jsonb_build_object(
    'ok', true,
    'dragon_cycle_id', p_cycle_id,
    'direction_record_id', p_direction_record_id,
    'material_version', v_before + 1
  );

  perform private.b1_finish_command(
    p_actor_id,
    p_idempotency_key,
    v_result
  );

  return v_result;
end;
$$;

create or replace function public.ddr_transition_cycle_phase(
  p_actor_id uuid,
  p_cycle_id uuid,
  p_to_phase text,
  p_reason text,
  p_command_id uuid,
  p_idempotency_key text
)
returns jsonb
language plpgsql
security definer
set search_path = public, private, pg_temp
as $$
declare
  v_cycle public.dragon_cycles%rowtype;
  v_project public.projects%rowtype;
  v_replayed boolean;
  v_result jsonb;
  v_before integer;
  v_from_phase text;
  v_payload jsonb;
begin
  select * into v_cycle
  from public.dragon_cycles
  where id = p_cycle_id;

  if not found then
    raise exception using errcode = 'P0001', message = 'CZ404:DRAGON_CYCLE_NOT_FOUND';
  end if;

  if v_cycle.state <> 'OPEN' then
    raise exception using errcode = 'P0001', message = 'CZ409:CYCLE_NOT_OPEN';
  end if;

  select * into v_project
  from public.projects
  where id = v_cycle.project_id;

  perform private.b1_authorize_actor(
    p_actor_id,
    'cycle.manage',
    'PROJECT',
    v_cycle.project_id
  );

  if v_project.steward_actor_id <> p_actor_id
     or (select kind from public.actors where id = p_actor_id) <> 'PERSON' then
    raise exception using
      errcode = '42501',
      message = 'CZ403:HUMAN_PROJECT_STEWARD_REQUIRED';
  end if;

  if char_length(trim(coalesce(p_reason, ''))) < 10
     or char_length(trim(coalesce(p_reason, ''))) > 2000 then
    raise exception using errcode = '22023', message = 'CZ422:INVALID_PHASE_REASON';
  end if;

  if not (
    (v_cycle.current_phase = 'DREAMING' and p_to_phase = 'PLANNING')
    or
    (v_cycle.current_phase = 'PLANNING' and p_to_phase = 'DREAMING')
  ) then
    raise exception using
      errcode = 'P0001',
      message = 'CZ409:PHASE_TRANSITION_NOT_AVAILABLE_IN_BE001';
  end if;

  if v_cycle.current_phase = 'DREAMING'
     and p_to_phase = 'PLANNING'
     and v_cycle.current_direction_record_id is null then
    raise exception using
      errcode = 'P0001',
      message = 'CZ409:HUMAN_DIRECTION_REQUIRED_BEFORE_PLANNING';
  end if;

  v_payload := jsonb_build_object(
    'cycle_id', p_cycle_id,
    'from_phase', v_cycle.current_phase,
    'to_phase', p_to_phase,
    'reason', trim(p_reason)
  );

  select replayed, saved_result
  into v_replayed, v_result
  from private.b1_begin_command(
    v_cycle.cell_id,
    p_actor_id,
    p_command_id,
    p_idempotency_key,
    'dragon_cycle.phase.transition',
    v_payload
  );

  if v_replayed then
    return v_result;
  end if;

  select current_phase, material_version
  into v_from_phase, v_before
  from public.dragon_cycles
  where id = p_cycle_id
  for update;

  update public.dragon_cycles
  set current_phase = p_to_phase,
      material_version = material_version + 1
  where id = p_cycle_id;

  perform private.b1_record_decision(
    v_cycle.cell_id,
    'CYCLE_PHASE_CHANGE',
    'ALLOW',
    'DRAGON_CYCLE',
    p_cycle_id,
    p_actor_id,
    'cycle.manage',
    'PROJECT',
    v_cycle.project_id,
    trim(p_reason),
    p_command_id,
    null,
    null,
    jsonb_build_object(
      'from_phase', v_from_phase,
      'to_phase', p_to_phase
    )
  );

  perform private.b1_record_event(
    v_cycle.cell_id,
    'CYCLE_PHASE_CHANGED',
    'DRAGON_CYCLE',
    p_cycle_id,
    'DRAGON_CYCLE',
    p_cycle_id,
    p_actor_id,
    'cycle.manage',
    'PROJECT',
    v_cycle.project_id,
    p_command_id,
    v_before,
    v_before + 1,
    'PROJECT',
    jsonb_build_object(
      'from_phase', v_from_phase,
      'to_phase', p_to_phase,
      'reason', trim(p_reason)
    )
  );

  v_result := jsonb_build_object(
    'ok', true,
    'dragon_cycle_id', p_cycle_id,
    'from_phase', v_from_phase,
    'to_phase', p_to_phase,
    'material_version', v_before + 1
  );

  perform private.b1_finish_command(
    p_actor_id,
    p_idempotency_key,
    v_result
  );

  return v_result;
end;
$$;

alter table public.dragon_cycles enable row level security;
alter table public.cycle_participations enable row level security;
alter table public.cycle_records enable row level security;
alter table public.cycle_record_relations enable row level security;

revoke all on public.dragon_cycles from anon, authenticated;
revoke all on public.cycle_participations from anon, authenticated;
revoke all on public.cycle_records from anon, authenticated;
revoke all on public.cycle_record_relations from anon, authenticated;

grant select on public.dragon_cycles to authenticated;
grant select on public.cycle_participations to authenticated;
grant select on public.cycle_records to authenticated;
grant select on public.cycle_record_relations to authenticated;

create policy dragon_cycles_read_participant
on public.dragon_cycles
for select to authenticated
using (private.ddr_can_read_cycle(id));

create policy cycle_participations_read_participant
on public.cycle_participations
for select to authenticated
using (private.ddr_can_read_cycle(cycle_id));

create policy cycle_records_read_participant
on public.cycle_records
for select to authenticated
using (private.ddr_can_read_cycle(cycle_id));

create policy cycle_record_relations_read_participant
on public.cycle_record_relations
for select to authenticated
using (private.ddr_can_read_cycle(cycle_id));

revoke all on function public.ddr_open_cycle(
  uuid,uuid,uuid,uuid,uuid,text
) from public;

revoke all on function public.ddr_add_cycle_ai_participant(
  uuid,uuid,uuid,text,text,uuid,text,text,uuid,text
) from public;

revoke all on function public.ddr_record_cycle_record(
  uuid,uuid,text,text,jsonb,uuid,text
) from public;

revoke all on function public.ddr_relate_cycle_records(
  uuid,uuid,uuid,uuid,text,uuid,text
) from public;

revoke all on function public.ddr_set_cycle_direction(
  uuid,uuid,uuid,uuid,text
) from public;

revoke all on function public.ddr_transition_cycle_phase(
  uuid,uuid,text,text,uuid,text
) from public;

grant execute on function public.ddr_open_cycle(
  uuid,uuid,uuid,uuid,uuid,text
) to authenticated;

grant execute on function public.ddr_add_cycle_ai_participant(
  uuid,uuid,uuid,text,text,uuid,text,text,uuid,text
) to authenticated;

grant execute on function public.ddr_record_cycle_record(
  uuid,uuid,text,text,jsonb,uuid,text
) to authenticated;

grant execute on function public.ddr_relate_cycle_records(
  uuid,uuid,uuid,uuid,text,uuid,text
) to authenticated;

grant execute on function public.ddr_set_cycle_direction(
  uuid,uuid,uuid,uuid,text
) to authenticated;

grant execute on function public.ddr_transition_cycle_phase(
  uuid,uuid,text,text,uuid,text
) to authenticated;

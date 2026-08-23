-- DATA-FOUNDATION-001B — minimal enforceable content blocking for project_intents.content.
--
-- Scope: one real high-risk free-text object only.
--
-- This migration does NOT:
-- - determine legal compliance or choose a lawful basis;
-- - delete or anonymise historical content;
-- - equate BLOCKED with WITHDRAWN, REJECTED or ILLEGAL;
-- - create a generic privacy platform.
--
-- BLOCKED != ELIMINATED
-- BLOCKED != ANONYMISED
-- BLOCKED != WITHDRAWN
-- BLOCKED != LEGAL_CONCLUSION

create table public.project_intent_content_blocks (
  project_intent_id uuid primary key,
  project_id uuid not null,
  blocked_by_actor_id uuid not null references public.actors(id) on delete restrict,
  reason_code text not null check (
    reason_code in (
      'DATA_SUBJECT_REQUEST',
      'PURPOSE_OR_NECESSITY_REVIEW',
      'COMPLIANCE_REVIEW',
      'SECURITY_PRECAUTION',
      'CONTROLLER_DIRECTION'
    )
  ),
  command_id uuid not null unique,
  blocked_at timestamptz not null default now(),
  foreign key (project_id, project_intent_id)
    references public.project_intents(project_id, id)
    on delete restrict
);

create index project_intent_content_blocks_project
  on public.project_intent_content_blocks(project_id, blocked_at, project_intent_id);

create trigger project_intent_content_blocks_append_only
before update or delete on public.project_intent_content_blocks
for each row execute function private.prevent_append_only_mutation();

insert into public.capability_definitions(code, description)
values (
  'privacy.intent_content_block',
  'Suspend ordinary read access to exact project-intent content without deleting, anonymising, withdrawing or changing semantic history.'
)
on conflict (code) do nothing;

insert into public.role_capabilities(role_id, capability_code) values
  ('00000000-0000-4000-8000-00000000c201', 'privacy.intent_content_block'),
  ('00000000-0000-4000-8000-00000000c202', 'privacy.intent_content_block')
on conflict do nothing;

create or replace function private.data001b_project_intent_content_is_blocked(
  p_intent_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.project_intent_content_blocks b
    where b.project_intent_id = p_intent_id
  );
$$;

drop policy if exists project_intents_read_operational_or_authorized
  on public.project_intents;

create policy project_intents_read_operational_or_authorized
on public.project_intents
for select to anon, authenticated
using (
  not private.data001b_project_intent_content_is_blocked(id)
  and (
    (
      private.project_is_public(project_id)
      and exists (
        select 1
        from public.projects p
        where p.id = project_intents.project_id
          and p.current_intent_record_id = project_intents.id
      )
    )
    or private.can_manage_project(project_id, auth.uid())
    or (
      recorded_by_actor_id is not null
      and private.b1_current_profile_controls_actor(recorded_by_actor_id)
    )
    or (
      content_origin_actor_id is not null
      and private.b1_current_profile_controls_actor(content_origin_actor_id)
    )
  )
);

create or replace function public.data001b_project_intent_shell(
  p_intent_id uuid
)
returns table(
  intent_id uuid,
  project_id uuid,
  kind text,
  version integer,
  created_at timestamptz,
  provenance_status text,
  recorded_by_actor_id uuid,
  content_origin_actor_id uuid,
  source_intent_id uuid,
  derivation_type text,
  origin_mechanism text,
  operative boolean,
  content_state text
)
language sql
stable
security definer
set search_path = public, private, pg_temp
as $$
  select
    i.id,
    i.project_id,
    i.kind,
    i.version,
    i.created_at,
    i.provenance_status,
    i.recorded_by_actor_id,
    i.content_origin_actor_id,
    i.source_intent_id,
    i.derivation_type,
    i.origin_mechanism,
    (p.current_intent_record_id = i.id) as operative,
    case
      when private.data001b_project_intent_content_is_blocked(i.id)
        then 'BLOCKED'
      else 'ACTIVE'
    end as content_state
  from public.project_intents i
  join public.projects p
    on p.id = i.project_id
  where i.id = p_intent_id
    and (
      (
        private.project_is_public(i.project_id)
        and p.current_intent_record_id = i.id
      )
      or private.can_manage_project(i.project_id, auth.uid())
      or (
        i.recorded_by_actor_id is not null
        and private.b1_current_profile_controls_actor(i.recorded_by_actor_id)
      )
      or (
        i.content_origin_actor_id is not null
        and private.b1_current_profile_controls_actor(i.content_origin_actor_id)
      )
    );
$$;

create or replace function private.data001b_guard_blocked_current_intent()
returns trigger
language plpgsql
security definer
set search_path = public, private, pg_temp
as $$
begin
  if new.current_intent_record_id is not null
     and private.data001b_project_intent_content_is_blocked(
       new.current_intent_record_id
     ) then
    raise exception using
      errcode = 'P0001',
      message = 'CZ409:INTENT_CONTENT_BLOCKED';
  end if;
  return new;
end;
$$;

drop trigger if exists data001b_guard_blocked_current_intent
  on public.projects;

create trigger data001b_guard_blocked_current_intent
before insert or update of current_intent_record_id
on public.projects
for each row execute function private.data001b_guard_blocked_current_intent();

create or replace function public.data001b_block_project_intent_content(
  p_actor_id uuid,
  p_intent_id uuid,
  p_reason_code text,
  p_command_id uuid,
  p_idempotency_key text
)
returns jsonb
language plpgsql
security definer
set search_path = public, private, pg_temp
as $$
declare
  v_intent public.project_intents%rowtype;
  v_project public.projects%rowtype;
  v_actor_kind text;
  v_replayed boolean;
  v_result jsonb;
  v_payload jsonb;
  v_before integer;
  v_after integer;
  v_current boolean;
begin
  if p_reason_code not in (
    'DATA_SUBJECT_REQUEST',
    'PURPOSE_OR_NECESSITY_REVIEW',
    'COMPLIANCE_REVIEW',
    'SECURITY_PRECAUTION',
    'CONTROLLER_DIRECTION'
  ) then
    raise exception using
      errcode = 'P0001',
      message = 'CZ422:INVALID_CONTENT_BLOCK_REASON';
  end if;

  select * into v_intent
  from public.project_intents
  where id = p_intent_id;

  if not found then
    raise exception using
      errcode = 'P0001',
      message = 'CZ404:PROJECT_INTENT_NOT_FOUND';
  end if;

  select * into v_project
  from public.projects
  where id = v_intent.project_id;

  if not found then
    raise exception using
      errcode = 'P0001',
      message = 'CZ404:PROJECT_NOT_FOUND';
  end if;

  perform private.b1_authorize_actor(
    p_actor_id,
    'privacy.intent_content_block',
    'PROJECT',
    v_project.id
  );

  select kind into v_actor_kind
  from public.actors
  where id = p_actor_id;

  if v_actor_kind in ('AI_AGENT', 'SYSTEM') then
    raise exception using
      errcode = '42501',
      message = 'CZ403:HUMAN_PRIVACY_DIRECTION_REQUIRED';
  end if;

  v_payload := jsonb_build_object(
    'project_id', v_project.id,
    'intent_id', p_intent_id,
    'reason_code', p_reason_code
  );

  select replayed, saved_result
  into v_replayed, v_result
  from private.b1_begin_command(
    v_project.cell_id,
    p_actor_id,
    p_command_id,
    p_idempotency_key,
    'privacy.intent_content_block',
    v_payload
  );

  if v_replayed then
    return v_result;
  end if;

  select * into v_project
  from public.projects
  where id = v_intent.project_id
  for update;

  if exists (
    select 1
    from public.project_intent_content_blocks b
    where b.project_intent_id = p_intent_id
  ) then
    raise exception using
      errcode = 'P0001',
      message = 'CZ409:INTENT_CONTENT_ALREADY_BLOCKED';
  end if;

  v_before := v_project.version;
  v_after := v_project.version;
  v_current := v_project.current_intent_record_id = p_intent_id;

  insert into public.project_intent_content_blocks(
    project_intent_id,
    project_id,
    blocked_by_actor_id,
    reason_code,
    command_id
  ) values (
    p_intent_id,
    v_project.id,
    p_actor_id,
    p_reason_code,
    p_command_id
  );

  perform private.b1_record_decision(
    v_project.cell_id,
    'INTENT_CONTENT_BLOCK',
    'ALLOW',
    'PROJECT_INTENT',
    p_intent_id,
    p_actor_id,
    'privacy.intent_content_block',
    'PROJECT',
    v_project.id,
    'authorized content-lifecycle control suspended ordinary access to exact project-intent content',
    p_command_id,
    null,
    null,
    jsonb_build_object(
      'project_id', v_project.id,
      'reason_code', p_reason_code,
      'content_eliminated', false,
      'content_anonymised', false,
      'intent_withdrawn', false,
      'legal_compliance_determined', false
    )
  );

  if v_current then
    update public.projects
    set current_intent =
          'Conteúdo da intenção operativa bloqueado para leitura ordinária.',
        version = version + 1,
        updated_at = now()
    where id = v_project.id
    returning version into v_after;

    insert into public.events(
      project_id,
      event_type,
      title,
      description,
      actor_id,
      authorized_by_profile_id,
      material_version,
      payload
    ) values (
      v_project.id,
      'PROJECT_UPDATED',
      'Conteúdo da intenção operativa bloqueado',
      'A intenção continua semanticamente referenciada, mas seu conteúdo bruto não está disponível por leitura ordinária.',
      p_actor_id,
      auth.uid(),
      v_after,
      jsonb_build_object(
        'intent_id', p_intent_id,
        'content_state', 'BLOCKED',
        'reason_code', p_reason_code
      )
    );
  end if;

  perform private.b1_record_event(
    v_project.cell_id,
    'INTENT_CONTENT_BLOCKED',
    'PROJECT',
    v_project.id,
    'PROJECT_INTENT',
    p_intent_id,
    p_actor_id,
    'privacy.intent_content_block',
    'PROJECT',
    v_project.id,
    p_command_id,
    v_before,
    v_after,
    'PROJECT',
    jsonb_build_object(
      'reason_code', p_reason_code,
      'content_state', 'BLOCKED',
      'semantic_record_preserved', true,
      'content_eliminated', false,
      'content_anonymised', false,
      'intent_withdrawn', false,
      'legal_compliance_determined', false
    )
  );

  v_result := jsonb_build_object(
    'ok', true,
    'project_id', v_project.id,
    'intent_id', p_intent_id,
    'content_state', 'BLOCKED',
    'reason_code', p_reason_code,
    'semantic_record_preserved', true,
    'content_eliminated', false,
    'content_anonymised', false,
    'intent_withdrawn', false,
    'legal_compliance_determined', false,
    'operative_pointer_preserved', v_current
  );

  perform private.b1_finish_command(
    p_actor_id,
    p_idempotency_key,
    v_result
  );

  return v_result;
end;
$$;

create or replace function public.world002b_reconcile_project_intent(
  p_project_id uuid
)
returns text[]
language sql
stable
security definer
set search_path = public, private, pg_temp
as $$
  with p as (
    select *
    from public.projects
    where id = p_project_id
  ),
  current_record as (
    select i.*
    from public.project_intents i
    join p
      on p.current_intent_record_id = i.id
  ),
  current_block as (
    select b.*
    from public.project_intent_content_blocks b
    join p
      on p.current_intent_record_id = b.project_intent_id
  ),
  latest_current_decision as (
    select d.*
    from public.decision_records d
    join p on true
    where d.target_type = 'PROJECT_INTENT'
      and d.target_id = p.current_intent_record_id
      and d.decision_type in (
        'INTENT_ACCEPT',
        'INTENT_REJECT',
        'INTENT_WITHDRAW'
      )
    order by d.created_at desc, d.id desc
    limit 1
  ),
  checks as (
    select 'missing_project' as issue
    where not exists (select 1 from p)

    union all

    select 'current_intent_record_missing'
    where exists (
      select 1
      from p
      where current_intent_record_id is not null
    )
    and not exists (select 1 from current_record)

    union all

    select 'current_intent_cache_mismatch'
    where not exists (select 1 from current_block)
      and exists (
        select 1
        from p
        join current_record c on true
        where p.current_intent <> c.content
      )

    union all

    select 'blocked_current_intent_cache_leak'
    where exists (select 1 from current_block)
      and exists (
        select 1
        from p
        where p.current_intent <>
          'Conteúdo da intenção operativa bloqueado para leitura ordinária.'
      )

    union all

    select 'current_intent_without_acceptance'
    where exists (
      select 1
      from p
      join current_record c on true
      where p.current_intent_record_id is not null
        and not (
          exists (
            select 1
            from latest_current_decision d
            where d.decision_type = 'INTENT_ACCEPT'
          )
          or (
            not exists (select 1 from latest_current_decision)
            and c.accepted_at is not null
          )
        )
    )

    union all

    select 'nonlegacy_interpretation_missing_source'
    where exists (
      select 1
      from public.project_intents i
      where i.project_id = p_project_id
        and i.kind = 'INTERPRETATION'
        and i.provenance_status <> 'LEGACY_UNATTRIBUTED'
        and (
          i.source_intent_id is null
          or i.derivation_type <> 'INTERPRETS'
        )
    )

    union all

    select 'nonlegacy_record_missing_recorder'
    where exists (
      select 1
      from public.project_intents i
      where i.project_id = p_project_id
        and i.provenance_status <> 'LEGACY_UNATTRIBUTED'
        and i.recorded_by_actor_id is null
    )
  )
  select coalesce(
    array_agg(issue order by issue),
    '{}'::text[]
  )
  from checks;
$$;

create or replace function public.data001b_reconcile_project_intent_content(
  p_intent_id uuid
)
returns text[]
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  with i as (
    select *
    from public.project_intents
    where id = p_intent_id
  ),
  b as (
    select *
    from public.project_intent_content_blocks
    where project_intent_id = p_intent_id
  ),
  d as (
    select *
    from public.decision_records
    where decision_type = 'INTENT_CONTENT_BLOCK'
      and target_type = 'PROJECT_INTENT'
      and target_id = p_intent_id
  ),
  e as (
    select *
    from public.domain_events
    where event_type = 'INTENT_CONTENT_BLOCKED'
      and object_type = 'PROJECT_INTENT'
      and object_id = p_intent_id
  ),
  p as (
    select projects.*
    from public.projects projects
    join i on i.project_id = projects.id
  ),
  checks as (
    select 'missing_intent' as issue
    where not exists (select 1 from i)

    union all

    select 'block_without_decision'
    where exists (select 1 from b)
      and (select count(*) from d) <> 1

    union all

    select 'block_without_domain_event'
    where exists (select 1 from b)
      and (select count(*) from e) <> 1

    union all

    select 'decision_without_block'
    where exists (select 1 from d)
      and not exists (select 1 from b)

    union all

    select 'domain_event_without_block'
    where exists (select 1 from e)
      and not exists (select 1 from b)

    union all

    select 'block_reason_decision_mismatch'
    where exists (select 1 from b)
      and exists (select 1 from d)
      and exists (
        select 1
        from b
        cross join d
        where d.payload ->> 'reason_code' <> b.reason_code
      )

    union all

    select 'block_reason_event_mismatch'
    where exists (select 1 from b)
      and exists (select 1 from e)
      and exists (
        select 1
        from b
        cross join e
        where e.payload ->> 'reason_code' <> b.reason_code
      )

    union all

    select 'blocked_current_intent_cache_leak'
    where exists (select 1 from b)
      and exists (
        select 1
        from p
        where current_intent_record_id = p_intent_id
          and current_intent <>
            'Conteúdo da intenção operativa bloqueado para leitura ordinária.'
      )
  )
  select coalesce(
    array_agg(issue order by issue),
    '{}'::text[]
  )
  from checks;
$$;

revoke all on public.project_intent_content_blocks
from anon, authenticated;

revoke all on function
  private.data001b_project_intent_content_is_blocked(uuid)
from public;

revoke all on function
  private.data001b_guard_blocked_current_intent()
from public;

revoke all on function
  public.data001b_project_intent_shell(uuid)
from public;

revoke all on function
  public.data001b_block_project_intent_content(
    uuid, uuid, text, uuid, text
  )
from public;

revoke all on function
  public.data001b_reconcile_project_intent_content(uuid)
from public;

grant execute on function
  private.data001b_project_intent_content_is_blocked(uuid)
to anon, authenticated;

grant execute on function
  public.data001b_project_intent_shell(uuid)
to anon, authenticated;

grant execute on function
  public.data001b_block_project_intent_content(
    uuid, uuid, text, uuid, text
  )
to authenticated;

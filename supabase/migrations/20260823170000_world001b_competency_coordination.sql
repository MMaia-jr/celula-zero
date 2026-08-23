-- WORLD-001B — minimal competency coordination.
--
-- This migration materializes the sole EXTEND candidate identified by
-- cz.world-001.semantic-adoption-map.v1:
--
--   OpportunityVersion <-> CompetencyConcept
--   relation in REQUIRED | PREFERRED | LEARNING_TARGET
--
-- Boundaries:
-- - CompetencyConcept is NOT an operational capability_definition.
-- - Requirement is NOT proof that an Actor possesses a competency.
-- - No Actor competency/proficiency/profile is created.
-- - No matching, ranking, reputation, graph DB, RDF runtime or external
--   alignment persistence is introduced.
-- - Provenance identifies origin; it does not establish truth.
-- - Competency declarations are version-scoped; an explicit Opportunity revision
--   creates a new DRAFT version with no implicit competency carryover.

create table public.competency_concepts (
  id uuid primary key default gen_random_uuid(),
  cell_id uuid not null references public.cells(id) on delete restrict,
  created_in_project_id uuid not null references public.projects(id) on delete restrict,
  preferred_label text not null check (char_length(preferred_label) between 2 and 200),
  statement text not null check (char_length(statement) between 10 and 4000),
  language_tag text not null check (char_length(language_tag) between 2 and 35),
  origin_type text not null
    check (origin_type in ('LOCAL', 'EXTERNAL_REFERENCE')),
  source_system text,
  source_uri text,
  source_identifier text,
  source_version text,
  created_by_actor_id uuid not null references public.actors(id) on delete restrict,
  supersedes_competency_id uuid references public.competency_concepts(id) on delete restrict,
  created_at timestamptz not null default now(),
  check (supersedes_competency_id is null or supersedes_competency_id <> id),
  constraint competency_external_provenance check (
    (
      origin_type = 'LOCAL'
      and source_system is null
      and source_uri is null
      and source_identifier is null
      and source_version is null
    )
    or
    (
      origin_type = 'EXTERNAL_REFERENCE'
      and source_system is not null
      and char_length(source_system) between 2 and 120
      and source_uri is not null
      and char_length(source_uri) between 3 and 2000
      and source_identifier is not null
      and char_length(source_identifier) between 1 and 500
      and (source_version is null or char_length(source_version) between 1 and 200)
    )
  )
);

create table public.opportunity_version_competencies (
  id uuid primary key default gen_random_uuid(),
  opportunity_id uuid not null,
  opportunity_version integer not null check (opportunity_version > 0),
  competency_id uuid not null references public.competency_concepts(id) on delete restrict,
  relation text not null
    check (relation in ('REQUIRED', 'PREFERRED', 'LEARNING_TARGET')),
  rationale text not null check (char_length(rationale) between 3 and 2000),
  declared_by_actor_id uuid not null references public.actors(id) on delete restrict,
  materialized_by_actor_id uuid not null references public.actors(id) on delete restrict,
  inherited_from_link_id uuid references public.opportunity_version_competencies(id) on delete restrict,
  created_at timestamptz not null default now(),
  foreign key (opportunity_id, opportunity_version)
    references public.opportunity_versions(opportunity_id, version)
    on delete restrict,
  unique (opportunity_id, opportunity_version, competency_id),
  check (inherited_from_link_id is null or inherited_from_link_id <> id)
);

create index competency_concepts_cell on public.competency_concepts(cell_id, created_at, id);
create index competency_concepts_source
  on public.competency_concepts(source_system, source_identifier)
  where origin_type = 'EXTERNAL_REFERENCE';
create index opportunity_version_competencies_version
  on public.opportunity_version_competencies(opportunity_id, opportunity_version, relation, id);
create index opportunity_version_competencies_concept
  on public.opportunity_version_competencies(competency_id, created_at, id);

insert into public.capability_definitions(code, description) values
  (
    'competency.define',
    'Define a non-personal competency concept with explicit provenance in a project context.'
  ),
  (
    'opportunity.competency_declare',
    'Declare a version-scoped REQUIRED, PREFERRED or LEARNING_TARGET competency on a draft opportunity.'
  )
on conflict (code) do nothing;

insert into public.role_capabilities(role_id, capability_code) values
  ('00000000-0000-4000-8000-00000000c201', 'competency.define'),
  ('00000000-0000-4000-8000-00000000c201', 'opportunity.competency_declare'),
  ('00000000-0000-4000-8000-00000000c202', 'competency.define'),
  ('00000000-0000-4000-8000-00000000c202', 'opportunity.competency_declare'),
  ('00000000-0000-4000-8000-00000000c203', 'opportunity.competency_declare')
on conflict do nothing;

create trigger competency_concepts_append_only
before update or delete on public.competency_concepts
for each row execute function private.prevent_append_only_mutation();

create trigger opportunity_version_competencies_append_only
before update or delete on public.opportunity_version_competencies
for each row execute function private.prevent_append_only_mutation();

create or replace function private.world001b_copy_competencies_on_publish()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  if new.state not in ('OPEN', 'CLOSED') or new.version <= 1 then
    return new;
  end if;

  insert into public.opportunity_version_competencies(
    opportunity_id,
    opportunity_version,
    competency_id,
    relation,
    rationale,
    declared_by_actor_id,
    materialized_by_actor_id,
    inherited_from_link_id
  )
  select
    new.opportunity_id,
    new.version,
    prior.competency_id,
    prior.relation,
    prior.rationale,
    prior.declared_by_actor_id,
    new.created_by_actor_id,
    prior.id
  from public.opportunity_version_competencies prior
  where prior.opportunity_id = new.opportunity_id
    and prior.opportunity_version = new.version - 1
  on conflict (opportunity_id, opportunity_version, competency_id) do nothing;

  return new;
end;
$$;

create trigger world001b_copy_competencies_on_publish
after insert on public.opportunity_versions
for each row execute function private.world001b_copy_competencies_on_publish();

create or replace function private.world001b_competency_is_public(p_competency_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, private, pg_temp
as $$
  select exists (
    select 1
    from public.opportunity_version_competencies ovc
    join public.opportunity_versions ov
      on ov.opportunity_id = ovc.opportunity_id
     and ov.version = ovc.opportunity_version
    join public.opportunities o
      on o.id = ovc.opportunity_id
    where ovc.competency_id = p_competency_id
      and ov.visibility = 'PUBLIC'
      and ov.state in ('OPEN', 'CLOSED')
      and o.visibility = 'PUBLIC'
      and private.project_is_public(o.project_id)
  );
$$;

create or replace function public.world001b_define_competency(
  p_actor_id uuid,
  p_project_id uuid,
  p_preferred_label text,
  p_statement text,
  p_language_tag text,
  p_origin_type text,
  p_source_system text,
  p_source_uri text,
  p_source_identifier text,
  p_source_version text,
  p_supersedes_competency_id uuid,
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
  v_previous public.competency_concepts%rowtype;
  v_replayed boolean;
  v_result jsonb;
  v_id uuid;
  v_payload jsonb;
begin
  select * into v_project
  from public.projects
  where id = p_project_id;
  if not found then
    raise exception using errcode = 'P0001', message = 'CZ404:PROJECT_NOT_FOUND';
  end if;

  perform private.b1_authorize_actor(
    p_actor_id, 'competency.define', 'PROJECT', p_project_id
  );

  if p_origin_type not in ('LOCAL', 'EXTERNAL_REFERENCE') then
    raise exception using errcode = 'P0001', message = 'CZ422:INVALID_COMPETENCY_ORIGIN';
  end if;

  if p_origin_type = 'LOCAL' and (
    p_source_system is not null
    or p_source_uri is not null
    or p_source_identifier is not null
    or p_source_version is not null
  ) then
    raise exception using errcode = 'P0001', message = 'CZ422:LOCAL_COMPETENCY_MUST_NOT_FAKE_EXTERNAL_PROVENANCE';
  end if;

  if p_origin_type = 'EXTERNAL_REFERENCE' and (
    nullif(trim(p_source_system), '') is null
    or nullif(trim(p_source_uri), '') is null
    or nullif(trim(p_source_identifier), '') is null
  ) then
    raise exception using errcode = 'P0001', message = 'CZ422:EXTERNAL_COMPETENCY_PROVENANCE_REQUIRED';
  end if;

  if p_supersedes_competency_id is not null then
    select * into v_previous
    from public.competency_concepts
    where id = p_supersedes_competency_id;
    if not found then
      raise exception using errcode = 'P0001', message = 'CZ404:SUPERSEDED_COMPETENCY_NOT_FOUND';
    end if;
    if v_previous.cell_id <> v_project.cell_id then
      raise exception using errcode = 'P0001', message = 'CZ409:COMPETENCY_SUPERSEDES_CELL_MISMATCH';
    end if;
  end if;

  v_payload := jsonb_build_object(
    'project_id', p_project_id,
    'preferred_label', p_preferred_label,
    'statement', p_statement,
    'language_tag', p_language_tag,
    'origin_type', p_origin_type,
    'source_system', p_source_system,
    'source_uri', p_source_uri,
    'source_identifier', p_source_identifier,
    'source_version', p_source_version,
    'supersedes_competency_id', p_supersedes_competency_id
  );

  select replayed, saved_result into v_replayed, v_result
  from private.b1_begin_command(
    v_project.cell_id,
    p_actor_id,
    p_command_id,
    p_idempotency_key,
    'competency.define',
    v_payload
  );
  if v_replayed then
    return v_result;
  end if;

  insert into public.competency_concepts(
    cell_id,
    created_in_project_id,
    preferred_label,
    statement,
    language_tag,
    origin_type,
    source_system,
    source_uri,
    source_identifier,
    source_version,
    created_by_actor_id,
    supersedes_competency_id
  ) values (
    v_project.cell_id,
    p_project_id,
    p_preferred_label,
    p_statement,
    p_language_tag,
    p_origin_type,
    p_source_system,
    p_source_uri,
    p_source_identifier,
    p_source_version,
    p_actor_id,
    p_supersedes_competency_id
  )
  returning id into v_id;

  perform private.b1_record_event(
    v_project.cell_id,
    'COMPETENCY_DEFINED',
    'COMPETENCY_CONCEPT',
    v_id,
    'COMPETENCY_CONCEPT',
    v_id,
    p_actor_id,
    'competency.define',
    'PROJECT',
    p_project_id,
    p_command_id,
    null,
    1,
    'PROJECT',
    jsonb_build_object(
      'origin_type', p_origin_type,
      'source_system', p_source_system,
      'source_identifier', p_source_identifier,
      'supersedes_competency_id', p_supersedes_competency_id
    )
  );

  v_result := jsonb_build_object(
    'ok', true,
    'competency_id', v_id,
    'origin_type', p_origin_type,
    'provenance_is_truth', false
  );
  perform private.b1_finish_command(p_actor_id, p_idempotency_key, v_result);
  return v_result;
end;
$$;

create or replace function public.world001b_declare_opportunity_competency(
  p_actor_id uuid,
  p_opportunity_id uuid,
  p_expected_material_version integer,
  p_competency_id uuid,
  p_relation text,
  p_rationale text,
  p_command_id uuid,
  p_idempotency_key text
)
returns jsonb
language plpgsql
security definer
set search_path = public, private, pg_temp
as $$
declare
  v_o public.opportunities%rowtype;
  v_concept public.competency_concepts%rowtype;
  v_snapshot public.opportunity_versions%rowtype;
  v_replayed boolean;
  v_result jsonb;
  v_link_id uuid;
  v_payload jsonb;
begin
  select * into v_o
  from public.opportunities
  where id = p_opportunity_id;
  if not found then
    raise exception using errcode = 'P0001', message = 'CZ404:OPPORTUNITY_NOT_FOUND';
  end if;

  select * into v_concept
  from public.competency_concepts
  where id = p_competency_id;
  if not found then
    raise exception using errcode = 'P0001', message = 'CZ404:COMPETENCY_NOT_FOUND';
  end if;

  if v_concept.cell_id <> v_o.cell_id then
    raise exception using errcode = 'P0001', message = 'CZ409:COMPETENCY_CELL_MISMATCH';
  end if;

  if p_relation not in ('REQUIRED', 'PREFERRED', 'LEARNING_TARGET') then
    raise exception using errcode = 'P0001', message = 'CZ422:INVALID_COMPETENCY_RELATION';
  end if;

  perform private.b1_authorize_actor(
    p_actor_id,
    'opportunity.competency_declare',
    'OPPORTUNITY',
    p_opportunity_id
  );

  v_payload := jsonb_build_object(
    'opportunity_id', p_opportunity_id,
    'expected_material_version', p_expected_material_version,
    'competency_id', p_competency_id,
    'relation', p_relation,
    'rationale', p_rationale
  );

  select replayed, saved_result into v_replayed, v_result
  from private.b1_begin_command(
    v_o.cell_id,
    p_actor_id,
    p_command_id,
    p_idempotency_key,
    'opportunity.competency_declare',
    v_payload
  );
  if v_replayed then
    return v_result;
  end if;

  select * into v_o
  from public.opportunities
  where id = p_opportunity_id
  for update;

  if v_o.material_version <> p_expected_material_version then
    raise exception using errcode = 'P0001', message = 'CZ409:STALE_VERSION';
  end if;
  if v_o.state <> 'DRAFT' then
    raise exception using errcode = 'P0001', message = 'CZ409:COMPETENCY_DECLARATION_REQUIRES_DRAFT';
  end if;

  select * into v_snapshot
  from public.opportunity_versions
  where opportunity_id = p_opportunity_id
    and version = v_o.current_version;

  if not found or v_snapshot.state <> 'DRAFT' then
    raise exception using errcode = 'P0001', message = 'CZ409:CURRENT_OPPORTUNITY_VERSION_NOT_DRAFT';
  end if;

  insert into public.opportunity_version_competencies(
    opportunity_id,
    opportunity_version,
    competency_id,
    relation,
    rationale,
    declared_by_actor_id,
    materialized_by_actor_id,
    inherited_from_link_id
  ) values (
    p_opportunity_id,
    v_o.current_version,
    p_competency_id,
    p_relation,
    p_rationale,
    p_actor_id,
    p_actor_id,
    null
  )
  returning id into v_link_id;

  update public.opportunities
  set material_version = material_version + 1,
      updated_at = now()
  where id = p_opportunity_id;

  perform private.b1_record_decision(
    v_o.cell_id,
    'OPPORTUNITY_COMPETENCY_DECLARE',
    'ALLOW',
    'OPPORTUNITY_COMPETENCY',
    v_link_id,
    p_actor_id,
    'opportunity.competency_declare',
    'OPPORTUNITY',
    p_opportunity_id,
    'version-scoped competency relation declared on draft opportunity',
    p_command_id,
    v_o.current_version,
    null,
    jsonb_build_object(
      'competency_id', p_competency_id,
      'relation', p_relation
    )
  );

  perform private.b1_record_event(
    v_o.cell_id,
    'OPPORTUNITY_COMPETENCY_DECLARED',
    'OPPORTUNITY',
    p_opportunity_id,
    'OPPORTUNITY_COMPETENCY',
    v_link_id,
    p_actor_id,
    'opportunity.competency_declare',
    'OPPORTUNITY',
    p_opportunity_id,
    p_command_id,
    v_o.material_version,
    v_o.material_version + 1,
    'PROJECT',
    jsonb_build_object(
      'opportunity_version', v_o.current_version,
      'competency_id', p_competency_id,
      'relation', p_relation,
      'requirement_is_actor_attainment', false
    )
  );

  v_result := jsonb_build_object(
    'ok', true,
    'opportunity_competency_id', v_link_id,
    'opportunity_id', p_opportunity_id,
    'opportunity_version', v_o.current_version,
    'competency_id', p_competency_id,
    'relation', p_relation,
    'material_version', v_o.material_version + 1,
    'requirement_is_actor_attainment', false
  );

  perform private.b1_finish_command(p_actor_id, p_idempotency_key, v_result);
  return v_result;
end;
$$;

create or replace function public.world001b_reconcile_opportunity_competencies(
  p_opportunity_id uuid
)
returns text[]
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  with o as (
    select *
    from public.opportunities
    where id = p_opportunity_id
  ),
  current_snapshot as (
    select ov.*
    from public.opportunity_versions ov
    join o on o.id = ov.opportunity_id and o.current_version = ov.version
  ),
  checks as (
    select 'missing_opportunity' as issue
    where not exists (select 1 from o)

    union all

    select 'missing_current_snapshot'
    where exists (select 1 from o)
      and not exists (select 1 from current_snapshot)

    union all

    select 'published_competency_snapshot_mismatch'
    where exists (
      select 1
      from o
      join current_snapshot cs on true
      where o.state in ('OPEN', 'CLOSED')
        and cs.state in ('OPEN', 'CLOSED')
        and cs.version > 1
        and exists (
          select 1
          from public.opportunity_version_competencies prior
          where prior.opportunity_id = o.id
            and prior.opportunity_version = cs.version - 1
            and not exists (
              select 1
              from public.opportunity_version_competencies current_link
              where current_link.opportunity_id = o.id
                and current_link.opportunity_version = cs.version
                and current_link.competency_id = prior.competency_id
                and current_link.relation = prior.relation
                and current_link.rationale = prior.rationale
                and current_link.inherited_from_link_id = prior.id
            )
        )
    )

    union all

    select 'published_competency_missing_inheritance'
    where exists (
      select 1
      from o
      join current_snapshot cs on true
      join public.opportunity_version_competencies current_link
        on current_link.opportunity_id = o.id
       and current_link.opportunity_version = cs.version
      where o.state in ('OPEN', 'CLOSED')
        and cs.state in ('OPEN', 'CLOSED')
        and current_link.inherited_from_link_id is null
    )
  )
  select coalesce(array_agg(issue order by issue), '{}'::text[])
  from checks;
$$;

alter table public.competency_concepts enable row level security;
alter table public.opportunity_version_competencies enable row level security;

create policy competency_concepts_read
on public.competency_concepts
for select to anon, authenticated
using (
  private.world001b_competency_is_public(id)
  or private.b1_current_profile_controls_actor(created_by_actor_id)
  or exists (
    select 1
    from public.projects p
    where p.id = competency_concepts.created_in_project_id
      and p.cell_id = competency_concepts.cell_id
      and private.can_manage_project(p.id, auth.uid())
  )
);

create policy opportunity_version_competencies_read
on public.opportunity_version_competencies
for select to anon, authenticated
using (
  exists (
    select 1
    from public.opportunity_versions ov
    join public.opportunities o
      on o.id = ov.opportunity_id
    where ov.opportunity_id = opportunity_version_competencies.opportunity_id
      and ov.version = opportunity_version_competencies.opportunity_version
      and ov.visibility = 'PUBLIC'
      and ov.state in ('OPEN', 'CLOSED')
      and o.visibility = 'PUBLIC'
      and private.project_is_public(o.project_id)
  )
  or exists (
    select 1
    from public.opportunities o
    where o.id = opportunity_version_competencies.opportunity_id
      and private.can_manage_project(o.project_id, auth.uid())
  )
  or private.b1_current_profile_controls_actor(declared_by_actor_id)
  or private.b1_current_profile_controls_actor(materialized_by_actor_id)
);

revoke all on public.competency_concepts,
  public.opportunity_version_competencies
from anon, authenticated;

grant select on public.competency_concepts,
  public.opportunity_version_competencies
to anon, authenticated;

revoke all on function private.world001b_copy_competencies_on_publish() from public;
revoke all on function private.world001b_competency_is_public(uuid) from public;

grant execute on function private.world001b_competency_is_public(uuid) to anon, authenticated;

revoke all on function public.world001b_define_competency(
  uuid, uuid, text, text, text, text, text, text, text, text, uuid, uuid, text
) from public;

revoke all on function public.world001b_declare_opportunity_competency(
  uuid, uuid, integer, uuid, text, text, uuid, text
) from public;

revoke all on function public.world001b_reconcile_opportunity_competencies(uuid)
from public;

grant execute on function public.world001b_define_competency(
  uuid, uuid, text, text, text, text, text, text, text, text, uuid, uuid, text
) to authenticated;

grant execute on function public.world001b_declare_opportunity_competency(
  uuid, uuid, integer, uuid, text, text, uuid, text
) to authenticated;

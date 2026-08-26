-- INTEGRATED-ALPHA-001 / T1 SOCIAL FOUNDATION
-- First-class Need + bounded public Profile discovery.
--
-- This migration is additive. It does not reinterpret legacy projects.needs[]
-- as historical Need records.
--
-- Preserve:
-- Need != Opportunity
-- Profile != Actor != Reputation
-- publication is a separate command
-- Social Projection is not introduced here (Block 3).

create table public.needs (
  id uuid primary key default gen_random_uuid(),
  cell_id uuid not null references public.cells(id) on delete restrict,
  project_id uuid not null references public.projects(id) on delete restrict,
  owner_actor_id uuid not null references public.actors(id) on delete restrict,
  state text not null default 'DRAFT'
    check (state in ('DRAFT', 'OPEN', 'RESOLVED', 'CLOSED')),
  visibility text not null default 'PROJECT'
    check (visibility in ('PROJECT', 'PUBLIC')),
  current_version integer not null default 1 check (current_version > 0),
  material_version integer not null default 1 check (material_version > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  resolved_at timestamptz,
  check (
    (state = 'RESOLVED' and resolved_at is not null)
    or (state <> 'RESOLVED' and resolved_at is null)
  )
);

create table public.need_versions (
  id uuid primary key default gen_random_uuid(),
  need_id uuid not null references public.needs(id) on delete restrict,
  version integer not null check (version > 0),
  title text not null check (char_length(title) between 4 and 160),
  statement text not null check (char_length(statement) between 10 and 4000),
  context text not null default '' check (char_length(context) <= 2000),
  state text not null check (state in ('DRAFT', 'OPEN', 'RESOLVED', 'CLOSED')),
  visibility text not null check (visibility in ('PROJECT', 'PUBLIC')),
  created_by_actor_id uuid not null references public.actors(id) on delete restrict,
  created_at timestamptz not null default now(),
  unique (need_id, version)
);

create index needs_project_created on public.needs(project_id, created_at desc);
create index needs_owner_created on public.needs(owner_actor_id, created_at desc);
create index needs_public_listing on public.needs(updated_at desc)
  where visibility = 'PUBLIC' and state = 'OPEN';

create trigger need_versions_append_only
before update or delete on public.need_versions
for each row execute function private.prevent_append_only_mutation();

insert into public.capability_definitions(code, description) values
  ('need.create', 'Create a project-scoped Need draft.'),
  ('need.publish', 'Publish a project-scoped Need through a separate command.')
on conflict (code) do nothing;

insert into public.role_capabilities(role_id, capability_code) values
  ('00000000-0000-4000-8000-00000000c202', 'need.create'),
  ('00000000-0000-4000-8000-00000000c202', 'need.publish')
on conflict do nothing;

create or replace function private.t1_need_is_public(p_need_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, private, pg_temp
as $$
  select exists (
    select 1
    from public.needs n
    join public.projects p on p.id = n.project_id
    where n.id = p_need_id
      and n.state = 'OPEN'
      and n.visibility = 'PUBLIC'
      and p.visibility = 'PUBLIC'
      and p.published_at is not null
      and p.archived_at is null
  );
$$;

revoke all on function private.t1_need_is_public(uuid) from public;

create or replace function public.t1_create_need(
  p_actor_id uuid,
  p_project_id uuid,
  p_title text,
  p_statement text,
  p_context text,
  p_command_id uuid,
  p_idempotency_key text
)
returns jsonb
language plpgsql
security definer
set search_path = public, private, pg_temp
as $$
declare
  v_cell uuid;
  v_id uuid;
  v_replayed boolean;
  v_result jsonb;
  v_payload jsonb;
  v_title text := trim(coalesce(p_title, ''));
  v_statement text := trim(coalesce(p_statement, ''));
  v_context text := trim(coalesce(p_context, ''));
begin
  select cell_id into v_cell from public.projects where id = p_project_id;
  if v_cell is null then
    raise exception using errcode = 'P0001', message = 'CZ404:PROJECT_NOT_FOUND';
  end if;

  if char_length(v_title) < 4 or char_length(v_title) > 160 then
    raise exception using errcode = 'P0001', message = 'CZ422:INVALID_NEED_TITLE';
  end if;
  if char_length(v_statement) < 10 or char_length(v_statement) > 4000 then
    raise exception using errcode = 'P0001', message = 'CZ422:INVALID_NEED_STATEMENT';
  end if;
  if char_length(v_context) > 2000 then
    raise exception using errcode = 'P0001', message = 'CZ422:INVALID_NEED_CONTEXT';
  end if;

  perform private.b1_authorize_actor(
    p_actor_id, 'need.create', 'PROJECT', p_project_id
  );

  v_payload := jsonb_build_object(
    'project_id', p_project_id,
    'title', v_title,
    'statement', v_statement,
    'context', v_context
  );

  select replayed, saved_result
  into v_replayed, v_result
  from private.b1_begin_command(
    v_cell, p_actor_id, p_command_id, p_idempotency_key, 'need.create', v_payload
  );

  if v_replayed then return v_result; end if;

  insert into public.needs(
    cell_id, project_id, owner_actor_id, state, visibility
  ) values (
    v_cell, p_project_id, p_actor_id, 'DRAFT', 'PROJECT'
  ) returning id into v_id;

  insert into public.need_versions(
    need_id, version, title, statement, context, state, visibility, created_by_actor_id
  ) values (
    v_id, 1, v_title, v_statement, v_context, 'DRAFT', 'PROJECT', p_actor_id
  );

  perform private.b1_record_decision(
    v_cell, 'NEED_CREATE', 'ALLOW', 'NEED', v_id, p_actor_id,
    'need.create', 'PROJECT', p_project_id,
    'authorized project-scoped Need draft creation',
    p_command_id, null, null, jsonb_build_object('need_version', 1)
  );

  perform private.b1_record_event(
    v_cell, 'NEED_CREATED', 'NEED', v_id, 'NEED', v_id, p_actor_id,
    'need.create', 'PROJECT', p_project_id, p_command_id,
    null, 1, 'PROJECT',
    jsonb_build_object('version', 1, 'state', 'DRAFT', 'project_id', p_project_id)
  );

  v_result := jsonb_build_object(
    'ok', true, 'need_id', v_id, 'version', 1,
    'material_version', 1, 'state', 'DRAFT', 'visibility', 'PROJECT'
  );

  perform private.b1_finish_command(p_actor_id, p_idempotency_key, v_result);
  return v_result;
end;
$$;

create or replace function public.t1_publish_need(
  p_actor_id uuid,
  p_need_id uuid,
  p_expected_material_version integer,
  p_command_id uuid,
  p_idempotency_key text
)
returns jsonb
language plpgsql
security definer
set search_path = public, private, pg_temp
as $$
declare
  v_need public.needs%rowtype;
  v_version public.need_versions%rowtype;
  v_replayed boolean;
  v_result jsonb;
  v_payload jsonb := jsonb_build_object(
    'need_id', p_need_id,
    'expected_material_version', p_expected_material_version
  );
  v_new_version integer;
begin
  select * into v_need from public.needs where id = p_need_id;
  if not found then
    raise exception using errcode = 'P0001', message = 'CZ404:NEED_NOT_FOUND';
  end if;

  perform private.b1_authorize_actor(
    p_actor_id, 'need.publish', 'PROJECT', v_need.project_id
  );

  select replayed, saved_result
  into v_replayed, v_result
  from private.b1_begin_command(
    v_need.cell_id, p_actor_id, p_command_id, p_idempotency_key,
    'need.publish', v_payload
  );

  if v_replayed then return v_result; end if;

  select * into v_need
  from public.needs
  where id = p_need_id
  for update;

  if v_need.material_version <> p_expected_material_version then
    raise exception using errcode = 'P0001', message = 'CZ409:STALE_VERSION';
  end if;
  if v_need.state <> 'DRAFT' then
    raise exception using errcode = 'P0001', message = 'CZ409:INVALID_STATE';
  end if;

  select * into v_version
  from public.need_versions
  where need_id = p_need_id and version = v_need.current_version;

  if not found then
    raise exception using errcode = 'integrity_constraint_violation',
      message = 'current Need version missing';
  end if;

  v_new_version := v_need.current_version + 1;

  insert into public.need_versions(
    need_id, version, title, statement, context, state, visibility, created_by_actor_id
  ) values (
    p_need_id, v_new_version, v_version.title, v_version.statement, v_version.context,
    'OPEN', 'PUBLIC', p_actor_id
  );

  update public.needs
  set state = 'OPEN',
      visibility = 'PUBLIC',
      current_version = v_new_version,
      material_version = material_version + 1,
      updated_at = now()
  where id = p_need_id;

  perform private.b1_record_decision(
    v_need.cell_id, 'NEED_PUBLISH', 'ALLOW', 'NEED', p_need_id, p_actor_id,
    'need.publish', 'PROJECT', v_need.project_id,
    'separate Need publication command',
    p_command_id, null, null, jsonb_build_object('need_version', v_new_version)
  );

  perform private.b1_record_event(
    v_need.cell_id, 'NEED_PUBLISHED', 'NEED', p_need_id, 'NEED', p_need_id,
    p_actor_id, 'need.publish', 'PROJECT', v_need.project_id, p_command_id,
    v_need.material_version, v_need.material_version + 1, 'PUBLIC',
    jsonb_build_object(
      'version', v_new_version, 'state', 'OPEN', 'project_id', v_need.project_id
    )
  );

  v_result := jsonb_build_object(
    'ok', true, 'need_id', p_need_id, 'version', v_new_version,
    'material_version', v_need.material_version + 1,
    'state', 'OPEN', 'visibility', 'PUBLIC'
  );

  perform private.b1_finish_command(p_actor_id, p_idempotency_key, v_result);
  return v_result;
end;
$$;

create or replace function public.list_public_profiles()
returns table(
  handle text,
  display_name text,
  bio text,
  actor_id uuid,
  actor_name text,
  public_project_count bigint
)
language sql
stable
security definer
set search_path = public, extensions, pg_temp
as $$
  select
    p.handle::text,
    p.display_name,
    p.bio,
    a.id,
    a.name,
    (
      select count(*)
      from public.projects project
      where project.steward_actor_id = a.id
        and project.visibility = 'PUBLIC'
        and project.published_at is not null
        and project.archived_at is null
    ) as public_project_count
  from public.profiles p
  join lateral (
    select actor.id, actor.name
    from public.actor_memberships am
    join public.actors actor on actor.id = am.actor_id
    where am.profile_id = p.id
      and am.role = 'OWNER'
      and actor.kind = 'PERSON'
      and actor.operator_profile_id = p.id
    order by am.created_at, actor.created_at
    limit 1
  ) a on true
  where p.visibility = 'PUBLIC'
    and p.handle is not null
  order by p.display_name, p.handle;
$$;

create or replace function public.get_public_profile_by_actor(p_actor_id uuid)
returns table(
  handle text,
  display_name text,
  bio text,
  actor_id uuid,
  actor_name text
)
language sql
stable
security definer
set search_path = public, extensions, pg_temp
as $$
  select p.handle::text, p.display_name, p.bio, a.id, a.name
  from public.profiles p
  join public.actors a
    on a.operator_profile_id = p.id
   and a.kind = 'PERSON'
   and a.id = p_actor_id
  join public.actor_memberships am
    on am.actor_id = a.id
   and am.profile_id = p.id
   and am.role = 'OWNER'
  where p.visibility = 'PUBLIC'
    and p.handle is not null
  order by am.created_at
  limit 1;
$$;

alter table public.needs enable row level security;
alter table public.need_versions enable row level security;

create policy needs_read
on public.needs
for select
to anon, authenticated
using (
  (visibility = 'PUBLIC' and private.project_is_public(project_id))
  or private.can_manage_project(project_id, auth.uid())
  or private.b1_current_profile_controls_actor(owner_actor_id)
);

create policy need_versions_read
on public.need_versions
for select
to anon, authenticated
using (
  exists (select 1 from public.needs n where n.id = need_id)
);

revoke all on public.needs, public.need_versions from anon, authenticated;
grant select on public.needs, public.need_versions to anon, authenticated;

revoke all on function public.t1_create_need(
  uuid, uuid, text, text, text, uuid, text
) from public;
grant execute on function public.t1_create_need(
  uuid, uuid, text, text, text, uuid, text
) to authenticated;

revoke all on function public.t1_publish_need(
  uuid, uuid, integer, uuid, text
) from public;
grant execute on function public.t1_publish_need(
  uuid, uuid, integer, uuid, text
) to authenticated;

revoke all on function public.list_public_profiles() from public;
grant execute on function public.list_public_profiles() to anon, authenticated;

revoke all on function public.get_public_profile_by_actor(uuid) from public;
grant execute on function public.get_public_profile_by_actor(uuid) to anon, authenticated;

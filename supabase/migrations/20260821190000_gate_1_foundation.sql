create extension if not exists pgcrypto with schema extensions;
create extension if not exists citext with schema extensions;

create schema if not exists private;
revoke all on schema private from public;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete restrict,
  display_name text not null check (char_length(display_name) between 2 and 100),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.actors (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('PERSON', 'AI_AGENT', 'ORGANIZATION', 'SYSTEM')),
  name text not null check (char_length(name) between 2 and 120),
  operator_profile_id uuid references public.profiles(id) on delete restrict,
  operator_label text,
  created_at timestamptz not null default now(),
  constraint ai_actor_requires_operator check (
    kind <> 'AI_AGENT' or (operator_profile_id is not null and operator_label is not null)
  )
);

create table public.actor_memberships (
  actor_id uuid not null references public.actors(id) on delete restrict,
  profile_id uuid not null references public.profiles(id) on delete restrict,
  role text not null check (role in ('OWNER', 'OPERATOR', 'REPRESENTATIVE')),
  created_at timestamptz not null default now(),
  primary key (actor_id, profile_id, role)
);

create table public.pilot_invites (
  email extensions.citext primary key,
  label text not null,
  status text not null default 'ACTIVE' check (status in ('ACTIVE', 'REVOKED', 'USED')),
  used_by uuid references public.profiles(id) on delete restrict,
  used_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.pilot_memberships (
  profile_id uuid primary key references public.profiles(id) on delete restrict,
  status text not null check (status in ('ACTIVE', 'SUSPENDED')),
  source text not null check (source in ('INVITE', 'SEED')),
  approved_at timestamptz not null default now()
);

create table public.projects (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$' and char_length(slug) <= 80),
  title text not null check (char_length(title) between 4 and 100),
  summary text not null check (char_length(summary) between 20 and 320),
  current_intent text not null check (char_length(current_intent) between 20 and 4000),
  steward_actor_id uuid not null references public.actors(id) on delete restrict,
  stage text not null check (stage in ('DRAFT', 'OPEN', 'ACTIVE', 'PAUSED', 'COMPLETED', 'ABANDONED')),
  visibility text not null default 'PRIVATE' check (visibility in ('PRIVATE', 'PILOT', 'PUBLIC')),
  economic_regime text not null check (economic_regime in ('VOLUNTARY', 'EXCHANGE', 'BOUNTY_EXTERNAL', 'SPONSORSHIP', 'INVESTMENT_INTEREST')),
  intended_result text not null check (char_length(intended_result) between 10 and 1000),
  rules_and_limits text not null check (char_length(rules_and_limits) between 10 and 2000),
  needs text[] not null check (cardinality(needs) between 1 and 12),
  source_label text not null check (source_label in ('CANONICAL', 'DEMO / SYNTHETIC', 'PILOT')),
  created_by_profile_id uuid references public.profiles(id) on delete restrict,
  version integer not null default 1 check (version > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  published_at timestamptz,
  archived_at timestamptz,
  constraint public_project_requires_publication check (
    (visibility = 'PUBLIC' and published_at is not null) or visibility <> 'PUBLIC'
  )
);

create table public.project_intents (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete restrict,
  kind text not null check (kind in ('ORIGINAL', 'INTERPRETATION')),
  content text not null check (char_length(content) between 20 and 4000),
  version integer not null check (version > 0),
  accepted_at timestamptz,
  accepted_by_profile_id uuid references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  unique (project_id, kind, version)
);

create unique index project_one_original_intent
  on public.project_intents(project_id)
  where kind = 'ORIGINAL';

create table public.project_members (
  project_id uuid not null references public.projects(id) on delete restrict,
  actor_id uuid not null references public.actors(id) on delete restrict,
  role text not null check (role in ('PROJECT_STEWARD', 'CONTRIBUTOR', 'REVIEWER', 'AUDITOR', 'SUPPORTER')),
  granted_by_profile_id uuid references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  primary key (project_id, actor_id, role)
);

create table public.events (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete restrict,
  event_type text not null check (event_type in ('PROJECT_CREATED', 'PROJECT_PUBLISHED', 'PROJECT_UPDATED')),
  title text not null check (char_length(title) between 3 and 120),
  description text not null check (char_length(description) between 10 and 1000),
  actor_id uuid not null references public.actors(id) on delete restrict,
  authorized_by_profile_id uuid references public.profiles(id) on delete restrict,
  material_version integer not null check (material_version > 0),
  payload jsonb not null default '{}'::jsonb,
  occurred_at timestamptz not null default now()
);

create index projects_public_listing on public.projects(published_at desc)
  where visibility = 'PUBLIC' and archived_at is null;
create index project_intents_project_id on public.project_intents(project_id);
create index project_members_actor_id on public.project_members(actor_id);
create index events_project_timeline on public.events(project_id, occurred_at, id);

create or replace function private.is_active_pilot(p_profile_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1 from public.pilot_memberships
    where profile_id = p_profile_id and status = 'ACTIVE'
  );
$$;

create or replace function private.can_manage_project(p_project_id uuid, p_profile_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select private.is_active_pilot(p_profile_id) and exists (
    select 1
    from public.project_members pm
    join public.actor_memberships am on am.actor_id = pm.actor_id
    where pm.project_id = p_project_id
      and pm.role = 'PROJECT_STEWARD'
      and am.profile_id = p_profile_id
      and am.role in ('OWNER', 'OPERATOR', 'REPRESENTATIVE')
  );
$$;

create or replace function private.project_is_public(p_project_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1 from public.projects
    where id = p_project_id
      and visibility = 'PUBLIC'
      and published_at is not null
      and archived_at is null
  );
$$;

create or replace function private.prevent_append_only_mutation()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  raise exception using
    errcode = 'integrity_constraint_violation',
    message = format('%s is append-only', tg_table_name);
end;
$$;

create trigger project_intents_append_only
before update or delete on public.project_intents
for each row execute function private.prevent_append_only_mutation();

create trigger events_append_only
before update or delete on public.events
for each row execute function private.prevent_append_only_mutation();

create or replace function private.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $$
declare
  v_actor_id uuid;
  v_display_name text;
begin
  v_display_name := left(
    coalesce(nullif(trim(new.raw_user_meta_data ->> 'name'), ''), split_part(new.email, '@', 1), 'Participante'),
    100
  );

  insert into public.profiles(id, display_name)
  values (new.id, v_display_name)
  on conflict (id) do nothing;

  insert into public.actors(kind, name, operator_profile_id)
  values ('PERSON', v_display_name, new.id)
  returning id into v_actor_id;

  insert into public.actor_memberships(actor_id, profile_id, role)
  values (v_actor_id, new.id, 'OWNER');

  if exists (
    select 1 from public.pilot_invites
    where email = new.email and status = 'ACTIVE'
  ) then
    insert into public.pilot_memberships(profile_id, status, source)
    values (new.id, 'ACTIVE', 'INVITE')
    on conflict (profile_id) do update set status = 'ACTIVE';

    update public.pilot_invites
    set status = 'USED', used_by = new.id, used_at = now()
    where email = new.email and status = 'ACTIVE';
  end if;

  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function private.handle_new_auth_user();

create or replace function public.create_project_atomic(
  p_title text,
  p_slug_base text,
  p_summary text,
  p_original_intent text,
  p_current_intent text,
  p_intended_result text,
  p_rules_and_limits text,
  p_needs text[],
  p_economic_regime text,
  p_stage text,
  p_publish boolean default true
)
returns table(project_id uuid, slug text)
language plpgsql
security definer
set search_path = public, private, extensions, pg_temp
as $$
declare
  v_profile_id uuid := auth.uid();
  v_actor_id uuid;
  v_project_id uuid;
  v_slug text := left(trim(both '-' from lower(p_slug_base)), 72);
  v_version integer := 1;
begin
  if v_profile_id is null then
    raise exception using errcode = 'insufficient_privilege', message = 'authentication required';
  end if;
  if not private.is_active_pilot(v_profile_id) then
    raise exception using errcode = 'insufficient_privilege', message = 'active pilot invite required';
  end if;

  select am.actor_id into v_actor_id
  from public.actor_memberships am
  join public.actors a on a.id = am.actor_id
  where am.profile_id = v_profile_id
    and am.role in ('OWNER', 'REPRESENTATIVE')
    and a.kind = 'PERSON'
  order by am.created_at
  limit 1;

  if v_actor_id is null then
    raise exception using errcode = 'integrity_constraint_violation', message = 'profile has no responsible actor';
  end if;
  if v_slug = '' or v_slug !~ '^[a-z0-9]+(?:-[a-z0-9]+)*$' then
    raise exception using errcode = 'check_violation', message = 'invalid project slug';
  end if;

  while exists (select 1 from public.projects p where p.slug = v_slug) loop
    v_slug := left(p_slug_base, 63) || '-' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 8);
  end loop;

  insert into public.projects(
    slug, title, summary, current_intent, steward_actor_id, stage, visibility,
    economic_regime, intended_result, rules_and_limits, needs, source_label,
    created_by_profile_id, version, published_at
  ) values (
    v_slug, p_title, p_summary, p_current_intent, v_actor_id, p_stage,
    case when p_publish then 'PUBLIC' else 'PRIVATE' end,
    p_economic_regime, p_intended_result, p_rules_and_limits, p_needs, 'PILOT',
    v_profile_id, case when p_publish then 2 else 1 end,
    case when p_publish then now() else null end
  ) returning id, version into v_project_id, v_version;

  insert into public.project_intents(project_id, kind, content, version, accepted_at, accepted_by_profile_id)
  values
    (v_project_id, 'ORIGINAL', p_original_intent, 1, now(), v_profile_id),
    (v_project_id, 'INTERPRETATION', p_current_intent, 1, now(), v_profile_id);

  insert into public.project_members(project_id, actor_id, role, granted_by_profile_id)
  values (v_project_id, v_actor_id, 'PROJECT_STEWARD', v_profile_id);

  insert into public.events(
    project_id, event_type, title, description, actor_id,
    authorized_by_profile_id, material_version, payload
  ) values (
    v_project_id, 'PROJECT_CREATED', 'Projeto criado',
    'Registro Original e interpretação inicial foram preservados em objetos distintos.',
    v_actor_id, v_profile_id, 1,
    jsonb_build_object('visibility', 'PRIVATE', 'stage', p_stage)
  );

  if p_publish then
    insert into public.events(
      project_id, event_type, title, description, actor_id,
      authorized_by_profile_id, material_version, payload
    ) values (
      v_project_id, 'PROJECT_PUBLISHED', 'Projeto aberto',
      'Leitura pública habilitada; escrita permanece restrita aos responsáveis do piloto.',
      v_actor_id, v_profile_id, v_version,
      jsonb_build_object('visibility', 'PUBLIC', 'economic_regime', p_economic_regime)
    );
  end if;

  return query select v_project_id, v_slug;
end;
$$;

create or replace function public.reconcile_project(p_project_id uuid)
returns text[]
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  with material as (
    select p.id, p.version, p.visibility, p.published_at
    from public.projects p where p.id = p_project_id
  ), checks as (
    select 'missing_material' as issue
    where not exists (select 1 from material)
    union all
    select 'original_intent_count'
    where (select count(*) from public.project_intents i where i.project_id = p_project_id and i.kind = 'ORIGINAL') <> 1
    union all
    select 'event_material_version'
    where coalesce((select max(e.material_version) from public.events e where e.project_id = p_project_id), 0)
      <> coalesce((select version from material), 0)
    union all
    select 'public_without_publish_event'
    where exists (select 1 from material where visibility = 'PUBLIC' and published_at is not null)
      and not exists (select 1 from public.events where project_id = p_project_id and event_type = 'PROJECT_PUBLISHED')
  )
  select coalesce(array_agg(issue order by issue), '{}'::text[]) from checks;
$$;

alter table public.profiles enable row level security;
alter table public.actors enable row level security;
alter table public.actor_memberships enable row level security;
alter table public.pilot_invites enable row level security;
alter table public.pilot_memberships enable row level security;
alter table public.projects enable row level security;
alter table public.project_intents enable row level security;
alter table public.project_members enable row level security;
alter table public.events enable row level security;

create policy profiles_read_self on public.profiles for select to authenticated
  using (id = auth.uid());
create policy actors_read_public_or_own on public.actors for select to anon, authenticated
  using (
    operator_profile_id = auth.uid()
    or exists (select 1 from public.actor_memberships am where am.actor_id = id and am.profile_id = auth.uid())
    or exists (select 1 from public.projects p where p.steward_actor_id = id and private.project_is_public(p.id))
  );
create policy actor_memberships_read_self on public.actor_memberships for select to authenticated
  using (profile_id = auth.uid());
create policy pilot_memberships_read_self on public.pilot_memberships for select to authenticated
  using (profile_id = auth.uid());
create policy projects_read_public_or_managed on public.projects for select to anon, authenticated
  using (
    (visibility = 'PUBLIC' and published_at is not null and archived_at is null)
    or private.can_manage_project(id, auth.uid())
  );
create policy project_intents_read_public_or_managed on public.project_intents for select to anon, authenticated
  using (private.project_is_public(project_id) or private.can_manage_project(project_id, auth.uid()));
create policy project_members_read_public_or_managed on public.project_members for select to anon, authenticated
  using (private.project_is_public(project_id) or private.can_manage_project(project_id, auth.uid()));
create policy events_read_public_or_managed on public.events for select to anon, authenticated
  using (private.project_is_public(project_id) or private.can_manage_project(project_id, auth.uid()));

revoke all on all tables in schema public from anon, authenticated;
grant select on public.profiles to authenticated;
grant select on public.actors to anon, authenticated;
grant select on public.actor_memberships to authenticated;
grant select on public.pilot_memberships to authenticated;
grant select on public.projects, public.project_intents, public.project_members, public.events to anon, authenticated;

revoke all on function public.create_project_atomic(text, text, text, text, text, text, text, text[], text, text, boolean) from public;
grant execute on function public.create_project_atomic(text, text, text, text, text, text, text, text[], text, text, boolean) to authenticated;
revoke all on function public.reconcile_project(uuid) from public;
grant execute on function public.reconcile_project(uuid) to authenticated;
grant usage on schema private to anon, authenticated;
grant execute on function private.is_active_pilot(uuid) to anon, authenticated;
grant execute on function private.can_manage_project(uuid, uuid) to anon, authenticated;
grant execute on function private.project_is_public(uuid) to anon, authenticated;

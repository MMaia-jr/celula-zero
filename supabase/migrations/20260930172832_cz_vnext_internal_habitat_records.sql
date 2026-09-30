-- CZ vNext Internal Online Habitat V1: private, attributable human intentions.
create table public.cz_vnext_original_records (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete restrict,
  person_actor_id uuid not null references public.actors(id) on delete restrict,
  record_kind text not null default 'OriginalRecord'
    check (record_kind = 'OriginalRecord'),
  purpose text not null default 'intention' check (purpose = 'intention'),
  content text not null check (length(btrim(content)) between 1 and 6000),
  request_key uuid not null,
  created_at timestamptz not null default now(),
  unique (profile_id, request_key),
  unique (profile_id, id)
);

alter table public.cz_vnext_original_records enable row level security;
revoke all on public.cz_vnext_original_records from public, anon, authenticated;
grant select on public.cz_vnext_original_records to authenticated;
create policy cz_vnext_original_records_owner_read
  on public.cz_vnext_original_records for select to authenticated
  using (profile_id = (select auth.uid()));
create trigger cz_vnext_original_records_append_only
  before update or delete on public.cz_vnext_original_records
  for each row execute function private.prevent_append_only_mutation();

create or replace function public.cz_vnext_habitat_context()
returns jsonb
language plpgsql
stable
security definer
set search_path = public, private, pg_temp
as $$
declare
  v_profile_id uuid := auth.uid();
  v_actor_id uuid;
  v_person_name text;
  v_profile jsonb;
  v_cell jsonb;
  v_records jsonb;
begin
  if v_profile_id is null then
    raise exception using errcode = '42501', message = 'CZ401:AUTH_REQUIRED';
  end if;

  if not exists (select 1 from public.profiles p where p.id = v_profile_id) then
    raise exception using errcode = '42501', message = 'CZ403:PROFILE_UNRESOLVED';
  end if;

  select (array_agg(am.actor_id))[1], (array_agg(a.name))[1]
    into v_actor_id, v_person_name
  from public.actor_memberships am
  join public.actors a on a.id = am.actor_id and a.kind = 'PERSON'
  where am.profile_id = v_profile_id;
  if v_actor_id is null or (
    select count(*) from public.actor_memberships am
    join public.actors a on a.id = am.actor_id and a.kind = 'PERSON'
    where am.profile_id = v_profile_id
  ) <> 1 then
    raise exception using errcode = '42501', message = 'CZ403:PERSON_UNRESOLVED';
  end if;

  if not exists (
    select 1 from public.role_assignments ra
    join public.role_definitions rd on rd.id = ra.role_id
    join public.cells c on c.id = ra.cell_id
    where ra.actor_id = v_actor_id and ra.scope_type = 'CELL'
      and ra.scope_id = c.id and c.slug = 'cell-zero'
      and rd.code = 'CELL_MEMBER' and rd.cell_id = c.id
      and ra.policy_version_id = c.current_policy_version_id
      and ra.valid_from <= now()
      and (ra.valid_until is null or ra.valid_until > now())
      and ra.revoked_at is null
  ) then
    raise exception using errcode = '42501', message = 'CZ403:INTERNAL_CELL_RELATION_REQUIRED';
  end if;

  select jsonb_build_object(
    'id', p.id, 'display_name', p.display_name,
    'handle', p.handle, 'bio', p.bio
  ) into v_profile from public.profiles p where p.id = v_profile_id;
  select jsonb_build_object('id', c.id, 'slug', c.slug, 'name', c.name)
    into v_cell from public.cells c where c.slug = 'cell-zero';
  select coalesce(jsonb_agg(jsonb_build_object(
      'id', r.id, 'content', r.content, 'created_at', r.created_at,
      'record_kind', r.record_kind, 'purpose', r.purpose
    ) order by r.created_at, r.id), '[]'::jsonb)
    into v_records from public.cz_vnext_original_records r
    where r.profile_id = v_profile_id;

  return jsonb_build_object(
    'profile', v_profile,
    'person', jsonb_build_object('id', v_actor_id, 'name', coalesce(v_person_name, v_profile->>'display_name')),
    'cell', v_cell,
    'records', v_records
  );
end;
$$;

create or replace function public.cz_vnext_record_intention(
  p_content text, p_request_key uuid
) returns uuid
language plpgsql
security definer
set search_path = public, private, pg_temp
as $$
declare
  v_profile_id uuid := auth.uid();
  v_actor_id uuid;
  v_existing public.cz_vnext_original_records%rowtype;
  v_record_id uuid;
begin
  if v_profile_id is null then
    raise exception using errcode = '42501', message = 'CZ401:AUTH_REQUIRED';
  end if;
  if p_content is null or length(btrim(p_content)) not between 1 and 6000
     or p_request_key is null then
    raise exception using errcode = '22023', message = 'CZ422:INVALID_INTENTION';
  end if;
  if not exists (select 1 from public.profiles p where p.id = v_profile_id) then
    raise exception using errcode = '42501', message = 'CZ403:PROFILE_UNRESOLVED';
  end if;

  select (array_agg(am.actor_id))[1] into v_actor_id
  from public.actor_memberships am
  join public.actors a on a.id = am.actor_id and a.kind = 'PERSON'
  where am.profile_id = v_profile_id;
  if v_actor_id is null or (
    select count(*) from public.actor_memberships am
    join public.actors a on a.id = am.actor_id and a.kind = 'PERSON'
    where am.profile_id = v_profile_id
  ) <> 1 then
    raise exception using errcode = '42501', message = 'CZ403:PERSON_UNRESOLVED';
  end if;
  if not exists (
    select 1 from public.role_assignments ra
    join public.role_definitions rd on rd.id = ra.role_id
    join public.cells c on c.id = ra.cell_id
    where ra.actor_id = v_actor_id and ra.scope_type = 'CELL'
      and ra.scope_id = c.id and c.slug = 'cell-zero'
      and rd.code = 'CELL_MEMBER' and rd.cell_id = c.id
      and ra.policy_version_id = c.current_policy_version_id
      and ra.valid_from <= now()
      and (ra.valid_until is null or ra.valid_until > now())
      and ra.revoked_at is null
  ) then
    raise exception using errcode = '42501', message = 'CZ403:INTERNAL_CELL_RELATION_REQUIRED';
  end if;

  insert into public.cz_vnext_original_records(profile_id, person_actor_id, content, request_key)
  values (v_profile_id, v_actor_id, btrim(p_content), p_request_key)
  on conflict (profile_id, request_key) do nothing
  returning id into v_record_id;
  if v_record_id is null then
    select * into v_existing from public.cz_vnext_original_records
    where profile_id = v_profile_id and request_key = p_request_key;
    if v_existing.content is distinct from btrim(p_content) then
      raise exception using errcode = '23505', message = 'CZ409:REQUEST_KEY_CONFLICT';
    end if;
    v_record_id := v_existing.id;
  end if;
  return v_record_id;
end;
$$;

revoke all on function public.cz_vnext_habitat_context() from public, anon;
revoke all on function public.cz_vnext_record_intention(text, uuid) from public, anon;
grant execute on function public.cz_vnext_habitat_context() to authenticated;
grant execute on function public.cz_vnext_record_intention(text, uuid) to authenticated;

-- SPDX-License-Identifier: MPL-2.0
-- A small attributable work projection for conversation-to-consequence continuity.
-- Existing Projects, Commitments, Contributions and Agent Tasks have distinct
-- governance/contract semantics and cannot represent a founder's lightweight
-- Cell work item without distortion.

create table public.cz_vnext_work_items (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete restrict,
  person_actor_id uuid not null references public.actors(id) on delete restrict,
  cell_id uuid not null references public.cells(id) on delete restrict,
  thread_id uuid not null,
  source_message_id text not null,
  title text not null check (char_length(btrim(title)) between 1 and 160),
  description text not null default '' check (char_length(description) <= 2000),
  status text not null default 'open' check (status in ('open', 'in_progress', 'done')),
  source text not null default 'human_confirmed_conversation'
    check (source = 'human_confirmed_conversation'),
  request_key uuid not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  completed_at timestamptz,
  unique (profile_id, request_key),
  foreign key (profile_id, thread_id)
    references public.cz_vnext_threads(profile_id, id) on delete restrict,
  foreign key (thread_id, source_message_id)
    references public.cz_vnext_messages(thread_id, id) on delete restrict,
  check ((status = 'done' and completed_at is not null)
      or (status <> 'done' and completed_at is null))
);

create index cz_vnext_work_items_cell_status_updated_idx
  on public.cz_vnext_work_items (cell_id, status, updated_at desc);
create index cz_vnext_work_items_profile_updated_idx
  on public.cz_vnext_work_items (profile_id, updated_at desc);

alter table public.cz_vnext_work_items enable row level security;
revoke all on public.cz_vnext_work_items from public, anon, authenticated;
grant select on public.cz_vnext_work_items to authenticated;
create policy cz_vnext_work_items_owner_read
  on public.cz_vnext_work_items for select to authenticated
  using (profile_id = (select auth.uid()));

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
  v_work jsonb;
begin
  if v_profile_id is null then
    raise exception using errcode = '42501', message = 'CZ401:AUTH_REQUIRED';
  end if;
  select am.actor_id, a.name into v_actor_id, v_person_name
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
      and ra.valid_from <= now() and (ra.valid_until is null or ra.valid_until > now())
      and ra.revoked_at is null
  ) then
    raise exception using errcode = '42501', message = 'CZ403:CELL_RELATION_REQUIRED';
  end if;
  select jsonb_build_object('id', p.id, 'display_name', p.display_name,
    'handle', p.handle, 'bio', p.bio, 'visibility', p.visibility,
    'created_at', p.created_at, 'updated_at', p.updated_at)
    into v_profile from public.profiles p where p.id = v_profile_id;
  if v_profile is null then
    raise exception using errcode = '42501', message = 'CZ403:PROFILE_UNRESOLVED';
  end if;
  select jsonb_build_object('id', c.id, 'slug', c.slug, 'name', c.name,
    'relation', 'Integrante') into v_cell
    from public.cells c where c.slug = 'cell-zero';
  select coalesce(jsonb_agg(x.record order by x.created_at desc), '[]'::jsonb)
    into v_records from (
      select jsonb_build_object('id', r.id, 'content', r.content,
        'created_at', r.created_at, 'record_kind', r.record_kind,
        'purpose', r.purpose) as record, r.created_at
      from public.cz_vnext_original_records r
      where r.profile_id = v_profile_id
      order by r.created_at desc, r.id desc limit 8
    ) x;
  select coalesce(jsonb_agg(x.item order by x.updated_at desc), '[]'::jsonb)
    into v_work from (
      select jsonb_build_object('id', w.id, 'title', w.title,
        'description', w.description, 'status', w.status, 'source', w.source,
        'created_at', w.created_at, 'updated_at', w.updated_at,
        'completed_at', w.completed_at) as item, w.updated_at
      from public.cz_vnext_work_items w
      where w.profile_id = v_profile_id and w.cell_id = (v_cell->>'id')::uuid
      order by w.updated_at desc, w.id desc limit 12
    ) x;
  return jsonb_build_object('profile', v_profile,
    'person', jsonb_build_object('id', v_actor_id, 'name',
      coalesce(v_person_name, v_profile->>'display_name')),
    'cell', v_cell, 'records', v_records, 'workItems', v_work);
end;
$$;

create or replace function public.cz_vnext_mvp_work(
  p_action text,
  p_work_id uuid,
  p_title text,
  p_description text,
  p_status text,
  p_request_key uuid
) returns jsonb
language plpgsql
security definer
set search_path = public, private, pg_temp
as $$
declare
  v_profile_id uuid := auth.uid();
  v_actor_id uuid;
  v_cell_id uuid;
  v_thread_id uuid;
  v_source_message_id text;
  v_work public.cz_vnext_work_items%rowtype;
begin
  if v_profile_id is null then
    raise exception using errcode = '42501', message = 'CZ401:AUTH_REQUIRED';
  end if;
  select (array_agg(am.actor_id))[1] into v_actor_id
  from public.actor_memberships am
  join public.actors a on a.id = am.actor_id and a.kind = 'PERSON'
  where am.profile_id = v_profile_id;
  if v_actor_id is null or (select count(*) from public.actor_memberships am
    join public.actors a on a.id = am.actor_id and a.kind = 'PERSON'
    where am.profile_id = v_profile_id) <> 1 then
    raise exception using errcode = '42501', message = 'CZ403:PERSON_UNRESOLVED';
  end if;
  select c.id into v_cell_id from public.cells c where c.slug = 'cell-zero';
  if v_cell_id is null or not exists (
    select 1 from public.role_assignments ra
    join public.role_definitions rd on rd.id = ra.role_id
    where ra.actor_id = v_actor_id and ra.cell_id = v_cell_id
      and ra.scope_type = 'CELL' and ra.scope_id = v_cell_id
      and rd.code = 'CELL_MEMBER' and rd.cell_id = v_cell_id
      and ra.policy_version_id = (select c.current_policy_version_id
        from public.cells c where c.id = v_cell_id)
      and ra.valid_from <= now() and (ra.valid_until is null or ra.valid_until > now())
      and ra.revoked_at is null
  ) then
    raise exception using errcode = '42501', message = 'CZ403:CELL_RELATION_REQUIRED';
  end if;
  select t.id into v_thread_id from public.cz_vnext_threads t
  where t.profile_id = v_profile_id and t.person_actor_id = v_actor_id
    and t.cell_id = v_cell_id;
  if v_thread_id is null then
    raise exception using errcode = '42501', message = 'CZ403:THREAD_UNRESOLVED';
  end if;
  select m.id into v_source_message_id from public.cz_vnext_messages m
  where m.thread_id = v_thread_id and m.profile_id = v_profile_id
    and m.person_actor_id = v_actor_id and m.role = 'user'
  order by m.created_at desc, m.id desc limit 1;
  if v_source_message_id is null then
    raise exception using errcode = '42501', message = 'CZ403:SOURCE_MESSAGE_REQUIRED';
  end if;
  if p_action = 'create' then
    if length(btrim(coalesce(p_title, ''))) not between 1 and 160
      or length(coalesce(p_description, '')) > 2000 or p_request_key is null
      or p_status not in ('open', 'in_progress') then
      raise exception using errcode = '22023', message = 'CZ422:INVALID_WORK';
    end if;
    insert into public.cz_vnext_work_items(profile_id, person_actor_id,
      cell_id, thread_id, source_message_id, title, description, status, request_key)
    values (v_profile_id, v_actor_id, v_cell_id, v_thread_id,
      v_source_message_id, btrim(p_title), btrim(coalesce(p_description, '')),
      p_status, p_request_key)
    on conflict (profile_id, request_key) do nothing
    returning * into v_work;
    if v_work.id is null then
      select * into v_work from public.cz_vnext_work_items
      where profile_id = v_profile_id and request_key = p_request_key;
      if v_work.title is distinct from btrim(p_title)
        or v_work.description is distinct from btrim(coalesce(p_description, ''))
        or v_work.status is distinct from p_status then
        raise exception using errcode = '23505', message = 'CZ409:WORK_REQUEST_CONFLICT';
      end if;
    end if;
  elsif p_action = 'update' then
    if p_work_id is null or p_status not in ('open', 'in_progress', 'done')
      or p_request_key is null then
      raise exception using errcode = '22023', message = 'CZ422:INVALID_WORK_UPDATE';
    end if;
    update public.cz_vnext_work_items set status = p_status,
      updated_at = now(), completed_at = case when p_status = 'done' then now() else null end,
      source_message_id = v_source_message_id, request_key = p_request_key
    where id = p_work_id and profile_id = v_profile_id and cell_id = v_cell_id
    returning * into v_work;
    if v_work.id is null then
      raise exception using errcode = '42501', message = 'CZ403:WORK_ACCESS_DENIED';
    end if;
  else
    raise exception using errcode = '22023', message = 'CZ422:INVALID_WORK_ACTION';
  end if;
  return jsonb_build_object('id', v_work.id, 'title', v_work.title,
    'description', v_work.description, 'status', v_work.status,
    'source', v_work.source, 'created_at', v_work.created_at,
    'updated_at', v_work.updated_at, 'completed_at', v_work.completed_at);
end;
$$;

revoke all on function public.cz_vnext_mvp_work(text, uuid, text, text, text, uuid)
  from public, anon;
grant execute on function public.cz_vnext_mvp_work(text, uuid, text, text, text, uuid)
  to authenticated;

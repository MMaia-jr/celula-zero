-- SPDX-License-Identifier: MPL-2.0
-- Normalized, resumable conversation and confirmed human Profile edits for the
-- founder Habitat. Conversation messages remain distinct from Original Records.

create table public.cz_vnext_threads (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete restrict,
  person_actor_id uuid not null references public.actors(id) on delete restrict,
  cell_id uuid not null references public.cells(id) on delete restrict,
  title text not null default 'Célula Zero',
  lifecycle text not null default 'onboarding'
    check (lifecycle in ('onboarding', 'active', 'archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  last_message_at timestamptz,
  unique (profile_id, cell_id),
  unique (profile_id, person_actor_id, cell_id),
  unique (profile_id, id),
  unique (profile_id, cell_id, id),
  unique (profile_id, person_actor_id, id)
);

create table public.cz_vnext_messages (
  id text not null,
  thread_id uuid not null,
  profile_id uuid not null references public.profiles(id) on delete restrict,
  person_actor_id uuid references public.actors(id) on delete restrict,
  role text not null check (role in ('user', 'assistant')),
  source text not null check (source in ('person', 'model', 'habitat_prompt')),
  parent_id text,
  message jsonb not null check (jsonb_typeof(message) = 'object'),
  provider text,
  model_id text,
  response_id text,
  input_tokens integer check (input_tokens is null or input_tokens >= 0),
  output_tokens integer check (output_tokens is null or output_tokens >= 0),
  created_at timestamptz not null default now(),
  primary key (thread_id, id),
  foreign key (profile_id, thread_id)
    references public.cz_vnext_threads(profile_id, id) on delete restrict,
  foreign key (profile_id, person_actor_id, thread_id)
    references public.cz_vnext_threads(profile_id, person_actor_id, id) on delete restrict,
  foreign key (thread_id, parent_id)
    references public.cz_vnext_messages(thread_id, id) on delete restrict,
  check ((role = 'user' and source = 'person' and person_actor_id is not null
          and provider is null and model_id is null)
      or (role = 'assistant' and source = 'model' and person_actor_id is null
          and provider is not null and model_id is not null)
      or (role = 'assistant' and source = 'habitat_prompt'
          and person_actor_id is null and provider is null and model_id is null)),
  check (message->>'id' = id and message->>'role' = role
         and jsonb_typeof(message->'parts') = 'array'
         and pg_column_size(message) <= 65536)
);

create index cz_vnext_messages_profile_created_idx
  on public.cz_vnext_messages (profile_id, created_at desc);

alter table public.cz_vnext_threads enable row level security;
alter table public.cz_vnext_messages enable row level security;
revoke all on public.cz_vnext_threads, public.cz_vnext_messages
  from public, anon, authenticated;
grant select on public.cz_vnext_threads, public.cz_vnext_messages to authenticated;

create policy cz_vnext_threads_owner_read
  on public.cz_vnext_threads for select to authenticated
  using (profile_id = (select auth.uid()));

create policy cz_vnext_messages_owner_read
  on public.cz_vnext_messages for select to authenticated
  using (profile_id = (select auth.uid()));

-- The authenticated RPC derives account/profile/person/Cell from durable
-- relationships; clients never provide the author's Person or authority.
create or replace function public.cz_vnext_ensure_mvp_thread()
returns uuid
language plpgsql
security definer
set search_path = public, private, pg_temp
as $$
declare
  v_profile_id uuid := auth.uid();
  v_actor_id uuid;
  v_cell_id uuid;
  v_thread_id uuid;
begin
  if v_profile_id is null then
    raise exception using errcode = '42501', message = 'CZ401:AUTH_REQUIRED';
  end if;
  if not exists (select 1 from public.profiles p where p.id = v_profile_id) then
    raise exception using errcode = '42501', message = 'CZ403:PROFILE_UNRESOLVED';
  end if;

  select am.actor_id into v_actor_id
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

  select c.id into v_cell_id from public.cells c where c.slug = 'cell-zero';
  if v_cell_id is null or not exists (
    select 1 from public.role_assignments ra
    join public.role_definitions rd on rd.id = ra.role_id
    where ra.actor_id = v_actor_id and ra.scope_type = 'CELL'
      and ra.scope_id = v_cell_id and rd.code = 'CELL_MEMBER'
      and rd.cell_id = v_cell_id and ra.policy_version_id = (
        select c.current_policy_version_id from public.cells c where c.id = v_cell_id
      ) and ra.valid_from <= now()
      and (ra.valid_until is null or ra.valid_until > now())
      and ra.revoked_at is null
  ) then
    raise exception using errcode = '42501', message = 'CZ403:CELL_RELATION_REQUIRED';
  end if;

  insert into public.cz_vnext_threads(profile_id, person_actor_id, cell_id)
  values (v_profile_id, v_actor_id, v_cell_id)
  on conflict (profile_id, cell_id) do nothing;
  select t.id into v_thread_id from public.cz_vnext_threads t
  where t.profile_id = v_profile_id and t.person_actor_id = v_actor_id
    and t.cell_id = v_cell_id;
  if v_thread_id is null then
    raise exception using errcode = '42501', message = 'CZ403:THREAD_IDENTITY_CONFLICT';
  end if;
  return v_thread_id;
end;
$$;

create or replace function public.cz_vnext_append_mvp_message(
  p_thread_id uuid,
  p_message_id text,
  p_parent_id text,
  p_role text,
  p_source text,
  p_message jsonb,
  p_provider text default null,
  p_model_id text default null,
  p_response_id text default null,
  p_input_tokens integer default null,
  p_output_tokens integer default null
) returns void
language plpgsql
security definer
set search_path = public, private, pg_temp
as $$
declare
  v_profile_id uuid := auth.uid();
  v_actor_id uuid;
  v_existing public.cz_vnext_messages%rowtype;
begin
  if v_profile_id is null then
    raise exception using errcode = '42501', message = 'CZ401:AUTH_REQUIRED';
  end if;
  select t.person_actor_id into v_actor_id from public.cz_vnext_threads t
  where t.id = p_thread_id and t.profile_id = v_profile_id;
  if v_actor_id is null then
    raise exception using errcode = '42501', message = 'CZ403:THREAD_ACCESS_DENIED';
  end if;
  if p_message_id is null or length(p_message_id) > 160
     or p_parent_id = p_message_id
     or p_role not in ('user', 'assistant')
     or p_message->>'id' is distinct from p_message_id
     or p_message->>'role' is distinct from p_role
     or jsonb_typeof(p_message->'parts') is distinct from 'array'
     or pg_column_size(p_message) > 65536 then
    raise exception using errcode = '22023', message = 'CZ422:INVALID_CHAT_MESSAGE';
  end if;
  if (p_role = 'user' and (p_source <> 'person' or p_provider is not null
       or p_model_id is not null or p_response_id is not null
       or p_input_tokens is not null or p_output_tokens is not null))
     or (p_role = 'assistant' and p_source = 'model'
       and (p_provider is null or p_model_id is null))
     or (p_role = 'assistant' and p_source = 'habitat_prompt'
       and (p_provider is not null or p_model_id is not null))
     or (p_role = 'assistant' and p_source not in ('model', 'habitat_prompt')) then
    raise exception using errcode = '22023', message = 'CZ422:INVALID_MESSAGE_PROVENANCE';
  end if;

  insert into public.cz_vnext_messages(
    id, thread_id, profile_id, person_actor_id, role, source, parent_id,
    message, provider, model_id, response_id, input_tokens, output_tokens
  ) values (
    p_message_id, p_thread_id, v_profile_id,
    case when p_role = 'user' then v_actor_id else null end,
    p_role, p_source, p_parent_id, p_message, p_provider, p_model_id,
    p_response_id, p_input_tokens, p_output_tokens
  ) on conflict (thread_id, id) do nothing;

  if not found then
    select * into v_existing from public.cz_vnext_messages m
    where m.thread_id = p_thread_id and m.id = p_message_id;
    if v_existing.message is distinct from p_message
       or v_existing.role is distinct from p_role
       or v_existing.source is distinct from p_source
       or v_existing.parent_id is distinct from p_parent_id
       or v_existing.provider is distinct from p_provider
       or v_existing.model_id is distinct from p_model_id then
      raise exception using errcode = '23505', message = 'CZ409:MESSAGE_ID_CONFLICT';
    end if;
  end if;

  update public.cz_vnext_threads set
    lifecycle = case when p_role = 'user' then 'active' else lifecycle end,
    updated_at = now(), last_message_at = now()
  where id = p_thread_id and profile_id = v_profile_id;
end;
$$;

create or replace function public.cz_vnext_update_own_profile(
  p_display_name text,
  p_bio text
) returns jsonb
language plpgsql
security definer
set search_path = public, private, pg_temp
as $$
declare
  v_profile_id uuid := auth.uid();
  v_person_count integer;
  v_result jsonb;
begin
  if v_profile_id is null then
    raise exception using errcode = '42501', message = 'CZ401:AUTH_REQUIRED';
  end if;
  select count(*) into v_person_count
  from public.actor_memberships am
  join public.actors a on a.id = am.actor_id and a.kind = 'PERSON'
  where am.profile_id = v_profile_id;
  if v_person_count <> 1 then
    raise exception using errcode = '42501', message = 'CZ403:PERSON_UNRESOLVED';
  end if;
  if length(btrim(coalesce(p_display_name, ''))) not between 1 and 80
     or length(coalesce(p_bio, '')) > 1000 then
    raise exception using errcode = '22023', message = 'CZ422:INVALID_PROFILE';
  end if;
  update public.profiles set display_name = btrim(p_display_name), bio = nullif(btrim(p_bio), '')
    where id = v_profile_id
    returning jsonb_build_object('id', id, 'display_name', display_name,
      'handle', handle, 'bio', bio, 'visibility', visibility) into v_result;
  if v_result is null then
    raise exception using errcode = '42501', message = 'CZ403:PROFILE_UNRESOLVED';
  end if;
  return v_result;
end;
$$;

revoke all on function public.cz_vnext_ensure_mvp_thread() from public, anon;
revoke all on function public.cz_vnext_append_mvp_message(uuid, text, text, text, text, jsonb, text, text, text, integer, integer) from public, anon;
revoke all on function public.cz_vnext_update_own_profile(text, text) from public, anon;
grant execute on function public.cz_vnext_ensure_mvp_thread() to authenticated;
grant execute on function public.cz_vnext_append_mvp_message(uuid, text, text, text, text, jsonb, text, text, text, integer, integer) to authenticated;
grant execute on function public.cz_vnext_update_own_profile(text, text) to authenticated;

-- IDENTITY-PROFILE-ALPHA-001
--
-- Profile is presentation/presence controlled by an authenticated user.
-- Actor PERSON remains the attributable subject of actions.
--
-- Preserve:
-- Profile != Login != Identity != Actor != Wallet != Reputation.

alter table public.profiles
  add column handle extensions.citext,
  add column bio text not null default '',
  add column visibility text not null default 'PRIVATE',
  add constraint profiles_handle_format check (
    handle is null
    or (
      char_length(handle::text) between 3 and 32
      and handle::text = lower(handle::text)
      and handle::text ~ '^[a-z0-9][a-z0-9_-]{1,30}[a-z0-9]$'
    )
  ),
  add constraint profiles_bio_length check (char_length(bio) <= 800),
  add constraint profiles_visibility check (visibility in ('PRIVATE', 'PUBLIC')),
  add constraint public_profile_requires_handle check (
    visibility <> 'PUBLIC' or handle is not null
  );

create unique index profiles_handle_unique
  on public.profiles(handle)
  where handle is not null;

create or replace function public.update_my_profile(
  p_handle text,
  p_display_name text,
  p_bio text,
  p_visibility text
)
returns jsonb
language plpgsql
security definer
set search_path = public, private, extensions, pg_temp
as $$
declare
  v_profile_id uuid := auth.uid();
  v_handle text := nullif(lower(trim(coalesce(p_handle, ''))), '');
  v_display_name text := trim(coalesce(p_display_name, ''));
  v_bio text := trim(coalesce(p_bio, ''));
  v_visibility text := upper(trim(coalesce(p_visibility, '')));
  v_actor_id uuid;
begin
  if v_profile_id is null then
    raise exception using errcode = '42501', message = 'CZ401:AUTHENTICATION_REQUIRED';
  end if;

  if char_length(v_display_name) < 2 or char_length(v_display_name) > 100 then
    raise exception using errcode = 'P0001', message = 'CZ422:INVALID_DISPLAY_NAME';
  end if;

  if char_length(v_bio) > 800 then
    raise exception using errcode = 'P0001', message = 'CZ422:BIO_TOO_LONG';
  end if;

  if v_visibility not in ('PRIVATE', 'PUBLIC') then
    raise exception using errcode = 'P0001', message = 'CZ422:INVALID_PROFILE_VISIBILITY';
  end if;

  if v_handle is not null and (
    char_length(v_handle) < 3
    or char_length(v_handle) > 32
    or v_handle !~ '^[a-z0-9][a-z0-9_-]{1,30}[a-z0-9]$'
  ) then
    raise exception using errcode = 'P0001', message = 'CZ422:INVALID_HANDLE';
  end if;

  if v_visibility = 'PUBLIC' and v_handle is null then
    raise exception using errcode = 'P0001', message = 'CZ422:PUBLIC_HANDLE_REQUIRED';
  end if;

  begin
    update public.profiles
    set
      handle = v_handle,
      display_name = v_display_name,
      bio = v_bio,
      visibility = v_visibility,
      updated_at = now()
    where id = v_profile_id;

    if not found then
      raise exception using errcode = 'P0001', message = 'CZ404:PROFILE_NOT_FOUND';
    end if;
  exception
    when unique_violation then
      raise exception using errcode = 'P0001', message = 'CZ409:HANDLE_TAKEN';
  end;

  select a.id into v_actor_id
  from public.actor_memberships am
  join public.actors a on a.id = am.actor_id
  where am.profile_id = v_profile_id
    and am.role = 'OWNER'
    and a.kind = 'PERSON'
    and a.operator_profile_id = v_profile_id
  order by am.created_at, a.created_at
  limit 1;

  if v_actor_id is null then
    raise exception using errcode = 'P0001', message = 'CZ409:PRIMARY_PERSON_ACTOR_MISSING';
  end if;

  -- Synchronize only the human-readable label. Profile and Actor remain
  -- distinct objects with different responsibilities.
  update public.actors
  set name = v_display_name
  where id = v_actor_id;

  return jsonb_build_object(
    'ok', true,
    'handle', v_handle,
    'display_name', v_display_name,
    'bio', v_bio,
    'visibility', v_visibility,
    'actor_id', v_actor_id
  );
end;
$$;

create or replace function public.get_public_profile(p_handle text)
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
  select
    p.handle::text,
    p.display_name,
    p.bio,
    a.id,
    a.name
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
    and p.handle = lower(trim(p_handle))::extensions.citext;
$$;

revoke all on function public.update_my_profile(text, text, text, text) from public;
grant execute on function public.update_my_profile(text, text, text, text) to authenticated;

revoke all on function public.get_public_profile(text) from public;
grant execute on function public.get_public_profile(text) to anon, authenticated;

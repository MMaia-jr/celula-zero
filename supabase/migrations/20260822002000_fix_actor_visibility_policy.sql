create or replace function private.actor_is_visible(
  p_actor_id uuid,
  p_profile_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select
    (
      p_profile_id is not null
      and exists (
        select 1
        from public.actor_memberships am
        where am.actor_id = p_actor_id
          and am.profile_id = p_profile_id
      )
    )
    or exists (
      select 1
      from public.projects p
      where p.steward_actor_id = p_actor_id
        and p.visibility = 'PUBLIC'
        and p.published_at is not null
        and p.archived_at is null
    );
$$;

drop policy if exists actors_read_public_or_own on public.actors;
create policy actors_read_public_or_own on public.actors for select to anon, authenticated
  using (
    operator_profile_id = auth.uid()
    or private.actor_is_visible(id, auth.uid())
  );

revoke all on function private.actor_is_visible(uuid, uuid) from public;
grant execute on function private.actor_is_visible(uuid, uuid) to anon, authenticated;

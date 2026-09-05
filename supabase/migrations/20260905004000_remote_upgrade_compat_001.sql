-- REMOTE-UPGRADE-COMPAT-001
--
-- Preserve authority for projects created before PARTICIPANT-BOUNDARY-001 and
-- harden hosted Supabase function ACL behavior.
--
-- Preserve:
-- membership != administration != project stewardship
-- data preservation != authority preservation
-- callable != authorized
--
-- This migration does not create new PROJECT_STEWARD authority. It only gives
-- an existing, profile-controlled project steward the zero-capability Cell
-- membership now required by PARTICIPANT-BOUNDARY-001.

alter default privileges for role postgres in schema public
  revoke execute on functions from public;

alter default privileges for role postgres in schema public
  revoke execute on functions from anon;

-- Existing Cells may predate CELL_MEMBER. Create the zero-capability role only
-- where an existing profile-controlled PROJECT_STEWARD needs compatibility.
insert into public.role_definitions(
  id,
  cell_id,
  code,
  name
)
select
  gen_random_uuid(),
  legacy.cell_id,
  'CELL_MEMBER',
  'Cell member'
from (
  select distinct p.cell_id
  from public.project_members pm
  join public.projects p
    on p.id = pm.project_id
  where pm.role = 'PROJECT_STEWARD'
    and exists (
      select 1
      from public.actor_memberships am
      where am.actor_id = pm.actor_id
        and am.role in ('OWNER', 'OPERATOR', 'REPRESENTATIVE')
    )
) legacy
where not exists (
  select 1
  from public.role_definitions rd
  where rd.cell_id = legacy.cell_id
    and rd.code = 'CELL_MEMBER'
);

-- Backfill only Cell membership implied by an already-existing stewardship.
-- CELL_MEMBER intentionally receives no capability rows.
insert into public.role_assignments(
  cell_id,
  actor_id,
  role_id,
  scope_type,
  scope_id,
  policy_version_id,
  granted_by_actor_id
)
select distinct
  p.cell_id,
  pm.actor_id,
  member_role.id,
  'CELL',
  p.cell_id,
  c.current_policy_version_id,
  coalesce(
    (
      select am.actor_id
      from public.actor_memberships am
      where am.profile_id = pm.granted_by_profile_id
        and am.role in ('OWNER', 'REPRESENTATIVE')
      order by
        case when am.actor_id = pm.actor_id then 0 else 1 end,
        am.created_at,
        am.actor_id
      limit 1
    ),
    pm.actor_id
  )
from public.project_members pm
join public.projects p
  on p.id = pm.project_id
join public.cells c
  on c.id = p.cell_id
join public.role_definitions member_role
  on member_role.cell_id = p.cell_id
 and member_role.code = 'CELL_MEMBER'
where pm.role = 'PROJECT_STEWARD'
  and c.current_policy_version_id is not null
  and exists (
    select 1
    from public.actor_memberships am
    where am.actor_id = pm.actor_id
      and am.role in ('OWNER', 'OPERATOR', 'REPRESENTATIVE')
  )
  and not exists (
    select 1
    from public.role_assignments ra
    where ra.actor_id = pm.actor_id
      and ra.cell_id = p.cell_id
      and ra.scope_type = 'CELL'
      and ra.scope_id = p.cell_id
      and ra.policy_version_id = c.current_policy_version_id
      and ra.revoked_at is null
      and (ra.valid_until is null or ra.valid_until > now())
  );

-- Hosted Supabase can grant EXECUTE directly to anon through pg_default_acl.
-- REVOKE ... FROM public does not remove a role-specific anon grant.
--
-- Security-definer functions therefore use an explicit anonymous allowlist.
do $$
declare
  fn record;
begin
  for fn in
    select p.oid::regprocedure as signature
    from pg_proc p
    join pg_namespace n
      on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.prosecdef
  loop
    execute format(
      'revoke execute on function %s from public',
      fn.signature
    );

    execute format(
      'revoke execute on function %s from anon',
      fn.signature
    );
  end loop;
end
$$;

-- Explicit anonymous read/projection allowlist preserved from canonical
-- migrations. These functions expose only deliberately public projections.
grant execute on function public.get_public_profile(text)
  to anon, authenticated;

grant execute on function public.list_public_profiles()
  to anon, authenticated;

grant execute on function public.get_public_profile_by_actor(uuid)
  to anon, authenticated;

grant execute on function public.t1_list_social_activity(boolean, integer)
  to anon, authenticated;

grant execute on function public.t2_list_social_activity(boolean, integer)
  to anon, authenticated;

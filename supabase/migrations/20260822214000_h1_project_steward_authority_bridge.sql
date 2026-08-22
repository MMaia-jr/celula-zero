-- H1.1: bridge Gate 1 project stewardship into Gate B1 contextual authority.
-- This does not add a new authority model. It keeps the existing PROJECT_STEWARD
-- project membership and B1 role assignment synchronized for projects created
-- after Gate B1 was introduced.

create or replace function private.h1_sync_project_steward_authority()
returns trigger
language plpgsql
security definer
set search_path = public, private, pg_temp
as $$
declare
  v_cell_id uuid;
  v_policy_version_id uuid;
  v_grantor_actor_id uuid;
begin
  if new.role <> 'PROJECT_STEWARD' then
    return new;
  end if;

  select p.cell_id, c.current_policy_version_id
  into v_cell_id, v_policy_version_id
  from public.projects p
  join public.cells c on c.id = p.cell_id
  where p.id = new.project_id;

  if v_cell_id is null or v_policy_version_id is null then
    raise exception using
      errcode = 'integrity_constraint_violation',
      message = 'project stewardship has no active cell policy';
  end if;

  v_grantor_actor_id := new.actor_id;

  if new.granted_by_profile_id is not null then
    select am.actor_id
    into v_grantor_actor_id
    from public.actor_memberships am
    where am.profile_id = new.granted_by_profile_id
      and am.role in ('OWNER', 'REPRESENTATIVE')
    order by
      case when am.actor_id = new.actor_id then 0 else 1 end,
      am.created_at,
      am.actor_id
    limit 1;

    v_grantor_actor_id := coalesce(v_grantor_actor_id, new.actor_id);
  end if;

  if not exists (
    select 1
    from public.role_assignments ra
    where ra.actor_id = new.actor_id
      and ra.role_id = '00000000-0000-4000-8000-00000000c202'
      and ra.scope_type = 'PROJECT'
      and ra.scope_id = new.project_id
      and ra.policy_version_id = v_policy_version_id
      and ra.revoked_at is null
      and (ra.valid_until is null or ra.valid_until > now())
  ) then
    insert into public.role_assignments(
      cell_id,
      actor_id,
      role_id,
      scope_type,
      scope_id,
      policy_version_id,
      granted_by_actor_id
    ) values (
      v_cell_id,
      new.actor_id,
      '00000000-0000-4000-8000-00000000c202',
      'PROJECT',
      new.project_id,
      v_policy_version_id,
      v_grantor_actor_id
    );
  end if;

  return new;
end;
$$;

revoke all on function private.h1_sync_project_steward_authority() from public;

drop trigger if exists h1_project_steward_authority on public.project_members;
create trigger h1_project_steward_authority
after insert on public.project_members
for each row
when (new.role = 'PROJECT_STEWARD')
execute function private.h1_sync_project_steward_authority();

-- Backfill projects whose Gate 1 membership was created after the original B1
-- migration or by fixtures that intentionally bypassed the B1 backfill.
insert into public.role_assignments(
  cell_id,
  actor_id,
  role_id,
  scope_type,
  scope_id,
  policy_version_id,
  granted_by_actor_id
)
select
  p.cell_id,
  pm.actor_id,
  '00000000-0000-4000-8000-00000000c202',
  'PROJECT',
  p.id,
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
join public.projects p on p.id = pm.project_id
join public.cells c on c.id = p.cell_id
where pm.role = 'PROJECT_STEWARD'
  and c.current_policy_version_id is not null
  and not exists (
    select 1
    from public.role_assignments ra
    where ra.actor_id = pm.actor_id
      and ra.role_id = '00000000-0000-4000-8000-00000000c202'
      and ra.scope_type = 'PROJECT'
      and ra.scope_id = pm.project_id
      and ra.policy_version_id = c.current_policy_version_id
      and ra.revoked_at is null
      and (ra.valid_until is null or ra.valid_until > now())
  );

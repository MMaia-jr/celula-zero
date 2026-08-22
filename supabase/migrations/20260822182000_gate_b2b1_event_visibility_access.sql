-- Gate B2-B1: restricted domain-event visibility.
-- Events may preserve PARTIES/PRIVATE visibility, but access must never
-- be wider than access to the corresponding material object.

alter table public.domain_events
  drop constraint domain_events_visibility_check;

alter table public.domain_events
  add constraint domain_events_visibility_check
  check (visibility in ('PROJECT', 'PUBLIC', 'PARTIES', 'PRIVATE'));

create or replace function private.b2b1_current_profile_has_policy_cell_access(
  p_policy_version_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = public, private, pg_temp
as $$
  select exists (
    select 1
    from public.policy_versions pv
    where pv.id = p_policy_version_id
      and private.b1_current_profile_has_cell_access(pv.cell_id)
  );
$$;

revoke all on function
  private.b2b1_current_profile_has_policy_cell_access(uuid)
from public;

grant execute on function
  private.b2b1_current_profile_has_policy_cell_access(uuid)
to authenticated;

drop policy domain_events_read on public.domain_events;

create policy domain_events_read
on public.domain_events
for select
to authenticated
using (
  private.b1_current_profile_controls_actor(actor_id)

  or (
    visibility in ('PROJECT', 'PUBLIC')
    and private.b2b1_current_profile_has_policy_cell_access(policy_version_id)
  )

  or (
    visibility in ('PARTIES', 'PRIVATE')
    and object_type = 'CLAIM'
    and exists (
      select 1
      from public.claims c
      where c.id = object_id
    )
  )

  or (
    visibility in ('PARTIES', 'PRIVATE')
    and object_type = 'EVIDENCE_ITEM'
    and exists (
      select 1
      from public.evidence_items e
      where e.id = object_id
    )
  )
);

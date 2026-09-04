-- PARTICIPANT-BOUNDARY-001
-- Give every authenticated PERSON participant a private Cell boundary. Project
-- creation reuses that active Cell membership and never falls back to Cell Zero.

alter table public.projects alter column cell_id drop default;

create index if not exists role_assignments_active_cell_membership
  on public.role_assignments(actor_id, cell_id, scope_id)
  where scope_type = 'CELL' and revoked_at is null;

create or replace function private.participant_has_active_cell_membership(
  p_cell_id uuid,
  p_profile_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select p_profile_id is not null and exists (
    select 1
    from public.role_assignments ra
    join public.actor_memberships am on am.actor_id = ra.actor_id
    join public.cells c on c.id = ra.cell_id
    where ra.cell_id = p_cell_id
      and ra.scope_type = 'CELL'
      and ra.scope_id = p_cell_id
      and ra.policy_version_id = c.current_policy_version_id
      and ra.valid_from <= now()
      and (ra.valid_until is null or ra.valid_until > now())
      and ra.revoked_at is null
      and am.profile_id = p_profile_id
      and am.role in ('OWNER', 'OPERATOR', 'REPRESENTATIVE')
  );
$$;

revoke all on function private.participant_has_active_cell_membership(uuid, uuid) from public;

create or replace function private.can_manage_project(
  p_project_id uuid,
  p_profile_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = public, private, pg_temp
as $$
  select p_profile_id is not null and exists (
    select 1
    from public.projects p
    join public.cells c on c.id = p.cell_id
    join public.project_members pm
      on pm.project_id = p.id and pm.role = 'PROJECT_STEWARD'
    join public.actor_memberships am
      on am.actor_id = pm.actor_id
    join public.role_assignments cell_membership
      on cell_membership.actor_id = pm.actor_id
      and cell_membership.cell_id = p.cell_id
      and cell_membership.scope_type = 'CELL'
      and cell_membership.scope_id = p.cell_id
      and cell_membership.policy_version_id = c.current_policy_version_id
    join public.role_assignments project_authority
      on project_authority.actor_id = pm.actor_id
      and project_authority.cell_id = p.cell_id
      and project_authority.scope_type = 'PROJECT'
      and project_authority.scope_id = p.id
      and project_authority.policy_version_id = c.current_policy_version_id
    join public.role_definitions project_role
      on project_role.id = project_authority.role_id
      and project_role.cell_id = p.cell_id
      and project_role.code = 'PROJECT_STEWARD'
    where p.id = p_project_id
      and am.profile_id = p_profile_id
      and am.role in ('OWNER', 'OPERATOR', 'REPRESENTATIVE')
      and cell_membership.valid_from <= now()
      and (cell_membership.valid_until is null or cell_membership.valid_until > now())
      and cell_membership.revoked_at is null
      and project_authority.valid_from <= now()
      and (project_authority.valid_until is null or project_authority.valid_until > now())
      and project_authority.revoked_at is null
  );
$$;

create or replace function private.b1_profile_has_cell_access(p_cell_id uuid, p_profile_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, private, pg_temp
as $$
  select private.participant_has_active_cell_membership(p_cell_id, p_profile_id);
$$;

drop policy if exists cells_read on public.cells;
create policy cells_read on public.cells for select to authenticated
using (private.b1_current_profile_has_cell_access(id));

drop policy if exists role_assignments_read_member on public.role_assignments;
create policy role_assignments_read_member on public.role_assignments for select to authenticated
using (private.b1_current_profile_has_cell_access(cell_id));
grant select on public.role_assignments to authenticated;

create or replace function private.h1_sync_project_steward_authority()
returns trigger
language plpgsql
security definer
set search_path = public, private, pg_temp
as $$
declare
  v_cell_id uuid;
  v_policy_version_id uuid;
  v_role_id uuid;
  v_grantor_actor_id uuid;
begin
  if new.role <> 'PROJECT_STEWARD' then return new; end if;

  select p.cell_id, c.current_policy_version_id, rd.id
  into v_cell_id, v_policy_version_id, v_role_id
  from public.projects p
  join public.cells c on c.id = p.cell_id
  join public.role_definitions rd on rd.cell_id = c.id and rd.code = 'PROJECT_STEWARD'
  where p.id = new.project_id;

  if v_cell_id is null or v_policy_version_id is null or v_role_id is null then
    raise exception using errcode = 'integrity_constraint_violation',
      message = 'project stewardship has no active cell policy or role';
  end if;

  select am.actor_id into v_grantor_actor_id
  from public.actor_memberships am
  where am.profile_id = new.granted_by_profile_id
    and am.role in ('OWNER', 'REPRESENTATIVE')
  order by case when am.actor_id = new.actor_id then 0 else 1 end, am.created_at, am.actor_id
  limit 1;

  insert into public.role_assignments(
    cell_id, actor_id, role_id, scope_type, scope_id,
    policy_version_id, granted_by_actor_id
  )
  select v_cell_id, new.actor_id, v_role_id, 'PROJECT', new.project_id,
    v_policy_version_id, coalesce(v_grantor_actor_id, new.actor_id)
  where not exists (
    select 1 from public.role_assignments ra
    where ra.actor_id = new.actor_id and ra.role_id = v_role_id
      and ra.scope_type = 'PROJECT' and ra.scope_id = new.project_id
      and ra.policy_version_id = v_policy_version_id
      and ra.revoked_at is null
      and (ra.valid_until is null or ra.valid_until > now())
  );
  return new;
end;
$$;

create or replace function public.create_project_atomic(
  p_title text, p_slug_base text, p_summary text, p_original_intent text,
  p_current_intent text, p_intended_result text, p_rules_and_limits text,
  p_needs text[], p_economic_regime text, p_stage text,
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
  v_cell_id uuid;
  v_policy_id uuid;
  v_cell_member_role_id uuid;
  v_project_steward_role_id uuid;
  v_project_id uuid;
  v_slug text := left(trim(both '-' from lower(p_slug_base)), 72);
  v_cell_slug text;
  v_version integer := 1;
begin
  if v_profile_id is null then
    raise exception using errcode = 'insufficient_privilege', message = 'authentication required';
  end if;

  select am.actor_id into v_actor_id
  from public.actor_memberships am
  join public.actors a on a.id = am.actor_id
  where am.profile_id = v_profile_id
    and am.role in ('OWNER', 'REPRESENTATIVE') and a.kind = 'PERSON'
  order by am.created_at, am.actor_id limit 1;
  if v_actor_id is null then
    raise exception using errcode = 'integrity_constraint_violation', message = 'profile has no responsible actor';
  end if;

  -- Serialize the first project for one PERSON Actor so concurrent calls cannot
  -- create two Cells before either CELL membership becomes visible.
  perform pg_advisory_xact_lock(hashtextextended(v_actor_id::text, 0));

  select ra.cell_id into v_cell_id
  from public.role_assignments ra
  join public.cells c on c.id = ra.cell_id
  where ra.actor_id = v_actor_id and ra.scope_type = 'CELL'
    and ra.scope_id = ra.cell_id and ra.policy_version_id = c.current_policy_version_id
    and ra.valid_from <= now() and (ra.valid_until is null or ra.valid_until > now())
    and ra.revoked_at is null
  order by ra.created_at, ra.id limit 1;

  if v_cell_id is null then
    v_cell_id := gen_random_uuid();
    v_policy_id := gen_random_uuid();
    v_cell_member_role_id := gen_random_uuid();
    v_project_steward_role_id := gen_random_uuid();
    v_cell_slug := 'person-' || replace(v_actor_id::text, '-', '');

    insert into public.cells(id, slug, name)
    values (v_cell_id, v_cell_slug, left('Cell · ' || (select name from public.actors where id = v_actor_id), 120));
    insert into public.policy_versions(id, cell_id, version, state, rules, created_by_actor_id)
    values (v_policy_id, v_cell_id, 1, 'ACTIVE',
      '{"default_visibility":"PRIVATE","participant_boundary":true}'::jsonb, v_actor_id);
    update public.cells set current_policy_version_id = v_policy_id where id = v_cell_id;

    insert into public.role_definitions(id, cell_id, code, name) values
      (v_cell_member_role_id, v_cell_id, 'CELL_MEMBER', 'Cell member'),
      (v_project_steward_role_id, v_cell_id, 'PROJECT_STEWARD', 'Project steward');
    insert into public.role_capabilities(role_id, capability_code)
      select v_project_steward_role_id, capability_code
      from public.role_capabilities
      where role_id = '00000000-0000-4000-8000-00000000c202';
    insert into public.role_assignments(
      cell_id, actor_id, role_id, scope_type, scope_id, policy_version_id, granted_by_actor_id
    ) values (v_cell_id, v_actor_id, v_cell_member_role_id, 'CELL', v_cell_id, v_policy_id, v_actor_id);
  end if;

  if v_slug = '' or v_slug !~ '^[a-z0-9]+(?:-[a-z0-9]+)*$' then
    raise exception using errcode = 'check_violation', message = 'invalid project slug';
  end if;
  while exists (select 1 from public.projects p where p.slug = v_slug) loop
    v_slug := left(p_slug_base, 63) || '-' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 8);
  end loop;

  insert into public.projects(
    cell_id, slug, title, summary, current_intent, steward_actor_id, stage, visibility,
    economic_regime, intended_result, rules_and_limits, needs, source_label,
    created_by_profile_id, version, published_at
  ) values (
    v_cell_id, v_slug, p_title, p_summary, p_current_intent, v_actor_id, p_stage,
    case when p_publish then 'PUBLIC' else 'PRIVATE' end, p_economic_regime,
    p_intended_result, p_rules_and_limits, p_needs, 'PILOT', v_profile_id,
    case when p_publish then 2 else 1 end, case when p_publish then now() else null end
  ) returning id, version into v_project_id, v_version;

  insert into public.project_intents(project_id, kind, content, version, accepted_at, accepted_by_profile_id)
  values (v_project_id, 'ORIGINAL', p_original_intent, 1, now(), v_profile_id),
         (v_project_id, 'INTERPRETATION', p_current_intent, 1, now(), v_profile_id);
  insert into public.project_members(project_id, actor_id, role, granted_by_profile_id)
  values (v_project_id, v_actor_id, 'PROJECT_STEWARD', v_profile_id);
  insert into public.events(project_id, event_type, title, description, actor_id,
    authorized_by_profile_id, material_version, payload)
  values (v_project_id, 'PROJECT_CREATED', 'Projeto criado',
    'Registro Original e interpretação inicial foram preservados em objetos distintos.',
    v_actor_id, v_profile_id, 1, jsonb_build_object('visibility', 'PRIVATE', 'stage', p_stage));
  if p_publish then
    insert into public.events(project_id, event_type, title, description, actor_id,
      authorized_by_profile_id, material_version, payload)
    values (v_project_id, 'PROJECT_PUBLISHED', 'Projeto aberto',
      'Leitura pública habilitada; escrita permanece restrita aos membros ativos da Cell.',
      v_actor_id, v_profile_id, v_version,
      jsonb_build_object('visibility', 'PUBLIC', 'economic_regime', p_economic_regime));
  end if;
  return query select v_project_id, v_slug;
end;
$$;

-- PUBLIC-PROJECT-CREATOR-ACCESS-001
--
-- Public Alpha contract:
-- authenticated account -> Profile -> controlled PERSON Actor -> may create a project
-- through the atomic RPC. Project creation grants stewardship only over that project.
--
-- This intentionally removes legacy pilot-membership gating from:
--   1) project creation
--   2) project stewardship checks
--
-- Direct table writes remain denied by grants/RLS. No global role, pilot membership,
-- delegation, reputation, wallet, or capability is granted here.

create or replace function private.can_manage_project(
  p_project_id uuid,
  p_profile_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select p_profile_id is not null
    and exists (
      select 1
      from public.project_members pm
      join public.actor_memberships am on am.actor_id = pm.actor_id
      where pm.project_id = p_project_id
        and pm.role = 'PROJECT_STEWARD'
        and am.profile_id = p_profile_id
        and am.role in ('OWNER', 'OPERATOR', 'REPRESENTATIVE')
    );
$$;

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
    raise exception using
      errcode = 'insufficient_privilege',
      message = 'authentication required';
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
    raise exception using
      errcode = 'integrity_constraint_violation',
      message = 'profile has no responsible actor';
  end if;

  if v_slug = '' or v_slug !~ '^[a-z0-9]+(?:-[a-z0-9]+)*$' then
    raise exception using
      errcode = 'check_violation',
      message = 'invalid project slug';
  end if;

  while exists (select 1 from public.projects p where p.slug = v_slug) loop
    v_slug := left(p_slug_base, 63)
      || '-'
      || substr(replace(gen_random_uuid()::text, '-', ''), 1, 8);
  end loop;

  insert into public.projects(
    slug,
    title,
    summary,
    current_intent,
    steward_actor_id,
    stage,
    visibility,
    economic_regime,
    intended_result,
    rules_and_limits,
    needs,
    source_label,
    created_by_profile_id,
    version,
    published_at
  ) values (
    v_slug,
    p_title,
    p_summary,
    p_current_intent,
    v_actor_id,
    p_stage,
    case when p_publish then 'PUBLIC' else 'PRIVATE' end,
    p_economic_regime,
    p_intended_result,
    p_rules_and_limits,
    p_needs,
    'PILOT',
    v_profile_id,
    case when p_publish then 2 else 1 end,
    case when p_publish then now() else null end
  )
  returning id, version into v_project_id, v_version;

  insert into public.project_intents(
    project_id,
    kind,
    content,
    version,
    accepted_at,
    accepted_by_profile_id
  )
  values
    (
      v_project_id,
      'ORIGINAL',
      p_original_intent,
      1,
      now(),
      v_profile_id
    ),
    (
      v_project_id,
      'INTERPRETATION',
      p_current_intent,
      1,
      now(),
      v_profile_id
    );

  insert into public.project_members(
    project_id,
    actor_id,
    role,
    granted_by_profile_id
  )
  values (
    v_project_id,
    v_actor_id,
    'PROJECT_STEWARD',
    v_profile_id
  );

  insert into public.events(
    project_id,
    event_type,
    title,
    description,
    actor_id,
    authorized_by_profile_id,
    material_version,
    payload
  )
  values (
    v_project_id,
    'PROJECT_CREATED',
    'Projeto criado',
    'Registro Original e interpretação inicial foram preservados em objetos distintos.',
    v_actor_id,
    v_profile_id,
    1,
    jsonb_build_object(
      'visibility',
      'PRIVATE',
      'stage',
      p_stage
    )
  );

  if p_publish then
    insert into public.events(
      project_id,
      event_type,
      title,
      description,
      actor_id,
      authorized_by_profile_id,
      material_version,
      payload
    )
    values (
      v_project_id,
      'PROJECT_PUBLISHED',
      'Projeto aberto',
      'Leitura pública habilitada; escrita permanece restrita aos responsáveis autorizados do projeto.',
      v_actor_id,
      v_profile_id,
      v_version,
      jsonb_build_object(
        'visibility',
        'PUBLIC',
        'economic_regime',
        p_economic_regime
      )
    );
  end if;

  return query select v_project_id, v_slug;
end;
$$;

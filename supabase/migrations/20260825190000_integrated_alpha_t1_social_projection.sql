-- INTEGRATED-ALPHA-001 / T1.3 SOCIAL PROJECTION
--
-- Follow relations are private-by-default participant state.
-- The activity feed is a derived, policy-controlled projection over domain_events.
-- ActivityStreams is a representation adapter; it is not the source of truth.
--
-- Preserve:
-- Social Projection != source/private record
-- visibility != reputation
-- Follow != endorsement != contribution != economic right
-- no public audience-size metric
-- no widening of Proposal / Evidence / private Original Record visibility.

create table public.follows (
  id uuid primary key default gen_random_uuid(),
  cell_id uuid not null references public.cells(id) on delete restrict,
  follower_actor_id uuid not null references public.actors(id) on delete restrict,
  target_type text not null check (target_type in ('ACTOR', 'PROJECT', 'NEED')),
  target_actor_id uuid references public.actors(id) on delete restrict,
  target_project_id uuid references public.projects(id) on delete restrict,
  target_need_id uuid references public.needs(id) on delete restrict,
  state text not null default 'ACTIVE' check (state in ('ACTIVE', 'ENDED')),
  material_version integer not null default 1 check (material_version > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  ended_at timestamptz,
  check (
    (target_type = 'ACTOR' and target_actor_id is not null and target_project_id is null and target_need_id is null)
    or
    (target_type = 'PROJECT' and target_actor_id is null and target_project_id is not null and target_need_id is null)
    or
    (target_type = 'NEED' and target_actor_id is null and target_project_id is null and target_need_id is not null)
  ),
  check (target_actor_id is null or target_actor_id <> follower_actor_id),
  check (
    (state = 'ACTIVE' and ended_at is null)
    or
    (state = 'ENDED' and ended_at is not null)
  )
);

create unique index follows_active_actor_unique
  on public.follows(follower_actor_id, target_actor_id)
  where state = 'ACTIVE' and target_type = 'ACTOR';

create unique index follows_active_project_unique
  on public.follows(follower_actor_id, target_project_id)
  where state = 'ACTIVE' and target_type = 'PROJECT';

create unique index follows_active_need_unique
  on public.follows(follower_actor_id, target_need_id)
  where state = 'ACTIVE' and target_type = 'NEED';

create index follows_follower_active
  on public.follows(follower_actor_id, created_at desc)
  where state = 'ACTIVE';

create or replace function private.t1_actor_has_public_profile(p_actor_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.profiles p
    join public.actor_memberships am
      on am.profile_id = p.id
     and am.role = 'OWNER'
     and am.actor_id = p_actor_id
    join public.actors a
      on a.id = am.actor_id
     and a.kind = 'PERSON'
     and a.operator_profile_id = p.id
    where p.visibility = 'PUBLIC'
      and p.handle is not null
  );
$$;

revoke all on function private.t1_actor_has_public_profile(uuid) from public;

create or replace function public.t1_follow_target(
  p_actor_id uuid,
  p_target_type text,
  p_target_id uuid,
  p_command_id uuid,
  p_idempotency_key text
)
returns jsonb
language plpgsql
security definer
set search_path = public, private, pg_temp
as $$
declare
  v_target_type text := upper(trim(coalesce(p_target_type, '')));
  v_cell_id uuid;
  v_project_id uuid;
  v_follow_id uuid;
  v_replayed boolean;
  v_result jsonb;
  v_payload jsonb;
begin
  if auth.uid() is null then
    raise exception using errcode = '42501', message = 'CZ401:AUTHENTICATION_REQUIRED';
  end if;

  if not private.b1_profile_controls_actor(p_actor_id, auth.uid()) then
    raise exception using errcode = '42501', message = 'CZ403:CONTROLLED_PERSON_REQUIRED';
  end if;

  if not exists (
    select 1 from public.actors
    where id = p_actor_id and kind = 'PERSON'
  ) then
    raise exception using errcode = '42501', message = 'CZ403:CONTROLLED_PERSON_REQUIRED';
  end if;

  if v_target_type = 'ACTOR' then
    if p_target_id = p_actor_id then
      raise exception using errcode = 'P0001', message = 'CZ409:SELF_FOLLOW_DENIED';
    end if;

    if not private.t1_actor_has_public_profile(p_target_id) then
      raise exception using errcode = '42501', message = 'CZ403:PUBLIC_PERSON_REQUIRED';
    end if;

    v_cell_id := '00000000-0000-4000-8000-00000000c001';
  elsif v_target_type = 'PROJECT' then
    select p.cell_id, p.id
    into v_cell_id, v_project_id
    from public.projects p
    where p.id = p_target_id
      and private.project_is_public(p.id);

    if v_cell_id is null then
      raise exception using errcode = '42501', message = 'CZ403:PUBLIC_PROJECT_REQUIRED';
    end if;
  elsif v_target_type = 'NEED' then
    select n.cell_id, n.project_id
    into v_cell_id, v_project_id
    from public.needs n
    where n.id = p_target_id
      and private.t1_need_is_public(n.id);

    if v_cell_id is null then
      raise exception using errcode = '42501', message = 'CZ403:PUBLIC_NEED_REQUIRED';
    end if;
  else
    raise exception using errcode = 'P0001', message = 'CZ422:INVALID_FOLLOW_TARGET';
  end if;

  v_payload := jsonb_build_object(
    'target_type', v_target_type,
    'target_id', p_target_id,
    'privacy', 'PRIVATE_BY_DEFAULT'
  );

  select replayed, saved_result
  into v_replayed, v_result
  from private.b1_begin_command(
    v_cell_id,
    p_actor_id,
    p_command_id,
    p_idempotency_key,
    'follow.start',
    v_payload
  );

  if v_replayed then
    return v_result;
  end if;

  select f.id into v_follow_id
  from public.follows f
  where f.follower_actor_id = p_actor_id
    and f.state = 'ACTIVE'
    and (
      (v_target_type = 'ACTOR' and f.target_actor_id = p_target_id)
      or
      (v_target_type = 'PROJECT' and f.target_project_id = p_target_id)
      or
      (v_target_type = 'NEED' and f.target_need_id = p_target_id)
    )
  limit 1;

  if v_follow_id is not null then
    v_result := jsonb_build_object(
      'ok', true,
      'follow_id', v_follow_id,
      'state', 'ACTIVE',
      'already_active', true
    );
    perform private.b1_finish_command(p_actor_id, p_idempotency_key, v_result);
    return v_result;
  end if;

  insert into public.follows(
    cell_id,
    follower_actor_id,
    target_type,
    target_actor_id,
    target_project_id,
    target_need_id
  ) values (
    v_cell_id,
    p_actor_id,
    v_target_type,
    case when v_target_type = 'ACTOR' then p_target_id end,
    case when v_target_type = 'PROJECT' then p_target_id end,
    case when v_target_type = 'NEED' then p_target_id end
  )
  returning id into v_follow_id;

  perform private.b1_record_event(
    v_cell_id,
    'FOLLOW_STARTED',
    'FOLLOW',
    v_follow_id,
    'FOLLOW',
    v_follow_id,
    p_actor_id,
    'follow.self',
    case when v_target_type = 'ACTOR' then 'CELL' else 'PROJECT' end,
    case
      when v_target_type = 'ACTOR' then v_cell_id
      else v_project_id
    end,
    p_command_id,
    null,
    1,
    'PRIVATE',
    jsonb_build_object(
      'target_type', v_target_type,
      'target_id', p_target_id
    )
  );

  v_result := jsonb_build_object(
    'ok', true,
    'follow_id', v_follow_id,
    'state', 'ACTIVE',
    'already_active', false
  );

  perform private.b1_finish_command(p_actor_id, p_idempotency_key, v_result);
  return v_result;
end;
$$;

create or replace function public.t1_unfollow_target(
  p_actor_id uuid,
  p_target_type text,
  p_target_id uuid,
  p_command_id uuid,
  p_idempotency_key text
)
returns jsonb
language plpgsql
security definer
set search_path = public, private, pg_temp
as $$
declare
  v_target_type text := upper(trim(coalesce(p_target_type, '')));
  v_follow public.follows%rowtype;
  v_replayed boolean;
  v_result jsonb;
  v_payload jsonb;
  v_project_id uuid;
begin
  if auth.uid() is null then
    raise exception using errcode = '42501', message = 'CZ401:AUTHENTICATION_REQUIRED';
  end if;

  if not private.b1_profile_controls_actor(p_actor_id, auth.uid()) then
    raise exception using errcode = '42501', message = 'CZ403:CONTROLLED_PERSON_REQUIRED';
  end if;

  if v_target_type not in ('ACTOR', 'PROJECT', 'NEED') then
    raise exception using errcode = 'P0001', message = 'CZ422:INVALID_FOLLOW_TARGET';
  end if;

  select * into v_follow
  from public.follows f
  where f.follower_actor_id = p_actor_id
    and f.state = 'ACTIVE'
    and (
      (v_target_type = 'ACTOR' and f.target_actor_id = p_target_id)
      or
      (v_target_type = 'PROJECT' and f.target_project_id = p_target_id)
      or
      (v_target_type = 'NEED' and f.target_need_id = p_target_id)
    )
  limit 1;

  if found then
    if v_target_type = 'PROJECT' then
      v_project_id := v_follow.target_project_id;
    elsif v_target_type = 'NEED' then
      select project_id into v_project_id
      from public.needs
      where id = v_follow.target_need_id;
    end if;
  end if;

  v_payload := jsonb_build_object(
    'target_type', v_target_type,
    'target_id', p_target_id
  );

  select replayed, saved_result
  into v_replayed, v_result
  from private.b1_begin_command(
    coalesce(v_follow.cell_id, '00000000-0000-4000-8000-00000000c001'),
    p_actor_id,
    p_command_id,
    p_idempotency_key,
    'follow.end',
    v_payload
  );

  if v_replayed then
    return v_result;
  end if;

  if v_follow.id is null then
    v_result := jsonb_build_object(
      'ok', true,
      'follow_id', null,
      'state', 'ENDED',
      'already_ended', true
    );
    perform private.b1_finish_command(p_actor_id, p_idempotency_key, v_result);
    return v_result;
  end if;

  update public.follows
  set
    state = 'ENDED',
    material_version = material_version + 1,
    updated_at = now(),
    ended_at = now()
  where id = v_follow.id;

  perform private.b1_record_event(
    v_follow.cell_id,
    'FOLLOW_ENDED',
    'FOLLOW',
    v_follow.id,
    'FOLLOW',
    v_follow.id,
    p_actor_id,
    'follow.self',
    case when v_target_type = 'ACTOR' then 'CELL' else 'PROJECT' end,
    case
      when v_target_type = 'ACTOR' then v_follow.cell_id
      else v_project_id
    end,
    p_command_id,
    v_follow.material_version,
    v_follow.material_version + 1,
    'PRIVATE',
    jsonb_build_object(
      'target_type', v_target_type,
      'target_id', p_target_id
    )
  );

  v_result := jsonb_build_object(
    'ok', true,
    'follow_id', v_follow.id,
    'state', 'ENDED',
    'already_ended', false
  );

  perform private.b1_finish_command(p_actor_id, p_idempotency_key, v_result);
  return v_result;
end;
$$;

alter table public.follows enable row level security;

create policy follows_read_self
on public.follows
for select
to authenticated
using (
  private.b1_current_profile_controls_actor(follower_actor_id)
);

revoke all on public.follows from anon, authenticated;
grant select on public.follows to authenticated;

revoke all on function public.t1_follow_target(uuid, text, uuid, uuid, text) from public;
grant execute on function public.t1_follow_target(uuid, text, uuid, uuid, text)
  to authenticated;

revoke all on function public.t1_unfollow_target(uuid, text, uuid, uuid, text) from public;
grant execute on function public.t1_unfollow_target(uuid, text, uuid, uuid, text)
  to authenticated;

create or replace function public.t1_list_my_follows()
returns table(
  follow_id uuid,
  target_type text,
  target_id uuid,
  target_label text,
  target_path text,
  created_at timestamptz
)
language sql
stable
security definer
set search_path = public, private, pg_temp
as $$
  select
    f.id,
    f.target_type,
    case
      when f.target_type = 'ACTOR' then f.target_actor_id
      when f.target_type = 'PROJECT' then f.target_project_id
      else f.target_need_id
    end,
    case
      when f.target_type = 'ACTOR' then coalesce(tp.display_name, ta.name, 'Person')
      when f.target_type = 'PROJECT' then pr.title
      else nv.title
    end,
    case
      when f.target_type = 'ACTOR' and tp.handle is not null
        then '/people/' || tp.handle::text
      when f.target_type = 'PROJECT'
        then '/projects/' || pr.slug
      when f.target_type = 'NEED'
        then '/needs/' || f.target_need_id::text
      else '/activity'
    end,
    f.created_at
  from public.follows f
  left join public.actors ta
    on ta.id = f.target_actor_id
  left join lateral (
    select p.handle, p.display_name
    from public.profiles p
    join public.actor_memberships am
      on am.profile_id = p.id
     and am.actor_id = f.target_actor_id
     and am.role = 'OWNER'
    where p.visibility = 'PUBLIC'
      and p.handle is not null
    order by am.created_at
    limit 1
  ) tp on true
  left join public.projects pr
    on pr.id = f.target_project_id
  left join public.needs n
    on n.id = f.target_need_id
  left join public.need_versions nv
    on nv.need_id = n.id
   and nv.version = n.current_version
  where f.state = 'ACTIVE'
    and private.b1_current_profile_controls_actor(f.follower_actor_id)
  order by f.created_at desc, f.id;
$$;

revoke all on function public.t1_list_my_follows() from public;
grant execute on function public.t1_list_my_follows() to authenticated;

create or replace function public.t1_list_social_activity(
  p_following_only boolean default false,
  p_limit integer default 50
)
returns table(
  event_id uuid,
  event_type text,
  occurred_at timestamptz,
  visibility text,
  actor_id uuid,
  actor_name text,
  actor_handle text,
  target_type text,
  target_id uuid,
  target_label text,
  target_path text,
  project_id uuid,
  project_slug text,
  need_id uuid,
  opportunity_id uuid,
  commitment_id uuid,
  is_followed boolean
)
language sql
stable
security definer
set search_path = public, private, pg_temp
as $$
  with contexts as (
    select
      e.*,
      case
        when e.aggregate_type = 'NEED' then e.aggregate_id
        when e.object_type = 'NEED' then e.object_id
        else null
      end as direct_need_id,
      case
        when e.aggregate_type = 'OPPORTUNITY' then e.aggregate_id
        when e.object_type = 'OPPORTUNITY' then e.object_id
        else null
      end as direct_opportunity_id,
      case
        when e.aggregate_type = 'PROPOSAL' then e.aggregate_id
        when e.object_type = 'PROPOSAL' then e.object_id
        else null
      end as direct_proposal_id,
      case
        when e.aggregate_type = 'COMMITMENT' then e.aggregate_id
        when e.object_type = 'COMMITMENT' then e.object_id
        else null
      end as direct_commitment_id,
      case
        when e.aggregate_type = 'FOLLOW' then e.aggregate_id
        when e.object_type = 'FOLLOW' then e.object_id
        else null
      end as direct_follow_id
    from public.domain_events e
    where e.event_type in (
      'NEED_CREATED',
      'NEED_PUBLISHED',
      'OPPORTUNITY_CREATED',
      'OPPORTUNITY_LINKED_TO_NEED',
      'OPPORTUNITY_PUBLISHED',
      'PROPOSAL_SUBMITTED',
      'PROPOSAL_REVISION_REQUESTED',
      'PROPOSAL_REVISED',
      'PROPOSAL_REJECTED',
      'PROPOSAL_ACCEPTED',
      'OPPORTUNITY_CAPACITY_FILLED',
      'FOLLOW_STARTED',
      'FOLLOW_ENDED'
    )
  ),
  resolved as (
    select
      c.*,
      coalesce(n_direct.id, o.need_id) as resolved_need_id,
      o.id as resolved_opportunity_id,
      prop.id as resolved_proposal_id,
      com.id as resolved_commitment_id,
      coalesce(n_direct.project_id, o.project_id, com.project_id) as resolved_project_id,
      pr.slug as resolved_project_slug,
      pr.title as project_title,
      nv.title as need_title,
      ov.title as opportunity_title,
      fol.target_type as follow_target_type,
      fol.target_actor_id,
      fol.target_project_id,
      fol.target_need_id,
      fa.name as follow_actor_name,
      fap.handle::text as follow_actor_handle,
      fap.display_name as follow_actor_display_name,
      fpr.title as follow_project_title,
      fnv.title as follow_need_title,
      actor.name as raw_actor_name,
      ap.handle::text as public_actor_handle,
      ap.display_name as public_actor_display_name,
      (
        auth.uid() is not null
        and (
          private.b1_current_profile_controls_actor(c.actor_id)
          or (
            coalesce(n_direct.project_id, o.project_id, com.project_id) is not null
            and private.can_manage_project(
              coalesce(n_direct.project_id, o.project_id, com.project_id),
              auth.uid()
            )
          )
          or (
            prop.proposer_actor_id is not null
            and private.b1_profile_controls_actor(prop.proposer_actor_id, auth.uid())
          )
          or (
            com.id is not null
            and (
              private.b1_profile_controls_actor(com.proposer_actor_id, auth.uid())
              or private.b1_profile_controls_actor(com.accepted_by_actor_id, auth.uid())
            )
          )
        )
      ) as viewer_context_authorized
    from contexts c
    left join public.needs n_direct
      on n_direct.id = c.direct_need_id
    left join public.proposals prop
      on prop.id = c.direct_proposal_id
    left join public.commitments com
      on com.id = c.direct_commitment_id
    left join public.opportunities o
      on o.id = coalesce(
        c.direct_opportunity_id,
        prop.opportunity_id,
        com.opportunity_id
      )
    left join public.projects pr
      on pr.id = coalesce(n_direct.project_id, o.project_id, com.project_id)
    left join public.need_versions nv
      on nv.need_id = coalesce(n_direct.id, o.need_id)
     and nv.version = (
       select n2.current_version
       from public.needs n2
       where n2.id = coalesce(n_direct.id, o.need_id)
     )
    left join public.opportunity_versions ov
      on ov.opportunity_id = o.id
     and ov.version = o.current_version
    left join public.follows fol
      on fol.id = c.direct_follow_id
    left join public.actors fa
      on fa.id = fol.target_actor_id
    left join lateral (
      select p.handle, p.display_name
      from public.profiles p
      join public.actor_memberships am
        on am.profile_id = p.id
       and am.actor_id = fol.target_actor_id
       and am.role = 'OWNER'
      where p.visibility = 'PUBLIC'
        and p.handle is not null
      order by am.created_at
      limit 1
    ) fap on true
    left join public.projects fpr
      on fpr.id = fol.target_project_id
    left join public.needs fn
      on fn.id = fol.target_need_id
    left join public.need_versions fnv
      on fnv.need_id = fn.id
     and fnv.version = fn.current_version
    left join public.actors actor
      on actor.id = c.actor_id
    left join lateral (
      select p.handle, p.display_name
      from public.profiles p
      join public.actor_memberships am
        on am.profile_id = p.id
       and am.actor_id = c.actor_id
       and am.role = 'OWNER'
      where p.visibility = 'PUBLIC'
        and p.handle is not null
      order by am.created_at
      limit 1
    ) ap on true
  ),
  visible as (
    select
      r.*,
      (
        auth.uid() is not null
        and exists (
          select 1
          from public.follows f
          where f.state = 'ACTIVE'
            and private.b1_current_profile_controls_actor(f.follower_actor_id)
            and (
              (f.target_type = 'ACTOR' and f.target_actor_id = r.actor_id)
              or
              (f.target_type = 'PROJECT' and f.target_project_id = r.resolved_project_id)
              or
              (f.target_type = 'NEED' and f.target_need_id = r.resolved_need_id)
            )
        )
      ) as viewer_follows_context
    from resolved r
    where
      (
        (
          r.visibility = 'PUBLIC'
          and (
            (
              r.resolved_need_id is not null
              and private.t1_need_is_public(r.resolved_need_id)
            )
            or (
              r.resolved_opportunity_id is not null
              and exists (
                select 1
                from public.opportunities public_o
                where public_o.id = r.resolved_opportunity_id
                  and public_o.visibility = 'PUBLIC'
                  and private.project_is_public(public_o.project_id)
              )
            )
            or (
              r.resolved_need_id is null
              and r.resolved_opportunity_id is null
              and r.resolved_project_id is not null
              and private.project_is_public(r.resolved_project_id)
            )
          )
        )
        or r.viewer_context_authorized
      )
      and (
        r.visibility <> 'PRIVATE'
        or private.b1_current_profile_controls_actor(r.actor_id)
      )
  )
  select
    v.id,
    v.event_type,
    v.occurred_at,
    v.visibility,
    case
      when v.public_actor_handle is not null or v.viewer_context_authorized
        then v.actor_id
      else null
    end,
    case
      when v.public_actor_display_name is not null
        then v.public_actor_display_name
      when auth.uid() is not null and v.viewer_context_authorized
        then coalesce(v.raw_actor_name, 'Participant')
      else 'Participant'
    end,
    v.public_actor_handle,
    case
      when v.event_type in ('FOLLOW_STARTED', 'FOLLOW_ENDED')
        then coalesce(v.follow_target_type, 'FOLLOW')
      when v.event_type = 'PROPOSAL_ACCEPTED' and v.resolved_commitment_id is not null
        then 'COMMITMENT'
      when v.resolved_opportunity_id is not null
        then 'OPPORTUNITY'
      when v.resolved_need_id is not null
        then 'NEED'
      when v.resolved_project_id is not null
        then 'PROJECT'
      else v.object_type
    end,
    case
      when v.event_type in ('FOLLOW_STARTED', 'FOLLOW_ENDED') and v.follow_target_type = 'ACTOR'
        then v.target_actor_id
      when v.event_type in ('FOLLOW_STARTED', 'FOLLOW_ENDED') and v.follow_target_type = 'PROJECT'
        then v.target_project_id
      when v.event_type in ('FOLLOW_STARTED', 'FOLLOW_ENDED') and v.follow_target_type = 'NEED'
        then v.target_need_id
      when v.event_type = 'PROPOSAL_ACCEPTED' and v.resolved_commitment_id is not null
        then v.resolved_commitment_id
      when v.resolved_opportunity_id is not null
        then v.resolved_opportunity_id
      when v.resolved_need_id is not null
        then v.resolved_need_id
      else v.object_id
    end,
    case
      when v.event_type in ('FOLLOW_STARTED', 'FOLLOW_ENDED') and v.follow_target_type = 'ACTOR'
        then coalesce(v.follow_actor_display_name, v.follow_actor_name, 'Person')
      when v.event_type in ('FOLLOW_STARTED', 'FOLLOW_ENDED') and v.follow_target_type = 'PROJECT'
        then coalesce(v.follow_project_title, 'Project')
      when v.event_type in ('FOLLOW_STARTED', 'FOLLOW_ENDED') and v.follow_target_type = 'NEED'
        then coalesce(v.follow_need_title, 'Need')
      when v.event_type = 'PROPOSAL_ACCEPTED' and v.resolved_commitment_id is not null
        then coalesce(v.opportunity_title, 'Commitment')
      when v.resolved_opportunity_id is not null
        then coalesce(v.opportunity_title, 'Opportunity')
      when v.resolved_need_id is not null
        then coalesce(v.need_title, 'Need')
      else coalesce(v.project_title, v.object_type)
    end,
    case
      when v.event_type in ('FOLLOW_STARTED', 'FOLLOW_ENDED') and v.follow_target_type = 'ACTOR'
           and v.follow_actor_handle is not null
        then '/people/' || v.follow_actor_handle
      when v.event_type in ('FOLLOW_STARTED', 'FOLLOW_ENDED') and v.follow_target_type = 'PROJECT'
           and v.target_project_id is not null
        then '/projects/' || (
          select p.slug from public.projects p where p.id = v.target_project_id
        )
      when v.event_type in ('FOLLOW_STARTED', 'FOLLOW_ENDED') and v.follow_target_type = 'NEED'
           and v.target_need_id is not null
        then '/needs/' || v.target_need_id::text
      when v.event_type = 'PROPOSAL_ACCEPTED' and v.resolved_commitment_id is not null
        then '/commitments/' || v.resolved_commitment_id::text
      when v.resolved_opportunity_id is not null and v.resolved_project_slug is not null
        then '/projects/' || v.resolved_project_slug || '/opportunities/' || v.resolved_opportunity_id::text
      when v.resolved_need_id is not null
        then '/needs/' || v.resolved_need_id::text
      when v.resolved_project_slug is not null
        then '/projects/' || v.resolved_project_slug
      else '/activity'
    end,
    v.resolved_project_id,
    v.resolved_project_slug,
    v.resolved_need_id,
    v.resolved_opportunity_id,
    case
      when v.event_type = 'PROPOSAL_ACCEPTED' and v.viewer_context_authorized
        then v.resolved_commitment_id
      else null
    end,
    v.viewer_follows_context
  from visible v
  where
    not coalesce(p_following_only, false)
    or (
      auth.uid() is not null
      and v.viewer_follows_context
    )
  order by v.occurred_at desc, v.id desc
  limit greatest(1, least(coalesce(p_limit, 50), 100));
$$;

revoke all on function public.t1_list_social_activity(boolean, integer) from public;
grant execute on function public.t1_list_social_activity(boolean, integer)
  to anon, authenticated;

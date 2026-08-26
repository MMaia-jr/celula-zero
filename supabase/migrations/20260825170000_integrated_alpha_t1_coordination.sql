-- INTEGRATED-ALPHA-001 / T1.2 COORDINATION
--
-- Additive coordination bridge:
-- first-class Need -> Opportunity -> Proposal review -> Commitment.
--
-- Preserve:
-- Need != Opportunity
-- Proposal != Commitment
-- Commitment != Contribution != Evidence != Outcome
-- external public proposal/revision grants no role or delegation
-- exact material/version checks remain authoritative.

alter table public.needs
  add constraint needs_id_project_unique unique (id, project_id);

alter table public.opportunities
  add column need_id uuid;

alter table public.opportunities
  add constraint opportunities_need_project_fk
  foreign key (need_id, project_id)
  references public.needs(id, project_id)
  on delete restrict;

create index opportunities_need_id
  on public.opportunities(need_id)
  where need_id is not null;

create or replace function public.t1_create_opportunity_for_need(
  p_actor_id uuid,
  p_project_id uuid,
  p_need_id uuid,
  p_title text,
  p_statement text,
  p_conditions text,
  p_expected_result text,
  p_capacity integer,
  p_command_id uuid,
  p_idempotency_key text
)
returns jsonb
language plpgsql
security definer
set search_path = public, private, pg_temp
as $$
declare
  v_need public.needs%rowtype;
  v_created jsonb;
  v_opportunity public.opportunities%rowtype;
  v_opportunity_id uuid;
  v_material_version integer;
begin
  select * into v_need
  from public.needs
  where id = p_need_id;

  if not found then
    raise exception using errcode = 'P0001', message = 'CZ404:NEED_NOT_FOUND';
  end if;

  if v_need.project_id <> p_project_id then
    raise exception using errcode = 'P0001', message = 'CZ409:NEED_PROJECT_MISMATCH';
  end if;

  if v_need.state <> 'OPEN' then
    raise exception using errcode = 'P0001', message = 'CZ409:NEED_NOT_OPEN';
  end if;

  -- Existing B1 command remains the authority boundary for Opportunity creation.
  v_created := public.b1_create_opportunity(
    p_actor_id,
    p_project_id,
    p_title,
    p_statement,
    p_conditions,
    p_expected_result,
    p_capacity,
    p_command_id,
    p_idempotency_key
  );

  if coalesce((v_created ->> 'ok')::boolean, false) is not true
     or v_created ->> 'opportunity_id' is null then
    return v_created;
  end if;

  v_opportunity_id := (v_created ->> 'opportunity_id')::uuid;

  select * into v_opportunity
  from public.opportunities
  where id = v_opportunity_id
  for update;

  if not found then
    raise exception using errcode = 'integrity_constraint_violation',
      message = 'created Opportunity material missing';
  end if;

  if v_opportunity.project_id <> p_project_id then
    raise exception using errcode = 'integrity_constraint_violation',
      message = 'created Opportunity project mismatch';
  end if;

  -- Idempotent replay: the underlying B1 command receipt may already be
  -- completed. Do not emit another relation event or increment material state.
  if v_opportunity.need_id is null then
    v_material_version := v_opportunity.material_version + 1;

    update public.opportunities
    set
      need_id = p_need_id,
      material_version = v_material_version,
      updated_at = now()
    where id = v_opportunity_id;

    perform private.b1_record_decision(
      v_opportunity.cell_id,
      'OPPORTUNITY_LINK_NEED',
      'ALLOW',
      'OPPORTUNITY',
      v_opportunity_id,
      p_actor_id,
      'opportunity.create',
      'PROJECT',
      p_project_id,
      'first-class Need linked to Opportunity without collapsing either object',
      p_command_id,
      v_opportunity.current_version,
      null,
      jsonb_build_object(
        'need_id', p_need_id,
        'semantic_boundary', 'NEED_NE_OPPORTUNITY'
      )
    );

    perform private.b1_record_event(
      v_opportunity.cell_id,
      'OPPORTUNITY_LINKED_TO_NEED',
      'OPPORTUNITY',
      v_opportunity_id,
      'NEED',
      p_need_id,
      p_actor_id,
      'opportunity.create',
      'PROJECT',
      p_project_id,
      p_command_id,
      v_opportunity.material_version,
      v_material_version,
      'PROJECT',
      jsonb_build_object(
        'need_id', p_need_id,
        'opportunity_version', v_opportunity.current_version
      )
    );
  elsif v_opportunity.need_id = p_need_id then
    v_material_version := v_opportunity.material_version;
  else
    raise exception using errcode = 'P0001', message = 'CZ409:OPPORTUNITY_ALREADY_LINKED_TO_OTHER_NEED';
  end if;

  return v_created || jsonb_build_object(
    'need_id', p_need_id,
    'material_version', v_material_version
  );
end;
$$;

-- Public proposal entry is intentionally bounded and grants no role.
-- A revision requested by the steward must remain inhabitable for the same
-- external proposer without silently granting proposal.revise globally.
create or replace function public.t1_submit_public_proposal_revision(
  p_actor_id uuid,
  p_proposal_id uuid,
  p_expected_material_version integer,
  p_statement text,
  p_conditions text,
  p_expected_delivery text,
  p_reward_expectation text,
  p_command_id uuid,
  p_idempotency_key text
)
returns jsonb
language plpgsql
security definer
set search_path = public, private, pg_temp
as $$
declare
  v_actor public.actors%rowtype;
  v_proposal public.proposals%rowtype;
  v_opportunity public.opportunities%rowtype;
  v_replayed boolean;
  v_result jsonb;
  v_new_version integer;
  v_payload jsonb;
begin
  if auth.uid() is null then
    raise exception using errcode = '42501', message = 'CZ401:AUTHENTICATION_REQUIRED';
  end if;

  select * into v_actor
  from public.actors
  where id = p_actor_id;

  if not found
     or v_actor.kind <> 'PERSON'
     or not private.b1_profile_controls_actor(p_actor_id, auth.uid()) then
    raise exception using errcode = '42501', message = 'CZ403:CONTROLLED_PERSON_REQUIRED';
  end if;

  select * into v_proposal
  from public.proposals
  where id = p_proposal_id;

  if not found then
    raise exception using errcode = 'P0001', message = 'CZ404:PROPOSAL_NOT_FOUND';
  end if;

  if v_proposal.proposer_actor_id <> p_actor_id then
    raise exception using errcode = '42501', message = 'CZ403:PROPOSER_REQUIRED';
  end if;

  select * into v_opportunity
  from public.opportunities
  where id = v_proposal.opportunity_id;

  if not found then
    raise exception using errcode = 'integrity_constraint_violation',
      message = 'proposal Opportunity missing';
  end if;

  if v_opportunity.state <> 'OPEN'
     or v_opportunity.visibility <> 'PUBLIC'
     or not private.project_is_public(v_opportunity.project_id) then
    raise exception using errcode = '42501', message = 'CZ403:PUBLIC_OPEN_OPPORTUNITY_REQUIRED';
  end if;

  v_payload := jsonb_build_object(
    'proposal_id', p_proposal_id,
    'expected_material_version', p_expected_material_version,
    'statement', p_statement,
    'conditions', p_conditions,
    'expected_delivery', p_expected_delivery,
    'reward_expectation', p_reward_expectation,
    'authorization_basis', 'PUBLIC_PROPOSAL_REVISION'
  );

  select replayed, saved_result
  into v_replayed, v_result
  from private.b1_begin_command(
    v_proposal.cell_id,
    p_actor_id,
    p_command_id,
    p_idempotency_key,
    'proposal.public_revise',
    v_payload
  );

  if v_replayed then
    return v_result;
  end if;

  select * into v_proposal
  from public.proposals
  where id = p_proposal_id
  for update;

  if v_proposal.material_version <> p_expected_material_version then
    raise exception using errcode = 'P0001', message = 'CZ409:STALE_VERSION';
  end if;

  if v_proposal.state <> 'REVISION_REQUESTED' then
    raise exception using errcode = 'P0001', message = 'CZ409:INVALID_STATE';
  end if;

  v_new_version := v_proposal.current_version + 1;

  insert into public.proposal_versions(
    proposal_id,
    version,
    statement,
    conditions,
    expected_delivery,
    reward_expectation,
    created_by_actor_id
  ) values (
    p_proposal_id,
    v_new_version,
    p_statement,
    p_conditions,
    p_expected_delivery,
    p_reward_expectation,
    p_actor_id
  );

  update public.proposals
  set
    state = 'SUBMITTED',
    current_version = v_new_version,
    material_version = material_version + 1,
    updated_at = now()
  where id = p_proposal_id;

  perform private.b1_record_decision(
    v_proposal.cell_id,
    'PUBLIC_PROPOSAL_REVISE',
    'ALLOW',
    'PROPOSAL',
    p_proposal_id,
    p_actor_id,
    'proposal.revise',
    'OPPORTUNITY',
    v_proposal.opportunity_id,
    'controlled public proposer supplied a requested immutable revision; no role or delegation granted',
    p_command_id,
    v_opportunity.current_version,
    v_new_version,
    jsonb_build_object('authorization_basis', 'PUBLIC_PROPOSAL_REVISION')
  );

  perform private.b1_record_event(
    v_proposal.cell_id,
    'PROPOSAL_REVISED',
    'PROPOSAL',
    p_proposal_id,
    'PROPOSAL',
    p_proposal_id,
    p_actor_id,
    'proposal.revise',
    'OPPORTUNITY',
    v_proposal.opportunity_id,
    p_command_id,
    v_proposal.material_version,
    v_proposal.material_version + 1,
    'PROJECT',
    jsonb_build_object(
      'version', v_new_version,
      'authorization_basis', 'PUBLIC_PROPOSAL_REVISION'
    )
  );

  v_result := jsonb_build_object(
    'ok', true,
    'proposal_id', p_proposal_id,
    'version', v_new_version,
    'material_version', v_proposal.material_version + 1,
    'state', 'SUBMITTED'
  );

  perform private.b1_finish_command(p_actor_id, p_idempotency_key, v_result);
  return v_result;
end;
$$;


create or replace function public.t1_get_visible_coordination_actor_labels(
  p_opportunity_id uuid
)
returns table(
  actor_id uuid,
  actor_name text
)
language sql
stable
security definer
set search_path = public, private, pg_temp
as $$
  with target as (
    select o.id, o.project_id, o.owner_actor_id
    from public.opportunities o
    where o.id = p_opportunity_id
  ),
  allowed as (
    select a.id
    from target t
    join public.actors a on a.id = t.owner_actor_id
    where auth.uid() is not null
      and (
        private.can_manage_project(t.project_id, auth.uid())
        or exists (
          select 1
          from public.proposals p
          where p.opportunity_id = t.id
            and private.b1_profile_controls_actor(p.proposer_actor_id, auth.uid())
        )
      )

    union

    select a.id
    from target t
    join public.proposals p on p.opportunity_id = t.id
    join public.actors a on a.id = p.proposer_actor_id
    where auth.uid() is not null
      and (
        private.can_manage_project(t.project_id, auth.uid())
        or private.b1_profile_controls_actor(p.proposer_actor_id, auth.uid())
      )

    union

    select a.id
    from target t
    join public.commitments c on c.opportunity_id = t.id
    join public.actors a
      on a.id in (c.proposer_actor_id, c.accepted_by_actor_id)
    where auth.uid() is not null
      and (
        private.can_manage_project(t.project_id, auth.uid())
        or private.b1_profile_controls_actor(c.proposer_actor_id, auth.uid())
        or private.b1_profile_controls_actor(c.accepted_by_actor_id, auth.uid())
      )
  )
  select a.id, a.name
  from public.actors a
  join allowed x on x.id = a.id
  order by a.name, a.id;
$$;

revoke all on function public.t1_create_opportunity_for_need(
  uuid, uuid, uuid, text, text, text, text, integer, uuid, text
) from public;
grant execute on function public.t1_create_opportunity_for_need(
  uuid, uuid, uuid, text, text, text, text, integer, uuid, text
) to authenticated;

revoke all on function public.t1_submit_public_proposal_revision(
  uuid, uuid, integer, text, text, text, text, uuid, text
) from public;
grant execute on function public.t1_submit_public_proposal_revision(
  uuid, uuid, integer, text, text, text, text, uuid, text
) to authenticated;


revoke all on function public.t1_get_visible_coordination_actor_labels(uuid) from public;
grant execute on function public.t1_get_visible_coordination_actor_labels(uuid)
  to authenticated;

-- R2-2D — BOUNDED AI PROPOSAL AUTHORIZATION
--
-- Concrete property:
-- A human Project Steward can authorize one attributable AI actor to exercise
-- proposal.submit only inside one specific Opportunity, without granting a
-- CONTRIBUTOR / AGENT_OPERATOR role or permanent project authority.
--
-- Reuse:
-- - existing actors(kind='AI_AGENT')
-- - existing actor control
-- - existing delegations
-- - existing proposal.submit
-- - existing proposal.accept / Commitment
--
-- Preserve:
-- Human authorization != AI proposal
-- AI proposal != Human Direction
-- delegation != role
-- proposal != acceptance != Commitment
-- technical capability != economic right

insert into public.capability_definitions(code, description) values
  ('proposal.authorize_ai',
   'Authorize a controlled AI actor to submit proposals only within one explicitly bounded Opportunity.')
on conflict (code) do nothing;

insert into public.role_capabilities(role_id, capability_code) values
  ('00000000-0000-4000-8000-00000000c202', 'proposal.authorize_ai')
on conflict do nothing;

create or replace function public.t1_authorize_ai_proposal(
  p_actor_id uuid,
  p_project_id uuid,
  p_opportunity_id uuid,
  p_agent_actor_id uuid,
  p_valid_until timestamptz,
  p_command_id uuid,
  p_idempotency_key text
)
returns jsonb
language plpgsql
security definer
set search_path = public, private, pg_temp
as $$
declare
  v_o public.opportunities%rowtype;
  v_agent public.actors%rowtype;
  v_cell public.cells%rowtype;
  v_actor_kind text;
  v_profile_id uuid := auth.uid();
  v_replayed boolean;
  v_result jsonb;
  v_delegation_id uuid;
  v_payload jsonb;
begin
  select *
  into v_o
  from public.opportunities
  where id = p_opportunity_id;

  if not found then
    raise exception using errcode = 'P0001', message = 'CZ404:OPPORTUNITY_NOT_FOUND';
  end if;

  if v_o.project_id <> p_project_id then
    raise exception using errcode = '22023', message = 'CZ422:OPPORTUNITY_PROJECT_MISMATCH';
  end if;

  if v_o.state <> 'OPEN' or v_o.visibility <> 'PROJECT' then
    raise exception using errcode = 'P0001', message = 'CZ409:INTERNAL_OPEN_OPPORTUNITY_REQUIRED';
  end if;

  perform private.b1_authorize_actor(
    p_actor_id,
    'proposal.authorize_ai',
    'PROJECT',
    p_project_id
  );

  select kind
  into v_actor_kind
  from public.actors
  where id = p_actor_id;

  if v_actor_kind <> 'PERSON' then
    raise exception using errcode = '42501', message = 'CZ403:HUMAN_STEWARD_REQUIRED';
  end if;

  if not exists (
    select 1
    from public.projects p
    where p.id = p_project_id
      and p.steward_actor_id = p_actor_id
  ) then
    raise exception using errcode = '42501', message = 'CZ403:HUMAN_PROJECT_STEWARD_REQUIRED';
  end if;

  select *
  into v_agent
  from public.actors
  where id = p_agent_actor_id;

  if not found or v_agent.kind <> 'AI_AGENT' then
    raise exception using errcode = '22023', message = 'CZ422:AI_AGENT_REQUIRED';
  end if;

  if v_profile_id is null
     or v_agent.operator_profile_id is distinct from v_profile_id
     or not private.b1_current_profile_controls_actor(p_agent_actor_id) then
    raise exception using errcode = '42501', message = 'CZ403:CONTROLLED_AI_AGENT_REQUIRED';
  end if;

  if p_agent_actor_id = p_actor_id then
    raise exception using errcode = '22023', message = 'CZ422:DISTINCT_AI_PROPOSER_REQUIRED';
  end if;

  if p_valid_until <= now()
     or p_valid_until > now() + interval '15 minutes' then
    raise exception using errcode = '22023', message = 'CZ422:INVALID_AI_PROPOSAL_AUTH_WINDOW';
  end if;

  if exists (
    select 1
    from public.proposals p
    where p.opportunity_id = p_opportunity_id
      and p.proposer_actor_id = p_agent_actor_id
  ) then
    raise exception using errcode = 'P0001', message = 'CZ409:AI_PROPOSAL_ALREADY_EXISTS';
  end if;

  if private.b1_has_capability(
       p_agent_actor_id,
       'proposal.submit',
       'OPPORTUNITY',
       p_opportunity_id
     ) then
    raise exception using errcode = 'P0001', message = 'CZ409:AI_ALREADY_HAS_PROPOSAL_SUBMIT';
  end if;

  select *
  into v_cell
  from public.cells
  where id = v_o.cell_id;

  if not found or v_cell.current_policy_version_id is null then
    raise exception using
      errcode = 'integrity_constraint_violation',
      message = 'Opportunity cell has no active policy';
  end if;

  v_payload := jsonb_build_object(
    'project_id', p_project_id,
    'opportunity_id', p_opportunity_id,
    'agent_actor_id', p_agent_actor_id,
    'capability', 'proposal.submit',
    'scope_type', 'OPPORTUNITY',
    'valid_until', p_valid_until,
    'authority_mode', 'BOUNDED_AI_PROPOSAL_ONLY',
    'role_granted', false,
    'economic_right_granted', false,
    'decision_authority_granted', false
  );

  select replayed, saved_result
  into v_replayed, v_result
  from private.b1_begin_command(
    v_o.cell_id,
    p_actor_id,
    p_command_id,
    p_idempotency_key,
    'proposal.authorize_ai',
    v_payload
  );

  if v_replayed then
    return v_result;
  end if;

  insert into public.delegations(
    cell_id,
    delegator_actor_id,
    delegate_actor_id,
    capability_code,
    scope_type,
    scope_id,
    policy_version_id,
    valid_until
  ) values (
    v_o.cell_id,
    p_actor_id,
    p_agent_actor_id,
    'proposal.submit',
    'OPPORTUNITY',
    p_opportunity_id,
    v_cell.current_policy_version_id,
    p_valid_until
  )
  returning id into v_delegation_id;

  perform private.b1_record_decision(
    v_o.cell_id,
    'AI_PROPOSAL_AUTHORIZE',
    'ALLOW',
    'DELEGATION',
    v_delegation_id,
    p_actor_id,
    'proposal.authorize_ai',
    'OPPORTUNITY',
    p_opportunity_id,
    'human Project Steward authorized one controlled AI proposer within one Opportunity; no role or decision authority granted',
    p_command_id,
    v_o.current_version,
    null,
    jsonb_build_object(
      'agent_actor_id', p_agent_actor_id,
      'capability', 'proposal.submit',
      'valid_until', p_valid_until,
      'authority_mode', 'BOUNDED_AI_PROPOSAL_ONLY',
      'role_granted', false,
      'economic_right_granted', false,
      'decision_authority_granted', false
    )
  );

  perform private.b1_record_event(
    v_o.cell_id,
    'AI_PROPOSAL_AUTHORIZED',
    'DELEGATION',
    v_delegation_id,
    'ACTOR',
    p_agent_actor_id,
    p_actor_id,
    'proposal.authorize_ai',
    'OPPORTUNITY',
    p_opportunity_id,
    p_command_id,
    null,
    1,
    'PROJECT',
    jsonb_build_object(
      'agent_actor_id', p_agent_actor_id,
      'capability', 'proposal.submit',
      'scope_type', 'OPPORTUNITY',
      'scope_id', p_opportunity_id,
      'valid_until', p_valid_until,
      'authority_mode', 'BOUNDED_AI_PROPOSAL_ONLY',
      'role_granted', false,
      'economic_right_granted', false,
      'decision_authority_granted', false
    )
  );

  v_result := jsonb_build_object(
    'ok', true,
    'delegation_id', v_delegation_id,
    'agent_actor_id', p_agent_actor_id,
    'capability', 'proposal.submit',
    'scope_type', 'OPPORTUNITY',
    'scope_id', p_opportunity_id,
    'valid_until', p_valid_until,
    'state', 'ACTIVE',
    'role_granted', false
  );

  perform private.b1_finish_command(
    p_actor_id,
    p_idempotency_key,
    v_result
  );

  return v_result;
end;
$$;

revoke all on function public.t1_authorize_ai_proposal(
  uuid, uuid, uuid, uuid, timestamptz, uuid, text
) from public;

grant execute on function public.t1_authorize_ai_proposal(
  uuid, uuid, uuid, uuid, timestamptz, uuid, text
) to authenticated;

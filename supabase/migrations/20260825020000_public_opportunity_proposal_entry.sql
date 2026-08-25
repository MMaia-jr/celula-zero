-- PUBLIC-OPPORTUNITY-TO-PROPOSAL-001
--
-- A public OPEN opportunity is itself an invitation to submit a Proposal.
-- This command does NOT grant a role, delegation, project membership or any
-- broader capability. It only allows a controlled PERSON actor to create one
-- project-visible Proposal against that public opportunity.
--
-- Proposal != Commitment. Acceptance remains a separate steward-authorized act.

create or replace function public.b1_submit_public_proposal(
  p_actor_id uuid,
  p_opportunity_id uuid,
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
  v_o public.opportunities%rowtype;
  v_actor public.actors%rowtype;
  v_id uuid;
  v_replayed boolean;
  v_result jsonb;
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

  select * into v_o
  from public.opportunities
  where id = p_opportunity_id;

  if not found then
    raise exception using errcode = 'P0001', message = 'CZ404:OPPORTUNITY_NOT_FOUND';
  end if;

  if v_o.state <> 'OPEN'
     or v_o.visibility <> 'PUBLIC'
     or not private.project_is_public(v_o.project_id) then
    raise exception using errcode = '42501', message = 'CZ403:PUBLIC_OPEN_OPPORTUNITY_REQUIRED';
  end if;

  -- The public entry path is not a shortcut for a project owner to manufacture
  -- a second identity path into its own opportunity.
  if private.b1_profile_controls_actor(v_o.owner_actor_id, auth.uid()) then
    raise exception using errcode = '42501', message = 'CZ403:OPPORTUNITY_OWNER_PUBLIC_PROPOSAL_DENIED';
  end if;

  v_payload := jsonb_build_object(
    'opportunity_id', p_opportunity_id,
    'statement', p_statement,
    'conditions', p_conditions,
    'expected_delivery', p_expected_delivery,
    'reward_expectation', p_reward_expectation,
    'authorization_basis', 'PUBLIC_OPEN_OPPORTUNITY'
  );

  select replayed, saved_result into v_replayed, v_result
  from private.b1_begin_command(
    v_o.cell_id,
    p_actor_id,
    p_command_id,
    p_idempotency_key,
    'proposal.public_submit',
    v_payload
  );

  if v_replayed then
    return v_result;
  end if;

  if exists (
    select 1
    from public.proposals
    where opportunity_id = p_opportunity_id
      and proposer_actor_id = p_actor_id
      and state <> 'REJECTED'
  ) then
    raise exception using errcode = 'P0001', message = 'CZ409:ACTIVE_PROPOSAL_EXISTS';
  end if;

  insert into public.proposals(
    cell_id,
    opportunity_id,
    proposer_actor_id,
    state,
    visibility
  ) values (
    v_o.cell_id,
    p_opportunity_id,
    p_actor_id,
    'SUBMITTED',
    'PROJECT'
  ) returning id into v_id;

  insert into public.proposal_versions(
    proposal_id,
    version,
    statement,
    conditions,
    expected_delivery,
    reward_expectation,
    created_by_actor_id
  ) values (
    v_id,
    1,
    p_statement,
    p_conditions,
    p_expected_delivery,
    p_reward_expectation,
    p_actor_id
  );

  perform private.b1_record_decision(
    v_o.cell_id,
    'PUBLIC_PROPOSAL_SUBMIT',
    'ALLOW',
    'PROPOSAL',
    v_id,
    p_actor_id,
    'proposal.submit',
    'OPPORTUNITY',
    p_opportunity_id,
    'controlled PERSON submitted against PUBLIC/OPEN opportunity; no role or delegation granted',
    p_command_id,
    v_o.current_version,
    1,
    jsonb_build_object('authorization_basis', 'PUBLIC_OPEN_OPPORTUNITY')
  );

  perform private.b1_record_event(
    v_o.cell_id,
    'PROPOSAL_SUBMITTED',
    'PROPOSAL',
    v_id,
    'PROPOSAL',
    v_id,
    p_actor_id,
    'proposal.submit',
    'OPPORTUNITY',
    p_opportunity_id,
    p_command_id,
    null,
    1,
    'PROJECT',
    jsonb_build_object(
      'version', 1,
      'opportunity_id', p_opportunity_id,
      'authorization_basis', 'PUBLIC_OPEN_OPPORTUNITY'
    )
  );

  v_result := jsonb_build_object(
    'ok', true,
    'proposal_id', v_id,
    'version', 1,
    'material_version', 1,
    'state', 'SUBMITTED'
  );

  perform private.b1_finish_command(p_actor_id, p_idempotency_key, v_result);
  return v_result;
end;
$$;

revoke all on function public.b1_submit_public_proposal(
  uuid, uuid, text, text, text, text, uuid, text
) from public;

grant execute on function public.b1_submit_public_proposal(
  uuid, uuid, text, text, text, text, uuid, text
) to authenticated;

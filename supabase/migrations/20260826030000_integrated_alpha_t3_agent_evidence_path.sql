-- INTEGRATED-ALPHA-001 / T3 HUMAN ↔ AI COORDINATION
-- Block 3: connect a completed bounded SoftwareAgent execution to the existing
-- T2 Contribution → Artifact → Claim → Evidence path without making execution
-- itself a Claim, Evidence, Verification or Decision.
--
-- ADOPT:
--   role_assignments / AGENT_OPERATOR role
--   Opportunity / Proposal / Commitment
--   Commitment-derived T2 work + Claim/Evidence authority
--   Contribution / Artifact / Claim / Evidence / Verification Request
--
-- EXTEND minimally:
--   1. an Opportunity-scoped, time-bounded AGENT_OPERATOR participation grant,
--      because PROJECT_STEWARD deliberately does not hold proposal.submit and
--      therefore cannot delegate that capability through b1_grant_delegation();
--   2. exact digest-bound links from Agent Execution to its INPUT_MATERIAL and
--      NORMALIZED_RESULT Artifacts.
--
-- Preserve:
-- Human authorization != Agent execution
-- Agent execution != Contribution
-- Artifact != Evidence
-- Claim != Verification
-- Verification Request != Verification
-- Verification != Decision
-- The opportunity-scoped role does not create Project membership or a
-- Project-scoped role assignment.

create or replace function public.t3_authorize_agent_opportunity_participation(
  p_actor_id uuid,
  p_agent_actor_id uuid,
  p_opportunity_id uuid,
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
  v_actor_kind text;
  v_role_assignment_id uuid;
  v_policy_version_id uuid;
  v_replayed boolean;
  v_result jsonb;
  v_payload jsonb;
begin
  select * into v_o
  from public.opportunities
  where id = p_opportunity_id;
  if not found then
    raise exception using errcode = 'P0001', message = 'CZ404:OPPORTUNITY_NOT_FOUND';
  end if;

  perform private.b1_authorize_actor(
    p_actor_id, 'delegation.manage', 'PROJECT', v_o.project_id
  );

  select kind into v_actor_kind
  from public.actors
  where id = p_actor_id;
  if v_actor_kind <> 'PERSON' then
    raise exception using errcode = '42501', message = 'CZ403:HUMAN_STEWARD_REQUIRED';
  end if;

  select * into v_agent
  from public.actors
  where id = p_agent_actor_id;
  if not found or v_agent.kind <> 'AI_AGENT' then
    raise exception using errcode = '22023', message = 'CZ422:AI_AGENT_REQUIRED';
  end if;

  if not private.b1_current_profile_controls_actor(p_agent_actor_id) then
    raise exception using errcode = '42501', message = 'CZ403:AGENT_OPERATOR_CONTROL_REQUIRED';
  end if;

  if v_o.state <> 'OPEN' then
    raise exception using errcode = 'P0001', message = 'CZ409:OPPORTUNITY_NOT_OPEN';
  end if;

  if p_valid_until is null
     or p_valid_until <= now()
     or p_valid_until > now() + interval '24 hours' then
    raise exception using errcode = '22023', message = 'CZ422:INVALID_AGENT_PARTICIPATION_WINDOW';
  end if;

  if exists (
    select 1
    from public.project_members pm
    where pm.project_id = v_o.project_id
      and pm.actor_id = p_agent_actor_id
  ) or exists (
    select 1
    from public.role_assignments ra
    where ra.actor_id = p_agent_actor_id
      and ra.scope_type = 'PROJECT'
      and ra.scope_id = v_o.project_id
      and ra.revoked_at is null
      and (ra.valid_until is null or ra.valid_until > now())
  ) then
    raise exception using errcode = '42501', message = 'CZ403:AGENT_PROJECT_ROLE_NOT_BOUNDED';
  end if;

  v_payload := jsonb_build_object(
    'agent_actor_id', p_agent_actor_id,
    'opportunity_id', p_opportunity_id,
    'project_id', v_o.project_id,
    'role', 'AGENT_OPERATOR',
    'scope_type', 'OPPORTUNITY',
    'valid_until', p_valid_until
  );

  select replayed, saved_result
  into v_replayed, v_result
  from private.b1_begin_command(
    v_o.cell_id,
    p_actor_id,
    p_command_id,
    p_idempotency_key,
    'agent.opportunity.participation.authorize',
    v_payload
  );
  if v_replayed then return v_result; end if;

  select current_policy_version_id
  into v_policy_version_id
  from public.cells
  where id = v_o.cell_id;

  insert into public.role_assignments(
    cell_id,
    actor_id,
    role_id,
    scope_type,
    scope_id,
    policy_version_id,
    granted_by_actor_id,
    valid_until
  ) values (
    v_o.cell_id,
    p_agent_actor_id,
    '00000000-0000-4000-8000-00000000c205',
    'OPPORTUNITY',
    p_opportunity_id,
    v_policy_version_id,
    p_actor_id,
    p_valid_until
  )
  returning id into v_role_assignment_id;

  perform private.b1_record_decision(
    v_o.cell_id,
    'AGENT_OPPORTUNITY_PARTICIPATION',
    'ALLOW',
    'ROLE_ASSIGNMENT',
    v_role_assignment_id,
    p_actor_id,
    'delegation.manage',
    'PROJECT',
    v_o.project_id,
    'human steward authorized bounded AI Agent participation in one exact Opportunity',
    p_command_id,
    v_o.current_version,
    null,
    jsonb_build_object(
      'agent_actor_id', p_agent_actor_id,
      'role', 'AGENT_OPERATOR',
      'scope_type', 'OPPORTUNITY',
      'scope_id', p_opportunity_id,
      'valid_until', p_valid_until,
      'project_role', false
    )
  );

  perform private.b1_record_event(
    v_o.cell_id,
    'AGENT_OPPORTUNITY_PARTICIPATION_GRANTED',
    'OPPORTUNITY',
    p_opportunity_id,
    'ROLE_ASSIGNMENT',
    v_role_assignment_id,
    p_actor_id,
    'delegation.manage',
    'PROJECT',
    v_o.project_id,
    p_command_id,
    null,
    null,
    'PROJECT',
    jsonb_build_object(
      'agent_actor_id', p_agent_actor_id,
      'role', 'AGENT_OPERATOR',
      'scope_type', 'OPPORTUNITY',
      'scope_id', p_opportunity_id,
      'valid_until', p_valid_until,
      'project_role', false
    )
  );

  v_result := jsonb_build_object(
    'ok', true,
    'role_assignment_id', v_role_assignment_id,
    'agent_actor_id', p_agent_actor_id,
    'role', 'AGENT_OPERATOR',
    'scope_type', 'OPPORTUNITY',
    'scope_id', p_opportunity_id,
    'project_id', v_o.project_id,
    'valid_until', p_valid_until,
    'project_role', false
  );

  perform private.b1_finish_command(
    p_actor_id, p_idempotency_key, v_result
  );
  return v_result;
end;
$$;

create table public.agent_execution_artifact_links (
  id uuid primary key default gen_random_uuid(),
  execution_id uuid not null references public.agent_task_executions(id) on delete restrict,
  artifact_id uuid not null unique references public.artifacts(id) on delete restrict,
  relation text not null check (
    relation in ('INPUT_MATERIAL', 'NORMALIZED_RESULT')
  ),
  linked_by_actor_id uuid not null references public.actors(id) on delete restrict,
  created_at timestamptz not null default now(),
  unique (execution_id, relation)
);

create index agent_execution_artifact_links_execution
  on public.agent_execution_artifact_links(execution_id, relation);

create trigger agent_execution_artifact_links_append_only
before update or delete on public.agent_execution_artifact_links
for each row execute function private.prevent_append_only_mutation();

create or replace function public.t3_link_agent_execution_artifact(
  p_agent_actor_id uuid,
  p_execution_id uuid,
  p_artifact_id uuid,
  p_relation text,
  p_command_id uuid,
  p_idempotency_key text
)
returns jsonb
language plpgsql
security definer
set search_path = public, private, pg_temp
as $$
declare
  v_execution public.agent_task_executions%rowtype;
  v_artifact public.artifacts%rowtype;
  v_contribution public.contributions%rowtype;
  v_commitment public.commitments%rowtype;
  v_expected_digest text;
  v_link_id uuid;
  v_replayed boolean;
  v_result jsonb;
  v_payload jsonb;
begin
  select * into v_execution
  from public.agent_task_executions
  where id = p_execution_id;
  if not found then
    raise exception using errcode = 'P0001', message = 'CZ404:AGENT_EXECUTION_NOT_FOUND';
  end if;

  if v_execution.state <> 'COMPLETED' then
    raise exception using errcode = 'P0001', message = 'CZ409:AGENT_EXECUTION_NOT_COMPLETED';
  end if;
  if v_execution.agent_actor_id <> p_agent_actor_id then
    raise exception using errcode = '42501', message = 'CZ403:AGENT_EXECUTION_ACTOR_MISMATCH';
  end if;

  perform private.b1_authorize_actor(
    p_agent_actor_id, 'artifact.attach', 'PROJECT', v_execution.project_id
  );

  select * into v_artifact
  from public.artifacts
  where id = p_artifact_id;
  if not found then
    raise exception using errcode = 'P0001', message = 'CZ404:ARTIFACT_NOT_FOUND';
  end if;

  select * into v_contribution
  from public.contributions
  where id = v_artifact.contribution_id;
  if not found then
    raise exception using errcode = 'P0001', message = 'CZ404:CONTRIBUTION_NOT_FOUND';
  end if;

  select * into v_commitment
  from public.commitments
  where id = v_contribution.commitment_id;
  if not found then
    raise exception using errcode = 'P0001', message = 'CZ404:COMMITMENT_NOT_FOUND';
  end if;

  if v_artifact.project_id <> v_execution.project_id
     or v_artifact.created_by_actor_id <> p_agent_actor_id
     or v_contribution.project_id <> v_execution.project_id
     or v_contribution.author_actor_id <> p_agent_actor_id
     or v_commitment.project_id <> v_execution.project_id
     or v_commitment.proposer_actor_id <> p_agent_actor_id
     or v_commitment.state <> 'ACCEPTED' then
    raise exception using errcode = 'P0001', message = 'CZ409:AGENT_EXECUTION_ARTIFACT_CONTEXT_MISMATCH';
  end if;

  if p_relation = 'INPUT_MATERIAL' then
    v_expected_digest := v_execution.input_digest;
  elsif p_relation = 'NORMALIZED_RESULT' then
    v_expected_digest := v_execution.output_digest;
  else
    raise exception using errcode = '22023', message = 'CZ422:INVALID_AGENT_EXECUTION_ARTIFACT_RELATION';
  end if;

  if v_artifact.digest_algorithm <> 'SHA256'
     or v_artifact.digest <> v_expected_digest then
    raise exception using errcode = 'P0001', message = 'CZ409:AGENT_EXECUTION_ARTIFACT_DIGEST_MISMATCH';
  end if;

  v_payload := jsonb_build_object(
    'execution_id', p_execution_id,
    'artifact_id', p_artifact_id,
    'relation', p_relation,
    'digest', v_artifact.digest
  );

  select replayed, saved_result
  into v_replayed, v_result
  from private.b1_begin_command(
    v_execution.cell_id,
    p_agent_actor_id,
    p_command_id,
    p_idempotency_key,
    'agent.execution.artifact.link',
    v_payload
  );
  if v_replayed then return v_result; end if;

  insert into public.agent_execution_artifact_links(
    execution_id,
    artifact_id,
    relation,
    linked_by_actor_id
  ) values (
    p_execution_id,
    p_artifact_id,
    p_relation,
    p_agent_actor_id
  )
  returning id into v_link_id;

  perform private.b1_record_event(
    v_execution.cell_id,
    'AGENT_EXECUTION_ARTIFACT_LINKED',
    'AGENT_EXECUTION',
    p_execution_id,
    'ARTIFACT',
    p_artifact_id,
    p_agent_actor_id,
    'artifact.attach',
    'PROJECT',
    v_execution.project_id,
    p_command_id,
    null,
    null,
    'PROJECT',
    jsonb_build_object(
      'link_id', v_link_id,
      'relation', p_relation,
      'artifact_digest', v_artifact.digest,
      'execution_input_digest', v_execution.input_digest,
      'execution_output_digest', v_execution.output_digest
    )
  );

  v_result := jsonb_build_object(
    'ok', true,
    'link_id', v_link_id,
    'execution_id', p_execution_id,
    'artifact_id', p_artifact_id,
    'relation', p_relation,
    'digest', v_artifact.digest
  );

  perform private.b1_finish_command(
    p_agent_actor_id, p_idempotency_key, v_result
  );
  return v_result;
end;
$$;

create or replace function public.t3_reconcile_agent_evidence_path(
  p_execution_id uuid
)
returns text[]
language sql
stable
security definer
set search_path = public, private, pg_temp
as $$
  with execution_material as (
    select *
    from public.agent_task_executions
    where id = p_execution_id
  ),
  input_link as (
    select l.*, a.digest, a.project_id, a.created_by_actor_id
    from public.agent_execution_artifact_links l
    join public.artifacts a on a.id = l.artifact_id
    where l.execution_id = p_execution_id
      and l.relation = 'INPUT_MATERIAL'
  ),
  result_link as (
    select l.*, a.digest, a.project_id, a.created_by_actor_id
    from public.agent_execution_artifact_links l
    join public.artifacts a on a.id = l.artifact_id
    where l.execution_id = p_execution_id
      and l.relation = 'NORMALIZED_RESULT'
  ),
  result_claim as (
    select c.*
    from public.claims c
    join result_link r
      on c.subject_type = 'ARTIFACT'
     and c.subject_id = r.artifact_id
  ),
  evidence_path as (
    select ei.id as evidence_item_id, el.claim_id
    from public.evidence_items ei
    join input_link i on i.artifact_id = ei.source_artifact_id
    join public.evidence_links el on el.evidence_item_id = ei.id
    join result_claim c on c.id = el.claim_id
    where el.relation in ('SUPPORTS', 'CONTEXTUALIZES')
  ),
  review_request as (
    select vr.*
    from public.verification_requests vr
    join result_claim c on c.id = vr.claim_id
  ),
  checks as (
    select 'missing_execution' as issue
    where not exists (select 1 from execution_material)

    union all
    select 'execution_not_completed'
    where exists (
      select 1 from execution_material where state <> 'COMPLETED'
    )

    union all
    select 'input_material_link_count'
    where (select count(*) from input_link) <> 1

    union all
    select 'normalized_result_link_count'
    where (select count(*) from result_link) <> 1

    union all
    select 'input_digest_mismatch'
    where exists (
      select 1
      from input_link i
      cross join execution_material e
      where i.digest <> e.input_digest
         or i.project_id <> e.project_id
         or i.created_by_actor_id <> e.agent_actor_id
    )

    union all
    select 'result_digest_mismatch'
    where exists (
      select 1
      from result_link r
      cross join execution_material e
      where r.digest <> e.output_digest
         or r.project_id <> e.project_id
         or r.created_by_actor_id <> e.agent_actor_id
    )

    union all
    select 'result_claim_count'
    where (select count(*) from result_claim) <> 1

    union all
    select 'input_evidence_path_count'
    where (select count(*) from evidence_path) < 1

    union all
    select 'verification_request_count'
    where (select count(*) from review_request) < 1
  )
  select coalesce(array_agg(issue order by issue), '{}'::text[]) from checks;
$$;

alter table public.agent_execution_artifact_links enable row level security;

create policy agent_execution_artifact_links_read
on public.agent_execution_artifact_links
for select to authenticated using (
  exists (
    select 1
    from public.agent_task_executions e
    where e.id = execution_id
      and (
        private.b1_current_profile_controls_actor(e.agent_actor_id)
        or private.b1_current_profile_controls_actor(e.steward_actor_id)
        or private.can_manage_project(e.project_id, auth.uid())
      )
  )
);

revoke all on public.agent_execution_artifact_links from anon, authenticated;
grant select on public.agent_execution_artifact_links to authenticated;

revoke all on function public.t3_authorize_agent_opportunity_participation(
  uuid,uuid,uuid,timestamptz,uuid,text
) from public;
revoke all on function public.t3_link_agent_execution_artifact(
  uuid,uuid,uuid,text,uuid,text
) from public;
revoke all on function public.t3_reconcile_agent_evidence_path(uuid) from public;

grant execute on function public.t3_authorize_agent_opportunity_participation(
  uuid,uuid,uuid,timestamptz,uuid,text
) to authenticated;
grant execute on function public.t3_link_agent_execution_artifact(
  uuid,uuid,uuid,text,uuid,text
) to authenticated;
grant execute on function public.t3_reconcile_agent_evidence_path(uuid) to authenticated;

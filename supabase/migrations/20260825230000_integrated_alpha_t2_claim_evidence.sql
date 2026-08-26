-- Integrated Alpha T2.2: attributed Claim + explicit Evidence over T2.1 work.
--
-- Canonical B2-B1 remains the source of Claim/Evidence semantics and commands.
-- This migration does not recreate claims, evidence_items or evidence_links.
--
-- T2.1 work authority remains exactly two capabilities. T2.2 adds a separate
-- append-only Commitment-derived authorization record for:
--   claim.record
--   evidence.register
--
-- Claim ≠ Evidence ≠ Verification ≠ Decision.
-- Artifact ≠ Evidence.
-- Evidence records an explicit contextual relation to a Claim; it is not proof.

create table public.commitment_claim_evidence_authorizations (
  id uuid primary key default gen_random_uuid(),
  commitment_id uuid not null references public.commitments(id) on delete restrict,
  actor_id uuid not null references public.actors(id) on delete restrict,
  capability_code text not null references public.capability_definitions(code) on delete restrict,
  granted_by_actor_id uuid not null references public.actors(id) on delete restrict,
  authority_basis text not null default 'ACCEPTED_COMMITMENT_CLAIM_EVIDENCE'
    check (authority_basis = 'ACCEPTED_COMMITMENT_CLAIM_EVIDENCE'),
  created_at timestamptz not null default now(),
  unique (commitment_id, actor_id, capability_code),
  check (capability_code in ('claim.record', 'evidence.register'))
);

create index commitment_claim_evidence_authorizations_actor
  on public.commitment_claim_evidence_authorizations(
    actor_id, commitment_id, capability_code
  );

create trigger commitment_claim_evidence_authorizations_append_only
before update or delete on public.commitment_claim_evidence_authorizations
for each row execute function private.prevent_append_only_mutation();

-- Preserve canonical roles/delegations and T2.1 authority, adding only the two
-- exact T2.2 capabilities in the exact accepted-Commitment Project context.
create or replace function private.b1_has_capability(
  p_actor_id uuid,
  p_capability text,
  p_scope_type text,
  p_scope_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = public, private, pg_temp
as $$
  select exists (
    select 1
    from public.role_assignments ra
    join public.role_capabilities rc on rc.role_id = ra.role_id
    join public.cells c on c.id = ra.cell_id
    where ra.actor_id = p_actor_id
      and rc.capability_code = p_capability
      and ra.valid_from <= now()
      and (ra.valid_until is null or ra.valid_until > now())
      and ra.revoked_at is null
      and ra.policy_version_id = c.current_policy_version_id
      and private.b1_scope_contains(
        ra.scope_type, ra.scope_id, p_scope_type, p_scope_id
      )
  ) or exists (
    select 1
    from public.delegations d
    join public.cells c on c.id = d.cell_id
    where d.delegate_actor_id = p_actor_id
      and d.capability_code = p_capability
      and d.status = 'ACTIVE'
      and d.valid_from <= now()
      and d.valid_until > now()
      and d.policy_version_id = c.current_policy_version_id
      and private.b1_scope_contains(
        d.scope_type, d.scope_id, p_scope_type, p_scope_id
      )
  ) or (
    p_scope_type = 'PROJECT'
    and p_capability in ('contribution.submit', 'artifact.attach')
    and exists (
      select 1
      from public.commitment_authorizations ca
      join public.commitments cm on cm.id = ca.commitment_id
      where ca.actor_id = p_actor_id
        and ca.capability_code = p_capability
        and cm.proposer_actor_id = p_actor_id
        and cm.project_id = p_scope_id
        and cm.state = 'ACCEPTED'
        and ca.authority_basis = 'ACCEPTED_COMMITMENT'
    )
  ) or (
    p_scope_type = 'PROJECT'
    and p_capability in ('claim.record', 'evidence.register')
    and exists (
      select 1
      from public.commitment_claim_evidence_authorizations cea
      join public.commitments cm on cm.id = cea.commitment_id
      where cea.actor_id = p_actor_id
        and cea.capability_code = p_capability
        and cm.proposer_actor_id = p_actor_id
        and cm.project_id = p_scope_id
        and cm.state = 'ACCEPTED'
        and cea.authority_basis = 'ACCEPTED_COMMITMENT_CLAIM_EVIDENCE'
    )
  );
$$;

-- Product acceptance wrapper for the cumulative T2 participant path.
-- It delegates exact-version acceptance + T2.1 work authority to the T2.1
-- wrapper, then materializes only the two T2.2 Claim/Evidence capabilities.
--
-- Existing t2a_accept_proposal_for_work is intentionally untouched so the
-- previously verified T2.1 semantic boundary remains stable.
create or replace function public.t2b_accept_proposal_for_claim_evidence(
  p_actor_id uuid,
  p_proposal_id uuid,
  p_opportunity_version integer,
  p_proposal_version integer,
  p_expected_opportunity_material_version integer,
  p_expected_proposal_material_version integer,
  p_reason text,
  p_command_id uuid,
  p_idempotency_key text
)
returns jsonb
language plpgsql
security definer
set search_path = public, private, pg_temp
as $$
declare
  v_result jsonb;
  v_commitment public.commitments%rowtype;
  v_capability text;
  v_authorization_id uuid;
  v_inserted integer;
begin
  v_result := public.t2a_accept_proposal_for_work(
    p_actor_id,
    p_proposal_id,
    p_opportunity_version,
    p_proposal_version,
    p_expected_opportunity_material_version,
    p_expected_proposal_material_version,
    p_reason,
    p_command_id,
    p_idempotency_key
  );

  if coalesce((v_result ->> 'ok')::boolean, false) is not true
     or v_result ->> 'commitment_id' is null then
    return v_result;
  end if;

  select * into v_commitment
  from public.commitments
  where id = (v_result ->> 'commitment_id')::uuid;

  if not found then
    raise exception using
      errcode = 'P0001',
      message = 'CZ500:COMMITMENT_MISSING_AFTER_ACCEPTANCE';
  end if;

  if v_commitment.accepted_by_actor_id <> p_actor_id then
    raise exception using
      errcode = '42501',
      message = 'CZ403:COMMITMENT_ACCEPTOR_REQUIRED';
  end if;

  foreach v_capability in array array['claim.record', 'evidence.register']::text[]
  loop
    v_authorization_id := null;

    insert into public.commitment_claim_evidence_authorizations(
      commitment_id,
      actor_id,
      capability_code,
      granted_by_actor_id,
      authority_basis
    ) values (
      v_commitment.id,
      v_commitment.proposer_actor_id,
      v_capability,
      p_actor_id,
      'ACCEPTED_COMMITMENT_CLAIM_EVIDENCE'
    )
    on conflict (commitment_id, actor_id, capability_code) do nothing
    returning id into v_authorization_id;

    get diagnostics v_inserted = row_count;

    if v_inserted = 1 then
      perform private.b1_record_decision(
        v_commitment.cell_id,
        'COMMITMENT_CLAIM_EVIDENCE_AUTHORITY',
        'ALLOW',
        'COMMITMENT_CLAIM_EVIDENCE_AUTHORIZATION',
        v_authorization_id,
        p_actor_id,
        'proposal.accept',
        'OPPORTUNITY',
        v_commitment.opportunity_id,
        'accepted Commitment authorizes attributed Claim and explicit Evidence for its proposer',
        p_command_id,
        v_commitment.opportunity_version,
        v_commitment.proposal_version,
        jsonb_build_object(
          'commitment_id', v_commitment.id,
          'delegate_actor_id', v_commitment.proposer_actor_id,
          'capability', v_capability,
          'scope_type', 'PROJECT',
          'scope_id', v_commitment.project_id,
          'authority_basis', 'ACCEPTED_COMMITMENT_CLAIM_EVIDENCE'
        )
      );

      perform private.b1_record_event(
        v_commitment.cell_id,
        'COMMITMENT_CLAIM_EVIDENCE_AUTHORITY_GRANTED',
        'COMMITMENT',
        v_commitment.id,
        'COMMITMENT_CLAIM_EVIDENCE_AUTHORIZATION',
        v_authorization_id,
        p_actor_id,
        'proposal.accept',
        'OPPORTUNITY',
        v_commitment.opportunity_id,
        p_command_id,
        null,
        1,
        'PROJECT',
        jsonb_build_object(
          'commitment_id', v_commitment.id,
          'delegate_actor_id', v_commitment.proposer_actor_id,
          'capability', v_capability,
          'scope_type', 'PROJECT',
          'scope_id', v_commitment.project_id,
          'authority_basis', 'ACCEPTED_COMMITMENT_CLAIM_EVIDENCE'
        )
      );
    end if;
  end loop;

  return v_result || jsonb_build_object(
    'claim_evidence_authority', 'ACCEPTED_COMMITMENT_CLAIM_EVIDENCE',
    'claim_evidence_capabilities',
      jsonb_build_array('claim.record', 'evidence.register')
  );
end;
$$;

alter table public.commitment_claim_evidence_authorizations
  enable row level security;

-- Internal authority records are not participant-readable tables.
revoke all on public.commitment_claim_evidence_authorizations
from anon, authenticated;

revoke all on function public.t2b_accept_proposal_for_claim_evidence(
  uuid, uuid, integer, integer, integer, integer, text, uuid, text
) from public;

grant execute on function public.t2b_accept_proposal_for_claim_evidence(
  uuid, uuid, integer, integer, integer, integer, text, uuid, text
) to authenticated;

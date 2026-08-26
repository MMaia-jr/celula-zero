-- Integrated Alpha T2.1: Commitment-derived work authority + bounded text Artifacts.
--
-- This migration intentionally reuses the canonical B2-A Contribution/Artifact
-- commands. A Commitment may authorize only the work capabilities needed by its
-- proposer without creating a role assignment, cell-wide access, reputation or
-- economic rights.
--
-- Artifact text content is immutable and digest-bound. Artifact remains distinct
-- from Evidence; nothing here creates an evidence_item, Verification, Decision
-- or Outcome.

create table public.commitment_authorizations (
  id uuid primary key default gen_random_uuid(),
  commitment_id uuid not null references public.commitments(id) on delete restrict,
  actor_id uuid not null references public.actors(id) on delete restrict,
  capability_code text not null references public.capability_definitions(code) on delete restrict,
  granted_by_actor_id uuid not null references public.actors(id) on delete restrict,
  authority_basis text not null default 'ACCEPTED_COMMITMENT'
    check (authority_basis = 'ACCEPTED_COMMITMENT'),
  created_at timestamptz not null default now(),
  unique (commitment_id, actor_id, capability_code),
  check (capability_code in ('contribution.submit', 'artifact.attach'))
);

create index commitment_authorizations_actor_commitment
  on public.commitment_authorizations(actor_id, commitment_id, capability_code);

create trigger commitment_authorizations_append_only
before update or delete on public.commitment_authorizations
for each row execute function private.prevent_append_only_mutation();

create table public.artifact_text_contents (
  artifact_id uuid primary key references public.artifacts(id) on delete restrict,
  content text not null
    check (char_length(content) between 1 and 20000),
  created_at timestamptz not null default now()
);

create trigger artifact_text_contents_append_only
before update or delete on public.artifact_text_contents
for each row execute function private.prevent_append_only_mutation();

-- Extend the existing capability resolver only for two exact B2-A capabilities.
-- A Commitment authorization is valid only when the Actor is still the proposer
-- of that accepted Commitment and the command scope is the Commitment project.
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
      and private.b1_scope_contains(ra.scope_type, ra.scope_id, p_scope_type, p_scope_id)
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
      and private.b1_scope_contains(d.scope_type, d.scope_id, p_scope_type, p_scope_id)
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
  );
$$;

-- Product acceptance wrapper: preserve canonical exact-version acceptance, then
-- materialize only the two bounded work capabilities implied by the accepted
-- Commitment. Existing b1_accept_proposal remains untouched and valid.
create or replace function public.t2a_accept_proposal_for_work(
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
  v_result := public.b1_accept_proposal(
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
    raise exception using errcode = 'P0001', message = 'CZ500:COMMITMENT_MISSING_AFTER_ACCEPTANCE';
  end if;

  if v_commitment.accepted_by_actor_id <> p_actor_id then
    raise exception using errcode = '42501', message = 'CZ403:COMMITMENT_ACCEPTOR_REQUIRED';
  end if;

  foreach v_capability in array array['contribution.submit', 'artifact.attach']::text[]
  loop
    v_authorization_id := null;

    insert into public.commitment_authorizations(
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
      'ACCEPTED_COMMITMENT'
    )
    on conflict (commitment_id, actor_id, capability_code) do nothing
    returning id into v_authorization_id;

    get diagnostics v_inserted = row_count;

    if v_inserted = 1 then
      perform private.b1_record_decision(
        v_commitment.cell_id,
        'COMMITMENT_WORK_AUTHORITY',
        'ALLOW',
        'COMMITMENT_AUTHORIZATION',
        v_authorization_id,
        p_actor_id,
        'proposal.accept',
        'OPPORTUNITY',
        v_commitment.opportunity_id,
        'accepted Commitment authorizes bounded work capability for its proposer',
        p_command_id,
        v_commitment.opportunity_version,
        v_commitment.proposal_version,
        jsonb_build_object(
          'commitment_id', v_commitment.id,
          'delegate_actor_id', v_commitment.proposer_actor_id,
          'capability', v_capability,
          'scope_type', 'PROJECT',
          'scope_id', v_commitment.project_id,
          'authority_basis', 'ACCEPTED_COMMITMENT'
        )
      );

      perform private.b1_record_event(
        v_commitment.cell_id,
        'COMMITMENT_WORK_AUTHORITY_GRANTED',
        'COMMITMENT',
        v_commitment.id,
        'COMMITMENT_AUTHORIZATION',
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
          'authority_basis', 'ACCEPTED_COMMITMENT'
        )
      );
    else
      select id into v_authorization_id
      from public.commitment_authorizations
      where commitment_id = v_commitment.id
        and actor_id = v_commitment.proposer_actor_id
        and capability_code = v_capability;
    end if;
  end loop;

  return v_result || jsonb_build_object(
    'work_authority', 'ACCEPTED_COMMITMENT',
    'work_capabilities', jsonb_build_array('contribution.submit', 'artifact.attach')
  );
end;
$$;

-- Bounded convenience command for a participant-facing text/document Artifact.
-- The server derives the SHA-256 and calls the canonical B2-A attachment command.
create or replace function public.t2a_attach_text_artifact(
  p_actor_id uuid,
  p_contribution_id uuid,
  p_content text,
  p_command_id uuid,
  p_idempotency_key text
)
returns jsonb
language plpgsql
security definer
set search_path = public, private, extensions, pg_temp
as $$
declare
  v_digest text;
  v_size_bytes bigint;
  v_result jsonb;
  v_artifact_id uuid;
  v_existing_content text;
begin
  if p_content is null or char_length(btrim(p_content)) < 1 then
    raise exception using errcode = '22023', message = 'CZ422:EMPTY_TEXT_ARTIFACT';
  end if;

  if char_length(p_content) > 20000 then
    raise exception using errcode = '22023', message = 'CZ422:TEXT_ARTIFACT_TOO_LONG';
  end if;

  v_size_bytes := octet_length(convert_to(p_content, 'UTF8'));
  if v_size_bytes > 65536 then
    raise exception using errcode = '22023', message = 'CZ422:TEXT_ARTIFACT_TOO_LARGE';
  end if;

  v_digest := encode(extensions.digest(convert_to(p_content, 'UTF8'), 'sha256'), 'hex');

  v_result := public.b2a_attach_artifact(
    p_actor_id,
    p_contribution_id,
    'DOCUMENT',
    'urn:cz:text:sha256:' || v_digest,
    v_digest,
    'text/plain; charset=utf-8',
    v_size_bytes,
    'PROJECT_LIFETIME',
    p_command_id,
    p_idempotency_key
  );

  if coalesce((v_result ->> 'ok')::boolean, false) is not true
     or v_result ->> 'artifact_id' is null then
    return v_result;
  end if;

  v_artifact_id := (v_result ->> 'artifact_id')::uuid;

  insert into public.artifact_text_contents(artifact_id, content)
  values (v_artifact_id, p_content)
  on conflict (artifact_id) do nothing;

  select content into v_existing_content
  from public.artifact_text_contents
  where artifact_id = v_artifact_id;

  if v_existing_content is distinct from p_content then
    raise exception using errcode = 'P0001', message = 'CZ409:TEXT_ARTIFACT_CONTENT_MISMATCH';
  end if;

  return v_result || jsonb_build_object(
    'text_content', true,
    'content_bytes', v_size_bytes,
    'uri', 'urn:cz:text:sha256:' || v_digest
  );
end;
$$;

alter table public.commitment_authorizations enable row level security;
alter table public.artifact_text_contents enable row level security;

-- Authority bridge rows are internal authorization records. No direct client
-- table grant is needed; their effects are consumed through b1_has_capability.
revoke all on public.commitment_authorizations from anon, authenticated;

create policy artifact_text_contents_read
on public.artifact_text_contents
for select
to authenticated
using (
  exists (
    select 1
    from public.artifacts a
    where a.id = artifact_id
      and (
        private.b1_current_profile_controls_actor(a.created_by_actor_id)
        or private.can_manage_project(a.project_id, auth.uid())
      )
  )
);

revoke all on public.artifact_text_contents from anon, authenticated;
grant select on public.artifact_text_contents to authenticated;

revoke all on function public.t2a_accept_proposal_for_work(
  uuid, uuid, integer, integer, integer, integer, text, uuid, text
) from public;
revoke all on function public.t2a_attach_text_artifact(
  uuid, uuid, text, uuid, text
) from public;

grant execute on function public.t2a_accept_proposal_for_work(
  uuid, uuid, integer, integer, integer, integer, text, uuid, text
) to authenticated;
grant execute on function public.t2a_attach_text_artifact(
  uuid, uuid, text, uuid, text
) to authenticated;

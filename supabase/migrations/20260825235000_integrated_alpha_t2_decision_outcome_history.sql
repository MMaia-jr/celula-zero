-- Integrated Alpha T2.4
-- First-class contextual Decision, honest Outcome, human history projection,
-- safe T2 Social Projection continuation.
--
-- Native CZ records remain source of truth.
-- PROV is produced by the application as a derived PROV-O JSON-LD projection.
--
-- Preserve:
-- Verification ≠ Decision ≠ Outcome
-- Provenance ≠ Truth
-- Outcome OBSERVED ≠ verified truth
-- authorization decision_records ≠ substantive domain_decisions

create table public.domain_decisions (
  id uuid primary key default gen_random_uuid(),
  cell_id uuid not null references public.cells(id) on delete restrict,
  project_id uuid not null references public.projects(id) on delete restrict,
  claim_id uuid not null references public.claims(id) on delete restrict,
  deciding_actor_id uuid not null references public.actors(id) on delete restrict,
  authority_basis text not null
    check (authority_basis in ('PROJECT_STEWARDSHIP')),
  disposition text not null
    check (disposition in ('ACCEPT_FOR_CONTEXT', 'REJECT_FOR_CONTEXT', 'DEFER')),
  reason text not null check (char_length(reason) between 10 and 4000),
  limitations text not null check (char_length(limitations) between 2 and 2000),
  visibility text not null check (visibility in ('PROJECT', 'PARTIES', 'PRIVATE')),
  sensitivity text not null
    check (sensitivity in ('NORMAL', 'PERSONAL', 'SENSITIVE_PERSONAL', 'RESTRICTED_KNOWLEDGE')),
  created_at timestamptz not null default now()
);

create table public.domain_decision_verifications (
  decision_id uuid not null references public.domain_decisions(id) on delete restrict,
  verification_id uuid not null references public.verifications(id) on delete restrict,
  created_at timestamptz not null default now(),
  primary key (decision_id, verification_id)
);

create table public.outcomes (
  id uuid primary key default gen_random_uuid(),
  cell_id uuid not null references public.cells(id) on delete restrict,
  project_id uuid not null references public.projects(id) on delete restrict,
  decision_id uuid not null references public.domain_decisions(id) on delete restrict,
  reporter_actor_id uuid not null references public.actors(id) on delete restrict,
  classification text not null check (classification in ('OBSERVED', 'INCONCLUSIVE')),
  statement text not null check (char_length(statement) between 10 and 4000),
  observed_at timestamptz,
  limitations text not null check (char_length(limitations) between 2 and 2000),
  visibility text not null check (visibility in ('PROJECT', 'PARTIES', 'PRIVATE')),
  sensitivity text not null
    check (sensitivity in ('NORMAL', 'PERSONAL', 'SENSITIVE_PERSONAL', 'RESTRICTED_KNOWLEDGE')),
  created_at timestamptz not null default now(),
  check (
    (classification = 'OBSERVED' and observed_at is not null)
    or (classification = 'INCONCLUSIVE' and observed_at is null)
  )
);

create index domain_decisions_claim_created
  on public.domain_decisions(claim_id, created_at, id);
create index outcomes_decision_created
  on public.outcomes(decision_id, created_at, id);

create trigger domain_decisions_append_only
before update or delete on public.domain_decisions
for each row execute function private.prevent_append_only_mutation();

create trigger domain_decision_verifications_append_only
before update or delete on public.domain_decision_verifications
for each row execute function private.prevent_append_only_mutation();

create trigger outcomes_append_only
before update or delete on public.outcomes
for each row execute function private.prevent_append_only_mutation();

insert into public.capability_definitions(code, description) values
  ('decision.issue', 'Issue a contextual substantive Decision distinct from authorization audit.'),
  ('outcome.record', 'Record an attributed observed or inconclusive consequence after a Decision.')
on conflict (code) do nothing;

insert into public.role_capabilities(role_id, capability_code) values
  ('00000000-0000-4000-8000-00000000c202', 'decision.issue'),
  ('00000000-0000-4000-8000-00000000c202', 'outcome.record')
on conflict do nothing;

create or replace function private.t2d_claim_commitment_id(p_claim_id uuid)
returns uuid
language sql
stable
security definer
set search_path = public, private, pg_temp
as $$
  select case
    when c.subject_type = 'CONTRIBUTION' then (
      select co.commitment_id
      from public.contributions co
      where co.id = c.subject_id
    )
    when c.subject_type = 'ARTIFACT' then (
      select co.commitment_id
      from public.artifacts a
      join public.contributions co on co.id = a.contribution_id
      where a.id = c.subject_id
    )
    else null
  end
  from public.claims c
  where c.id = p_claim_id;
$$;

create or replace function private.t2d_current_profile_can_read_commitment(
  p_commitment_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = public, private, pg_temp
as $$
  select auth.uid() is not null and exists (
    select 1
    from public.commitments cm
    where cm.id = p_commitment_id
      and (
        private.b1_current_profile_controls_actor(cm.proposer_actor_id)
        or private.b1_current_profile_controls_actor(cm.accepted_by_actor_id)
        or private.can_manage_project(cm.project_id, auth.uid())
        or exists (
          select 1
          from public.verification_requests vr
          where private.t2d_claim_commitment_id(vr.claim_id) = cm.id
            and private.b1_current_profile_controls_actor(vr.reviewer_actor_id)
        )
      )
  );
$$;

create or replace function public.t2d_commitment_for_claim(p_claim_id uuid)
returns uuid
language plpgsql
stable
security definer
set search_path = public, private, pg_temp
as $$
declare
  v_commitment_id uuid;
begin
  v_commitment_id := private.t2d_claim_commitment_id(p_claim_id);
  if v_commitment_id is null then
    return null;
  end if;

  if not private.t2d_current_profile_can_read_commitment(v_commitment_id) then
    raise exception using errcode = '42501', message = 'CZ403:COMMITMENT_HISTORY_DENIED';
  end if;

  return v_commitment_id;
end;
$$;

create or replace function public.t2d_issue_domain_decision(
  p_actor_id uuid,
  p_claim_id uuid,
  p_verification_ids uuid[],
  p_disposition text,
  p_reason text,
  p_limitations text,
  p_command_id uuid,
  p_idempotency_key text
)
returns jsonb
language plpgsql
security definer
set search_path = public, private, pg_temp
as $$
declare
  v_claim public.claims%rowtype;
  v_project public.projects%rowtype;
  v_replayed boolean;
  v_result jsonb;
  v_decision_id uuid;
  v_payload jsonb;
  v_verification_count integer;
begin
  select * into v_claim from public.claims where id = p_claim_id;
  if not found then
    raise exception using errcode = 'P0001', message = 'CZ404:CLAIM_NOT_FOUND';
  end if;

  select * into v_project from public.projects where id = v_claim.project_id;
  if not found then
    raise exception using errcode = 'P0001', message = 'CZ404:PROJECT_NOT_FOUND';
  end if;

  perform private.b1_authorize_actor(
    p_actor_id, 'decision.issue', 'PROJECT', v_claim.project_id
  );

  if v_project.steward_actor_id <> p_actor_id then
    raise exception using errcode = '42501', message = 'CZ403:PROJECT_STEWARD_DECISION_REQUIRED';
  end if;

  if p_disposition not in ('ACCEPT_FOR_CONTEXT', 'REJECT_FOR_CONTEXT', 'DEFER') then
    raise exception using errcode = '22023', message = 'CZ422:INVALID_DECISION_DISPOSITION';
  end if;

  if char_length(trim(coalesce(p_reason, ''))) < 10
     or char_length(trim(coalesce(p_reason, ''))) > 4000 then
    raise exception using errcode = '22023', message = 'CZ422:INVALID_DECISION_REASON';
  end if;

  if char_length(trim(coalesce(p_limitations, ''))) < 2
     or char_length(trim(coalesce(p_limitations, ''))) > 2000 then
    raise exception using errcode = '22023', message = 'CZ422:INVALID_DECISION_LIMITATIONS';
  end if;

  select count(*)::integer into v_verification_count
  from public.verifications v
  where v.id = any(coalesce(p_verification_ids, '{}'::uuid[]))
    and v.claim_id = p_claim_id
    and v.project_id = v_claim.project_id;

  if v_verification_count <> cardinality(coalesce(p_verification_ids, '{}'::uuid[])) then
    raise exception using errcode = 'P0001', message = 'CZ409:DECISION_VERIFICATION_CONTEXT_MISMATCH';
  end if;

  if p_disposition in ('ACCEPT_FOR_CONTEXT', 'REJECT_FOR_CONTEXT')
     and v_verification_count < 1 then
    raise exception using errcode = 'P0001', message = 'CZ409:DECISION_VERIFICATION_REQUIRED';
  end if;

  v_payload := jsonb_build_object(
    'claim_id', p_claim_id,
    'verification_ids', to_jsonb(coalesce(p_verification_ids, '{}'::uuid[])),
    'disposition', p_disposition,
    'reason', trim(p_reason),
    'limitations', trim(p_limitations),
    'authority_basis', 'PROJECT_STEWARDSHIP'
  );

  select replayed, saved_result into v_replayed, v_result
  from private.b1_begin_command(
    v_claim.cell_id, p_actor_id, p_command_id, p_idempotency_key,
    'decision.issue', v_payload
  );
  if v_replayed then
    return v_result;
  end if;

  insert into public.domain_decisions(
    cell_id, project_id, claim_id, deciding_actor_id, authority_basis,
    disposition, reason, limitations, visibility, sensitivity
  ) values (
    v_claim.cell_id, v_claim.project_id, v_claim.id, p_actor_id,
    'PROJECT_STEWARDSHIP', p_disposition, trim(p_reason), trim(p_limitations),
    v_claim.visibility, v_claim.sensitivity
  )
  returning id into v_decision_id;

  insert into public.domain_decision_verifications(decision_id, verification_id)
  select v_decision_id, verification_id
  from unnest(coalesce(p_verification_ids, '{}'::uuid[])) x(verification_id);

  -- This is authorization audit, not the substantive Decision itself.
  perform private.b1_record_decision(
    v_claim.cell_id,
    'DOMAIN_DECISION_ISSUE',
    'ALLOW',
    'DOMAIN_DECISION',
    v_decision_id,
    p_actor_id,
    'decision.issue',
    'PROJECT',
    v_claim.project_id,
    'authorized issuance of a separate substantive contextual Decision',
    p_command_id,
    null,
    null,
    jsonb_build_object(
      'domain_decision_id', v_decision_id,
      'claim_id', v_claim.id,
      'disposition', p_disposition,
      'authority_basis', 'PROJECT_STEWARDSHIP'
    )
  );

  perform private.b1_record_event(
    v_claim.cell_id,
    'DOMAIN_DECISION_ISSUED',
    'DOMAIN_DECISION',
    v_decision_id,
    'DOMAIN_DECISION',
    v_decision_id,
    p_actor_id,
    'decision.issue',
    'PROJECT',
    v_claim.project_id,
    p_command_id,
    null,
    1,
    v_claim.visibility,
    jsonb_build_object(
      'claim_id', v_claim.id,
      'disposition', p_disposition,
      'verification_count', v_verification_count,
      'authority_basis', 'PROJECT_STEWARDSHIP'
    )
  );

  v_result := jsonb_build_object(
    'ok', true,
    'decision_id', v_decision_id,
    'claim_id', v_claim.id,
    'disposition', p_disposition,
    'authority_basis', 'PROJECT_STEWARDSHIP',
    'verification_count', v_verification_count
  );

  perform private.b1_finish_command(p_actor_id, p_idempotency_key, v_result);
  return v_result;
end;
$$;

create or replace function public.t2d_record_outcome(
  p_actor_id uuid,
  p_decision_id uuid,
  p_classification text,
  p_statement text,
  p_observed_at timestamptz,
  p_limitations text,
  p_command_id uuid,
  p_idempotency_key text
)
returns jsonb
language plpgsql
security definer
set search_path = public, private, pg_temp
as $$
declare
  v_decision public.domain_decisions%rowtype;
  v_project public.projects%rowtype;
  v_replayed boolean;
  v_result jsonb;
  v_outcome_id uuid;
  v_payload jsonb;
begin
  select * into v_decision
  from public.domain_decisions
  where id = p_decision_id;

  if not found then
    raise exception using errcode = 'P0001', message = 'CZ404:DOMAIN_DECISION_NOT_FOUND';
  end if;

  select * into v_project from public.projects where id = v_decision.project_id;

  perform private.b1_authorize_actor(
    p_actor_id, 'outcome.record', 'PROJECT', v_decision.project_id
  );

  if v_project.steward_actor_id <> p_actor_id then
    raise exception using errcode = '42501', message = 'CZ403:PROJECT_STEWARD_OUTCOME_REQUIRED';
  end if;

  if p_classification not in ('OBSERVED', 'INCONCLUSIVE') then
    raise exception using errcode = '22023', message = 'CZ422:INVALID_OUTCOME_CLASSIFICATION';
  end if;

  if p_classification = 'OBSERVED' and p_observed_at is null then
    raise exception using errcode = '22023', message = 'CZ422:OBSERVED_AT_REQUIRED';
  end if;

  if p_classification = 'INCONCLUSIVE' and p_observed_at is not null then
    raise exception using errcode = '22023', message = 'CZ422:INCONCLUSIVE_OBSERVED_AT_FORBIDDEN';
  end if;

  if char_length(trim(coalesce(p_statement, ''))) < 10
     or char_length(trim(coalesce(p_statement, ''))) > 4000 then
    raise exception using errcode = '22023', message = 'CZ422:INVALID_OUTCOME_STATEMENT';
  end if;

  if char_length(trim(coalesce(p_limitations, ''))) < 2
     or char_length(trim(coalesce(p_limitations, ''))) > 2000 then
    raise exception using errcode = '22023', message = 'CZ422:INVALID_OUTCOME_LIMITATIONS';
  end if;

  v_payload := jsonb_build_object(
    'decision_id', p_decision_id,
    'classification', p_classification,
    'statement', trim(p_statement),
    'observed_at', p_observed_at,
    'limitations', trim(p_limitations)
  );

  select replayed, saved_result into v_replayed, v_result
  from private.b1_begin_command(
    v_decision.cell_id, p_actor_id, p_command_id, p_idempotency_key,
    'outcome.record', v_payload
  );
  if v_replayed then
    return v_result;
  end if;

  insert into public.outcomes(
    cell_id, project_id, decision_id, reporter_actor_id,
    classification, statement, observed_at, limitations,
    visibility, sensitivity
  ) values (
    v_decision.cell_id, v_decision.project_id, v_decision.id, p_actor_id,
    p_classification, trim(p_statement), p_observed_at, trim(p_limitations),
    v_decision.visibility, v_decision.sensitivity
  )
  returning id into v_outcome_id;

  perform private.b1_record_decision(
    v_decision.cell_id,
    'OUTCOME_RECORD',
    'ALLOW',
    'OUTCOME',
    v_outcome_id,
    p_actor_id,
    'outcome.record',
    'PROJECT',
    v_decision.project_id,
    'authorized recording of a separate attributed Outcome observation',
    p_command_id,
    null,
    null,
    jsonb_build_object(
      'outcome_id', v_outcome_id,
      'domain_decision_id', v_decision.id,
      'classification', p_classification
    )
  );

  perform private.b1_record_event(
    v_decision.cell_id,
    'OUTCOME_RECORDED',
    'OUTCOME',
    v_outcome_id,
    'OUTCOME',
    v_outcome_id,
    p_actor_id,
    'outcome.record',
    'PROJECT',
    v_decision.project_id,
    p_command_id,
    null,
    1,
    v_decision.visibility,
    jsonb_build_object(
      'decision_id', v_decision.id,
      'classification', p_classification,
      'observed_at', p_observed_at
    )
  );

  v_result := jsonb_build_object(
    'ok', true,
    'outcome_id', v_outcome_id,
    'decision_id', v_decision.id,
    'classification', p_classification,
    'observed_at', p_observed_at
  );

  perform private.b1_finish_command(p_actor_id, p_idempotency_key, v_result);
  return v_result;
end;
$$;

create or replace function public.t2d_reconcile_decision(p_decision_id uuid)
returns text[]
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  with material as (
    select * from public.domain_decisions where id = p_decision_id
  ), checks as (
    select 'missing_material' as issue
    where not exists (select 1 from material)
    union all
    select 'claim_context_mismatch'
    where exists (
      select 1
      from material d
      left join public.claims c on c.id = d.claim_id
      where c.id is null or c.project_id <> d.project_id or c.cell_id <> d.cell_id
    )
    union all
    select 'verification_required'
    where exists (
      select 1 from material
      where disposition in ('ACCEPT_FOR_CONTEXT', 'REJECT_FOR_CONTEXT')
    )
    and not exists (
      select 1 from public.domain_decision_verifications
      where decision_id = p_decision_id
    )
    union all
    select 'verification_context_mismatch'
    where exists (
      select 1
      from material d
      join public.domain_decision_verifications dv on dv.decision_id = d.id
      join public.verifications v on v.id = dv.verification_id
      where v.claim_id <> d.claim_id or v.project_id <> d.project_id
    )
    union all
    select 'issue_event_count'
    where (
      select count(*) from public.domain_events e
      where e.aggregate_type = 'DOMAIN_DECISION'
        and e.aggregate_id = p_decision_id
        and e.event_type = 'DOMAIN_DECISION_ISSUED'
    ) <> 1
  )
  select coalesce(array_agg(issue order by issue), '{}'::text[]) from checks;
$$;

create or replace function public.t2d_reconcile_outcome(p_outcome_id uuid)
returns text[]
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  with material as (
    select * from public.outcomes where id = p_outcome_id
  ), checks as (
    select 'missing_material' as issue
    where not exists (select 1 from material)
    union all
    select 'decision_context_mismatch'
    where exists (
      select 1
      from material o
      left join public.domain_decisions d on d.id = o.decision_id
      where d.id is null or d.project_id <> o.project_id or d.cell_id <> o.cell_id
    )
    union all
    select 'classification_observed_at_mismatch'
    where exists (
      select 1 from material
      where (classification = 'OBSERVED' and observed_at is null)
         or (classification = 'INCONCLUSIVE' and observed_at is not null)
    )
    union all
    select 'record_event_count'
    where (
      select count(*) from public.domain_events e
      where e.aggregate_type = 'OUTCOME'
        and e.aggregate_id = p_outcome_id
        and e.event_type = 'OUTCOME_RECORDED'
    ) <> 1
  )
  select coalesce(array_agg(issue order by issue), '{}'::text[]) from checks;
$$;

alter table public.domain_decisions enable row level security;
alter table public.domain_decision_verifications enable row level security;
alter table public.outcomes enable row level security;

create policy domain_decisions_read
on public.domain_decisions
for select to authenticated
using (
  private.t2d_current_profile_can_read_commitment(
    private.t2d_claim_commitment_id(claim_id)
  )
);

create policy domain_decision_verifications_read
on public.domain_decision_verifications
for select to authenticated
using (
  exists (
    select 1 from public.domain_decisions d
    where d.id = domain_decision_verifications.decision_id
  )
);

create policy outcomes_read
on public.outcomes
for select to authenticated
using (
  exists (
    select 1 from public.domain_decisions d
    where d.id = outcomes.decision_id
  )
);

revoke all on public.domain_decisions, public.domain_decision_verifications, public.outcomes
from anon, authenticated;
grant select on public.domain_decisions, public.domain_decision_verifications, public.outcomes
to authenticated;

create or replace function public.t2d_get_commitment_history(p_commitment_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public, private, pg_temp
as $$
declare
  v_cm public.commitments%rowtype;
  v_project public.projects%rowtype;
  v_party boolean := false;
  v_reviewer boolean := false;
  v_scope text;
  v_result jsonb;
begin
  select * into v_cm from public.commitments where id = p_commitment_id;
  if not found then
    raise exception using errcode = 'P0001', message = 'CZ404:COMMITMENT_NOT_FOUND';
  end if;

  if auth.uid() is null then
    raise exception using errcode = '42501', message = 'CZ401:AUTHENTICATION_REQUIRED';
  end if;

  select * into v_project from public.projects where id = v_cm.project_id;

  v_party :=
    private.b1_current_profile_controls_actor(v_cm.proposer_actor_id)
    or private.b1_current_profile_controls_actor(v_cm.accepted_by_actor_id)
    or private.can_manage_project(v_cm.project_id, auth.uid());

  v_reviewer := exists (
    select 1
    from public.verification_requests vr
    where private.t2d_claim_commitment_id(vr.claim_id) = v_cm.id
      and private.b1_current_profile_controls_actor(vr.reviewer_actor_id)
  );

  if not (v_party or v_reviewer) then
    raise exception using errcode = '42501', message = 'CZ403:COMMITMENT_HISTORY_DENIED';
  end if;

  v_scope := case when v_party then 'PARTY' else 'REVIEWER' end;

  v_result := jsonb_build_object(
    'viewer_scope', v_scope,
    'project', jsonb_build_object(
      'id', v_project.id,
      'slug', v_project.slug,
      'title', v_project.title,
      'steward_actor_id', v_project.steward_actor_id
    ),
    'need', (
      select case when n.id is null then null else jsonb_build_object(
        'id', n.id,
        'title', nv.title,
        'statement', nv.statement,
        'owner_actor_id', n.owner_actor_id,
        'created_at', n.created_at
      ) end
      from public.opportunities o
      left join public.needs n on n.id = o.need_id
      left join public.need_versions nv
        on nv.need_id = n.id and nv.version = n.current_version
      where o.id = v_cm.opportunity_id
    ),
    'opportunity', (
      select jsonb_build_object(
        'id', o.id,
        'version', v_cm.opportunity_version,
        'title', ov.title,
        'statement', ov.statement,
        'owner_actor_id', o.owner_actor_id,
        'created_at', o.created_at
      )
      from public.opportunities o
      join public.opportunity_versions ov
        on ov.opportunity_id = o.id and ov.version = v_cm.opportunity_version
      where o.id = v_cm.opportunity_id
    ),
    'proposal', (
      select jsonb_build_object(
        'id', p.id,
        'version', v_cm.proposal_version,
        'statement', case when v_party then pv.statement else null end,
        'proposer_actor_id', p.proposer_actor_id,
        'created_at', p.created_at
      )
      from public.proposals p
      join public.proposal_versions pv
        on pv.proposal_id = p.id and pv.version = v_cm.proposal_version
      where p.id = v_cm.proposal_id
    ),
    'commitment', jsonb_build_object(
      'id', v_cm.id,
      'project_id', v_cm.project_id,
      'opportunity_id', v_cm.opportunity_id,
      'opportunity_version', v_cm.opportunity_version,
      'proposal_id', v_cm.proposal_id,
      'proposal_version', v_cm.proposal_version,
      'proposer_actor_id', v_cm.proposer_actor_id,
      'accepted_by_actor_id', v_cm.accepted_by_actor_id,
      'created_at', v_cm.created_at
    ),
    'actors', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'actor_id', a.id,
        'name', coalesce(pp.display_name, a.name),
        'handle', pp.handle
      ) order by coalesce(pp.display_name, a.name), a.id), '[]'::jsonb)
      from public.actors a
      left join lateral (
        select p.display_name, p.handle::text
        from public.profiles p
        join public.actor_memberships am
          on am.profile_id = p.id and am.actor_id = a.id and am.role = 'OWNER'
        where p.visibility = 'PUBLIC'
        order by am.created_at
        limit 1
      ) pp on true
      where a.id in (
        v_cm.proposer_actor_id,
        v_cm.accepted_by_actor_id,
        v_project.steward_actor_id
      )
      or a.id in (
        select vr.reviewer_actor_id
        from public.verification_requests vr
        where private.t2d_claim_commitment_id(vr.claim_id) = v_cm.id
      )
    ),
    'contributions', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'id', c.id,
        'author_actor_id', c.author_actor_id,
        'description', case when v_party then c.description else null end,
        'limitations', case when v_party then c.limitations else null end,
        'supersedes_contribution_id', c.supersedes_contribution_id,
        'submitted_at', c.submitted_at
      ) order by c.submitted_at, c.id), '[]'::jsonb)
      from public.contributions c
      where c.commitment_id = v_cm.id
    ),
    'artifacts', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'id', a.id,
        'contribution_id', a.contribution_id,
        'created_by_actor_id', a.created_by_actor_id,
        'kind', a.kind,
        'uri', a.uri,
        'digest_algorithm', a.digest_algorithm,
        'digest', a.digest,
        'media_type', a.media_type,
        'size_bytes', a.size_bytes,
        'created_at', a.created_at
      ) order by a.created_at, a.id), '[]'::jsonb)
      from public.artifacts a
      join public.contributions c on c.id = a.contribution_id
      where c.commitment_id = v_cm.id
    ),
    'claims', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'id', c.id,
        'subject_type', c.subject_type,
        'subject_id', c.subject_id,
        'author_actor_id', c.author_actor_id,
        'statement', c.statement,
        'scope_description', c.scope_description,
        'created_at', c.created_at
      ) order by c.created_at, c.id), '[]'::jsonb)
      from public.claims c
      where private.t2d_claim_commitment_id(c.id) = v_cm.id
    ),
    'evidence', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'id', e.id,
        'claim_id', l.claim_id,
        'relation', l.relation,
        'source_artifact_id', e.source_artifact_id,
        'custodian_actor_id', e.custodian_actor_id,
        'description', e.description,
        'limitations', e.limitations,
        'digest_algorithm', e.digest_algorithm,
        'digest', e.digest,
        'created_at', e.created_at
      ) order by e.created_at, e.id), '[]'::jsonb)
      from public.evidence_items e
      join public.evidence_links l on l.evidence_item_id = e.id
      where private.t2d_claim_commitment_id(l.claim_id) = v_cm.id
    ),
    'verification_requests', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'id', vr.id,
        'claim_id', vr.claim_id,
        'requester_actor_id', vr.requester_actor_id,
        'reviewer_actor_id', vr.reviewer_actor_id,
        'criteria', vr.criteria,
        'expected_method', vr.expected_method,
        'conflict_codes', to_jsonb(vr.conflict_codes),
        'independence', vr.independence,
        'due_at', vr.due_at,
        'state', vr.state,
        'created_at', vr.created_at
      ) order by vr.created_at, vr.id), '[]'::jsonb)
      from public.verification_requests vr
      where private.t2d_claim_commitment_id(vr.claim_id) = v_cm.id
    ),
    'verifications', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'id', v.id,
        'request_id', v.request_id,
        'claim_id', v.claim_id,
        'verifier_actor_id', v.verifier_actor_id,
        'method', v.method,
        'findings', v.findings,
        'classification', v.classification,
        'limitations', v.limitations,
        'conflict_codes', to_jsonb(v.conflict_codes),
        'independence', v.independence,
        'evidence_item_ids', (
          select coalesce(jsonb_agg(vei.evidence_item_id order by vei.evidence_item_id), '[]'::jsonb)
          from public.verification_evidence_items vei
          where vei.verification_id = v.id
        ),
        'created_at', v.created_at
      ) order by v.created_at, v.id), '[]'::jsonb)
      from public.verifications v
      where private.t2d_claim_commitment_id(v.claim_id) = v_cm.id
    ),
    'decisions', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'id', d.id,
        'claim_id', d.claim_id,
        'deciding_actor_id', d.deciding_actor_id,
        'authority_basis', d.authority_basis,
        'disposition', d.disposition,
        'reason', d.reason,
        'limitations', d.limitations,
        'verification_ids', (
          select coalesce(jsonb_agg(dv.verification_id order by dv.verification_id), '[]'::jsonb)
          from public.domain_decision_verifications dv
          where dv.decision_id = d.id
        ),
        'created_at', d.created_at
      ) order by d.created_at, d.id), '[]'::jsonb)
      from public.domain_decisions d
      where private.t2d_claim_commitment_id(d.claim_id) = v_cm.id
    ),
    'outcomes', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'id', o.id,
        'decision_id', o.decision_id,
        'reporter_actor_id', o.reporter_actor_id,
        'classification', o.classification,
        'statement', o.statement,
        'observed_at', o.observed_at,
        'limitations', o.limitations,
        'created_at', o.created_at
      ) order by o.created_at, o.id), '[]'::jsonb)
      from public.outcomes o
      join public.domain_decisions d on d.id = o.decision_id
      where private.t2d_claim_commitment_id(d.claim_id) = v_cm.id
    )
  );

  return v_result;
end;
$$;

-- Safe cumulative Social Projection:
-- T1 public/social rows + T2 event summaries visible only to authorized episode readers.
create or replace function public.t2_list_social_activity(
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
  with base as (
    select *
    from public.t1_list_social_activity(coalesce(p_following_only, false), p_limit)
  ),
  t2_context as (
    select
      e.*,
      case e.aggregate_type
        when 'CONTRIBUTION' then (
          select c.commitment_id from public.contributions c where c.id = e.aggregate_id
        )
        when 'ARTIFACT' then (
          select c.commitment_id
          from public.artifacts a
          join public.contributions c on c.id = a.contribution_id
          where a.id = e.aggregate_id
        )
        when 'CLAIM' then private.t2d_claim_commitment_id(e.aggregate_id)
        when 'EVIDENCE' then (
          select private.t2d_claim_commitment_id(l.claim_id)
          from public.evidence_links l
          where l.evidence_item_id = e.aggregate_id
          order by l.created_at
          limit 1
        )
        when 'VERIFICATION_REQUEST' then (
          select private.t2d_claim_commitment_id(vr.claim_id)
          from public.verification_requests vr where vr.id = e.aggregate_id
        )
        when 'VERIFICATION' then (
          select private.t2d_claim_commitment_id(v.claim_id)
          from public.verifications v where v.id = e.aggregate_id
        )
        when 'DOMAIN_DECISION' then (
          select private.t2d_claim_commitment_id(d.claim_id)
          from public.domain_decisions d where d.id = e.aggregate_id
        )
        when 'OUTCOME' then (
          select private.t2d_claim_commitment_id(d.claim_id)
          from public.outcomes o
          join public.domain_decisions d on d.id = o.decision_id
          where o.id = e.aggregate_id
        )
        else null
      end as resolved_commitment_id
    from public.domain_events e
    where e.event_type in (
      'CONTRIBUTION_SUBMITTED',
      'ARTIFACT_ATTACHED',
      'CLAIM_RECORDED',
      'EVIDENCE_REGISTERED',
      'VERIFICATION_REQUESTED',
      'VERIFICATION_ISSUED',
      'DOMAIN_DECISION_ISSUED',
      'OUTCOME_RECORDED'
    )
  ),
  t2_resolved as (
    select
      tc.*,
      cm.project_id as resolved_project_id,
      p.slug as resolved_project_slug,
      p.title as project_title,
      cm.opportunity_id as resolved_opportunity_id,
      o.need_id as resolved_need_id,
      a.name as raw_actor_name,
      pp.handle::text as public_actor_handle,
      pp.display_name as public_actor_display_name,
      (
        auth.uid() is not null
        and exists (
          select 1 from public.follows f
          where f.state = 'ACTIVE'
            and private.b1_current_profile_controls_actor(f.follower_actor_id)
            and (
              (f.target_type = 'ACTOR' and f.target_actor_id = tc.actor_id)
              or (f.target_type = 'PROJECT' and f.target_project_id = cm.project_id)
              or (f.target_type = 'NEED' and f.target_need_id = o.need_id)
            )
        )
      ) as viewer_follows_context
    from t2_context tc
    join public.commitments cm on cm.id = tc.resolved_commitment_id
    join public.projects p on p.id = cm.project_id
    join public.opportunities o on o.id = cm.opportunity_id
    left join public.actors a on a.id = tc.actor_id
    left join lateral (
      select pr.handle, pr.display_name
      from public.profiles pr
      join public.actor_memberships am
        on am.profile_id = pr.id and am.actor_id = tc.actor_id and am.role = 'OWNER'
      where pr.visibility = 'PUBLIC'
      order by am.created_at
      limit 1
    ) pp on true
    where private.t2d_current_profile_can_read_commitment(tc.resolved_commitment_id)
  ),
  t2_rows as (
    select
      r.id as event_id,
      r.event_type,
      r.occurred_at,
      r.visibility,
      r.actor_id,
      coalesce(r.public_actor_display_name, r.raw_actor_name, 'Participant') as actor_name,
      r.public_actor_handle as actor_handle,
      case r.aggregate_type
        when 'CONTRIBUTION' then 'CONTRIBUTION'
        when 'CLAIM' then 'CLAIM'
        when 'VERIFICATION_REQUEST' then 'VERIFICATION'
        when 'VERIFICATION' then 'VERIFICATION'
        when 'DOMAIN_DECISION' then 'DECISION'
        when 'OUTCOME' then 'OUTCOME'
        else 'COMMITMENT'
      end as target_type,
      case r.aggregate_type
        when 'VERIFICATION' then (
          select v.request_id from public.verifications v where v.id = r.aggregate_id
        )
        when 'OUTCOME' then (
          select o.decision_id from public.outcomes o where o.id = r.aggregate_id
        )
        else r.aggregate_id
      end as target_id,
      case r.aggregate_type
        when 'CONTRIBUTION' then 'Contribution'
        when 'ARTIFACT' then 'Artifact'
        when 'CLAIM' then 'Claim'
        when 'EVIDENCE' then 'Evidence'
        when 'VERIFICATION_REQUEST' then 'Verification request'
        when 'VERIFICATION' then 'Verification'
        when 'DOMAIN_DECISION' then 'Decision'
        when 'OUTCOME' then 'Outcome'
        else r.project_title
      end as target_label,
      case r.aggregate_type
        when 'CONTRIBUTION' then '/contributions/' || r.aggregate_id::text
        when 'ARTIFACT' then '/commitments/' || r.resolved_commitment_id::text || '/history'
        when 'CLAIM' then '/claims/' || r.aggregate_id::text
        when 'EVIDENCE' then '/commitments/' || r.resolved_commitment_id::text || '/history'
        when 'VERIFICATION_REQUEST' then '/verifications/' || r.aggregate_id::text
        when 'VERIFICATION' then '/verifications/' || (
          select v.request_id::text from public.verifications v where v.id = r.aggregate_id
        )
        when 'DOMAIN_DECISION' then '/decisions/' || r.aggregate_id::text
        when 'OUTCOME' then '/decisions/' || (
          select o.decision_id::text from public.outcomes o where o.id = r.aggregate_id
        )
        else '/commitments/' || r.resolved_commitment_id::text || '/history'
      end as target_path,
      r.resolved_project_id as project_id,
      r.resolved_project_slug as project_slug,
      r.resolved_need_id as need_id,
      r.resolved_opportunity_id as opportunity_id,
      r.resolved_commitment_id as commitment_id,
      r.viewer_follows_context as is_followed
    from t2_resolved r
    where
      not coalesce(p_following_only, false)
      or r.viewer_follows_context
  ),
  combined as (
    select * from base
    union all
    select * from t2_rows
  )
  select *
  from combined
  order by occurred_at desc, event_id desc
  limit greatest(1, least(coalesce(p_limit, 50), 100));
$$;

revoke all on function private.t2d_claim_commitment_id(uuid) from public;
revoke all on function private.t2d_current_profile_can_read_commitment(uuid) from public;
grant execute on function private.t2d_claim_commitment_id(uuid) to authenticated;
grant execute on function private.t2d_current_profile_can_read_commitment(uuid) to authenticated;

revoke all on function public.t2d_commitment_for_claim(uuid) from public;
revoke all on function public.t2d_issue_domain_decision(
  uuid, uuid, uuid[], text, text, text, uuid, text
) from public;
revoke all on function public.t2d_record_outcome(
  uuid, uuid, text, text, timestamptz, text, uuid, text
) from public;
revoke all on function public.t2d_reconcile_decision(uuid) from public;
revoke all on function public.t2d_reconcile_outcome(uuid) from public;
revoke all on function public.t2d_get_commitment_history(uuid) from public;
revoke all on function public.t2_list_social_activity(boolean, integer) from public;

grant execute on function public.t2d_commitment_for_claim(uuid) to authenticated;
grant execute on function public.t2d_issue_domain_decision(
  uuid, uuid, uuid[], text, text, text, uuid, text
) to authenticated;
grant execute on function public.t2d_record_outcome(
  uuid, uuid, text, text, timestamptz, text, uuid, text
) to authenticated;
grant execute on function public.t2d_reconcile_decision(uuid) to authenticated;
grant execute on function public.t2d_reconcile_outcome(uuid) to authenticated;
grant execute on function public.t2d_get_commitment_history(uuid) to authenticated;
grant execute on function public.t2_list_social_activity(boolean, integer)
to anon, authenticated;

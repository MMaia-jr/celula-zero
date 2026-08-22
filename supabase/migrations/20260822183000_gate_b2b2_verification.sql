-- Gate B2-B2: verification requests and issued verifications.
-- Evidence is examined by an attributed reviewer under declared criteria/method.
-- Verification remains distinct from outcome, reputation, adoption or truth.

create table public.verification_requests (
  id uuid primary key default gen_random_uuid(),
  cell_id uuid not null references public.cells(id) on delete restrict,
  project_id uuid not null references public.projects(id) on delete restrict,
  claim_id uuid not null references public.claims(id) on delete restrict,
  requester_actor_id uuid not null references public.actors(id) on delete restrict,
  reviewer_actor_id uuid not null references public.actors(id) on delete restrict,
  criteria text not null check (char_length(criteria) between 10 and 4000),
  expected_method text not null check (char_length(expected_method) between 3 and 200),
  conflict_codes text[] not null default '{}'::text[]
    check (conflict_codes <@ array[
      'REVIEWER_IS_REQUESTER',
      'REVIEWER_IS_CLAIM_AUTHOR',
      'REVIEWER_IS_SUBJECT_AUTHOR',
      'REVIEWER_IS_EVIDENCE_CUSTODIAN',
      'REVIEWER_IS_PROJECT_STEWARD'
    ]::text[]),
  independence text not null
    check (independence in ('INDEPENDENT', 'NON_INDEPENDENT')),
  due_at timestamptz,
  state text not null default 'OPEN' check (state in ('OPEN', 'COMPLETED')),
  visibility text not null check (visibility in ('PROJECT', 'PARTIES', 'PRIVATE')),
  sensitivity text not null
    check (sensitivity in ('NORMAL', 'PERSONAL', 'SENSITIVE_PERSONAL', 'RESTRICTED_KNOWLEDGE')),
  created_at timestamptz not null default now(),
  completed_at timestamptz,
  check (
    (cardinality(conflict_codes) = 0 and independence = 'INDEPENDENT')
    or (cardinality(conflict_codes) > 0 and independence = 'NON_INDEPENDENT')
  ),
  check (due_at is null or due_at > created_at),
  check (
    (state = 'OPEN' and completed_at is null)
    or (state = 'COMPLETED' and completed_at is not null)
  )
);

create table public.verifications (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null unique references public.verification_requests(id) on delete restrict,
  cell_id uuid not null references public.cells(id) on delete restrict,
  project_id uuid not null references public.projects(id) on delete restrict,
  claim_id uuid not null references public.claims(id) on delete restrict,
  verifier_actor_id uuid not null references public.actors(id) on delete restrict,
  method text not null check (char_length(method) between 3 and 200),
  findings text not null check (char_length(findings) between 10 and 4000),
  classification text not null
    check (classification in ('PASS', 'FAIL', 'PARTIAL', 'INCONCLUSIVE')),
  limitations text not null check (char_length(limitations) between 2 and 2000),
  conflict_codes text[] not null default '{}'::text[]
    check (conflict_codes <@ array[
      'REVIEWER_IS_REQUESTER',
      'REVIEWER_IS_CLAIM_AUTHOR',
      'REVIEWER_IS_SUBJECT_AUTHOR',
      'REVIEWER_IS_EVIDENCE_CUSTODIAN',
      'REVIEWER_IS_PROJECT_STEWARD'
    ]::text[]),
  independence text not null
    check (independence in ('INDEPENDENT', 'NON_INDEPENDENT')),
  state text not null default 'ISSUED' check (state = 'ISSUED'),
  visibility text not null check (visibility in ('PROJECT', 'PARTIES', 'PRIVATE')),
  sensitivity text not null
    check (sensitivity in ('NORMAL', 'PERSONAL', 'SENSITIVE_PERSONAL', 'RESTRICTED_KNOWLEDGE')),
  created_at timestamptz not null default now(),
  check (
    (cardinality(conflict_codes) = 0 and independence = 'INDEPENDENT')
    or (cardinality(conflict_codes) > 0 and independence = 'NON_INDEPENDENT')
  )
);

create table public.verification_evidence_items (
  verification_id uuid not null references public.verifications(id) on delete restrict,
  evidence_item_id uuid not null references public.evidence_items(id) on delete restrict,
  created_at timestamptz not null default now(),
  primary key (verification_id, evidence_item_id)
);

create index verification_requests_claim_state
  on public.verification_requests(claim_id, state, created_at, id);
create index verification_requests_reviewer_state
  on public.verification_requests(reviewer_actor_id, state, created_at, id);
create index verification_evidence_item_lookup
  on public.verification_evidence_items(evidence_item_id, verification_id);

insert into public.capability_definitions(code, description) values
  ('verification.request', 'Request a bounded review of a claim under declared criteria and method.'),
  ('verification.issue', 'Issue an attributed verification without deciding an outcome.')
on conflict (code) do nothing;

insert into public.role_capabilities(role_id, capability_code) values
  ('00000000-0000-4000-8000-00000000c201', 'verification.request'),
  ('00000000-0000-4000-8000-00000000c201', 'verification.issue'),
  ('00000000-0000-4000-8000-00000000c202', 'verification.request'),
  ('00000000-0000-4000-8000-00000000c202', 'verification.issue')
on conflict do nothing;

create or replace function private.b2b2_conflict_codes(
  p_claim_id uuid,
  p_requester_actor_id uuid,
  p_reviewer_actor_id uuid
)
returns text[]
language plpgsql
stable
security definer
set search_path = public, private, pg_temp
as $$
declare
  v_claim public.claims%rowtype;
  v_subject_author uuid;
  v_project_steward uuid;
  v_conflicts text[] := '{}'::text[];
begin
  select * into v_claim from public.claims where id = p_claim_id;
  if not found then
    return '{}'::text[];
  end if;

  if v_claim.subject_type = 'CONTRIBUTION' then
    select author_actor_id into v_subject_author
    from public.contributions where id = v_claim.subject_id;
  elsif v_claim.subject_type = 'ARTIFACT' then
    select created_by_actor_id into v_subject_author
    from public.artifacts where id = v_claim.subject_id;
  end if;

  select steward_actor_id into v_project_steward
  from public.projects where id = v_claim.project_id;

  if p_reviewer_actor_id = p_requester_actor_id then
    v_conflicts := array_append(v_conflicts, 'REVIEWER_IS_REQUESTER');
  end if;
  if p_reviewer_actor_id = v_claim.author_actor_id then
    v_conflicts := array_append(v_conflicts, 'REVIEWER_IS_CLAIM_AUTHOR');
  end if;
  if v_subject_author is not null and p_reviewer_actor_id = v_subject_author then
    v_conflicts := array_append(v_conflicts, 'REVIEWER_IS_SUBJECT_AUTHOR');
  end if;
  if exists (
    select 1
    from public.evidence_links l
    join public.evidence_items e on e.id = l.evidence_item_id
    where l.claim_id = p_claim_id
      and e.custodian_actor_id = p_reviewer_actor_id
  ) then
    v_conflicts := array_append(v_conflicts, 'REVIEWER_IS_EVIDENCE_CUSTODIAN');
  end if;
  if v_project_steward is not null and p_reviewer_actor_id = v_project_steward then
    v_conflicts := array_append(v_conflicts, 'REVIEWER_IS_PROJECT_STEWARD');
  end if;

  return v_conflicts;
end;
$$;

create or replace function private.b2b2_current_profile_reviews_claim(p_claim_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, private, pg_temp
as $$
  select exists (
    select 1
    from public.verification_requests vr
    where vr.claim_id = p_claim_id
      and private.b1_current_profile_controls_actor(vr.reviewer_actor_id)
      and (
        vr.state = 'COMPLETED'
        or private.b1_has_capability(
          vr.reviewer_actor_id, 'verification.issue', 'PROJECT', vr.project_id
        )
      )
  );
$$;

create or replace function private.b2b2_current_profile_reviews_evidence(p_evidence_item_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, private, pg_temp
as $$
  select exists (
    select 1
    from public.evidence_links l
    join public.verification_requests vr on vr.claim_id = l.claim_id
    where l.evidence_item_id = p_evidence_item_id
      and private.b1_current_profile_controls_actor(vr.reviewer_actor_id)
      and (
        vr.state = 'COMPLETED'
        or private.b1_has_capability(
          vr.reviewer_actor_id, 'verification.issue', 'PROJECT', vr.project_id
        )
      )
  );
$$;

create or replace function private.b2b2_current_profile_reviews_request(p_request_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, private, pg_temp
as $$
  select exists (
    select 1
    from public.verification_requests vr
    where vr.id = p_request_id
      and private.b1_current_profile_controls_actor(vr.reviewer_actor_id)
      and (
        vr.state = 'COMPLETED'
        or private.b1_has_capability(
          vr.reviewer_actor_id, 'verification.issue', 'PROJECT', vr.project_id
        )
      )
  );
$$;

create trigger verifications_append_only
before update or delete on public.verifications
for each row execute function private.prevent_append_only_mutation();

create trigger verification_evidence_items_append_only
before update or delete on public.verification_evidence_items
for each row execute function private.prevent_append_only_mutation();

create or replace function public.b2b2_request_verification(
  p_actor_id uuid,
  p_claim_id uuid,
  p_reviewer_actor_id uuid,
  p_criteria text,
  p_expected_method text,
  p_due_at timestamptz,
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
  v_replayed boolean;
  v_result jsonb;
  v_request_id uuid;
  v_conflicts text[];
  v_independence text;
  v_payload jsonb := jsonb_build_object(
    'claim_id', p_claim_id,
    'reviewer_actor_id', p_reviewer_actor_id,
    'criteria', p_criteria,
    'expected_method', p_expected_method,
    'due_at', p_due_at
  );
begin
  select * into v_claim from public.claims where id = p_claim_id;
  if not found then
    raise exception using errcode = 'P0001', message = 'CZ404:CLAIM_NOT_FOUND';
  end if;

  perform private.b1_authorize_actor(
    p_actor_id, 'verification.request', 'PROJECT', v_claim.project_id
  );

  if not (
    private.b1_profile_controls_actor(v_claim.author_actor_id, auth.uid())
    or private.can_manage_project(v_claim.project_id, auth.uid())
  ) then
    raise exception using errcode = '42501', message = 'CZ403:CLAIM_ACCESS_REQUIRED';
  end if;

  if not exists (select 1 from public.actors where id = p_reviewer_actor_id) then
    raise exception using errcode = 'P0001', message = 'CZ404:REVIEWER_NOT_FOUND';
  end if;

  if not private.b1_has_capability(
    p_reviewer_actor_id, 'verification.issue', 'PROJECT', v_claim.project_id
  ) then
    raise exception using errcode = '42501', message = 'CZ403:REVIEWER_CAPABILITY_REQUIRED';
  end if;

  if p_due_at is not null and p_due_at <= now() then
    raise exception using errcode = '22023', message = 'CZ422:INVALID_VERIFICATION_DEADLINE';
  end if;

  select replayed, saved_result into v_replayed, v_result
  from private.b1_begin_command(
    v_claim.cell_id, p_actor_id, p_command_id, p_idempotency_key,
    'verification.request', v_payload
  );
  if v_replayed then
    return v_result;
  end if;

  v_conflicts := private.b2b2_conflict_codes(
    p_claim_id, p_actor_id, p_reviewer_actor_id
  );
  v_independence := case
    when cardinality(v_conflicts) = 0 then 'INDEPENDENT'
    else 'NON_INDEPENDENT'
  end;

  insert into public.verification_requests(
    cell_id, project_id, claim_id, requester_actor_id, reviewer_actor_id,
    criteria, expected_method, conflict_codes, independence, due_at,
    state, visibility, sensitivity
  ) values (
    v_claim.cell_id, v_claim.project_id, v_claim.id, p_actor_id, p_reviewer_actor_id,
    p_criteria, p_expected_method, v_conflicts, v_independence, p_due_at,
    'OPEN', v_claim.visibility, v_claim.sensitivity
  ) returning id into v_request_id;

  perform private.b1_record_event(
    v_claim.cell_id,
    'VERIFICATION_REQUESTED',
    'VERIFICATION_REQUEST',
    v_request_id,
    'VERIFICATION_REQUEST',
    v_request_id,
    p_actor_id,
    'verification.request',
    'PROJECT',
    v_claim.project_id,
    p_command_id,
    null,
    1,
    v_claim.visibility,
    jsonb_build_object(
      'claim_id', v_claim.id,
      'reviewer_actor_id', p_reviewer_actor_id,
      'independence', v_independence,
      'conflict_codes', to_jsonb(v_conflicts),
      'due_at', p_due_at,
      'state', 'OPEN',
      'sensitivity', v_claim.sensitivity
    )
  );

  v_result := jsonb_build_object(
    'ok', true,
    'verification_request_id', v_request_id,
    'claim_id', v_claim.id,
    'reviewer_actor_id', p_reviewer_actor_id,
    'independence', v_independence,
    'conflict_codes', to_jsonb(v_conflicts),
    'state', 'OPEN',
    'visibility', v_claim.visibility,
    'sensitivity', v_claim.sensitivity
  );
  perform private.b1_finish_command(p_actor_id, p_idempotency_key, v_result);
  return v_result;
end;
$$;

create or replace function public.b2b2_issue_verification(
  p_actor_id uuid,
  p_request_id uuid,
  p_method text,
  p_findings text,
  p_classification text,
  p_limitations text,
  p_evidence_item_ids uuid[],
  p_command_id uuid,
  p_idempotency_key text
)
returns jsonb
language plpgsql
security definer
set search_path = public, private, pg_temp
as $$
declare
  v_request public.verification_requests%rowtype;
  v_claim public.claims%rowtype;
  v_replayed boolean;
  v_result jsonb;
  v_verification_id uuid;
  v_conflicts text[];
  v_independence text;
  v_payload jsonb := jsonb_build_object(
    'request_id', p_request_id,
    'method', p_method,
    'findings', p_findings,
    'classification', p_classification,
    'limitations', p_limitations,
    'evidence_item_ids', to_jsonb(p_evidence_item_ids)
  );
begin
  select * into v_request
  from public.verification_requests where id = p_request_id;
  if not found then
    raise exception using errcode = 'P0001', message = 'CZ404:VERIFICATION_REQUEST_NOT_FOUND';
  end if;

  select * into v_claim from public.claims where id = v_request.claim_id;
  if not found then
    raise exception using errcode = 'P0001', message = 'CZ404:CLAIM_NOT_FOUND';
  end if;

  perform private.b1_authorize_actor(
    p_actor_id, 'verification.issue', 'PROJECT', v_request.project_id
  );

  if p_actor_id <> v_request.reviewer_actor_id then
    raise exception using errcode = '42501', message = 'CZ403:ASSIGNED_REVIEWER_REQUIRED';
  end if;

  select replayed, saved_result into v_replayed, v_result
  from private.b1_begin_command(
    v_request.cell_id, p_actor_id, p_command_id, p_idempotency_key,
    'verification.issue', v_payload
  );
  if v_replayed then
    return v_result;
  end if;

  select * into v_request
  from public.verification_requests
  where id = p_request_id
  for update;

  if v_request.state <> 'OPEN'
     or exists (select 1 from public.verifications where request_id = p_request_id) then
    raise exception using errcode = 'P0001', message = 'CZ409:VERIFICATION_REQUEST_COMPLETED';
  end if;

  if not private.b1_has_capability(
    p_actor_id, 'verification.issue', 'PROJECT', v_request.project_id
  ) then
    raise exception using errcode = '42501', message = 'CZ403:CAPABILITY_DENIED';
  end if;

  if p_method <> v_request.expected_method then
    raise exception using errcode = 'P0001', message = 'CZ409:VERIFICATION_METHOD_MISMATCH';
  end if;

  if p_classification not in ('PASS', 'FAIL', 'PARTIAL', 'INCONCLUSIVE') then
    raise exception using errcode = '22023', message = 'CZ422:INVALID_VERIFICATION_CLASSIFICATION';
  end if;

  if p_evidence_item_ids is null or cardinality(p_evidence_item_ids) = 0 then
    raise exception using errcode = '22023', message = 'CZ422:EVIDENCE_REQUIRED';
  end if;
  if array_position(p_evidence_item_ids, null) is not null then
    raise exception using errcode = '22023', message = 'CZ422:INVALID_EVIDENCE_LIST';
  end if;
  if (
    select count(distinct requested.evidence_item_id)
    from unnest(p_evidence_item_ids) as requested(evidence_item_id)
  ) <> cardinality(p_evidence_item_ids) then
    raise exception using errcode = '22023', message = 'CZ422:DUPLICATE_EVIDENCE_ITEM';
  end if;

  if exists (
    select 1
    from unnest(p_evidence_item_ids) as requested(evidence_item_id)
    where not exists (
      select 1
      from public.evidence_links l
      where l.evidence_item_id = requested.evidence_item_id
        and l.claim_id = v_request.claim_id
    )
  ) then
    raise exception using errcode = 'P0001', message = 'CZ409:EVIDENCE_NOT_LINKED_TO_REQUEST_CLAIM';
  end if;

  v_conflicts := private.b2b2_conflict_codes(
    v_request.claim_id, v_request.requester_actor_id, v_request.reviewer_actor_id
  );
  v_independence := case
    when cardinality(v_conflicts) = 0 then 'INDEPENDENT'
    else 'NON_INDEPENDENT'
  end;

  insert into public.verifications(
    request_id, cell_id, project_id, claim_id, verifier_actor_id,
    method, findings, classification, limitations,
    conflict_codes, independence, state, visibility, sensitivity
  ) values (
    v_request.id, v_request.cell_id, v_request.project_id, v_request.claim_id,
    p_actor_id, p_method, p_findings, p_classification, p_limitations,
    v_conflicts, v_independence, 'ISSUED', v_request.visibility, v_request.sensitivity
  ) returning id into v_verification_id;

  insert into public.verification_evidence_items(verification_id, evidence_item_id)
  select v_verification_id, requested.evidence_item_id
  from unnest(p_evidence_item_ids) as requested(evidence_item_id);

  update public.verification_requests
  set state = 'COMPLETED', completed_at = now()
  where id = v_request.id;

  perform private.b1_record_event(
    v_request.cell_id,
    'VERIFICATION_ISSUED',
    'VERIFICATION',
    v_verification_id,
    'VERIFICATION',
    v_verification_id,
    p_actor_id,
    'verification.issue',
    'PROJECT',
    v_request.project_id,
    p_command_id,
    null,
    1,
    v_request.visibility,
    jsonb_build_object(
      'request_id', v_request.id,
      'claim_id', v_request.claim_id,
      'classification', p_classification,
      'independence', v_independence,
      'conflict_codes', to_jsonb(v_conflicts),
      'evidence_count', cardinality(p_evidence_item_ids),
      'state', 'ISSUED',
      'sensitivity', v_request.sensitivity
    )
  );

  v_result := jsonb_build_object(
    'ok', true,
    'verification_id', v_verification_id,
    'verification_request_id', v_request.id,
    'claim_id', v_request.claim_id,
    'classification', p_classification,
    'independence', v_independence,
    'conflict_codes', to_jsonb(v_conflicts),
    'state', 'ISSUED',
    'visibility', v_request.visibility,
    'sensitivity', v_request.sensitivity
  );
  perform private.b1_finish_command(p_actor_id, p_idempotency_key, v_result);
  return v_result;
end;
$$;

create or replace function public.b2b2_reconcile_request(p_request_id uuid)
returns text[]
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  with material as (
    select * from public.verification_requests where id = p_request_id
  ), verification_count as (
    select count(*)::integer as n
    from public.verifications where request_id = p_request_id
  ), checks as (
    select 'missing_material' as issue
    where not exists (select 1 from material)
    union all
    select 'claim_context_mismatch'
    where exists (
      select 1
      from material r
      left join public.claims c on c.id = r.claim_id
      where c.id is null
         or c.cell_id <> r.cell_id
         or c.project_id <> r.project_id
         or c.visibility <> r.visibility
         or c.sensitivity <> r.sensitivity
    )
    union all
    select 'state_verification_count'
    where exists (
      select 1
      from material r cross join verification_count vc
      where (r.state = 'OPEN' and vc.n <> 0)
         or (r.state = 'COMPLETED' and vc.n <> 1)
    )
    union all
    select 'request_event_count'
    where (
      select count(*) from public.domain_events e
      where e.aggregate_type = 'VERIFICATION_REQUEST'
        and e.aggregate_id = p_request_id
        and e.event_type = 'VERIFICATION_REQUESTED'
    ) <> 1
  )
  select coalesce(array_agg(issue order by issue), '{}'::text[]) from checks;
$$;

create or replace function public.b2b2_reconcile_verification(p_verification_id uuid)
returns text[]
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  with material as (
    select * from public.verifications where id = p_verification_id
  ), request_material as (
    select r.*
    from public.verification_requests r
    join material v on v.request_id = r.id
  ), checks as (
    select 'missing_material' as issue
    where not exists (select 1 from material)
    union all
    select 'request_context_mismatch'
    where exists (
      select 1
      from material v
      left join request_material r on true
      where r.id is null
         or r.state <> 'COMPLETED'
         or r.cell_id <> v.cell_id
         or r.project_id <> v.project_id
         or r.claim_id <> v.claim_id
         or r.reviewer_actor_id <> v.verifier_actor_id
         or r.expected_method <> v.method
         or r.visibility <> v.visibility
         or r.sensitivity <> v.sensitivity
    )
    union all
    select 'missing_examined_evidence'
    where exists (select 1 from material)
      and not exists (
        select 1 from public.verification_evidence_items vei
        where vei.verification_id = p_verification_id
      )
    union all
    select 'evidence_claim_mismatch'
    where exists (
      select 1
      from material v
      join public.verification_evidence_items vei on vei.verification_id = v.id
      where not exists (
        select 1 from public.evidence_links l
        where l.evidence_item_id = vei.evidence_item_id
          and l.claim_id = v.claim_id
      )
    )
    union all
    select 'issue_event_count'
    where (
      select count(*) from public.domain_events e
      where e.aggregate_type = 'VERIFICATION'
        and e.aggregate_id = p_verification_id
        and e.event_type = 'VERIFICATION_ISSUED'
    ) <> 1
  )
  select coalesce(array_agg(issue order by issue), '{}'::text[]) from checks;
$$;

alter table public.verification_requests enable row level security;
alter table public.verifications enable row level security;
alter table public.verification_evidence_items enable row level security;

create policy verification_requests_read on public.verification_requests
for select to authenticated using (
  private.b1_current_profile_controls_actor(requester_actor_id)
  or private.b2b2_current_profile_reviews_request(id)
  or private.can_manage_project(project_id, auth.uid())
  or exists (
    select 1 from public.claims c
    where c.id = verification_requests.claim_id
      and private.b1_current_profile_controls_actor(c.author_actor_id)
  )
);

create policy verifications_read on public.verifications
for select to authenticated using (
  exists (
    select 1 from public.verification_requests r
    where r.id = verifications.request_id
  )
);

create policy verification_evidence_items_read on public.verification_evidence_items
for select to authenticated using (
  exists (
    select 1 from public.verifications v
    where v.id = verification_evidence_items.verification_id
  )
);

-- A reviewer assignment is a bounded read grant for exactly the claim under
-- review and evidence explicitly linked to that claim. OPEN requests require
-- a still-valid verification.issue capability; completed reviews remain
-- historically readable to their attributed reviewer.
drop policy claims_read on public.claims;
create policy claims_read on public.claims
for select to authenticated using (
  private.b1_current_profile_controls_actor(author_actor_id)
  or private.can_manage_project(project_id, auth.uid())
  or private.b2b2_current_profile_reviews_claim(id)
);

drop policy evidence_items_read on public.evidence_items;
create policy evidence_items_read on public.evidence_items
for select to authenticated using (
  private.b1_current_profile_controls_actor(custodian_actor_id)
  or private.can_manage_project(project_id, auth.uid())
  or private.b2b2_current_profile_reviews_evidence(id)
);

drop policy evidence_links_read on public.evidence_links;
create policy evidence_links_read on public.evidence_links
for select to authenticated using (
  exists (
    select 1 from public.evidence_items e
    where e.id = evidence_links.evidence_item_id
      and (
        private.b1_current_profile_controls_actor(e.custodian_actor_id)
        or private.can_manage_project(e.project_id, auth.uid())
        or private.b2b2_current_profile_reviews_evidence(e.id)
      )
  )
);

-- Restricted verification events follow the RLS of their material objects.
drop policy domain_events_read on public.domain_events;
create policy domain_events_read
on public.domain_events
for select
to authenticated
using (
  private.b1_current_profile_controls_actor(actor_id)
  or (
    visibility in ('PROJECT', 'PUBLIC')
    and private.b2b1_current_profile_has_policy_cell_access(policy_version_id)
  )
  or (
    visibility in ('PARTIES', 'PRIVATE')
    and object_type = 'CLAIM'
    and exists (select 1 from public.claims c where c.id = object_id)
  )
  or (
    visibility in ('PARTIES', 'PRIVATE')
    and object_type = 'EVIDENCE_ITEM'
    and exists (select 1 from public.evidence_items e where e.id = object_id)
  )
  or (
    visibility in ('PARTIES', 'PRIVATE')
    and object_type = 'VERIFICATION_REQUEST'
    and exists (
      select 1 from public.verification_requests r where r.id = object_id
    )
  )
  or (
    visibility in ('PARTIES', 'PRIVATE')
    and object_type = 'VERIFICATION'
    and exists (
      select 1 from public.verifications v where v.id = object_id
    )
  )
);

revoke all on function private.b2b2_conflict_codes(uuid, uuid, uuid) from public;
revoke all on function private.b2b2_current_profile_reviews_claim(uuid) from public;
revoke all on function private.b2b2_current_profile_reviews_evidence(uuid) from public;
revoke all on function private.b2b2_current_profile_reviews_request(uuid) from public;
grant execute on function private.b2b2_current_profile_reviews_claim(uuid) to authenticated;
grant execute on function private.b2b2_current_profile_reviews_evidence(uuid) to authenticated;
grant execute on function private.b2b2_current_profile_reviews_request(uuid) to authenticated;

revoke all on public.verification_requests, public.verifications,
  public.verification_evidence_items from anon, authenticated;
grant select on public.verification_requests, public.verifications,
  public.verification_evidence_items to authenticated;

revoke all on function public.b2b2_request_verification(
  uuid, uuid, uuid, text, text, timestamptz, uuid, text
) from public;
revoke all on function public.b2b2_issue_verification(
  uuid, uuid, text, text, text, text, uuid[], uuid, text
) from public;
revoke all on function public.b2b2_reconcile_request(uuid) from public;
revoke all on function public.b2b2_reconcile_verification(uuid) from public;

grant execute on function public.b2b2_request_verification(
  uuid, uuid, uuid, text, text, timestamptz, uuid, text
) to authenticated;
grant execute on function public.b2b2_issue_verification(
  uuid, uuid, text, text, text, text, uuid[], uuid, text
) to authenticated;
grant execute on function public.b2b2_reconcile_request(uuid) to authenticated;
grant execute on function public.b2b2_reconcile_verification(uuid) to authenticated;

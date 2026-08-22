-- Gate B1: contextual authority, versioned coordination, atomic commitments,
-- idempotent command receipts and material/event reconciliation.

create table public.cells (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  name text not null check (char_length(name) between 2 and 120),
  current_policy_version_id uuid,
  created_at timestamptz not null default now()
);

create table public.policy_versions (
  id uuid primary key default gen_random_uuid(),
  cell_id uuid not null references public.cells(id) on delete restrict,
  version integer not null check (version > 0),
  state text not null check (state in ('ACTIVE', 'SUPERSEDED')),
  rules jsonb not null,
  created_by_actor_id uuid not null references public.actors(id) on delete restrict,
  created_at timestamptz not null default now(),
  unique (cell_id, version),
  unique (cell_id, id)
);

alter table public.cells
  add constraint cells_current_policy_version_fk
  foreign key (id, current_policy_version_id)
  references public.policy_versions(cell_id, id)
  on delete restrict;

insert into public.cells(id, slug, name)
values ('00000000-0000-4000-8000-00000000c001', 'cell-zero', 'Célula Zero')
on conflict (id) do nothing;

-- Migrations run before seed.sql. Preserve the canonical seed steward now so
-- the first policy has an attributable creator; seed.sql later reuses this ID.
insert into public.actors(id, kind, name, operator_label)
values (
  '00000000-0000-4000-8000-000000000001',
  'ORGANIZATION',
  'Célula Zero · equipe fundadora',
  null
)
on conflict (id) do nothing;

insert into public.policy_versions(
  id, cell_id, version, state, rules, created_by_actor_id
) values (
  '00000000-0000-4000-8000-00000000c101',
  '00000000-0000-4000-8000-00000000c001',
  1,
  'ACTIVE',
  '{"default_visibility":"PROJECT","publication_is_separate":true,"self_acceptance":false,"self_escalation":false}'::jsonb,
  '00000000-0000-4000-8000-000000000001'
) on conflict (id) do nothing;

update public.cells
set current_policy_version_id = '00000000-0000-4000-8000-00000000c101'
where id = '00000000-0000-4000-8000-00000000c001'
  and current_policy_version_id is null;

alter table public.projects add column cell_id uuid references public.cells(id) on delete restrict;
update public.projects
set cell_id = '00000000-0000-4000-8000-00000000c001'
where cell_id is null;
alter table public.projects alter column cell_id set not null;
alter table public.projects alter column cell_id set default '00000000-0000-4000-8000-00000000c001';

create table public.capability_definitions (
  code text primary key check (code ~ '^[a-z]+(?:\.[a-z_]+)+$'),
  description text not null,
  created_at timestamptz not null default now()
);

create table public.role_definitions (
  id uuid primary key default gen_random_uuid(),
  cell_id uuid not null references public.cells(id) on delete restrict,
  code text not null check (code ~ '^[A-Z]+(?:_[A-Z]+)*$'),
  name text not null,
  created_at timestamptz not null default now(),
  unique (cell_id, code)
);

create table public.role_capabilities (
  role_id uuid not null references public.role_definitions(id) on delete restrict,
  capability_code text not null references public.capability_definitions(code) on delete restrict,
  created_at timestamptz not null default now(),
  primary key (role_id, capability_code)
);

create table public.role_assignments (
  id uuid primary key default gen_random_uuid(),
  cell_id uuid not null references public.cells(id) on delete restrict,
  actor_id uuid not null references public.actors(id) on delete restrict,
  role_id uuid not null references public.role_definitions(id) on delete restrict,
  scope_type text not null check (scope_type in ('CELL', 'PROJECT', 'OPPORTUNITY')),
  scope_id uuid not null,
  policy_version_id uuid not null references public.policy_versions(id) on delete restrict,
  granted_by_actor_id uuid not null references public.actors(id) on delete restrict,
  valid_from timestamptz not null default now(),
  valid_until timestamptz,
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  check (valid_until is null or valid_until > valid_from),
  check (revoked_at is null or revoked_at >= valid_from)
);

create table public.delegations (
  id uuid primary key default gen_random_uuid(),
  cell_id uuid not null references public.cells(id) on delete restrict,
  delegator_actor_id uuid not null references public.actors(id) on delete restrict,
  delegate_actor_id uuid not null references public.actors(id) on delete restrict,
  capability_code text not null references public.capability_definitions(code) on delete restrict,
  scope_type text not null check (scope_type in ('CELL', 'PROJECT', 'OPPORTUNITY')),
  scope_id uuid not null,
  policy_version_id uuid not null references public.policy_versions(id) on delete restrict,
  valid_from timestamptz not null default now(),
  valid_until timestamptz not null,
  status text not null default 'ACTIVE' check (status in ('ACTIVE', 'REVOKED')),
  version integer not null default 1 check (version > 0),
  revoked_at timestamptz,
  revoked_by_actor_id uuid references public.actors(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (delegator_actor_id <> delegate_actor_id),
  check (valid_until > valid_from),
  check ((status = 'ACTIVE' and revoked_at is null) or (status = 'REVOKED' and revoked_at is not null))
);

create table public.opportunities (
  id uuid primary key default gen_random_uuid(),
  cell_id uuid not null references public.cells(id) on delete restrict,
  project_id uuid not null references public.projects(id) on delete restrict,
  owner_actor_id uuid not null references public.actors(id) on delete restrict,
  state text not null check (state in ('DRAFT', 'OPEN', 'CLOSED')),
  visibility text not null default 'PROJECT' check (visibility in ('PROJECT', 'PUBLIC')),
  current_version integer not null default 1 check (current_version > 0),
  material_version integer not null default 1 check (material_version > 0),
  capacity integer not null check (capacity > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.opportunity_versions (
  id uuid primary key default gen_random_uuid(),
  opportunity_id uuid not null references public.opportunities(id) on delete restrict,
  version integer not null check (version > 0),
  title text not null check (char_length(title) between 4 and 160),
  statement text not null check (char_length(statement) between 10 and 4000),
  conditions text not null check (char_length(conditions) between 3 and 4000),
  expected_result text not null check (char_length(expected_result) between 3 and 2000),
  capacity integer not null check (capacity > 0),
  state text not null check (state in ('DRAFT', 'OPEN', 'CLOSED')),
  visibility text not null check (visibility in ('PROJECT', 'PUBLIC')),
  created_by_actor_id uuid not null references public.actors(id) on delete restrict,
  created_at timestamptz not null default now(),
  unique (opportunity_id, version)
);

create table public.proposals (
  id uuid primary key default gen_random_uuid(),
  cell_id uuid not null references public.cells(id) on delete restrict,
  opportunity_id uuid not null references public.opportunities(id) on delete restrict,
  proposer_actor_id uuid not null references public.actors(id) on delete restrict,
  state text not null check (state in ('SUBMITTED', 'REVISION_REQUESTED', 'REJECTED', 'ACCEPTED')),
  visibility text not null default 'PROJECT' check (visibility = 'PROJECT'),
  current_version integer not null default 1 check (current_version > 0),
  material_version integer not null default 1 check (material_version > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.proposal_versions (
  id uuid primary key default gen_random_uuid(),
  proposal_id uuid not null references public.proposals(id) on delete restrict,
  version integer not null check (version > 0),
  statement text not null check (char_length(statement) between 10 and 4000),
  conditions text not null check (char_length(conditions) between 3 and 4000),
  expected_delivery text not null check (char_length(expected_delivery) between 3 and 2000),
  reward_expectation text not null check (char_length(reward_expectation) between 2 and 1000),
  created_by_actor_id uuid not null references public.actors(id) on delete restrict,
  created_at timestamptz not null default now(),
  unique (proposal_id, version)
);

create table public.commitments (
  id uuid primary key default gen_random_uuid(),
  cell_id uuid not null references public.cells(id) on delete restrict,
  project_id uuid not null references public.projects(id) on delete restrict,
  opportunity_id uuid not null references public.opportunities(id) on delete restrict,
  opportunity_version integer not null,
  proposal_id uuid not null references public.proposals(id) on delete restrict,
  proposal_version integer not null,
  proposer_actor_id uuid not null references public.actors(id) on delete restrict,
  accepted_by_actor_id uuid not null references public.actors(id) on delete restrict,
  state text not null default 'ACCEPTED' check (state = 'ACCEPTED'),
  visibility text not null default 'PROJECT' check (visibility = 'PROJECT'),
  created_at timestamptz not null default now(),
  unique (proposal_id),
  foreign key (opportunity_id, opportunity_version)
    references public.opportunity_versions(opportunity_id, version) on delete restrict,
  foreign key (proposal_id, proposal_version)
    references public.proposal_versions(proposal_id, version) on delete restrict,
  check (proposer_actor_id <> accepted_by_actor_id)
);

create table public.decision_records (
  id uuid primary key default gen_random_uuid(),
  cell_id uuid not null references public.cells(id) on delete restrict,
  decision_type text not null,
  outcome text not null check (outcome in ('ALLOW', 'DENY')),
  target_type text not null,
  target_id uuid not null,
  actor_id uuid not null references public.actors(id) on delete restrict,
  policy_version_id uuid not null references public.policy_versions(id) on delete restrict,
  delegation_id uuid references public.delegations(id) on delete restrict,
  opportunity_version integer,
  proposal_version integer,
  reason text not null,
  command_id uuid not null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table public.command_receipts (
  id uuid primary key default gen_random_uuid(),
  cell_id uuid not null references public.cells(id) on delete restrict,
  actor_id uuid not null references public.actors(id) on delete restrict,
  command_id uuid not null unique,
  idempotency_key text not null check (char_length(idempotency_key) between 8 and 200),
  command_type text not null,
  payload_hash text not null check (payload_hash ~ '^[0-9a-f]{64}$'),
  status text not null check (status in ('PROCESSING', 'COMPLETED')),
  result jsonb,
  created_at timestamptz not null default now(),
  completed_at timestamptz,
  unique (actor_id, idempotency_key)
);

create table public.domain_events (
  id uuid primary key default gen_random_uuid(),
  schema_version integer not null default 1 check (schema_version > 0),
  event_type text not null,
  aggregate_type text not null,
  aggregate_id uuid not null,
  aggregate_sequence integer not null check (aggregate_sequence > 0),
  object_type text not null,
  object_id uuid not null,
  actor_id uuid not null references public.actors(id) on delete restrict,
  authorized_by_actor_id uuid not null references public.actors(id) on delete restrict,
  delegation_id uuid references public.delegations(id) on delete restrict,
  policy_version_id uuid not null references public.policy_versions(id) on delete restrict,
  command_id uuid not null,
  correlation_id uuid,
  causation_id uuid,
  material_version_before integer,
  material_version_after integer,
  visibility text not null check (visibility in ('PROJECT', 'PUBLIC')),
  payload jsonb not null default '{}'::jsonb,
  occurred_at timestamptz not null default now(),
  recorded_at timestamptz not null default now(),
  time_origin text not null default 'DATABASE' check (time_origin = 'DATABASE'),
  canonical_digest text not null check (canonical_digest ~ '^[0-9a-f]{64}$'),
  unique (aggregate_type, aggregate_id, aggregate_sequence)
);

create index role_assignments_actor_scope on public.role_assignments(actor_id, scope_type, scope_id);
create index delegations_delegate_scope on public.delegations(delegate_actor_id, scope_type, scope_id);
create index opportunities_project on public.opportunities(project_id, created_at);
create index proposals_opportunity on public.proposals(opportunity_id, created_at);
create index commitments_opportunity on public.commitments(opportunity_id, created_at);
create index decisions_target on public.decision_records(target_type, target_id, created_at);
create index domain_events_aggregate on public.domain_events(aggregate_type, aggregate_id, aggregate_sequence);

insert into public.capability_definitions(code, description) values
  ('delegation.manage', 'Grant and revoke bounded delegations.'),
  ('opportunity.create', 'Create a project-scoped opportunity draft.'),
  ('opportunity.revise', 'Create a new immutable opportunity version.'),
  ('opportunity.publish', 'Publish an opportunity through a separate command.'),
  ('proposal.submit', 'Submit a proposal to an open opportunity.'),
  ('proposal.revise', 'Create a new proposal version after revision request.'),
  ('proposal.request_revision', 'Request a new proposal version.'),
  ('proposal.reject', 'Reject a submitted proposal.'),
  ('proposal.accept', 'Accept an exact proposal and opportunity version.')
on conflict (code) do nothing;

insert into public.role_definitions(id, cell_id, code, name) values
  ('00000000-0000-4000-8000-00000000c201', '00000000-0000-4000-8000-00000000c001', 'CELL_ADMIN', 'Cell administrator'),
  ('00000000-0000-4000-8000-00000000c202', '00000000-0000-4000-8000-00000000c001', 'PROJECT_STEWARD', 'Project steward'),
  ('00000000-0000-4000-8000-00000000c203', '00000000-0000-4000-8000-00000000c001', 'OPPORTUNITY_OWNER', 'Opportunity owner'),
  ('00000000-0000-4000-8000-00000000c204', '00000000-0000-4000-8000-00000000c001', 'CONTRIBUTOR', 'Contributor'),
  ('00000000-0000-4000-8000-00000000c205', '00000000-0000-4000-8000-00000000c001', 'AGENT_OPERATOR', 'Agent operator')
on conflict (id) do nothing;

insert into public.role_capabilities(role_id, capability_code)
select '00000000-0000-4000-8000-00000000c201', code from public.capability_definitions
on conflict do nothing;

insert into public.role_capabilities(role_id, capability_code) values
  ('00000000-0000-4000-8000-00000000c202', 'delegation.manage'),
  ('00000000-0000-4000-8000-00000000c202', 'opportunity.create'),
  ('00000000-0000-4000-8000-00000000c202', 'opportunity.revise'),
  ('00000000-0000-4000-8000-00000000c202', 'opportunity.publish'),
  ('00000000-0000-4000-8000-00000000c202', 'proposal.request_revision'),
  ('00000000-0000-4000-8000-00000000c202', 'proposal.reject'),
  ('00000000-0000-4000-8000-00000000c202', 'proposal.accept'),
  ('00000000-0000-4000-8000-00000000c203', 'opportunity.revise'),
  ('00000000-0000-4000-8000-00000000c203', 'opportunity.publish'),
  ('00000000-0000-4000-8000-00000000c203', 'proposal.request_revision'),
  ('00000000-0000-4000-8000-00000000c203', 'proposal.reject'),
  ('00000000-0000-4000-8000-00000000c203', 'proposal.accept'),
  ('00000000-0000-4000-8000-00000000c204', 'proposal.submit'),
  ('00000000-0000-4000-8000-00000000c204', 'proposal.revise'),
  ('00000000-0000-4000-8000-00000000c205', 'proposal.submit'),
  ('00000000-0000-4000-8000-00000000c205', 'proposal.revise')
on conflict do nothing;

insert into public.role_assignments(
  cell_id, actor_id, role_id, scope_type, scope_id, policy_version_id, granted_by_actor_id
)
select
  p.cell_id,
  pm.actor_id,
  '00000000-0000-4000-8000-00000000c202',
  'PROJECT',
  p.id,
  '00000000-0000-4000-8000-00000000c101',
  p.steward_actor_id
from public.project_members pm
join public.projects p on p.id = pm.project_id
where pm.role = 'PROJECT_STEWARD';

create trigger policy_versions_append_only
before update or delete on public.policy_versions
for each row execute function private.prevent_append_only_mutation();

create trigger opportunity_versions_append_only
before update or delete on public.opportunity_versions
for each row execute function private.prevent_append_only_mutation();

create trigger proposal_versions_append_only
before update or delete on public.proposal_versions
for each row execute function private.prevent_append_only_mutation();

create trigger commitments_append_only
before update or delete on public.commitments
for each row execute function private.prevent_append_only_mutation();

create trigger decision_records_append_only
before update or delete on public.decision_records
for each row execute function private.prevent_append_only_mutation();

create trigger domain_events_append_only
before update or delete on public.domain_events
for each row execute function private.prevent_append_only_mutation();

create or replace function private.b1_payload_hash(p_payload jsonb)
returns text
language sql
immutable
set search_path = pg_catalog, extensions, pg_temp
as $$
  select encode(extensions.digest(convert_to(p_payload::text, 'UTF8'), 'sha256'), 'hex');
$$;

create or replace function private.b1_profile_controls_actor(p_actor_id uuid, p_profile_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select p_profile_id is not null and exists (
    select 1
    from public.actor_memberships am
    where am.actor_id = p_actor_id
      and am.profile_id = p_profile_id
      and am.role in ('OWNER', 'OPERATOR', 'REPRESENTATIVE')
  );
$$;

create or replace function private.b1_profile_has_cell_access(p_cell_id uuid, p_profile_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, private, pg_temp
as $$
  select p_profile_id is not null and exists (
    select 1
    from public.role_assignments ra
    where ra.cell_id = p_cell_id
      and ra.valid_from <= now()
      and (ra.valid_until is null or ra.valid_until > now())
      and ra.revoked_at is null
      and private.b1_profile_controls_actor(ra.actor_id, p_profile_id)
  );
$$;

create or replace function private.b1_current_profile_controls_actor(p_actor_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, private, pg_temp
as $$
  select private.b1_profile_controls_actor(p_actor_id, auth.uid());
$$;

create or replace function private.b1_current_profile_has_cell_access(p_cell_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, private, pg_temp
as $$
  select private.b1_profile_has_cell_access(p_cell_id, auth.uid());
$$;

create or replace function private.b1_scope_cell(p_scope_type text, p_scope_id uuid)
returns uuid
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
begin
  if p_scope_type = 'CELL' then
    return p_scope_id;
  elsif p_scope_type = 'PROJECT' then
    return (select cell_id from public.projects where id = p_scope_id);
  elsif p_scope_type = 'OPPORTUNITY' then
    return (select cell_id from public.opportunities where id = p_scope_id);
  end if;
  return null;
end;
$$;

create or replace function private.b1_scope_project(p_scope_type text, p_scope_id uuid)
returns uuid
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
begin
  if p_scope_type = 'PROJECT' then
    return p_scope_id;
  elsif p_scope_type = 'OPPORTUNITY' then
    return (select project_id from public.opportunities where id = p_scope_id);
  end if;
  return null;
end;
$$;

create or replace function private.b1_scope_contains(
  p_grant_type text,
  p_grant_id uuid,
  p_target_type text,
  p_target_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = public, private, pg_temp
as $$
  select
    (p_grant_type = p_target_type and p_grant_id = p_target_id)
    or (
      p_grant_type = 'CELL'
      and private.b1_scope_cell(p_target_type, p_target_id) = p_grant_id
    )
    or (
      p_grant_type = 'PROJECT'
      and private.b1_scope_project(p_target_type, p_target_id) = p_grant_id
    );
$$;

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
  );
$$;

create or replace function private.b1_authorizing_delegation(
  p_actor_id uuid,
  p_capability text,
  p_scope_type text,
  p_scope_id uuid
)
returns uuid
language sql
stable
security definer
set search_path = public, private, pg_temp
as $$
  select d.id
  from public.delegations d
  join public.cells c on c.id = d.cell_id
  where d.delegate_actor_id = p_actor_id
    and d.capability_code = p_capability
    and d.status = 'ACTIVE'
    and d.valid_from <= now()
    and d.valid_until > now()
    and d.policy_version_id = c.current_policy_version_id
    and private.b1_scope_contains(d.scope_type, d.scope_id, p_scope_type, p_scope_id)
  order by d.valid_until, d.created_at
  limit 1;
$$;

create or replace function private.b1_begin_command(
  p_cell_id uuid,
  p_actor_id uuid,
  p_command_id uuid,
  p_idempotency_key text,
  p_command_type text,
  p_payload jsonb
)
returns table(replayed boolean, saved_result jsonb)
language plpgsql
security definer
set search_path = public, private, pg_temp
as $$
declare
  v_hash text := private.b1_payload_hash(p_payload);
  v_inserted integer;
  v_receipt public.command_receipts%rowtype;
begin
  insert into public.command_receipts(
    cell_id, actor_id, command_id, idempotency_key, command_type, payload_hash, status
  ) values (
    p_cell_id, p_actor_id, p_command_id, p_idempotency_key, p_command_type, v_hash, 'PROCESSING'
  ) on conflict (actor_id, idempotency_key) do nothing;
  get diagnostics v_inserted = row_count;

  if v_inserted = 1 then
    return query select false, null::jsonb;
    return;
  end if;

  select * into v_receipt
  from public.command_receipts
  where actor_id = p_actor_id and idempotency_key = p_idempotency_key;

  if v_receipt.payload_hash <> v_hash or v_receipt.command_type <> p_command_type then
    raise exception using errcode = 'P0001', message = 'CZ409:IDEMPOTENCY_CONFLICT';
  end if;
  if v_receipt.status <> 'COMPLETED' then
    raise exception using errcode = 'P0001', message = 'CZ409:COMMAND_IN_PROGRESS';
  end if;

  return query select true, v_receipt.result;
end;
$$;

create or replace function private.b1_finish_command(
  p_actor_id uuid,
  p_idempotency_key text,
  p_result jsonb
)
returns void
language sql
security definer
set search_path = public, pg_temp
as $$
  update public.command_receipts
  set status = 'COMPLETED', result = p_result, completed_at = now()
  where actor_id = p_actor_id and idempotency_key = p_idempotency_key;
$$;

create or replace function private.b1_record_decision(
  p_cell_id uuid,
  p_decision_type text,
  p_outcome text,
  p_target_type text,
  p_target_id uuid,
  p_actor_id uuid,
  p_capability text,
  p_scope_type text,
  p_scope_id uuid,
  p_reason text,
  p_command_id uuid,
  p_opportunity_version integer default null,
  p_proposal_version integer default null,
  p_payload jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public, private, pg_temp
as $$
declare
  v_id uuid;
  v_policy uuid;
begin
  select current_policy_version_id into v_policy from public.cells where id = p_cell_id;
  insert into public.decision_records(
    cell_id, decision_type, outcome, target_type, target_id, actor_id,
    policy_version_id, delegation_id, opportunity_version, proposal_version,
    reason, command_id, payload
  ) values (
    p_cell_id, p_decision_type, p_outcome, p_target_type, p_target_id, p_actor_id,
    v_policy, private.b1_authorizing_delegation(p_actor_id, p_capability, p_scope_type, p_scope_id),
    p_opportunity_version, p_proposal_version, p_reason, p_command_id, p_payload
  ) returning id into v_id;
  return v_id;
end;
$$;

create or replace function private.b1_record_event(
  p_cell_id uuid,
  p_event_type text,
  p_aggregate_type text,
  p_aggregate_id uuid,
  p_object_type text,
  p_object_id uuid,
  p_actor_id uuid,
  p_capability text,
  p_scope_type text,
  p_scope_id uuid,
  p_command_id uuid,
  p_before integer,
  p_after integer,
  p_visibility text,
  p_payload jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public, private, extensions, pg_temp
as $$
declare
  v_id uuid := gen_random_uuid();
  v_sequence integer;
  v_policy uuid;
  v_delegation uuid;
  v_digest_payload jsonb;
  v_digest text;
begin
  select coalesce(max(aggregate_sequence), 0) + 1 into v_sequence
  from public.domain_events
  where aggregate_type = p_aggregate_type and aggregate_id = p_aggregate_id;
  select current_policy_version_id into v_policy from public.cells where id = p_cell_id;
  v_delegation := private.b1_authorizing_delegation(p_actor_id, p_capability, p_scope_type, p_scope_id);
  v_digest_payload := jsonb_build_object(
    'event_id', v_id, 'event_type', p_event_type, 'aggregate_type', p_aggregate_type,
    'aggregate_id', p_aggregate_id, 'sequence', v_sequence, 'object_type', p_object_type,
    'object_id', p_object_id, 'actor_id', p_actor_id, 'policy_version_id', v_policy,
    'command_id', p_command_id, 'before', p_before, 'after', p_after,
    'visibility', p_visibility, 'payload', p_payload
  );
  v_digest := private.b1_payload_hash(v_digest_payload);

  insert into public.domain_events(
    id, event_type, aggregate_type, aggregate_id, aggregate_sequence,
    object_type, object_id, actor_id, authorized_by_actor_id, delegation_id,
    policy_version_id, command_id, material_version_before,
    material_version_after, visibility, payload, canonical_digest
  ) values (
    v_id, p_event_type, p_aggregate_type, p_aggregate_id, v_sequence,
    p_object_type, p_object_id, p_actor_id, p_actor_id, v_delegation,
    v_policy, p_command_id, p_before, p_after, p_visibility, p_payload, v_digest
  );
  return v_id;
end;
$$;

create or replace function private.b1_authorize_actor(
  p_actor_id uuid,
  p_capability text,
  p_scope_type text,
  p_scope_id uuid
)
returns void
language plpgsql
security definer
set search_path = public, private, pg_temp
as $$
begin
  if not private.b1_profile_controls_actor(p_actor_id, auth.uid()) then
    raise exception using errcode = '42501', message = 'CZ403:ACTOR_CONTROL_REQUIRED';
  end if;
  if not private.b1_has_capability(p_actor_id, p_capability, p_scope_type, p_scope_id) then
    raise exception using errcode = '42501', message = 'CZ403:CAPABILITY_DENIED';
  end if;
end;
$$;

create or replace function public.b1_create_opportunity(
  p_actor_id uuid,
  p_project_id uuid,
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
  v_cell uuid;
  v_id uuid;
  v_replayed boolean;
  v_result jsonb;
  v_payload jsonb;
begin
  select cell_id into v_cell from public.projects where id = p_project_id;
  if v_cell is null then raise exception using errcode = 'P0001', message = 'CZ404:PROJECT_NOT_FOUND'; end if;
  perform private.b1_authorize_actor(p_actor_id, 'opportunity.create', 'PROJECT', p_project_id);
  v_payload := jsonb_build_object('project_id', p_project_id, 'title', p_title, 'statement', p_statement, 'conditions', p_conditions, 'expected_result', p_expected_result, 'capacity', p_capacity);
  select replayed, saved_result into v_replayed, v_result
  from private.b1_begin_command(v_cell, p_actor_id, p_command_id, p_idempotency_key, 'opportunity.create', v_payload);
  if v_replayed then return v_result; end if;

  insert into public.opportunities(cell_id, project_id, owner_actor_id, state, visibility, capacity)
  values (v_cell, p_project_id, p_actor_id, 'DRAFT', 'PROJECT', p_capacity)
  returning id into v_id;
  insert into public.opportunity_versions(
    opportunity_id, version, title, statement, conditions, expected_result,
    capacity, state, visibility, created_by_actor_id
  ) values (v_id, 1, p_title, p_statement, p_conditions, p_expected_result, p_capacity, 'DRAFT', 'PROJECT', p_actor_id);
  perform private.b1_record_decision(v_cell, 'OPPORTUNITY_CREATE', 'ALLOW', 'OPPORTUNITY', v_id, p_actor_id, 'opportunity.create', 'PROJECT', p_project_id, 'authorized opportunity draft creation', p_command_id, 1);
  perform private.b1_record_event(v_cell, 'OPPORTUNITY_CREATED', 'OPPORTUNITY', v_id, 'OPPORTUNITY', v_id, p_actor_id, 'opportunity.create', 'PROJECT', p_project_id, p_command_id, null, 1, 'PROJECT', jsonb_build_object('version', 1, 'state', 'DRAFT'));
  v_result := jsonb_build_object('ok', true, 'opportunity_id', v_id, 'version', 1, 'material_version', 1, 'state', 'DRAFT', 'visibility', 'PROJECT');
  perform private.b1_finish_command(p_actor_id, p_idempotency_key, v_result);
  return v_result;
end;
$$;

create or replace function public.b1_revise_opportunity(
  p_actor_id uuid,
  p_opportunity_id uuid,
  p_expected_material_version integer,
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
  v_o public.opportunities%rowtype;
  v_replayed boolean;
  v_result jsonb;
  v_payload jsonb := jsonb_build_object('opportunity_id', p_opportunity_id, 'expected_material_version', p_expected_material_version, 'title', p_title, 'statement', p_statement, 'conditions', p_conditions, 'expected_result', p_expected_result, 'capacity', p_capacity);
  v_new_version integer;
begin
  select * into v_o from public.opportunities where id = p_opportunity_id;
  if not found then raise exception using errcode = 'P0001', message = 'CZ404:OPPORTUNITY_NOT_FOUND'; end if;
  perform private.b1_authorize_actor(p_actor_id, 'opportunity.revise', 'OPPORTUNITY', p_opportunity_id);
  select replayed, saved_result into v_replayed, v_result from private.b1_begin_command(v_o.cell_id, p_actor_id, p_command_id, p_idempotency_key, 'opportunity.revise', v_payload);
  if v_replayed then return v_result; end if;
  select * into v_o from public.opportunities where id = p_opportunity_id for update;
  if v_o.material_version <> p_expected_material_version then raise exception using errcode = 'P0001', message = 'CZ409:STALE_VERSION'; end if;
  if v_o.state <> 'DRAFT' then raise exception using errcode = 'P0001', message = 'CZ409:INVALID_STATE'; end if;
  v_new_version := v_o.current_version + 1;
  insert into public.opportunity_versions(opportunity_id, version, title, statement, conditions, expected_result, capacity, state, visibility, created_by_actor_id)
  values (p_opportunity_id, v_new_version, p_title, p_statement, p_conditions, p_expected_result, p_capacity, 'DRAFT', 'PROJECT', p_actor_id);
  update public.opportunities set current_version = v_new_version, material_version = material_version + 1, capacity = p_capacity, updated_at = now() where id = p_opportunity_id;
  perform private.b1_record_decision(v_o.cell_id, 'OPPORTUNITY_REVISE', 'ALLOW', 'OPPORTUNITY', p_opportunity_id, p_actor_id, 'opportunity.revise', 'OPPORTUNITY', p_opportunity_id, 'new immutable opportunity version', p_command_id, v_new_version);
  perform private.b1_record_event(v_o.cell_id, 'OPPORTUNITY_REVISED', 'OPPORTUNITY', p_opportunity_id, 'OPPORTUNITY', p_opportunity_id, p_actor_id, 'opportunity.revise', 'OPPORTUNITY', p_opportunity_id, p_command_id, v_o.material_version, v_o.material_version + 1, 'PROJECT', jsonb_build_object('version', v_new_version));
  v_result := jsonb_build_object('ok', true, 'opportunity_id', p_opportunity_id, 'version', v_new_version, 'material_version', v_o.material_version + 1, 'state', 'DRAFT');
  perform private.b1_finish_command(p_actor_id, p_idempotency_key, v_result);
  return v_result;
end;
$$;

create or replace function public.b1_publish_opportunity(
  p_actor_id uuid,
  p_opportunity_id uuid,
  p_expected_material_version integer,
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
  v_v public.opportunity_versions%rowtype;
  v_replayed boolean;
  v_result jsonb;
  v_payload jsonb := jsonb_build_object('opportunity_id', p_opportunity_id, 'expected_material_version', p_expected_material_version);
  v_new_version integer;
begin
  select * into v_o from public.opportunities where id = p_opportunity_id;
  if not found then raise exception using errcode = 'P0001', message = 'CZ404:OPPORTUNITY_NOT_FOUND'; end if;
  perform private.b1_authorize_actor(p_actor_id, 'opportunity.publish', 'OPPORTUNITY', p_opportunity_id);
  select replayed, saved_result into v_replayed, v_result from private.b1_begin_command(v_o.cell_id, p_actor_id, p_command_id, p_idempotency_key, 'opportunity.publish', v_payload);
  if v_replayed then return v_result; end if;
  select * into v_o from public.opportunities where id = p_opportunity_id for update;
  if v_o.material_version <> p_expected_material_version then raise exception using errcode = 'P0001', message = 'CZ409:STALE_VERSION'; end if;
  if v_o.state <> 'DRAFT' then raise exception using errcode = 'P0001', message = 'CZ409:INVALID_STATE'; end if;
  select * into v_v from public.opportunity_versions where opportunity_id = p_opportunity_id and version = v_o.current_version;
  v_new_version := v_o.current_version + 1;
  insert into public.opportunity_versions(opportunity_id, version, title, statement, conditions, expected_result, capacity, state, visibility, created_by_actor_id)
  values (p_opportunity_id, v_new_version, v_v.title, v_v.statement, v_v.conditions, v_v.expected_result, v_v.capacity, 'OPEN', 'PUBLIC', p_actor_id);
  update public.opportunities set state = 'OPEN', visibility = 'PUBLIC', current_version = v_new_version, material_version = material_version + 1, updated_at = now() where id = p_opportunity_id;
  perform private.b1_record_decision(v_o.cell_id, 'OPPORTUNITY_PUBLISH', 'ALLOW', 'OPPORTUNITY', p_opportunity_id, p_actor_id, 'opportunity.publish', 'OPPORTUNITY', p_opportunity_id, 'separate publication command', p_command_id, v_new_version);
  perform private.b1_record_event(v_o.cell_id, 'OPPORTUNITY_PUBLISHED', 'OPPORTUNITY', p_opportunity_id, 'OPPORTUNITY', p_opportunity_id, p_actor_id, 'opportunity.publish', 'OPPORTUNITY', p_opportunity_id, p_command_id, v_o.material_version, v_o.material_version + 1, 'PUBLIC', jsonb_build_object('version', v_new_version, 'state', 'OPEN'));
  v_result := jsonb_build_object('ok', true, 'opportunity_id', p_opportunity_id, 'version', v_new_version, 'material_version', v_o.material_version + 1, 'state', 'OPEN', 'visibility', 'PUBLIC');
  perform private.b1_finish_command(p_actor_id, p_idempotency_key, v_result);
  return v_result;
end;
$$;

create or replace function public.b1_submit_proposal(
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
  v_id uuid;
  v_replayed boolean;
  v_result jsonb;
  v_payload jsonb := jsonb_build_object('opportunity_id', p_opportunity_id, 'statement', p_statement, 'conditions', p_conditions, 'expected_delivery', p_expected_delivery, 'reward_expectation', p_reward_expectation);
begin
  select * into v_o from public.opportunities where id = p_opportunity_id;
  if not found then raise exception using errcode = 'P0001', message = 'CZ404:OPPORTUNITY_NOT_FOUND'; end if;
  perform private.b1_authorize_actor(p_actor_id, 'proposal.submit', 'OPPORTUNITY', p_opportunity_id);
  select replayed, saved_result into v_replayed, v_result from private.b1_begin_command(v_o.cell_id, p_actor_id, p_command_id, p_idempotency_key, 'proposal.submit', v_payload);
  if v_replayed then return v_result; end if;
  if v_o.state <> 'OPEN' then raise exception using errcode = 'P0001', message = 'CZ409:OPPORTUNITY_NOT_OPEN'; end if;
  insert into public.proposals(cell_id, opportunity_id, proposer_actor_id, state, visibility)
  values (v_o.cell_id, p_opportunity_id, p_actor_id, 'SUBMITTED', 'PROJECT') returning id into v_id;
  insert into public.proposal_versions(proposal_id, version, statement, conditions, expected_delivery, reward_expectation, created_by_actor_id)
  values (v_id, 1, p_statement, p_conditions, p_expected_delivery, p_reward_expectation, p_actor_id);
  perform private.b1_record_decision(v_o.cell_id, 'PROPOSAL_SUBMIT', 'ALLOW', 'PROPOSAL', v_id, p_actor_id, 'proposal.submit', 'OPPORTUNITY', p_opportunity_id, 'proposal submitted as immutable version', p_command_id, v_o.current_version, 1);
  perform private.b1_record_event(v_o.cell_id, 'PROPOSAL_SUBMITTED', 'PROPOSAL', v_id, 'PROPOSAL', v_id, p_actor_id, 'proposal.submit', 'OPPORTUNITY', p_opportunity_id, p_command_id, null, 1, 'PROJECT', jsonb_build_object('version', 1, 'opportunity_id', p_opportunity_id));
  v_result := jsonb_build_object('ok', true, 'proposal_id', v_id, 'version', 1, 'material_version', 1, 'state', 'SUBMITTED');
  perform private.b1_finish_command(p_actor_id, p_idempotency_key, v_result);
  return v_result;
end;
$$;

create or replace function public.b1_request_proposal_revision(
  p_actor_id uuid,
  p_proposal_id uuid,
  p_expected_material_version integer,
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
  v_p public.proposals%rowtype;
  v_replayed boolean;
  v_result jsonb;
  v_payload jsonb := jsonb_build_object('proposal_id', p_proposal_id, 'expected_material_version', p_expected_material_version, 'reason', p_reason);
begin
  select * into v_p from public.proposals where id = p_proposal_id;
  if not found then raise exception using errcode = 'P0001', message = 'CZ404:PROPOSAL_NOT_FOUND'; end if;
  perform private.b1_authorize_actor(p_actor_id, 'proposal.request_revision', 'OPPORTUNITY', v_p.opportunity_id);
  select replayed, saved_result into v_replayed, v_result from private.b1_begin_command(v_p.cell_id, p_actor_id, p_command_id, p_idempotency_key, 'proposal.request_revision', v_payload);
  if v_replayed then return v_result; end if;
  select * into v_p from public.proposals where id = p_proposal_id for update;
  if v_p.material_version <> p_expected_material_version then raise exception using errcode = 'P0001', message = 'CZ409:STALE_VERSION'; end if;
  if v_p.state <> 'SUBMITTED' then raise exception using errcode = 'P0001', message = 'CZ409:INVALID_STATE'; end if;
  update public.proposals set state = 'REVISION_REQUESTED', material_version = material_version + 1, updated_at = now() where id = p_proposal_id;
  perform private.b1_record_decision(v_p.cell_id, 'PROPOSAL_REQUEST_REVISION', 'ALLOW', 'PROPOSAL', p_proposal_id, p_actor_id, 'proposal.request_revision', 'OPPORTUNITY', v_p.opportunity_id, p_reason, p_command_id, null, v_p.current_version);
  perform private.b1_record_event(v_p.cell_id, 'PROPOSAL_REVISION_REQUESTED', 'PROPOSAL', p_proposal_id, 'PROPOSAL', p_proposal_id, p_actor_id, 'proposal.request_revision', 'OPPORTUNITY', v_p.opportunity_id, p_command_id, v_p.material_version, v_p.material_version + 1, 'PROJECT', jsonb_build_object('version', v_p.current_version, 'reason', p_reason));
  v_result := jsonb_build_object('ok', true, 'proposal_id', p_proposal_id, 'version', v_p.current_version, 'material_version', v_p.material_version + 1, 'state', 'REVISION_REQUESTED');
  perform private.b1_finish_command(p_actor_id, p_idempotency_key, v_result);
  return v_result;
end;
$$;

create or replace function public.b1_submit_proposal_revision(
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
  v_p public.proposals%rowtype;
  v_replayed boolean;
  v_result jsonb;
  v_new_version integer;
  v_payload jsonb := jsonb_build_object('proposal_id', p_proposal_id, 'expected_material_version', p_expected_material_version, 'statement', p_statement, 'conditions', p_conditions, 'expected_delivery', p_expected_delivery, 'reward_expectation', p_reward_expectation);
begin
  select * into v_p from public.proposals where id = p_proposal_id;
  if not found then raise exception using errcode = 'P0001', message = 'CZ404:PROPOSAL_NOT_FOUND'; end if;
  perform private.b1_authorize_actor(p_actor_id, 'proposal.revise', 'OPPORTUNITY', v_p.opportunity_id);
  if v_p.proposer_actor_id <> p_actor_id then raise exception using errcode = '42501', message = 'CZ403:PROPOSER_REQUIRED'; end if;
  select replayed, saved_result into v_replayed, v_result from private.b1_begin_command(v_p.cell_id, p_actor_id, p_command_id, p_idempotency_key, 'proposal.revise', v_payload);
  if v_replayed then return v_result; end if;
  select * into v_p from public.proposals where id = p_proposal_id for update;
  if v_p.material_version <> p_expected_material_version then raise exception using errcode = 'P0001', message = 'CZ409:STALE_VERSION'; end if;
  if v_p.state <> 'REVISION_REQUESTED' then raise exception using errcode = 'P0001', message = 'CZ409:INVALID_STATE'; end if;
  v_new_version := v_p.current_version + 1;
  insert into public.proposal_versions(proposal_id, version, statement, conditions, expected_delivery, reward_expectation, created_by_actor_id)
  values (p_proposal_id, v_new_version, p_statement, p_conditions, p_expected_delivery, p_reward_expectation, p_actor_id);
  update public.proposals set state = 'SUBMITTED', current_version = v_new_version, material_version = material_version + 1, updated_at = now() where id = p_proposal_id;
  perform private.b1_record_decision(v_p.cell_id, 'PROPOSAL_REVISE', 'ALLOW', 'PROPOSAL', p_proposal_id, p_actor_id, 'proposal.revise', 'OPPORTUNITY', v_p.opportunity_id, 'new immutable proposal version', p_command_id, null, v_new_version);
  perform private.b1_record_event(v_p.cell_id, 'PROPOSAL_REVISED', 'PROPOSAL', p_proposal_id, 'PROPOSAL', p_proposal_id, p_actor_id, 'proposal.revise', 'OPPORTUNITY', v_p.opportunity_id, p_command_id, v_p.material_version, v_p.material_version + 1, 'PROJECT', jsonb_build_object('version', v_new_version));
  v_result := jsonb_build_object('ok', true, 'proposal_id', p_proposal_id, 'version', v_new_version, 'material_version', v_p.material_version + 1, 'state', 'SUBMITTED');
  perform private.b1_finish_command(p_actor_id, p_idempotency_key, v_result);
  return v_result;
end;
$$;

create or replace function public.b1_reject_proposal(
  p_actor_id uuid,
  p_proposal_id uuid,
  p_expected_material_version integer,
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
  v_p public.proposals%rowtype;
  v_replayed boolean;
  v_result jsonb;
  v_payload jsonb := jsonb_build_object('proposal_id', p_proposal_id, 'expected_material_version', p_expected_material_version, 'reason', p_reason);
begin
  select * into v_p from public.proposals where id = p_proposal_id;
  if not found then raise exception using errcode = 'P0001', message = 'CZ404:PROPOSAL_NOT_FOUND'; end if;
  perform private.b1_authorize_actor(p_actor_id, 'proposal.reject', 'OPPORTUNITY', v_p.opportunity_id);
  select replayed, saved_result into v_replayed, v_result from private.b1_begin_command(v_p.cell_id, p_actor_id, p_command_id, p_idempotency_key, 'proposal.reject', v_payload);
  if v_replayed then return v_result; end if;
  select * into v_p from public.proposals where id = p_proposal_id for update;
  if v_p.material_version <> p_expected_material_version then raise exception using errcode = 'P0001', message = 'CZ409:STALE_VERSION'; end if;
  if v_p.state <> 'SUBMITTED' then raise exception using errcode = 'P0001', message = 'CZ409:INVALID_STATE'; end if;
  update public.proposals set state = 'REJECTED', material_version = material_version + 1, updated_at = now() where id = p_proposal_id;
  perform private.b1_record_decision(v_p.cell_id, 'PROPOSAL_REJECT', 'ALLOW', 'PROPOSAL', p_proposal_id, p_actor_id, 'proposal.reject', 'OPPORTUNITY', v_p.opportunity_id, p_reason, p_command_id, null, v_p.current_version);
  perform private.b1_record_event(v_p.cell_id, 'PROPOSAL_REJECTED', 'PROPOSAL', p_proposal_id, 'PROPOSAL', p_proposal_id, p_actor_id, 'proposal.reject', 'OPPORTUNITY', v_p.opportunity_id, p_command_id, v_p.material_version, v_p.material_version + 1, 'PROJECT', jsonb_build_object('version', v_p.current_version, 'reason', p_reason));
  v_result := jsonb_build_object('ok', true, 'proposal_id', p_proposal_id, 'version', v_p.current_version, 'material_version', v_p.material_version + 1, 'state', 'REJECTED');
  perform private.b1_finish_command(p_actor_id, p_idempotency_key, v_result);
  return v_result;
end;
$$;

create or replace function public.b1_accept_proposal(
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
  v_p public.proposals%rowtype;
  v_o public.opportunities%rowtype;
  v_ov public.opportunity_versions%rowtype;
  v_replayed boolean;
  v_result jsonb;
  v_commitment uuid;
  v_count integer;
  v_payload jsonb := jsonb_build_object('proposal_id', p_proposal_id, 'opportunity_version', p_opportunity_version, 'proposal_version', p_proposal_version, 'expected_opportunity_material_version', p_expected_opportunity_material_version, 'expected_proposal_material_version', p_expected_proposal_material_version, 'reason', p_reason);
begin
  select * into v_p from public.proposals where id = p_proposal_id;
  if not found then raise exception using errcode = 'P0001', message = 'CZ404:PROPOSAL_NOT_FOUND'; end if;
  select * into v_o from public.opportunities where id = v_p.opportunity_id;
  perform private.b1_authorize_actor(p_actor_id, 'proposal.accept', 'OPPORTUNITY', v_p.opportunity_id);
  select replayed, saved_result into v_replayed, v_result from private.b1_begin_command(v_o.cell_id, p_actor_id, p_command_id, p_idempotency_key, 'proposal.accept', v_payload);
  if v_replayed then return v_result; end if;

  if p_actor_id = v_p.proposer_actor_id then
    v_result := jsonb_build_object('ok', false, 'error_code', 'SELF_ACCEPTANCE_DENIED');
    perform private.b1_record_decision(v_o.cell_id, 'PROPOSAL_ACCEPT', 'DENY', 'PROPOSAL', v_p.id, p_actor_id, 'proposal.accept', 'OPPORTUNITY', v_o.id, 'an actor cannot accept its own proposal', p_command_id, p_opportunity_version, p_proposal_version);
    perform private.b1_record_event(v_o.cell_id, 'PROPOSAL_ACCEPTANCE_DENIED', 'PROPOSAL', v_p.id, 'PROPOSAL', v_p.id, p_actor_id, 'proposal.accept', 'OPPORTUNITY', v_o.id, p_command_id, v_p.material_version, v_p.material_version, 'PROJECT', jsonb_build_object('error_code', 'SELF_ACCEPTANCE_DENIED'));
    perform private.b1_finish_command(p_actor_id, p_idempotency_key, v_result);
    return v_result;
  end if;

  select * into v_o from public.opportunities where id = v_p.opportunity_id for update;
  select * into v_p from public.proposals where id = p_proposal_id for update;
  if v_o.material_version <> p_expected_opportunity_material_version or v_p.material_version <> p_expected_proposal_material_version then
    raise exception using errcode = 'P0001', message = 'CZ409:STALE_VERSION';
  end if;
  if v_o.current_version <> p_opportunity_version or v_p.current_version <> p_proposal_version then
    raise exception using errcode = 'P0001', message = 'CZ409:STALE_VERSION';
  end if;
  if v_o.state <> 'OPEN' or v_p.state <> 'SUBMITTED' then
    raise exception using errcode = 'P0001', message = 'CZ409:INVALID_STATE';
  end if;
  select count(*)::integer into v_count from public.commitments where opportunity_id = v_o.id;
  if v_count >= v_o.capacity then raise exception using errcode = 'P0001', message = 'CZ409:CAPACITY_EXHAUSTED'; end if;

  insert into public.commitments(
    cell_id, project_id, opportunity_id, opportunity_version, proposal_id,
    proposal_version, proposer_actor_id, accepted_by_actor_id
  ) values (
    v_o.cell_id, v_o.project_id, v_o.id, p_opportunity_version, v_p.id,
    p_proposal_version, v_p.proposer_actor_id, p_actor_id
  ) returning id into v_commitment;
  update public.proposals set state = 'ACCEPTED', material_version = material_version + 1, updated_at = now() where id = v_p.id;
  if v_count + 1 >= v_o.capacity then
    select * into v_ov
    from public.opportunity_versions
    where opportunity_id = v_o.id and version = v_o.current_version;
    insert into public.opportunity_versions(
      opportunity_id, version, title, statement, conditions, expected_result,
      capacity, state, visibility, created_by_actor_id
    ) values (
      v_o.id, v_o.current_version + 1, v_ov.title, v_ov.statement,
      v_ov.conditions, v_ov.expected_result, v_ov.capacity, 'CLOSED',
      v_ov.visibility, p_actor_id
    );
    update public.opportunities
    set state = 'CLOSED', current_version = current_version + 1,
        material_version = material_version + 1, updated_at = now()
    where id = v_o.id;
  end if;
  perform private.b1_record_decision(v_o.cell_id, 'PROPOSAL_ACCEPT', 'ALLOW', 'PROPOSAL', v_p.id, p_actor_id, 'proposal.accept', 'OPPORTUNITY', v_o.id, p_reason, p_command_id, p_opportunity_version, p_proposal_version, jsonb_build_object('commitment_id', v_commitment));
  perform private.b1_record_event(v_o.cell_id, 'PROPOSAL_ACCEPTED', 'PROPOSAL', v_p.id, 'COMMITMENT', v_commitment, p_actor_id, 'proposal.accept', 'OPPORTUNITY', v_o.id, p_command_id, v_p.material_version, v_p.material_version + 1, 'PROJECT', jsonb_build_object('proposal_version', p_proposal_version, 'opportunity_version', p_opportunity_version));
  if v_count + 1 >= v_o.capacity then
    perform private.b1_record_event(v_o.cell_id, 'OPPORTUNITY_CAPACITY_FILLED', 'OPPORTUNITY', v_o.id, 'COMMITMENT', v_commitment, p_actor_id, 'proposal.accept', 'OPPORTUNITY', v_o.id, p_command_id, v_o.material_version, v_o.material_version + 1, v_o.visibility, jsonb_build_object('capacity', v_o.capacity, 'closed_version', v_o.current_version + 1));
  end if;
  v_result := jsonb_build_object('ok', true, 'commitment_id', v_commitment, 'proposal_id', v_p.id, 'proposal_version', p_proposal_version, 'opportunity_id', v_o.id, 'opportunity_version', p_opportunity_version, 'state', 'ACCEPTED');
  perform private.b1_finish_command(p_actor_id, p_idempotency_key, v_result);
  return v_result;
end;
$$;

create or replace function public.b1_grant_delegation(
  p_actor_id uuid,
  p_delegate_actor_id uuid,
  p_capability text,
  p_scope_type text,
  p_scope_id uuid,
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
  v_cell uuid := private.b1_scope_cell(p_scope_type, p_scope_id);
  v_kind text;
  v_id uuid;
  v_replayed boolean;
  v_result jsonb;
  v_payload jsonb := jsonb_build_object('delegate_actor_id', p_delegate_actor_id, 'capability', p_capability, 'scope_type', p_scope_type, 'scope_id', p_scope_id, 'valid_until', p_valid_until);
begin
  perform private.b1_authorize_actor(p_actor_id, 'delegation.manage', p_scope_type, p_scope_id);
  select kind into v_kind from public.actors where id = p_actor_id;
  select replayed, saved_result into v_replayed, v_result from private.b1_begin_command(v_cell, p_actor_id, p_command_id, p_idempotency_key, 'delegation.grant', v_payload);
  if v_replayed then return v_result; end if;
  if v_kind = 'AI_AGENT' or p_actor_id = p_delegate_actor_id then
    v_result := jsonb_build_object('ok', false, 'error_code', 'SELF_ESCALATION_DENIED');
    perform private.b1_record_decision(v_cell, 'DELEGATION_GRANT', 'DENY', 'ACTOR', p_delegate_actor_id, p_actor_id, 'delegation.manage', p_scope_type, p_scope_id, 'AI agents and self-delegators cannot expand their own authority', p_command_id, null, null, jsonb_build_object('capability', p_capability));
    perform private.b1_record_event(v_cell, 'DELEGATION_GRANT_DENIED', 'ACTOR', p_delegate_actor_id, 'ACTOR', p_delegate_actor_id, p_actor_id, 'delegation.manage', p_scope_type, p_scope_id, p_command_id, null, null, 'PROJECT', jsonb_build_object('error_code', 'SELF_ESCALATION_DENIED', 'capability', p_capability));
    perform private.b1_finish_command(p_actor_id, p_idempotency_key, v_result);
    return v_result;
  end if;
  if not private.b1_has_capability(p_actor_id, p_capability, p_scope_type, p_scope_id) then raise exception using errcode = '42501', message = 'CZ403:CANNOT_DELEGATE_UNHELD_CAPABILITY'; end if;
  if p_valid_until <= now() then raise exception using errcode = '22023', message = 'CZ422:INVALID_DELEGATION_WINDOW'; end if;
  insert into public.delegations(cell_id, delegator_actor_id, delegate_actor_id, capability_code, scope_type, scope_id, policy_version_id, valid_until)
  select v_cell, p_actor_id, p_delegate_actor_id, p_capability, p_scope_type, p_scope_id, current_policy_version_id, p_valid_until from public.cells where id = v_cell
  returning id into v_id;
  perform private.b1_record_decision(v_cell, 'DELEGATION_GRANT', 'ALLOW', 'DELEGATION', v_id, p_actor_id, 'delegation.manage', p_scope_type, p_scope_id, 'bounded delegation granted', p_command_id, null, null, jsonb_build_object('capability', p_capability, 'delegate_actor_id', p_delegate_actor_id, 'valid_until', p_valid_until));
  perform private.b1_record_event(v_cell, 'DELEGATION_GRANTED', 'DELEGATION', v_id, 'DELEGATION', v_id, p_actor_id, 'delegation.manage', p_scope_type, p_scope_id, p_command_id, null, 1, 'PROJECT', jsonb_build_object('capability', p_capability, 'delegate_actor_id', p_delegate_actor_id, 'scope_type', p_scope_type, 'scope_id', p_scope_id));
  v_result := jsonb_build_object('ok', true, 'delegation_id', v_id, 'state', 'ACTIVE');
  perform private.b1_finish_command(p_actor_id, p_idempotency_key, v_result);
  return v_result;
end;
$$;

create or replace function public.b1_revoke_delegation(
  p_actor_id uuid,
  p_delegation_id uuid,
  p_expected_version integer,
  p_command_id uuid,
  p_idempotency_key text
)
returns jsonb
language plpgsql
security definer
set search_path = public, private, pg_temp
as $$
declare
  v_d public.delegations%rowtype;
  v_replayed boolean;
  v_result jsonb;
  v_payload jsonb := jsonb_build_object('delegation_id', p_delegation_id, 'expected_version', p_expected_version);
begin
  select * into v_d from public.delegations where id = p_delegation_id;
  if not found then raise exception using errcode = 'P0001', message = 'CZ404:DELEGATION_NOT_FOUND'; end if;
  perform private.b1_authorize_actor(p_actor_id, 'delegation.manage', v_d.scope_type, v_d.scope_id);
  select replayed, saved_result into v_replayed, v_result from private.b1_begin_command(v_d.cell_id, p_actor_id, p_command_id, p_idempotency_key, 'delegation.revoke', v_payload);
  if v_replayed then return v_result; end if;
  select * into v_d from public.delegations where id = p_delegation_id for update;
  if v_d.version <> p_expected_version then raise exception using errcode = 'P0001', message = 'CZ409:STALE_VERSION'; end if;
  if v_d.status <> 'ACTIVE' then raise exception using errcode = 'P0001', message = 'CZ409:INVALID_STATE'; end if;
  update public.delegations set status = 'REVOKED', version = version + 1, revoked_at = now(), revoked_by_actor_id = p_actor_id, updated_at = now() where id = p_delegation_id;
  perform private.b1_record_decision(v_d.cell_id, 'DELEGATION_REVOKE', 'ALLOW', 'DELEGATION', p_delegation_id, p_actor_id, 'delegation.manage', v_d.scope_type, v_d.scope_id, 'delegation revoked', p_command_id);
  perform private.b1_record_event(v_d.cell_id, 'DELEGATION_REVOKED', 'DELEGATION', p_delegation_id, 'DELEGATION', p_delegation_id, p_actor_id, 'delegation.manage', v_d.scope_type, v_d.scope_id, p_command_id, v_d.version, v_d.version + 1, 'PROJECT', jsonb_build_object('capability', v_d.capability_code));
  v_result := jsonb_build_object('ok', true, 'delegation_id', p_delegation_id, 'state', 'REVOKED', 'version', v_d.version + 1);
  perform private.b1_finish_command(p_actor_id, p_idempotency_key, v_result);
  return v_result;
end;
$$;

create or replace function public.b1_reconcile_opportunity(p_opportunity_id uuid)
returns text[]
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  with material as (
    select * from public.opportunities where id = p_opportunity_id
  ), current_snapshot as (
    select ov.* from public.opportunity_versions ov join material m on m.id = ov.opportunity_id and m.current_version = ov.version
  ), checks as (
    select 'missing_material' as issue where not exists (select 1 from material)
    union all
    select 'missing_current_version' where not exists (select 1 from current_snapshot)
    union all
    select 'snapshot_material_mismatch' where exists (
      select 1 from material m join current_snapshot v on true
      where m.capacity <> v.capacity or m.state <> v.state or m.visibility <> v.visibility
    )
    union all
    select 'event_material_version' where coalesce((select max(material_version_after) from public.domain_events where aggregate_type = 'OPPORTUNITY' and aggregate_id = p_opportunity_id), 0) <> coalesce((select material_version from material), 0)
    union all
    select 'capacity_exceeded' where (select count(*) from public.commitments where opportunity_id = p_opportunity_id) > coalesce((select capacity from material), 0)
    union all
    select 'closed_without_filled_capacity' where exists (select 1 from material where state = 'CLOSED') and (select count(*) from public.commitments where opportunity_id = p_opportunity_id) < (select capacity from material)
    union all
    select 'open_with_filled_capacity' where exists (select 1 from material where state = 'OPEN') and (select count(*) from public.commitments where opportunity_id = p_opportunity_id) >= (select capacity from material)
  )
  select coalesce(array_agg(issue order by issue), '{}'::text[]) from checks;
$$;

create or replace function public.b1_reconcile_proposal(p_proposal_id uuid)
returns text[]
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  with material as (
    select * from public.proposals where id = p_proposal_id
  ), checks as (
    select 'missing_material' as issue where not exists (select 1 from material)
    union all
    select 'missing_current_version' where not exists (
      select 1 from public.proposal_versions v join material m on m.id = v.proposal_id and m.current_version = v.version
    )
    union all
    select 'event_material_version' where coalesce((select max(material_version_after) from public.domain_events where aggregate_type = 'PROPOSAL' and aggregate_id = p_proposal_id), 0) <> coalesce((select material_version from material), 0)
    union all
    select 'accepted_without_commitment' where exists (select 1 from material where state = 'ACCEPTED') and not exists (select 1 from public.commitments where proposal_id = p_proposal_id)
    union all
    select 'commitment_without_acceptance' where exists (select 1 from public.commitments where proposal_id = p_proposal_id) and not exists (select 1 from material where state = 'ACCEPTED')
    union all
    select 'commitment_version_mismatch' where exists (
      select 1 from public.commitments c join material m on m.id = c.proposal_id
      where c.proposal_id = p_proposal_id and c.proposal_version <> m.current_version
    )
    union all
    select 'rejected_with_commitment' where exists (select 1 from material where state = 'REJECTED') and exists (select 1 from public.commitments where proposal_id = p_proposal_id)
  )
  select coalesce(array_agg(issue order by issue), '{}'::text[]) from checks;
$$;

alter table public.cells enable row level security;
alter table public.policy_versions enable row level security;
alter table public.capability_definitions enable row level security;
alter table public.role_definitions enable row level security;
alter table public.role_capabilities enable row level security;
alter table public.role_assignments enable row level security;
alter table public.delegations enable row level security;
alter table public.opportunities enable row level security;
alter table public.opportunity_versions enable row level security;
alter table public.proposals enable row level security;
alter table public.proposal_versions enable row level security;
alter table public.commitments enable row level security;
alter table public.decision_records enable row level security;
alter table public.command_receipts enable row level security;
alter table public.domain_events enable row level security;

create policy cells_read on public.cells for select to authenticated using (true);
create policy capabilities_read on public.capability_definitions for select to authenticated using (true);
create policy roles_read on public.role_definitions for select to authenticated using (true);
create policy role_capabilities_read on public.role_capabilities for select to authenticated using (true);
create policy opportunities_read on public.opportunities for select to anon, authenticated using (
  (visibility = 'PUBLIC' and private.project_is_public(project_id))
  or private.can_manage_project(project_id, auth.uid())
  or private.b1_current_profile_controls_actor(owner_actor_id)
);
create policy opportunity_versions_read on public.opportunity_versions for select to anon, authenticated using (
  exists (select 1 from public.opportunities o where o.id = opportunity_id)
);
create policy proposals_read on public.proposals for select to authenticated using (
  private.b1_current_profile_controls_actor(proposer_actor_id)
  or exists (select 1 from public.opportunities o where o.id = opportunity_id and private.can_manage_project(o.project_id, auth.uid()))
);
create policy proposal_versions_read on public.proposal_versions for select to authenticated using (
  exists (select 1 from public.proposals p where p.id = proposal_id)
);
create policy commitments_read on public.commitments for select to authenticated using (
  private.b1_current_profile_controls_actor(proposer_actor_id)
  or private.b1_current_profile_controls_actor(accepted_by_actor_id)
  or private.can_manage_project(project_id, auth.uid())
);
create policy decisions_read on public.decision_records for select to authenticated using (
  private.b1_current_profile_controls_actor(actor_id)
  or private.b1_current_profile_has_cell_access(cell_id)
);
create policy receipts_read_self on public.command_receipts for select to authenticated using (
  private.b1_current_profile_controls_actor(actor_id)
);
create policy domain_events_read on public.domain_events for select to authenticated using (
  private.b1_current_profile_controls_actor(actor_id)
  or exists (
    select 1
    from public.policy_versions pv
    where pv.id = policy_version_id
      and private.b1_current_profile_has_cell_access(pv.cell_id)
  )
);

revoke all on public.cells, public.policy_versions, public.capability_definitions,
  public.role_definitions, public.role_capabilities, public.role_assignments,
  public.delegations, public.opportunities, public.opportunity_versions,
  public.proposals, public.proposal_versions, public.commitments,
  public.decision_records, public.command_receipts, public.domain_events
from anon, authenticated;

grant select on public.cells, public.capability_definitions, public.role_definitions,
  public.role_capabilities, public.opportunities, public.opportunity_versions
to authenticated;
grant select on public.opportunities, public.opportunity_versions to anon;
grant select on public.proposals, public.proposal_versions, public.commitments,
  public.decision_records, public.command_receipts, public.domain_events
to authenticated;

revoke all on function private.b1_payload_hash(jsonb) from public;
revoke all on function private.b1_profile_controls_actor(uuid, uuid) from public;
revoke all on function private.b1_profile_has_cell_access(uuid, uuid) from public;
revoke all on function private.b1_current_profile_controls_actor(uuid) from public;
revoke all on function private.b1_current_profile_has_cell_access(uuid) from public;
revoke all on function private.b1_scope_cell(text, uuid) from public;
revoke all on function private.b1_scope_project(text, uuid) from public;
revoke all on function private.b1_scope_contains(text, uuid, text, uuid) from public;
revoke all on function private.b1_has_capability(uuid, text, text, uuid) from public;
revoke all on function private.b1_authorizing_delegation(uuid, text, text, uuid) from public;
revoke all on function private.b1_begin_command(uuid, uuid, uuid, text, text, jsonb) from public;
revoke all on function private.b1_finish_command(uuid, text, jsonb) from public;
revoke all on function private.b1_record_decision(uuid, text, text, text, uuid, uuid, text, text, uuid, text, uuid, integer, integer, jsonb) from public;
revoke all on function private.b1_record_event(uuid, text, text, uuid, text, uuid, uuid, text, text, uuid, uuid, integer, integer, text, jsonb) from public;
revoke all on function private.b1_authorize_actor(uuid, text, text, uuid) from public;

grant execute on function private.b1_current_profile_controls_actor(uuid) to anon, authenticated;
grant execute on function private.b1_current_profile_has_cell_access(uuid) to authenticated;

revoke all on function public.b1_create_opportunity(uuid, uuid, text, text, text, text, integer, uuid, text) from public;
revoke all on function public.b1_revise_opportunity(uuid, uuid, integer, text, text, text, text, integer, uuid, text) from public;
revoke all on function public.b1_publish_opportunity(uuid, uuid, integer, uuid, text) from public;
revoke all on function public.b1_submit_proposal(uuid, uuid, text, text, text, text, uuid, text) from public;
revoke all on function public.b1_request_proposal_revision(uuid, uuid, integer, text, uuid, text) from public;
revoke all on function public.b1_submit_proposal_revision(uuid, uuid, integer, text, text, text, text, uuid, text) from public;
revoke all on function public.b1_reject_proposal(uuid, uuid, integer, text, uuid, text) from public;
revoke all on function public.b1_accept_proposal(uuid, uuid, integer, integer, integer, integer, text, uuid, text) from public;
revoke all on function public.b1_grant_delegation(uuid, uuid, text, text, uuid, timestamptz, uuid, text) from public;
revoke all on function public.b1_revoke_delegation(uuid, uuid, integer, uuid, text) from public;
revoke all on function public.b1_reconcile_opportunity(uuid) from public;
revoke all on function public.b1_reconcile_proposal(uuid) from public;

grant execute on function public.b1_create_opportunity(uuid, uuid, text, text, text, text, integer, uuid, text) to authenticated;
grant execute on function public.b1_revise_opportunity(uuid, uuid, integer, text, text, text, text, integer, uuid, text) to authenticated;
grant execute on function public.b1_publish_opportunity(uuid, uuid, integer, uuid, text) to authenticated;
grant execute on function public.b1_submit_proposal(uuid, uuid, text, text, text, text, uuid, text) to authenticated;
grant execute on function public.b1_request_proposal_revision(uuid, uuid, integer, text, uuid, text) to authenticated;
grant execute on function public.b1_submit_proposal_revision(uuid, uuid, integer, text, text, text, text, uuid, text) to authenticated;
grant execute on function public.b1_reject_proposal(uuid, uuid, integer, text, uuid, text) to authenticated;
grant execute on function public.b1_accept_proposal(uuid, uuid, integer, integer, integer, integer, text, uuid, text) to authenticated;
grant execute on function public.b1_grant_delegation(uuid, uuid, text, text, uuid, timestamptz, uuid, text) to authenticated;
grant execute on function public.b1_revoke_delegation(uuid, uuid, integer, uuid, text) to authenticated;
grant execute on function public.b1_reconcile_opportunity(uuid) to authenticated;
grant execute on function public.b1_reconcile_proposal(uuid) to authenticated;

-- Gate B2-B1: attributed claims and documented evidence relationships.
-- An artifact remains an artifact; an evidence item is an explicit contextual
-- use of that source. Nothing in this migration verifies a claim or decides an
-- outcome.

create table public.claims (
  id uuid primary key default gen_random_uuid(),
  cell_id uuid not null references public.cells(id) on delete restrict,
  project_id uuid not null references public.projects(id) on delete restrict,
  subject_type text not null check (subject_type in ('CONTRIBUTION', 'ARTIFACT')),
  subject_id uuid not null,
  author_actor_id uuid not null references public.actors(id) on delete restrict,
  statement text not null check (char_length(statement) between 10 and 4000),
  scope_description text not null check (char_length(scope_description) between 3 and 2000),
  state text not null default 'RECORDED' check (state = 'RECORDED'),
  supersedes_claim_id uuid references public.claims(id) on delete restrict,
  visibility text not null default 'PROJECT'
    check (visibility in ('PROJECT', 'PARTIES', 'PRIVATE')),
  sensitivity text not null default 'NORMAL'
    check (sensitivity in ('NORMAL', 'PERSONAL', 'SENSITIVE_PERSONAL', 'RESTRICTED_KNOWLEDGE')),
  created_at timestamptz not null default now(),
  check (supersedes_claim_id is null or supersedes_claim_id <> id)
);

create table public.evidence_items (
  id uuid primary key default gen_random_uuid(),
  cell_id uuid not null references public.cells(id) on delete restrict,
  project_id uuid not null references public.projects(id) on delete restrict,
  source_artifact_id uuid not null references public.artifacts(id) on delete restrict,
  custodian_actor_id uuid not null references public.actors(id) on delete restrict,
  description text not null check (char_length(description) between 10 and 4000),
  limitations text not null check (char_length(limitations) between 2 and 2000),
  digest_algorithm text not null check (digest_algorithm = 'SHA256'),
  digest text not null check (digest ~ '^[0-9a-f]{64}$'),
  state text not null default 'DOCUMENTED' check (state = 'DOCUMENTED'),
  supersedes_evidence_item_id uuid references public.evidence_items(id) on delete restrict,
  visibility text not null default 'PROJECT'
    check (visibility in ('PROJECT', 'PARTIES', 'PRIVATE')),
  sensitivity text not null default 'NORMAL'
    check (sensitivity in ('NORMAL', 'PERSONAL', 'SENSITIVE_PERSONAL', 'RESTRICTED_KNOWLEDGE')),
  retention_class text not null
    check (retention_class in ('PROJECT_LIFETIME', 'UNTIL_WITHDRAWN', 'EXTERNAL_REFERENCE')),
  created_at timestamptz not null default now(),
  check (supersedes_evidence_item_id is null or supersedes_evidence_item_id <> id)
);

create table public.evidence_links (
  id uuid primary key default gen_random_uuid(),
  evidence_item_id uuid not null references public.evidence_items(id) on delete restrict,
  claim_id uuid not null references public.claims(id) on delete restrict,
  relation text not null
    check (relation in ('SUPPORTS', 'CHALLENGES', 'CONTEXTUALIZES', 'REPLICATES')),
  declared_by_actor_id uuid not null references public.actors(id) on delete restrict,
  created_at timestamptz not null default now(),
  unique (evidence_item_id, claim_id, relation)
);

create index claims_subject on public.claims(subject_type, subject_id, created_at, id);
create index claims_project on public.claims(project_id, created_at, id);
create index evidence_items_source on public.evidence_items(source_artifact_id, created_at, id);
create index evidence_items_project on public.evidence_items(project_id, created_at, id);
create index evidence_links_claim on public.evidence_links(claim_id, created_at, id);

insert into public.capability_definitions(code, description) values
  ('claim.record', 'Record an attributed and contestable claim without verifying it.'),
  ('evidence.register', 'Document an artifact source and its explicit relation to a claim.')
on conflict (code) do nothing;

insert into public.role_capabilities(role_id, capability_code) values
  ('00000000-0000-4000-8000-00000000c201', 'claim.record'),
  ('00000000-0000-4000-8000-00000000c201', 'evidence.register'),
  ('00000000-0000-4000-8000-00000000c204', 'claim.record'),
  ('00000000-0000-4000-8000-00000000c204', 'evidence.register'),
  ('00000000-0000-4000-8000-00000000c205', 'claim.record'),
  ('00000000-0000-4000-8000-00000000c205', 'evidence.register')
on conflict do nothing;

create trigger claims_append_only
before update or delete on public.claims
for each row execute function private.prevent_append_only_mutation();

create trigger evidence_items_append_only
before update or delete on public.evidence_items
for each row execute function private.prevent_append_only_mutation();

create trigger evidence_links_append_only
before update or delete on public.evidence_links
for each row execute function private.prevent_append_only_mutation();

create or replace function public.b2b1_record_claim(
  p_actor_id uuid,
  p_subject_type text,
  p_subject_id uuid,
  p_statement text,
  p_scope_description text,
  p_supersedes_claim_id uuid,
  p_command_id uuid,
  p_idempotency_key text
)
returns jsonb
language plpgsql
security definer
set search_path = public, private, pg_temp
as $$
declare
  v_cell_id uuid;
  v_project_id uuid;
  v_subject_visibility text;
  v_subject_sensitivity text;
  v_subject_owner_actor_id uuid;
  v_previous public.claims%rowtype;
  v_replayed boolean;
  v_result jsonb;
  v_claim_id uuid;
  v_payload jsonb := jsonb_build_object(
    'subject_type', p_subject_type,
    'subject_id', p_subject_id,
    'statement', p_statement,
    'scope_description', p_scope_description,
    'supersedes_claim_id', p_supersedes_claim_id
  );
begin
  if p_subject_type = 'CONTRIBUTION' then
    select cell_id, project_id, visibility, sensitivity, author_actor_id
    into v_cell_id, v_project_id, v_subject_visibility, v_subject_sensitivity,
         v_subject_owner_actor_id
    from public.contributions where id = p_subject_id;
  elsif p_subject_type = 'ARTIFACT' then
    select cell_id, project_id, visibility, sensitivity, created_by_actor_id
    into v_cell_id, v_project_id, v_subject_visibility, v_subject_sensitivity,
         v_subject_owner_actor_id
    from public.artifacts where id = p_subject_id;
  else
    raise exception using errcode = 'P0001', message = 'CZ422:INVALID_CLAIM_SUBJECT_TYPE';
  end if;
  if v_project_id is null then
    raise exception using errcode = 'P0001', message = 'CZ404:CLAIM_SUBJECT_NOT_FOUND';
  end if;

  perform private.b1_authorize_actor(
    p_actor_id, 'claim.record', 'PROJECT', v_project_id
  );
  if not (
    private.b1_profile_controls_actor(v_subject_owner_actor_id, auth.uid())
    or private.can_manage_project(v_project_id, auth.uid())
  ) then
    raise exception using errcode = '42501', message = 'CZ403:CLAIM_SUBJECT_ACCESS_REQUIRED';
  end if;

  select replayed, saved_result into v_replayed, v_result
  from private.b1_begin_command(
    v_cell_id, p_actor_id, p_command_id, p_idempotency_key,
    'claim.record', v_payload
  );
  if v_replayed then
    return v_result;
  end if;

  if p_supersedes_claim_id is not null then
    select * into v_previous
    from public.claims
    where id = p_supersedes_claim_id;
    if not found then
      raise exception using errcode = 'P0001', message = 'CZ404:SUPERSEDED_CLAIM_NOT_FOUND';
    end if;
    if v_previous.project_id <> v_project_id
       or v_previous.subject_type <> p_subject_type
       or v_previous.subject_id <> p_subject_id
       or v_previous.author_actor_id <> p_actor_id then
      raise exception using errcode = 'P0001', message = 'CZ409:INVALID_CLAIM_SUPERSEDES_TARGET';
    end if;
  end if;

  insert into public.claims(
    cell_id, project_id, subject_type, subject_id, author_actor_id,
    statement, scope_description, state, supersedes_claim_id,
    visibility, sensitivity
  ) values (
    v_cell_id, v_project_id, p_subject_type, p_subject_id, p_actor_id,
    p_statement, p_scope_description, 'RECORDED', p_supersedes_claim_id,
    v_subject_visibility, v_subject_sensitivity
  ) returning id into v_claim_id;

  perform private.b1_record_event(
    v_cell_id,
    'CLAIM_RECORDED',
    'CLAIM',
    v_claim_id,
    'CLAIM',
    v_claim_id,
    p_actor_id,
    'claim.record',
    'PROJECT',
    v_project_id,
    p_command_id,
    null,
    1,
    v_subject_visibility,
    jsonb_build_object(
      'subject_type', p_subject_type,
      'subject_id', p_subject_id,
      'supersedes_claim_id', p_supersedes_claim_id,
      'state', 'RECORDED',
      'sensitivity', v_subject_sensitivity
    )
  );

  v_result := jsonb_build_object(
    'ok', true,
    'claim_id', v_claim_id,
    'subject_type', p_subject_type,
    'subject_id', p_subject_id,
    'state', 'RECORDED',
    'visibility', v_subject_visibility,
    'sensitivity', v_subject_sensitivity
  );
  perform private.b1_finish_command(p_actor_id, p_idempotency_key, v_result);
  return v_result;
end;
$$;

create or replace function public.b2b1_register_evidence(
  p_actor_id uuid,
  p_claim_id uuid,
  p_source_artifact_id uuid,
  p_relation text,
  p_description text,
  p_limitations text,
  p_supersedes_evidence_item_id uuid,
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
  v_artifact public.artifacts%rowtype;
  v_previous public.evidence_items%rowtype;
  v_previous_link public.evidence_links%rowtype;
  v_replayed boolean;
  v_result jsonb;
  v_evidence_item_id uuid;
  v_evidence_link_id uuid;
  v_payload jsonb := jsonb_build_object(
    'claim_id', p_claim_id,
    'source_artifact_id', p_source_artifact_id,
    'relation', p_relation,
    'description', p_description,
    'limitations', p_limitations,
    'supersedes_evidence_item_id', p_supersedes_evidence_item_id
  );
begin
  select * into v_claim from public.claims where id = p_claim_id;
  if not found then
    raise exception using errcode = 'P0001', message = 'CZ404:CLAIM_NOT_FOUND';
  end if;
  select * into v_artifact from public.artifacts where id = p_source_artifact_id;
  if not found then
    raise exception using errcode = 'P0001', message = 'CZ404:EVIDENCE_SOURCE_ARTIFACT_NOT_FOUND';
  end if;
  if v_claim.cell_id <> v_artifact.cell_id
     or v_claim.project_id <> v_artifact.project_id then
    raise exception using errcode = 'P0001', message = 'CZ409:EVIDENCE_CONTEXT_MISMATCH';
  end if;
  if p_relation not in ('SUPPORTS', 'CHALLENGES', 'CONTEXTUALIZES', 'REPLICATES') then
    raise exception using errcode = 'P0001', message = 'CZ422:INVALID_EVIDENCE_RELATION';
  end if;

  perform private.b1_authorize_actor(
    p_actor_id, 'evidence.register', 'PROJECT', v_claim.project_id
  );
  if not (
    private.b1_profile_controls_actor(v_claim.author_actor_id, auth.uid())
    or private.can_manage_project(v_claim.project_id, auth.uid())
  ) then
    raise exception using errcode = '42501', message = 'CZ403:CLAIM_ACCESS_REQUIRED';
  end if;
  if not (
    private.b1_profile_controls_actor(v_artifact.created_by_actor_id, auth.uid())
    or private.can_manage_project(v_artifact.project_id, auth.uid())
  ) then
    raise exception using errcode = '42501', message = 'CZ403:EVIDENCE_SOURCE_ACCESS_REQUIRED';
  end if;

  select replayed, saved_result into v_replayed, v_result
  from private.b1_begin_command(
    v_claim.cell_id, p_actor_id, p_command_id, p_idempotency_key,
    'evidence.register', v_payload
  );
  if v_replayed then
    return v_result;
  end if;

  if p_supersedes_evidence_item_id is not null then
    select * into v_previous
    from public.evidence_items
    where id = p_supersedes_evidence_item_id;
    if not found then
      raise exception using errcode = 'P0001', message = 'CZ404:SUPERSEDED_EVIDENCE_NOT_FOUND';
    end if;
    select * into v_previous_link
    from public.evidence_links
    where evidence_item_id = p_supersedes_evidence_item_id;
    if not found then
      raise exception using errcode = 'P0001', message = 'CZ409:INVALID_EVIDENCE_SUPERSEDES_TARGET';
    end if;
    if v_previous.project_id <> v_claim.project_id
       or v_previous.source_artifact_id <> p_source_artifact_id
       or v_previous.custodian_actor_id <> p_actor_id
       or v_previous_link.claim_id <> p_claim_id
       or v_previous_link.relation <> p_relation then
      raise exception using errcode = 'P0001', message = 'CZ409:INVALID_EVIDENCE_SUPERSEDES_TARGET';
    end if;
  end if;

  insert into public.evidence_items(
    cell_id, project_id, source_artifact_id, custodian_actor_id,
    description, limitations, digest_algorithm, digest, state,
    supersedes_evidence_item_id, visibility, sensitivity, retention_class
  ) values (
    v_claim.cell_id, v_claim.project_id, v_artifact.id, p_actor_id,
    p_description, p_limitations, v_artifact.digest_algorithm, v_artifact.digest,
    'DOCUMENTED', p_supersedes_evidence_item_id,
    v_artifact.visibility, v_artifact.sensitivity, v_artifact.retention_class
  ) returning id into v_evidence_item_id;

  insert into public.evidence_links(
    evidence_item_id, claim_id, relation, declared_by_actor_id
  ) values (
    v_evidence_item_id, v_claim.id, p_relation, p_actor_id
  ) returning id into v_evidence_link_id;

  perform private.b1_record_event(
    v_claim.cell_id,
    'EVIDENCE_REGISTERED',
    'EVIDENCE',
    v_evidence_item_id,
    'EVIDENCE_ITEM',
    v_evidence_item_id,
    p_actor_id,
    'evidence.register',
    'PROJECT',
    v_claim.project_id,
    p_command_id,
    null,
    1,
    v_artifact.visibility,
    jsonb_build_object(
      'claim_id', v_claim.id,
      'source_artifact_id', v_artifact.id,
      'relation', p_relation,
      'digest_algorithm', v_artifact.digest_algorithm,
      'digest', v_artifact.digest,
      'state', 'DOCUMENTED',
      'sensitivity', v_artifact.sensitivity
    )
  );

  v_result := jsonb_build_object(
    'ok', true,
    'evidence_item_id', v_evidence_item_id,
    'evidence_link_id', v_evidence_link_id,
    'claim_id', v_claim.id,
    'source_artifact_id', v_artifact.id,
    'relation', p_relation,
    'state', 'DOCUMENTED',
    'visibility', v_artifact.visibility,
    'sensitivity', v_artifact.sensitivity
  );
  perform private.b1_finish_command(p_actor_id, p_idempotency_key, v_result);
  return v_result;
end;
$$;

create or replace function public.b2b1_reconcile_claim(p_claim_id uuid)
returns text[]
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  with material as (
    select * from public.claims where id = p_claim_id
  ), checks as (
    select 'missing_material' as issue
    where not exists (select 1 from material)
    union all
    select 'missing_or_mismatched_subject'
    where exists (
      select 1 from material m
      where (m.subject_type = 'CONTRIBUTION' and not exists (
        select 1 from public.contributions c
        where c.id = m.subject_id
          and c.cell_id = m.cell_id
          and c.project_id = m.project_id
      )) or (m.subject_type = 'ARTIFACT' and not exists (
        select 1 from public.artifacts a
        where a.id = m.subject_id
          and a.cell_id = m.cell_id
          and a.project_id = m.project_id
      ))
    )
    union all
    select 'invalid_supersedes_target'
    where exists (
      select 1
      from material m
      join public.claims prior on prior.id = m.supersedes_claim_id
      where prior.project_id <> m.project_id
         or prior.subject_type <> m.subject_type
         or prior.subject_id <> m.subject_id
         or prior.author_actor_id <> m.author_actor_id
    )
    union all
    select 'record_event_count'
    where (
      select count(*) from public.domain_events e
      where e.aggregate_type = 'CLAIM'
        and e.aggregate_id = p_claim_id
        and e.event_type = 'CLAIM_RECORDED'
    ) <> 1
  )
  select coalesce(array_agg(issue order by issue), '{}'::text[]) from checks;
$$;

create or replace function public.b2b1_reconcile_evidence(p_evidence_item_id uuid)
returns text[]
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  with material as (
    select * from public.evidence_items where id = p_evidence_item_id
  ), link as (
    select * from public.evidence_links where evidence_item_id = p_evidence_item_id
  ), checks as (
    select 'missing_material' as issue
    where not exists (select 1 from material)
    union all
    select 'source_context_mismatch'
    where exists (
      select 1 from material m
      where not exists (
        select 1 from public.artifacts a
        where a.id = m.source_artifact_id
          and a.cell_id = m.cell_id
          and a.project_id = m.project_id
      )
    )
    union all
    select 'source_digest_mismatch'
    where exists (
      select 1 from material m
      join public.artifacts a on a.id = m.source_artifact_id
      where a.digest_algorithm <> m.digest_algorithm or a.digest <> m.digest
    )
    union all
    select 'evidence_link_count'
    where (select count(*) from link) <> 1
    union all
    select 'link_context_mismatch'
    where exists (
      select 1
      from material m
      join link l on true
      join public.claims c on c.id = l.claim_id
      where c.cell_id <> m.cell_id
         or c.project_id <> m.project_id
         or l.declared_by_actor_id <> m.custodian_actor_id
    )
    union all
    select 'invalid_supersedes_target'
    where exists (
      select 1
      from material m
      join public.evidence_items prior on prior.id = m.supersedes_evidence_item_id
      join public.evidence_links current_link on current_link.evidence_item_id = m.id
      join public.evidence_links prior_link on prior_link.evidence_item_id = prior.id
      where prior.project_id <> m.project_id
         or prior.source_artifact_id <> m.source_artifact_id
         or prior.custodian_actor_id <> m.custodian_actor_id
         or prior_link.claim_id <> current_link.claim_id
         or prior_link.relation <> current_link.relation
    )
    union all
    select 'register_event_count'
    where (
      select count(*) from public.domain_events e
      where e.aggregate_type = 'EVIDENCE'
        and e.aggregate_id = p_evidence_item_id
        and e.event_type = 'EVIDENCE_REGISTERED'
    ) <> 1
  )
  select coalesce(array_agg(issue order by issue), '{}'::text[]) from checks;
$$;

alter table public.claims enable row level security;
alter table public.evidence_items enable row level security;
alter table public.evidence_links enable row level security;

create policy claims_read on public.claims
for select to authenticated using (
  private.b1_current_profile_controls_actor(author_actor_id)
  or private.can_manage_project(project_id, auth.uid())
);

create policy evidence_items_read on public.evidence_items
for select to authenticated using (
  private.b1_current_profile_controls_actor(custodian_actor_id)
  or private.can_manage_project(project_id, auth.uid())
);

create policy evidence_links_read on public.evidence_links
for select to authenticated using (
  exists (
    select 1 from public.evidence_items e
    where e.id = evidence_links.evidence_item_id
      and (
        private.b1_current_profile_controls_actor(e.custodian_actor_id)
        or private.can_manage_project(e.project_id, auth.uid())
      )
  )
);

revoke all on public.claims, public.evidence_items, public.evidence_links
from anon, authenticated;
grant select on public.claims, public.evidence_items, public.evidence_links
to authenticated;

revoke all on function public.b2b1_record_claim(uuid, text, uuid, text, text, uuid, uuid, text) from public;
revoke all on function public.b2b1_register_evidence(uuid, uuid, uuid, text, text, text, uuid, uuid, text) from public;
revoke all on function public.b2b1_reconcile_claim(uuid) from public;
revoke all on function public.b2b1_reconcile_evidence(uuid) from public;

grant execute on function public.b2b1_record_claim(uuid, text, uuid, text, text, uuid, uuid, text) to authenticated;
grant execute on function public.b2b1_register_evidence(uuid, uuid, uuid, text, text, text, uuid, uuid, text) to authenticated;
grant execute on function public.b2b1_reconcile_claim(uuid) to authenticated;
grant execute on function public.b2b1_reconcile_evidence(uuid) to authenticated;

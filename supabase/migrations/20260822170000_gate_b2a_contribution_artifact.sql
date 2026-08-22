-- Gate B2-A: attributed, append-only contributions and immutable artifact
-- metadata. Artifacts are not evidence and this migration does not decide an
-- outcome or mutate the immutable Gate B1 commitment.

create table public.contributions (
  id uuid primary key default gen_random_uuid(),
  cell_id uuid not null references public.cells(id) on delete restrict,
  project_id uuid not null references public.projects(id) on delete restrict,
  commitment_id uuid not null references public.commitments(id) on delete restrict,
  author_actor_id uuid not null references public.actors(id) on delete restrict,
  description text not null check (char_length(description) between 10 and 4000),
  limitations text not null check (char_length(limitations) between 2 and 2000),
  supersedes_contribution_id uuid references public.contributions(id) on delete restrict,
  visibility text not null default 'PROJECT'
    check (visibility in ('PROJECT', 'PARTIES', 'PRIVATE')),
  sensitivity text not null default 'NORMAL'
    check (sensitivity in ('NORMAL', 'PERSONAL', 'SENSITIVE_PERSONAL', 'RESTRICTED_KNOWLEDGE')),
  submitted_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  check (supersedes_contribution_id is null or supersedes_contribution_id <> id)
);

create table public.artifacts (
  id uuid primary key default gen_random_uuid(),
  cell_id uuid not null references public.cells(id) on delete restrict,
  project_id uuid not null references public.projects(id) on delete restrict,
  contribution_id uuid not null references public.contributions(id) on delete restrict,
  created_by_actor_id uuid not null references public.actors(id) on delete restrict,
  kind text not null check (kind in ('FILE', 'CODE', 'DOCUMENT', 'MEDIA', 'LINK', 'PACKAGE')),
  uri text not null check (char_length(uri) between 3 and 2000),
  digest_algorithm text not null default 'SHA256' check (digest_algorithm = 'SHA256'),
  digest text not null check (digest ~ '^[0-9a-f]{64}$'),
  media_type text not null check (char_length(media_type) between 3 and 200),
  size_bytes bigint check (size_bytes is null or size_bytes >= 0),
  visibility text not null default 'PROJECT'
    check (visibility in ('PROJECT', 'PARTIES', 'PRIVATE')),
  sensitivity text not null default 'NORMAL'
    check (sensitivity in ('NORMAL', 'PERSONAL', 'SENSITIVE_PERSONAL', 'RESTRICTED_KNOWLEDGE')),
  retention_class text not null
    check (retention_class in ('PROJECT_LIFETIME', 'UNTIL_WITHDRAWN', 'EXTERNAL_REFERENCE')),
  created_at timestamptz not null default now(),
  unique (contribution_id, digest_algorithm, digest, uri)
);

create index contributions_commitment
  on public.contributions(commitment_id, submitted_at, id);
create index artifacts_contribution
  on public.artifacts(contribution_id, created_at, id);

insert into public.capability_definitions(code, description) values
  ('contribution.submit', 'Submit an attributed contribution under an accepted commitment.'),
  ('artifact.attach', 'Attach immutable artifact metadata and a content digest to an authored contribution.')
on conflict (code) do nothing;

insert into public.role_capabilities(role_id, capability_code) values
  ('00000000-0000-4000-8000-00000000c201', 'contribution.submit'),
  ('00000000-0000-4000-8000-00000000c201', 'artifact.attach'),
  ('00000000-0000-4000-8000-00000000c204', 'contribution.submit'),
  ('00000000-0000-4000-8000-00000000c204', 'artifact.attach'),
  ('00000000-0000-4000-8000-00000000c205', 'contribution.submit'),
  ('00000000-0000-4000-8000-00000000c205', 'artifact.attach')
on conflict do nothing;

create trigger contributions_append_only
before update or delete on public.contributions
for each row execute function private.prevent_append_only_mutation();

create trigger artifacts_append_only
before update or delete on public.artifacts
for each row execute function private.prevent_append_only_mutation();

create or replace function public.b2a_submit_contribution(
  p_actor_id uuid,
  p_commitment_id uuid,
  p_description text,
  p_limitations text,
  p_supersedes_contribution_id uuid,
  p_command_id uuid,
  p_idempotency_key text
)
returns jsonb
language plpgsql
security definer
set search_path = public, private, pg_temp
as $$
declare
  v_commitment public.commitments%rowtype;
  v_previous public.contributions%rowtype;
  v_replayed boolean;
  v_result jsonb;
  v_contribution_id uuid;
  v_payload jsonb := jsonb_build_object(
    'commitment_id', p_commitment_id,
    'description', p_description,
    'limitations', p_limitations,
    'supersedes_contribution_id', p_supersedes_contribution_id
  );
begin
  select * into v_commitment
  from public.commitments
  where id = p_commitment_id;
  if not found then
    raise exception using errcode = 'P0001', message = 'CZ404:COMMITMENT_NOT_FOUND';
  end if;

  perform private.b1_authorize_actor(
    p_actor_id, 'contribution.submit', 'PROJECT', v_commitment.project_id
  );

  select replayed, saved_result into v_replayed, v_result
  from private.b1_begin_command(
    v_commitment.cell_id, p_actor_id, p_command_id, p_idempotency_key,
    'contribution.submit', v_payload
  );
  if v_replayed then
    return v_result;
  end if;

  if p_actor_id <> v_commitment.proposer_actor_id then
    raise exception using errcode = '42501', message = 'CZ403:COMMITMENT_CONTRIBUTOR_REQUIRED';
  end if;
  if v_commitment.state <> 'ACCEPTED' then
    raise exception using errcode = 'P0001', message = 'CZ409:COMMITMENT_NOT_ACTIVE';
  end if;

  if p_supersedes_contribution_id is not null then
    select * into v_previous
    from public.contributions
    where id = p_supersedes_contribution_id;
    if not found then
      raise exception using errcode = 'P0001', message = 'CZ404:SUPERSEDED_CONTRIBUTION_NOT_FOUND';
    end if;
    if v_previous.commitment_id <> p_commitment_id
       or v_previous.author_actor_id <> p_actor_id then
      raise exception using errcode = 'P0001', message = 'CZ409:INVALID_SUPERSEDES_TARGET';
    end if;
  end if;

  insert into public.contributions(
    cell_id, project_id, commitment_id, author_actor_id,
    description, limitations, supersedes_contribution_id,
    visibility, sensitivity
  ) values (
    v_commitment.cell_id, v_commitment.project_id, v_commitment.id, p_actor_id,
    p_description, p_limitations, p_supersedes_contribution_id,
    'PROJECT', 'NORMAL'
  ) returning id into v_contribution_id;

  perform private.b1_record_event(
    v_commitment.cell_id,
    'CONTRIBUTION_SUBMITTED',
    'CONTRIBUTION',
    v_contribution_id,
    'CONTRIBUTION',
    v_contribution_id,
    p_actor_id,
    'contribution.submit',
    'PROJECT',
    v_commitment.project_id,
    p_command_id,
    null,
    1,
    'PROJECT',
    jsonb_build_object(
      'commitment_id', v_commitment.id,
      'supersedes_contribution_id', p_supersedes_contribution_id,
      'sensitivity', 'NORMAL'
    )
  );

  v_result := jsonb_build_object(
    'ok', true,
    'contribution_id', v_contribution_id,
    'commitment_id', v_commitment.id,
    'state', 'SUBMITTED',
    'visibility', 'PROJECT',
    'sensitivity', 'NORMAL'
  );
  perform private.b1_finish_command(p_actor_id, p_idempotency_key, v_result);
  return v_result;
end;
$$;

create or replace function public.b2a_attach_artifact(
  p_actor_id uuid,
  p_contribution_id uuid,
  p_kind text,
  p_uri text,
  p_digest text,
  p_media_type text,
  p_size_bytes bigint,
  p_retention_class text,
  p_command_id uuid,
  p_idempotency_key text
)
returns jsonb
language plpgsql
security definer
set search_path = public, private, pg_temp
as $$
declare
  v_contribution public.contributions%rowtype;
  v_replayed boolean;
  v_result jsonb;
  v_artifact_id uuid;
  v_payload jsonb := jsonb_build_object(
    'contribution_id', p_contribution_id,
    'kind', p_kind,
    'uri', p_uri,
    'digest', p_digest,
    'media_type', p_media_type,
    'size_bytes', p_size_bytes,
    'retention_class', p_retention_class
  );
begin
  select * into v_contribution
  from public.contributions
  where id = p_contribution_id;
  if not found then
    raise exception using errcode = 'P0001', message = 'CZ404:CONTRIBUTION_NOT_FOUND';
  end if;

  perform private.b1_authorize_actor(
    p_actor_id, 'artifact.attach', 'PROJECT', v_contribution.project_id
  );

  select replayed, saved_result into v_replayed, v_result
  from private.b1_begin_command(
    v_contribution.cell_id, p_actor_id, p_command_id, p_idempotency_key,
    'artifact.attach', v_payload
  );
  if v_replayed then
    return v_result;
  end if;

  if p_actor_id <> v_contribution.author_actor_id then
    raise exception using errcode = '42501', message = 'CZ403:CONTRIBUTION_AUTHOR_REQUIRED';
  end if;
  if p_digest !~ '^[0-9a-f]{64}$' then
    raise exception using errcode = 'P0001', message = 'CZ422:INVALID_SHA256_DIGEST';
  end if;

  insert into public.artifacts(
    cell_id, project_id, contribution_id, created_by_actor_id,
    kind, uri, digest_algorithm, digest, media_type, size_bytes,
    visibility, sensitivity, retention_class
  ) values (
    v_contribution.cell_id, v_contribution.project_id, v_contribution.id, p_actor_id,
    p_kind, p_uri, 'SHA256', p_digest, p_media_type, p_size_bytes,
    'PROJECT', 'NORMAL', p_retention_class
  ) returning id into v_artifact_id;

  perform private.b1_record_event(
    v_contribution.cell_id,
    'ARTIFACT_ATTACHED',
    'ARTIFACT',
    v_artifact_id,
    'ARTIFACT',
    v_artifact_id,
    p_actor_id,
    'artifact.attach',
    'PROJECT',
    v_contribution.project_id,
    p_command_id,
    null,
    1,
    'PROJECT',
    jsonb_build_object(
      'contribution_id', v_contribution.id,
      'kind', p_kind,
      'digest_algorithm', 'SHA256',
      'digest', p_digest,
      'media_type', p_media_type,
      'size_bytes', p_size_bytes,
      'retention_class', p_retention_class,
      'sensitivity', 'NORMAL'
    )
  );

  v_result := jsonb_build_object(
    'ok', true,
    'artifact_id', v_artifact_id,
    'contribution_id', v_contribution.id,
    'digest_algorithm', 'SHA256',
    'digest', p_digest,
    'visibility', 'PROJECT',
    'sensitivity', 'NORMAL'
  );
  perform private.b1_finish_command(p_actor_id, p_idempotency_key, v_result);
  return v_result;
end;
$$;

create or replace function public.b2a_reconcile_contribution(p_contribution_id uuid)
returns text[]
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  with material as (
    select c.*, cm.proposer_actor_id
    from public.contributions c
    join public.commitments cm on cm.id = c.commitment_id
    where c.id = p_contribution_id
  ), checks as (
    select 'missing_material' as issue
    where not exists (select 1 from material)
    union all
    select 'commitment_contributor_mismatch'
    where exists (
      select 1 from material where author_actor_id <> proposer_actor_id
    )
    union all
    select 'invalid_supersedes_target'
    where exists (
      select 1
      from material m
      join public.contributions prior on prior.id = m.supersedes_contribution_id
      where prior.commitment_id <> m.commitment_id
         or prior.author_actor_id <> m.author_actor_id
    )
    union all
    select 'submission_event_count'
    where (
      select count(*)
      from public.domain_events e
      where e.aggregate_type = 'CONTRIBUTION'
        and e.aggregate_id = p_contribution_id
        and e.event_type = 'CONTRIBUTION_SUBMITTED'
    ) <> 1
  )
  select coalesce(array_agg(issue order by issue), '{}'::text[]) from checks;
$$;

create or replace function public.b2a_reconcile_artifact(p_artifact_id uuid)
returns text[]
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  with material as (
    select a.*, c.author_actor_id
    from public.artifacts a
    join public.contributions c on c.id = a.contribution_id
    where a.id = p_artifact_id
  ), checks as (
    select 'missing_material' as issue
    where not exists (select 1 from material)
    union all
    select 'artifact_author_mismatch'
    where exists (
      select 1 from material where created_by_actor_id <> author_actor_id
    )
    union all
    select 'invalid_digest'
    where exists (
      select 1 from material
      where digest_algorithm <> 'SHA256' or digest !~ '^[0-9a-f]{64}$'
    )
    union all
    select 'attachment_event_count'
    where (
      select count(*)
      from public.domain_events e
      where e.aggregate_type = 'ARTIFACT'
        and e.aggregate_id = p_artifact_id
        and e.event_type = 'ARTIFACT_ATTACHED'
    ) <> 1
  )
  select coalesce(array_agg(issue order by issue), '{}'::text[]) from checks;
$$;

alter table public.contributions enable row level security;
alter table public.artifacts enable row level security;

create policy contributions_read on public.contributions
for select to authenticated using (
  private.b1_current_profile_controls_actor(author_actor_id)
  or private.can_manage_project(project_id, auth.uid())
);

create policy artifacts_read on public.artifacts
for select to authenticated using (
  private.b1_current_profile_controls_actor(created_by_actor_id)
  or private.can_manage_project(project_id, auth.uid())
);

revoke all on public.contributions, public.artifacts from anon, authenticated;
grant select on public.contributions, public.artifacts to authenticated;

revoke all on function public.b2a_submit_contribution(uuid, uuid, text, text, uuid, uuid, text) from public;
revoke all on function public.b2a_attach_artifact(uuid, uuid, text, text, text, text, bigint, text, uuid, text) from public;
revoke all on function public.b2a_reconcile_contribution(uuid) from public;
revoke all on function public.b2a_reconcile_artifact(uuid) from public;

grant execute on function public.b2a_submit_contribution(uuid, uuid, text, text, uuid, uuid, text) to authenticated;
grant execute on function public.b2a_attach_artifact(uuid, uuid, text, text, text, text, bigint, text, uuid, text) to authenticated;
grant execute on function public.b2a_reconcile_contribution(uuid) to authenticated;
grant execute on function public.b2a_reconcile_artifact(uuid) to authenticated;

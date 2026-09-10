-- K002 / T12 — Human visibility expression + Contribution -> Artifact inheritance.
--
-- First-slice Human Direction:
-- - Contribution creator explicitly chooses PRIVATE / PARTIES / PROJECT.
-- - Artifact cannot silently widen the source Contribution audience.
-- - Artifact visibility inherits Contribution visibility.
-- - Any future audience widening belongs to a separate disclosure/publication act.
--
-- Out of scope: sensitivity semantics, retention/deletion semantics, publication,
-- new ACL/helper/ontology, and RLS changes.

create function public.b2a_submit_contribution(
  p_actor_id uuid,
  p_commitment_id uuid,
  p_description text,
  p_limitations text,
  p_supersedes_contribution_id uuid,
  p_command_id uuid,
  p_idempotency_key text,
  p_visibility text
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
  -- Preserve the legacy PROJECT idempotency payload exactly. Explicit
  -- PRIVATE/PARTIES adds visibility to the payload so different privacy choices
  -- cannot replay through the same idempotency key.
  v_payload jsonb := jsonb_build_object(
    'commitment_id', p_commitment_id,
    'description', p_description,
    'limitations', p_limitations,
    'supersedes_contribution_id', p_supersedes_contribution_id
  ) || case
    when p_visibility = 'PROJECT' then '{}'::jsonb
    else jsonb_build_object('visibility', p_visibility)
  end;
begin
  if p_visibility is null
     or p_visibility not in ('PRIVATE', 'PARTIES', 'PROJECT') then
    raise exception using
      errcode = '22023',
      message = 'CZ422:INVALID_CONTRIBUTION_VISIBILITY';
  end if;

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
    p_visibility, 'NORMAL'
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
    p_visibility,
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
    'visibility', p_visibility,
    'sensitivity', 'NORMAL'
  );
  perform private.b1_finish_command(p_actor_id, p_idempotency_key, v_result);
  return v_result;
end;
$$;

revoke all on function public.b2a_submit_contribution(
  uuid, uuid, text, text, uuid, uuid, text, text
) from public;

grant execute on function public.b2a_submit_contribution(
  uuid, uuid, text, text, uuid, uuid, text, text
) to authenticated;

-- Preserve the original B2-A seven-argument contract exactly. This wrapper is
-- intentionally PROJECT-only and delegates to the new explicit-visibility
-- command. Existing callers and contract tests therefore remain valid.
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
language sql
security definer
set search_path = public, private, pg_temp
as $$
  select public.b2a_submit_contribution(
    p_actor_id,
    p_commitment_id,
    p_description,
    p_limitations,
    p_supersedes_contribution_id,
    p_command_id,
    p_idempotency_key,
    'PROJECT'
  );
$$;

revoke all on function public.b2a_submit_contribution(
  uuid, uuid, text, text, uuid, uuid, text
) from public;

grant execute on function public.b2a_submit_contribution(
  uuid, uuid, text, text, uuid, uuid, text
) to authenticated;

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
    v_contribution.visibility, 'NORMAL', p_retention_class
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
    v_contribution.visibility,
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
    'visibility', v_contribution.visibility,
    'sensitivity', 'NORMAL'
  );
  perform private.b1_finish_command(p_actor_id, p_idempotency_key, v_result);
  return v_result;
end;
$$;

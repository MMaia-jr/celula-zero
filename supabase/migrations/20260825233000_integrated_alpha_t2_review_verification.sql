-- Integrated Alpha T2.3: bounded reviewer assignment + canonical Verification.
--
-- ADOPT/MAP:
--   - public.delegations / b1_grant_delegation()
--   - verification_requests / verifications / verification_evidence_items
--   - b2b2_request_verification()
--   - b2b2_issue_verification()
--
-- No universal reviewer role, reputation or decision authority is introduced.
-- Reviewer authority is exactly:
--   verification.issue / PROJECT / exact claim project / bounded validity.
--
-- Verification ≠ Decision ≠ Outcome ≠ Reputation ≠ Truth.

create or replace function public.t2c_assign_and_request_verification(
  p_actor_id uuid,
  p_claim_id uuid,
  p_reviewer_actor_id uuid,
  p_criteria text,
  p_expected_method text,
  p_valid_until timestamptz,
  p_delegation_command_id uuid,
  p_delegation_idempotency_key text,
  p_request_command_id uuid,
  p_request_idempotency_key text
)
returns jsonb
language plpgsql
security definer
set search_path = public, private, pg_temp
as $$
declare
  v_claim public.claims%rowtype;
  v_delegation_result jsonb;
  v_request_result jsonb;
begin
  select * into v_claim
  from public.claims
  where id = p_claim_id;

  if not found then
    raise exception using errcode = 'P0001', message = 'CZ404:CLAIM_NOT_FOUND';
  end if;

  if p_valid_until is null
     or p_valid_until <= now()
     or p_valid_until > now() + interval '30 days' then
    raise exception using
      errcode = '22023',
      message = 'CZ422:INVALID_REVIEW_AUTHORITY_WINDOW';
  end if;

  if trim(coalesce(p_criteria, '')) = ''
     or char_length(trim(p_criteria)) < 10
     or char_length(trim(p_criteria)) > 4000 then
    raise exception using errcode = '22023', message = 'CZ422:INVALID_VERIFICATION_CRITERIA';
  end if;

  if trim(coalesce(p_expected_method, '')) = ''
     or char_length(trim(p_expected_method)) < 3
     or char_length(trim(p_expected_method)) > 200 then
    raise exception using errcode = '22023', message = 'CZ422:INVALID_VERIFICATION_METHOD';
  end if;

  v_delegation_result := public.b1_grant_delegation(
    p_actor_id,
    p_reviewer_actor_id,
    'verification.issue',
    'PROJECT',
    v_claim.project_id,
    p_valid_until,
    p_delegation_command_id,
    p_delegation_idempotency_key
  );

  if coalesce((v_delegation_result ->> 'ok')::boolean, false) is not true
     or v_delegation_result ->> 'delegation_id' is null then
    raise exception using
      errcode = '42501',
      message = 'CZ403:REVIEWER_DELEGATION_DENIED';
  end if;

  v_request_result := public.b2b2_request_verification(
    p_actor_id,
    p_claim_id,
    p_reviewer_actor_id,
    trim(p_criteria),
    trim(p_expected_method),
    p_valid_until,
    p_request_command_id,
    p_request_idempotency_key
  );

  if coalesce((v_request_result ->> 'ok')::boolean, false) is not true
     or v_request_result ->> 'verification_request_id' is null then
    raise exception using
      errcode = 'P0001',
      message = 'CZ500:VERIFICATION_REQUEST_NOT_CREATED';
  end if;

  return v_request_result || jsonb_build_object(
    'delegation_id', v_delegation_result ->> 'delegation_id',
    'review_authority_capability', 'verification.issue',
    'review_authority_scope_type', 'PROJECT',
    'review_authority_scope_id', v_claim.project_id,
    'review_authority_valid_until', p_valid_until
  );
end;
$$;

revoke all on function public.t2c_assign_and_request_verification(
  uuid, uuid, uuid, text, text, timestamptz, uuid, text, uuid, text
) from public;

grant execute on function public.t2c_assign_and_request_verification(
  uuid, uuid, uuid, text, text, timestamptz, uuid, text, uuid, text
) to authenticated;

-- GI1-003 — Move2 deterministic reconciliation disposition.
--
-- Repairs one demonstrated property: an already ambiguous Move2 Job can be
-- dispositioned by its legitimate Human requester using explicit reconciliation
-- facts, without redispatch, direct state edits, or indefinite budget hold.
--
-- Late provider-output recovery/import is intentionally out of scope. A
-- dispatch-ambiguous Job with recoverable late output remains a separate gate.

create or replace function public.move2_dispose_reconciliation(
  p_actor_id uuid,
  p_job_id uuid,
  p_disposition text,
  p_observed_actual_cost_usd numeric,
  p_basis text,
  p_command_id uuid,
  p_idempotency_key text
)
returns jsonb
language plpgsql
security definer
set search_path = public, private, pg_temp
as $$
declare
  v_job public.ai_jobs%rowtype;
  v_run public.ai_runs%rowtype;
  v_reservation public.sponsored_budget_reservations%rowtype;
  v_pool public.sponsored_budget_pools%rowtype;
  v_company_cycle_id uuid;
  v_company_cycle_state text;
  v_company_cycle_count integer;
  v_original_failure_code text;
  v_actual_cost numeric(20,10);
  v_other_reserved numeric(20,10);
  v_terminal_job_state text;
  v_terminal_failure_code text;
  v_terminal_reservation_state text;
  v_fail_running_ai boolean := false;
  v_settle_cost boolean := false;
  v_replayed boolean;
  v_saved_result jsonb;
  v_command_payload jsonb;
  v_reconciliation jsonb;
  v_result jsonb;
begin
  if p_disposition is null or p_disposition not in (
    'NO_CHARGE_OBSERVED',
    'CHARGE_OBSERVED_NO_OUTPUT',
    'COMPLETED_OUTPUT_COST_OBSERVED'
  ) then
    raise exception using errcode = '22023', message = 'CZ422:INVALID_RECONCILIATION_DISPOSITION';
  end if;
  if char_length(trim(coalesce(p_basis, ''))) not between 3 and 2000 then
    raise exception using errcode = '22023', message = 'CZ422:INVALID_RECONCILIATION_BASIS';
  end if;

  select * into v_job from public.ai_jobs where id = p_job_id;
  if not found then
    raise exception using errcode = 'P0001', message = 'CZ404:AI_JOB_NOT_FOUND';
  end if;
  perform private.b1_authorize_actor(p_actor_id, 'cycle.manage', 'PROJECT', v_job.project_id);
  if v_job.requester_actor_id <> p_actor_id then
    raise exception using errcode = '42501', message = 'CZ403:AI_JOB_REQUESTER_REQUIRED';
  end if;

  v_command_payload := jsonb_build_object(
    'job_id', p_job_id,
    'disposition', p_disposition,
    'observed_actual_cost_usd', p_observed_actual_cost_usd,
    'basis', trim(p_basis)
  );

  -- Check idempotency before terminal-state validation so an exact replay is
  -- still safe after the first disposition has completed.
  select replayed, saved_result into v_replayed, v_saved_result
  from private.b1_begin_command(
    v_job.cell_id, p_actor_id, p_command_id, p_idempotency_key,
    'move2.reconciliation.disposition', v_command_payload
  );
  if v_replayed then return v_saved_result; end if;

  -- Re-lock authoritative state. Concurrent different commands serialize here;
  -- only the first can leave NEEDS_RECONCILIATION.
  select * into v_job from public.ai_jobs where id = p_job_id for update;
  if v_job.state <> 'NEEDS_RECONCILIATION' then
    raise exception using errcode = 'P0001', message = 'CZ409:AI_JOB_NOT_NEEDS_RECONCILIATION';
  end if;
  v_original_failure_code := v_job.failure_code;

  select * into v_reservation
  from public.sponsored_budget_reservations
  where id = v_job.reservation_id
  for update;
  if not found or v_reservation.state <> 'HELD_FOR_RECONCILIATION' then
    raise exception using errcode = 'P0001', message = 'CZ409:RECONCILIATION_RESERVATION_NOT_HELD';
  end if;

  select * into v_run from public.ai_runs where id = v_job.ai_run_id for update;
  if not found
     or v_run.cell_id <> v_job.cell_id
     or v_run.project_id <> v_job.project_id
     or v_run.requested_by_actor_id <> v_job.requester_actor_id
     or v_run.agent_actor_id <> v_job.agent_actor_id then
    raise exception using errcode = 'P0001', message = 'CZ409:RECONCILIATION_AI_RUN_CONTEXT_MISMATCH';
  end if;

  select count(*)::integer into v_company_cycle_count
  from public.company_core_cycles where ai_run_id = v_job.ai_run_id;
  if v_company_cycle_count > 1 then
    raise exception using errcode = 'P0001', message = 'CZ409:RECONCILIATION_COMPANY_CORE_CONTEXT_AMBIGUOUS';
  elsif v_company_cycle_count = 1 then
    select id, state into v_company_cycle_id, v_company_cycle_state
    from public.company_core_cycles
    where ai_run_id = v_job.ai_run_id
    for update;
  end if;

  -- Map explicit Human reconciliation facts to one terminal state transition.
  if p_disposition = 'NO_CHARGE_OBSERVED' then
    if v_original_failure_code is null
       or v_original_failure_code not in ('DISPATCH_OUTCOME_UNKNOWN', 'WORKER_LOST_AFTER_DISPATCH') then
      raise exception using errcode = 'P0001', message = 'CZ409:RECONCILIATION_REASON_DISPOSITION_MISMATCH';
    end if;
    if p_observed_actual_cost_usd is not null then
      raise exception using errcode = '22023', message = 'CZ422:RECONCILIATION_COST_MUST_BE_NULL';
    end if;
    if v_run.state <> 'RUNNING' then
      raise exception using errcode = 'P0001', message = 'CZ409:RECONCILIATION_AI_RUN_NOT_RUNNING';
    end if;
    if v_company_cycle_id is not null and v_company_cycle_state <> 'AI_RUNNING' then
      raise exception using errcode = 'P0001', message = 'CZ409:RECONCILIATION_COMPANY_CORE_NOT_AI_RUNNING';
    end if;
    v_actual_cost := 0;
    v_terminal_job_state := 'FAILED';
    v_terminal_failure_code := 'RECONCILED_NO_CHARGE';
    v_terminal_reservation_state := 'RELEASED';
    v_fail_running_ai := true;

  elsif p_disposition = 'CHARGE_OBSERVED_NO_OUTPUT' then
    if v_original_failure_code is null
       or v_original_failure_code not in ('DISPATCH_OUTCOME_UNKNOWN', 'WORKER_LOST_AFTER_DISPATCH') then
      raise exception using errcode = 'P0001', message = 'CZ409:RECONCILIATION_REASON_DISPOSITION_MISMATCH';
    end if;
    if p_observed_actual_cost_usd is null or p_observed_actual_cost_usd <= 0 then
      raise exception using errcode = '22023', message = 'CZ422:INVALID_RECONCILIATION_COST';
    end if;
    if v_run.state <> 'RUNNING' then
      raise exception using errcode = 'P0001', message = 'CZ409:RECONCILIATION_AI_RUN_NOT_RUNNING';
    end if;
    if v_company_cycle_id is not null and v_company_cycle_state <> 'AI_RUNNING' then
      raise exception using errcode = 'P0001', message = 'CZ409:RECONCILIATION_COMPANY_CORE_NOT_AI_RUNNING';
    end if;
    v_actual_cost := p_observed_actual_cost_usd;
    v_terminal_job_state := 'FAILED';
    v_terminal_failure_code := 'RECONCILED_CHARGED_NO_OUTPUT';
    v_terminal_reservation_state := 'SETTLED';
    v_fail_running_ai := true;
    v_settle_cost := true;

  else
    -- COMPLETED_OUTPUT_COST_OBSERVED
    if v_original_failure_code is null
       or v_original_failure_code not in ('ACTUAL_COST_UNKNOWN', 'ACTUAL_COST_EXCEEDS_RESERVATION') then
      raise exception using errcode = 'P0001', message = 'CZ409:RECONCILIATION_REASON_DISPOSITION_MISMATCH';
    end if;
    if p_observed_actual_cost_usd is null or p_observed_actual_cost_usd < 0 then
      raise exception using errcode = '22023', message = 'CZ422:INVALID_RECONCILIATION_COST';
    end if;
    if v_run.state <> 'COMPLETED' or v_run.cycle_record_id is null or v_job.result is null then
      raise exception using errcode = 'P0001', message = 'CZ409:RECONCILIATION_COMPLETED_OUTPUT_MISSING';
    end if;
    if v_company_cycle_id is not null and v_company_cycle_state <> 'AI_COMPLETED' then
      raise exception using errcode = 'P0001', message = 'CZ409:RECONCILIATION_COMPANY_CORE_NOT_AI_COMPLETED';
    end if;
    if v_original_failure_code = 'ACTUAL_COST_EXCEEDS_RESERVATION' then
      if v_run.cost_source <> 'PROVIDER_REPORTED'
         or v_run.cost_usd is null
         or v_run.cost_usd is distinct from p_observed_actual_cost_usd then
        raise exception using errcode = 'P0001', message = 'CZ409:RECONCILIATION_COST_MISMATCH';
      end if;
    elsif v_run.cost_source <> 'UNKNOWN' or v_run.cost_usd is not null then
      raise exception using errcode = 'P0001', message = 'CZ409:RECONCILIATION_ORIGINAL_COST_STATE_MISMATCH';
    end if;
    v_actual_cost := p_observed_actual_cost_usd;
    v_terminal_job_state := 'SUCCEEDED';
    v_terminal_failure_code := null;
    v_terminal_reservation_state := 'SETTLED';
    v_settle_cost := true;
  end if;

  -- A held reservation remains budget-authoritative until this transaction can
  -- atomically replace it with the reconciled actual cost. Existing admissions
  -- serialize on the same pool row.
  if v_settle_cost then
    select * into v_pool
    from public.sponsored_budget_pools
    where id = v_reservation.pool_id and cell_id = v_job.cell_id
    for update;
    if not found then
      raise exception using errcode = 'P0001', message = 'CZ404:SPONSORED_POOL_NOT_FOUND';
    end if;

    select coalesce(sum(amount_usd), 0) into v_other_reserved
    from public.sponsored_budget_reservations
    where pool_id = v_pool.id
      and id <> v_reservation.id
      and state in ('ACTIVE', 'HELD_FOR_RECONCILIATION');

    if v_pool.settled_usd + v_other_reserved + v_actual_cost > v_pool.hard_limit_usd then
      raise exception using errcode = 'P0001', message = 'CZ409:SPONSORED_BUDGET_EXHAUSTED';
    end if;

    update public.sponsored_budget_pools
    set settled_usd = settled_usd + v_actual_cost
    where id = v_pool.id;
    update public.sponsored_budget_reservations
    set state = 'SETTLED', settled_usd = v_actual_cost, settled_at = now()
    where id = v_reservation.id and state = 'HELD_FOR_RECONCILIATION';
  else
    update public.sponsored_budget_reservations
    set state = 'RELEASED'
    where id = v_reservation.id and state = 'HELD_FOR_RECONCILIATION';
  end if;
  if not found then
    raise exception using errcode = 'P0001', message = 'CZ409:RECONCILIATION_RESERVATION_CHANGED';
  end if;

  if v_fail_running_ai then
    update public.ai_runs
    set state = 'FAILED', failure_code = v_terminal_failure_code, failed_at = now()
    where id = v_run.id and state = 'RUNNING';
    if not found then
      raise exception using errcode = 'P0001', message = 'CZ409:RECONCILIATION_AI_RUN_CHANGED';
    end if;

    if v_company_cycle_id is not null then
      update public.company_core_cycles
      set state = 'AI_FAILED', updated_at = now()
      where id = v_company_cycle_id and state = 'AI_RUNNING';
      if not found then
        raise exception using errcode = 'P0001', message = 'CZ409:RECONCILIATION_COMPANY_CORE_CHANGED';
      end if;
    end if;
  end if;

  v_reconciliation := jsonb_build_object(
    'disposition', p_disposition,
    'original_failure_code', v_original_failure_code,
    'observed_actual_cost_usd', v_actual_cost,
    'basis', trim(p_basis),
    'reconciled_by_actor_id', p_actor_id,
    'redispatched', false,
    'human_direction', false,
    'evidence', false,
    'verification', false
  );

  update public.ai_jobs
  set state = v_terminal_job_state,
      failure_code = v_terminal_failure_code,
      result = case
        when v_terminal_job_state = 'SUCCEEDED'
          then coalesce(result, '{}'::jsonb) || jsonb_build_object('reconciliation', v_reconciliation)
        else jsonb_build_object('reconciliation', v_reconciliation)
      end,
      completed_at = case
        when v_terminal_job_state = 'SUCCEEDED' then coalesce(completed_at, now())
        else now()
      end
  where id = v_job.id and state = 'NEEDS_RECONCILIATION';
  if not found then
    raise exception using errcode = 'P0001', message = 'CZ409:RECONCILIATION_JOB_CHANGED';
  end if;

  -- Do not rewrite a COMPLETED AI Run's provider-time cost metadata. The later
  -- Human reconciliation fact is distinct and lives in accounting, Job result,
  -- and this append-only event.
  perform private.b1_record_event(
    v_job.cell_id,
    'AI_JOB_RECONCILIATION_DISPOSED',
    'AI_JOB', v_job.id,
    'AI_JOB', v_job.id,
    p_actor_id,
    'cycle.manage', 'PROJECT', v_job.project_id,
    p_command_id,
    null, null,
    'PROJECT',
    jsonb_build_object(
      'disposition', p_disposition,
      'original_failure_code', v_original_failure_code,
      'observed_actual_cost_usd', v_actual_cost,
      'basis', trim(p_basis),
      'reservation_id', v_reservation.id,
      'job_state', v_terminal_job_state,
      'reservation_state', v_terminal_reservation_state,
      'redispatched', false,
      'human_direction', false,
      'evidence', false,
      'verification', false
    )
  );

  v_result := jsonb_build_object(
    'ok', true,
    'job_id', v_job.id,
    'job_state', v_terminal_job_state,
    'reservation_id', v_reservation.id,
    'reservation_state', v_terminal_reservation_state,
    'disposition', p_disposition,
    'observed_actual_cost_usd', v_actual_cost,
    'redispatched', false
  );
  perform private.b1_finish_command(p_actor_id, p_idempotency_key, v_result);
  return v_result;
end;
$$;

revoke all on function public.move2_dispose_reconciliation(uuid,uuid,text,numeric,text,uuid,text) from public;
grant execute on function public.move2_dispose_reconciliation(uuid,uuid,text,numeric,text,uuid,text) to authenticated;

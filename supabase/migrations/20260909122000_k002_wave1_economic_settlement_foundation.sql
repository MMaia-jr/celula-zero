-- K002 Wave 1: provider-neutral economic record chain.
-- Agreement != Instruction != Attempt != Receipt != Reconciliation.
-- These commands record state only and make no external rail call.

create table public.economic_instructions(
 id uuid primary key default gen_random_uuid(),
 cell_id uuid not null references public.cells(id) on delete restrict,
 project_id uuid references public.projects(id) on delete restrict,
 agreement_id uuid references public.commitments(id) on delete restrict,
 claim_id uuid references public.claims(id) on delete restrict,
 authorizing_domain_decision_id uuid references public.domain_decisions(id) on delete restrict,
 authorized_by_actor_id uuid not null references public.actors(id) on delete restrict,
 beneficiary_actor_id uuid not null references public.actors(id) on delete restrict,
 amount numeric(30,10) not null check(amount>0),
 asset_namespace text not null check(char_length(trim(asset_namespace)) between 2 and 40),
 asset_reference text not null check(char_length(trim(asset_reference)) between 1 and 120),
 purpose text not null check(char_length(trim(purpose)) between 10 and 2000),
 status text not null default 'AUTHORIZED' check(status='AUTHORIZED'),
 created_at timestamptz not null default now(),
 check ((claim_id is null and authorizing_domain_decision_id is null) or
        (claim_id is not null and authorizing_domain_decision_id is not null))
);

create table public.settlement_attempts(
 id uuid primary key default gen_random_uuid(),
 cell_id uuid not null references public.cells(id) on delete restrict,
 economic_instruction_id uuid not null references public.economic_instructions(id) on delete restrict,
 recorded_by_actor_id uuid not null references public.actors(id) on delete restrict,
 provider_namespace text not null check(char_length(trim(provider_namespace)) between 2 and 80),
 provider_attempt_reference text not null check(char_length(trim(provider_attempt_reference)) between 2 and 200),
 state text not null check(state in ('PREPARED','SUBMITTED','FAILED','UNKNOWN')),
 attempted_at timestamptz not null,
 failure_code text,
 limitations text not null check(char_length(trim(limitations)) between 2 and 2000),
 created_at timestamptz not null default now(),
 unique(provider_namespace,provider_attempt_reference),
 check((state='FAILED' and failure_code is not null) or state<>'FAILED')
);

create table public.settlement_receipts(
 id uuid primary key default gen_random_uuid(),
 cell_id uuid not null references public.cells(id) on delete restrict,
 settlement_attempt_id uuid not null references public.settlement_attempts(id) on delete restrict,
 recorded_by_actor_id uuid not null references public.actors(id) on delete restrict,
 provider_receipt_reference text not null check(char_length(trim(provider_receipt_reference)) between 2 and 240),
 classification text not null check(classification in ('CONFIRMED','FAILED','UNKNOWN')),
 amount numeric(30,10),
 asset_namespace text,
 asset_reference text,
 occurred_at timestamptz,
 raw_digest text check(raw_digest is null or raw_digest ~ '^[0-9a-f]{64}$'),
 limitations text not null check(char_length(trim(limitations)) between 2 and 2000),
 created_at timestamptz not null default now(),
 unique(settlement_attempt_id,provider_receipt_reference),
 check(amount is null or amount>0)
);

create table public.settlement_reconciliations(
 id uuid primary key default gen_random_uuid(),
 cell_id uuid not null references public.cells(id) on delete restrict,
 economic_instruction_id uuid not null references public.economic_instructions(id) on delete restrict,
 settlement_receipt_id uuid references public.settlement_receipts(id) on delete restrict,
 reconciled_by_actor_id uuid not null references public.actors(id) on delete restrict,
 disposition text not null check(disposition in ('MATCHED','MISMATCH','UNRESOLVED','NO_SETTLEMENT')),
 reason text not null check(char_length(trim(reason)) between 10 and 2000),
 reconciled_at timestamptz not null default now(),
 created_at timestamptz not null default now(),
 check((disposition='NO_SETTLEMENT' and settlement_receipt_id is null) or
       (disposition<>'NO_SETTLEMENT' and settlement_receipt_id is not null))
);

create index economic_instructions_cell_created on public.economic_instructions(cell_id,created_at desc);
create index settlement_attempts_instruction on public.settlement_attempts(economic_instruction_id,created_at);
create index settlement_receipts_attempt on public.settlement_receipts(settlement_attempt_id,created_at);
create index settlement_reconciliations_instruction on public.settlement_reconciliations(economic_instruction_id,created_at);
create trigger economic_instructions_append_only before update or delete on public.economic_instructions
 for each row execute function private.prevent_append_only_mutation();
create trigger settlement_attempts_append_only before update or delete on public.settlement_attempts
 for each row execute function private.prevent_append_only_mutation();
create trigger settlement_receipts_append_only before update or delete on public.settlement_receipts
 for each row execute function private.prevent_append_only_mutation();
create trigger settlement_reconciliations_append_only before update or delete on public.settlement_reconciliations
 for each row execute function private.prevent_append_only_mutation();

insert into public.capability_definitions(code,description) values
 ('economic.instruct','Authorize a provider-neutral economic instruction; never an external payment call.'),
 ('settlement.record','Record provider-neutral settlement attempts and receipts without calling a rail.'),
 ('settlement.reconcile','Reconcile an instruction against an authorized visible receipt.')
on conflict(code) do nothing;
insert into public.role_capabilities(role_id,capability_code) values
 ('00000000-0000-4000-8000-00000000c201','economic.instruct'),
 ('00000000-0000-4000-8000-00000000c201','settlement.record'),
 ('00000000-0000-4000-8000-00000000c201','settlement.reconcile'),
 ('00000000-0000-4000-8000-00000000c202','economic.instruct'),
 ('00000000-0000-4000-8000-00000000c202','settlement.reconcile')
on conflict do nothing;

create or replace function private.k002_require_person_authorizer(p_actor_id uuid)
returns void language plpgsql stable security definer set search_path=public,private,pg_temp as $$
begin
 if not exists(select 1 from public.actors where id=p_actor_id and kind='PERSON') then
  raise exception using errcode='42501',message='CZ403:HUMAN_ECONOMIC_AUTHORIZER_REQUIRED'; end if;
end $$;

create or replace function public.k002_create_economic_instruction(
 p_actor_id uuid,p_cell_id uuid,p_project_id uuid,p_agreement_id uuid,p_claim_id uuid,
 p_domain_decision_id uuid,p_beneficiary_actor_id uuid,p_amount numeric,p_asset_namespace text,
 p_asset_reference text,p_purpose text,p_command_id uuid,p_idempotency_key text
) returns jsonb language plpgsql security definer set search_path=public,private,pg_temp as $$
declare v_replayed boolean;v_result jsonb;v_id uuid;v_payload jsonb;v_d public.domain_decisions%rowtype;
begin
 perform private.b1_authorize_actor(p_actor_id,'economic.instruct',case when p_project_id is null then 'CELL' else 'PROJECT' end,
  coalesce(p_project_id,p_cell_id));
 perform private.k002_require_person_authorizer(p_actor_id);
 if p_project_id is not null and not exists(select 1 from public.projects where id=p_project_id and cell_id=p_cell_id) then
  raise exception using errcode='P0001',message='CZ409:ECONOMIC_PROJECT_CONTEXT_MISMATCH';end if;
 if p_agreement_id is not null and not exists(select 1 from public.commitments where id=p_agreement_id and cell_id=p_cell_id
  and (p_project_id is null or project_id=p_project_id)) then
  raise exception using errcode='P0001',message='CZ409:ECONOMIC_AGREEMENT_CONTEXT_MISMATCH';end if;
 if (p_claim_id is null)<>(p_domain_decision_id is null) then
  raise exception using errcode='22023',message='CZ422:CLAIM_DECISION_PAIR_REQUIRED';end if;
 if p_claim_id is not null then
  select * into v_d from public.domain_decisions where id=p_domain_decision_id and claim_id=p_claim_id
   and cell_id=p_cell_id and (p_project_id is null or project_id=p_project_id);
  if not found then raise exception using errcode='P0001',message='CZ409:ECONOMIC_DECISION_CONTEXT_MISMATCH';end if;
  if v_d.disposition<>'ACCEPT_FOR_CONTEXT' then
   raise exception using errcode='42501',message='CZ403:CLAIM_NOT_ACCEPTED_FOR_CONTEXT';end if;
  if not exists(select 1 from public.actors where id=v_d.deciding_actor_id and kind='PERSON') then
   raise exception using errcode='42501',message='CZ403:HUMAN_DOMAIN_DECISION_REQUIRED';end if;
  if exists(select 1 from public.domain_decisions newer where newer.claim_id=p_claim_id
    and (newer.created_at,newer.id)>(v_d.created_at,v_d.id)
    and newer.disposition in ('REJECT_FOR_CONTEXT','DEFER')) then
   raise exception using errcode='42501',message='CZ403:CLAIM_DECISION_SUPERSEDED_BY_BLOCK';end if;
 end if;
 v_payload:=jsonb_build_object('cell_id',p_cell_id,'project_id',p_project_id,'agreement_id',p_agreement_id,
  'claim_id',p_claim_id,'domain_decision_id',p_domain_decision_id,'beneficiary_actor_id',p_beneficiary_actor_id,
  'amount',p_amount,'asset_namespace',trim(p_asset_namespace),'asset_reference',trim(p_asset_reference),'purpose',trim(p_purpose));
 select replayed,saved_result into v_replayed,v_result from private.b1_begin_command(
  p_cell_id,p_actor_id,p_command_id,p_idempotency_key,'economic.instruction.create',v_payload);
 if v_replayed then return v_result;end if;
 insert into public.economic_instructions(cell_id,project_id,agreement_id,claim_id,authorizing_domain_decision_id,
  authorized_by_actor_id,beneficiary_actor_id,amount,asset_namespace,asset_reference,purpose)
 values(p_cell_id,p_project_id,p_agreement_id,p_claim_id,p_domain_decision_id,p_actor_id,p_beneficiary_actor_id,
  p_amount,trim(p_asset_namespace),trim(p_asset_reference),trim(p_purpose)) returning id into v_id;
 perform private.b1_record_decision(p_cell_id,'ECONOMIC_INSTRUCTION_AUTHORIZE','ALLOW','ECONOMIC_INSTRUCTION',v_id,
  p_actor_id,'economic.instruct',case when p_project_id is null then 'CELL' else 'PROJECT' end,coalesce(p_project_id,p_cell_id),
  'human-authorized provider-neutral instruction; no settlement performed',p_command_id,null,null,
  jsonb_build_object('claim_id',p_claim_id,'domain_decision_id',p_domain_decision_id,'external_call',false));
 perform private.b1_record_event(p_cell_id,'ECONOMIC_INSTRUCTION_AUTHORIZED','ECONOMIC_INSTRUCTION',v_id,'ECONOMIC_INSTRUCTION',v_id,
  p_actor_id,'economic.instruct',case when p_project_id is null then 'CELL' else 'PROJECT' end,coalesce(p_project_id,p_cell_id),
  p_command_id,null,1,'PROJECT',jsonb_build_object('external_call',false,'settled',false));
 v_result:=jsonb_build_object('ok',true,'economic_instruction_id',v_id,'status','AUTHORIZED','external_call',false,'settled',false);
 perform private.b1_finish_command(p_actor_id,p_idempotency_key,v_result);return v_result;
end $$;

create or replace function public.k002_record_settlement_attempt(
 p_actor_id uuid,p_instruction_id uuid,p_provider_namespace text,p_provider_attempt_reference text,
 p_state text,p_attempted_at timestamptz,p_failure_code text,p_limitations text,p_command_id uuid,p_idempotency_key text
) returns jsonb language plpgsql security definer set search_path=public,private,pg_temp as $$
declare v_i public.economic_instructions%rowtype;v_replayed boolean;v_result jsonb;v_id uuid;v_payload jsonb;
begin
 select * into v_i from public.economic_instructions where id=p_instruction_id;
 if not found then raise exception using errcode='P0001',message='CZ404:ECONOMIC_INSTRUCTION_NOT_FOUND';end if;
 perform private.b1_authorize_actor(p_actor_id,'settlement.record',case when v_i.project_id is null then 'CELL' else 'PROJECT' end,coalesce(v_i.project_id,v_i.cell_id));
 perform private.k002_require_person_authorizer(p_actor_id);
 v_payload:=jsonb_build_object('instruction_id',p_instruction_id,'provider_namespace',trim(p_provider_namespace),
  'provider_attempt_reference',trim(p_provider_attempt_reference),'state',p_state,'attempted_at',p_attempted_at,
  'failure_code',p_failure_code,'limitations',trim(p_limitations));
 perform private.k002_reject_secret_fields(v_payload);
 select replayed,saved_result into v_replayed,v_result from private.b1_begin_command(v_i.cell_id,p_actor_id,p_command_id,
  p_idempotency_key,'settlement.attempt.record',v_payload);if v_replayed then return v_result;end if;
 insert into public.settlement_attempts(cell_id,economic_instruction_id,recorded_by_actor_id,provider_namespace,
  provider_attempt_reference,state,attempted_at,failure_code,limitations)
 values(v_i.cell_id,v_i.id,p_actor_id,trim(p_provider_namespace),trim(p_provider_attempt_reference),p_state,p_attempted_at,
  nullif(trim(p_failure_code),''),trim(p_limitations)) returning id into v_id;
 perform private.b1_record_event(v_i.cell_id,'SETTLEMENT_ATTEMPT_RECORDED','ECONOMIC_INSTRUCTION',v_i.id,'SETTLEMENT_ATTEMPT',v_id,
  p_actor_id,'settlement.record',case when v_i.project_id is null then 'CELL' else 'PROJECT' end,coalesce(v_i.project_id,v_i.cell_id),
  p_command_id,null,null,'PROJECT',jsonb_build_object('state',p_state,'external_call_by_command',false));
 v_result:=jsonb_build_object('ok',true,'settlement_attempt_id',v_id,'state',p_state,'external_call',false);
 perform private.b1_finish_command(p_actor_id,p_idempotency_key,v_result);return v_result;
end $$;

create or replace function public.k002_record_settlement_receipt(
 p_actor_id uuid,p_attempt_id uuid,p_provider_receipt_reference text,p_classification text,p_amount numeric,
 p_asset_namespace text,p_asset_reference text,p_occurred_at timestamptz,p_raw_digest text,p_limitations text,
 p_command_id uuid,p_idempotency_key text
) returns jsonb language plpgsql security definer set search_path=public,private,pg_temp as $$
declare v_a public.settlement_attempts%rowtype;v_i public.economic_instructions%rowtype;v_replayed boolean;v_result jsonb;v_id uuid;v_payload jsonb;
begin
 select * into v_a from public.settlement_attempts where id=p_attempt_id;
 if not found then raise exception using errcode='P0001',message='CZ404:SETTLEMENT_ATTEMPT_NOT_FOUND';end if;
 select * into v_i from public.economic_instructions where id=v_a.economic_instruction_id;
 perform private.b1_authorize_actor(p_actor_id,'settlement.record',case when v_i.project_id is null then 'CELL' else 'PROJECT' end,coalesce(v_i.project_id,v_i.cell_id));
 perform private.k002_require_person_authorizer(p_actor_id);
 v_payload:=jsonb_build_object('attempt_id',p_attempt_id,'provider_receipt_reference',trim(p_provider_receipt_reference),
  'classification',p_classification,'amount',p_amount,'asset_namespace',p_asset_namespace,'asset_reference',p_asset_reference,
  'occurred_at',p_occurred_at,'raw_digest',p_raw_digest,'limitations',trim(p_limitations));
 perform private.k002_reject_secret_fields(v_payload);
 select replayed,saved_result into v_replayed,v_result from private.b1_begin_command(v_i.cell_id,p_actor_id,p_command_id,
  p_idempotency_key,'settlement.receipt.record',v_payload);if v_replayed then return v_result;end if;
 insert into public.settlement_receipts(cell_id,settlement_attempt_id,recorded_by_actor_id,provider_receipt_reference,
  classification,amount,asset_namespace,asset_reference,occurred_at,raw_digest,limitations)
 values(v_i.cell_id,v_a.id,p_actor_id,trim(p_provider_receipt_reference),p_classification,p_amount,nullif(trim(p_asset_namespace),''),
  nullif(trim(p_asset_reference),''),p_occurred_at,p_raw_digest,trim(p_limitations)) returning id into v_id;
 perform private.b1_record_event(v_i.cell_id,'SETTLEMENT_RECEIPT_RECORDED','ECONOMIC_INSTRUCTION',v_i.id,'SETTLEMENT_RECEIPT',v_id,
  p_actor_id,'settlement.record',case when v_i.project_id is null then 'CELL' else 'PROJECT' end,coalesce(v_i.project_id,v_i.cell_id),
  p_command_id,null,null,'PROJECT',jsonb_build_object('classification',p_classification,'receipt_is_reconciliation',false));
 v_result:=jsonb_build_object('ok',true,'settlement_receipt_id',v_id,'classification',p_classification,'reconciled',false);
 perform private.b1_finish_command(p_actor_id,p_idempotency_key,v_result);return v_result;
end $$;

create or replace function public.k002_reconcile_settlement(
 p_actor_id uuid,p_instruction_id uuid,p_receipt_id uuid,p_disposition text,p_reason text,p_command_id uuid,p_idempotency_key text
) returns jsonb language plpgsql security definer set search_path=public,private,pg_temp as $$
declare v_i public.economic_instructions%rowtype;v_replayed boolean;v_result jsonb;v_id uuid;v_payload jsonb;
begin
 select * into v_i from public.economic_instructions where id=p_instruction_id;
 if not found then raise exception using errcode='P0001',message='CZ404:ECONOMIC_INSTRUCTION_NOT_FOUND';end if;
 perform private.b1_authorize_actor(p_actor_id,'settlement.reconcile',case when v_i.project_id is null then 'CELL' else 'PROJECT' end,coalesce(v_i.project_id,v_i.cell_id));
 perform private.k002_require_person_authorizer(p_actor_id);
 if p_receipt_id is not null and not exists(select 1 from public.settlement_receipts r join public.settlement_attempts a on a.id=r.settlement_attempt_id
   where r.id=p_receipt_id and a.economic_instruction_id=p_instruction_id) then
  raise exception using errcode='P0001',message='CZ409:RECEIPT_INSTRUCTION_CONTEXT_MISMATCH';end if;
 v_payload:=jsonb_build_object('instruction_id',p_instruction_id,'receipt_id',p_receipt_id,'disposition',p_disposition,'reason',trim(p_reason));
 select replayed,saved_result into v_replayed,v_result from private.b1_begin_command(v_i.cell_id,p_actor_id,p_command_id,
  p_idempotency_key,'settlement.reconcile',v_payload);if v_replayed then return v_result;end if;
 insert into public.settlement_reconciliations(cell_id,economic_instruction_id,settlement_receipt_id,reconciled_by_actor_id,disposition,reason)
 values(v_i.cell_id,v_i.id,p_receipt_id,p_actor_id,p_disposition,trim(p_reason)) returning id into v_id;
 perform private.b1_record_decision(v_i.cell_id,'SETTLEMENT_RECONCILE','ALLOW','SETTLEMENT_RECONCILIATION',v_id,p_actor_id,
  'settlement.reconcile',case when v_i.project_id is null then 'CELL' else 'PROJECT' end,coalesce(v_i.project_id,v_i.cell_id),
  'human reconciliation record distinct from receipt',p_command_id);
 perform private.b1_record_event(v_i.cell_id,'SETTLEMENT_RECONCILED','ECONOMIC_INSTRUCTION',v_i.id,'SETTLEMENT_RECONCILIATION',v_id,
  p_actor_id,'settlement.reconcile',case when v_i.project_id is null then 'CELL' else 'PROJECT' end,coalesce(v_i.project_id,v_i.cell_id),
  p_command_id,null,null,'PROJECT',jsonb_build_object('disposition',p_disposition));
 v_result:=jsonb_build_object('ok',true,'reconciliation_id',v_id,'disposition',p_disposition);
 perform private.b1_finish_command(p_actor_id,p_idempotency_key,v_result);return v_result;
end $$;

alter table public.economic_instructions enable row level security;
alter table public.settlement_attempts enable row level security;
alter table public.settlement_receipts enable row level security;
alter table public.settlement_reconciliations enable row level security;
create policy economic_instructions_read on public.economic_instructions for select to authenticated using(
 private.b1_current_profile_controls_actor(authorized_by_actor_id) or private.b1_current_profile_controls_actor(beneficiary_actor_id)
 or private.b1_current_profile_has_cell_access(cell_id));
create policy settlement_attempts_read on public.settlement_attempts for select to authenticated using(
 exists(select 1 from public.economic_instructions i where i.id=economic_instruction_id));
create policy settlement_receipts_read on public.settlement_receipts for select to authenticated using(
 exists(select 1 from public.settlement_attempts a where a.id=settlement_attempt_id));
create policy settlement_reconciliations_read on public.settlement_reconciliations for select to authenticated using(
 exists(select 1 from public.economic_instructions i where i.id=economic_instruction_id));
revoke all on public.economic_instructions,public.settlement_attempts,public.settlement_receipts,public.settlement_reconciliations from anon,authenticated;
grant select on public.economic_instructions,public.settlement_attempts,public.settlement_receipts,public.settlement_reconciliations to authenticated;
revoke all on function private.k002_require_person_authorizer(uuid) from public;
revoke all on function public.k002_create_economic_instruction(uuid,uuid,uuid,uuid,uuid,uuid,uuid,numeric,text,text,text,uuid,text) from public;
revoke all on function public.k002_record_settlement_attempt(uuid,uuid,text,text,text,timestamptz,text,text,uuid,text) from public;
revoke all on function public.k002_record_settlement_receipt(uuid,uuid,text,text,numeric,text,text,timestamptz,text,text,uuid,text) from public;
revoke all on function public.k002_reconcile_settlement(uuid,uuid,uuid,text,text,uuid,text) from public;
grant execute on function public.k002_create_economic_instruction(uuid,uuid,uuid,uuid,uuid,uuid,uuid,numeric,text,text,text,uuid,text) to authenticated;
grant execute on function public.k002_record_settlement_attempt(uuid,uuid,text,text,text,timestamptz,text,text,uuid,text) to authenticated;
grant execute on function public.k002_record_settlement_receipt(uuid,uuid,text,text,numeric,text,text,timestamptz,text,text,uuid,text) to authenticated;
grant execute on function public.k002_reconcile_settlement(uuid,uuid,uuid,text,text,uuid,text) to authenticated;

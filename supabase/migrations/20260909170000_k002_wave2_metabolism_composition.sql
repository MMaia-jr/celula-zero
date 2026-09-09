-- K002 Wave 2: a thin composition seam over canonical records.
-- This table is linkage, not an ontology or lifecycle state machine. No payload is copied.

create table public.k002_metabolism_episodes (
  id uuid primary key default gen_random_uuid(),
  cell_id uuid not null references public.cells(id) on delete restrict,
  project_id uuid not null references public.projects(id) on delete restrict,
  company_core_cycle_id uuid not null unique references public.company_core_cycles(id) on delete restrict,
  agreement_id uuid not null references public.commitments(id) on delete restrict,
  contribution_id uuid references public.contributions(id) on delete restrict,
  artifact_id uuid references public.artifacts(id) on delete restrict,
  claim_id uuid references public.claims(id) on delete restrict,
  composed_by_actor_id uuid not null references public.actors(id) on delete restrict,
  created_at timestamptz not null default now()
);

create index k002_metabolism_episodes_project_created
  on public.k002_metabolism_episodes(project_id, created_at, id);

create trigger k002_metabolism_episodes_append_only
before update or delete on public.k002_metabolism_episodes
for each row execute function private.prevent_append_only_mutation();

create or replace function public.k002_compose_metabolism_episode(
  p_actor_id uuid,
  p_company_core_cycle_id uuid,
  p_agreement_id uuid,
  p_contribution_id uuid,
  p_artifact_id uuid,
  p_claim_id uuid,
  p_command_id uuid,
  p_idempotency_key text
) returns jsonb
language plpgsql
security definer
set search_path=public,private,pg_temp
as $$
declare
  v_cycle public.company_core_cycles%rowtype;
  v_replayed boolean;
  v_result jsonb;
  v_id uuid;
  v_payload jsonb;
begin
  select * into v_cycle from public.company_core_cycles where id=p_company_core_cycle_id;
  if not found then
    raise exception using errcode='P0001',message='CZ404:COMPANY_CORE_CYCLE_NOT_FOUND';
  end if;
  perform private.b1_authorize_actor(p_actor_id,'cycle.manage','PROJECT',v_cycle.project_id);

  if not exists(select 1 from public.projects p where p.id=v_cycle.project_id and p.cell_id=v_cycle.cell_id) then
    raise exception using errcode='P0001',message='CZ409:EPISODE_PROJECT_CONTEXT_MISMATCH';
  end if;
  if not exists(select 1 from public.commitments c where c.id=p_agreement_id
    and c.cell_id=v_cycle.cell_id and c.project_id=v_cycle.project_id) then
    raise exception using errcode='P0001',message='CZ409:EPISODE_AGREEMENT_CONTEXT_MISMATCH';
  end if;
  if p_contribution_id is not null and not exists(select 1 from public.contributions c
    where c.id=p_contribution_id and c.commitment_id=p_agreement_id
      and c.cell_id=v_cycle.cell_id and c.project_id=v_cycle.project_id) then
    raise exception using errcode='P0001',message='CZ409:EPISODE_CONTRIBUTION_CONTEXT_MISMATCH';
  end if;
  if p_artifact_id is not null and (p_contribution_id is null or not exists(select 1 from public.artifacts a
    where a.id=p_artifact_id and a.contribution_id=p_contribution_id
      and a.cell_id=v_cycle.cell_id and a.project_id=v_cycle.project_id)) then
    raise exception using errcode='P0001',message='CZ409:EPISODE_ARTIFACT_CONTEXT_MISMATCH';
  end if;
  if p_claim_id is not null and not exists(select 1 from public.claims c
    where c.id=p_claim_id and c.cell_id=v_cycle.cell_id and c.project_id=v_cycle.project_id
      and ((c.subject_type='CONTRIBUTION' and c.subject_id=p_contribution_id)
        or (c.subject_type='ARTIFACT' and c.subject_id=p_artifact_id))) then
    raise exception using errcode='P0001',message='CZ409:EPISODE_CLAIM_CONTEXT_MISMATCH';
  end if;

  v_payload:=jsonb_build_object('company_core_cycle_id',p_company_core_cycle_id,
    'agreement_id',p_agreement_id,'contribution_id',p_contribution_id,
    'artifact_id',p_artifact_id,'claim_id',p_claim_id);
  select replayed,saved_result into v_replayed,v_result from private.b1_begin_command(
    v_cycle.cell_id,p_actor_id,p_command_id,p_idempotency_key,'metabolism.episode.compose',v_payload);
  if v_replayed then return v_result; end if;

  insert into public.k002_metabolism_episodes(cell_id,project_id,company_core_cycle_id,
    agreement_id,contribution_id,artifact_id,claim_id,composed_by_actor_id)
  values(v_cycle.cell_id,v_cycle.project_id,p_company_core_cycle_id,p_agreement_id,
    p_contribution_id,p_artifact_id,p_claim_id,p_actor_id) returning id into v_id;
  v_result:=jsonb_build_object('ok',true,'episode_id',v_id,'external_call',false);
  perform private.b1_finish_command(p_actor_id,p_idempotency_key,v_result);
  return v_result;
end $$;

create or replace function public.k002_authorize_episode_economic_instruction(
  p_actor_id uuid,
  p_episode_id uuid,
  p_claim_id uuid,
  p_domain_decision_id uuid,
  p_beneficiary_actor_id uuid,
  p_amount numeric,
  p_asset_namespace text,
  p_asset_reference text,
  p_purpose text,
  p_command_id uuid,
  p_idempotency_key text
) returns jsonb
language plpgsql
security definer
set search_path=public,private,pg_temp
as $$
declare v_episode public.k002_metabolism_episodes%rowtype;
begin
  select * into v_episode from public.k002_metabolism_episodes where id=p_episode_id;
  if not found then raise exception using errcode='P0001',message='CZ404:METABOLISM_EPISODE_NOT_FOUND'; end if;
  if p_claim_id is not null and (v_episode.claim_id is null or p_claim_id<>v_episode.claim_id) then
    raise exception using errcode='P0001',message='CZ409:EPISODE_CLAIM_CONTEXT_MISMATCH';
  end if;
  -- Delegates authority and canonical Claim/Decision/Person checks to Wave 1.
  -- The episode's non-null prospective Agreement is always supplied.
  return public.k002_create_economic_instruction(p_actor_id,v_episode.cell_id,v_episode.project_id,
    v_episode.agreement_id,p_claim_id,p_domain_decision_id,p_beneficiary_actor_id,p_amount,
    p_asset_namespace,p_asset_reference,p_purpose,p_command_id,p_idempotency_key);
end $$;

create or replace function public.k002_get_metabolism_episode(p_episode_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path=public,private,pg_temp
as $$
declare v_e public.k002_metabolism_episodes%rowtype; v_result jsonb;
begin
  select * into v_e from public.k002_metabolism_episodes where id=p_episode_id;
  if not found then raise exception using errcode='P0001',message='CZ404:METABOLISM_EPISODE_NOT_FOUND'; end if;
  if not private.b1_current_profile_has_cell_access(v_e.cell_id)
     and not private.can_manage_project(v_e.project_id,auth.uid()) then
    raise exception using errcode='42501',message='CZ403:METABOLISM_EPISODE_READ_DENIED';
  end if;

  select jsonb_build_object(
    'episode_id',v_e.id,'cell_id',v_e.cell_id,'project_id',v_e.project_id,
    'external_rails_validated',false,
    'stages',jsonb_build_object(
      'company_core',jsonb_build_object('status','COMPLETED','object_id',v_e.company_core_cycle_id,
        'state',cc.state,'evaluation_verdict',cc.evaluation_verdict),
      'agreement',jsonb_build_object('status','COMPLETED','object_id',v_e.agreement_id),
      'contribution',jsonb_build_object('status',case when v_e.contribution_id is null then 'MISSING' else 'COMPLETED' end,'object_id',v_e.contribution_id),
      'artifact',jsonb_build_object('status',case when v_e.artifact_id is null then 'MISSING' else 'COMPLETED' end,'object_id',v_e.artifact_id),
      'claim',jsonb_build_object('status',case when v_e.claim_id is null then 'MISSING' else 'COMPLETED' end,'object_id',v_e.claim_id),
      'evidence',jsonb_build_object('status',case when ev.ids='[]'::jsonb then 'MISSING' else 'COMPLETED' end,'object_ids',ev.ids),
      'verification',jsonb_build_object('status',case when ve.ids='[]'::jsonb then 'MISSING' else 'COMPLETED' end,'object_ids',ve.ids),
      'domain_decision',jsonb_build_object('status',case when dd.ids='[]'::jsonb then 'MISSING' when dd.latest_disposition='DEFER' then 'UNRESOLVED' else 'COMPLETED' end,
        'object_ids',dd.ids,'latest_disposition',dd.latest_disposition),
      'economic_instruction',jsonb_build_object('status',case when ei.ids='[]'::jsonb then 'MISSING' else 'COMPLETED' end,'object_ids',ei.ids),
      'settlement_attempt',jsonb_build_object('status',case when sa.ids='[]'::jsonb then 'MISSING' when sa.has_unresolved then 'UNRESOLVED' else 'COMPLETED' end,'object_ids',sa.ids),
      'settlement_receipt',jsonb_build_object('status',case when sr.ids='[]'::jsonb then 'MISSING' when sr.has_unresolved then 'UNRESOLVED' else 'COMPLETED' end,'object_ids',sr.ids),
      'reconciliation',jsonb_build_object('status',case when rc.ids='[]'::jsonb then 'MISSING' when rc.latest_disposition in ('MISMATCH','UNRESOLVED','NO_SETTLEMENT') then 'UNRESOLVED' else 'COMPLETED' end,
        'object_ids',rc.ids,'latest_disposition',rc.latest_disposition)
    )) into v_result
  from public.company_core_cycles cc
  cross join lateral (select coalesce(jsonb_agg(x.id order by x.id),'[]'::jsonb) ids from (
    select distinct evi.id from public.evidence_items evi join public.evidence_links el on el.evidence_item_id=evi.id where el.claim_id=v_e.claim_id) x) ev
  cross join lateral (select coalesce(jsonb_agg(x.id order by x.id),'[]'::jsonb) ids from (
    select v.id from public.verifications v where v.claim_id=v_e.claim_id) x) ve
  cross join lateral (select coalesce(jsonb_agg(x.id order by x.created_at,x.id),'[]'::jsonb) ids,
    (array_agg(x.disposition order by x.created_at desc,x.id desc))[1] latest_disposition from public.domain_decisions x where x.claim_id=v_e.claim_id) dd
  cross join lateral (select coalesce(jsonb_agg(x.id order by x.created_at,x.id),'[]'::jsonb) ids from public.economic_instructions x
    where x.agreement_id=v_e.agreement_id and (x.claim_id is null or x.claim_id=v_e.claim_id)) ei
  cross join lateral (select coalesce(jsonb_agg(x.id order by x.created_at,x.id),'[]'::jsonb) ids,
    coalesce(bool_or(x.state in ('PREPARED','SUBMITTED','FAILED','UNKNOWN')),false) has_unresolved
    from public.settlement_attempts x join public.economic_instructions i on i.id=x.economic_instruction_id where i.agreement_id=v_e.agreement_id) sa
  cross join lateral (select coalesce(jsonb_agg(x.id order by x.created_at,x.id),'[]'::jsonb) ids,
    coalesce(bool_or(x.classification<>'CONFIRMED'),false) has_unresolved from public.settlement_receipts x
    join public.settlement_attempts a on a.id=x.settlement_attempt_id join public.economic_instructions i on i.id=a.economic_instruction_id
    where i.agreement_id=v_e.agreement_id) sr
  cross join lateral (select coalesce(jsonb_agg(x.id order by x.created_at,x.id),'[]'::jsonb) ids,
    (array_agg(x.disposition order by x.created_at desc,x.id desc))[1] latest_disposition from public.settlement_reconciliations x
    join public.economic_instructions i on i.id=x.economic_instruction_id where i.agreement_id=v_e.agreement_id) rc
  where cc.id=v_e.company_core_cycle_id;
  return v_result;
end $$;

alter table public.k002_metabolism_episodes enable row level security;
create policy k002_metabolism_episodes_read on public.k002_metabolism_episodes for select to authenticated using(
  private.b1_current_profile_has_cell_access(cell_id));
revoke all on public.k002_metabolism_episodes from anon,authenticated;
grant select on public.k002_metabolism_episodes to authenticated;
revoke all on function public.k002_compose_metabolism_episode(uuid,uuid,uuid,uuid,uuid,uuid,uuid,text) from public;
revoke all on function public.k002_authorize_episode_economic_instruction(uuid,uuid,uuid,uuid,uuid,numeric,text,text,text,uuid,text) from public;
revoke all on function public.k002_get_metabolism_episode(uuid) from public;
grant execute on function public.k002_compose_metabolism_episode(uuid,uuid,uuid,uuid,uuid,uuid,uuid,text) to authenticated;
grant execute on function public.k002_authorize_episode_economic_instruction(uuid,uuid,uuid,uuid,uuid,numeric,text,text,text,uuid,text) to authenticated;
grant execute on function public.k002_get_metabolism_episode(uuid) to authenticated;

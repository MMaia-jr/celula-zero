-- K002 / T12 + T24 / D028 — fail-closed integrated episode readback.
--
-- Property loss already execution-confirmed locally:
-- a same-Cell profile with no direct read to PRIVATE Contribution / Artifact /
-- Claim could read k002_metabolism_episodes and k002_get_metabolism_episode().
--
-- This migration composes existing canonical child read semantics. It does not
-- introduce a new ACL, membership model, visibility vocabulary, sensitivity
-- rule, retention/deletion rule or publication mechanism.

create or replace function private.k002_current_profile_can_read_episode_materials(
  p_episode_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = public, private, pg_temp
as $$
  select exists (
    select 1
    from public.k002_metabolism_episodes e
    where e.id = p_episode_id
      and (
        private.b1_current_profile_has_cell_access(e.cell_id)
        or private.can_manage_project(e.project_id, auth.uid())
      )
      and (
        e.contribution_id is null
        or exists (
          select 1
          from public.contributions c
          where c.id = e.contribution_id
            and (
              private.b1_current_profile_controls_actor(c.author_actor_id)
              or (
                c.visibility in ('PARTIES', 'PROJECT')
                and private.b2a_profile_is_commitment_party(
                  c.commitment_id,
                  c.project_id,
                  c.cell_id,
                  auth.uid()
                )
              )
              or (
                c.visibility = 'PROJECT'
                and private.can_manage_project(c.project_id, auth.uid())
              )
            )
        )
      )
      and (
        e.artifact_id is null
        or exists (
          select 1
          from public.artifacts a
          where a.id = e.artifact_id
            and (
              private.b1_current_profile_controls_actor(a.created_by_actor_id)
              or (
                a.visibility in ('PARTIES', 'PROJECT')
                and private.b2a_profile_is_contribution_commitment_party(
                  a.contribution_id,
                  a.project_id,
                  a.cell_id,
                  auth.uid()
                )
              )
              or (
                a.visibility = 'PROJECT'
                and private.can_manage_project(a.project_id, auth.uid())
              )
            )
        )
      )
      and (
        e.claim_id is null
        or exists (
          select 1
          from public.claims c
          where c.id = e.claim_id
            and (
              private.b1_current_profile_controls_actor(c.author_actor_id)
              or private.can_manage_project(c.project_id, auth.uid())
              or private.b2b2_current_profile_reviews_claim(c.id)
            )
        )
      )
  );
$$;

revoke all on function private.k002_current_profile_can_read_episode_materials(uuid)
  from public, anon, authenticated;

grant execute on function private.k002_current_profile_can_read_episode_materials(uuid)
  to authenticated;

drop policy if exists k002_metabolism_episodes_read
on public.k002_metabolism_episodes;

create policy k002_metabolism_episodes_read
on public.k002_metabolism_episodes
for select
to authenticated
using (
  private.k002_current_profile_can_read_episode_materials(id)
);

create or replace function public.k002_get_metabolism_episode(p_episode_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path=public,private,pg_temp
as $$
declare
  v_e public.k002_metabolism_episodes%rowtype;
  v_result jsonb;
begin
  select * into v_e
  from public.k002_metabolism_episodes
  where id=p_episode_id;

  if not found then
    raise exception using
      errcode='P0001',
      message='CZ404:METABOLISM_EPISODE_NOT_FOUND';
  end if;

  if not private.k002_current_profile_can_read_episode_materials(p_episode_id) then
    raise exception using
      errcode='42501',
      message='CZ403:METABOLISM_EPISODE_READ_DENIED';
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
    )
  ) into v_result
  from public.company_core_cycles cc
  cross join lateral (
    select coalesce(jsonb_agg(x.id order by x.id),'[]'::jsonb) ids
    from (
      select distinct evi.id
      from public.evidence_items evi
      join public.evidence_links el on el.evidence_item_id=evi.id
      where el.claim_id=v_e.claim_id
    ) x
  ) ev
  cross join lateral (
    select coalesce(jsonb_agg(x.id order by x.id),'[]'::jsonb) ids
    from (
      select v.id from public.verifications v where v.claim_id=v_e.claim_id
    ) x
  ) ve
  cross join lateral (
    select coalesce(jsonb_agg(x.id order by x.created_at,x.id),'[]'::jsonb) ids,
      (array_agg(x.disposition order by x.created_at desc,x.id desc))[1] latest_disposition
    from public.domain_decisions x
    where x.claim_id=v_e.claim_id
  ) dd
  cross join lateral (
    select coalesce(jsonb_agg(x.id order by x.created_at,x.id),'[]'::jsonb) ids
    from public.economic_instructions x
    where x.agreement_id=v_e.agreement_id
      and (x.claim_id is null or x.claim_id=v_e.claim_id)
  ) ei
  cross join lateral (
    select coalesce(jsonb_agg(x.id order by x.created_at,x.id),'[]'::jsonb) ids,
      coalesce(bool_or(x.state in ('PREPARED','SUBMITTED','FAILED','UNKNOWN')),false) has_unresolved
    from public.settlement_attempts x
    join public.economic_instructions i on i.id=x.economic_instruction_id
    where i.agreement_id=v_e.agreement_id
  ) sa
  cross join lateral (
    select coalesce(jsonb_agg(x.id order by x.created_at,x.id),'[]'::jsonb) ids,
      coalesce(bool_or(x.classification<>'CONFIRMED'),false) has_unresolved
    from public.settlement_receipts x
    join public.settlement_attempts a on a.id=x.settlement_attempt_id
    join public.economic_instructions i on i.id=a.economic_instruction_id
    where i.agreement_id=v_e.agreement_id
  ) sr
  cross join lateral (
    select coalesce(jsonb_agg(x.id order by x.created_at,x.id),'[]'::jsonb) ids,
      (array_agg(x.disposition order by x.created_at desc,x.id desc))[1] latest_disposition
    from public.settlement_reconciliations x
    join public.economic_instructions i on i.id=x.economic_instruction_id
    where i.agreement_id=v_e.agreement_id
  ) rc
  where cc.id=v_e.company_core_cycle_id;

  return v_result;
end
$$;

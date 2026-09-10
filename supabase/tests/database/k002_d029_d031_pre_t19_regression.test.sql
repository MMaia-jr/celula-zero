begin;

create extension if not exists pgtap with schema extensions;
select no_plan();

-- PRE-T19 combined observation only.
--
-- Question A / D029:
-- Can current canonical authority composition reach a PRIVATE Evidence item
-- that the Claim author cannot directly read, then reveal that Evidence
-- association through verification_evidence_items and/or integrated episode
-- readback?
--
-- Question B / T17:
-- Can a fresh participant-boundary Cell traverse the provider-neutral economic
-- record path through SettlementAttempt/Receipt/Reconciliation, or does current
-- authority composition stop at settlement.record?
--
-- No production source mutation. No remote rail call. No real funds.
-- All rows are rolled back.

insert into auth.users(
  id,aud,role,email,raw_app_meta_data,raw_user_meta_data,created_at,updated_at
) values
(
  '98500000-0000-4000-8000-000000000001',
  'authenticated','authenticated','pret19-founder@test','{}',
  '{"name":"PRE-T19 Founder"}',now(),now()
),
(
  '98500000-0000-4000-8000-000000000002',
  'authenticated','authenticated','pret19-participant@test','{}',
  '{"name":"PRE-T19 Participant"}',now(),now()
),
(
  '98500000-0000-4000-8000-000000000003',
  'authenticated','authenticated','pret19-reviewer@test','{}',
  '{"name":"PRE-T19 Reviewer"}',now(),now()
);

create temporary table obs_actor(
  label text primary key,
  profile_id uuid not null,
  actor_id uuid not null
);

insert into obs_actor(label,profile_id,actor_id)
select 'FOUNDER','98500000-0000-4000-8000-000000000001'::uuid,id
from public.actors
where operator_profile_id='98500000-0000-4000-8000-000000000001'
  and kind='PERSON'
order by created_at,id limit 1;

insert into obs_actor(label,profile_id,actor_id)
select 'PARTICIPANT','98500000-0000-4000-8000-000000000002'::uuid,id
from public.actors
where operator_profile_id='98500000-0000-4000-8000-000000000002'
  and kind='PERSON'
order by created_at,id limit 1;

insert into obs_actor(label,profile_id,actor_id)
select 'REVIEWER','98500000-0000-4000-8000-000000000003'::uuid,id
from public.actors
where operator_profile_id='98500000-0000-4000-8000-000000000003'
  and kind='PERSON'
order by created_at,id limit 1;

select is(
  (select count(*)::bigint from obs_actor),
  3::bigint,
  'three controlled synthetic PERSON actors resolved'
);

create temporary table obs_ids(
  key text primary key,
  value uuid,
  result jsonb,
  text_value text
);
grant select,insert,update on obs_ids to authenticated;
grant select on obs_actor to authenticated;

-- ---------------------------------------------------------------------------
-- CONTROL PATH: fresh Cell + actual product composition to PRIVATE Evidence.
-- ---------------------------------------------------------------------------

select set_config(
  'request.jwt.claim.sub',
  '98500000-0000-4000-8000-000000000001',
  true
);
set local role authenticated;

insert into obs_ids(key,result)
select 'project',to_jsonb(x)
from public.create_project_atomic(
  'PRE-T19 Combined Reachability',
  'pret19-combined-reachability',
  'Synthetic local Project for D029 and T17 pre-T19 falsifiers.',
  'Observe only current canonical privacy and economic reachability.',
  'No external benefit, remote write, deployment, funds or rail call.',
  'One bounded local technical observation.',
  'No outreach, paid models, chain or real settlement.',
  array['k002','t12','t17','pre-t19'],
  'VOLUNTARY',
  'OPEN',
  true
) x;

update obs_ids
set value=(result->>'project_id')::uuid
where key='project';

insert into obs_ids(key,value)
select 'cell',cell_id
from public.projects
where id=(select value from obs_ids where key='project');

insert into obs_ids(key,result)
select 'company_core_cycle',public.company_core_create_cycle(
  (select actor_id from obs_actor where label='FOUNDER'),
  (select value from obs_ids where key='project'),
  'PRE-T19 bounded reachability observation',
  'Observe privacy and economic authority composition without external execution.',
  'A deterministic local classification of remaining pre-T19 uncertainty.',
  'Synthetic PERSON actors and local records only.',
  'HIGH',
  'No external rails, funds, deployment or outreach.',
  'No external utility claim.',
  '98500000-0000-4000-8000-000000000101'::uuid,
  'pret19-company-core'
);

update obs_ids
set value=(result->>'cycle_id')::uuid
where key='company_core_cycle';

insert into obs_ids(key,result)
select 'opportunity',public.b1_create_opportunity(
  (select actor_id from obs_actor where label='FOUNDER'),
  (select value from obs_ids where key='project'),
  'PRE-T19 bounded private work',
  'A synthetic participant may produce one private local artifact for reachability tests.',
  'No external or economic execution occurs.',
  'One private artifact, Claim and contextual Evidence.',
  1,
  '98500000-0000-4000-8000-000000000102'::uuid,
  'pret19-create-opportunity'
);

update obs_ids
set value=(result->>'opportunity_id')::uuid
where key='opportunity';

insert into obs_ids(key,result)
select 'published_opportunity',public.b1_publish_opportunity(
  (select actor_id from obs_actor where label='FOUNDER'),
  (select value from obs_ids where key='opportunity'),
  1,
  '98500000-0000-4000-8000-000000000103'::uuid,
  'pret19-publish-opportunity'
);

reset role;

select set_config(
  'request.jwt.claim.sub',
  '98500000-0000-4000-8000-000000000002',
  true
);
set local role authenticated;

insert into obs_ids(key,result)
select 'proposal',public.b1_submit_public_proposal(
  (select actor_id from obs_actor where label='PARTICIPANT'),
  (select value from obs_ids where key='opportunity'),
  'I can produce the bounded private synthetic artifact.',
  'Only this exact local technical rehearsal.',
  'One private text artifact and contextual Evidence.',
  'No payment claim or economic right.',
  '98500000-0000-4000-8000-000000000104'::uuid,
  'pret19-public-proposal'
);

update obs_ids
set value=(result->>'proposal_id')::uuid
where key='proposal';

reset role;

select set_config(
  'request.jwt.claim.sub',
  '98500000-0000-4000-8000-000000000001',
  true
);
set local role authenticated;

insert into obs_ids(key,result)
select 'commitment',public.t2b_accept_proposal_for_claim_evidence(
  (select actor_id from obs_actor where label='FOUNDER'),
  (select value from obs_ids where key='proposal'),
  2,
  1,
  2,
  1,
  'Accept the exact bounded synthetic proposal for PRE-T19 observation.',
  '98500000-0000-4000-8000-000000000105'::uuid,
  'pret19-accept-for-claim-evidence'
);

update obs_ids
set value=(result->>'commitment_id')::uuid
where key='commitment';

reset role;

select set_config(
  'request.jwt.claim.sub',
  '98500000-0000-4000-8000-000000000002',
  true
);
set local role authenticated;

insert into obs_ids(key,result)
select 'contribution',public.b2a_submit_contribution(
  (select actor_id from obs_actor where label='PARTICIPANT'),
  (select value from obs_ids where key='commitment'),
  'Private synthetic Contribution for PRE-T19 reachability.',
  'Local technical observation only.',
  null,
  '98500000-0000-4000-8000-000000000106'::uuid,
  'pret19-submit-private-contribution',
  'PRIVATE'
);

update obs_ids
set value=(result->>'contribution_id')::uuid
where key='contribution';

insert into obs_ids(key,result)
select 'artifact',public.t2a_attach_text_artifact(
  (select actor_id from obs_actor where label='PARTICIPANT'),
  (select value from obs_ids where key='contribution'),
  'Private PRE-T19 synthetic artifact. No external utility is claimed.',
  '98500000-0000-4000-8000-000000000107'::uuid,
  'pret19-attach-private-text-artifact'
);

update obs_ids
set value=(result->>'artifact_id')::uuid
where key='artifact';

insert into obs_ids(key,result)
select 'claim',public.b2b1_record_claim(
  (select actor_id from obs_actor where label='PARTICIPANT'),
  'ARTIFACT',
  (select value from obs_ids where key='artifact'),
  'The private synthetic PRE-T19 Artifact exists in this bounded local observation.',
  'Existence in this local rehearsal only; no external truth or usefulness claim.',
  null,
  '98500000-0000-4000-8000-000000000108'::uuid,
  'pret19-record-private-claim'
);

update obs_ids
set value=(result->>'claim_id')::uuid
where key='claim';

insert into obs_ids(key,result)
select 'participant_evidence',public.b2b1_register_evidence(
  (select actor_id from obs_actor where label='PARTICIPANT'),
  (select value from obs_ids where key='claim'),
  (select value from obs_ids where key='artifact'),
  'SUPPORTS',
  'Participant-custodied private Evidence provides the normal positive control.',
  'Evidence is contextual and is not proof.',
  null,
  '98500000-0000-4000-8000-000000000109'::uuid,
  'pret19-participant-evidence'
);

update obs_ids
set value=(result->>'evidence_item_id')::uuid
where key='participant_evidence';

reset role;

select ok((select value from obs_ids where key='project') is not null,
  'fresh participant-boundary Project exists');
select ok((select value from obs_ids where key='commitment') is not null,
  'public Proposal was accepted into an exact Commitment');
select ok((select value from obs_ids where key='contribution') is not null,
  'Commitment-derived Contribution path executed');
select ok((select value from obs_ids where key='artifact') is not null,
  'Commitment-derived Artifact path executed');
select ok((select value from obs_ids where key='claim') is not null,
  'Commitment-derived Claim path executed');
select ok((select value from obs_ids where key='participant_evidence') is not null,
  'Commitment-derived Evidence path executed');

select is(
  (select visibility from public.contributions
   where id=(select value from obs_ids where key='contribution')),
  'PRIVATE',
  'Contribution is PRIVATE'
);
select is(
  (select visibility from public.artifacts
   where id=(select value from obs_ids where key='artifact')),
  'PRIVATE',
  'Artifact inherited PRIVATE visibility'
);
select is(
  (select visibility from public.claims
   where id=(select value from obs_ids where key='claim')),
  'PRIVATE',
  'Claim inherited PRIVATE visibility'
);
select is(
  (select visibility from public.evidence_items
   where id=(select value from obs_ids where key='participant_evidence')),
  'PRIVATE',
  'normal Evidence inherited PRIVATE visibility'
);

-- Compose the integrated episode before downstream observations.
select set_config(
  'request.jwt.claim.sub',
  '98500000-0000-4000-8000-000000000001',
  true
);
set local role authenticated;

insert into obs_ids(key,result)
select 'episode',public.k002_compose_metabolism_episode(
  (select actor_id from obs_actor where label='FOUNDER'),
  (select value from obs_ids where key='company_core_cycle'),
  (select value from obs_ids where key='commitment'),
  (select value from obs_ids where key='contribution'),
  (select value from obs_ids where key='artifact'),
  (select value from obs_ids where key='claim'),
  '98500000-0000-4000-8000-000000000110'::uuid,
  'pret19-compose-episode'
);

update obs_ids
set value=(result->>'episode_id')::uuid
where key='episode';

reset role;

select ok((select value from obs_ids where key='episode') is not null,
  'integrated episode exists for readback observation');

-- ---------------------------------------------------------------------------
-- NORMAL VERIFICATION CONTROL FOR T17.
-- ---------------------------------------------------------------------------

select set_config(
  'request.jwt.claim.sub',
  '98500000-0000-4000-8000-000000000001',
  true
);
set local role authenticated;

insert into obs_ids(key,result)
select 't17_request',public.t2c_assign_and_request_verification(
  (select actor_id from obs_actor where label='FOUNDER'),
  (select value from obs_ids where key='claim'),
  (select actor_id from obs_actor where label='REVIEWER'),
  'Check only whether the private synthetic Artifact supports the bounded Claim.',
  'MANUAL_REVIEW',
  now() + interval '1 day',
  '98500000-0000-4000-8000-000000000111'::uuid,
  'pret19-reviewer-delegation',
  '98500000-0000-4000-8000-000000000112'::uuid,
  'pret19-t17-verification-request'
);

update obs_ids
set value=(result->>'verification_request_id')::uuid
where key='t17_request';

reset role;

select set_config(
  'request.jwt.claim.sub',
  '98500000-0000-4000-8000-000000000003',
  true
);
set local role authenticated;

insert into obs_ids(key,result)
select 't17_verification',public.b2b2_issue_verification(
  (select actor_id from obs_actor where label='REVIEWER'),
  (select value from obs_ids where key='t17_request'),
  'MANUAL_REVIEW',
  'The participant-custodied Evidence is linked to the Claim in this local rehearsal.',
  'PASS',
  'Synthetic technical verification only; no external truth claim.',
  array[(select value from obs_ids where key='participant_evidence')],
  '98500000-0000-4000-8000-000000000113'::uuid,
  'pret19-t17-issue-verification'
);

update obs_ids
set value=(result->>'verification_id')::uuid
where key='t17_verification';

reset role;

select ok((select value from obs_ids where key='t17_verification') is not null,
  'bounded reviewer issued canonical Verification');

-- ---------------------------------------------------------------------------
-- D029 REACHABILITY PROBE.
--
-- Explicit current composition tested:
-- founder PROJECT_STEWARD delegates delegation.manage to the participant;
-- participant already holds evidence.register through the accepted Commitment;
-- participant then delegates that held evidence.register to the founder;
-- founder, who can manage the Project, attempts canonical cross-custody Evidence.
-- ---------------------------------------------------------------------------

create temporary table d029_probe(
  stage text primary key,
  ok boolean not null,
  result jsonb,
  observed_sqlstate text,
  observed_message text
);
grant select,insert,update on d029_probe to authenticated;

select set_config(
  'request.jwt.claim.sub',
  '98500000-0000-4000-8000-000000000001',
  true
);
set local role authenticated;

do $$
declare v jsonb;
begin
  begin
    v := public.b1_grant_delegation(
      (select actor_id from obs_actor where label='FOUNDER'),
      (select actor_id from obs_actor where label='PARTICIPANT'),
      'delegation.manage',
      'PROJECT',
      (select value from obs_ids where key='project'),
      now() + interval '1 day',
      '98500000-0000-4000-8000-000000000114'::uuid,
      'pret19-delegate-delegation-manage'
    );
    insert into d029_probe values(
      'FOUNDER_TO_PARTICIPANT_DELEGATION_MANAGE',true,v,null,null
    );
  exception when others then
    insert into d029_probe values(
      'FOUNDER_TO_PARTICIPANT_DELEGATION_MANAGE',false,null,sqlstate,sqlerrm
    );
  end;
end
$$;

reset role;

select set_config(
  'request.jwt.claim.sub',
  '98500000-0000-4000-8000-000000000002',
  true
);
set local role authenticated;

do $$
declare v jsonb;
begin
  if coalesce((
    select ok from d029_probe
    where stage='FOUNDER_TO_PARTICIPANT_DELEGATION_MANAGE'
  ),false) then
    begin
      v := public.b1_grant_delegation(
        (select actor_id from obs_actor where label='PARTICIPANT'),
        (select actor_id from obs_actor where label='FOUNDER'),
        'evidence.register',
        'PROJECT',
        (select value from obs_ids where key='project'),
        now() + interval '1 day',
        '98500000-0000-4000-8000-000000000115'::uuid,
        'pret19-delegate-evidence-register'
      );
      insert into d029_probe values(
        'PARTICIPANT_TO_FOUNDER_EVIDENCE_REGISTER',true,v,null,null
      );
    exception when others then
      insert into d029_probe values(
        'PARTICIPANT_TO_FOUNDER_EVIDENCE_REGISTER',false,null,sqlstate,sqlerrm
      );
    end;
  else
    insert into d029_probe values(
      'PARTICIPANT_TO_FOUNDER_EVIDENCE_REGISTER',false,null,'SKIP',
      'upstream delegation.manage was not reachable'
    );
  end if;
end
$$;

reset role;

select set_config(
  'request.jwt.claim.sub',
  '98500000-0000-4000-8000-000000000001',
  true
);
set local role authenticated;

do $$
declare v jsonb;
begin
  if coalesce((
    select ok from d029_probe
    where stage='PARTICIPANT_TO_FOUNDER_EVIDENCE_REGISTER'
  ),false) then
    begin
      v := public.b2b1_register_evidence(
        (select actor_id from obs_actor where label='FOUNDER'),
        (select value from obs_ids where key='claim'),
        (select value from obs_ids where key='artifact'),
        'CONTEXTUALIZES',
        'Founder-custodied private Evidence exercises D029 canonical write reachability.',
        'Local privacy reachability probe only.',
        null,
        '98500000-0000-4000-8000-000000000116'::uuid,
        'pret19-founder-cross-custody-evidence'
      );
      insert into d029_probe values(
        'FOUNDER_CROSS_CUSTODY_EVIDENCE',true,v,null,null
      );
      insert into obs_ids(key,value,result)
      values(
        'founder_evidence',
        (v->>'evidence_item_id')::uuid,
        v
      );
    exception when others then
      insert into d029_probe values(
        'FOUNDER_CROSS_CUSTODY_EVIDENCE',false,null,sqlstate,sqlerrm
      );
    end;
  else
    insert into d029_probe values(
      'FOUNDER_CROSS_CUSTODY_EVIDENCE',false,null,'SKIP',
      'upstream evidence.register delegation was not reachable'
    );
  end if;
end
$$;

-- If cross-custody Evidence exists, request a second review. The reviewer
-- already has bounded verification.issue authority from t2c above.
do $$
declare v jsonb;
begin
  if exists(select 1 from obs_ids where key='founder_evidence') then
    begin
      v := public.b2b2_request_verification(
        (select actor_id from obs_actor where label='FOUNDER'),
        (select value from obs_ids where key='claim'),
        (select actor_id from obs_actor where label='REVIEWER'),
        'Check the founder-custodied private Evidence relationship for D029.',
        'MANUAL_REVIEW',
        now() + interval '1 day',
        '98500000-0000-4000-8000-000000000117'::uuid,
        'pret19-d029-verification-request'
      );
      insert into d029_probe values(
        'D029_VERIFICATION_REQUEST',true,v,null,null
      );
      insert into obs_ids(key,value,result)
      values(
        'd029_request',
        (v->>'verification_request_id')::uuid,
        v
      );
    exception when others then
      insert into d029_probe values(
        'D029_VERIFICATION_REQUEST',false,null,sqlstate,sqlerrm
      );
    end;
  else
    insert into d029_probe values(
      'D029_VERIFICATION_REQUEST',false,null,'SKIP',
      'cross-custody Evidence was not reached'
    );
  end if;
end
$$;

reset role;

select set_config(
  'request.jwt.claim.sub',
  '98500000-0000-4000-8000-000000000003',
  true
);
set local role authenticated;

do $$
declare v jsonb;
begin
  if exists(select 1 from obs_ids where key='d029_request')
     and exists(select 1 from obs_ids where key='founder_evidence') then
    begin
      v := public.b2b2_issue_verification(
        (select actor_id from obs_actor where label='REVIEWER'),
        (select value from obs_ids where key='d029_request'),
        'MANUAL_REVIEW',
        'The cross-custody Evidence is linked to the Claim in this local D029 probe.',
        'PASS',
        'Synthetic privacy reachability observation only.',
        array[(select value from obs_ids where key='founder_evidence')],
        '98500000-0000-4000-8000-000000000118'::uuid,
        'pret19-d029-issue-verification'
      );
      insert into d029_probe values(
        'D029_VERIFICATION',true,v,null,null
      );
      insert into obs_ids(key,value,result)
      values(
        'd029_verification',
        (v->>'verification_id')::uuid,
        v
      );
    exception when others then
      insert into d029_probe values(
        'D029_VERIFICATION',false,null,sqlstate,sqlerrm
      );
    end;
  else
    insert into d029_probe values(
      'D029_VERIFICATION',false,null,'SKIP',
      'D029 verification request or Evidence was not reached'
    );
  end if;
end
$$;

reset role;

select is(
  (select count(*)::bigint from d029_probe),
  5::bigint,
  'D029 probe produced one classified record for every attempted stage'
);

create temporary table d029_read(
  evidence_direct bigint,
  evidence_link_direct bigint,
  verification_direct bigint,
  verification_evidence_direct bigint,
  getter_ok boolean,
  getter_result jsonb,
  getter_sqlstate text,
  getter_message text
);
grant select,insert,update on d029_read to authenticated;
insert into d029_read(getter_ok) values(false);

select set_config(
  'request.jwt.claim.sub',
  '98500000-0000-4000-8000-000000000002',
  true
);
set local role authenticated;

update d029_read set
  evidence_direct=case
    when exists(select 1 from obs_ids where key='founder_evidence')
    then (
      select count(*)::bigint
      from public.evidence_items
      where id=(select value from obs_ids where key='founder_evidence')
    )
    else null
  end,
  evidence_link_direct=case
    when exists(select 1 from obs_ids where key='founder_evidence')
    then (
      select count(*)::bigint
      from public.evidence_links
      where evidence_item_id=(select value from obs_ids where key='founder_evidence')
        and claim_id=(select value from obs_ids where key='claim')
    )
    else null
  end,
  verification_direct=case
    when exists(select 1 from obs_ids where key='d029_verification')
    then (
      select count(*)::bigint
      from public.verifications
      where id=(select value from obs_ids where key='d029_verification')
    )
    else null
  end,
  verification_evidence_direct=case
    when exists(select 1 from obs_ids where key='d029_verification')
      and exists(select 1 from obs_ids where key='founder_evidence')
    then (
      select count(*)::bigint
      from public.verification_evidence_items
      where verification_id=(select value from obs_ids where key='d029_verification')
        and evidence_item_id=(select value from obs_ids where key='founder_evidence')
    )
    else null
  end;

do $$
declare v jsonb;
begin
  begin
    v := public.k002_get_metabolism_episode(
      (select value from obs_ids where key='episode')
    );
    update d029_read
    set getter_ok=true,getter_result=v,getter_sqlstate=null,getter_message=null;
  exception when others then
    update d029_read
    set getter_ok=false,getter_result=null,
        getter_sqlstate=sqlstate,getter_message=sqlerrm;
  end;
end
$$;

reset role;


-- ---------------------------------------------------------------------------
-- D029 POST-FIX ASSERTIONS.
-- ---------------------------------------------------------------------------

select ok(
  (select ok from d029_probe where stage='FOUNDER_TO_PARTICIPANT_DELEGATION_MANAGE'),
  'D029 canonical delegation.manage composition remains reachable'
);

select ok(
  (select ok from d029_probe where stage='PARTICIPANT_TO_FOUNDER_EVIDENCE_REGISTER'),
  'D029 canonical evidence.register delegation remains reachable'
);

select ok(
  (select ok from d029_probe where stage='FOUNDER_CROSS_CUSTODY_EVIDENCE'),
  'D029 cross-custody PRIVATE Evidence remains canonical-write reachable'
);

select ok(
  (select ok from d029_probe where stage='D029_VERIFICATION'),
  'D029 Verification over cross-custody Evidence remains reachable'
);

select is(
  (select evidence_direct from d029_read),
  0::bigint,
  'Claim author still cannot directly read founder-custodied PRIVATE Evidence'
);

select is(
  (select evidence_link_direct from d029_read),
  0::bigint,
  'Claim author still cannot directly read PRIVATE evidence_link'
);

select is(
  (select verification_direct from d029_read),
  1::bigint,
  'Claim author can still read the related Verification'
);

select is(
  (select verification_evidence_direct from d029_read),
  0::bigint,
  'D029 hides Verification-Evidence relation when Evidence itself is unreadable'
);

select is(
  (select getter_ok from d029_read),
  false,
  'D028 integrated episode getter remains fail-closed for external participant'
);

select is(
  (select getter_sqlstate from d029_read),
  '42501',
  'D028 getter denial remains an authorization failure'
);

-- Positive reviewer control: reviewer can directly read the Evidence through
-- the bounded review context and therefore may read the relation.
select set_config(
  'request.jwt.claim.sub',
  '98500000-0000-4000-8000-000000000003',
  true
);
set local role authenticated;

select is(
  (
    select count(*)::bigint
    from public.evidence_items
    where id=(select value from obs_ids where key='founder_evidence')
  ),
  1::bigint,
  'bounded reviewer can directly read the Evidence'
);

select is(
  (
    select count(*)::bigint
    from public.verification_evidence_items
    where verification_id=(select value from obs_ids where key='d029_verification')
      and evidence_item_id=(select value from obs_ids where key='founder_evidence')
  ),
  1::bigint,
  'bounded reviewer can read relation when both Verification and Evidence are readable'
);

reset role;

select diag(
  'D029_RELATION_FIX=PASS'
  || '|CLAIM_AUTHOR_EVIDENCE=DENY'
  || '|CLAIM_AUTHOR_VERIFICATION=ALLOW'
  || '|CLAIM_AUTHOR_RELATION=DENY'
  || '|BOUNDED_REVIEWER_EVIDENCE=ALLOW'
  || '|BOUNDED_REVIEWER_RELATION=ALLOW'
  || '|INTEGRATED_GETTER_CHANGE=0'
);

-- ---------------------------------------------------------------------------
-- D031 ECONOMIC REACHABILITY WITH EXPLICIT PROJECT-SCOPED DESIGNATION.
-- Verification already exists from the shared path.
-- ---------------------------------------------------------------------------

insert into public.actors(
  id, kind, name
) values (
  '98500000-0000-4000-8000-000000000004',
  'ORGANIZATION',
  'PRE-T19 non-PERSON designation negative control'
);

select set_config(
  'request.jwt.claim.sub',
  '98500000-0000-4000-8000-000000000001',
  true
);
set local role authenticated;

insert into obs_ids(key,result)
select 'domain_decision',public.t2d_issue_domain_decision(
  (select actor_id from obs_actor where label='FOUNDER'),
  (select value from obs_ids where key='claim'),
  array[(select value from obs_ids where key='t17_verification')],
  'ACCEPT_FOR_CONTEXT',
  'Accept only this synthetic Claim for the bounded D031 economic reachability test.',
  'Synthetic PERSON Decision for technical reachability only; not Human evidence.',
  '98500000-0000-4000-8000-000000000119'::uuid,
  'd029-d031-domain-decision'
);

update obs_ids
set value=(result->>'decision_id')::uuid
where key='domain_decision';

insert into obs_ids(key,result)
select 'economic_instruction',public.k002_create_economic_instruction(
  (select actor_id from obs_actor where label='FOUNDER'),
  (select value from obs_ids where key='cell'),
  (select value from obs_ids where key='project'),
  (select value from obs_ids where key='commitment'),
  (select value from obs_ids where key='claim'),
  (select value from obs_ids where key='domain_decision'),
  (select actor_id from obs_actor where label='PARTICIPANT'),
  1.0,
  'LOCAL_TEST',
  'D031_UNIT',
  'Provider-neutral synthetic instruction only; no money or external settlement.',
  '98500000-0000-4000-8000-000000000120'::uuid,
  'd029-d031-economic-instruction'
);

update obs_ids
set value=(result->>'economic_instruction_id')::uuid
where key='economic_instruction';

reset role;

select ok(
  (select value from obs_ids where key='economic_instruction') is not null,
  'D031 control reaches provider-neutral EconomicInstruction'
);

select ok(
  not private.b1_has_capability(
    (select actor_id from obs_actor where label='FOUNDER'),
    'settlement.record',
    'PROJECT',
    (select value from obs_ids where key='project')
  ),
  'Project steward does not receive settlement.record by default'
);

select ok(
  not private.b1_has_capability(
    (select actor_id from obs_actor where label='PARTICIPANT'),
    'settlement.record',
    'PROJECT',
    (select value from obs_ids where key='project')
  ),
  'participant does not receive settlement.record by participation/authorship/beneficiary status'
);

-- Non-PERSON designation must fail.
select set_config(
  'request.jwt.claim.sub',
  '98500000-0000-4000-8000-000000000001',
  true
);
set local role authenticated;

select throws_ok(
  $$select public.k002_designate_settlement_recorder(
    (select actor_id from obs_actor where label='FOUNDER'),
    (select value from obs_ids where key='project'),
    '98500000-0000-4000-8000-000000000004'::uuid,
    '98500000-0000-4000-8000-000000000121'::uuid,
    'd031-ai-recorder-denied'
  )$$,
  'CZ422:SETTLEMENT_RECORDER_PERSON_REQUIRED',
  'D031 settlement recorder must be a PERSON'
);

insert into obs_ids(key,result)
select 'settlement_recorder_designation',
  public.k002_designate_settlement_recorder(
    (select actor_id from obs_actor where label='FOUNDER'),
    (select value from obs_ids where key='project'),
    (select actor_id from obs_actor where label='PARTICIPANT'),
    '98500000-0000-4000-8000-000000000122'::uuid,
    'd031-designate-participant-recorder'
  );

update obs_ids
set value=(result->>'role_assignment_id')::uuid
where key='settlement_recorder_designation';

reset role;

select ok(
  (select value from obs_ids where key='settlement_recorder_designation') is not null,
  'responsible Project PERSON explicitly designated settlement recorder'
);

select is(
  (
    select rd.code
    from public.role_assignments ra
    join public.role_definitions rd on rd.id=ra.role_id
    where ra.id=(select value from obs_ids where key='settlement_recorder_designation')
  ),
  'SETTLEMENT_RECORDER',
  'designation uses SETTLEMENT_RECORDER role'
);

select is(
  (
    select ra.scope_type
    from public.role_assignments ra
    where ra.id=(select value from obs_ids where key='settlement_recorder_designation')
  ),
  'PROJECT',
  'settlement-recorder assignment is PROJECT-scoped'
);

select is(
  (
    select ra.scope_id
    from public.role_assignments ra
    where ra.id=(select value from obs_ids where key='settlement_recorder_designation')
  ),
  (select value from obs_ids where key='project'),
  'settlement-recorder assignment is bounded to exact Project'
);

select is(
  (
    select count(*)::bigint
    from public.role_capabilities rc
    join public.role_definitions rd on rd.id=rc.role_id
    where rd.cell_id=(select value from obs_ids where key='cell')
      and rd.code='SETTLEMENT_RECORDER'
  ),
  1::bigint,
  'SETTLEMENT_RECORDER owns exactly one capability'
);

select is(
  (
    select min(rc.capability_code)
    from public.role_capabilities rc
    join public.role_definitions rd on rd.id=rc.role_id
    where rd.cell_id=(select value from obs_ids where key='cell')
      and rd.code='SETTLEMENT_RECORDER'
  ),
  'settlement.record',
  'SETTLEMENT_RECORDER capability is exactly settlement.record'
);

select is(
  private.participant_has_active_cell_membership(
    (select value from obs_ids where key='cell'),
    '98500000-0000-4000-8000-000000000002'::uuid
  ),
  false,
  'PROJECT-scoped recorder designation does not create Cell membership'
);

select ok(
  private.b1_has_capability(
    (select actor_id from obs_actor where label='PARTICIPANT'),
    'settlement.record',
    'PROJECT',
    (select value from obs_ids where key='project')
  ),
  'designated PERSON receives settlement.record for exact Project'
);

select ok(
  not private.b1_has_capability(
    (select actor_id from obs_actor where label='PARTICIPANT'),
    'economic.instruct',
    'PROJECT',
    (select value from obs_ids where key='project')
  ),
  'designation does not grant economic.instruct'
);

select ok(
  not private.b1_has_capability(
    (select actor_id from obs_actor where label='PARTICIPANT'),
    'settlement.reconcile',
    'PROJECT',
    (select value from obs_ids where key='project')
  ),
  'designation does not grant settlement.reconcile'
);

-- The shared D029 precondition intentionally granted delegation.manage to
-- PARTICIPANT. Remove that unrelated authority through the canonical revoke
-- command before evaluating the D031 authority bundle.
select set_config(
  'request.jwt.claim.sub',
  '98500000-0000-4000-8000-000000000001',
  true
);
set local role authenticated;

insert into obs_ids(key,result)
select 'd029_delegation_manage_revocation',public.b1_revoke_delegation(
  (select actor_id from obs_actor where label='FOUNDER'),
  (
    select (result->>'delegation_id')::uuid
    from d029_probe
    where stage='FOUNDER_TO_PARTICIPANT_DELEGATION_MANAGE'
  ),
  1,
  '98500000-0000-4000-8000-000000000130'::uuid,
  'd031-cleanup-d029-delegation-manage'
);

reset role;

select ok(
  not private.b1_has_capability(
    (select actor_id from obs_actor where label='PARTICIPANT'),
    'delegation.manage',
    'PROJECT',
    (select value from obs_ids where key='project')
  ),
  'D031 recorder authority is isolated after canonical cleanup of unrelated D029 delegation'
);

-- Ordinary participant cannot designate authority.
select set_config(
  'request.jwt.claim.sub',
  '98500000-0000-4000-8000-000000000002',
  true
);
set local role authenticated;

select throws_ok(
  $$select public.k002_designate_settlement_recorder(
    (select actor_id from obs_actor where label='PARTICIPANT'),
    (select value from obs_ids where key='project'),
    (select actor_id from obs_actor where label='REVIEWER'),
    '98500000-0000-4000-8000-000000000123'::uuid,
    'd031-participant-cannot-designate'
  )$$,
  'CZ403:PROJECT_RESPONSIBLE_PERSON_REQUIRED',
  'ordinary participant cannot designate settlement recorder'
);

insert into obs_ids(key,result)
select 'settlement_attempt',public.k002_record_settlement_attempt(
  (select actor_id from obs_actor where label='PARTICIPANT'),
  (select value from obs_ids where key='economic_instruction'),
  'LOCAL_OBSERVATION',
  'd031-attempt-001',
  'PREPARED',
  now(),
  null,
  'Synthetic local attempt record only; no provider call occurred.',
  '98500000-0000-4000-8000-000000000124'::uuid,
  'd031-settlement-attempt'
);

update obs_ids
set value=(result->>'settlement_attempt_id')::uuid
where key='settlement_attempt';

insert into obs_ids(key,result)
select 'settlement_receipt',public.k002_record_settlement_receipt(
  (select actor_id from obs_actor where label='PARTICIPANT'),
  (select value from obs_ids where key='settlement_attempt'),
  'd031-receipt-001',
  'CONFIRMED',
  1.0,
  'LOCAL_TEST',
  'D031_UNIT',
  now(),
  repeat('b',64),
  'Synthetic receipt record only; no provider or money movement occurred.',
  '98500000-0000-4000-8000-000000000125'::uuid,
  'd031-settlement-receipt'
);

update obs_ids
set value=(result->>'settlement_receipt_id')::uuid
where key='settlement_receipt';

select throws_ok(
  $$select public.k002_reconcile_settlement(
    (select actor_id from obs_actor where label='PARTICIPANT'),
    (select value from obs_ids where key='economic_instruction'),
    (select value from obs_ids where key='settlement_receipt'),
    'MATCHED',
    'Recorder must not receive reconciliation authority from designation.',
    '98500000-0000-4000-8000-000000000126'::uuid,
    'd031-recorder-cannot-reconcile'
  )$$,
  'CZ403:CAPABILITY_DENIED',
  'settlement recorder cannot decide Reconciliation'
);

reset role;

select ok(
  (select value from obs_ids where key='settlement_attempt') is not null,
  'designated recorder can record SettlementAttempt'
);

select ok(
  (select value from obs_ids where key='settlement_receipt') is not null,
  'designated recorder can record SettlementReceipt'
);

select set_config(
  'request.jwt.claim.sub',
  '98500000-0000-4000-8000-000000000001',
  true
);
set local role authenticated;

insert into obs_ids(key,result)
select 'reconciliation',public.k002_reconcile_settlement(
  (select actor_id from obs_actor where label='FOUNDER'),
  (select value from obs_ids where key='economic_instruction'),
  (select value from obs_ids where key='settlement_receipt'),
  'MATCHED',
  'Synthetic provider-neutral receipt matches the synthetic instruction.',
  '98500000-0000-4000-8000-000000000127'::uuid,
  'd031-steward-reconcile'
);

update obs_ids
set value=(result->>'reconciliation_id')::uuid
where key='reconciliation';

insert into obs_ids(key,result)
select 'settlement_recorder_revocation',
  public.k002_revoke_settlement_recorder(
    (select actor_id from obs_actor where label='FOUNDER'),
    (select value from obs_ids where key='settlement_recorder_designation'),
    '98500000-0000-4000-8000-000000000128'::uuid,
    'd031-revoke-participant-recorder'
  );

reset role;

select ok(
  (select value from obs_ids where key='reconciliation') is not null,
  'Project steward retains distinct settlement.reconcile authority'
);

select is(
  (select result->>'status' from obs_ids where key='settlement_recorder_revocation'),
  'REVOKED',
  'responsible Project PERSON can explicitly revoke recorder designation'
);

select ok(
  not private.b1_has_capability(
    (select actor_id from obs_actor where label='PARTICIPANT'),
    'settlement.record',
    'PROJECT',
    (select value from obs_ids where key='project')
  ),
  'revocation removes effective settlement.record authority'
);

select set_config(
  'request.jwt.claim.sub',
  '98500000-0000-4000-8000-000000000002',
  true
);
set local role authenticated;

select throws_ok(
  $$select public.k002_record_settlement_attempt(
    (select actor_id from obs_actor where label='PARTICIPANT'),
    (select value from obs_ids where key='economic_instruction'),
    'LOCAL_OBSERVATION',
    'd031-attempt-after-revoke',
    'PREPARED',
    now(),
    null,
    'This record must fail after settlement-recorder revocation.',
    '98500000-0000-4000-8000-000000000129'::uuid,
    'd031-settlement-after-revoke'
  )$$,
  'CZ403:CAPABILITY_DENIED',
  'revoked recorder cannot record a new SettlementAttempt'
);

reset role;

select diag(
  'D031_SETTLEMENT_RECORDER=PASS'
  || '|DESIGNATION=EXPLICIT'
  || '|ACTOR_KIND=PERSON'
  || '|SCOPE=PROJECT'
  || '|CELL_MEMBERSHIP_GRANTED=FALSE'
  || '|SETTLEMENT_RECORD=ALLOW_WHILE_ACTIVE'
  || '|ECONOMIC_INSTRUCT_GRANTED=FALSE'
  || '|SETTLEMENT_RECONCILE_GRANTED=FALSE'
  || '|RECORDER_RECONCILE=DENY'
  || '|STEWARD_RECONCILE=ALLOW'
  || '|POST_REVOKE_RECORD=DENY'
  || '|REAL_RAIL_CALLS=0'
);

select diag(
  'PRE_T19_POST_FIX=PASS'
  || '|D029_RELATION=GREEN'
  || '|D029_GETTER=UNCHANGED_FAIL_CLOSED'
  || '|D031_SETTLEMENT_RECORD_CHAIN=GREEN'
  || '|TWO_ACTOR_TECHNICAL!=TWO_HUMAN_HABITABILITY'
  || '|NO_EXTERNAL_UTILITY_CLAIM=YES'
);

select * from finish();
rollback;

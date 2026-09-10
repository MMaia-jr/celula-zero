begin;

create extension if not exists pgtap with schema extensions;
select no_plan();

-- D030 revised regression after the rejected CELL_INVITER role representation.
-- Preserve exactly one CELL-scoped membership assignment and use a derived,
-- non-delegable participant-boundary-founder invitation basis.

insert into auth.users(
  id,aud,role,email,raw_app_meta_data,raw_user_meta_data,created_at,updated_at
) values
(
  '98400000-0000-4000-8000-000000000001',
  'authenticated','authenticated','d030-founder@test','{}',
  '{"name":"D030 Founder"}',now(),now()
),
(
  '98400000-0000-4000-8000-000000000002',
  'authenticated','authenticated','d030-participant@test','{}',
  '{"name":"D030 Participant"}',now(),now()
);

create temporary table d030_actor(
  label text primary key,
  profile_id uuid not null,
  actor_id uuid not null
);

insert into d030_actor(label,profile_id,actor_id)
select 'FOUNDER','98400000-0000-4000-8000-000000000001'::uuid,id
from public.actors
where operator_profile_id='98400000-0000-4000-8000-000000000001'
  and kind='PERSON'
order by created_at,id limit 1;

insert into d030_actor(label,profile_id,actor_id)
select 'PARTICIPANT','98400000-0000-4000-8000-000000000002'::uuid,id
from public.actors
where operator_profile_id='98400000-0000-4000-8000-000000000002'
  and kind='PERSON'
order by created_at,id limit 1;

select is(
  (select count(*)::bigint from d030_actor),
  2::bigint,
  'two controlled synthetic PERSON actors resolved'
);

create temporary table d030_ids(
  key text primary key,
  value uuid,
  result jsonb,
  text_value text
);
grant select,insert,update on d030_ids to authenticated;
grant select on d030_actor to authenticated;

select set_config(
  'request.jwt.claim.sub',
  '98400000-0000-4000-8000-000000000001',
  true
);
set local role authenticated;

insert into d030_ids(key,result)
select 'project',to_jsonb(x)
from public.create_project_atomic(
  'D030 Fresh Cell actual path',
  'd030-fresh-cell-actual-path',
  'Synthetic local Project for D030 actual-path reachability.',
  'Test only the current composed product path and invitation bootstrap.',
  'No external benefit, production deployment or remote write.',
  'One bounded technical rehearsal.',
  'No outreach, funds, chain or paid model calls.',
  array['d030','habitability','fresh-cell'],
  'VOLUNTARY',
  'OPEN',
  true
) x;

update d030_ids
set value=(result->>'project_id')::uuid
where key='project';

insert into d030_ids(key,value)
select 'cell',cell_id
from public.projects
where id=(select value from d030_ids where key='project');

insert into d030_ids(key,result)
select 'opportunity',public.b1_create_opportunity(
  (select actor_id from d030_actor where label='FOUNDER'),
  (select value from d030_ids where key='project'),
  'D030 bounded work opportunity',
  'A synthetic participant may produce one bounded local artifact.',
  'No external or economic consequence.',
  'One technical artifact plus evidence.',
  1,
  '98400000-0000-4000-8000-000000000101'::uuid,
  'd030-create-opportunity'
);

update d030_ids
set value=(result->>'opportunity_id')::uuid
where key='opportunity';

insert into d030_ids(key,result)
select 'published_opportunity',public.b1_publish_opportunity(
  (select actor_id from d030_actor where label='FOUNDER'),
  (select value from d030_ids where key='opportunity'),
  1,
  '98400000-0000-4000-8000-000000000102'::uuid,
  'd030-publish-opportunity'
);

reset role;

select set_config(
  'request.jwt.claim.sub',
  '98400000-0000-4000-8000-000000000002',
  true
);
set local role authenticated;

insert into d030_ids(key,result)
select 'proposal',public.b1_submit_public_proposal(
  (select actor_id from d030_actor where label='PARTICIPANT'),
  (select value from d030_ids where key='opportunity'),
  'I can deliver the bounded synthetic artifact.',
  'Only this exact technical rehearsal.',
  'One text artifact and contextual evidence.',
  'No payment or economic right.',
  '98400000-0000-4000-8000-000000000103'::uuid,
  'd030-public-proposal'
);

update d030_ids
set value=(result->>'proposal_id')::uuid
where key='proposal';

reset role;

select set_config(
  'request.jwt.claim.sub',
  '98400000-0000-4000-8000-000000000001',
  true
);
set local role authenticated;

insert into d030_ids(key,result)
select 'commitment',public.t2b_accept_proposal_for_claim_evidence(
  (select actor_id from d030_actor where label='FOUNDER'),
  (select value from d030_ids where key='proposal'),
  2,
  1,
  2,
  1,
  'Accept the exact bounded synthetic proposal for this technical rehearsal.',
  '98400000-0000-4000-8000-000000000104'::uuid,
  'd030-accept-for-claim-evidence'
);

update d030_ids
set value=(result->>'commitment_id')::uuid
where key='commitment';

reset role;

select set_config(
  'request.jwt.claim.sub',
  '98400000-0000-4000-8000-000000000002',
  true
);
set local role authenticated;

insert into d030_ids(key,result)
select 'contribution',public.b2a_submit_contribution(
  (select actor_id from d030_actor where label='PARTICIPANT'),
  (select value from d030_ids where key='commitment'),
  'Synthetic Contribution produced through accepted-Commitment authority.',
  'Technical rehearsal only.',
  null,
  '98400000-0000-4000-8000-000000000105'::uuid,
  'd030-submit-contribution',
  'PROJECT'
);

update d030_ids
set value=(result->>'contribution_id')::uuid
where key='contribution';

insert into d030_ids(key,result)
select 'artifact',public.t2a_attach_text_artifact(
  (select actor_id from d030_actor where label='PARTICIPANT'),
  (select value from d030_ids where key='contribution'),
  'D030 synthetic technical artifact. No external utility is claimed.',
  '98400000-0000-4000-8000-000000000106'::uuid,
  'd030-attach-text-artifact'
);

update d030_ids
set value=(result->>'artifact_id')::uuid
where key='artifact';

insert into d030_ids(key,result)
select 'claim',public.b2b1_record_claim(
  (select actor_id from d030_actor where label='PARTICIPANT'),
  'ARTIFACT',
  (select value from d030_ids where key='artifact'),
  'The synthetic D030 artifact exists in this bounded technical rehearsal.',
  'Existence in this local rehearsal only; no external usefulness claim.',
  null,
  '98400000-0000-4000-8000-000000000107'::uuid,
  'd030-record-claim'
);

update d030_ids
set value=(result->>'claim_id')::uuid
where key='claim';

insert into d030_ids(key,result)
select 'evidence',public.b2b1_register_evidence(
  (select actor_id from d030_actor where label='PARTICIPANT'),
  (select value from d030_ids where key='claim'),
  (select value from d030_ids where key='artifact'),
  'SUPPORTS',
  'The digest-bound Artifact is registered as contextual Evidence for its Claim.',
  'Evidence is not proof and this remains a local synthetic rehearsal.',
  null,
  '98400000-0000-4000-8000-000000000108'::uuid,
  'd030-register-evidence'
);

update d030_ids
set value=(result->>'evidence_item_id')::uuid
where key='evidence';

reset role;

select ok(
  (select value from d030_ids where key='project') is not null,
  'fresh participant-boundary Project exists'
);
select ok(
  (select value from d030_ids where key='opportunity') is not null,
  'canonical Opportunity exists'
);
select ok(
  (select value from d030_ids where key='proposal') is not null,
  'external controlled PERSON submitted through public Proposal entry'
);
select ok(
  (select value from d030_ids where key='commitment') is not null,
  'steward accepted exact Proposal through T2 Commitment authority wrapper'
);
select ok(
  (select value from d030_ids where key='contribution') is not null,
  'participant Contribution executed through accepted-Commitment authority'
);
select ok(
  (select value from d030_ids where key='artifact') is not null,
  'participant Artifact executed through accepted-Commitment authority'
);
select ok(
  (select value from d030_ids where key='claim') is not null,
  'participant Claim executed through accepted-Commitment claim authority'
);
select ok(
  (select value from d030_ids where key='evidence') is not null,
  'participant Evidence executed through accepted-Commitment evidence authority'
);

select is(
  (
    select count(*)::bigint
    from public.role_assignments ra
    where ra.actor_id=(select actor_id from d030_actor where label='FOUNDER')
      and ra.cell_id=(select value from d030_ids where key='cell')
      and ra.scope_type='CELL'
      and ra.scope_id=(select value from d030_ids where key='cell')
      and ra.revoked_at is null
  ),
  1::bigint,
  'fresh founder still has exactly one active CELL-scoped assignment'
);

select is(
  (
    select rd.code
    from public.role_assignments ra
    join public.role_definitions rd on rd.id=ra.role_id
    where ra.actor_id=(select actor_id from d030_actor where label='FOUNDER')
      and ra.cell_id=(select value from d030_ids where key='cell')
      and ra.scope_type='CELL'
      and ra.scope_id=(select value from d030_ids where key='cell')
      and ra.revoked_at is null
  ),
  'CELL_MEMBER',
  'the only automatic CELL assignment remains CELL_MEMBER'
);

select is(
  (
    select count(*)::bigint
    from public.role_capabilities rc
    join public.role_definitions rd on rd.id=rc.role_id
    where rd.cell_id=(select value from d030_ids where key='cell')
      and rd.code='CELL_MEMBER'
  ),
  0::bigint,
  'CELL_MEMBER remains zero-capability'
);

select is(
  (
    select count(*)::bigint
    from public.role_definitions rd
    where rd.cell_id=(select value from d030_ids where key='cell')
      and rd.code='CELL_INVITER'
  ),
  0::bigint,
  'rejected CELL_INVITER role representation is not materialized'
);

select ok(
  not private.b1_has_capability(
    (select actor_id from d030_actor where label='FOUNDER'),
    'participation.invite',
    'CELL',
    (select value from d030_ids where key='cell')
  ),
  'founder derived invitation basis does not become a B1 delegable capability'
);

select set_config(
  'request.jwt.claim.sub',
  '98400000-0000-4000-8000-000000000001',
  true
);
set local role authenticated;

insert into d030_ids(key,result)
select 'invitation',public.k002_create_cell_invitation(
  (select actor_id from d030_actor where label='FOUNDER'),
  (select value from d030_ids where key='cell'),
  'Synthetic participant',
  'Join only this bounded local D030 technical rehearsal.',
  now() + interval '1 day',
  '98400000-0000-4000-8000-000000000109'::uuid,
  'd030-create-invitation-derived-founder'
);

update d030_ids
set value=(result->>'invitation_id')::uuid,
    text_value=result->>'bearer_token'
where key='invitation';

reset role;

select ok(
  (select value from d030_ids where key='invitation') is not null,
  'participant-boundary founder creates invitation through derived bootstrap basis'
);

select is(
  (
    select dr.payload->>'authorization_basis'
    from public.decision_records dr
    where dr.target_type='CELL_INVITATION'
      and dr.target_id=(select value from d030_ids where key='invitation')
      and dr.decision_type='PARTICIPATION_INVITE'
    order by dr.created_at desc
    limit 1
  ),
  'PARTICIPANT_BOUNDARY_FOUNDER',
  'invitation decision records the derived bootstrap authority basis'
);

select set_config(
  'request.jwt.claim.sub',
  '98400000-0000-4000-8000-000000000002',
  true
);
set local role authenticated;

insert into d030_ids(key,result)
select 'participation',public.k002_accept_cell_invitation(
  (select actor_id from d030_actor where label='PARTICIPANT'),
  (select text_value from d030_ids where key='invitation'),
  'I consent to this bounded synthetic D030 Cell participation.',
  '98400000-0000-4000-8000-000000000110'::uuid,
  'd030-accept-invitation-derived-founder'
);

update d030_ids
set value=(result->>'participation_id')::uuid
where key='participation';

insert into d030_ids(key,result)
select 'participant_context',public.k002_get_participant_cell_context(
  (select actor_id from d030_actor where label='PARTICIPANT'),
  (select value from d030_ids where key='participation')
);

reset role;

select is(
  (select result->>'status' from d030_ids where key='participation'),
  'ACTIVE',
  'participant consent produces ACTIVE participation'
);

select is(
  (select result->>'authority_granted' from d030_ids where key='participation'),
  'false',
  'invitation acceptance still grants no authority'
);

select is(
  (
    select result #>> '{boundaries,participation_grants_authority}'
    from d030_ids where key='participant_context'
  ),
  'false',
  'bounded participant context preserves participation != authority'
);

select is(
  (
    select count(*)::bigint
    from public.role_assignments ra
    where ra.actor_id=(select actor_id from d030_actor where label='PARTICIPANT')
      and ra.cell_id=(select value from d030_ids where key='cell')
  ),
  0::bigint,
  'accepted participant receives no role assignment'
);

select is(
  (
    select count(*)::bigint
    from public.delegations d
    where d.delegate_actor_id=(select actor_id from d030_actor where label='PARTICIPANT')
      and d.cell_id=(select value from d030_ids where key='cell')
  ),
  0::bigint,
  'accepted participant receives no delegation'
);

create temporary table participant_invite_attempt(
  ok boolean,
  observed_sqlstate text,
  observed_message text
);
grant select,insert,update on participant_invite_attempt to authenticated;
insert into participant_invite_attempt(ok) values(false);

select set_config(
  'request.jwt.claim.sub',
  '98400000-0000-4000-8000-000000000002',
  true
);
set local role authenticated;

do $$
begin
  begin
    perform public.k002_create_cell_invitation(
      (select actor_id from d030_actor where label='PARTICIPANT'),
      (select value from d030_ids where key='cell'),
      'Another participant',
      'This attempt must remain unauthorized under D030.',
      now() + interval '1 day',
      '98400000-0000-4000-8000-000000000111'::uuid,
      'd030-participant-cannot-invite-derived'
    );
    update participant_invite_attempt set ok=true;
  exception when others then
    update participant_invite_attempt
    set ok=false,observed_sqlstate=sqlstate,observed_message=sqlerrm;
  end;
end
$$;

reset role;

select ok(
  not (select ok from participant_invite_attempt),
  'ordinary participant cannot create another Cell invitation'
);

select is(
  (select observed_message from participant_invite_attempt),
  'CZ403:CAPABILITY_DENIED',
  'ordinary participant invitation attempt fails by capability'
);

-- Exercise revoke under the same derived basis.
select set_config(
  'request.jwt.claim.sub',
  '98400000-0000-4000-8000-000000000001',
  true
);
set local role authenticated;

insert into d030_ids(key,result)
select 'revocable_invitation',public.k002_create_cell_invitation(
  (select actor_id from d030_actor where label='FOUNDER'),
  (select value from d030_ids where key='cell'),
  'Revocable synthetic participant',
  'Exercise only the derived founder revoke authority path.',
  now() + interval '1 day',
  '98400000-0000-4000-8000-000000000112'::uuid,
  'd030-create-revocable-invitation'
);

update d030_ids
set value=(result->>'invitation_id')::uuid
where key='revocable_invitation';

insert into d030_ids(key,result)
select 'revocation',public.k002_revoke_cell_invitation(
  (select actor_id from d030_actor where label='FOUNDER'),
  (select value from d030_ids where key='revocable_invitation'),
  '98400000-0000-4000-8000-000000000113'::uuid,
  'd030-revoke-derived-founder'
);

reset role;

select is(
  (select result->>'status' from d030_ids where key='revocation'),
  'REVOKED',
  'derived founder basis can revoke its Cell invitation'
);

-- Lifecycle coupling: revoking the only canonical CELL_MEMBER assignment must
-- remove the derived founder bootstrap authority. No second CELL-scoped role
-- exists to keep membership/read access alive.
update public.role_assignments ra
set revoked_at=now()
from public.role_definitions rd
where rd.id=ra.role_id
  and rd.code='CELL_MEMBER'
  and ra.actor_id=(select actor_id from d030_actor where label='FOUNDER')
  and ra.cell_id=(select value from d030_ids where key='cell')
  and ra.scope_type='CELL'
  and ra.scope_id=(select value from d030_ids where key='cell')
  and ra.revoked_at is null;

select is(
  private.participant_has_active_cell_membership(
    (select value from d030_ids where key='cell'),
    '98400000-0000-4000-8000-000000000001'::uuid
  ),
  false,
  'revoked CELL_MEMBER removes active Cell membership'
);

create temporary table founder_after_membership_revoke(
  ok boolean,
  observed_sqlstate text,
  observed_message text
);
grant select,insert,update on founder_after_membership_revoke to authenticated;
insert into founder_after_membership_revoke(ok) values(false);

select set_config(
  'request.jwt.claim.sub',
  '98400000-0000-4000-8000-000000000001',
  true
);
set local role authenticated;

do $$
begin
  begin
    perform public.k002_create_cell_invitation(
      (select actor_id from d030_actor where label='FOUNDER'),
      (select value from d030_ids where key='cell'),
      'Post-membership-revoke participant',
      'This invitation must fail after the founder Cell membership is revoked.',
      now() + interval '1 day',
      '98400000-0000-4000-8000-000000000114'::uuid,
      'd030-founder-after-membership-revoke'
    );
    update founder_after_membership_revoke set ok=true;
  exception when others then
    update founder_after_membership_revoke
    set ok=false,observed_sqlstate=sqlstate,observed_message=sqlerrm;
  end;
end
$$;

reset role;

select ok(
  not (select ok from founder_after_membership_revoke),
  'founder derived invitation authority disappears with active CELL_MEMBER'
);

select is(
  (select observed_message from founder_after_membership_revoke),
  'CZ403:CAPABILITY_DENIED',
  'post-membership-revoke founder invitation fails closed'
);

select diag(
  'D030_DERIVED_INVITATION_BOOTSTRAP=PASS'
  || '|FOUNDER_INVITE=ALLOW'
  || '|AUTHORITY_BASIS=PARTICIPANT_BOUNDARY_FOUNDER'
  || '|PARTICIPANT_ACCEPT=ALLOW'
  || '|AUTHORITY_GRANTED_ON_ACCEPT=FALSE'
  || '|PARTICIPANT_REINVITE=DENY'
  || '|FOUNDER_REVOKE=ALLOW'
  || '|FOUNDER_MEMBERSHIP_REVOKED->INVITE_DENY=PASS'
);

select diag(
  'PRODUCTIVE_PATH_PRESERVED=PASS'
  || '|PUBLIC_PROPOSAL=PASS'
  || '|COMMITMENT_DERIVED_WORK=PASS'
  || '|CONTRIBUTION=PASS'
  || '|ARTIFACT=PASS'
  || '|CLAIM=PASS'
  || '|EVIDENCE=PASS'
  || '|PRODUCTIVE_ROLE_ASSIGNMENT_REQUIRED=NO'
);

select diag(
  'BOUNDARY'
  || '|CELL_SCOPED_ASSIGNMENTS_INITIAL=1'
  || '|CELL_MEMBER_CAPABILITIES=0'
  || '|CELL_INVITER_ROLE=0'
  || '|B1_HAS_CAPABILITY_UNCHANGED=YES'
  || '|DERIVED_BOOTSTRAP_DELEGABLE=NO'
  || '|TWO_ACTOR_TECHNICAL!=TWO_HUMAN_HABITABILITY'
  || '|D030_GREEN!=EXTERNAL_UTILITY'
);

select * from finish();
rollback;

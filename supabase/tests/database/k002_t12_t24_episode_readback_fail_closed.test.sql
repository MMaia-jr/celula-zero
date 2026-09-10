begin;

create extension if not exists pgtap with schema extensions;
select no_plan();

-- K002 / T12 + T24 — observation only.
--
-- Question:
-- Can a profile with legitimate access somewhere else in the same Cell,
-- but no access to PRIVATE material in the target Project, learn the private
-- episode linkage/state through k002_metabolism_episodes or
-- k002_get_metabolism_episode()?
--
-- This file changes no policy/function/schema. It is a disposable fixture.

insert into auth.users(
  id,aud,role,email,raw_app_meta_data,raw_user_meta_data,created_at,updated_at
) values
(
  '97000000-0000-4000-8000-000000000001',
  'authenticated','authenticated','t12t24-owner@test','{}',
  '{"name":"T12T24 Owner"}',now(),now()
),
(
  '97000000-0000-4000-8000-000000000002',
  'authenticated','authenticated','t12t24-counterparty@test','{}',
  '{"name":"T12T24 Counterparty"}',now(),now()
),
(
  '97000000-0000-4000-8000-000000000003',
  'authenticated','authenticated','t12t24-cell-reader@test','{}',
  '{"name":"T12T24 Cell Reader"}',now(),now()
);

create temporary table obs_actor(
  label text primary key,
  profile_id uuid not null,
  actor_id uuid not null
);

insert into obs_actor(label,profile_id,actor_id)
select 'OWNER','97000000-0000-4000-8000-000000000001'::uuid,id
from public.actors
where operator_profile_id='97000000-0000-4000-8000-000000000001'
  and kind='PERSON'
order by created_at,id limit 1;

insert into obs_actor(label,profile_id,actor_id)
select 'COUNTERPARTY','97000000-0000-4000-8000-000000000002'::uuid,id
from public.actors
where operator_profile_id='97000000-0000-4000-8000-000000000002'
  and kind='PERSON'
order by created_at,id limit 1;

insert into obs_actor(label,profile_id,actor_id)
select 'CELL_READER','97000000-0000-4000-8000-000000000003'::uuid,id
from public.actors
where operator_profile_id='97000000-0000-4000-8000-000000000003'
  and kind='PERSON'
order by created_at,id limit 1;

select is(
  (select count(*)::bigint from obs_actor),
  3::bigint,
  'three synthetic controlled PERSON actors resolved'
);

create temporary table obs_ids(
  key text primary key,
  value uuid,
  result jsonb
);
grant select,insert,update on obs_ids to authenticated;
grant select on obs_actor to authenticated;

-- Owner creates the target Project and Company Core cycle through canonical
-- commands so the episode sits in a realistic Project/Cell context.
select set_config(
  'request.jwt.claim.sub',
  '97000000-0000-4000-8000-000000000001',
  true
);
set local role authenticated;

insert into obs_ids(key,result)
select 'target_project',to_jsonb(x)
from public.create_project_atomic(
  'T12 T24 private readback target',
  't12-t24-private-readback-target',
  'Synthetic local Project for privacy/readback observation only.',
  'Observe whether private child linkage leaks through episode readback.',
  'No policy change is authorized by this fixture.',
  'One bounded local observation.',
  'No external calls, deployment, publication, funds or outreach.',
  array['t12','t24','privacy','readback'],
  'VOLUNTARY',
  'OPEN',
  false
) x;

update obs_ids
set value=(result->>'project_id')::uuid
where key='target_project';

insert into obs_ids(key,value)
select 'cell',cell_id
from public.projects
where id=(select value from obs_ids where key='target_project');

insert into obs_ids(key,result)
select 'cycle',public.company_core_create_cycle(
  (select actor_id from obs_actor where label='OWNER'),
  (select value from obs_ids where key='target_project'),
  'Private episode readback observation',
  'Observe only whether existence/linkage of private material leaks through integrated readback.',
  'A deterministic local observation with no implementation.',
  'Local fixture only.',
  'HIGH',
  'No external calls.',
  'Synthetic observation.',
  '97000000-0000-4000-8000-000000000101'::uuid,
  't12-t24-private-readback-cycle'
);

update obs_ids
set value=(result->>'cycle_id')::uuid
where key='cycle';

reset role;

-- The first observation harness learned that create_project_atomic creates a
-- distinct Cell for a newly created Project. That did not satisfy the premise
-- "unrelated Project in the same Cell". Recovery: create only a disposable
-- unrelated Project row in the already-existing target Cell, then use the
-- canonical PROJECT_STEWARD membership bridge to create a legitimate active
-- role assignment scoped to that unrelated Project. No production function or
-- policy is changed.

insert into public.projects(
  id,cell_id,slug,title,summary,current_intent,steward_actor_id,stage,visibility,
  economic_regime,intended_result,rules_and_limits,needs,source_label,
  created_by_profile_id,version,published_at
) values (
  '97000000-0000-4000-8000-000000000151',
  (select value from obs_ids where key='cell'),
  't12-t24-unrelated-same-cell-project',
  'T12 T24 unrelated same Cell Project',
  'Synthetic unrelated Project used only to establish same-Cell role access.',
  'Provide a same-Cell but cross-Project access control for private readback observation.',
  (select actor_id from obs_actor where label='CELL_READER'),
  'ACTIVE',
  'PRIVATE',
  'VOLUNTARY',
  'Establish one unrelated Project-scoped role in the target Cell.',
  'No target Project membership, disclosure, publication or authority.',
  array['t12','t24','control'],
  'DEMO / SYNTHETIC',
  '97000000-0000-4000-8000-000000000003',
  1,
  null
);

insert into obs_ids(key,value)
values ('reader_project','97000000-0000-4000-8000-000000000151'::uuid);

insert into public.project_members(
  project_id,actor_id,role,granted_by_profile_id
) values (
  (select value from obs_ids where key='reader_project'),
  (select actor_id from obs_actor where label='CELL_READER'),
  'PROJECT_STEWARD',
  '97000000-0000-4000-8000-000000000003'
);

-- Current participant-boundary semantics require an active CELL-scoped
-- membership in the target Cell. Add exactly that disposable control relation
-- using the Cell's own current CELL_MEMBER role definition. Do not use the
-- historical Cell Zero role UUID and do not create a second Project assignment.
insert into public.role_assignments(
  cell_id,actor_id,role_id,scope_type,scope_id,
  policy_version_id,granted_by_actor_id
)
select
  c.id,
  (select actor_id from obs_actor where label='CELL_READER'),
  rd.id,
  'CELL',
  c.id,
  c.current_policy_version_id,
  (select actor_id from obs_actor where label='CELL_READER')
from public.cells c
join public.role_definitions rd
  on rd.cell_id=c.id
 and rd.code='CELL_MEMBER'
where c.id=(select value from obs_ids where key='cell')
  and not exists (
    select 1
    from public.role_assignments ra
    where ra.cell_id=c.id
      and ra.actor_id=(select actor_id from obs_actor where label='CELL_READER')
      and ra.scope_type='CELL'
      and ra.scope_id=c.id
      and ra.policy_version_id=c.current_policy_version_id
      and ra.revoked_at is null
      and (ra.valid_until is null or ra.valid_until > now())
  );

select is(
  (
    select p.cell_id
    from public.projects p
    where p.id=(select value from obs_ids where key='reader_project')
  ),
  (select value from obs_ids where key='cell'),
  'unrelated reader Project is explicitly in the same Cell'
);

select is(
  (
    select count(*)::bigint
    from public.role_assignments ra
    join public.role_definitions rd
      on rd.id=ra.role_id
     and rd.cell_id=ra.cell_id
    join public.cells c
      on c.id=ra.cell_id
    where ra.cell_id=(select value from obs_ids where key='cell')
      and ra.actor_id=(select actor_id from obs_actor where label='CELL_READER')
      and ra.scope_type='CELL'
      and ra.scope_id=ra.cell_id
      and rd.code='CELL_MEMBER'
      and ra.policy_version_id=c.current_policy_version_id
      and ra.revoked_at is null
      and (ra.valid_until is null or ra.valid_until > now())
  ),
  1::bigint,
  'CELL_READER has one active CELL_MEMBER relation in the target Cell'
);

select is(
  (
    select count(*)::bigint
    from public.role_assignments ra
    join public.role_definitions rd
      on rd.id=ra.role_id
     and rd.cell_id=ra.cell_id
    join public.cells c
      on c.id=ra.cell_id
    where ra.cell_id=(select value from obs_ids where key='cell')
      and ra.actor_id=(select actor_id from obs_actor where label='CELL_READER')
      and ra.scope_type='PROJECT'
      and ra.scope_id=(select value from obs_ids where key='reader_project')
      and rd.code='PROJECT_STEWARD'
      and ra.policy_version_id=c.current_policy_version_id
      and ra.revoked_at is null
      and (ra.valid_until is null or ra.valid_until > now())
  ),
  1::bigint,
  'CELL_READER has one valid PROJECT_STEWARD role only on the unrelated Project'
);

select ok(
  private.can_manage_project(
    (select value from obs_ids where key='reader_project'),
    '97000000-0000-4000-8000-000000000003'::uuid
  ),
  'CELL_READER legitimately manages the unrelated same-Cell Project'
);

-- Build one exact accepted Commitment in the target Project. OWNER is the
-- proposer/material author; COUNTERPARTY is the exact accepting party.
insert into public.opportunities(
  id,cell_id,project_id,owner_actor_id,state,visibility,
  current_version,material_version,capacity
)
values (
  '97000000-0000-4000-8000-000000000201',
  (select value from obs_ids where key='cell'),
  (select value from obs_ids where key='target_project'),
  (select actor_id from obs_actor where label='OWNER'),
  'OPEN','PROJECT',1,1,1
);

insert into public.opportunity_versions(
  id,opportunity_id,version,title,statement,conditions,expected_result,
  capacity,state,visibility,created_by_actor_id
)
values (
  '97000000-0000-4000-8000-000000000202',
  '97000000-0000-4000-8000-000000000201',
  1,
  'Private readback observation',
  'Create one bounded synthetic Commitment for local privacy observation.',
  'No authority outside this disposable fixture.',
  'One private Contribution Artifact Claim chain.',
  1,'OPEN','PROJECT',
  (select actor_id from obs_actor where label='OWNER')
);

insert into public.proposals(
  id,cell_id,opportunity_id,proposer_actor_id,state,visibility,
  current_version,material_version
)
values (
  '97000000-0000-4000-8000-000000000211',
  (select value from obs_ids where key='cell'),
  '97000000-0000-4000-8000-000000000201',
  (select actor_id from obs_actor where label='OWNER'),
  'ACCEPTED','PROJECT',1,1
);

insert into public.proposal_versions(
  id,proposal_id,version,statement,conditions,expected_delivery,
  reward_expectation,created_by_actor_id
)
values (
  '97000000-0000-4000-8000-000000000212',
  '97000000-0000-4000-8000-000000000211',
  1,
  'Create synthetic private material for a bounded readback observation.',
  'No disclosure beyond the chosen PRIVATE visibility.',
  'One private material chain.',
  'No economic consequence.',
  (select actor_id from obs_actor where label='OWNER')
);

insert into public.commitments(
  id,cell_id,project_id,opportunity_id,opportunity_version,
  proposal_id,proposal_version,proposer_actor_id,accepted_by_actor_id,
  state,visibility
)
values (
  '97000000-0000-4000-8000-000000000221',
  (select value from obs_ids where key='cell'),
  (select value from obs_ids where key='target_project'),
  '97000000-0000-4000-8000-000000000201',
  1,
  '97000000-0000-4000-8000-000000000211',
  1,
  (select actor_id from obs_actor where label='OWNER'),
  (select actor_id from obs_actor where label='COUNTERPARTY'),
  'ACCEPTED','PROJECT'
);

insert into public.contributions(
  id,cell_id,project_id,commitment_id,author_actor_id,
  description,limitations,visibility,sensitivity
)
values (
  '97000000-0000-4000-8000-000000000301',
  (select value from obs_ids where key='cell'),
  (select value from obs_ids where key='target_project'),
  '97000000-0000-4000-8000-000000000221',
  (select actor_id from obs_actor where label='OWNER'),
  'Synthetic PRIVATE Contribution for T12/T24 readback observation.',
  'Existence and linkage must not silently widen beyond the private boundary.',
  'PRIVATE','NORMAL'
);

insert into public.artifacts(
  id,cell_id,project_id,contribution_id,created_by_actor_id,
  kind,uri,digest_algorithm,digest,media_type,size_bytes,
  visibility,sensitivity,retention_class
)
values (
  '97000000-0000-4000-8000-000000000311',
  (select value from obs_ids where key='cell'),
  (select value from obs_ids where key='target_project'),
  '97000000-0000-4000-8000-000000000301',
  (select actor_id from obs_actor where label='OWNER'),
  'DOCUMENT',
  'urn:cz:t12:t24:private-readback',
  'SHA256',repeat('d',64),'text/plain',32,
  'PRIVATE','NORMAL','PROJECT_LIFETIME'
);

insert into public.claims(
  id,cell_id,project_id,subject_type,subject_id,author_actor_id,
  statement,scope_description,state,visibility,sensitivity
)
values (
  '97000000-0000-4000-8000-000000000321',
  (select value from obs_ids where key='cell'),
  (select value from obs_ids where key='target_project'),
  'ARTIFACT',
  '97000000-0000-4000-8000-000000000311',
  (select actor_id from obs_actor where label='OWNER'),
  'The synthetic private Artifact exists only for this local observation.',
  'No external truth or utility claim.',
  'RECORDED','PRIVATE','NORMAL'
);

-- Compose the integrated episode through the canonical command.
select set_config(
  'request.jwt.claim.sub',
  '97000000-0000-4000-8000-000000000001',
  true
);
set local role authenticated;

insert into obs_ids(key,result)
select 'episode',public.k002_compose_metabolism_episode(
  (select actor_id from obs_actor where label='OWNER'),
  (select value from obs_ids where key='cycle'),
  '97000000-0000-4000-8000-000000000221',
  '97000000-0000-4000-8000-000000000301',
  '97000000-0000-4000-8000-000000000311',
  '97000000-0000-4000-8000-000000000321',
  '97000000-0000-4000-8000-000000000401'::uuid,
  't12-t24-private-episode-compose'
);

update obs_ids
set value=(result->>'episode_id')::uuid
where key='episode';

reset role;

select ok(
  (select value from obs_ids where key='episode') is not null,
  'private-material metabolism episode composed'
);

-- Observation table survives role changes.
-- D028 validation: the valid same-Cell unrelated Project control remains,
-- but the integrated episode row/getter must now fail closed.

create temporary table obs_readback(
  direct_contribution bigint,
  direct_artifact bigint,
  direct_claim bigint,
  direct_episode bigint,
  getter_ok boolean,
  getter_result jsonb,
  getter_sqlstate text,
  getter_message text
);
grant select,insert,update on obs_readback to authenticated;

insert into obs_readback(
  direct_contribution,direct_artifact,direct_claim,direct_episode,getter_ok
) values (null,null,null,null,false);

select set_config(
  'request.jwt.claim.sub',
  '97000000-0000-4000-8000-000000000003',
  true
);
set local role authenticated;

select ok(
  private.b1_current_profile_has_cell_access(
    (select value from obs_ids where key='cell')
  ),
  'CELL_READER has legitimate active access in the target Cell'
);

select ok(
  not private.can_manage_project(
    (select value from obs_ids where key='target_project'),
    '97000000-0000-4000-8000-000000000003'::uuid
  ),
  'CELL_READER cannot manage the target Project'
);

update obs_readback set
  direct_contribution=(
    select count(*)::bigint
    from public.contributions
    where id='97000000-0000-4000-8000-000000000301'
  ),
  direct_artifact=(
    select count(*)::bigint
    from public.artifacts
    where id='97000000-0000-4000-8000-000000000311'
  ),
  direct_claim=(
    select count(*)::bigint
    from public.claims
    where id='97000000-0000-4000-8000-000000000321'
  ),
  direct_episode=(
    select count(*)::bigint
    from public.k002_metabolism_episodes
    where id=(select value from obs_ids where key='episode')
  );

do $$
declare
  v_result jsonb;
begin
  begin
    v_result := public.k002_get_metabolism_episode(
      (select value from obs_ids where key='episode')
    );
    update obs_readback
    set getter_ok=true,getter_result=v_result,
        getter_sqlstate=null,getter_message=null;
  exception when others then
    update obs_readback
    set getter_ok=false,getter_result=null,
        getter_sqlstate=sqlstate,getter_message=sqlerrm;
  end;
end
$$;

reset role;

select is(
  (select direct_contribution from obs_readback),
  0::bigint,
  'CELL_READER direct PRIVATE Contribution read remains denied'
);

select is(
  (select direct_artifact from obs_readback),
  0::bigint,
  'CELL_READER direct PRIVATE Artifact read remains denied'
);

select is(
  (select direct_claim from obs_readback),
  0::bigint,
  'CELL_READER direct PRIVATE Claim read remains denied'
);

select is(
  (select direct_episode from obs_readback),
  0::bigint,
  'D028 episode row fails closed when referenced PRIVATE children are unreadable'
);

select ok(
  not (select getter_ok from obs_readback),
  'D028 getter fails closed for the unrelated same-Cell reader'
);

select is(
  (select getter_sqlstate from obs_readback),
  '42501',
  'D028 getter denial uses insufficient_privilege'
);

select is(
  (select getter_message from obs_readback),
  'CZ403:METABOLISM_EPISODE_READ_DENIED',
  'D028 getter exposes no child identifier in its denial'
);

select diag(
  'D028_NEGATIVE'
  || '|direct_contribution=' || coalesce((select direct_contribution::text from obs_readback),'NULL')
  || '|direct_artifact=' || coalesce((select direct_artifact::text from obs_readback),'NULL')
  || '|direct_claim=' || coalesce((select direct_claim::text from obs_readback),'NULL')
  || '|episode_visible=' || coalesce((select direct_episode::text from obs_readback),'NULL')
  || '|getter_ok=' || coalesce((select getter_ok::text from obs_readback),'NULL')
  || '|sqlstate=' || coalesce((select getter_sqlstate from obs_readback),'NULL')
);

-- Positive control: the originator can directly read all three private children,
-- therefore the episode row and getter remain readable and preserve the exact IDs.
select set_config(
  'request.jwt.claim.sub',
  '97000000-0000-4000-8000-000000000001',
  true
);
set local role authenticated;

select is(
  (
    select count(*)::bigint
    from public.contributions
    where id='97000000-0000-4000-8000-000000000301'
  ),
  1::bigint,
  'OWNER directly reads PRIVATE Contribution'
);

select is(
  (
    select count(*)::bigint
    from public.artifacts
    where id='97000000-0000-4000-8000-000000000311'
  ),
  1::bigint,
  'OWNER directly reads PRIVATE Artifact'
);

select is(
  (
    select count(*)::bigint
    from public.claims
    where id='97000000-0000-4000-8000-000000000321'
  ),
  1::bigint,
  'OWNER directly reads PRIVATE Claim'
);

select is(
  (
    select count(*)::bigint
    from public.k002_metabolism_episodes
    where id=(select value from obs_ids where key='episode')
  ),
  1::bigint,
  'OWNER can read episode row when every non-null private child is readable'
);

select is(
  (
    public.k002_get_metabolism_episode(
      (select value from obs_ids where key='episode')
    ) #>> '{stages,contribution,object_id}'
  ),
  '97000000-0000-4000-8000-000000000301',
  'OWNER getter preserves Contribution ID'
);

select is(
  (
    public.k002_get_metabolism_episode(
      (select value from obs_ids where key='episode')
    ) #>> '{stages,artifact,object_id}'
  ),
  '97000000-0000-4000-8000-000000000311',
  'OWNER getter preserves Artifact ID'
);

select is(
  (
    public.k002_get_metabolism_episode(
      (select value from obs_ids where key='episode')
    ) #>> '{stages,claim,object_id}'
  ),
  '97000000-0000-4000-8000-000000000321',
  'OWNER getter preserves Claim ID'
);

reset role;

select diag(
  'D028_FAIL_CLOSED=PASS'
  || '|UNREADABLE_CHILD->EPISODE_DENY'
  || '|READABLE_CHILDREN->EPISODE_ALLOW'
  || '|NEW_ACL=0'
  || '|VISIBILITY_VOCABULARY_CHANGE=0'
);

select diag(
  'BOUNDARY'
  || '|D028_LOCAL_GREEN!=T12_FULL_PRIVACY_COMPLETE'
  || '|EPISODE_FAIL_CLOSED!=RETENTION_DELETION'
  || '|EPISODE_FAIL_CLOSED!=PUBLICATION'
);

select * from finish();
rollback;

begin;

create extension if not exists pgtap with schema extensions;
select no_plan();

-- D026 normative first-slice visibility regression.
-- This is the same adopted audience matrix that previously produced the
-- expected RED against canonical pre-D026-implementation RLS.
-- PASS here means the local candidate RLS satisfies the adopted matrix for
-- this bounded Contribution / Artifact slice.

-- ---------------------------------------------------------------------------
-- Synthetic identities
-- ---------------------------------------------------------------------------

insert into auth.users(
  id,aud,role,email,raw_app_meta_data,raw_user_meta_data,created_at,updated_at
) values
(
  '95000000-0000-4000-8000-000000000001',
  'authenticated','authenticated','t12-author@test','{}',
  '{"name":"T12 Author"}',now(),now()
),
(
  '95000000-0000-4000-8000-000000000002',
  'authenticated','authenticated','t12-counterparty@test','{}',
  '{"name":"T12 Counterparty"}',now(),now()
),
(
  '95000000-0000-4000-8000-000000000003',
  'authenticated','authenticated','t12-steward@test','{}',
  '{"name":"T12 Steward"}',now(),now()
),
(
  '95000000-0000-4000-8000-000000000004',
  'authenticated','authenticated','t12-outsider@test','{}',
  '{"name":"T12 Outsider"}',now(),now()
);

create temporary table t12_actor_map(
  label text primary key,
  profile_id uuid not null,
  actor_id uuid not null
);

insert into t12_actor_map(label,profile_id,actor_id)
select 'AUTHOR', '95000000-0000-4000-8000-000000000001'::uuid, id
from public.actors
where operator_profile_id='95000000-0000-4000-8000-000000000001'
  and kind='PERSON'
order by created_at,id limit 1;

insert into t12_actor_map(label,profile_id,actor_id)
select 'COUNTERPARTY', '95000000-0000-4000-8000-000000000002'::uuid, id
from public.actors
where operator_profile_id='95000000-0000-4000-8000-000000000002'
  and kind='PERSON'
order by created_at,id limit 1;

insert into t12_actor_map(label,profile_id,actor_id)
select 'STEWARD', '95000000-0000-4000-8000-000000000003'::uuid, id
from public.actors
where operator_profile_id='95000000-0000-4000-8000-000000000003'
  and kind='PERSON'
order by created_at,id limit 1;

insert into t12_actor_map(label,profile_id,actor_id)
select 'OUTSIDER', '95000000-0000-4000-8000-000000000004'::uuid, id
from public.actors
where operator_profile_id='95000000-0000-4000-8000-000000000004'
  and kind='PERSON'
order by created_at,id limit 1;

select is(
  (select count(*)::bigint from t12_actor_map),
  4::bigint,
  'four controlled PERSON actors resolved'
);

-- ---------------------------------------------------------------------------
-- One bounded Project + exact Commitment
-- ---------------------------------------------------------------------------

insert into public.projects(
  id,cell_id,slug,title,summary,current_intent,steward_actor_id,stage,visibility,
  economic_regime,intended_result,rules_and_limits,needs,source_label,
  created_by_profile_id,version,published_at
) values (
  '95000000-0000-4000-8000-000000000101',
  '00000000-0000-4000-8000-00000000c001',
  't12-visibility-observation',
  'T12 visibility observation',
  'Synthetic project used only to observe current visibility RLS semantics.',
  'Observe current read audiences without changing privacy or authority policy.',
  (select actor_id from t12_actor_map where label='STEWARD'),
  'ACTIVE',
  'PRIVATE',
  'VOLUNTARY',
  'Record the current RLS audience matrix.',
  'No external utility, publication, deployment, or authority expansion.',
  array['privacy semantics'],
  'DEMO / SYNTHETIC',
  '95000000-0000-4000-8000-000000000003',
  1,
  null
);

-- Give the steward exactly the current conditions required by can_manage_project:
-- Cell-scope active role assignment + PROJECT_STEWARD project membership.
insert into public.role_assignments(
  id,cell_id,actor_id,role_id,scope_type,scope_id,policy_version_id,
  granted_by_actor_id,valid_from
) values (
  '95000000-0000-4000-8000-000000000111',
  '00000000-0000-4000-8000-00000000c001',
  (select actor_id from t12_actor_map where label='STEWARD'),
  '00000000-0000-4000-8000-00000000c201',
  'CELL',
  '00000000-0000-4000-8000-00000000c001',
  '00000000-0000-4000-8000-00000000c101',
  (select actor_id from t12_actor_map where label='STEWARD'),
  now()
);

insert into public.project_members(project_id,actor_id,role,granted_by_profile_id)
values (
  '95000000-0000-4000-8000-000000000101',
  (select actor_id from t12_actor_map where label='STEWARD'),
  'PROJECT_STEWARD',
  '95000000-0000-4000-8000-000000000003'
);

select ok(
  private.can_manage_project(
    '95000000-0000-4000-8000-000000000101',
    '95000000-0000-4000-8000-000000000003'
  ),
  'steward fixture satisfies current can_manage_project'
);

select ok(
  not private.can_manage_project(
    '95000000-0000-4000-8000-000000000101',
    '95000000-0000-4000-8000-000000000002'
  ),
  'counterparty is not a project manager'
);

insert into public.opportunities(
  id,cell_id,project_id,owner_actor_id,state,visibility,current_version,
  material_version,capacity
) values (
  '95000000-0000-4000-8000-000000000121',
  '00000000-0000-4000-8000-00000000c001',
  '95000000-0000-4000-8000-000000000101',
  (select actor_id from t12_actor_map where label='STEWARD'),
  'OPEN','PROJECT',1,1,1
);

insert into public.opportunity_versions(
  id,opportunity_id,version,title,statement,conditions,expected_result,
  capacity,state,visibility,created_by_actor_id
) values (
  '95000000-0000-4000-8000-000000000122',
  '95000000-0000-4000-8000-000000000121',
  1,
  'T12 bounded work',
  'Synthetic opportunity used only to create one exact Commitment for RLS observation.',
  'No authority beyond this synthetic local test.',
  'One exact accepted Commitment.',
  1,'OPEN','PROJECT',
  (select actor_id from t12_actor_map where label='STEWARD')
);

insert into public.proposals(
  id,cell_id,opportunity_id,proposer_actor_id,state,visibility,
  current_version,material_version
) values (
  '95000000-0000-4000-8000-000000000131',
  '00000000-0000-4000-8000-00000000c001',
  '95000000-0000-4000-8000-000000000121',
  (select actor_id from t12_actor_map where label='AUTHOR'),
  'ACCEPTED','PROJECT',1,1
);

insert into public.proposal_versions(
  id,proposal_id,version,statement,conditions,expected_delivery,
  reward_expectation,created_by_actor_id
) values (
  '95000000-0000-4000-8000-000000000132',
  '95000000-0000-4000-8000-000000000131',
  1,
  'I will provide the synthetic material needed for this local privacy test.',
  'Only the current RLS audience is being observed.',
  'Three Contributions and three Artifacts with distinct visibility labels.',
  'No economic consequence.',
  (select actor_id from t12_actor_map where label='AUTHOR')
);

insert into public.commitments(
  id,cell_id,project_id,opportunity_id,opportunity_version,
  proposal_id,proposal_version,proposer_actor_id,accepted_by_actor_id,
  state,visibility
) values (
  '95000000-0000-4000-8000-000000000141',
  '00000000-0000-4000-8000-00000000c001',
  '95000000-0000-4000-8000-000000000101',
  '95000000-0000-4000-8000-000000000121',
  1,
  '95000000-0000-4000-8000-000000000131',
  1,
  (select actor_id from t12_actor_map where label='AUTHOR'),
  (select actor_id from t12_actor_map where label='COUNTERPARTY'),
  'ACCEPTED','PROJECT'
);

select is(
  (
    select accepted_by_actor_id
    from public.commitments
    where id='95000000-0000-4000-8000-000000000141'
  ),
  (select actor_id from t12_actor_map where label='COUNTERPARTY'),
  'counterparty is an exact party to the Commitment'
);

-- ---------------------------------------------------------------------------
-- Same provenance; only visibility differs.
-- ---------------------------------------------------------------------------

insert into public.contributions(
  id,cell_id,project_id,commitment_id,author_actor_id,
  description,limitations,visibility,sensitivity
) values
(
  '95000000-0000-4000-8000-000000000201',
  '00000000-0000-4000-8000-00000000c001',
  '95000000-0000-4000-8000-000000000101',
  '95000000-0000-4000-8000-000000000141',
  (select actor_id from t12_actor_map where label='AUTHOR'),
  'Synthetic PRIVATE contribution for current-RLS observation.',
  'No semantic policy is adopted by this fixture.',
  'PRIVATE','NORMAL'
),
(
  '95000000-0000-4000-8000-000000000202',
  '00000000-0000-4000-8000-00000000c001',
  '95000000-0000-4000-8000-000000000101',
  '95000000-0000-4000-8000-000000000141',
  (select actor_id from t12_actor_map where label='AUTHOR'),
  'Synthetic PARTIES contribution for current-RLS observation.',
  'No semantic policy is adopted by this fixture.',
  'PARTIES','NORMAL'
),
(
  '95000000-0000-4000-8000-000000000203',
  '00000000-0000-4000-8000-00000000c001',
  '95000000-0000-4000-8000-000000000101',
  '95000000-0000-4000-8000-000000000141',
  (select actor_id from t12_actor_map where label='AUTHOR'),
  'Synthetic PROJECT contribution for current-RLS observation.',
  'No semantic policy is adopted by this fixture.',
  'PROJECT','NORMAL'
);

insert into public.artifacts(
  id,cell_id,project_id,contribution_id,created_by_actor_id,
  kind,uri,digest_algorithm,digest,media_type,size_bytes,
  visibility,sensitivity,retention_class
) values
(
  '95000000-0000-4000-8000-000000000211',
  '00000000-0000-4000-8000-00000000c001',
  '95000000-0000-4000-8000-000000000101',
  '95000000-0000-4000-8000-000000000201',
  (select actor_id from t12_actor_map where label='AUTHOR'),
  'DOCUMENT','urn:cz:t12:private','SHA256',repeat('a',64),'text/plain',10,
  'PRIVATE','NORMAL','PROJECT_LIFETIME'
),
(
  '95000000-0000-4000-8000-000000000212',
  '00000000-0000-4000-8000-00000000c001',
  '95000000-0000-4000-8000-000000000101',
  '95000000-0000-4000-8000-000000000202',
  (select actor_id from t12_actor_map where label='AUTHOR'),
  'DOCUMENT','urn:cz:t12:parties','SHA256',repeat('b',64),'text/plain',10,
  'PARTIES','NORMAL','PROJECT_LIFETIME'
),
(
  '95000000-0000-4000-8000-000000000213',
  '00000000-0000-4000-8000-00000000c001',
  '95000000-0000-4000-8000-000000000101',
  '95000000-0000-4000-8000-000000000203',
  (select actor_id from t12_actor_map where label='AUTHOR'),
  'DOCUMENT','urn:cz:t12:project','SHA256',repeat('c',64),'text/plain',10,
  'PROJECT','NORMAL','PROJECT_LIFETIME'
);

-- ---------------------------------------------------------------------------
-- Policy structure itself: D026 requires visibility-aware read policies.
-- ---------------------------------------------------------------------------

select ok(
  position(
    'visibility'
    in lower(
      (
        select pg_get_expr(polqual,polrelid)
        from pg_policy
        where polrelid='public.contributions'::regclass
          and polname='contributions_read'
      )
    )
  ) > 0,
  'contributions_read policy inspects visibility'
);

select ok(
  position(
    'can_manage_project'
    in lower(
      (
        select pg_get_expr(polqual,polrelid)
        from pg_policy
        where polrelid='public.contributions'::regclass
          and polname='contributions_read'
      )
    )
  ) > 0,
  'contributions_read policy includes can_manage_project'
);

select ok(
  position(
    'visibility'
    in lower(
      (
        select pg_get_expr(polqual,polrelid)
        from pg_policy
        where polrelid='public.artifacts'::regclass
          and polname='artifacts_read'
      )
    )
  ) > 0,
  'artifacts_read policy inspects visibility'
);

-- ---------------------------------------------------------------------------
-- Runtime RLS audience observations.
-- Each identity is tested against PRIVATE / PARTIES / PROJECT.
-- ---------------------------------------------------------------------------

create temporary table t12_observed(
  profile_label text not null,
  object_type text not null,
  visibility text not null,
  visible_count bigint not null,
  primary key(profile_label,object_type,visibility)
);
grant select, insert on t12_observed to authenticated;

-- AUTHOR
select set_config('request.jwt.claim.sub','95000000-0000-4000-8000-000000000001',true);
set local role authenticated;

insert into t12_observed
select 'AUTHOR','CONTRIBUTION',v.visibility,count(c.id)::bigint
from (values ('PRIVATE'),('PARTIES'),('PROJECT')) v(visibility)
left join public.contributions c
  on c.project_id='95000000-0000-4000-8000-000000000101'
 and c.visibility=v.visibility
group by v.visibility;

insert into t12_observed
select 'AUTHOR','ARTIFACT',v.visibility,count(a.id)::bigint
from (values ('PRIVATE'),('PARTIES'),('PROJECT')) v(visibility)
left join public.artifacts a
  on a.project_id='95000000-0000-4000-8000-000000000101'
 and a.visibility=v.visibility
group by v.visibility;

reset role;

-- COUNTERPARTY
select set_config('request.jwt.claim.sub','95000000-0000-4000-8000-000000000002',true);
set local role authenticated;

insert into t12_observed
select 'COUNTERPARTY','CONTRIBUTION',v.visibility,count(c.id)::bigint
from (values ('PRIVATE'),('PARTIES'),('PROJECT')) v(visibility)
left join public.contributions c
  on c.project_id='95000000-0000-4000-8000-000000000101'
 and c.visibility=v.visibility
group by v.visibility;

insert into t12_observed
select 'COUNTERPARTY','ARTIFACT',v.visibility,count(a.id)::bigint
from (values ('PRIVATE'),('PARTIES'),('PROJECT')) v(visibility)
left join public.artifacts a
  on a.project_id='95000000-0000-4000-8000-000000000101'
 and a.visibility=v.visibility
group by v.visibility;

reset role;

-- STEWARD
select set_config('request.jwt.claim.sub','95000000-0000-4000-8000-000000000003',true);
set local role authenticated;

insert into t12_observed
select 'STEWARD','CONTRIBUTION',v.visibility,count(c.id)::bigint
from (values ('PRIVATE'),('PARTIES'),('PROJECT')) v(visibility)
left join public.contributions c
  on c.project_id='95000000-0000-4000-8000-000000000101'
 and c.visibility=v.visibility
group by v.visibility;

insert into t12_observed
select 'STEWARD','ARTIFACT',v.visibility,count(a.id)::bigint
from (values ('PRIVATE'),('PARTIES'),('PROJECT')) v(visibility)
left join public.artifacts a
  on a.project_id='95000000-0000-4000-8000-000000000101'
 and a.visibility=v.visibility
group by v.visibility;

reset role;

-- OUTSIDER
select set_config('request.jwt.claim.sub','95000000-0000-4000-8000-000000000004',true);
set local role authenticated;

insert into t12_observed
select 'OUTSIDER','CONTRIBUTION',v.visibility,count(c.id)::bigint
from (values ('PRIVATE'),('PARTIES'),('PROJECT')) v(visibility)
left join public.contributions c
  on c.project_id='95000000-0000-4000-8000-000000000101'
 and c.visibility=v.visibility
group by v.visibility;

insert into t12_observed
select 'OUTSIDER','ARTIFACT',v.visibility,count(a.id)::bigint
from (values ('PRIVATE'),('PARTIES'),('PROJECT')) v(visibility)
left join public.artifacts a
  on a.project_id='95000000-0000-4000-8000-000000000101'
 and a.visibility=v.visibility
group by v.visibility;

reset role;

-- Normative first-slice policy adopted by Human direction on 2026-09-10.
--
-- PRIVATE  = originator/controller only.
-- PARTIES  = exact parties of the governing Commitment.
-- PROJECT  = originator + exact Commitment parties + legitimate Project steward.
-- Third-party disclosure remains explicit/contextual/material-bound and is not
-- implied by PROJECT visibility.
--
-- Expected RED against current canonical RLS in exactly four aggregate audience
-- cells (Contribution + Artifact are aggregated per cell):
--   COUNTERPARTY / PARTIES
--   COUNTERPARTY / PROJECT
--   STEWARD / PRIVATE
--   STEWARD / PARTIES

create temporary table t12_normative_expected(
  profile_label text not null,
  visibility text not null,
  expected_visible_count bigint not null,
  primary key(profile_label,visibility)
);

insert into t12_normative_expected(profile_label,visibility,expected_visible_count) values
  ('AUTHOR','PRIVATE',2),
  ('AUTHOR','PARTIES',2),
  ('AUTHOR','PROJECT',2),
  ('COUNTERPARTY','PRIVATE',0),
  ('COUNTERPARTY','PARTIES',2),
  ('COUNTERPARTY','PROJECT',2),
  ('STEWARD','PRIVATE',0),
  ('STEWARD','PARTIES',0),
  ('STEWARD','PROJECT',2),
  ('OUTSIDER','PRIVATE',0),
  ('OUTSIDER','PARTIES',0),
  ('OUTSIDER','PROJECT',0);

create temporary table t12_normative_actual as
select profile_label, visibility, sum(visible_count)::bigint as visible_count
from t12_observed
group by profile_label, visibility;

select is(
  (select visible_count from t12_normative_actual where profile_label='AUTHOR' and visibility='PRIVATE'),
  2::bigint,
  'NORMATIVE AUTHOR PRIVATE = READ Contribution+Artifact'
);
select is(
  (select visible_count from t12_normative_actual where profile_label='AUTHOR' and visibility='PARTIES'),
  2::bigint,
  'NORMATIVE AUTHOR PARTIES = READ Contribution+Artifact'
);
select is(
  (select visible_count from t12_normative_actual where profile_label='AUTHOR' and visibility='PROJECT'),
  2::bigint,
  'NORMATIVE AUTHOR PROJECT = READ Contribution+Artifact'
);

select is(
  (select visible_count from t12_normative_actual where profile_label='COUNTERPARTY' and visibility='PRIVATE'),
  0::bigint,
  'NORMATIVE COUNTERPARTY PRIVATE = DENY'
);
select is(
  (select visible_count from t12_normative_actual where profile_label='COUNTERPARTY' and visibility='PARTIES'),
  2::bigint,
  'NORMATIVE COUNTERPARTY PARTIES = READ Contribution+Artifact'
);
select is(
  (select visible_count from t12_normative_actual where profile_label='COUNTERPARTY' and visibility='PROJECT'),
  2::bigint,
  'NORMATIVE COUNTERPARTY PROJECT = READ Contribution+Artifact'
);

select is(
  (select visible_count from t12_normative_actual where profile_label='STEWARD' and visibility='PRIVATE'),
  0::bigint,
  'NORMATIVE STEWARD PRIVATE = DENY'
);
select is(
  (select visible_count from t12_normative_actual where profile_label='STEWARD' and visibility='PARTIES'),
  0::bigint,
  'NORMATIVE STEWARD PARTIES = DENY'
);
select is(
  (select visible_count from t12_normative_actual where profile_label='STEWARD' and visibility='PROJECT'),
  2::bigint,
  'NORMATIVE STEWARD PROJECT = READ Contribution+Artifact'
);

select is(
  (select visible_count from t12_normative_actual where profile_label='OUTSIDER' and visibility='PRIVATE'),
  0::bigint,
  'NORMATIVE OUTSIDER PRIVATE = DENY'
);
select is(
  (select visible_count from t12_normative_actual where profile_label='OUTSIDER' and visibility='PARTIES'),
  0::bigint,
  'NORMATIVE OUTSIDER PARTIES = DENY'
);
select is(
  (select visible_count from t12_normative_actual where profile_label='OUTSIDER' and visibility='PROJECT'),
  0::bigint,
  'NORMATIVE OUTSIDER PROJECT = DENY'
);

select diag(
  E'NORMATIVE DIVERGENCES\n' ||
  coalesce((
    select string_agg(
      e.profile_label || ' | ' || e.visibility ||
      ' | expected=' || e.expected_visible_count ||
      ' | actual=' || a.visible_count,
      E'\n'
      order by e.profile_label,
        case e.visibility when 'PRIVATE' then 1 when 'PARTIES' then 2 else 3 end
    )
    from t12_normative_expected e
    join t12_normative_actual a using(profile_label,visibility)
    where a.visible_count <> e.expected_visible_count
  ),'NONE')
);

-- Human-readable matrix in TAP diagnostics.
select diag(
  E'CURRENT RLS MATRIX\n' ||
  coalesce((
    select string_agg(
      profile_label || ' | ' || object_type || ' | ' || visibility ||
      ' | visible=' || visible_count,
      E'\n'
      order by profile_label,object_type,
        case visibility when 'PRIVATE' then 1 when 'PARTIES' then 2 else 3 end
    )
    from t12_observed
  ),'')
);

select * from finish();
rollback;

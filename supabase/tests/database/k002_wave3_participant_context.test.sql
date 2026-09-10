begin;

create extension if not exists pgtap with schema extensions;
select no_plan();

select has_function(
  'public',
  'k002_get_participant_cell_context',
  array['uuid','uuid'],
  'bounded participant context RPC exists'
);

insert into auth.users(
  id,aud,role,email,raw_app_meta_data,raw_user_meta_data,created_at,updated_at
) values
  ('93000000-0000-4000-8000-000000000001','authenticated','authenticated',
   'k3-inviter@test','{}','{"name":"K3 Inviter"}',now(),now()),
  ('93000000-0000-4000-8000-000000000002','authenticated','authenticated',
   'k3-recipient@test','{}','{"name":"K3 Recipient"}',now(),now()),
  ('93000000-0000-4000-8000-000000000003','authenticated','authenticated',
   'k3-other@test','{}','{"name":"K3 Other"}',now(),now());

create temporary table k3(
  k text primary key,
  u uuid,
  j jsonb,
  n bigint
);

insert into k3(k,u)
select 'inviter',actor_id
from public.actor_memberships
where profile_id='93000000-0000-4000-8000-000000000001'
order by created_at,actor_id
limit 1;

insert into k3(k,u)
select 'recipient',actor_id
from public.actor_memberships
where profile_id='93000000-0000-4000-8000-000000000002'
order by created_at,actor_id
limit 1;

insert into k3(k,u)
select 'other',actor_id
from public.actor_memberships
where profile_id='93000000-0000-4000-8000-000000000003'
order by created_at,actor_id
limit 1;

-- Fixture-only authority for Human A to issue the invitation.
insert into public.role_assignments(
  cell_id,actor_id,role_id,scope_type,scope_id,policy_version_id,granted_by_actor_id
) values (
  '00000000-0000-4000-8000-00000000c001',
  (select u from k3 where k='inviter'),
  '00000000-0000-4000-8000-00000000c201',
  'CELL',
  '00000000-0000-4000-8000-00000000c001',
  '00000000-0000-4000-8000-00000000c101',
  (select u from k3 where k='inviter')
);

-- One PUBLIC project may appear in the bounded projection.
insert into public.projects(
  id,cell_id,slug,title,summary,current_intent,steward_actor_id,stage,visibility,
  economic_regime,intended_result,rules_and_limits,needs,source_label,
  created_by_profile_id,version,published_at
) values (
  '93000000-0000-4000-8000-000000000101',
  '00000000-0000-4000-8000-00000000c001',
  'k002-wave3-public',
  'Wave3 public context',
  'Public project fixture for the bounded participant context test.',
  'Demonstrate only already-public project context to an active participant.',
  (select u from k3 where k='inviter'),
  'OPEN','PUBLIC','VOLUNTARY',
  'A bounded participant can see a public project summary.',
  'No role, delegation, membership, private evidence, or economic authority.',
  array['bounded participant read'],
  'DEMO / SYNTHETIC',
  '93000000-0000-4000-8000-000000000001',
  1,
  now()
);

-- A PRIVATE project must never appear in the participant projection.
insert into public.projects(
  id,cell_id,slug,title,summary,current_intent,steward_actor_id,stage,visibility,
  economic_regime,intended_result,rules_and_limits,needs,source_label,
  created_by_profile_id,version,published_at
) values (
  '93000000-0000-4000-8000-000000000102',
  '00000000-0000-4000-8000-00000000c001',
  'k002-wave3-private',
  'WAVE3-PRIVATE-SECRET-MARKER',
  'Private project fixture that must not cross the participant read boundary.',
  'This private content must not be serialized into the bounded context.',
  (select u from k3 where k='inviter'),
  'OPEN','PRIVATE','VOLUNTARY',
  'Remain invisible to participation-only read access.',
  'Private means private for this test.',
  array['privacy'],
  'DEMO / SYNTHETIC',
  '93000000-0000-4000-8000-000000000001',
  1,
  null
);

insert into k3(k,n)
select 'roles_before',count(*)
from public.role_assignments
where actor_id=(select u from k3 where k='recipient');

insert into k3(k,n)
select 'delegations_before',count(*)
from public.delegations
where delegate_actor_id=(select u from k3 where k='recipient');

insert into k3(k,n)
select 'members_before',count(*)
from public.project_members
where actor_id=(select u from k3 where k='recipient');

select set_config(
  'request.jwt.claim.sub',
  '93000000-0000-4000-8000-000000000001',
  true
);

insert into k3(k,j)
select 'invite',public.k002_create_cell_invitation(
  (select u from k3 where k='inviter'),
  '00000000-0000-4000-8000-00000000c001',
  'K3 intended recipient',
  'Join a bounded shared Cell rehearsal without receiving implicit authority.',
  now()+interval '1 day',
  '93000000-0000-4000-8000-000000000201',
  'k3-participation-invite'
);

select set_config(
  'request.jwt.claim.sub',
  '93000000-0000-4000-8000-000000000002',
  true
);

insert into k3(k,j)
select 'accept',public.k002_accept_cell_invitation(
  (select u from k3 where k='recipient'),
  (select j->>'bearer_token' from k3 where k='invite'),
  'I explicitly consent to bounded Cell participation.',
  '93000000-0000-4000-8000-000000000202',
  'k3-participation-accept'
);

select is(
  (select j->>'status' from k3 where k='accept'),
  'ACTIVE',
  'recipient reaches ACTIVE participation'
);

select is(
  (select count(*) from public.role_assignments
   where actor_id=(select u from k3 where k='recipient')),
  (select n from k3 where k='roles_before'),
  'acceptance grants no role'
);

select is(
  (select count(*) from public.delegations
   where delegate_actor_id=(select u from k3 where k='recipient')),
  (select n from k3 where k='delegations_before'),
  'acceptance grants no delegation'
);

select is(
  (select count(*) from public.project_members
   where actor_id=(select u from k3 where k='recipient')),
  (select n from k3 where k='members_before'),
  'acceptance grants no project membership'
);

insert into k3(k,j)
select 'context',public.k002_get_participant_cell_context(
  (select u from k3 where k='recipient'),
  ((select j->>'participation_id' from k3 where k='accept')::uuid)
);

select is(
  (select j->'cell'->>'id' from k3 where k='context'),
  '00000000-0000-4000-8000-00000000c001',
  'active participant can read bounded Cell identity without Cell membership'
);

select is(
  (select j->'participation'->>'status' from k3 where k='context'),
  'ACTIVE',
  'context reports only the caller own ACTIVE participation'
);

select is(
  (select j->'invitation'->>'purpose' from k3 where k='context'),
  'Join a bounded shared Cell rehearsal without receiving implicit authority.',
  'context explains why the participant is here'
);

select is(
  (select j->'policy'->>'state' from k3 where k='context'),
  'ACTIVE',
  'context exposes policy metadata without policy rules'
);

select is(
  (
    select count(*)::bigint
    from jsonb_array_elements((select j->'projects' from k3 where k='context')) p
    where p->>'id' = '93000000-0000-4000-8000-000000000101'
      and p->>'title' = 'Wave3 public context'
      and p->>'visibility' = 'PUBLIC'
  ),
  1::bigint,
  'Wave3 PUBLIC fixture is present exactly once without assuming an empty seeded Cell'
);

select is(
  (
    select count(*)::bigint
    from jsonb_array_elements((select j->'projects' from k3 where k='context')) p
    where coalesce(p->>'visibility','') <> 'PUBLIC'
  ),
  0::bigint,
  'participant projection serializes no non-PUBLIC project summaries'
);

select ok(
  position('WAVE3-PRIVATE-SECRET-MARKER' in
    (select j::text from k3 where k='context')) = 0,
  'private project content does not cross the projection'
);

select ok(
  not ((select j from k3 where k='context') ? 'role_assignments')
  and not ((select j from k3 where k='context') ? 'delegations')
  and not ((select j from k3 where k='context') ? 'economy'),
  'projection contains no role, delegation, or economy collections'
);

select is(
  ((select j->'boundaries'->>'participation_grants_membership'
    from k3 where k='context')::boolean),
  false,
  'bounded read does not turn participation into membership'
);

select is(
  ((select j->'boundaries'->>'participation_grants_role'
    from k3 where k='context')::boolean),
  false,
  'bounded read grants no role'
);

select is(
  ((select j->'boundaries'->>'participation_grants_delegation'
    from k3 where k='context')::boolean),
  false,
  'bounded read grants no delegation'
);

select is(
  ((select j->'boundaries'->>'participation_grants_authority'
    from k3 where k='context')::boolean),
  false,
  'bounded read grants no authority'
);

select is(
  ((select j->'boundaries'->>'read_access_grants_authority'
    from k3 where k='context')::boolean),
  false,
  'read access is explicitly distinct from authority'
);

select is(
  (select count(*) from public.role_assignments
   where actor_id=(select u from k3 where k='recipient')),
  (select n from k3 where k='roles_before'),
  'reading context creates no role as a side effect'
);

select set_config(
  'request.jwt.claim.sub',
  '93000000-0000-4000-8000-000000000003',
  true
);

select throws_ok(
  format(
    'select public.k002_get_participant_cell_context(%L::uuid,%L::uuid)',
    (select u from k3 where k='recipient'),
    (select j->>'participation_id' from k3 where k='accept')
  ),
  'CZ403:ACTOR_CONTROL_REQUIRED',
  'another authenticated profile cannot read through the recipient actor'
);

select set_config(
  'request.jwt.claim.sub',
  '93000000-0000-4000-8000-000000000002',
  true
);

insert into k3(k,j)
select 'leave',public.k002_leave_cell_participation(
  (select u from k3 where k='recipient'),
  ((select j->>'participation_id' from k3 where k='accept')::uuid),
  '93000000-0000-4000-8000-000000000203',
  'k3-participation-leave'
);

select is(
  (select j->>'status' from k3 where k='leave'),
  'LEFT',
  'recipient can leave own participation'
);

select throws_ok(
  format(
    'select public.k002_get_participant_cell_context(%L::uuid,%L::uuid)',
    (select u from k3 where k='recipient'),
    (select j->>'participation_id' from k3 where k='accept')
  ),
  'CZ403:ACTIVE_PARTICIPATION_REQUIRED',
  'participant context fails closed after leave'
);

select is(
  (select count(*) from public.role_assignments
   where actor_id=(select u from k3 where k='recipient')),
  (select n from k3 where k='roles_before'),
  'leave does not rewrite role state'
);

select is(
  (select count(*) from public.delegations
   where delegate_actor_id=(select u from k3 where k='recipient')),
  (select n from k3 where k='delegations_before'),
  'leave does not rewrite delegation state'
);

select * from finish();
rollback;

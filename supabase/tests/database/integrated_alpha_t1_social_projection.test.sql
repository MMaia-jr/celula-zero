begin;

create extension if not exists pgtap with schema extensions;
select no_plan();

select has_table('public', 'follows', 'Follow relation table exists');
select has_function(
  'public',
  't1_follow_target',
  array['uuid','text','uuid','uuid','text'],
  'bounded Follow command exists'
);
select has_function(
  'public',
  't1_unfollow_target',
  array['uuid','text','uuid','uuid','text'],
  'bounded Unfollow command exists'
);
select has_function(
  'public',
  't1_list_social_activity',
  array['boolean','integer'],
  'semantic Social Projection function exists'
);
select has_function(
  'public',
  't1_list_my_follows',
  array[]::text[],
  'private-by-default active Follow projection exists'
);

select ok(
  not has_table_privilege('anon', 'public.follows', 'SELECT'),
  'anon has no direct SELECT privilege on Follow relations'
);

select ok(
  has_table_privilege('authenticated', 'public.follows', 'SELECT'),
  'authenticated has SELECT privilege; RLS governs visible rows'
);

insert into auth.users(
  id, aud, role, email, raw_app_meta_data, raw_user_meta_data, created_at, updated_at
) values
(
  '95000000-0000-4000-8000-000000000001',
  'authenticated',
  'authenticated',
  't1-social-steward@example.test',
  '{"provider":"email","providers":["email"]}',
  '{"name":"T1 Social Steward"}',
  now(),
  now()
),
(
  '95000000-0000-4000-8000-000000000002',
  'authenticated',
  'authenticated',
  't1-social-follower@example.test',
  '{"provider":"email","providers":["email"]}',
  '{"name":"T1 Social Follower"}',
  now(),
  now()
);

select set_config(
  'request.jwt.claim.sub',
  '95000000-0000-4000-8000-000000000001',
  true
);

select lives_ok(
  $$
    select public.update_my_profile(
      'social-steward',
      'T1 Social Steward',
      'Public profile for bounded Follow testing.',
      'PUBLIC'
    )
  $$,
  'target Person can explicitly choose a public Profile'
);

select set_config(
  'cz.t13.steward_actor',
  (
    select actor_id::text
    from public.actor_memberships
    where profile_id = '95000000-0000-4000-8000-000000000001'
      and role = 'OWNER'
    order by created_at
    limit 1
  ),
  true
);

select set_config(
  'cz.t13.follower_actor',
  (
    select actor_id::text
    from public.actor_memberships
    where profile_id = '95000000-0000-4000-8000-000000000002'
      and role = 'OWNER'
    order by created_at
    limit 1
  ),
  true
);

create temporary table t1_social_fixture(
  key text primary key,
  value uuid,
  result jsonb
);

insert into t1_social_fixture(key, result)
select 'project', to_jsonb(x)
from public.create_project_atomic(
  'Projeto T1 Social Projection',
  'projeto-t1-social-projection',
  'Projeto público para testar Follow e Activity derivados de coordenação.',
  'Permitir que outra identidade acompanhe contexto sem transformar visibilidade em reputação.',
  'Preservar Follow privado e feed sem payload bruto.',
  'Feed semântico navegável e projeção ActivityStreams derivada.',
  'Nenhum follower count e nenhum vazamento de Proposal privada.',
  array['legacy-summary-label'],
  'VOLUNTARY',
  'OPEN',
  true
) x;

update t1_social_fixture
set value = (result ->> 'project_id')::uuid
where key = 'project';

select set_config(
  'cz.t13.project_id',
  (select value::text from t1_social_fixture where key = 'project'),
  true
);

insert into t1_social_fixture(key, result)
select 'need', public.t1_create_need(
  current_setting('cz.t13.steward_actor')::uuid,
  current_setting('cz.t13.project_id')::uuid,
  'Observar atividade sem ruído',
  'Precisamos acompanhar eventos de coordenação sem criar um sistema de posts.',
  'O feed deve nascer de domain_events e respeitar visibilidade.',
  '96000000-0000-4000-8000-000000000001',
  't1-social-need-create'
);

update t1_social_fixture
set value = (result ->> 'need_id')::uuid
where key = 'need';

select set_config(
  'cz.t13.need_id',
  (select value::text from t1_social_fixture where key = 'need'),
  true
);

update t1_social_fixture
set result = public.t1_publish_need(
  current_setting('cz.t13.steward_actor')::uuid,
  value,
  1,
  '96000000-0000-4000-8000-000000000002',
  't1-social-need-publish'
)
where key = 'need';

insert into t1_social_fixture(key, result)
select 'opportunity', public.t1_create_opportunity_for_need(
  current_setting('cz.t13.steward_actor')::uuid,
  current_setting('cz.t13.project_id')::uuid,
  current_setting('cz.t13.need_id')::uuid,
  'Revisar o feed social',
  'Uma segunda identidade deve acompanhar eventos derivados e navegar ao contexto.',
  'Sem posts arbitrários, sem follower counts e sem exposição de Proposal privada.',
  'Um feed semântico reconstruível.',
  2,
  '96000000-0000-4000-8000-000000000003',
  't1-social-opportunity-create'
);

update t1_social_fixture
set value = (result ->> 'opportunity_id')::uuid
where key = 'opportunity';

select set_config(
  'cz.t13.opportunity_id',
  (select value::text from t1_social_fixture where key = 'opportunity'),
  true
);

update t1_social_fixture
set result = public.b1_publish_opportunity(
  current_setting('cz.t13.steward_actor')::uuid,
  value,
  2,
  '96000000-0000-4000-8000-000000000004',
  't1-social-opportunity-publish'
)
where key = 'opportunity';

select set_config(
  'request.jwt.claim.sub',
  '95000000-0000-4000-8000-000000000002',
  true
);

select lives_ok(
  $$
    select public.t1_follow_target(
      current_setting('cz.t13.follower_actor')::uuid,
      'ACTOR',
      current_setting('cz.t13.steward_actor')::uuid,
      '96000000-0000-4000-8000-000000000005',
      't1-social-follow-person'
    )
  $$,
  'controlled Person can privately follow a public Person'
);

select lives_ok(
  $$
    select public.t1_follow_target(
      current_setting('cz.t13.follower_actor')::uuid,
      'PROJECT',
      current_setting('cz.t13.project_id')::uuid,
      '96000000-0000-4000-8000-000000000006',
      't1-social-follow-project'
    )
  $$,
  'controlled Person can privately follow a public Project'
);

select lives_ok(
  $$
    select public.t1_follow_target(
      current_setting('cz.t13.follower_actor')::uuid,
      'NEED',
      current_setting('cz.t13.need_id')::uuid,
      '96000000-0000-4000-8000-000000000007',
      't1-social-follow-need'
    )
  $$,
  'controlled Person can privately follow a public Need'
);

select throws_ok(
  $$
    select public.t1_follow_target(
      current_setting('cz.t13.follower_actor')::uuid,
      'ACTOR',
      current_setting('cz.t13.follower_actor')::uuid,
      '96000000-0000-4000-8000-000000000008',
      't1-social-self-follow'
    )
  $$,
  'P0001',
  'CZ409:SELF_FOLLOW_DENIED',
  'self-follow is denied'
);

select is(
  (select count(*)::integer from public.t1_list_my_follows()),
  3,
  'the follower sees exactly its three active Follow relations'
);

select is(
  (
    select count(*)::integer
    from public.role_assignments
    where actor_id = current_setting('cz.t13.follower_actor')::uuid
  ),
  0,
  'Follow grants no coordination role'
);

select is(
  (
    select count(*)::integer
    from public.delegations
    where delegate_actor_id = current_setting('cz.t13.follower_actor')::uuid
  ),
  0,
  'Follow grants no delegation'
);

select ok(
  (
    select count(*) > 0
    from public.t1_list_social_activity(true, 100)
    where event_type = 'NEED_PUBLISHED'
      and need_id = current_setting('cz.t13.need_id')::uuid
  ),
  'following feed includes prior visible Need activity in followed context'
);

select ok(
  (
    select count(*) > 0
    from public.t1_list_social_activity(true, 100)
    where event_type = 'OPPORTUNITY_PUBLISHED'
      and opportunity_id = current_setting('cz.t13.opportunity_id')::uuid
  ),
  'following feed includes Opportunity activity in followed context'
);

insert into t1_social_fixture(key, result)
select 'proposal', public.b1_submit_public_proposal(
  current_setting('cz.t13.follower_actor')::uuid,
  current_setting('cz.t13.opportunity_id')::uuid,
  'Posso revisar o feed e verificar se a navegação preserva o contexto.',
  'A Proposal é PROJECT-visible e não deve aparecer na projeção anônima.',
  'Entrego observações reproduzíveis.',
  'Voluntário.',
  '96000000-0000-4000-8000-000000000009',
  't1-social-proposal-submit'
);

update t1_social_fixture
set value = (result ->> 'proposal_id')::uuid
where key = 'proposal';

select ok(
  (
    select count(*) > 0
    from public.t1_list_social_activity(false, 100)
    where event_type = 'PROPOSAL_SUBMITTED'
  ),
  'proposal author sees its own PROJECT-visible Proposal activity'
);

select ok(
  (
    select count(*) > 0
    from public.t1_list_social_activity(false, 100)
    where event_type = 'FOLLOW_STARTED'
  ),
  'follower sees its own private Follow events'
);

select set_config(
  'request.jwt.claim.sub',
  '95000000-0000-4000-8000-000000000001',
  true
);
set local role authenticated;

select is(
  (
    select count(*)::integer
    from public.follows
    where follower_actor_id = current_setting('cz.t13.follower_actor')::uuid
  ),
  0,
  'target/steward cannot enumerate another Person follow relations through RLS'
);

reset role;

select set_config('request.jwt.claim.sub', '', true);
set local role anon;

select ok(
  coalesce(
    (
      select bool_and(visibility = 'PUBLIC')
      from public.t1_list_social_activity(false, 100)
    ),
    false
  ),
  'anonymous Social Projection contains PUBLIC events only'
);

select is(
  (
    select count(*)::integer
    from public.t1_list_social_activity(false, 100)
    where event_type = 'PROPOSAL_SUBMITTED'
  ),
  0,
  'anonymous Social Projection does not expose PROJECT-visible Proposal activity'
);

select is(
  (
    select count(*)::integer
    from public.t1_list_social_activity(false, 100)
    where event_type in ('FOLLOW_STARTED', 'FOLLOW_ENDED')
  ),
  0,
  'anonymous Social Projection does not expose private Follow activity'
);

reset role;

select set_config(
  'request.jwt.claim.sub',
  '95000000-0000-4000-8000-000000000002',
  true
);

select lives_ok(
  $$
    select public.t1_unfollow_target(
      current_setting('cz.t13.follower_actor')::uuid,
      'ACTOR',
      current_setting('cz.t13.steward_actor')::uuid,
      '96000000-0000-4000-8000-000000000010',
      't1-social-unfollow-person'
    )
  $$,
  'follower can end its own Follow relation'
);

select is(
  (select count(*)::integer from public.t1_list_my_follows()),
  2,
  'ended Follow is no longer active while other Follow relations remain'
);

select ok(
  (
    select count(*) > 0
    from public.t1_list_social_activity(false, 100)
    where event_type = 'FOLLOW_ENDED'
  ),
  'ended Follow remains reconstructible as a private domain event'
);

select * from finish();
rollback;

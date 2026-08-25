begin;

create extension if not exists pgtap with schema extensions;
select no_plan();

select has_column('public', 'profiles', 'handle', 'profile has handle');
select has_column('public', 'profiles', 'bio', 'profile has bio');
select has_column('public', 'profiles', 'visibility', 'profile has visibility');
select has_function(
  'public',
  'update_my_profile',
  array['text','text','text','text'],
  'authenticated profile update command exists'
);
select has_function(
  'public',
  'get_public_profile',
  array['text'],
  'bounded public profile projection exists'
);

insert into auth.users(
  id, aud, role, email, raw_app_meta_data, raw_user_meta_data, created_at, updated_at
) values
(
  '81000000-0000-4000-8000-000000000001',
  'authenticated',
  'authenticated',
  'profile-alpha-one@example.test',
  '{"provider":"email","providers":["email"]}',
  '{"name":"Profile Alpha One"}',
  now(),
  now()
),
(
  '81000000-0000-4000-8000-000000000002',
  'authenticated',
  'authenticated',
  'profile-alpha-two@example.test',
  '{"provider":"email","providers":["email"]}',
  '{"name":"Profile Alpha Two"}',
  now(),
  now()
);

select is(
  (select visibility from public.profiles where id = '81000000-0000-4000-8000-000000000001'),
  'PRIVATE',
  'new Profile is private by default'
);

select is(
  (select handle::text from public.profiles where id = '81000000-0000-4000-8000-000000000001'),
  null,
  'new Profile has no public handle by default'
);

select set_config('request.jwt.claim.sub', '81000000-0000-4000-8000-000000000001', true);

select is(
  public.update_my_profile(
    'Alpha_One',
    'Alice Example',
    'Frontend developer interested in bounded coordination work.',
    'PUBLIC'
  ) ->> 'handle',
  'alpha_one',
  'handle is normalized to lowercase'
);

select is(
  (select visibility from public.profiles where id = '81000000-0000-4000-8000-000000000001'),
  'PUBLIC',
  'profile publication is explicit'
);

select is(
  (
    select a.name
    from public.actor_memberships am
    join public.actors a on a.id = am.actor_id
    where am.profile_id = '81000000-0000-4000-8000-000000000001'
      and am.role = 'OWNER'
      and a.kind = 'PERSON'
    order by am.created_at
    limit 1
  ),
  'Alice Example',
  'primary PERSON actor label follows Profile display name without merging objects'
);

select is(
  (
    select display_name
    from public.get_public_profile('ALPHA_ONE')
  ),
  'Alice Example',
  'public projection resolves handle case-insensitively'
);

select is(
  (
    select bio
    from public.get_public_profile('alpha_one')
  ),
  'Frontend developer interested in bounded coordination work.',
  'public projection exposes only chosen profile bio'
);

select is(
  (select count(*)::integer from public.pilot_memberships where profile_id = '81000000-0000-4000-8000-000000000001'),
  0,
  'publishing a Profile grants no pilot membership'
);

select is(
  (
    select count(*)::integer
    from public.role_assignments ra
    join public.actor_memberships am on am.actor_id = ra.actor_id
    where am.profile_id = '81000000-0000-4000-8000-000000000001'
  ),
  0,
  'publishing a Profile grants no coordination role'
);

select set_config('request.jwt.claim.sub', '81000000-0000-4000-8000-000000000002', true);

select throws_ok(
  $$select public.update_my_profile(
    'ALPHA_ONE',
    'Bob Example',
    'Trying to reuse another public handle.',
    'PUBLIC'
  )$$,
  'P0001',
  'CZ409:HANDLE_TAKEN',
  'public handle is unique case-insensitively'
);

select set_config('request.jwt.claim.sub', '81000000-0000-4000-8000-000000000001', true);

select is(
  public.update_my_profile(
    'alpha_one',
    'Alice Example',
    'Now private again.',
    'PRIVATE'
  ) ->> 'visibility',
  'PRIVATE',
  'owner can make own Profile private again'
);

select is(
  (select count(*)::integer from public.get_public_profile('alpha_one')),
  0,
  'private Profile disappears from public projection'
);

select throws_ok(
  $$select public.update_my_profile(
    '',
    'Alice Example',
    'Public profile without a handle must fail.',
    'PUBLIC'
  )$$,
  'P0001',
  'CZ422:PUBLIC_HANDLE_REQUIRED',
  'public Profile requires a handle'
);

select * from finish();

rollback;

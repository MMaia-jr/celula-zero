begin;

create extension if not exists pgtap with schema extensions;

select plan(12);

insert into auth.users(
  id,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_user_meta_data
)
values (
  '97000000-0000-4000-8000-000000000001',
  'remote-upgrade-compat@example.test',
  '',
  now(),
  '{"name":"Remote Upgrade Compat Human"}'
);

create temporary table remote_upgrade_fixture(
  key text primary key,
  value uuid
);

insert into remote_upgrade_fixture(key, value)
select
  'actor',
  actor_id
from public.actor_memberships
where profile_id = '97000000-0000-4000-8000-000000000001'
  and role = 'OWNER'
limit 1;

select set_config(
  'request.jwt.claim.sub',
  '97000000-0000-4000-8000-000000000001',
  true
);

insert into remote_upgrade_fixture(key, value)
select
  'project',
  project_id
from public.create_project_atomic(
  'Remote upgrade compat project',
  'remote-upgrade-compat-project',
  'Projeto sintético para validar invariantes da correção de compatibilidade.',
  'Preservar fronteiras de identidade e autoridade durante upgrades incrementais.',
  'Validar a semântica canônica atual sem confundir fresh schema com upgrade legado.',
  'Uma fixture atribuível com Cell membership e stewardship contextual.',
  'Teste local e descartável; sem utilidade externa ou produção inferida.',
  array['compatibilidade de migration'],
  'VOLUNTARY',
  'ACTIVE',
  false
);

insert into remote_upgrade_fixture(key, value)
select
  'cell',
  cell_id
from public.projects
where id = (
  select value
  from remote_upgrade_fixture
  where key = 'project'
);

select is(
  (
    select count(*)::integer
    from public.role_definitions rd
    where rd.cell_id = (
      select value from remote_upgrade_fixture where key = 'cell'
    )
      and rd.code = 'CELL_MEMBER'
  ),
  1,
  'fixture Cell has one CELL_MEMBER role'
);

select is(
  (
    select count(*)::integer
    from public.role_capabilities rc
    join public.role_definitions rd on rd.id = rc.role_id
    where rd.cell_id = (
      select value from remote_upgrade_fixture where key = 'cell'
    )
      and rd.code = 'CELL_MEMBER'
  ),
  0,
  'CELL_MEMBER remains zero-capability'
);

select is(
  (
    select count(*)::integer
    from public.role_assignments ra
    join public.role_definitions rd on rd.id = ra.role_id
    where ra.actor_id = (
      select value from remote_upgrade_fixture where key = 'actor'
    )
      and ra.cell_id = (
        select value from remote_upgrade_fixture where key = 'cell'
      )
      and ra.scope_type = 'CELL'
      and ra.scope_id = (
        select value from remote_upgrade_fixture where key = 'cell'
      )
      and rd.code = 'CELL_MEMBER'
      and ra.revoked_at is null
      and (ra.valid_until is null or ra.valid_until > now())
  ),
  1,
  'new participant receives explicit zero-capability Cell membership'
);

select ok(
  private.can_manage_project(
    (select value from remote_upgrade_fixture where key = 'project'),
    '97000000-0000-4000-8000-000000000001'
  ),
  'fresh canonical project is manageable by its human steward'
);

select is(
  (
    select count(*)::integer
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.prosecdef
      and has_function_privilege('anon', p.oid, 'EXECUTE')
      and p.oid not in (
        'public.get_public_profile(text)'::regprocedure,
        'public.list_public_profiles()'::regprocedure,
        'public.get_public_profile_by_actor(uuid)'::regprocedure,
        'public.t1_list_social_activity(boolean,integer)'::regprocedure,
        'public.t2_list_social_activity(boolean,integer)'::regprocedure
      )
  ),
  0,
  'anon cannot execute non-allowlisted public SECURITY DEFINER functions'
);

select ok(
  has_function_privilege(
    'anon',
    'public.get_public_profile(text)'::regprocedure,
    'EXECUTE'
  ),
  'get_public_profile remains public'
);

select ok(
  has_function_privilege(
    'anon',
    'public.list_public_profiles()'::regprocedure,
    'EXECUTE'
  ),
  'list_public_profiles remains public'
);

select ok(
  has_function_privilege(
    'anon',
    'public.get_public_profile_by_actor(uuid)'::regprocedure,
    'EXECUTE'
  ),
  'get_public_profile_by_actor remains public'
);

select ok(
  has_function_privilege(
    'anon',
    'public.t1_list_social_activity(boolean,integer)'::regprocedure,
    'EXECUTE'
  ),
  'T1 social projection remains public'
);

select ok(
  has_function_privilege(
    'anon',
    'public.t2_list_social_activity(boolean,integer)'::regprocedure,
    'EXECUTE'
  ),
  'T2 social projection remains public'
);

select ok(
  not exists (
    select 1
    from pg_default_acl d
    join pg_namespace n on n.oid = d.defaclnamespace
    cross join lateral aclexplode(d.defaclacl) acl
    where d.defaclrole = 'postgres'::regrole
      and n.nspname = 'public'
      and d.defaclobjtype = 'f'
      and acl.grantee = 'anon'::regrole
      and acl.privilege_type = 'EXECUTE'
  ),
  'future postgres public functions do not default to anon EXECUTE'
);

select ok(
  not exists (
    select 1
    from pg_default_acl d
    join pg_namespace n on n.oid = d.defaclnamespace
    cross join lateral aclexplode(d.defaclacl) acl
    where d.defaclrole = 'postgres'::regrole
      and n.nspname = 'public'
      and d.defaclobjtype = 'f'
      and acl.grantee = 0
      and acl.privilege_type = 'EXECUTE'
  ),
  'future postgres public functions do not default to PUBLIC EXECUTE'
);

select * from finish();

rollback;

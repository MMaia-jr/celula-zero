begin;

create extension if not exists pgtap with schema extensions;
select plan(23);

select has_table('public', 'projects', 'projects exists');
select has_table('public', 'project_intents', 'project_intents exists');
select has_table('public', 'events', 'events exists');
select has_function('public', 'create_project_atomic', array['text','text','text','text','text','text','text','text[]','text','text','boolean'], 'atomic project function exists');
select has_function('public', 'reconcile_project', array['uuid'], 'reconciler exists');

select ok((select relrowsecurity from pg_class where oid = 'public.projects'::regclass), 'projects RLS enabled');
select ok((select relrowsecurity from pg_class where oid = 'public.project_intents'::regclass), 'intents RLS enabled');
select ok((select relrowsecurity from pg_class where oid = 'public.events'::regclass), 'events RLS enabled');
select is((select count(*)::integer from pg_policies where schemaname = 'public' and tablename = 'projects'), 1, 'projects have explicit read policy only');

insert into public.pilot_invites(email, label) values
  ('pilot-a@example.test', 'pgTAP pilot A'),
  ('pilot-b@example.test', 'pgTAP pilot B');
insert into auth.users(id, aud, role, email, raw_app_meta_data, raw_user_meta_data, created_at, updated_at) values
  (
    '10000000-0000-4000-8000-000000000001', 'authenticated', 'authenticated', 'pilot-a@example.test',
    '{"provider":"email","providers":["email"]}', '{"name":"Piloto A"}', now(), now()
  ),
  (
    '10000000-0000-4000-8000-000000000002', 'authenticated', 'authenticated', 'pilot-b@example.test',
    '{"provider":"email","providers":["email"]}', '{"name":"Piloto B"}', now(), now()
  );

set local role authenticated;
set local request.jwt.claim.sub = '10000000-0000-4000-8000-000000000001';
select lives_ok(
  $$select * from public.create_project_atomic(
    'Projeto persistente', 'projeto-persistente',
    'Um projeto criado pelo teste adversarial do Gate 1.',
    'Preservar literalmente esta intenção original no banco de dados.',
    'Criar um projeto público com autorização e trajetória reconciliável.',
    'Uma página pública reproduzível e exportável.',
    'Sem movimentação financeira e sem escrita pública irrestrita.',
    array['auditoria', 'design'], 'VOLUNTARY', 'OPEN', true
  )$$,
  'active pilot creates a project atomically'
);
reset role;

select is((select count(*)::integer from public.projects where slug = 'projeto-persistente'), 1, 'material project created once');
select is((select count(*)::integer from public.project_intents i join public.projects p on p.id = i.project_id where p.slug = 'projeto-persistente'), 2, 'original and interpretation created');
select is((select count(*)::integer from public.events e join public.projects p on p.id = e.project_id where p.slug = 'projeto-persistente'), 2, 'creation and publication events created');
select is((select public.reconcile_project(id) from public.projects where slug = 'projeto-persistente'), '{}'::text[], 'material state reconciles with events');

select throws_ok(
  $$update public.project_intents set content = 'Tentativa de sobrescrever conteúdo original com material suficientemente longo.' where project_id = (select id from public.projects where slug = 'projeto-persistente') and kind = 'ORIGINAL'$$,
  '23000', 'project_intents is append-only', 'original intent cannot be overwritten'
);
select throws_ok(
  $$delete from public.events where project_id = (select id from public.projects where slug = 'projeto-persistente')$$,
  '23000', 'events is append-only', 'events cannot be deleted'
);

insert into public.projects(
  id, slug, title, summary, current_intent, steward_actor_id, stage, visibility,
  economic_regime, intended_result, rules_and_limits, needs, source_label,
  created_by_profile_id
) values (
  '30000000-0000-4000-8000-000000000002', 'draft-do-piloto-b', 'Draft do Piloto B',
  'Um draft privado usado apenas para testar isolamento entre participantes.',
  'Manter o projeto invisível para qualquer outro usuário autenticado.',
  (select actor_id from public.actor_memberships where profile_id = '10000000-0000-4000-8000-000000000002' limit 1), 'DRAFT', 'PRIVATE', 'VOLUNTARY',
  'Um teste de RLS adversarial que retorne zero linhas.',
  'Somente o steward pode ler este registro privado.', array['teste'], 'PILOT',
  '10000000-0000-4000-8000-000000000002'
);
insert into public.project_members(project_id, actor_id, role, granted_by_profile_id) values (
  '30000000-0000-4000-8000-000000000002',
  (select actor_id from public.actor_memberships where profile_id = '10000000-0000-4000-8000-000000000002' limit 1),
  'PROJECT_STEWARD', '10000000-0000-4000-8000-000000000002'
);

set local role authenticated;
set local request.jwt.claim.sub = '10000000-0000-4000-8000-000000000001';
select is((select count(*)::integer from public.projects where slug = 'draft-do-piloto-b'), 0, 'pilot A cannot read pilot B draft');
select throws_ok(
  $$insert into public.projects(slug, title, summary, current_intent, steward_actor_id, stage, visibility, economic_regime, intended_result, rules_and_limits, needs, source_label) values ('direct-write', 'Direct write', 'Tentativa direta de escrita sem função transacional.', 'Esta escrita deve ser bloqueada pela ausência de grant.', (select actor_id from public.actor_memberships where profile_id = auth.uid() limit 1), 'OPEN', 'PUBLIC', 'VOLUNTARY', 'Bloquear a escrita direta.', 'Somente RPC transacional.', array['teste'], 'PILOT')$$,
  '42501', null, 'direct table write is denied'
);
reset role;

set local role anon;
select ok((select count(*) from public.projects where slug = 'projeto-persistente') = 1, 'anonymous visitor reads published project');
select ok((select count(*) from public.projects where slug = 'draft-do-piloto-b') = 0, 'anonymous visitor cannot read private draft');
reset role;

set local role authenticated;
set local request.jwt.claim.sub = '10000000-0000-4000-8000-000000000099';
select throws_ok(
  $$select * from public.create_project_atomic(
    'Sem convite ativo', 'sem-convite-ativo', 'Este projeto não deve ser criado por usuário sem convite.',
    'Uma intenção original que deve ser revertida integralmente.',
    'Uma interpretação que não deve alcançar estado material.', 'Nada deve persistir.',
    'O acesso depende de convite ativo.', array['teste'], 'VOLUNTARY', 'OPEN', true
  )$$,
  '42501', 'active pilot invite required', 'uninvited user cannot create project'
);
reset role;

select is((select count(*)::integer from public.projects where slug = 'sem-convite-ativo'), 0, 'failed authorization leaves no material project');
select is((select count(*)::integer from public.events e join public.projects p on p.id = e.project_id where p.slug = 'sem-convite-ativo'), 0, 'failed authorization leaves no orphan event');

select * from finish();
rollback;

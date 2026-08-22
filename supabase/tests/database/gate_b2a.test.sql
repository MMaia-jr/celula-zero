begin;

create extension if not exists pgtap with schema extensions;
select no_plan();

select has_table('public', 'contributions', 'B2-A contributions exist');
select has_table('public', 'artifacts', 'B2-A artifact metadata exist');
select has_function(
  'public', 'b2a_submit_contribution',
  array['uuid','uuid','text','text','uuid','uuid','text'],
  'B2-A contribution command exists'
);
select has_function(
  'public', 'b2a_attach_artifact',
  array['uuid','uuid','text','text','text','text','bigint','text','uuid','text'],
  'B2-A artifact command exists'
);
select has_function('public', 'b2a_reconcile_contribution', array['uuid'], 'B2-A contribution reconciler exists');
select has_function('public', 'b2a_reconcile_artifact', array['uuid'], 'B2-A artifact reconciler exists');
select is(
  (select count(*)::integer from public.capability_definitions
   where code in ('contribution.submit', 'artifact.attach')),
  2,
  'B2-A capabilities are registered'
);
select ok(
  not has_table_privilege('authenticated', 'public.contributions', 'INSERT')
  and not has_table_privilege('authenticated', 'public.contributions', 'UPDATE')
  and not has_table_privilege('authenticated', 'public.contributions', 'DELETE'),
  'authenticated clients have no contribution DML'
);
select ok(
  not has_table_privilege('authenticated', 'public.artifacts', 'INSERT')
  and not has_table_privilege('authenticated', 'public.artifacts', 'UPDATE')
  and not has_table_privilege('authenticated', 'public.artifacts', 'DELETE'),
  'authenticated clients have no artifact DML'
);
select ok(
  not has_table_privilege('anon', 'public.contributions', 'SELECT'),
  'anonymous clients cannot read contributions'
);
select ok(
  not has_table_privilege('anon', 'public.artifacts', 'SELECT'),
  'anonymous clients cannot read artifacts'
);

create temporary table b2a_fixture (
  key text primary key,
  value uuid,
  result jsonb
);

insert into public.pilot_invites(email, label) values
  ('b2a-steward@example.test', 'B2-A steward'),
  ('b2a-contributor@example.test', 'B2-A contributor'),
  ('b2a-operator@example.test', 'B2-A agent operator');

insert into auth.users(
  id, aud, role, email, raw_app_meta_data, raw_user_meta_data, created_at, updated_at
) values
  ('51000000-0000-4000-8000-000000000001', 'authenticated', 'authenticated',
   'b2a-steward@example.test', '{"provider":"email","providers":["email"]}',
   '{"name":"B2-A Steward"}', now(), now()),
  ('51000000-0000-4000-8000-000000000002', 'authenticated', 'authenticated',
   'b2a-contributor@example.test', '{"provider":"email","providers":["email"]}',
   '{"name":"B2-A Contributor"}', now(), now()),
  ('51000000-0000-4000-8000-000000000003', 'authenticated', 'authenticated',
   'b2a-operator@example.test', '{"provider":"email","providers":["email"]}',
   '{"name":"B2-A Operator"}', now(), now());

insert into b2a_fixture(key, value)
select 'steward_actor', actor_id
from public.actor_memberships
where profile_id = '51000000-0000-4000-8000-000000000001' and role = 'OWNER';
insert into b2a_fixture(key, value)
select 'contributor_actor', actor_id
from public.actor_memberships
where profile_id = '51000000-0000-4000-8000-000000000002' and role = 'OWNER';

insert into public.actors(id, kind, name, operator_profile_id, operator_label)
values (
  '51000000-0000-4000-8000-0000000000a1', 'AI_AGENT', 'B2-A limited agent',
  '51000000-0000-4000-8000-000000000003', 'B2-A Operator'
);
insert into public.actor_memberships(actor_id, profile_id, role)
values (
  '51000000-0000-4000-8000-0000000000a1',
  '51000000-0000-4000-8000-000000000003',
  'OPERATOR'
);
insert into b2a_fixture(key, value)
values ('agent_actor', '51000000-0000-4000-8000-0000000000a1');

select set_config('request.jwt.claim.sub', '51000000-0000-4000-8000-000000000001', true);
insert into b2a_fixture(key, result)
select 'project', to_jsonb(x)
from public.create_project_atomic(
  'Projeto Gate B2-A',
  'projeto-gate-b2a',
  'Projeto isolado para testar contribuições e metadados de artefatos.',
  'Preservar trabalho atribuído sem confundi-lo automaticamente com evidência.',
  'Registrar contribuições e artefatos imutáveis sob compromissos aceitos.',
  'Uma entrega atribuível, reconciliável e sem conclusão automática.',
  'Sem conteúdo sensível, storage externo, outcome, fundos ou Web3.',
  array['contribuição', 'artefato'],
  'VOLUNTARY',
  'OPEN',
  false
) x;
update b2a_fixture
set value = (result ->> 'project_id')::uuid
where key = 'project';

insert into public.role_assignments(
  cell_id, actor_id, role_id, scope_type, scope_id,
  policy_version_id, granted_by_actor_id
) values
  (
    '00000000-0000-4000-8000-00000000c001',
    (select value from b2a_fixture where key = 'steward_actor'),
    '00000000-0000-4000-8000-00000000c202',
    'PROJECT', (select value from b2a_fixture where key = 'project'),
    '00000000-0000-4000-8000-00000000c101',
    (select value from b2a_fixture where key = 'steward_actor')
  ),
  (
    '00000000-0000-4000-8000-00000000c001',
    (select value from b2a_fixture where key = 'contributor_actor'),
    '00000000-0000-4000-8000-00000000c204',
    'PROJECT', (select value from b2a_fixture where key = 'project'),
    '00000000-0000-4000-8000-00000000c101',
    (select value from b2a_fixture where key = 'steward_actor')
  ),
  (
    '00000000-0000-4000-8000-00000000c001',
    (select value from b2a_fixture where key = 'agent_actor'),
    '00000000-0000-4000-8000-00000000c205',
    'PROJECT', (select value from b2a_fixture where key = 'project'),
    '00000000-0000-4000-8000-00000000c101',
    (select value from b2a_fixture where key = 'steward_actor')
  );

insert into public.opportunities(
  id, cell_id, project_id, owner_actor_id, state, visibility,
  current_version, material_version, capacity
)
select
  '52000000-0000-4000-8000-000000000001',
  '00000000-0000-4000-8000-00000000c001',
  value,
  (select value from b2a_fixture where key = 'steward_actor'),
  'OPEN', 'PUBLIC', 1, 1, 2
from b2a_fixture where key = 'project';

insert into public.opportunity_versions(
  opportunity_id, version, title, statement, conditions, expected_result,
  capacity, state, visibility, created_by_actor_id
) values (
  '52000000-0000-4000-8000-000000000001', 1,
  'Entrega B2-A',
  'Produzir um artefato atribuível sob compromisso aceito.',
  'Incluir descrição, limitações e digest verificável.',
  'Uma contribuição registrada sem promoção automática a evidência.',
  2, 'OPEN', 'PUBLIC',
  (select value from b2a_fixture where key = 'steward_actor')
);

insert into public.proposals(
  id, cell_id, opportunity_id, proposer_actor_id, state, visibility,
  current_version, material_version
) values
  (
    '52000000-0000-4000-8000-000000000101',
    '00000000-0000-4000-8000-00000000c001',
    '52000000-0000-4000-8000-000000000001',
    (select value from b2a_fixture where key = 'contributor_actor'),
    'ACCEPTED', 'PROJECT', 1, 2
  ),
  (
    '52000000-0000-4000-8000-000000000102',
    '00000000-0000-4000-8000-00000000c001',
    '52000000-0000-4000-8000-000000000001',
    (select value from b2a_fixture where key = 'agent_actor'),
    'ACCEPTED', 'PROJECT', 1, 2
  );

insert into public.proposal_versions(
  proposal_id, version, statement, conditions, expected_delivery,
  reward_expectation, created_by_actor_id
) values
  (
    '52000000-0000-4000-8000-000000000101', 1,
    'Contribuição humana atribuída e limitada.',
    'Registrar o artefato sem qualificá-lo como evidência.',
    'Documento Markdown com digest SHA-256.',
    'Sem recompensa econômica.',
    (select value from b2a_fixture where key = 'contributor_actor')
  ),
  (
    '52000000-0000-4000-8000-000000000102', 1,
    'Contribuição de agente atribuída ao operador.',
    'Autoridade limitada ao registro da própria entrega.',
    'Documento de agente com digest SHA-256.',
    'Sem recompensa econômica.',
    (select value from b2a_fixture where key = 'agent_actor')
  );

insert into public.commitments(
  id, cell_id, project_id, opportunity_id, opportunity_version,
  proposal_id, proposal_version, proposer_actor_id, accepted_by_actor_id
) values
  (
    '52000000-0000-4000-8000-000000000201',
    '00000000-0000-4000-8000-00000000c001',
    (select value from b2a_fixture where key = 'project'),
    '52000000-0000-4000-8000-000000000001', 1,
    '52000000-0000-4000-8000-000000000101', 1,
    (select value from b2a_fixture where key = 'contributor_actor'),
    (select value from b2a_fixture where key = 'steward_actor')
  ),
  (
    '52000000-0000-4000-8000-000000000202',
    '00000000-0000-4000-8000-00000000c001',
    (select value from b2a_fixture where key = 'project'),
    '52000000-0000-4000-8000-000000000001', 1,
    '52000000-0000-4000-8000-000000000102', 1,
    (select value from b2a_fixture where key = 'agent_actor'),
    (select value from b2a_fixture where key = 'steward_actor')
  );

select set_config('request.jwt.claim.sub', '51000000-0000-4000-8000-000000000002', true);
insert into b2a_fixture(key, result)
select 'human_contribution', public.b2a_submit_contribution(
  (select value from b2a_fixture where key = 'contributor_actor'),
  '52000000-0000-4000-8000-000000000201',
  'Documento Markdown produzido conforme o compromisso aceito.',
  'Teste sintético; utilidade externa ainda não foi demonstrada.',
  null,
  '53000000-0000-4000-8000-000000000001',
  'b2a-human-submit-001'
);
update b2a_fixture
set value = (result ->> 'contribution_id')::uuid
where key = 'human_contribution';

select is(
  (select result ->> 'state' from b2a_fixture where key = 'human_contribution'),
  'SUBMITTED',
  'human contribution is submitted without deciding an outcome'
);
select is(
  (select author_actor_id from public.contributions
   where id = (select value from b2a_fixture where key = 'human_contribution')),
  (select value from b2a_fixture where key = 'contributor_actor'),
  'contribution preserves attributed author'
);
select is(
  (select count(*)::integer from public.domain_events
   where aggregate_type = 'CONTRIBUTION'
     and aggregate_id = (select value from b2a_fixture where key = 'human_contribution')
     and event_type = 'CONTRIBUTION_SUBMITTED'),
  1,
  'contribution submission creates one domain event'
);
select is(
  public.b2a_submit_contribution(
    (select value from b2a_fixture where key = 'contributor_actor'),
    '52000000-0000-4000-8000-000000000201',
    'Documento Markdown produzido conforme o compromisso aceito.',
    'Teste sintético; utilidade externa ainda não foi demonstrada.',
    null,
    '53000000-0000-4000-8000-000000000099',
    'b2a-human-submit-001'
  ) ->> 'contribution_id',
  (select value::text from b2a_fixture where key = 'human_contribution'),
  'same idempotency key and payload replay the same contribution'
);
select is(
  (select count(*)::integer from public.contributions
   where commitment_id = '52000000-0000-4000-8000-000000000201'),
  1,
  'idempotent replay creates no duplicate contribution'
);
select throws_ok(
  format(
    'select public.b2a_submit_contribution(%L::uuid,%L::uuid,%L,%L,null,%L::uuid,%L)',
    (select value from b2a_fixture where key = 'contributor_actor'),
    '52000000-0000-4000-8000-000000000201',
    'Payload materialmente diferente para a mesma chave.',
    'Teste sintético; utilidade externa ainda não foi demonstrada.',
    '53000000-0000-4000-8000-000000000002',
    'b2a-human-submit-001'
  ),
  'P0001',
  'CZ409:IDEMPOTENCY_CONFLICT',
  'same idempotency key with different payload is rejected'
);

insert into b2a_fixture(key, result)
select 'artifact', public.b2a_attach_artifact(
  (select value from b2a_fixture where key = 'contributor_actor'),
  (select value from b2a_fixture where key = 'human_contribution'),
  'DOCUMENT',
  'https://example.test/artifacts/b2a-delivery.md',
  repeat('a', 64),
  'text/markdown',
  1234,
  'EXTERNAL_REFERENCE',
  '53000000-0000-4000-8000-000000000003',
  'b2a-artifact-attach-001'
);
update b2a_fixture
set value = (result ->> 'artifact_id')::uuid
where key = 'artifact';

select is(
  (select digest from public.artifacts
   where id = (select value from b2a_fixture where key = 'artifact')),
  repeat('a', 64),
  'artifact preserves the declared SHA-256 digest'
);
select is(
  (select count(*)::integer from public.domain_events
   where aggregate_type = 'ARTIFACT'
     and aggregate_id = (select value from b2a_fixture where key = 'artifact')
     and event_type = 'ARTIFACT_ATTACHED'),
  1,
  'artifact attachment creates one domain event'
);
select ok(
  not exists (
    select 1 from public.domain_events
    where command_id in (
      '53000000-0000-4000-8000-000000000001',
      '53000000-0000-4000-8000-000000000003'
    )
      and payload::text like '%example.test%'
  ),
  'domain events do not copy artifact URIs'
);
select is(
  public.b2a_reconcile_contribution(
    (select value from b2a_fixture where key = 'human_contribution')
  ),
  '{}'::text[],
  'human contribution reconciles'
);
select is(
  public.b2a_reconcile_artifact(
    (select value from b2a_fixture where key = 'artifact')
  ),
  '{}'::text[],
  'artifact reconciles'
);
select throws_ok(
  format(
    'update public.contributions set description = %L where id = %L::uuid',
    'Tentativa de reescrever a contribuição registrada.',
    (select value from b2a_fixture where key = 'human_contribution')
  ),
  '23000',
  'contributions is append-only',
  'contributions cannot be updated'
);
select throws_ok(
  format(
    'delete from public.artifacts where id = %L::uuid',
    (select value from b2a_fixture where key = 'artifact')
  ),
  '23000',
  'artifacts is append-only',
  'artifacts cannot be deleted'
);

insert into b2a_fixture(key, result)
select 'human_correction', public.b2a_submit_contribution(
  (select value from b2a_fixture where key = 'contributor_actor'),
  '52000000-0000-4000-8000-000000000201',
  'Nova contribuição que corrige a declaração anterior sem sobrescrevê-la.',
  'Correção sintética; a contribuição anterior permanece preservada.',
  (select value from b2a_fixture where key = 'human_contribution'),
  '53000000-0000-4000-8000-000000000004',
  'b2a-human-correct-001'
);
update b2a_fixture
set value = (result ->> 'contribution_id')::uuid
where key = 'human_correction';
select is(
  (select supersedes_contribution_id from public.contributions
   where id = (select value from b2a_fixture where key = 'human_correction')),
  (select value from b2a_fixture where key = 'human_contribution'),
  'correction creates a new contribution linked to the preserved original'
);
select is(
  (select count(*)::integer from public.contributions
   where commitment_id = '52000000-0000-4000-8000-000000000201'),
  2,
  'original and corrective contributions both remain present'
);

select set_config('request.jwt.claim.sub', '51000000-0000-4000-8000-000000000001', true);
select throws_ok(
  format(
    'select public.b2a_submit_contribution(%L::uuid,%L::uuid,%L,%L,null,%L::uuid,%L)',
    (select value from b2a_fixture where key = 'steward_actor'),
    '52000000-0000-4000-8000-000000000201',
    'Tentativa do steward de atribuir a si uma entrega alheia.',
    'Deve falhar antes de criar qualquer contribuição.',
    '53000000-0000-4000-8000-000000000005',
    'b2a-steward-submit-001'
  ),
  '42501',
  'CZ403:CAPABILITY_DENIED',
  'project steward cannot submit a contributor delivery without capability'
);

select set_config('request.jwt.claim.sub', '51000000-0000-4000-8000-000000000003', true);
insert into b2a_fixture(key, result)
select 'agent_contribution', public.b2a_submit_contribution(
  (select value from b2a_fixture where key = 'agent_actor'),
  '52000000-0000-4000-8000-000000000202',
  'Entrega produzida pelo agente sob autoridade contextual limitada.',
  'Output de agente não é evidência nem outcome automático.',
  null,
  '53000000-0000-4000-8000-000000000006',
  'b2a-agent-submit-001'
);
update b2a_fixture
set value = (result ->> 'contribution_id')::uuid
where key = 'agent_contribution';
select is(
  (select author_actor_id from public.contributions
   where id = (select value from b2a_fixture where key = 'agent_contribution')),
  (select value from b2a_fixture where key = 'agent_actor'),
  'bounded AI contribution preserves the agent actor and operator trail'
);
select throws_ok(
  format(
    'select public.b2a_attach_artifact(%L::uuid,%L::uuid,%L,%L,%L,%L,%s,%L,%L::uuid,%L)',
    (select value from b2a_fixture where key = 'agent_actor'),
    (select value from b2a_fixture where key = 'human_contribution'),
    'DOCUMENT',
    'https://example.test/artifacts/wrong-author.md',
    repeat('b', 64),
    'text/markdown',
    10,
    'EXTERNAL_REFERENCE',
    '53000000-0000-4000-8000-000000000007',
    'b2a-agent-wrong-001'
  ),
  '42501',
  'CZ403:CONTRIBUTION_AUTHOR_REQUIRED',
  'agent cannot attach an artifact to another actor contribution'
);
select throws_ok(
  format(
    'select public.b2a_attach_artifact(%L::uuid,%L::uuid,%L,%L,%L,%L,%s,%L,%L::uuid,%L)',
    (select value from b2a_fixture where key = 'agent_actor'),
    (select value from b2a_fixture where key = 'agent_contribution'),
    'DOCUMENT',
    'https://example.test/artifacts/invalid.md',
    'not-a-digest',
    'text/markdown',
    10,
    'EXTERNAL_REFERENCE',
    '53000000-0000-4000-8000-000000000008',
    'b2a-invalid-digest-001'
  ),
  'P0001',
  'CZ422:INVALID_SHA256_DIGEST',
  'invalid artifact digest is rejected with a typed error'
);

select set_config('request.jwt.claim.sub', '51000000-0000-4000-8000-000000000002', true);
set local role authenticated;
select is(
  (select count(*)::integer from public.contributions),
  2,
  'RLS exposes only contributions authored by the current profile'
);
select is(
  (select count(*)::integer from public.artifacts),
  1,
  'RLS exposes only artifacts authored by the current profile'
);
reset role;

alter table public.artifacts disable trigger artifacts_append_only;
update public.artifacts
set created_by_actor_id = (select value from b2a_fixture where key = 'agent_actor')
where id = (select value from b2a_fixture where key = 'artifact');
alter table public.artifacts enable trigger artifacts_append_only;
select is(
  public.b2a_reconcile_artifact(
    (select value from b2a_fixture where key = 'artifact')
  ),
  array['artifact_author_mismatch']::text[],
  'artifact reconciliation detects synthetic material corruption'
);

select * from finish();
rollback;

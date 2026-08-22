begin;

create extension if not exists pgtap with schema extensions;
select no_plan();

select has_table('public', 'claims', 'B2-B1 claims exist');
select has_table('public', 'evidence_items', 'B2-B1 evidence items exist');
select has_table('public', 'evidence_links', 'B2-B1 explicit evidence links exist');
select has_function(
  'public', 'b2b1_record_claim',
  array['uuid','text','uuid','text','text','uuid','uuid','text'],
  'B2-B1 claim command exists'
);
select has_function(
  'public', 'b2b1_register_evidence',
  array['uuid','uuid','uuid','text','text','text','uuid','uuid','text'],
  'B2-B1 evidence command exists'
);
select has_function('public', 'b2b1_reconcile_claim', array['uuid'], 'B2-B1 claim reconciler exists');
select has_function('public', 'b2b1_reconcile_evidence', array['uuid'], 'B2-B1 evidence reconciler exists');
select is(
  (select count(*)::integer from public.capability_definitions
   where code in ('claim.record', 'evidence.register')),
  2,
  'B2-B1 capabilities are registered'
);
select ok(
  not has_table_privilege('authenticated', 'public.claims', 'INSERT')
  and not has_table_privilege('authenticated', 'public.claims', 'UPDATE')
  and not has_table_privilege('authenticated', 'public.claims', 'DELETE'),
  'authenticated clients have no claim DML'
);
select ok(
  not has_table_privilege('authenticated', 'public.evidence_items', 'INSERT')
  and not has_table_privilege('authenticated', 'public.evidence_items', 'UPDATE')
  and not has_table_privilege('authenticated', 'public.evidence_items', 'DELETE'),
  'authenticated clients have no evidence-item DML'
);
select ok(
  not has_table_privilege('authenticated', 'public.evidence_links', 'INSERT')
  and not has_table_privilege('authenticated', 'public.evidence_links', 'UPDATE')
  and not has_table_privilege('authenticated', 'public.evidence_links', 'DELETE'),
  'authenticated clients have no evidence-link DML'
);
select ok(
  not has_table_privilege('anon', 'public.claims', 'SELECT')
  and not has_table_privilege('anon', 'public.evidence_items', 'SELECT')
  and not has_table_privilege('anon', 'public.evidence_links', 'SELECT'),
  'anonymous clients cannot read B2-B1 records'
);

create temporary table b2b1_fixture (
  key text primary key,
  value uuid,
  result jsonb
);

insert into public.pilot_invites(email, label) values
  ('b2b1-steward@example.test', 'B2-B1 steward'),
  ('b2b1-contributor@example.test', 'B2-B1 contributor'),
  ('b2b1-operator@example.test', 'B2-B1 agent operator');

insert into auth.users(
  id, aud, role, email, raw_app_meta_data, raw_user_meta_data, created_at, updated_at
) values
  ('61000000-0000-4000-8000-000000000001', 'authenticated', 'authenticated',
   'b2b1-steward@example.test', '{"provider":"email","providers":["email"]}',
   '{"name":"B2-B1 Steward"}', now(), now()),
  ('61000000-0000-4000-8000-000000000002', 'authenticated', 'authenticated',
   'b2b1-contributor@example.test', '{"provider":"email","providers":["email"]}',
   '{"name":"B2-B1 Contributor"}', now(), now()),
  ('61000000-0000-4000-8000-000000000003', 'authenticated', 'authenticated',
   'b2b1-operator@example.test', '{"provider":"email","providers":["email"]}',
   '{"name":"B2-B1 Operator"}', now(), now());

insert into b2b1_fixture(key, value)
select 'steward_actor', actor_id
from public.actor_memberships
where profile_id = '61000000-0000-4000-8000-000000000001' and role = 'OWNER';
insert into b2b1_fixture(key, value)
select 'contributor_actor', actor_id
from public.actor_memberships
where profile_id = '61000000-0000-4000-8000-000000000002' and role = 'OWNER';

insert into public.actors(id, kind, name, operator_profile_id, operator_label)
values (
  '61000000-0000-4000-8000-0000000000a1', 'AI_AGENT', 'B2-B1 limited agent',
  '61000000-0000-4000-8000-000000000003', 'B2-B1 Operator'
);
insert into public.actor_memberships(actor_id, profile_id, role)
values (
  '61000000-0000-4000-8000-0000000000a1',
  '61000000-0000-4000-8000-000000000003',
  'OPERATOR'
);
insert into b2b1_fixture(key, value)
values ('agent_actor', '61000000-0000-4000-8000-0000000000a1');

select set_config('request.jwt.claim.sub', '61000000-0000-4000-8000-000000000001', true);
insert into b2b1_fixture(key, result)
select 'project', to_jsonb(x)
from public.create_project_atomic(
  'Projeto Gate B2-B1',
  'projeto-gate-b2b1',
  'Projeto isolado para testar claims e relações explícitas de evidência.',
  'Distinguir artefato, claim, evidência documentada e verificação futura.',
  'Registrar afirmações contestáveis e seus vínculos documentais.',
  'Claims e evidências documentadas sem promoção automática de estado.',
  'Sem Verification, outcome, contestação, storage externo, fundos ou Web3.',
  array['claim', 'evidência'],
  'VOLUNTARY',
  'OPEN',
  false
) x;
update b2b1_fixture
set value = (result ->> 'project_id')::uuid
where key = 'project';

insert into public.role_assignments(
  cell_id, actor_id, role_id, scope_type, scope_id,
  policy_version_id, granted_by_actor_id
) values
  (
    '00000000-0000-4000-8000-00000000c001',
    (select value from b2b1_fixture where key = 'steward_actor'),
    '00000000-0000-4000-8000-00000000c202',
    'PROJECT', (select value from b2b1_fixture where key = 'project'),
    '00000000-0000-4000-8000-00000000c101',
    (select value from b2b1_fixture where key = 'steward_actor')
  ),
  (
    '00000000-0000-4000-8000-00000000c001',
    (select value from b2b1_fixture where key = 'contributor_actor'),
    '00000000-0000-4000-8000-00000000c204',
    'PROJECT', (select value from b2b1_fixture where key = 'project'),
    '00000000-0000-4000-8000-00000000c101',
    (select value from b2b1_fixture where key = 'steward_actor')
  ),
  (
    '00000000-0000-4000-8000-00000000c001',
    (select value from b2b1_fixture where key = 'agent_actor'),
    '00000000-0000-4000-8000-00000000c205',
    'PROJECT', (select value from b2b1_fixture where key = 'project'),
    '00000000-0000-4000-8000-00000000c101',
    (select value from b2b1_fixture where key = 'steward_actor')
  );

insert into public.opportunities(
  id, cell_id, project_id, owner_actor_id, state, visibility,
  current_version, material_version, capacity
)
select
  '62000000-0000-4000-8000-000000000001',
  '00000000-0000-4000-8000-00000000c001',
  value,
  (select value from b2b1_fixture where key = 'steward_actor'),
  'OPEN', 'PUBLIC', 1, 1, 2
from b2b1_fixture where key = 'project';

insert into public.opportunity_versions(
  opportunity_id, version, title, statement, conditions, expected_result,
  capacity, state, visibility, created_by_actor_id
) values (
  '62000000-0000-4000-8000-000000000001', 1,
  'Claims e evidência',
  'Produzir artefatos e declarar claims explicitamente relacionados.',
  'Preservar autoria, fonte, limitações e relação contextual.',
  'Claims e evidências documentadas sem verificação automática.',
  2, 'OPEN', 'PUBLIC',
  (select value from b2b1_fixture where key = 'steward_actor')
);

insert into public.proposals(
  id, cell_id, opportunity_id, proposer_actor_id, state, visibility,
  current_version, material_version
) values
  (
    '62000000-0000-4000-8000-000000000101',
    '00000000-0000-4000-8000-00000000c001',
    '62000000-0000-4000-8000-000000000001',
    (select value from b2b1_fixture where key = 'contributor_actor'),
    'ACCEPTED', 'PROJECT', 1, 2
  ),
  (
    '62000000-0000-4000-8000-000000000102',
    '00000000-0000-4000-8000-00000000c001',
    '62000000-0000-4000-8000-000000000001',
    (select value from b2b1_fixture where key = 'agent_actor'),
    'ACCEPTED', 'PROJECT', 1, 2
  );

insert into public.proposal_versions(
  proposal_id, version, statement, conditions, expected_delivery,
  reward_expectation, created_by_actor_id
) values
  (
    '62000000-0000-4000-8000-000000000101', 1,
    'Registrar uma declaração humana contestável.',
    'Não converter automaticamente fonte em evidência verificada.',
    'Artefato e claim humanos com limites explícitos.',
    'Sem recompensa econômica.',
    (select value from b2b1_fixture where key = 'contributor_actor')
  ),
  (
    '62000000-0000-4000-8000-000000000102', 1,
    'Registrar uma declaração de agente atribuível.',
    'Não permitir que o agente verifique o próprio output.',
    'Artefato e claim de agente com operador registrado.',
    'Sem recompensa econômica.',
    (select value from b2b1_fixture where key = 'agent_actor')
  );

insert into public.commitments(
  id, cell_id, project_id, opportunity_id, opportunity_version,
  proposal_id, proposal_version, proposer_actor_id, accepted_by_actor_id
) values
  (
    '62000000-0000-4000-8000-000000000201',
    '00000000-0000-4000-8000-00000000c001',
    (select value from b2b1_fixture where key = 'project'),
    '62000000-0000-4000-8000-000000000001', 1,
    '62000000-0000-4000-8000-000000000101', 1,
    (select value from b2b1_fixture where key = 'contributor_actor'),
    (select value from b2b1_fixture where key = 'steward_actor')
  ),
  (
    '62000000-0000-4000-8000-000000000202',
    '00000000-0000-4000-8000-00000000c001',
    (select value from b2b1_fixture where key = 'project'),
    '62000000-0000-4000-8000-000000000001', 1,
    '62000000-0000-4000-8000-000000000102', 1,
    (select value from b2b1_fixture where key = 'agent_actor'),
    (select value from b2b1_fixture where key = 'steward_actor')
  );

insert into public.contributions(
  id, cell_id, project_id, commitment_id, author_actor_id,
  description, limitations, visibility, sensitivity
) values
  (
    '62000000-0000-4000-8000-000000000301',
    '00000000-0000-4000-8000-00000000c001',
    (select value from b2b1_fixture where key = 'project'),
    '62000000-0000-4000-8000-000000000201',
    (select value from b2b1_fixture where key = 'contributor_actor'),
    'Contribuição humana usada como fixture B2-B1.',
    'Conteúdo sintético sem utilidade externa demonstrada.',
    'PROJECT', 'NORMAL'
  ),
  (
    '62000000-0000-4000-8000-000000000302',
    '00000000-0000-4000-8000-00000000c001',
    (select value from b2b1_fixture where key = 'project'),
    '62000000-0000-4000-8000-000000000202',
    (select value from b2b1_fixture where key = 'agent_actor'),
    'Contribuição de agente usada como fixture B2-B1.',
    'Output sintético que não constitui evidência automática.',
    'PROJECT', 'NORMAL'
  );

insert into public.artifacts(
  id, cell_id, project_id, contribution_id, created_by_actor_id,
  kind, uri, digest_algorithm, digest, media_type, size_bytes,
  visibility, sensitivity, retention_class
) values
  (
    '62000000-0000-4000-8000-000000000401',
    '00000000-0000-4000-8000-00000000c001',
    (select value from b2b1_fixture where key = 'project'),
    '62000000-0000-4000-8000-000000000301',
    (select value from b2b1_fixture where key = 'contributor_actor'),
    'DOCUMENT', 'https://example.test/b2b1/human.md',
    'SHA256', repeat('a', 64), 'text/markdown', 1200,
    'PROJECT', 'NORMAL', 'EXTERNAL_REFERENCE'
  ),
  (
    '62000000-0000-4000-8000-000000000402',
    '00000000-0000-4000-8000-00000000c001',
    (select value from b2b1_fixture where key = 'project'),
    '62000000-0000-4000-8000-000000000302',
    (select value from b2b1_fixture where key = 'agent_actor'),
    'DOCUMENT', 'https://example.test/b2b1/agent.md',
    'SHA256', repeat('b', 64), 'text/markdown', 900,
    'PRIVATE', 'RESTRICTED_KNOWLEDGE', 'EXTERNAL_REFERENCE'
  );

select set_config('request.jwt.claim.sub', '61000000-0000-4000-8000-000000000002', true);
insert into b2b1_fixture(key, result)
select 'human_claim', public.b2b1_record_claim(
  (select value from b2b1_fixture where key = 'contributor_actor'),
  'ARTIFACT',
  '62000000-0000-4000-8000-000000000401',
  'O artefato documenta o comportamento esperado no cenário sintético B2-B1.',
  'Válido apenas para a fixture e para os critérios declarados neste teste.',
  null,
  '63000000-0000-4000-8000-000000000001',
  'b2b1-human-claim-001'
);
update b2b1_fixture
set value = (result ->> 'claim_id')::uuid
where key = 'human_claim';

select is(
  (select result ->> 'state' from b2b1_fixture where key = 'human_claim'),
  'RECORDED',
  'claim is recorded rather than verified'
);
select is(
  (select author_actor_id from public.claims
   where id = (select value from b2b1_fixture where key = 'human_claim')),
  (select value from b2b1_fixture where key = 'contributor_actor'),
  'claim preserves attributed human author'
);
select is(
  (select subject_type from public.claims
   where id = (select value from b2b1_fixture where key = 'human_claim')),
  'ARTIFACT',
  'claim explicitly identifies its subject type'
);
select is(
  (select count(*)::integer from public.domain_events
   where aggregate_type = 'CLAIM'
     and aggregate_id = (select value from b2b1_fixture where key = 'human_claim')
     and event_type = 'CLAIM_RECORDED'),
  1,
  'claim recording creates one domain event'
);
select ok(
  not exists (
    select 1 from public.domain_events
    where command_id = '63000000-0000-4000-8000-000000000001'
      and payload::text like '%comportamento esperado%'
  ),
  'claim event does not copy the claim statement'
);
select is(
  public.b2b1_record_claim(
    (select value from b2b1_fixture where key = 'contributor_actor'),
    'ARTIFACT',
    '62000000-0000-4000-8000-000000000401',
    'O artefato documenta o comportamento esperado no cenário sintético B2-B1.',
    'Válido apenas para a fixture e para os critérios declarados neste teste.',
    null,
    '63000000-0000-4000-8000-000000000099',
    'b2b1-human-claim-001'
  ) ->> 'claim_id',
  (select value::text from b2b1_fixture where key = 'human_claim'),
  'claim replay returns the same logical result'
);
select is(
  (select count(*)::integer from public.claims
   where author_actor_id = (select value from b2b1_fixture where key = 'contributor_actor')),
  1,
  'claim replay creates no duplicate object'
);
select throws_ok(
  format(
    'select public.b2b1_record_claim(%L::uuid,%L,%L::uuid,%L,%L,null,%L::uuid,%L)',
    (select value from b2b1_fixture where key = 'contributor_actor'),
    'ARTIFACT',
    '62000000-0000-4000-8000-000000000401',
    'Afirmação materialmente diferente para a mesma chave idempotente.',
    'Mesmo escopo sintético.',
    '63000000-0000-4000-8000-000000000002',
    'b2b1-human-claim-001'
  ),
  'P0001',
  'CZ409:IDEMPOTENCY_CONFLICT',
  'claim idempotency conflict is typed'
);

insert into b2b1_fixture(key, result)
select 'human_evidence', public.b2b1_register_evidence(
  (select value from b2b1_fixture where key = 'contributor_actor'),
  (select value from b2b1_fixture where key = 'human_claim'),
  '62000000-0000-4000-8000-000000000401',
  'SUPPORTS',
  'Uso documental do artefato para apoiar o claim no cenário sintético.',
  'O vínculo ainda não foi examinado por verificador independente.',
  null,
  '63000000-0000-4000-8000-000000000003',
  'b2b1-human-evidence-001'
);
update b2b1_fixture
set value = (result ->> 'evidence_item_id')::uuid
where key = 'human_evidence';

select is(
  (select result ->> 'state' from b2b1_fixture where key = 'human_evidence'),
  'DOCUMENTED',
  'evidence remains documented rather than verified'
);
select is(
  (select digest from public.evidence_items
   where id = (select value from b2b1_fixture where key = 'human_evidence')),
  repeat('a', 64),
  'evidence snapshots the source artifact digest'
);
select is(
  (select visibility || ':' || sensitivity || ':' || retention_class
   from public.evidence_items
   where id = (select value from b2b1_fixture where key = 'human_evidence')),
  'PROJECT:NORMAL:EXTERNAL_REFERENCE',
  'evidence preserves source access, sensitivity and retention metadata'
);
select is(
  (select relation from public.evidence_links
   where evidence_item_id = (select value from b2b1_fixture where key = 'human_evidence')),
  'SUPPORTS',
  'evidence-to-claim relation is explicit'
);
select is(
  (select count(*)::integer from public.domain_events
   where aggregate_type = 'EVIDENCE'
     and aggregate_id = (select value from b2b1_fixture where key = 'human_evidence')
     and event_type = 'EVIDENCE_REGISTERED'),
  1,
  'evidence registration creates one domain event'
);
select ok(
  not exists (
    select 1 from public.domain_events
    where command_id = '63000000-0000-4000-8000-000000000003'
      and payload::text like '%example.test%'
  ),
  'evidence event does not copy the source artifact URI'
);
select is(
  (select state from public.claims
   where id = (select value from b2b1_fixture where key = 'human_claim')),
  'RECORDED',
  'registering evidence does not promote the claim state'
);
select is(
  public.b2b1_reconcile_claim(
    (select value from b2b1_fixture where key = 'human_claim')
  ),
  '{}'::text[],
  'human claim reconciles'
);
select is(
  public.b2b1_reconcile_evidence(
    (select value from b2b1_fixture where key = 'human_evidence')
  ),
  '{}'::text[],
  'human evidence reconciles'
);
select throws_ok(
  format(
    'update public.claims set statement = %L where id = %L::uuid',
    'Tentativa de reescrever o claim original.',
    (select value from b2b1_fixture where key = 'human_claim')
  ),
  '23000',
  'claims is append-only',
  'claims cannot be updated'
);
select throws_ok(
  format(
    'delete from public.evidence_items where id = %L::uuid',
    (select value from b2b1_fixture where key = 'human_evidence')
  ),
  '23000',
  'evidence_items is append-only',
  'evidence items cannot be deleted'
);
select throws_ok(
  format(
    'update public.evidence_links set relation = %L where evidence_item_id = %L::uuid',
    'CHALLENGES',
    (select value from b2b1_fixture where key = 'human_evidence')
  ),
  '23000',
  'evidence_links is append-only',
  'evidence links cannot be rewritten'
);

insert into b2b1_fixture(key, result)
select 'human_claim_correction', public.b2b1_record_claim(
  (select value from b2b1_fixture where key = 'contributor_actor'),
  'ARTIFACT',
  '62000000-0000-4000-8000-000000000401',
  'O artefato documenta somente a execução sintética observada neste teste.',
  'A formulação corrige o alcance sem apagar a afirmação anterior.',
  (select value from b2b1_fixture where key = 'human_claim'),
  '63000000-0000-4000-8000-000000000004',
  'b2b1-human-claim-correct-001'
);
update b2b1_fixture
set value = (result ->> 'claim_id')::uuid
where key = 'human_claim_correction';
select is(
  (select supersedes_claim_id from public.claims
   where id = (select value from b2b1_fixture where key = 'human_claim_correction')),
  (select value from b2b1_fixture where key = 'human_claim'),
  'claim correction creates a new linked claim'
);
select is(
  (select count(*)::integer from public.claims
   where author_actor_id = (select value from b2b1_fixture where key = 'contributor_actor')),
  2,
  'original and corrective claims remain present'
);

insert into b2b1_fixture(key, result)
select 'human_evidence_correction', public.b2b1_register_evidence(
  (select value from b2b1_fixture where key = 'contributor_actor'),
  (select value from b2b1_fixture where key = 'human_claim'),
  '62000000-0000-4000-8000-000000000401',
  'SUPPORTS',
  'Descrição corrigida do uso documental do artefato para apoiar o claim.',
  'Continua sem exame independente e sem promoção de estado.',
  (select value from b2b1_fixture where key = 'human_evidence'),
  '63000000-0000-4000-8000-000000000005',
  'b2b1-human-evidence-correct-001'
);
update b2b1_fixture
set value = (result ->> 'evidence_item_id')::uuid
where key = 'human_evidence_correction';
select is(
  (select supersedes_evidence_item_id from public.evidence_items
   where id = (select value from b2b1_fixture where key = 'human_evidence_correction')),
  (select value from b2b1_fixture where key = 'human_evidence'),
  'evidence correction creates a new linked evidence item'
);
select is(
  (select count(*)::integer from public.evidence_items
   where custodian_actor_id = (select value from b2b1_fixture where key = 'contributor_actor')),
  2,
  'original and corrective evidence items remain present'
);
select throws_ok(
  format(
    'select public.b2b1_register_evidence(%L::uuid,%L::uuid,%L::uuid,%L,%L,%L,null,%L::uuid,%L)',
    (select value from b2b1_fixture where key = 'contributor_actor'),
    (select value from b2b1_fixture where key = 'human_claim'),
    '62000000-0000-4000-8000-000000000401',
    'PROVES',
    'Tentativa de usar relação epistemológica não suportada.',
    'Deve falhar antes de criar qualquer evidence item.',
    '63000000-0000-4000-8000-000000000006',
    'b2b1-invalid-relation-001'
  ),
  'P0001',
  'CZ422:INVALID_EVIDENCE_RELATION',
  'unsupported evidence relation is rejected explicitly'
);

select set_config('request.jwt.claim.sub', '61000000-0000-4000-8000-000000000001', true);
select throws_ok(
  format(
    'select public.b2b1_record_claim(%L::uuid,%L,%L::uuid,%L,%L,null,%L::uuid,%L)',
    (select value from b2b1_fixture where key = 'steward_actor'),
    'ARTIFACT',
    '62000000-0000-4000-8000-000000000401',
    'Tentativa do steward sem capability de registrar claim.',
    'A atribuição deve ser negada sem criar objeto.',
    '63000000-0000-4000-8000-000000000007',
    'b2b1-steward-claim-001'
  ),
  '42501',
  'CZ403:CAPABILITY_DENIED',
  'project steward cannot record a claim without the capability'
);

select set_config('request.jwt.claim.sub', '61000000-0000-4000-8000-000000000003', true);
insert into b2b1_fixture(key, result)
select 'agent_claim', public.b2b1_record_claim(
  (select value from b2b1_fixture where key = 'agent_actor'),
  'ARTIFACT',
  '62000000-0000-4000-8000-000000000402',
  'O artefato registra um output produzido pelo agente no cenário sintético.',
  'A afirmação é atribuída ao agente e não constitui verificação.',
  null,
  '63000000-0000-4000-8000-000000000008',
  'b2b1-agent-claim-001'
);
update b2b1_fixture
set value = (result ->> 'claim_id')::uuid
where key = 'agent_claim';
select is(
  (select author_actor_id from public.claims
   where id = (select value from b2b1_fixture where key = 'agent_claim')),
  (select value from b2b1_fixture where key = 'agent_actor'),
  'agent claim preserves agent authorship and operator attribution'
);
select is(
  (select visibility || ':' || sensitivity from public.claims
   where id = (select value from b2b1_fixture where key = 'agent_claim')),
  'PRIVATE:RESTRICTED_KNOWLEDGE',
  'claim cannot widen access beyond its restricted subject'
);

insert into b2b1_fixture(key, result)
select 'agent_evidence', public.b2b1_register_evidence(
  (select value from b2b1_fixture where key = 'agent_actor'),
  (select value from b2b1_fixture where key = 'agent_claim'),
  '62000000-0000-4000-8000-000000000402',
  'CONTEXTUALIZES',
  'O artefato contextualiza o claim do agente sem verificá-lo.',
  'Sem revisão humana independente e sem outcome.',
  null,
  '63000000-0000-4000-8000-000000000009',
  'b2b1-agent-evidence-001'
);
update b2b1_fixture
set value = (result ->> 'evidence_item_id')::uuid
where key = 'agent_evidence';
select is(
  (select custodian_actor_id from public.evidence_items
   where id = (select value from b2b1_fixture where key = 'agent_evidence')),
  (select value from b2b1_fixture where key = 'agent_actor'),
  'agent evidence remains attributable to the agent actor'
);
select is(
  (select state from public.evidence_items
   where id = (select value from b2b1_fixture where key = 'agent_evidence')),
  'DOCUMENTED',
  'agent evidence cannot self-promote beyond documented'
);
select is(
  (select visibility || ':' || sensitivity from public.evidence_items
   where id = (select value from b2b1_fixture where key = 'agent_evidence')),
  'PRIVATE:RESTRICTED_KNOWLEDGE',
  'evidence cannot widen access beyond its restricted source'
);
select throws_ok(
  format(
    'select public.b2b1_record_claim(%L::uuid,%L,%L::uuid,%L,%L,%L::uuid,%L::uuid,%L)',
    (select value from b2b1_fixture where key = 'agent_actor'),
    'ARTIFACT',
    '62000000-0000-4000-8000-000000000401',
    'Tentativa do agente de se apropriar da correção do claim humano.',
    'A autoria anterior deve permanecer vinculante.',
    (select value from b2b1_fixture where key = 'human_claim'),
    '63000000-0000-4000-8000-000000000010',
    'b2b1-agent-supersede-001'
  ),
  '42501',
  'CZ403:CLAIM_SUBJECT_ACCESS_REQUIRED',
  'agent cannot claim or supersede another actor restricted subject'
);

select set_config('request.jwt.claim.sub', '61000000-0000-4000-8000-000000000002', true);
select throws_ok(
  format(
    'select public.b2b1_register_evidence(%L::uuid,%L::uuid,%L::uuid,%L,%L,%L,null,%L::uuid,%L)',
    (select value from b2b1_fixture where key = 'contributor_actor'),
    (select value from b2b1_fixture where key = 'human_claim'),
    '62000000-0000-4000-8000-000000000402',
    'CHALLENGES',
    'Tentativa de usar como evidência um artefato restrito de outro ator.',
    'A fonte não está acessível ao custodiante declarado.',
    '63000000-0000-4000-8000-000000000011',
    'b2b1-cross-source-001'
  ),
  '42501',
  'CZ403:EVIDENCE_SOURCE_ACCESS_REQUIRED',
  'contributor cannot register inaccessible restricted source as evidence'
);

grant select on b2b1_fixture to authenticated;

select set_config('request.jwt.claim.sub', '61000000-0000-4000-8000-000000000002', true);
set local role authenticated;
select is((select count(*)::integer from public.claims), 2, 'RLS exposes only claims authored by current profile');
select is((select count(*)::integer from public.evidence_items), 2, 'RLS exposes only evidence held by current profile');
select is((select count(*)::integer from public.evidence_links), 2, 'RLS exposes only links for visible evidence');
select is(
  (
    select count(*)::integer
    from public.domain_events
    where event_type in ('CLAIM_RECORDED', 'EVIDENCE_REGISTERED')
      and object_id in (
        (select value from b2b1_fixture where key = 'agent_claim'),
        (select value from b2b1_fixture where key = 'agent_evidence')
      )
  ),
  0,
  'RLS hides restricted agent claim/evidence events from unrelated contributor'
);
reset role;

select set_config('request.jwt.claim.sub', '61000000-0000-4000-8000-000000000001', true);
set local role authenticated;
select is((select count(*)::integer from public.claims), 3, 'project steward can read all project claims');
select is((select count(*)::integer from public.evidence_items), 3, 'project steward can read all project evidence');
select is(
  (
    select count(*)::integer
    from public.domain_events
    where event_type in ('CLAIM_RECORDED', 'EVIDENCE_REGISTERED')
      and object_id in (
        (select value from b2b1_fixture where key = 'agent_claim'),
        (select value from b2b1_fixture where key = 'agent_evidence')
      )
  ),
  2,
  'project steward can read restricted agent claim/evidence events'
);
reset role;

alter table public.evidence_items disable trigger evidence_items_append_only;
update public.evidence_items
set digest = repeat('c', 64)
where id = (select value from b2b1_fixture where key = 'human_evidence');
alter table public.evidence_items enable trigger evidence_items_append_only;
select is(
  public.b2b1_reconcile_evidence(
    (select value from b2b1_fixture where key = 'human_evidence')
  ),
  array['source_digest_mismatch']::text[],
  'evidence reconciliation detects synthetic digest corruption'
);

alter table public.claims disable trigger claims_append_only;
update public.claims
set subject_id = '62000000-0000-4000-8000-00000000ffff'
where id = (select value from b2b1_fixture where key = 'human_claim');
alter table public.claims enable trigger claims_append_only;
select is(
  public.b2b1_reconcile_claim(
    (select value from b2b1_fixture where key = 'human_claim')
  ),
  array['missing_or_mismatched_subject']::text[],
  'claim reconciliation detects synthetic subject corruption'
);

select * from finish();
rollback;

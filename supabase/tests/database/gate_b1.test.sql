begin;

create extension if not exists pgtap with schema extensions;
select no_plan();

-- Schema, seed policy and command surface.
select has_table('public', 'cells', 'B1 cells exist');
select has_table('public', 'policy_versions', 'B1 policy versions exist');
select has_table('public', 'role_assignments', 'B1 contextual roles exist');
select has_table('public', 'delegations', 'B1 bounded delegations exist');
select has_table('public', 'opportunities', 'B1 opportunities exist');
select has_table('public', 'opportunity_versions', 'B1 immutable opportunity versions exist');
select has_table('public', 'proposals', 'B1 proposals exist');
select has_table('public', 'proposal_versions', 'B1 immutable proposal versions exist');
select has_table('public', 'commitments', 'B1 commitments exist');
select has_table('public', 'decision_records', 'B1 append-only decisions exist');
select has_table('public', 'command_receipts', 'B1 idempotency receipts exist');
select has_table('public', 'domain_events', 'B1 domain events exist');
select has_function('public', 'b1_create_opportunity', array['uuid','uuid','text','text','text','text','integer','uuid','text'], 'opportunity create command exists');
select has_function('public', 'b1_accept_proposal', array['uuid','uuid','integer','integer','integer','integer','text','uuid','text'], 'atomic acceptance command exists');
select has_function('public', 'b1_reconcile_opportunity', array['uuid'], 'opportunity reconciler exists');
select has_function('public', 'b1_reconcile_proposal', array['uuid'], 'proposal reconciler exists');
select is((select slug from public.cells where id = '00000000-0000-4000-8000-00000000c001'), 'cell-zero', 'cell-zero is seeded');
select is((select version from public.policy_versions where id = '00000000-0000-4000-8000-00000000c101'), 1, 'minimum policy v1 is seeded');
select is((select rules ->> 'default_visibility' from public.policy_versions where id = '00000000-0000-4000-8000-00000000c101'), 'PROJECT', 'policy defaults objects to PROJECT');

create temporary table b1_fixture (
  key text primary key,
  value uuid,
  result jsonb
);

insert into public.pilot_invites(email, label) values
  ('b1-steward@example.test', 'B1 steward'),
  ('b1-contributor@example.test', 'B1 contributor'),
  ('b1-operator@example.test', 'B1 agent operator');

insert into auth.users(id, aud, role, email, raw_app_meta_data, raw_user_meta_data, created_at, updated_at) values
  ('41000000-0000-4000-8000-000000000001', 'authenticated', 'authenticated', 'b1-steward@example.test', '{"provider":"email","providers":["email"]}', '{"name":"B1 Steward"}', now(), now()),
  ('41000000-0000-4000-8000-000000000002', 'authenticated', 'authenticated', 'b1-contributor@example.test', '{"provider":"email","providers":["email"]}', '{"name":"B1 Contributor"}', now(), now()),
  ('41000000-0000-4000-8000-000000000003', 'authenticated', 'authenticated', 'b1-operator@example.test', '{"provider":"email","providers":["email"]}', '{"name":"B1 Operator"}', now(), now());

insert into b1_fixture(key, value)
select 'steward_actor', actor_id from public.actor_memberships where profile_id = '41000000-0000-4000-8000-000000000001' and role = 'OWNER';
insert into b1_fixture(key, value)
select 'contributor_actor', actor_id from public.actor_memberships where profile_id = '41000000-0000-4000-8000-000000000002' and role = 'OWNER';

insert into public.actors(id, kind, name, operator_profile_id, operator_label)
values ('41000000-0000-4000-8000-0000000000a1', 'AI_AGENT', 'B1 limited agent', '41000000-0000-4000-8000-000000000003', 'B1 Operator');
insert into public.actor_memberships(actor_id, profile_id, role)
values ('41000000-0000-4000-8000-0000000000a1', '41000000-0000-4000-8000-000000000003', 'OPERATOR');
insert into b1_fixture(key, value) values ('agent_actor', '41000000-0000-4000-8000-0000000000a1');

select set_config('request.jwt.claim.sub', '41000000-0000-4000-8000-000000000001', true);
insert into b1_fixture(key, result)
select 'project', to_jsonb(x) from public.create_project_atomic(
  'Projeto Gate B1', 'projeto-gate-b1',
  'Projeto isolado para testar autoridade e coordenação do Gate B1.',
  'Preservar papéis, versões, decisões e eventos no teste de coordenação.',
  'Executar S2, S3, S4, S7 e S11 sem qualquer frontend novo.',
  'Um backend de coordenação local, versionado e reconciliável.',
  'Sem fundos, Web3, deploy ou escrita direta do cliente.',
  array['coordenação', 'auditoria'], 'VOLUNTARY', 'OPEN', true
) x;
update b1_fixture set value = (result ->> 'project_id')::uuid where key = 'project';

insert into public.role_assignments(cell_id, actor_id, role_id, scope_type, scope_id, policy_version_id, granted_by_actor_id)
values
  ('00000000-0000-4000-8000-00000000c001', (select value from b1_fixture where key = 'steward_actor'), '00000000-0000-4000-8000-00000000c202', 'PROJECT', (select value from b1_fixture where key = 'project'), '00000000-0000-4000-8000-00000000c101', (select value from b1_fixture where key = 'steward_actor')),
  ('00000000-0000-4000-8000-00000000c001', (select value from b1_fixture where key = 'contributor_actor'), '00000000-0000-4000-8000-00000000c204', 'PROJECT', (select value from b1_fixture where key = 'project'), '00000000-0000-4000-8000-00000000c101', (select value from b1_fixture where key = 'steward_actor')),
  ('00000000-0000-4000-8000-00000000c001', (select value from b1_fixture where key = 'agent_actor'), '00000000-0000-4000-8000-00000000c205', 'PROJECT', (select value from b1_fixture where key = 'project'), '00000000-0000-4000-8000-00000000c101', (select value from b1_fixture where key = 'steward_actor'));

-- S2: request revision, preserve v1, submit v2, accept only exact v2.
insert into b1_fixture(key, result)
select 's2_opportunity', public.b1_create_opportunity(
  (select value from b1_fixture where key = 'steward_actor'),
  (select value from b1_fixture where key = 'project'),
  'Oportunidade S2', 'Testar revisão antes de qualquer compromisso.',
  'A nova versão deve responder ao pedido explícito.',
  'Uma proposta v2 aceita com v1 preservada.', 3,
  '42000000-0000-4000-8000-000000000001', 's2-create-0001'
);
update b1_fixture set value = (result ->> 'opportunity_id')::uuid where key = 's2_opportunity';
select is((select result ->> 'visibility' from b1_fixture where key = 's2_opportunity'), 'PROJECT', 'new opportunity is PROJECT by default');
select is((select result ->> 'state' from b1_fixture where key = 's2_opportunity'), 'DRAFT', 'new opportunity is a draft before separate publication');
update b1_fixture set result = public.b1_publish_opportunity(
  (select value from b1_fixture where key = 'steward_actor'), value, 1,
  '42000000-0000-4000-8000-000000000002', 's2-publish-001'
) where key = 's2_opportunity';
select is((select result ->> 'visibility' from b1_fixture where key = 's2_opportunity'), 'PUBLIC', 'separate publication command changes visibility');

select set_config('request.jwt.claim.sub', '41000000-0000-4000-8000-000000000002', true);
insert into b1_fixture(key, result)
select 's2_proposal', public.b1_submit_proposal(
  (select value from b1_fixture where key = 'contributor_actor'),
  (select value from b1_fixture where key = 's2_opportunity'),
  'Proposta inicial que será revisada explicitamente.', 'Execução sob condições v1.',
  'Primeira formulação da entrega.', 'Sem recompensa econômica.',
  '42000000-0000-4000-8000-000000000003', 's2-submit-0001'
);
update b1_fixture set value = (result ->> 'proposal_id')::uuid where key = 's2_proposal';

select set_config('request.jwt.claim.sub', '41000000-0000-4000-8000-000000000001', true);
update b1_fixture set result = public.b1_request_proposal_revision(
  (select value from b1_fixture where key = 'steward_actor'), value, 1,
  'Especificar critérios verificáveis na entrega.',
  '42000000-0000-4000-8000-000000000004', 's2-request-0001'
) where key = 's2_proposal';
select is((select count(*)::integer from public.commitments where proposal_id = (select value from b1_fixture where key = 's2_proposal')), 0, 'S2 revision request creates no premature commitment');

select set_config('request.jwt.claim.sub', '41000000-0000-4000-8000-000000000002', true);
update b1_fixture set result = public.b1_submit_proposal_revision(
  (select value from b1_fixture where key = 'contributor_actor'), value, 2,
  'Proposta revisada com critério verificável preservado.', 'Execução sob condições v2.',
  'Entrega v2 com resultado verificável.', 'Sem recompensa econômica.',
  '42000000-0000-4000-8000-000000000005', 's2-revise-0001'
) where key = 's2_proposal';
select is((select count(*)::integer from public.proposal_versions where proposal_id = (select value from b1_fixture where key = 's2_proposal')), 2, 'S2 revision creates a second immutable version');
select is((select statement from public.proposal_versions where proposal_id = (select value from b1_fixture where key = 's2_proposal') and version = 1), 'Proposta inicial que será revisada explicitamente.', 'S2 prior version is preserved byte-for-byte');

select set_config('request.jwt.claim.sub', '41000000-0000-4000-8000-000000000001', true);
select throws_ok(
  format(
    'select public.b1_accept_proposal(%L::uuid,%L::uuid,2,1,2,3,%L,%L::uuid,%L)',
    (select value from b1_fixture where key = 'steward_actor'),
    (select value from b1_fixture where key = 's2_proposal'),
    'Tentativa de aceitar versão anterior.', '42000000-0000-4000-8000-000000000099', 's2-stale-version'
  ),
  'P0001', 'CZ409:STALE_VERSION', 'S2 acceptance cannot silently target superseded proposal v1'
);
insert into b1_fixture(key, result)
select 's2_commitment', public.b1_accept_proposal(
  (select value from b1_fixture where key = 'steward_actor'),
  (select value from b1_fixture where key = 's2_proposal'),
  2, 2, 2, 3, 'Aceite explícito da versão revisada.',
  '42000000-0000-4000-8000-000000000006', 's2-accept-0001'
);
update b1_fixture set value = (result ->> 'commitment_id')::uuid where key = 's2_commitment';
select is((select proposal_version from public.commitments where id = (select value from b1_fixture where key = 's2_commitment')), 2, 'S2 commitment references exact accepted proposal v2');
select is((select opportunity_version from public.commitments where id = (select value from b1_fixture where key = 's2_commitment')), 2, 'S2 commitment references exact opportunity v2');
select is((select state from public.proposals where id = (select value from b1_fixture where key = 's2_proposal')), 'ACCEPTED', 'S2 explicit acceptance changes proposal state');
select is(public.b1_reconcile_proposal((select value from b1_fixture where key = 's2_proposal')), '{}'::text[], 'S2 accepted proposal reconciles');
select is(public.b1_reconcile_opportunity((select value from b1_fixture where key = 's2_opportunity')), '{}'::text[], 'S2 opportunity reconciles');

-- S3: explicit rejection preserves a decision and never creates a commitment.
select set_config('request.jwt.claim.sub', '41000000-0000-4000-8000-000000000002', true);
insert into b1_fixture(key, result)
select 's3_proposal', public.b1_submit_proposal(
  (select value from b1_fixture where key = 'contributor_actor'),
  (select value from b1_fixture where key = 's2_opportunity'),
  'Proposta separada destinada à rejeição explícita.', 'Condição incompatível com a oportunidade.',
  'Entrega que não será aceita.', 'Sem recompensa econômica.',
  '43000000-0000-4000-8000-000000000001', 's3-submit-0001'
);
update b1_fixture set value = (result ->> 'proposal_id')::uuid where key = 's3_proposal';
select set_config('request.jwt.claim.sub', '41000000-0000-4000-8000-000000000001', true);
update b1_fixture set result = public.b1_reject_proposal(
  (select value from b1_fixture where key = 'steward_actor'), value, 1,
  'Condições incompatíveis, sem criar obrigação.',
  '43000000-0000-4000-8000-000000000002', 's3-reject-0001'
) where key = 's3_proposal';
select is((select state from public.proposals where id = (select value from b1_fixture where key = 's3_proposal')), 'REJECTED', 'S3 proposal is explicitly rejected');
select is((select count(*)::integer from public.commitments where proposal_id = (select value from b1_fixture where key = 's3_proposal')), 0, 'S3 rejection creates no commitment');
select is((select count(*)::integer from public.decision_records where target_id = (select value from b1_fixture where key = 's3_proposal') and decision_type = 'PROPOSAL_REJECT'), 1, 'S3 rejection preserves one append-only decision');
select is(public.b1_reconcile_proposal((select value from b1_fixture where key = 's3_proposal')), '{}'::text[], 'S3 rejected proposal reconciles');

-- S4: a bounded AI agent may submit, but cannot accept its own proposal or expand authority.
select set_config('request.jwt.claim.sub', '41000000-0000-4000-8000-000000000001', true);
insert into b1_fixture(key, result)
select 's4_accept_delegation', public.b1_grant_delegation(
  (select value from b1_fixture where key = 'steward_actor'),
  (select value from b1_fixture where key = 'agent_actor'),
  'proposal.accept', 'PROJECT', (select value from b1_fixture where key = 'project'),
  now() + interval '1 hour', '44000000-0000-4000-8000-000000000001', 's4-grant-accept'
);
update b1_fixture set value = (result ->> 'delegation_id')::uuid where key = 's4_accept_delegation';
insert into b1_fixture(key, result)
select 's4_manage_delegation', public.b1_grant_delegation(
  (select value from b1_fixture where key = 'steward_actor'),
  (select value from b1_fixture where key = 'agent_actor'),
  'delegation.manage', 'PROJECT', (select value from b1_fixture where key = 'project'),
  now() + interval '1 hour', '44000000-0000-4000-8000-000000000002', 's4-grant-manage'
);
update b1_fixture set value = (result ->> 'delegation_id')::uuid where key = 's4_manage_delegation';

select set_config('request.jwt.claim.sub', '41000000-0000-4000-8000-000000000003', true);
insert into b1_fixture(key, result)
select 's4_proposal', public.b1_submit_proposal(
  (select value from b1_fixture where key = 'agent_actor'),
  (select value from b1_fixture where key = 's2_opportunity'),
  'Proposta submetida por agente com autoridade limitada.', 'Sem ampliação autônoma de escopo.',
  'Um registro de proposta atribuível ao agente.', 'Sem recompensa econômica.',
  '44000000-0000-4000-8000-000000000003', 's4-submit-agent'
);
update b1_fixture set value = (result ->> 'proposal_id')::uuid where key = 's4_proposal';
select is((select proposer_actor_id from public.proposals where id = (select value from b1_fixture where key = 's4_proposal')), (select value from b1_fixture where key = 'agent_actor'), 'S4 bounded agent submission preserves the agent actor');
insert into b1_fixture(key, result)
select 's4_self_accept', public.b1_accept_proposal(
  (select value from b1_fixture where key = 'agent_actor'),
  (select value from b1_fixture where key = 's4_proposal'),
  2, 1, 2, 1, 'Tentativa de autoaceite.',
  '44000000-0000-4000-8000-000000000004', 's4-self-accept'
);
select is((select result ->> 'error_code' from b1_fixture where key = 's4_self_accept'), 'SELF_ACCEPTANCE_DENIED', 'S4 agent cannot accept its own proposal even with delegated capability');
select is((select count(*)::integer from public.decision_records where target_id = (select value from b1_fixture where key = 's4_proposal') and outcome = 'DENY'), 1, 'S4 denied self-acceptance is auditable');
insert into b1_fixture(key, result)
select 's4_self_expand', public.b1_grant_delegation(
  (select value from b1_fixture where key = 'agent_actor'),
  (select value from b1_fixture where key = 'agent_actor'),
  'proposal.reject', 'PROJECT', (select value from b1_fixture where key = 'project'),
  now() + interval '2 hours', '44000000-0000-4000-8000-000000000005', 's4-self-expand'
);
select is((select result ->> 'error_code' from b1_fixture where key = 's4_self_expand'), 'SELF_ESCALATION_DENIED', 'S4 AI agent cannot expand its own authority');
select is((select count(*)::integer from public.decision_records where target_id = (select value from b1_fixture where key = 'agent_actor') and decision_type = 'DELEGATION_GRANT' and outcome = 'DENY'), 1, 'S4 denied self-escalation is auditable');
select set_config('request.jwt.claim.sub', '41000000-0000-4000-8000-000000000001', true);
update b1_fixture set result = public.b1_revoke_delegation(
  (select value from b1_fixture where key = 'steward_actor'), value, 1,
  '44000000-0000-4000-8000-000000000006', 's4-revoke-accept'
) where key = 's4_accept_delegation';
select is((select status from public.delegations where id = (select value from b1_fixture where key = 's4_accept_delegation')), 'REVOKED', 'S4 bounded delegation is revocable');

-- S7: capacity one produces one commitment and a typed loser.
insert into b1_fixture(key, result)
select 's7_opportunity', public.b1_create_opportunity(
  (select value from b1_fixture where key = 'steward_actor'),
  (select value from b1_fixture where key = 'project'),
  'Oportunidade S7', 'Testar duas aceitações para uma única vaga.',
  'Somente uma proposta pode formar compromisso.', 'Um vencedor e um erro tipado.', 1,
  '45000000-0000-4000-8000-000000000001', 's7-create-0001'
);
update b1_fixture set value = (result ->> 'opportunity_id')::uuid where key = 's7_opportunity';
update b1_fixture set result = public.b1_publish_opportunity(
  (select value from b1_fixture where key = 'steward_actor'), value, 1,
  '45000000-0000-4000-8000-000000000002', 's7-publish-001'
) where key = 's7_opportunity';
select set_config('request.jwt.claim.sub', '41000000-0000-4000-8000-000000000002', true);
insert into b1_fixture(key, result)
select 's7_proposal_a', public.b1_submit_proposal(
  (select value from b1_fixture where key = 'contributor_actor'), (select value from b1_fixture where key = 's7_opportunity'),
  'Primeira proposta concorrente para a vaga única.', 'Mesmas condições da disputa.', 'Entrega A.', 'Sem recompensa.',
  '45000000-0000-4000-8000-000000000003', 's7-submit-a01'
);
update b1_fixture set value = (result ->> 'proposal_id')::uuid where key = 's7_proposal_a';
select set_config('request.jwt.claim.sub', '41000000-0000-4000-8000-000000000003', true);
insert into b1_fixture(key, result)
select 's7_proposal_b', public.b1_submit_proposal(
  (select value from b1_fixture where key = 'agent_actor'), (select value from b1_fixture where key = 's7_opportunity'),
  'Segunda proposta concorrente para a vaga única.', 'Mesmas condições da disputa.', 'Entrega B.', 'Sem recompensa.',
  '45000000-0000-4000-8000-000000000004', 's7-submit-b01'
);
update b1_fixture set value = (result ->> 'proposal_id')::uuid where key = 's7_proposal_b';
select set_config('request.jwt.claim.sub', '41000000-0000-4000-8000-000000000001', true);
insert into b1_fixture(key, result)
select 's7_winner', public.b1_accept_proposal(
  (select value from b1_fixture where key = 'steward_actor'), (select value from b1_fixture where key = 's7_proposal_a'),
  2, 1, 2, 1, 'Primeiro aceite concorrente.',
  '45000000-0000-4000-8000-000000000005', 's7-accept-a01'
);
select throws_ok(
  format(
    'select public.b1_accept_proposal(%L::uuid,%L::uuid,2,1,2,1,%L,%L::uuid,%L)',
    (select value from b1_fixture where key = 'steward_actor'),
    (select value from b1_fixture where key = 's7_proposal_b'),
    'Segundo aceite concorrente.', '45000000-0000-4000-8000-000000000006', 's7-accept-b01'
  ),
  'P0001', 'CZ409:STALE_VERSION', 'S7 losing acceptance receives typed stale-version error'
);
select is((select count(*)::integer from public.commitments where opportunity_id = (select value from b1_fixture where key = 's7_opportunity')), 1, 'S7 capacity one has exactly one commitment');
select is((select state from public.opportunities where id = (select value from b1_fixture where key = 's7_opportunity')), 'CLOSED', 'S7 filled opportunity closes');
select is((select count(*)::integer from public.opportunity_versions where opportunity_id = (select value from b1_fixture where key = 's7_opportunity')), 3, 'S7 close creates an immutable opportunity state version');
select is(public.b1_reconcile_opportunity((select value from b1_fixture where key = 's7_opportunity')), '{}'::text[], 'S7 winning material and events reconcile');

-- S11: replay returns the exact logical response; changed payload conflicts.
insert into b1_fixture(key, result)
select 's11_first', public.b1_create_opportunity(
  (select value from b1_fixture where key = 'steward_actor'), (select value from b1_fixture where key = 'project'),
  'Oportunidade S11', 'Testar replay idempotente após timeout.', 'Mesma chave e mesmo payload.',
  'Um único objeto, evento e recibo.', 2,
  '46000000-0000-4000-8000-000000000001', 's11-replay-0001'
);
insert into b1_fixture(key, result)
select 's11_replay', public.b1_create_opportunity(
  (select value from b1_fixture where key = 'steward_actor'), (select value from b1_fixture where key = 'project'),
  'Oportunidade S11', 'Testar replay idempotente após timeout.', 'Mesma chave e mesmo payload.',
  'Um único objeto, evento e recibo.', 2,
  '46000000-0000-4000-8000-000000000001', 's11-replay-0001'
);
select is((select result from b1_fixture where key = 's11_replay'), (select result from b1_fixture where key = 's11_first'), 'S11 replay returns the same logical response');
select is((select count(*)::integer from public.opportunities where id = ((select result from b1_fixture where key = 's11_first') ->> 'opportunity_id')::uuid), 1, 'S11 replay creates one object');
select is((select count(*)::integer from public.domain_events where aggregate_id = ((select result from b1_fixture where key = 's11_first') ->> 'opportunity_id')::uuid), 1, 'S11 replay creates one event');
select is((select count(*)::integer from public.command_receipts where actor_id = (select value from b1_fixture where key = 'steward_actor') and idempotency_key = 's11-replay-0001'), 1, 'S11 replay creates one receipt');
select throws_ok(
  format(
    'select public.b1_create_opportunity(%L::uuid,%L::uuid,%L,%L,%L,%L,3,%L::uuid,%L)',
    (select value from b1_fixture where key = 'steward_actor'), (select value from b1_fixture where key = 'project'),
    'Oportunidade S11 alterada', 'Payload diferente sob a mesma chave idempotente.', 'Mesma chave, payload diferente.',
    'O comando deve falhar sem duplicar objeto.', '46000000-0000-4000-8000-000000000099', 's11-replay-0001'
  ),
  'P0001', 'CZ409:IDEMPOTENCY_CONFLICT', 'S11 same key with different payload fails explicitly'
);

-- Direct client DML is denied, append-only records reject mutation, and reconciliation detects corruption.
set local role authenticated;
select throws_ok(
  $$insert into public.opportunities(cell_id, project_id, owner_actor_id, state, visibility, capacity) values ('00000000-0000-4000-8000-00000000c001', '00000000-0000-4000-8000-000000000101', '00000000-0000-4000-8000-000000000001', 'DRAFT', 'PROJECT', 1)$$,
  '42501', null, 'authenticated client has no direct DML on B1 material tables'
);
select throws_ok(
  $$select private.b1_finish_command('00000000-0000-4000-8000-000000000001', 'forbidden-receipt', '{}'::jsonb)$$,
  '42501', null, 'authenticated client cannot invoke private B1 mutation helpers'
);
reset role;
select throws_ok(
  $$update public.proposal_versions set statement = 'Tentativa de reescrever uma versão aceita e já preservada.' where proposal_id = (select value from b1_fixture where key = 's2_proposal') and version = 2$$,
  '23000', 'proposal_versions is append-only', 'proposal versions cannot be overwritten'
);
select throws_ok(
  $$delete from public.decision_records where target_id = (select value from b1_fixture where key = 's3_proposal')$$,
  '23000', 'decision_records is append-only', 'decision records cannot be deleted'
);
select throws_ok(
  $$delete from public.domain_events where aggregate_id = (select value from b1_fixture where key = 's2_proposal')$$,
  '23000', 'domain_events is append-only', 'domain events cannot be deleted'
);

update public.opportunities
set material_version = material_version + 10
where id = ((select result from b1_fixture where key = 's11_first') ->> 'opportunity_id')::uuid;
select ok(
  'event_material_version' = any(public.b1_reconcile_opportunity(((select result from b1_fixture where key = 's11_first') ->> 'opportunity_id')::uuid)),
  'reconciler detects privileged material/event divergence'
);

select * from finish();
rollback;

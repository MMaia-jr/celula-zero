begin;

create extension if not exists pgtap with schema extensions;
select no_plan();

select has_table('public', 'verification_requests', 'B2-B2 verification requests exist');
select has_table('public', 'verifications', 'B2-B2 verifications exist');
select has_table('public', 'verification_evidence_items', 'B2-B2 examined-evidence links exist');
select has_function(
  'public', 'b2b2_request_verification',
  array['uuid','uuid','uuid','text','text','timestamp with time zone','uuid','text'],
  'B2-B2 request command exists'
);
select has_function(
  'public', 'b2b2_issue_verification',
  array['uuid','uuid','text','text','text','text','uuid[]','uuid','text'],
  'B2-B2 issue command exists'
);
select has_function('public', 'b2b2_reconcile_request', array['uuid'], 'B2-B2 request reconciler exists');
select has_function('public', 'b2b2_reconcile_verification', array['uuid'], 'B2-B2 verification reconciler exists');
select is(
  (select count(*)::integer from public.capability_definitions
   where code in ('verification.request', 'verification.issue')),
  2,
  'B2-B2 capabilities are registered'
);
select is(
  (select count(*)::integer
   from public.role_capabilities
   where role_id = '00000000-0000-4000-8000-00000000c202'
     and capability_code in ('verification.request', 'verification.issue')),
  2,
  'project steward receives request and issue capabilities'
);
select ok(
  not has_table_privilege('authenticated', 'public.verification_requests', 'INSERT')
  and not has_table_privilege('authenticated', 'public.verification_requests', 'UPDATE')
  and not has_table_privilege('authenticated', 'public.verification_requests', 'DELETE')
  and not has_table_privilege('authenticated', 'public.verifications', 'INSERT')
  and not has_table_privilege('authenticated', 'public.verifications', 'UPDATE')
  and not has_table_privilege('authenticated', 'public.verifications', 'DELETE')
  and not has_table_privilege('authenticated', 'public.verification_evidence_items', 'INSERT')
  and not has_table_privilege('authenticated', 'public.verification_evidence_items', 'UPDATE')
  and not has_table_privilege('authenticated', 'public.verification_evidence_items', 'DELETE'),
  'authenticated clients cannot mutate B2-B2 tables directly'
);
select ok(
  not has_table_privilege('anon', 'public.verification_requests', 'SELECT')
  and not has_table_privilege('anon', 'public.verifications', 'SELECT')
  and not has_table_privilege('anon', 'public.verification_evidence_items', 'SELECT'),
  'anonymous clients cannot read B2-B2 records'
);

create temporary table b2b2_fixture (
  key text primary key,
  value uuid,
  result jsonb
);

insert into public.pilot_invites(email, label) values
  ('b2b2-steward@example.test', 'B2-B2 steward'),
  ('b2b2-contributor@example.test', 'B2-B2 contributor'),
  ('b2b2-reviewer@example.test', 'B2-B2 reviewer'),
  ('b2b2-outsider@example.test', 'B2-B2 outsider');

insert into auth.users(
  id, aud, role, email, raw_app_meta_data, raw_user_meta_data, created_at, updated_at
) values
  ('71000000-0000-4000-8000-000000000001', 'authenticated', 'authenticated',
   'b2b2-steward@example.test', '{"provider":"email","providers":["email"]}',
   '{"name":"B2-B2 Steward"}', now(), now()),
  ('71000000-0000-4000-8000-000000000002', 'authenticated', 'authenticated',
   'b2b2-contributor@example.test', '{"provider":"email","providers":["email"]}',
   '{"name":"B2-B2 Contributor"}', now(), now()),
  ('71000000-0000-4000-8000-000000000003', 'authenticated', 'authenticated',
   'b2b2-reviewer@example.test', '{"provider":"email","providers":["email"]}',
   '{"name":"B2-B2 Reviewer"}', now(), now()),
  ('71000000-0000-4000-8000-000000000004', 'authenticated', 'authenticated',
   'b2b2-outsider@example.test', '{"provider":"email","providers":["email"]}',
   '{"name":"B2-B2 Outsider"}', now(), now());

insert into b2b2_fixture(key, value)
select 'steward_actor', actor_id from public.actor_memberships
where profile_id = '71000000-0000-4000-8000-000000000001' and role = 'OWNER';
insert into b2b2_fixture(key, value)
select 'contributor_actor', actor_id from public.actor_memberships
where profile_id = '71000000-0000-4000-8000-000000000002' and role = 'OWNER';
insert into b2b2_fixture(key, value)
select 'reviewer_actor', actor_id from public.actor_memberships
where profile_id = '71000000-0000-4000-8000-000000000003' and role = 'OWNER';
insert into b2b2_fixture(key, value)
select 'outsider_actor', actor_id from public.actor_memberships
where profile_id = '71000000-0000-4000-8000-000000000004' and role = 'OWNER';

select set_config('request.jwt.claim.sub', '71000000-0000-4000-8000-000000000001', true);
insert into b2b2_fixture(key, result)
select 'project', to_jsonb(x)
from public.create_project_atomic(
  'Projeto Gate B2-B2',
  'projeto-gate-b2b2',
  'Projeto isolado para testar revisão contextual e separação de outcome.',
  'Verificar claims com método, evidência examinada e conflito explicitamente atribuídos.',
  'Produzir verificações contextuais sem promover automaticamente claims ou compromissos.',
  'Reviewers distintos recebem apenas o acesso necessário ao claim solicitado.',
  'Sem outcome, contestação, reputação, score, token, DAO ou Web3 neste gate.',
  array['verification', 'review'],
  'VOLUNTARY',
  'OPEN',
  false
) x;
update b2b2_fixture
set value = (result ->> 'project_id')::uuid
where key = 'project';

insert into public.role_assignments(
  cell_id, actor_id, role_id, scope_type, scope_id,
  policy_version_id, granted_by_actor_id
) values
  (
    '00000000-0000-4000-8000-00000000c001',
    (select value from b2b2_fixture where key = 'steward_actor'),
    '00000000-0000-4000-8000-00000000c202',
    'PROJECT', (select value from b2b2_fixture where key = 'project'),
    '00000000-0000-4000-8000-00000000c101',
    (select value from b2b2_fixture where key = 'steward_actor')
  ),
  (
    '00000000-0000-4000-8000-00000000c001',
    (select value from b2b2_fixture where key = 'contributor_actor'),
    '00000000-0000-4000-8000-00000000c204',
    'PROJECT', (select value from b2b2_fixture where key = 'project'),
    '00000000-0000-4000-8000-00000000c101',
    (select value from b2b2_fixture where key = 'steward_actor')
  ),
  (
    '00000000-0000-4000-8000-00000000c001',
    (select value from b2b2_fixture where key = 'outsider_actor'),
    '00000000-0000-4000-8000-00000000c204',
    'PROJECT', (select value from b2b2_fixture where key = 'project'),
    '00000000-0000-4000-8000-00000000c101',
    (select value from b2b2_fixture where key = 'steward_actor')
  );

insert into public.opportunities(
  id, cell_id, project_id, owner_actor_id, state, visibility,
  current_version, material_version, capacity
)
select
  '72000000-0000-4000-8000-000000000001',
  '00000000-0000-4000-8000-00000000c001',
  value,
  (select value from b2b2_fixture where key = 'steward_actor'),
  'OPEN', 'PROJECT', 1, 1, 1
from b2b2_fixture where key = 'project';

insert into public.opportunity_versions(
  opportunity_id, version, title, statement, conditions, expected_result,
  capacity, state, visibility, created_by_actor_id
) values (
  '72000000-0000-4000-8000-000000000001', 1,
  'Verification fixture',
  'Produzir um artefato restrito e submetê-lo a uma revisão contextual.',
  'A revisão deve declarar critérios, método, evidência examinada e conflito.',
  'Uma verification atribuída sem produzir outcome automático.',
  1, 'OPEN', 'PROJECT',
  (select value from b2b2_fixture where key = 'steward_actor')
);

insert into public.proposals(
  id, cell_id, opportunity_id, proposer_actor_id, state, visibility,
  current_version, material_version
) values (
  '72000000-0000-4000-8000-000000000101',
  '00000000-0000-4000-8000-00000000c001',
  '72000000-0000-4000-8000-000000000001',
  (select value from b2b2_fixture where key = 'contributor_actor'),
  'ACCEPTED', 'PROJECT', 1, 2
);

insert into public.proposal_versions(
  proposal_id, version, statement, conditions, expected_delivery,
  reward_expectation, created_by_actor_id
) values (
  '72000000-0000-4000-8000-000000000101', 1,
  'Submeter material sintético para revisão B2-B2.',
  'Não converter review em decisão de outcome.',
  'Artefato, claim e evidence ligados explicitamente.',
  'Sem recompensa econômica.',
  (select value from b2b2_fixture where key = 'contributor_actor')
);

insert into public.commitments(
  id, cell_id, project_id, opportunity_id, opportunity_version,
  proposal_id, proposal_version, proposer_actor_id, accepted_by_actor_id
) values (
  '72000000-0000-4000-8000-000000000201',
  '00000000-0000-4000-8000-00000000c001',
  (select value from b2b2_fixture where key = 'project'),
  '72000000-0000-4000-8000-000000000001', 1,
  '72000000-0000-4000-8000-000000000101', 1,
  (select value from b2b2_fixture where key = 'contributor_actor'),
  (select value from b2b2_fixture where key = 'steward_actor')
);

insert into public.contributions(
  id, cell_id, project_id, commitment_id, author_actor_id,
  description, limitations, visibility, sensitivity
) values (
  '72000000-0000-4000-8000-000000000301',
  '00000000-0000-4000-8000-00000000c001',
  (select value from b2b2_fixture where key = 'project'),
  '72000000-0000-4000-8000-000000000201',
  (select value from b2b2_fixture where key = 'contributor_actor'),
  'Contribuição privada para o cenário de verification B2-B2.',
  'Material sintético sem utilidade externa demonstrada.',
  'PRIVATE', 'RESTRICTED_KNOWLEDGE'
);

insert into public.artifacts(
  id, cell_id, project_id, contribution_id, created_by_actor_id,
  kind, uri, digest_algorithm, digest, media_type, size_bytes,
  visibility, sensitivity, retention_class
) values (
  '72000000-0000-4000-8000-000000000401',
  '00000000-0000-4000-8000-00000000c001',
  (select value from b2b2_fixture where key = 'project'),
  '72000000-0000-4000-8000-000000000301',
  (select value from b2b2_fixture where key = 'contributor_actor'),
  'DOCUMENT', 'https://example.test/b2b2/private.md',
  'SHA256', repeat('d', 64), 'text/markdown', 1500,
  'PRIVATE', 'RESTRICTED_KNOWLEDGE', 'EXTERNAL_REFERENCE'
);

select set_config('request.jwt.claim.sub', '71000000-0000-4000-8000-000000000002', true);
insert into b2b2_fixture(key, result)
select 'claim', public.b2b1_record_claim(
  (select value from b2b2_fixture where key = 'contributor_actor'),
  'ARTIFACT',
  '72000000-0000-4000-8000-000000000401',
  'O artefato satisfaz o comportamento declarado para o cenário privado B2-B2.',
  'O claim vale apenas para o método e critérios explicitamente solicitados.',
  null,
  '73000000-0000-4000-8000-000000000001',
  'b2b2-claim-001'
);
update b2b2_fixture set value = (result ->> 'claim_id')::uuid where key = 'claim';

insert into b2b2_fixture(key, result)
select 'evidence', public.b2b1_register_evidence(
  (select value from b2b2_fixture where key = 'contributor_actor'),
  (select value from b2b2_fixture where key = 'claim'),
  '72000000-0000-4000-8000-000000000401',
  'SUPPORTS',
  'Evidence privada ligada ao claim principal para revisão contextual.',
  'A relação documental ainda não constitui verification.',
  null,
  '73000000-0000-4000-8000-000000000002',
  'b2b2-evidence-001'
);
update b2b2_fixture set value = (result ->> 'evidence_item_id')::uuid where key = 'evidence';

insert into b2b2_fixture(key, result)
select 'other_claim', public.b2b1_record_claim(
  (select value from b2b2_fixture where key = 'contributor_actor'),
  'ARTIFACT',
  '72000000-0000-4000-8000-000000000401',
  'Um segundo claim sintético existe apenas para testar vínculo de evidence incorreto.',
  'Não pode emprestar evidence para outra verification sem link explícito.',
  null,
  '73000000-0000-4000-8000-000000000003',
  'b2b2-other-claim-001'
);
update b2b2_fixture set value = (result ->> 'claim_id')::uuid where key = 'other_claim';

insert into b2b2_fixture(key, result)
select 'other_evidence', public.b2b1_register_evidence(
  (select value from b2b2_fixture where key = 'contributor_actor'),
  (select value from b2b2_fixture where key = 'other_claim'),
  '72000000-0000-4000-8000-000000000401',
  'SUPPORTS',
  'Evidence privada ligada somente ao segundo claim sintético.',
  'Não está ligada ao claim principal.',
  null,
  '73000000-0000-4000-8000-000000000004',
  'b2b2-other-evidence-001'
);
update b2b2_fixture set value = (result ->> 'evidence_item_id')::uuid where key = 'other_evidence';

-- Reviewer has no project role. The steward delegates only verification.issue.
select set_config('request.jwt.claim.sub', '71000000-0000-4000-8000-000000000001', true);
insert into b2b2_fixture(key, result)
select 'reviewer_delegation', public.b1_grant_delegation(
  (select value from b2b2_fixture where key = 'steward_actor'),
  (select value from b2b2_fixture where key = 'reviewer_actor'),
  'verification.issue',
  'PROJECT',
  (select value from b2b2_fixture where key = 'project'),
  now() + interval '1 day',
  '73000000-0000-4000-8000-000000000010',
  'b2b2-reviewer-delegation-001'
);
update b2b2_fixture
set value = (result ->> 'delegation_id')::uuid
where key = 'reviewer_delegation';

grant select on b2b2_fixture to authenticated;

-- Before a request, delegated issue authority does not expose unrelated material.
select set_config('request.jwt.claim.sub', '71000000-0000-4000-8000-000000000003', true);
set local role authenticated;
select is((select count(*)::integer from public.claims), 0, 'reviewer cannot read private claims before assignment');
select is((select count(*)::integer from public.evidence_items), 0, 'reviewer cannot read private evidence before assignment');
reset role;

-- Contributor has no verification.request capability.
select set_config('request.jwt.claim.sub', '71000000-0000-4000-8000-000000000002', true);
select throws_ok(
  format(
    'select public.b2b2_request_verification(%L::uuid,%L::uuid,%L::uuid,%L,%L,null,%L::uuid,%L)',
    (select value from b2b2_fixture where key = 'contributor_actor'),
    (select value from b2b2_fixture where key = 'claim'),
    (select value from b2b2_fixture where key = 'reviewer_actor'),
    'Contributor não deve poder solicitar review sem capability.',
    'MANUAL_REVIEW',
    '73000000-0000-4000-8000-000000000011',
    'b2b2-no-request-cap-001'
  ),
  '42501', 'CZ403:CAPABILITY_DENIED',
  'actor without verification.request is denied'
);

-- A requester cannot assign an actor who lacks verification.issue.
select set_config('request.jwt.claim.sub', '71000000-0000-4000-8000-000000000001', true);
select throws_ok(
  format(
    'select public.b2b2_request_verification(%L::uuid,%L::uuid,%L::uuid,%L,%L,null,%L::uuid,%L)',
    (select value from b2b2_fixture where key = 'steward_actor'),
    (select value from b2b2_fixture where key = 'claim'),
    (select value from b2b2_fixture where key = 'outsider_actor'),
    'Reviewer sem capability não pode ser atribuído ao request.',
    'MANUAL_REVIEW',
    '73000000-0000-4000-8000-000000000012',
    'b2b2-reviewer-no-cap-001'
  ),
  '42501', 'CZ403:REVIEWER_CAPABILITY_REQUIRED',
  'request rejects reviewer without verification.issue'
);

select throws_ok(
  format(
    'select public.b2b2_request_verification(%L::uuid,%L::uuid,%L::uuid,%L,%L,now() - interval ''1 minute'',%L::uuid,%L)',
    (select value from b2b2_fixture where key = 'steward_actor'),
    (select value from b2b2_fixture where key = 'claim'),
    (select value from b2b2_fixture where key = 'reviewer_actor'),
    'Deadline passado deve ser rejeitado.',
    'MANUAL_REVIEW',
    '73000000-0000-4000-8000-000000000013',
    'b2b2-past-deadline-001'
  ),
  '22023', 'CZ422:INVALID_VERIFICATION_DEADLINE',
  'past verification deadline is rejected'
);

insert into b2b2_fixture(key, result)
select 'request', public.b2b2_request_verification(
  (select value from b2b2_fixture where key = 'steward_actor'),
  (select value from b2b2_fixture where key = 'claim'),
  (select value from b2b2_fixture where key = 'reviewer_actor'),
  'Compare o claim somente com a evidence explicitamente ligada e registre limitações.',
  'MANUAL_REVIEW',
  now() + interval '1 day',
  '73000000-0000-4000-8000-000000000020',
  'b2b2-request-001'
);
update b2b2_fixture
set value = (result ->> 'verification_request_id')::uuid
where key = 'request';

select is((select state from public.verification_requests where id = (select value from b2b2_fixture where key = 'request')), 'OPEN', 'verification request begins OPEN');
select is((select independence from public.verification_requests where id = (select value from b2b2_fixture where key = 'request')), 'INDEPENDENT', 'distinct reviewer is independent under current conflict rules');
select is((select conflict_codes from public.verification_requests where id = (select value from b2b2_fixture where key = 'request')), '{}'::text[], 'independent request has no conflict codes');
select is((select visibility || ':' || sensitivity from public.verification_requests where id = (select value from b2b2_fixture where key = 'request')), 'PRIVATE:RESTRICTED_KNOWLEDGE', 'request inherits restricted claim metadata exactly');
select is((select count(*)::integer from public.domain_events where aggregate_type = 'VERIFICATION_REQUEST' and aggregate_id = (select value from b2b2_fixture where key = 'request') and event_type = 'VERIFICATION_REQUESTED'), 1, 'request creates one domain event');
select ok(
  not exists (
    select 1 from public.domain_events
    where aggregate_type = 'VERIFICATION_REQUEST'
      and aggregate_id = (select value from b2b2_fixture where key = 'request')
      and payload::text like '%Compare o claim somente%'
  ),
  'request event does not copy criteria text'
);

select is(
  public.b2b2_request_verification(
    (select value from b2b2_fixture where key = 'steward_actor'),
    (select value from b2b2_fixture where key = 'claim'),
    (select value from b2b2_fixture where key = 'reviewer_actor'),
    'Compare o claim somente com a evidence explicitamente ligada e registre limitações.',
    'MANUAL_REVIEW',
    (select due_at from public.verification_requests where id = (select value from b2b2_fixture where key = 'request')),
    '73000000-0000-4000-8000-000000000021',
    'b2b2-request-001'
  ) ->> 'verification_request_id',
  (select value::text from b2b2_fixture where key = 'request'),
  'request idempotency replay returns same logical object'
);
select is((select count(*)::integer from public.verification_requests where claim_id = (select value from b2b2_fixture where key = 'claim')), 1, 'request replay creates no duplicate');

select throws_ok(
  format(
    'select public.b2b2_request_verification(%L::uuid,%L::uuid,%L::uuid,%L,%L,null,%L::uuid,%L)',
    (select value from b2b2_fixture where key = 'steward_actor'),
    (select value from b2b2_fixture where key = 'claim'),
    (select value from b2b2_fixture where key = 'reviewer_actor'),
    'Critérios diferentes para a mesma chave idempotente.',
    'MANUAL_REVIEW',
    '73000000-0000-4000-8000-000000000022',
    'b2b2-request-001'
  ),
  'P0001', 'CZ409:IDEMPOTENCY_CONFLICT',
  'request idempotency conflict is typed'
);

-- Assignment creates bounded access to exactly the requested claim and linked evidence.
select set_config('request.jwt.claim.sub', '71000000-0000-4000-8000-000000000003', true);
set local role authenticated;
select is((select count(*)::integer from public.claims), 1, 'assigned reviewer can read only requested private claim');
select is((select count(*)::integer from public.evidence_items), 1, 'assigned reviewer can read only evidence linked to requested claim');
select is((select count(*)::integer from public.verification_requests), 1, 'assigned reviewer can read own request');
select is((select count(*)::integer from public.domain_events where event_type = 'VERIFICATION_REQUESTED'), 1, 'assigned reviewer can read restricted request event');
reset role;

select set_config('request.jwt.claim.sub', '71000000-0000-4000-8000-000000000004', true);
set local role authenticated;
select is((select count(*)::integer from public.claims), 0, 'unrelated contributor cannot read another author private claims');
select is((select count(*)::integer from public.verification_requests), 0, 'unrelated contributor cannot read private verification request');
select is((select count(*)::integer from public.domain_events where event_type = 'VERIFICATION_REQUESTED'), 0, 'unrelated contributor cannot read restricted request event');
reset role;

select set_config('request.jwt.claim.sub', '71000000-0000-4000-8000-000000000003', true);
insert into b2b2_fixture(key, result)
select 'verification', public.b2b2_issue_verification(
  (select value from b2b2_fixture where key = 'reviewer_actor'),
  (select value from b2b2_fixture where key = 'request'),
  'MANUAL_REVIEW',
  'O material examinado atende aos critérios sintéticos declarados neste request.',
  'PASS',
  'PASS limitado à evidence examinada e ao método declarado; não constitui outcome.',
  array[(select value from b2b2_fixture where key = 'evidence')],
  '73000000-0000-4000-8000-000000000030',
  'b2b2-issue-001'
);
update b2b2_fixture set value = (result ->> 'verification_id')::uuid where key = 'verification';

select is((select state from public.verification_requests where id = (select value from b2b2_fixture where key = 'request')), 'COMPLETED', 'issue completes the request');
select is((select classification from public.verifications where id = (select value from b2b2_fixture where key = 'verification')), 'PASS', 'reviewer can issue PASS');
select is((select independence from public.verifications where id = (select value from b2b2_fixture where key = 'verification')), 'INDEPENDENT', 'issued verification records independence snapshot');
select is((select count(*)::integer from public.verification_evidence_items where verification_id = (select value from b2b2_fixture where key = 'verification')), 1, 'verification records examined evidence explicitly');
select is((select count(*)::integer from public.domain_events where aggregate_type = 'VERIFICATION' and aggregate_id = (select value from b2b2_fixture where key = 'verification') and event_type = 'VERIFICATION_ISSUED'), 1, 'issue creates one domain event');
select is(
  (select delegation_id from public.domain_events where aggregate_type = 'VERIFICATION' and aggregate_id = (select value from b2b2_fixture where key = 'verification') and event_type = 'VERIFICATION_ISSUED'),
  (select value from b2b2_fixture where key = 'reviewer_delegation'),
  'issued event preserves the delegation that authorized the reviewer'
);
select ok(
  not exists (
    select 1 from public.domain_events
    where aggregate_type = 'VERIFICATION'
      and aggregate_id = (select value from b2b2_fixture where key = 'verification')
      and payload::text like '%material examinado atende%'
  ),
  'verification event does not copy findings text'
);
select is((select state from public.claims where id = (select value from b2b2_fixture where key = 'claim')), 'RECORDED', 'PASS does not promote claim state');
select is((select state from public.evidence_items where id = (select value from b2b2_fixture where key = 'evidence')), 'DOCUMENTED', 'PASS does not promote evidence state');
select is((select state from public.commitments where id = '72000000-0000-4000-8000-000000000201'), 'ACCEPTED', 'PASS does not change commitment outcome/state');
select is((select count(*)::integer from public.domain_events where command_id = '73000000-0000-4000-8000-000000000030' and event_type like 'OUTCOME%'), 0, 'verification issue emits no outcome event');
select is(public.b2b2_reconcile_request((select value from b2b2_fixture where key = 'request')), '{}'::text[], 'completed verification request reconciles');
select is(public.b2b2_reconcile_verification((select value from b2b2_fixture where key = 'verification')), '{}'::text[], 'issued verification reconciles');

select is(
  public.b2b2_issue_verification(
    (select value from b2b2_fixture where key = 'reviewer_actor'),
    (select value from b2b2_fixture where key = 'request'),
    'MANUAL_REVIEW',
    'O material examinado atende aos critérios sintéticos declarados neste request.',
    'PASS',
    'PASS limitado à evidence examinada e ao método declarado; não constitui outcome.',
    array[(select value from b2b2_fixture where key = 'evidence')],
    '73000000-0000-4000-8000-000000000031',
    'b2b2-issue-001'
  ) ->> 'verification_id',
  (select value::text from b2b2_fixture where key = 'verification'),
  'issue idempotency replay returns same verification'
);
select is((select count(*)::integer from public.verifications where request_id = (select value from b2b2_fixture where key = 'request')), 1, 'issue replay creates no duplicate verification');

select throws_ok(
  format(
    'select public.b2b2_issue_verification(%L::uuid,%L::uuid,%L,%L,%L,%L,array[%L::uuid],%L::uuid,%L)',
    (select value from b2b2_fixture where key = 'reviewer_actor'),
    (select value from b2b2_fixture where key = 'request'),
    'MANUAL_REVIEW', 'Nova tentativa após request concluído.', 'FAIL', 'Deve ser negada.',
    (select value from b2b2_fixture where key = 'evidence'),
    '73000000-0000-4000-8000-000000000032', 'b2b2-second-issue-001'
  ),
  'P0001', 'CZ409:VERIFICATION_REQUEST_COMPLETED',
  'a request cannot produce a second verification'
);

select throws_ok(
  format('update public.verifications set classification = %L where id = %L::uuid', 'FAIL', (select value from b2b2_fixture where key = 'verification')),
  '23000', 'verifications is append-only', 'issued verification cannot be rewritten'
);
select throws_ok(
  format('delete from public.verification_evidence_items where verification_id = %L::uuid', (select value from b2b2_fixture where key = 'verification')),
  '23000', 'verification_evidence_items is append-only', 'examined evidence links cannot be deleted'
);

-- One OPEN request is reused to exercise invalid method/classification/evidence guards.
select set_config('request.jwt.claim.sub', '71000000-0000-4000-8000-000000000001', true);
insert into b2b2_fixture(key, result)
select 'guard_request', public.b2b2_request_verification(
  (select value from b2b2_fixture where key = 'steward_actor'),
  (select value from b2b2_fixture where key = 'claim'),
  (select value from b2b2_fixture where key = 'reviewer_actor'),
  'Request aberto para validar guards do comando de emissão.',
  'MANUAL_REVIEW', null,
  '73000000-0000-4000-8000-000000000040',
  'b2b2-guard-request-001'
);
update b2b2_fixture set value = (result ->> 'verification_request_id')::uuid where key = 'guard_request';

select set_config('request.jwt.claim.sub', '71000000-0000-4000-8000-000000000003', true);
select throws_ok(
  format('select public.b2b2_issue_verification(%L::uuid,%L::uuid,%L,%L,%L,%L,array[%L::uuid],%L::uuid,%L)',
    (select value from b2b2_fixture where key = 'reviewer_actor'), (select value from b2b2_fixture where key = 'guard_request'),
    'AUTOMATED_SCAN', 'Método divergente.', 'PASS', 'Deve falhar.', (select value from b2b2_fixture where key = 'evidence'),
    '73000000-0000-4000-8000-000000000041', 'b2b2-method-mismatch-001'),
  'P0001', 'CZ409:VERIFICATION_METHOD_MISMATCH', 'method must match the frozen request method'
);
select throws_ok(
  format('select public.b2b2_issue_verification(%L::uuid,%L::uuid,%L,%L,%L,%L,array[]::uuid[],%L::uuid,%L)',
    (select value from b2b2_fixture where key = 'reviewer_actor'), (select value from b2b2_fixture where key = 'guard_request'),
    'MANUAL_REVIEW', 'Sem evidence examinada.', 'PASS', 'Deve falhar.',
    '73000000-0000-4000-8000-000000000042', 'b2b2-empty-evidence-001'),
  '22023', 'CZ422:EVIDENCE_REQUIRED', 'verification requires at least one examined evidence item'
);
select throws_ok(
  format('select public.b2b2_issue_verification(%L::uuid,%L::uuid,%L,%L,%L,%L,array[%L::uuid],%L::uuid,%L)',
    (select value from b2b2_fixture where key = 'reviewer_actor'), (select value from b2b2_fixture where key = 'guard_request'),
    'MANUAL_REVIEW', 'Evidence pertence ao claim errado.', 'PASS', 'Deve falhar.', (select value from b2b2_fixture where key = 'other_evidence'),
    '73000000-0000-4000-8000-000000000043', 'b2b2-wrong-evidence-001'),
  'P0001', 'CZ409:EVIDENCE_NOT_LINKED_TO_REQUEST_CLAIM', 'evidence from another claim is rejected'
);
select throws_ok(
  format('select public.b2b2_issue_verification(%L::uuid,%L::uuid,%L,%L,%L,%L,array[%L::uuid],%L::uuid,%L)',
    (select value from b2b2_fixture where key = 'reviewer_actor'), (select value from b2b2_fixture where key = 'guard_request'),
    'MANUAL_REVIEW', 'Classificação inválida.', 'APPROVED', 'Deve falhar.', (select value from b2b2_fixture where key = 'evidence'),
    '73000000-0000-4000-8000-000000000044', 'b2b2-invalid-classification-001'),
  '22023', 'CZ422:INVALID_VERIFICATION_CLASSIFICATION', 'unsupported verification classification is rejected'
);

-- Create an OPEN request on the second claim, then revoke reviewer authority.
select set_config('request.jwt.claim.sub', '71000000-0000-4000-8000-000000000001', true);
insert into b2b2_fixture(key, result)
select 'revoked_request', public.b2b2_request_verification(
  (select value from b2b2_fixture where key = 'steward_actor'),
  (select value from b2b2_fixture where key = 'other_claim'),
  (select value from b2b2_fixture where key = 'reviewer_actor'),
  'Request para provar revogação de autoridade e acesso antes da emissão.',
  'MANUAL_REVIEW', null,
  '73000000-0000-4000-8000-000000000050',
  'b2b2-revoked-request-001'
);
update b2b2_fixture set value = (result ->> 'verification_request_id')::uuid where key = 'revoked_request';

select public.b1_revoke_delegation(
  (select value from b2b2_fixture where key = 'steward_actor'),
  (select value from b2b2_fixture where key = 'reviewer_delegation'),
  1,
  '73000000-0000-4000-8000-000000000051',
  'b2b2-revoke-reviewer-001'
);

select set_config('request.jwt.claim.sub', '71000000-0000-4000-8000-000000000003', true);
select throws_ok(
  format('select public.b2b2_issue_verification(%L::uuid,%L::uuid,%L,%L,%L,%L,array[%L::uuid],%L::uuid,%L)',
    (select value from b2b2_fixture where key = 'reviewer_actor'), (select value from b2b2_fixture where key = 'revoked_request'),
    'MANUAL_REVIEW', 'Authority was revoked.', 'INCONCLUSIVE', 'Cannot issue.', (select value from b2b2_fixture where key = 'other_evidence'),
    '73000000-0000-4000-8000-000000000052', 'b2b2-revoked-issue-001'),
  '42501', 'CZ403:CAPABILITY_DENIED', 'revoked reviewer cannot issue verification'
);

set local role authenticated;
select is((select count(*)::integer from public.claims where id = (select value from b2b2_fixture where key = 'claim')), 1, 'completed review preserves historical reviewer access to examined claim');
select is((select count(*)::integer from public.claims where id = (select value from b2b2_fixture where key = 'other_claim')), 0, 'revocation removes OPEN-request access to second private claim');
select is((select count(*)::integer from public.verification_requests where id = (select value from b2b2_fixture where key = 'revoked_request')), 0, 'revocation removes access to uncompleted assigned request');
reset role;

-- Conflicted self-review is allowed but can never be labelled independent.
select set_config('request.jwt.claim.sub', '71000000-0000-4000-8000-000000000001', true);
insert into b2b2_fixture(key, result)
select 'conflict_request', public.b2b2_request_verification(
  (select value from b2b2_fixture where key = 'steward_actor'),
  (select value from b2b2_fixture where key = 'claim'),
  (select value from b2b2_fixture where key = 'steward_actor'),
  'Self-review permitido apenas como não independente no cenário P0.',
  'MANUAL_REVIEW', null,
  '73000000-0000-4000-8000-000000000060',
  'b2b2-conflict-request-001'
);
update b2b2_fixture set value = (result ->> 'verification_request_id')::uuid where key = 'conflict_request';
select is((select independence from public.verification_requests where id = (select value from b2b2_fixture where key = 'conflict_request')), 'NON_INDEPENDENT', 'conflicted self-review request is explicitly non-independent');
select ok(
  (select conflict_codes @> array['REVIEWER_IS_REQUESTER','REVIEWER_IS_PROJECT_STEWARD']::text[]
   from public.verification_requests where id = (select value from b2b2_fixture where key = 'conflict_request')),
  'conflict request records requester and steward conflicts structurally'
);

insert into b2b2_fixture(key, result)
select 'conflict_verification', public.b2b2_issue_verification(
  (select value from b2b2_fixture where key = 'steward_actor'),
  (select value from b2b2_fixture where key = 'conflict_request'),
  'MANUAL_REVIEW',
  'A revisão conflitada não permite concluir de forma independente.',
  'INCONCLUSIVE',
  'O conflito está preservado e deve ser considerado por qualquer decisão futura.',
  array[(select value from b2b2_fixture where key = 'evidence')],
  '73000000-0000-4000-8000-000000000061',
  'b2b2-conflict-issue-001'
);
update b2b2_fixture set value = (result ->> 'verification_id')::uuid where key = 'conflict_verification';
select is((select independence from public.verifications where id = (select value from b2b2_fixture where key = 'conflict_verification')), 'NON_INDEPENDENT', 'conflicted issued verification remains non-independent');
select is((select classification from public.verifications where id = (select value from b2b2_fixture where key = 'conflict_verification')), 'INCONCLUSIVE', 'INCONCLUSIVE is a valid terminal verification classification');

-- Exercise remaining valid classifications without adding new authority machinery.
insert into b2b2_fixture(key, result)
select 'fail_request', public.b2b2_request_verification(
  (select value from b2b2_fixture where key = 'steward_actor'),
  (select value from b2b2_fixture where key = 'claim'),
  (select value from b2b2_fixture where key = 'steward_actor'),
  'Request sintético para exercitar classificação FAIL.', 'MANUAL_REVIEW', null,
  '73000000-0000-4000-8000-000000000062', 'b2b2-fail-request-001'
);
update b2b2_fixture set value = (result ->> 'verification_request_id')::uuid where key = 'fail_request';
select is(
  public.b2b2_issue_verification(
    (select value from b2b2_fixture where key = 'steward_actor'),
    (select value from b2b2_fixture where key = 'fail_request'),
    'MANUAL_REVIEW', 'Critérios sintéticos não foram satisfeitos.', 'FAIL',
    'FAIL é contextual e não apaga claim ou evidence.',
    array[(select value from b2b2_fixture where key = 'evidence')],
    '73000000-0000-4000-8000-000000000063', 'b2b2-fail-issue-001'
  ) ->> 'classification',
  'FAIL', 'FAIL is a valid verification classification'
);

insert into b2b2_fixture(key, result)
select 'partial_request', public.b2b2_request_verification(
  (select value from b2b2_fixture where key = 'steward_actor'),
  (select value from b2b2_fixture where key = 'claim'),
  (select value from b2b2_fixture where key = 'steward_actor'),
  'Request sintético para exercitar classificação PARTIAL.', 'MANUAL_REVIEW', null,
  '73000000-0000-4000-8000-000000000064', 'b2b2-partial-request-001'
);
update b2b2_fixture set value = (result ->> 'verification_request_id')::uuid where key = 'partial_request';
select is(
  public.b2b2_issue_verification(
    (select value from b2b2_fixture where key = 'steward_actor'),
    (select value from b2b2_fixture where key = 'partial_request'),
    'MANUAL_REVIEW', 'Somente parte dos critérios sintéticos foi satisfeita.', 'PARTIAL',
    'PARTIAL não é convertido em outcome.',
    array[(select value from b2b2_fixture where key = 'evidence')],
    '73000000-0000-4000-8000-000000000065', 'b2b2-partial-issue-001'
  ) ->> 'classification',
  'PARTIAL', 'PARTIAL is a valid verification classification'
);

-- RLS after issuance: author/steward/reviewer can see, unrelated contributor cannot.
select set_config('request.jwt.claim.sub', '71000000-0000-4000-8000-000000000004', true);
set local role authenticated;
select is((select count(*)::integer from public.verifications), 0, 'unrelated contributor cannot read private verifications');
select is((select count(*)::integer from public.domain_events where event_type = 'VERIFICATION_ISSUED'), 0, 'unrelated contributor cannot read restricted verification events');
reset role;

select set_config('request.jwt.claim.sub', '71000000-0000-4000-8000-000000000002', true);
set local role authenticated;
select ok((select count(*) from public.verifications) >= 1, 'claim author can read verifications of own private claim');
reset role;

select set_config('request.jwt.claim.sub', '71000000-0000-4000-8000-000000000001', true);
set local role authenticated;
select ok((select count(*) from public.verifications) >= 4, 'project steward can read project verifications');
reset role;

-- Synthetic corruption must be detected by the two B2-B2 reconcilers.
alter table public.verification_evidence_items disable trigger verification_evidence_items_append_only;
update public.verification_evidence_items
set evidence_item_id = (select value from b2b2_fixture where key = 'other_evidence')
where verification_id = (select value from b2b2_fixture where key = 'verification');
alter table public.verification_evidence_items enable trigger verification_evidence_items_append_only;
select is(
  public.b2b2_reconcile_verification((select value from b2b2_fixture where key = 'verification')),
  array['evidence_claim_mismatch']::text[],
  'verification reconciler detects evidence from another claim'
);

update public.verification_requests
set state = 'OPEN', completed_at = null
where id = (select value from b2b2_fixture where key = 'request');
select is(
  public.b2b2_reconcile_request((select value from b2b2_fixture where key = 'request')),
  array['state_verification_count']::text[],
  'request reconciler detects OPEN request with existing verification'
);

select * from finish();
rollback;

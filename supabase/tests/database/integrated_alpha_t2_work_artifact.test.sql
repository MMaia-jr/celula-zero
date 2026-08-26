begin;

create extension if not exists pgtap with schema extensions;
select no_plan();

select has_table(
  'public',
  'commitment_authorizations',
  'T2.1 has a bounded Commitment-derived authority bridge'
);

select has_table(
  'public',
  'artifact_text_contents',
  'T2.1 has immutable bounded text Artifact content storage'
);

select has_function(
  'public',
  't2a_accept_proposal_for_work',
  array['uuid','uuid','integer','integer','integer','integer','text','uuid','text'],
  'T2.1 acceptance wrapper exists'
);

select has_function(
  'public',
  't2a_attach_text_artifact',
  array['uuid','uuid','text','uuid','text'],
  'T2.1 bounded text Artifact command exists'
);

select ok(
  not has_table_privilege('anon', 'public.artifact_text_contents', 'SELECT'),
  'anonymous users cannot read text Artifact bodies'
);

select ok(
  has_table_privilege('authenticated', 'public.artifact_text_contents', 'SELECT'),
  'authenticated users have SELECT subject to RLS'
);

insert into auth.users(
  id, aud, role, email, raw_app_meta_data, raw_user_meta_data, created_at, updated_at
) values
(
  '95000000-0000-4000-8000-000000000001',
  'authenticated',
  'authenticated',
  't2-work-steward@example.test',
  '{"provider":"email","providers":["email"]}',
  '{"name":"T2 Work Steward"}',
  now(),
  now()
),
(
  '95000000-0000-4000-8000-000000000002',
  'authenticated',
  'authenticated',
  't2-work-contributor@example.test',
  '{"provider":"email","providers":["email"]}',
  '{"name":"T2 Work Contributor"}',
  now(),
  now()
),
(
  '95000000-0000-4000-8000-000000000003',
  'authenticated',
  'authenticated',
  't2-work-outsider@example.test',
  '{"provider":"email","providers":["email"]}',
  '{"name":"T2 Work Outsider"}',
  now(),
  now()
);

create temporary table t2_work_fixture(
  key text primary key,
  value uuid,
  result jsonb,
  text_value text
);

insert into t2_work_fixture(key, value)
select 'steward_actor', actor_id
from public.actor_memberships
where profile_id = '95000000-0000-4000-8000-000000000001'
  and role = 'OWNER';

insert into t2_work_fixture(key, value)
select 'contributor_actor', actor_id
from public.actor_memberships
where profile_id = '95000000-0000-4000-8000-000000000002'
  and role = 'OWNER';

insert into t2_work_fixture(key, value)
select 'outsider_actor', actor_id
from public.actor_memberships
where profile_id = '95000000-0000-4000-8000-000000000003'
  and role = 'OWNER';

select set_config(
  'request.jwt.claim.sub',
  '95000000-0000-4000-8000-000000000001',
  true
);

insert into t2_work_fixture(key, result)
select 'project', to_jsonb(x)
from public.create_project_atomic(
  'Projeto T2 Work',
  'projeto-t2-work',
  'Projeto público para testar trabalho atribuível depois de um Commitment aceito.',
  'Permitir que um acordo aceito se transforme em trabalho observável sem ampliar autoridade global.',
  'Preservar Commitment, Contribution e Artifact como objetos semanticamente distintos.',
  'Uma contribuição com Artifact textual digest-bound e autoridade contextual reconstruível.',
  'Sem evidência automática, reputação, direito econômico ou acesso de célula por aceitação.',
  array['work-after-commitment'],
  'VOLUNTARY',
  'OPEN',
  true
) x;

update t2_work_fixture
set value = (result ->> 'project_id')::uuid
where key = 'project';

insert into t2_work_fixture(key, result)
select 'opportunity', public.b1_create_opportunity(
  (select value from t2_work_fixture where key = 'steward_actor'),
  (select value from t2_work_fixture where key = 'project'),
  'Entregar observação do fluxo T2',
  'Precisamos de uma entrega atribuível depois de um Commitment aceito.',
  'A entrega deve permanecer no escopo deste Project e deste acordo.',
  'Uma Contribution acompanhada por um Artifact textual imutável.',
  1,
  '96000000-0000-4000-8000-000000000001',
  't2-work-opportunity-create'
);

update t2_work_fixture
set value = (result ->> 'opportunity_id')::uuid
where key = 'opportunity';

update t2_work_fixture
set result = public.b1_publish_opportunity(
  (select value from t2_work_fixture where key = 'steward_actor'),
  value,
  1,
  '96000000-0000-4000-8000-000000000002',
  't2-work-opportunity-publish'
)
where key = 'opportunity';

select set_config(
  'request.jwt.claim.sub',
  '95000000-0000-4000-8000-000000000002',
  true
);

insert into t2_work_fixture(key, result)
select 'proposal', public.b1_submit_public_proposal(
  (select value from t2_work_fixture where key = 'contributor_actor'),
  (select value from t2_work_fixture where key = 'opportunity'),
  'Posso realizar a observação e registrar uma entrega textual reproduzível.',
  'A entrega fica delimitada ao Project e não implica direito ou autoridade fora dele.',
  'Um relato textual com limitações explícitas e digest calculado pelo sistema.',
  'Voluntário neste teste local.',
  '96000000-0000-4000-8000-000000000003',
  't2-work-proposal-submit'
);

update t2_work_fixture
set value = (result ->> 'proposal_id')::uuid
where key = 'proposal';

select is(
  (
    select count(*)::integer
    from public.role_assignments
    where actor_id = (select value from t2_work_fixture where key = 'contributor_actor')
  ),
  0,
  'public proposer has no role assignment before Commitment acceptance'
);

select is(
  (
    select count(*)::integer
    from public.delegations
    where delegate_actor_id = (select value from t2_work_fixture where key = 'contributor_actor')
  ),
  0,
  'public proposer has no delegation before Commitment acceptance'
);

select set_config(
  'request.jwt.claim.sub',
  '95000000-0000-4000-8000-000000000001',
  true
);

insert into t2_work_fixture(key, result)
select 'commitment', public.t2a_accept_proposal_for_work(
  (select value from t2_work_fixture where key = 'steward_actor'),
  (select value from t2_work_fixture where key = 'proposal'),
  (
    select current_version
    from public.opportunities
    where id = (select value from t2_work_fixture where key = 'opportunity')
  ),
  (
    select current_version
    from public.proposals
    where id = (select value from t2_work_fixture where key = 'proposal')
  ),
  (
    select material_version
    from public.opportunities
    where id = (select value from t2_work_fixture where key = 'opportunity')
  ),
  (
    select material_version
    from public.proposals
    where id = (select value from t2_work_fixture where key = 'proposal')
  ),
  'Aceito estas versões exatas e autorizo apenas o trabalho implicado pelo Commitment.',
  '96000000-0000-4000-8000-000000000004',
  't2-work-proposal-accept'
);

update t2_work_fixture
set value = (result ->> 'commitment_id')::uuid
where key = 'commitment';

select is(
  (
    select count(*)::integer
    from public.commitment_authorizations
    where commitment_id = (select value from t2_work_fixture where key = 'commitment')
      and actor_id = (select value from t2_work_fixture where key = 'contributor_actor')
  ),
  2,
  'accepted Commitment creates exactly two bounded work authorizations'
);

select results_eq(
  $$
    select capability_code
    from public.commitment_authorizations
    where commitment_id = (select value from t2_work_fixture where key = 'commitment')
    order by capability_code
  $$,
  $$ values ('artifact.attach'::text), ('contribution.submit'::text) $$,
  'Commitment authority contains only artifact.attach and contribution.submit'
);

select is(
  (
    select count(*)::integer
    from public.role_assignments
    where actor_id = (select value from t2_work_fixture where key = 'contributor_actor')
  ),
  0,
  'accepted Commitment creates no role assignment'
);

select is(
  (
    select count(*)::integer
    from public.delegations
    where delegate_actor_id = (select value from t2_work_fixture where key = 'contributor_actor')
  ),
  0,
  'accepted Commitment creates no general delegation'
);

select ok(
  not private.b1_profile_has_cell_access(
    '00000000-0000-4000-8000-00000000c001',
    '95000000-0000-4000-8000-000000000002'
  ),
  'Commitment-derived work authority does not grant cell-wide event access'
);

select ok(
  private.b1_has_capability(
    (select value from t2_work_fixture where key = 'contributor_actor'),
    'contribution.submit',
    'PROJECT',
    (select value from t2_work_fixture where key = 'project')
  ),
  'Commitment proposer has contribution.submit in the exact Project context'
);

select ok(
  private.b1_has_capability(
    (select value from t2_work_fixture where key = 'contributor_actor'),
    'artifact.attach',
    'PROJECT',
    (select value from t2_work_fixture where key = 'project')
  ),
  'Commitment proposer has artifact.attach in the exact Project context'
);

select ok(
  not private.b1_has_capability(
    (select value from t2_work_fixture where key = 'contributor_actor'),
    'proposal.accept',
    'PROJECT',
    (select value from t2_work_fixture where key = 'project')
  ),
  'Commitment-derived work authority does not grant proposal.accept'
);

select ok(
  not private.b1_has_capability(
    (select value from t2_work_fixture where key = 'outsider_actor'),
    'contribution.submit',
    'PROJECT',
    (select value from t2_work_fixture where key = 'project')
  ),
  'an unrelated Actor has no contribution authority'
);

select is(
  (
    select count(*)::integer
    from public.contributions
    where commitment_id = (select value from t2_work_fixture where key = 'commitment')
  ),
  0,
  'Commitment still does not create a Contribution automatically'
);

select set_config(
  'request.jwt.claim.sub',
  '95000000-0000-4000-8000-000000000002',
  true
);

insert into t2_work_fixture(key, result)
select 'contribution', public.b2a_submit_contribution(
  (select value from t2_work_fixture where key = 'contributor_actor'),
  (select value from t2_work_fixture where key = 'commitment'),
  'Executei a observação acordada e registrei o resultado como trabalho efetivamente realizado.',
  'Este teste local demonstra registro e autoridade; não demonstra utilidade externa nem consequência real.',
  null,
  '96000000-0000-4000-8000-000000000005',
  't2-work-contribution-submit'
);

update t2_work_fixture
set value = (result ->> 'contribution_id')::uuid
where key = 'contribution';

select is(
  public.b2a_reconcile_contribution(
    (select value from t2_work_fixture where key = 'contribution')
  ),
  '{}'::text[],
  'canonical B2-A Contribution command remains reconcilable under Commitment authority'
);

insert into t2_work_fixture(key, text_value)
values (
  'artifact_content',
  E'Resultado observável T2.1\n\nA jornada chegou a uma Contribution atribuída e este texto é o Artifact exato do teste.\nLimite: execução local não demonstra utilidade externa.'
);

insert into t2_work_fixture(key, result)
select 'artifact', public.t2a_attach_text_artifact(
  (select value from t2_work_fixture where key = 'contributor_actor'),
  (select value from t2_work_fixture where key = 'contribution'),
  (select text_value from t2_work_fixture where key = 'artifact_content'),
  '96000000-0000-4000-8000-000000000006',
  't2-work-text-artifact'
);

update t2_work_fixture
set value = (result ->> 'artifact_id')::uuid
where key = 'artifact';

select is(
  (
    select digest
    from public.artifacts
    where id = (select value from t2_work_fixture where key = 'artifact')
  ),
  encode(
    extensions.digest(
      convert_to(
        (select text_value from t2_work_fixture where key = 'artifact_content'),
        'UTF8'
      ),
      'sha256'
    ),
    'hex'
  ),
  'server-computed Artifact SHA-256 binds the exact text content'
);

select is(
  (
    select uri
    from public.artifacts
    where id = (select value from t2_work_fixture where key = 'artifact')
  ),
  'urn:cz:text:sha256:' || encode(
    extensions.digest(
      convert_to(
        (select text_value from t2_work_fixture where key = 'artifact_content'),
        'UTF8'
      ),
      'sha256'
    ),
    'hex'
  ),
  'text Artifact uses a digest-derived CZ URN rather than requiring external storage'
);

select is(
  (
    select content
    from public.artifact_text_contents
    where artifact_id = (select value from t2_work_fixture where key = 'artifact')
  ),
  (select text_value from t2_work_fixture where key = 'artifact_content'),
  'stored Artifact body is the exact submitted text'
);

select is(
  public.b2a_reconcile_artifact(
    (select value from t2_work_fixture where key = 'artifact')
  ),
  '{}'::text[],
  'canonical B2-A Artifact remains reconcilable'
);

select is(
  (
    select count(*)::integer
    from public.evidence_items
    where source_artifact_id = (select value from t2_work_fixture where key = 'artifact')
  ),
  0,
  'Artifact creation does not create Evidence'
);

select throws_ok(
  $$
    update public.artifact_text_contents
    set content = 'mutated'
    where artifact_id = (select value from t2_work_fixture where key = 'artifact')
  $$,
  '23000',
  'artifact_text_contents is append-only',
  'text Artifact content cannot be mutated after creation'
);

select is(
  (
    select count(*)::integer
    from public.domain_events
    where aggregate_type = 'COMMITMENT'
      and aggregate_id = (select value from t2_work_fixture where key = 'commitment')
      and event_type = 'COMMITMENT_WORK_AUTHORITY_GRANTED'
  ),
  2,
  'Commitment work authority has reconstructible authorization events'
);

select * from finish();
rollback;

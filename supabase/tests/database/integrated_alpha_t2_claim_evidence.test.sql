begin;

create extension if not exists pgtap with schema extensions;
select no_plan();

select has_table(
  'public',
  'commitment_claim_evidence_authorizations',
  'T2.2 has separate bounded Claim/Evidence authority'
);

select has_function(
  'public',
  't2b_accept_proposal_for_claim_evidence',
  array['uuid','uuid','integer','integer','integer','integer','text','uuid','text'],
  'T2.2 cumulative acceptance wrapper exists'
);

select ok(
  not has_table_privilege(
    'authenticated',
    'public.commitment_claim_evidence_authorizations',
    'SELECT'
  ),
  'Claim/Evidence authority rows are not a broad client-readable table'
);

insert into auth.users(
  id, aud, role, email, raw_app_meta_data, raw_user_meta_data, created_at, updated_at
) values
(
  '97000000-0000-4000-8000-000000000001',
  'authenticated',
  'authenticated',
  't2-claim-steward@example.test',
  '{"provider":"email","providers":["email"]}',
  '{"name":"T2 Claim Steward"}',
  now(),
  now()
),
(
  '97000000-0000-4000-8000-000000000002',
  'authenticated',
  'authenticated',
  't2-claim-contributor@example.test',
  '{"provider":"email","providers":["email"]}',
  '{"name":"T2 Claim Contributor"}',
  now(),
  now()
),
(
  '97000000-0000-4000-8000-000000000003',
  'authenticated',
  'authenticated',
  't2-claim-outsider@example.test',
  '{"provider":"email","providers":["email"]}',
  '{"name":"T2 Claim Outsider"}',
  now(),
  now()
);

create temporary table t2_claim_fixture(
  key text primary key,
  value uuid,
  result jsonb,
  text_value text
);

insert into t2_claim_fixture(key, value)
select 'steward_actor', actor_id
from public.actor_memberships
where profile_id = '97000000-0000-4000-8000-000000000001'
  and role = 'OWNER';

insert into t2_claim_fixture(key, value)
select 'contributor_actor', actor_id
from public.actor_memberships
where profile_id = '97000000-0000-4000-8000-000000000002'
  and role = 'OWNER';

insert into t2_claim_fixture(key, value)
select 'outsider_actor', actor_id
from public.actor_memberships
where profile_id = '97000000-0000-4000-8000-000000000003'
  and role = 'OWNER';

select set_config(
  'request.jwt.claim.sub',
  '97000000-0000-4000-8000-000000000001',
  true
);

insert into t2_claim_fixture(key, result)
select 'project', to_jsonb(x)
from public.create_project_atomic(
  'Projeto T2 Claim Evidence',
  'projeto-t2-claim-evidence',
  'Projeto público para testar Claim atribuída e Evidence explícita sobre trabalho realizado.',
  'Transformar trabalho observável em alegações contestáveis e relações explícitas de evidência.',
  'Preservar Artifact, Claim, Evidence e Verification como objetos semanticamente distintos.',
  'Uma Claim atribuída com Evidence explicitamente relacionada e sem Verification automática.',
  'Sem prova automática, reputação, autoridade global ou consequência real inferida.',
  array['claim-and-evidence'],
  'VOLUNTARY',
  'OPEN',
  true
) x;

update t2_claim_fixture
set value = (result ->> 'project_id')::uuid
where key = 'project';

insert into t2_claim_fixture(key, result)
select 'other_project', to_jsonb(x)
from public.create_project_atomic(
  'Projeto T2 Outro Contexto',
  'projeto-t2-outro-contexto',
  'Outro Project para testar que a autoridade T2.2 não atravessa contexto de Project.',
  'Preservar fronteiras de autorização entre Projects independentes.',
  'Confirmar que Claim e Evidence continuam contextuais.',
  'Nenhuma autoridade de um Commitment deve vazar para outro Project.',
  'Sem herança implícita de autoridade entre Projects.',
  array['context-boundary'],
  'VOLUNTARY',
  'OPEN',
  true
) x;

update t2_claim_fixture
set value = (result ->> 'project_id')::uuid
where key = 'other_project';

insert into t2_claim_fixture(key, result)
select 'opportunity', public.b1_create_opportunity(
  (select value from t2_claim_fixture where key = 'steward_actor'),
  (select value from t2_claim_fixture where key = 'project'),
  'Produzir observação documentada T2.2',
  'Precisamos transformar trabalho observável em uma Claim atribuída e Evidence explícita.',
  'A Evidence deve permanecer contextual, digest-bound e distinta de Verification.',
  'Uma Contribution, um Artifact, uma Claim e uma relação Evidence explícita.',
  1,
  '98000000-0000-4000-8000-000000000001',
  't2-claim-opportunity-create'
);

update t2_claim_fixture
set value = (result ->> 'opportunity_id')::uuid
where key = 'opportunity';

update t2_claim_fixture
set result = public.b1_publish_opportunity(
  (select value from t2_claim_fixture where key = 'steward_actor'),
  value,
  1,
  '98000000-0000-4000-8000-000000000002',
  't2-claim-opportunity-publish'
)
where key = 'opportunity';

select set_config(
  'request.jwt.claim.sub',
  '97000000-0000-4000-8000-000000000002',
  true
);

insert into t2_claim_fixture(key, result)
select 'proposal', public.b1_submit_public_proposal(
  (select value from t2_claim_fixture where key = 'contributor_actor'),
  (select value from t2_claim_fixture where key = 'opportunity'),
  'Posso executar o trabalho, registrar uma entrega e formular uma alegação delimitada sobre ela.',
  'Claim e Evidence serão separadas; nada será tratado como verdade ou Verification automática.',
  'Contribution com Artifact textual, Claim atribuída e Evidence explicitamente registrada.',
  'Voluntário neste teste local.',
  '98000000-0000-4000-8000-000000000003',
  't2-claim-proposal-submit'
);

update t2_claim_fixture
set value = (result ->> 'proposal_id')::uuid
where key = 'proposal';

select set_config(
  'request.jwt.claim.sub',
  '97000000-0000-4000-8000-000000000001',
  true
);

insert into t2_claim_fixture(key, result)
select 'commitment', public.t2b_accept_proposal_for_claim_evidence(
  (select value from t2_claim_fixture where key = 'steward_actor'),
  (select value from t2_claim_fixture where key = 'proposal'),
  (
    select current_version
    from public.opportunities
    where id = (select value from t2_claim_fixture where key = 'opportunity')
  ),
  (
    select current_version
    from public.proposals
    where id = (select value from t2_claim_fixture where key = 'proposal')
  ),
  (
    select material_version
    from public.opportunities
    where id = (select value from t2_claim_fixture where key = 'opportunity')
  ),
  (
    select material_version
    from public.proposals
    where id = (select value from t2_claim_fixture where key = 'proposal')
  ),
  'Aceito estas versões e autorizo trabalho, Claim atribuída e Evidence explícita apenas neste contexto.',
  '98000000-0000-4000-8000-000000000004',
  't2-claim-proposal-accept'
);

update t2_claim_fixture
set value = (result ->> 'commitment_id')::uuid
where key = 'commitment';

select is(
  (
    select count(*)::integer
    from public.commitment_authorizations
    where commitment_id = (select value from t2_claim_fixture where key = 'commitment')
      and actor_id = (select value from t2_claim_fixture where key = 'contributor_actor')
  ),
  2,
  'T2.1 work authority remains exactly two capabilities'
);

select is(
  (
    select count(*)::integer
    from public.commitment_claim_evidence_authorizations
    where commitment_id = (select value from t2_claim_fixture where key = 'commitment')
      and actor_id = (select value from t2_claim_fixture where key = 'contributor_actor')
  ),
  2,
  'T2.2 creates exactly two separate Claim/Evidence capabilities'
);

select results_eq(
  $$
    select capability_code
    from public.commitment_claim_evidence_authorizations
    where commitment_id = (select value from t2_claim_fixture where key = 'commitment')
    order by capability_code
  $$,
  $$ values ('claim.record'::text), ('evidence.register'::text) $$,
  'T2.2 authority contains only claim.record and evidence.register'
);

select is(
  (
    select count(*)::integer
    from public.role_assignments
    where actor_id = (select value from t2_claim_fixture where key = 'contributor_actor')
  ),
  0,
  'T2.2 creates no role assignment'
);

select is(
  (
    select count(*)::integer
    from public.delegations
    where delegate_actor_id = (select value from t2_claim_fixture where key = 'contributor_actor')
  ),
  0,
  'T2.2 creates no general delegation'
);

select ok(
  not private.b1_profile_has_cell_access(
    '00000000-0000-4000-8000-00000000c001',
    '97000000-0000-4000-8000-000000000002'
  ),
  'T2.2 authority does not grant cell-wide access'
);

select ok(
  private.b1_has_capability(
    (select value from t2_claim_fixture where key = 'contributor_actor'),
    'claim.record',
    'PROJECT',
    (select value from t2_claim_fixture where key = 'project')
  ),
  'contributor has claim.record in the exact committed Project'
);

select ok(
  private.b1_has_capability(
    (select value from t2_claim_fixture where key = 'contributor_actor'),
    'evidence.register',
    'PROJECT',
    (select value from t2_claim_fixture where key = 'project')
  ),
  'contributor has evidence.register in the exact committed Project'
);

select ok(
  not private.b1_has_capability(
    (select value from t2_claim_fixture where key = 'contributor_actor'),
    'claim.record',
    'PROJECT',
    (select value from t2_claim_fixture where key = 'other_project')
  ),
  'claim authority does not cross into an unrelated Project'
);

select ok(
  not private.b1_has_capability(
    (select value from t2_claim_fixture where key = 'contributor_actor'),
    'evidence.register',
    'PROJECT',
    (select value from t2_claim_fixture where key = 'other_project')
  ),
  'evidence authority does not cross into an unrelated Project'
);

select set_config(
  'request.jwt.claim.sub',
  '97000000-0000-4000-8000-000000000002',
  true
);

insert into t2_claim_fixture(key, result)
select 'contribution', public.b2a_submit_contribution(
  (select value from t2_claim_fixture where key = 'contributor_actor'),
  (select value from t2_claim_fixture where key = 'commitment'),
  'Executei a observação acordada e registrei o trabalho realizado de forma atribuível.',
  'O registro local não demonstra utilidade externa, verdade universal ou consequência real.',
  null,
  '98000000-0000-4000-8000-000000000005',
  't2-claim-contribution-submit'
);

update t2_claim_fixture
set value = (result ->> 'contribution_id')::uuid
where key = 'contribution';

insert into t2_claim_fixture(key, text_value)
values (
  'artifact_content',
  E'Resultado observável T2.2\n\nO fluxo produziu este Artifact textual exato.\nLimite: o Artifact documenta conteúdo; não constitui Evidence até uma relação explícita ser registrada.'
);

insert into t2_claim_fixture(key, result)
select 'artifact', public.t2a_attach_text_artifact(
  (select value from t2_claim_fixture where key = 'contributor_actor'),
  (select value from t2_claim_fixture where key = 'contribution'),
  (select text_value from t2_claim_fixture where key = 'artifact_content'),
  '98000000-0000-4000-8000-000000000006',
  't2-claim-text-artifact'
);

update t2_claim_fixture
set value = (result ->> 'artifact_id')::uuid
where key = 'artifact';

select is(
  (
    select count(*)::integer
    from public.evidence_items
    where source_artifact_id = (select value from t2_claim_fixture where key = 'artifact')
  ),
  0,
  'Artifact still does not become Evidence automatically'
);

insert into t2_claim_fixture(key, result)
select 'claim', public.b2b1_record_claim(
  (select value from t2_claim_fixture where key = 'contributor_actor'),
  'ARTIFACT',
  (select value from t2_claim_fixture where key = 'artifact'),
  'Este Artifact registra a saída textual exata produzida na Contribution T2.2.',
  'A alegação é limitada ao conteúdo e à execução local deste episódio.',
  null,
  '98000000-0000-4000-8000-000000000007',
  't2-claim-record'
);

update t2_claim_fixture
set value = (result ->> 'claim_id')::uuid
where key = 'claim';

select is(
  public.b2b1_reconcile_claim(
    (select value from t2_claim_fixture where key = 'claim')
  ),
  '{}'::text[],
  'canonical B2-B1 Claim remains reconcilable under T2.2 authority'
);

select is(
  (
    select count(*)::integer
    from public.evidence_links
    where claim_id = (select value from t2_claim_fixture where key = 'claim')
  ),
  0,
  'recording a Claim does not create Evidence'
);

select set_config(
  'request.jwt.claim.sub',
  '97000000-0000-4000-8000-000000000003',
  true
);

select throws_ok(
  format(
    $sql$
      select public.b2b1_record_claim(
        %L::uuid,
        'ARTIFACT',
        %L::uuid,
        'Outsider must not be able to claim this Artifact as authorized work.',
        'Unauthorized cross-actor claim attempt.',
        null,
        '98000000-0000-4000-8000-000000000008'::uuid,
        't2-claim-outsider-denied'
      )
    $sql$,
    (select value from t2_claim_fixture where key = 'outsider_actor'),
    (select value from t2_claim_fixture where key = 'artifact')
  ),
  '42501',
  'CZ403:CAPABILITY_DENIED',
  'unrelated Actor cannot record a Claim under another Commitment'
);

select set_config(
  'request.jwt.claim.sub',
  '97000000-0000-4000-8000-000000000002',
  true
);

insert into t2_claim_fixture(key, result)
select 'evidence', public.b2b1_register_evidence(
  (select value from t2_claim_fixture where key = 'contributor_actor'),
  (select value from t2_claim_fixture where key = 'claim'),
  (select value from t2_claim_fixture where key = 'artifact'),
  'SUPPORTS',
  'O próprio Artifact digest-bound é documentado como fonte que suporta a alegação sobre seu conteúdo.',
  'Esta Evidence suporta apenas a existência e o conteúdo registrado; não verifica utilidade, qualidade ou consequência.',
  null,
  '98000000-0000-4000-8000-000000000009',
  't2-claim-evidence-register'
);

update t2_claim_fixture
set value = (result ->> 'evidence_item_id')::uuid
where key = 'evidence';

select is(
  public.b2b1_reconcile_evidence(
    (select value from t2_claim_fixture where key = 'evidence')
  ),
  '{}'::text[],
  'canonical B2-B1 Evidence remains reconcilable under T2.2 authority'
);

select is(
  (
    select relation
    from public.evidence_links
    where evidence_item_id = (select value from t2_claim_fixture where key = 'evidence')
  ),
  'SUPPORTS',
  'Evidence relation is explicit rather than inferred'
);

select is(
  (
    select digest
    from public.evidence_items
    where id = (select value from t2_claim_fixture where key = 'evidence')
  ),
  (
    select digest
    from public.artifacts
    where id = (select value from t2_claim_fixture where key = 'artifact')
  ),
  'Evidence preserves the exact source Artifact digest'
);

select is(
  (
    select count(*)::integer
    from public.verifications
  ),
  0,
  'Evidence registration does not create Verification'
);

select is(
  (
    select count(*)::integer
    from public.domain_events
    where aggregate_type = 'COMMITMENT'
      and aggregate_id = (select value from t2_claim_fixture where key = 'commitment')
      and event_type = 'COMMITMENT_CLAIM_EVIDENCE_AUTHORITY_GRANTED'
  ),
  2,
  'Claim/Evidence authority has two reconstructible authorization events'
);

select * from finish();
rollback;

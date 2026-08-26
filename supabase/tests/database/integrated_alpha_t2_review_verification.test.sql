begin;

create extension if not exists pgtap with schema extensions;
select no_plan();

select has_function(
  'public',
  't2c_assign_and_request_verification',
  array[
    'uuid','uuid','uuid','text','text','timestamp with time zone',
    'uuid','text','uuid','text'
  ],
  'T2.3 maps bounded delegation to canonical Verification Request'
);

insert into auth.users(
  id, aud, role, email, raw_app_meta_data, raw_user_meta_data, created_at, updated_at
) values
(
  'a3000000-0000-4000-8000-000000000001',
  'authenticated','authenticated','t23-steward@example.test',
  '{"provider":"email","providers":["email"]}',
  '{"name":"T23 Steward"}', now(), now()
),
(
  'a3000000-0000-4000-8000-000000000002',
  'authenticated','authenticated','t23-contributor@example.test',
  '{"provider":"email","providers":["email"]}',
  '{"name":"T23 Contributor"}', now(), now()
),
(
  'a3000000-0000-4000-8000-000000000003',
  'authenticated','authenticated','t23-reviewer@example.test',
  '{"provider":"email","providers":["email"]}',
  '{"name":"T23 Reviewer"}', now(), now()
),
(
  'a3000000-0000-4000-8000-000000000004',
  'authenticated','authenticated','t23-outsider@example.test',
  '{"provider":"email","providers":["email"]}',
  '{"name":"T23 Outsider"}', now(), now()
);

create temporary table t23(
  key text primary key,
  value uuid,
  result jsonb,
  text_value text,
  count_value bigint
);

insert into t23(key, value)
select 'steward_actor', actor_id
from public.actor_memberships
where profile_id = 'a3000000-0000-4000-8000-000000000001'
  and role = 'OWNER';

insert into t23(key, value)
select 'contributor_actor', actor_id
from public.actor_memberships
where profile_id = 'a3000000-0000-4000-8000-000000000002'
  and role = 'OWNER';

insert into t23(key, value)
select 'reviewer_actor', actor_id
from public.actor_memberships
where profile_id = 'a3000000-0000-4000-8000-000000000003'
  and role = 'OWNER';

insert into t23(key, value)
select 'outsider_actor', actor_id
from public.actor_memberships
where profile_id = 'a3000000-0000-4000-8000-000000000004'
  and role = 'OWNER';

select set_config('request.jwt.claim.sub','a3000000-0000-4000-8000-000000000001',true);

insert into t23(key, result)
select 'project', to_jsonb(x)
from public.create_project_atomic(
  'Projeto T2 Review Verification',
  'projeto-t2-review-verification',
  'Projeto para testar revisão atribuída por terceiro sob autoridade contextual e temporária.',
  'Executar trabalho, registrar Claim e Evidence e solicitar uma Verification atribuída.',
  'Preservar Verification como exame contextual distinto de Decision, Outcome, reputação ou verdade.',
  'Uma Verification emitida por terceiro sob critérios e método declarados.',
  'Reviewer recebe somente verification.issue no Project e por janela temporal limitada.',
  array['independent-review'],
  'VOLUNTARY','OPEN',true
) x;

update t23 set value = (result ->> 'project_id')::uuid where key = 'project';

insert into t23(key, result)
select 'other_project', to_jsonb(x)
from public.create_project_atomic(
  'Projeto T2 Review Outro',
  'projeto-t2-review-outro',
  'Projeto independente usado para provar que a autoridade do Reviewer não atravessa contexto.',
  'Manter autorização de revisão limitada ao Project que originou a solicitação.',
  'Nenhuma capability de revisão deve atravessar Projects.',
  'Confirmação de fronteira contextual.',
  'Sem autoridade derivada entre Projects.',
  array['authority-boundary'],
  'VOLUNTARY','OPEN',true
) x;

update t23 set value = (result ->> 'project_id')::uuid where key = 'other_project';

insert into t23(key, result)
select 'opportunity', public.b1_create_opportunity(
  (select value from t23 where key='steward_actor'),
  (select value from t23 where key='project'),
  'Produzir entrega verificável T2.3',
  'Precisamos de uma entrega com Claim e Evidence examinada por terceiro sob critérios explícitos.',
  'O Reviewer terá apenas verification.issue neste Project por sete dias.',
  'Contribution, Artifact, Claim, Evidence e Verification atribuída.',
  1,
  'b3000000-0000-4000-8000-000000000001',
  't23-opportunity-create'
);

update t23 set value=(result->>'opportunity_id')::uuid where key='opportunity';

update t23
set result = public.b1_publish_opportunity(
  (select value from t23 where key='steward_actor'),
  value,
  1,
  'b3000000-0000-4000-8000-000000000002',
  't23-opportunity-publish'
)
where key='opportunity';

select set_config('request.jwt.claim.sub','a3000000-0000-4000-8000-000000000002',true);

insert into t23(key, result)
select 'proposal', public.b1_submit_public_proposal(
  (select value from t23 where key='contributor_actor'),
  (select value from t23 where key='opportunity'),
  'Posso produzir a entrega e registrar uma Claim limitada acompanhada de Evidence explícita.',
  'Aceito revisão por terceiro segundo critérios e método declarados.',
  'Artifact textual, Claim, Evidence e posterior Verification.',
  'Voluntário neste teste local.',
  'b3000000-0000-4000-8000-000000000003',
  't23-proposal-submit'
);

update t23 set value=(result->>'proposal_id')::uuid where key='proposal';

select set_config('request.jwt.claim.sub','a3000000-0000-4000-8000-000000000001',true);

insert into t23(key, result)
select 'commitment', public.t2b_accept_proposal_for_claim_evidence(
  (select value from t23 where key='steward_actor'),
  (select value from t23 where key='proposal'),
  (select current_version from public.opportunities
    where id=(select value from t23 where key='opportunity')),
  (select current_version from public.proposals
    where id=(select value from t23 where key='proposal')),
  (select material_version from public.opportunities
    where id=(select value from t23 where key='opportunity')),
  (select material_version from public.proposals
    where id=(select value from t23 where key='proposal')),
  'Aceito o trabalho e as autoridades locais de Contribution, Artifact, Claim e Evidence.',
  'b3000000-0000-4000-8000-000000000004',
  't23-proposal-accept'
);

update t23 set value=(result->>'commitment_id')::uuid where key='commitment';

select set_config('request.jwt.claim.sub','a3000000-0000-4000-8000-000000000002',true);

insert into t23(key, result)
select 'contribution', public.b2a_submit_contribution(
  (select value from t23 where key='contributor_actor'),
  (select value from t23 where key='commitment'),
  'Executei o trabalho acordado e produzi uma saída textual observável para revisão por terceiro.',
  'O teste é local e não demonstra utilidade externa, adoção ou verdade universal.',
  null,
  'b3000000-0000-4000-8000-000000000005',
  't23-contribution-submit'
);

update t23 set value=(result->>'contribution_id')::uuid where key='contribution';

insert into t23(key, text_value) values(
  'artifact_text',
  E'Resultado T2.3\n\nEste Artifact é a saída observável submetida a revisão.\nEle não é Evidence até ser explicitamente relacionado a uma Claim.'
);

insert into t23(key, result)
select 'artifact', public.t2a_attach_text_artifact(
  (select value from t23 where key='contributor_actor'),
  (select value from t23 where key='contribution'),
  (select text_value from t23 where key='artifact_text'),
  'b3000000-0000-4000-8000-000000000006',
  't23-artifact-attach'
);

update t23 set value=(result->>'artifact_id')::uuid where key='artifact';

insert into t23(key, result)
select 'claim', public.b2b1_record_claim(
  (select value from t23 where key='contributor_actor'),
  'ARTIFACT',
  (select value from t23 where key='artifact'),
  'Este Artifact contém a saída textual exata produzida no trabalho acordado.',
  'A Claim se limita à existência e ao conteúdo desta saída local.',
  null,
  'b3000000-0000-4000-8000-000000000007',
  't23-claim-record'
);

update t23 set value=(result->>'claim_id')::uuid where key='claim';

insert into t23(key, result)
select 'evidence', public.b2b1_register_evidence(
  (select value from t23 where key='contributor_actor'),
  (select value from t23 where key='claim'),
  (select value from t23 where key='artifact'),
  'SUPPORTS',
  'O Artifact digest-bound é usado explicitamente como fonte para examinar a Claim sobre seu conteúdo.',
  'A fonte não demonstra qualidade, utilidade externa ou consequência.',
  null,
  'b3000000-0000-4000-8000-000000000008',
  't23-evidence-register'
);

update t23 set value=(result->>'evidence_item_id')::uuid where key='evidence';

select is(
  (select count(*)::integer from public.role_assignments
   where actor_id=(select value from t23 where key='reviewer_actor')),
  0,
  'Reviewer starts without role assignment'
);

select is(
  (select count(*)::integer from public.project_members
   where actor_id=(select value from t23 where key='reviewer_actor')
     and project_id=(select value from t23 where key='project')),
  0,
  'Reviewer starts without Project membership'
);

select ok(
  not private.b1_has_capability(
    (select value from t23 where key='reviewer_actor'),
    'verification.issue','PROJECT',
    (select value from t23 where key='project')
  ),
  'Reviewer has no verification.issue before bounded assignment'
);

select set_config('request.jwt.claim.sub','a3000000-0000-4000-8000-000000000001',true);

insert into t23(key, result)
select 'request', public.t2c_assign_and_request_verification(
  (select value from t23 where key='steward_actor'),
  (select value from t23 where key='claim'),
  (select value from t23 where key='reviewer_actor'),
  'Confirmar se o Artifact examinado corresponde ao conteúdo descrito na Claim e registrar limites da avaliação.',
  'DIGEST_AND_CONTENT_REVIEW',
  now() + interval '7 days',
  'b3000000-0000-4000-8000-000000000009',
  't23-review-delegation',
  'b3000000-0000-4000-8000-000000000010',
  't23-verification-request'
);

update t23 set value=(result->>'verification_request_id')::uuid where key='request';

select ok(
  (select result ->> 'delegation_id' is not null from t23 where key='request'),
  'review request returns standard delegation'
);

select is(
  (
    select capability_code
    from public.delegations
    where id=(select (result->>'delegation_id')::uuid from t23 where key='request')
  ),
  'verification.issue',
  'Reviewer receives only verification.issue'
);

select is(
  (
    select scope_type
    from public.delegations
    where id=(select (result->>'delegation_id')::uuid from t23 where key='request')
  ),
  'PROJECT',
  'Reviewer authority is Project-scoped'
);

select is(
  (
    select scope_id
    from public.delegations
    where id=(select (result->>'delegation_id')::uuid from t23 where key='request')
  ),
  (select value from t23 where key='project'),
  'Reviewer authority is limited to exact Project'
);

select ok(
  private.b1_has_capability(
    (select value from t23 where key='reviewer_actor'),
    'verification.issue','PROJECT',
    (select value from t23 where key='project')
  ),
  'Reviewer has verification.issue in assigned Project'
);

select ok(
  not private.b1_has_capability(
    (select value from t23 where key='reviewer_actor'),
    'verification.issue','PROJECT',
    (select value from t23 where key='other_project')
  ),
  'Reviewer authority does not cross Project'
);

select ok(
  not private.b1_has_capability(
    (select value from t23 where key='reviewer_actor'),
    'verification.request','PROJECT',
    (select value from t23 where key='project')
  ),
  'Reviewer does not gain verification.request'
);

select ok(
  not private.b1_has_capability(
    (select value from t23 where key='reviewer_actor'),
    'proposal.accept','PROJECT',
    (select value from t23 where key='project')
  ),
  'Reviewer does not gain proposal.accept'
);

select ok(
  not private.b1_profile_has_cell_access(
    '00000000-0000-4000-8000-00000000c001',
    'a3000000-0000-4000-8000-000000000003'
  ),
  'Reviewer assignment does not grant cell-wide access'
);

select is(
  (
    select independence
    from public.verification_requests
    where id=(select value from t23 where key='request')
  ),
  'INDEPENDENT',
  'third-party reviewer request is INDEPENDENT'
);

select is(
  (
    select conflict_codes
    from public.verification_requests
    where id=(select value from t23 where key='request')
  ),
  '{}'::text[],
  'independent request has no conflict codes'
);

select is(
  public.b2b2_reconcile_request((select value from t23 where key='request')),
  '{}'::text[],
  'canonical Verification Request reconciles before issue'
);

select ok(
  'REVIEWER_IS_CLAIM_AUTHOR' = any(
    private.b2b2_conflict_codes(
      (select value from t23 where key='claim'),
      (select value from t23 where key='steward_actor'),
      (select value from t23 where key='contributor_actor')
    )
  ),
  'conflicted reviewer is explicitly identified as Claim author'
);

select ok(
  'REVIEWER_IS_EVIDENCE_CUSTODIAN' = any(
    private.b2b2_conflict_codes(
      (select value from t23 where key='claim'),
      (select value from t23 where key='steward_actor'),
      (select value from t23 where key='contributor_actor')
    )
  ),
  'conflicted reviewer is explicitly identified as Evidence custodian'
);

select set_config('request.jwt.claim.sub','a3000000-0000-4000-8000-000000000004',true);

select throws_ok(
  format(
    $sql$
      select public.b2b2_issue_verification(
        %L::uuid,
        %L::uuid,
        'DIGEST_AND_CONTENT_REVIEW',
        'Tentativa não autorizada por Actor não designado.',
        'INCONCLUSIVE',
        'Sem autoridade.',
        array[%L::uuid],
        'b3000000-0000-4000-8000-000000000011'::uuid,
        't23-outsider-verification'
      )
    $sql$,
    (select value from t23 where key='outsider_actor'),
    (select value from t23 where key='request'),
    (select value from t23 where key='evidence')
  ),
  '42501',
  'CZ403:CAPABILITY_DENIED',
  'unassigned Actor cannot issue Verification'
);

select set_config('request.jwt.claim.sub','a3000000-0000-4000-8000-000000000003',true);

insert into t23(key, count_value)
select 'decision_count_before_issue', count(*) from public.decision_records;

insert into t23(key, result)
select 'verification', public.b2b2_issue_verification(
  (select value from t23 where key='reviewer_actor'),
  (select value from t23 where key='request'),
  'DIGEST_AND_CONTENT_REVIEW',
  'O digest e o conteúdo examinado correspondem à fonte registrada; a Claim é parcialmente sustentada dentro do escopo local declarado.',
  'PARTIAL',
  'A avaliação não testa utilidade externa, qualidade geral, adoção ou consequência real.',
  array[(select value from t23 where key='evidence')],
  'b3000000-0000-4000-8000-000000000012',
  't23-verification-issue'
);

update t23 set value=(result->>'verification_id')::uuid where key='verification';

select is(
  (
    select classification
    from public.verifications
    where id=(select value from t23 where key='verification')
  ),
  'PARTIAL',
  'Verification preserves four-state classification vocabulary'
);

select is(
  (
    select independence
    from public.verifications
    where id=(select value from t23 where key='verification')
  ),
  'INDEPENDENT',
  'issued Verification preserves independence'
);

select is(
  (
    select state
    from public.verification_requests
    where id=(select value from t23 where key='request')
  ),
  'COMPLETED',
  'issuing Verification completes request'
);

select is(
  (
    select count(*)::integer
    from public.verification_evidence_items
    where verification_id=(select value from t23 where key='verification')
      and evidence_item_id=(select value from t23 where key='evidence')
  ),
  1,
  'Verification records examined Evidence'
);

select is(
  public.b2b2_reconcile_request((select value from t23 where key='request')),
  '{}'::text[],
  'canonical Verification Request reconciles after issue'
);

select is(
  public.b2b2_reconcile_verification((select value from t23 where key='verification')),
  '{}'::text[],
  'canonical issued Verification reconciles'
);

select is(
  (select count(*) from public.decision_records),
  (select count_value from t23 where key='decision_count_before_issue'),
  'issuing Verification does not silently create an authorization Decision record'
);

select is(
  (
    select count(*)::integer
    from public.project_members
    where actor_id=(select value from t23 where key='reviewer_actor')
      and project_id=(select value from t23 where key='project')
  ),
  0,
  'Reviewer remains outside permanent Project membership'
);

select * from finish();
rollback;

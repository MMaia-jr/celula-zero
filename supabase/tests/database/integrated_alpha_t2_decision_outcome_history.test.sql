begin;

create extension if not exists pgtap with schema extensions;
select no_plan();

select has_table('public', 'domain_decisions', 'T2.4 has first-class substantive Decision table');
select has_table('public', 'outcomes', 'T2.4 has first-class Outcome table');
select has_table('public', 'domain_decision_verifications', 'Decision references issued Verification explicitly');
select has_function(
  'public',
  't2d_issue_domain_decision',
  array['uuid','uuid','uuid[]','text','text','text','uuid','text'],
  'contextual Decision command exists'
);
select has_function(
  'public',
  't2d_record_outcome',
  array['uuid','uuid','text','text','timestamp with time zone','text','uuid','text'],
  'separate Outcome command exists'
);
select has_function(
  'public',
  't2d_get_commitment_history',
  array['uuid'],
  'human-facing history projection RPC exists'
);
select ok(
  has_function_privilege(
    'authenticated',
    'private.t2d_claim_commitment_id(uuid)',
    'EXECUTE'
  ),
  'authenticated may execute private claim-to-commitment helper required by Decision RLS'
);
select ok(
  has_function_privilege(
    'authenticated',
    'private.t2d_current_profile_can_read_commitment(uuid)',
    'EXECUTE'
  ),
  'authenticated may execute private commitment-read helper required by Decision RLS'
);
select has_trigger(
  'public', 'domain_decisions', 'domain_decisions_append_only',
  'substantive Decision is append-only'
);
select has_trigger(
  'public', 'outcomes', 'outcomes_append_only',
  'Outcome is append-only'
);

insert into auth.users(
  id, aud, role, email, raw_app_meta_data, raw_user_meta_data, created_at, updated_at
) values
(
  'a4000000-0000-4000-8000-000000000001',
  'authenticated','authenticated','t24-steward@example.test',
  '{"provider":"email","providers":["email"]}',
  '{"name":"T24 Steward"}', now(), now()
),
(
  'a4000000-0000-4000-8000-000000000002',
  'authenticated','authenticated','t24-contributor@example.test',
  '{"provider":"email","providers":["email"]}',
  '{"name":"T24 Contributor"}', now(), now()
),
(
  'a4000000-0000-4000-8000-000000000003',
  'authenticated','authenticated','t24-reviewer@example.test',
  '{"provider":"email","providers":["email"]}',
  '{"name":"T24 Reviewer"}', now(), now()
),
(
  'a4000000-0000-4000-8000-000000000004',
  'authenticated','authenticated','t24-outsider@example.test',
  '{"provider":"email","providers":["email"]}',
  '{"name":"T24 Outsider"}', now(), now()
);

create temporary table t24(
  key text primary key,
  value uuid,
  result jsonb,
  text_value text,
  count_value bigint
);

insert into t24(key, value)
select 'steward_actor', actor_id
from public.actor_memberships
where profile_id = 'a4000000-0000-4000-8000-000000000001' and role = 'OWNER';

insert into t24(key, value)
select 'contributor_actor', actor_id
from public.actor_memberships
where profile_id = 'a4000000-0000-4000-8000-000000000002' and role = 'OWNER';

insert into t24(key, value)
select 'reviewer_actor', actor_id
from public.actor_memberships
where profile_id = 'a4000000-0000-4000-8000-000000000003' and role = 'OWNER';

insert into t24(key, value)
select 'outsider_actor', actor_id
from public.actor_memberships
where profile_id = 'a4000000-0000-4000-8000-000000000004' and role = 'OWNER';

select set_config('request.jwt.claim.sub','a4000000-0000-4000-8000-000000000001',true);

insert into t24(key, result)
select 'project', to_jsonb(x)
from public.create_project_atomic(
  'Projeto Integrated T2 Decision Outcome',
  'projeto-integrated-t2-decision-outcome',
  'Projeto local para fechar a cadeia de trabalho até Decision e Outcome sem inferir utilidade externa.',
  'Testar uma Decision contextual após Verification atribuída.',
  'Preservar Verification, Decision e Outcome como registros epistemicamente distintos.',
  'História reconstruível e Outcome honestamente INCONCLUSIVE no teste automatizado.',
  'Sem deploy, pagamento, reputação universal ou contato externo.',
  array['decision','outcome','prov'],
  'VOLUNTARY','OPEN',true
) x;

update t24 set value=(result->>'project_id')::uuid where key='project';

insert into t24(key, result)
select 'need', public.t1_create_need(
  (select value from t24 where key='steward_actor'),
  (select value from t24 where key='project'),
  'Need Integrated T2.4',
  'Precisamos fechar uma cooperação desde Need até Decision e Outcome sem colapsar as fronteiras epistemológicas.',
  'Teste local automatizado.',
  'b4000000-0000-4000-8000-000000000001',
  't24-need-create'
);
update t24 set value=(result->>'need_id')::uuid where key='need';

update t24
set result=public.t1_publish_need(
  (select value from t24 where key='steward_actor'),
  value,
  1,
  'b4000000-0000-4000-8000-000000000002',
  't24-need-publish'
)
where key='need';

insert into t24(key, result)
select 'opportunity', public.t1_create_opportunity_for_need(
  (select value from t24 where key='steward_actor'),
  (select value from t24 where key='project'),
  (select value from t24 where key='need'),
  'Executar e revisar entrega T2.4',
  'Produzir um Artifact, registrar Claim/Evidence, obter Verification e decidir contextualmente.',
  'Escopo local e versões exatas.',
  'Episódio reconstruível com Outcome INCONCLUSIVE.',
  1,
  'b4000000-0000-4000-8000-000000000003',
  't24-opportunity-create'
);
update t24 set value=(result->>'opportunity_id')::uuid where key='opportunity';

update t24
set result=public.b1_publish_opportunity(
  (select value from t24 where key='steward_actor'),
  value,
  (select material_version from public.opportunities where id=t24.value),
  'b4000000-0000-4000-8000-000000000004',
  't24-opportunity-publish'
)
where key='opportunity';

select set_config('request.jwt.claim.sub','a4000000-0000-4000-8000-000000000002',true);

insert into t24(key, result)
select 'proposal', public.b1_submit_public_proposal(
  (select value from t24 where key='contributor_actor'),
  (select value from t24 where key='opportunity'),
  'Executarei a entrega e registrarei os limites do que o resultado demonstra.',
  'Aceito revisão atribuída e Decision contextual posterior.',
  'Contribution, Artifact, Claim e Evidence explícita.',
  'Voluntário; sem direito econômico retroativo.',
  'b4000000-0000-4000-8000-000000000005',
  't24-proposal-submit'
);
update t24 set value=(result->>'proposal_id')::uuid where key='proposal';

select set_config('request.jwt.claim.sub','a4000000-0000-4000-8000-000000000001',true);

insert into t24(key, result)
select 'commitment', public.t2b_accept_proposal_for_claim_evidence(
  (select value from t24 where key='steward_actor'),
  (select value from t24 where key='proposal'),
  (select current_version from public.opportunities
    where id=(select value from t24 where key='opportunity')),
  (select current_version from public.proposals
    where id=(select value from t24 where key='proposal')),
  (select material_version from public.opportunities
    where id=(select value from t24 where key='opportunity')),
  (select material_version from public.proposals
    where id=(select value from t24 where key='proposal')),
  'Aceito as versões exatas para execução local e revisão atribuída.',
  'b4000000-0000-4000-8000-000000000006',
  't24-proposal-accept'
);
update t24 set value=(result->>'commitment_id')::uuid where key='commitment';

select set_config('request.jwt.claim.sub','a4000000-0000-4000-8000-000000000002',true);

insert into t24(key, result)
select 'contribution', public.b2a_submit_contribution(
  (select value from t24 where key='contributor_actor'),
  (select value from t24 where key='commitment'),
  'Executei a entrega local acordada e produzi um texto exato como saída observável.',
  'O trabalho local não demonstra utilidade externa, adoção, PMF ou escala.',
  null,
  'b4000000-0000-4000-8000-000000000007',
  't24-contribution-submit'
);
update t24 set value=(result->>'contribution_id')::uuid where key='contribution';

insert into t24(key, text_value) values(
  'artifact_text',
  E'T2.4 integrated local artifact\n\nExact text for digest-bound provenance and review.'
);

insert into t24(key, result)
select 'artifact', public.t2a_attach_text_artifact(
  (select value from t24 where key='contributor_actor'),
  (select value from t24 where key='contribution'),
  (select text_value from t24 where key='artifact_text'),
  'b4000000-0000-4000-8000-000000000008',
  't24-artifact'
);
update t24 set value=(result->>'artifact_id')::uuid where key='artifact';

insert into t24(key, result)
select 'claim', public.b2b1_record_claim(
  (select value from t24 where key='contributor_actor'),
  'ARTIFACT',
  (select value from t24 where key='artifact'),
  'O Artifact contém exatamente a saída textual produzida nesta execução local.',
  'A Claim limita-se ao conteúdo e existência deste Artifact local.',
  null,
  'b4000000-0000-4000-8000-000000000009',
  't24-claim'
);
update t24 set value=(result->>'claim_id')::uuid where key='claim';

insert into t24(key, result)
select 'evidence', public.b2b1_register_evidence(
  (select value from t24 where key='contributor_actor'),
  (select value from t24 where key='claim'),
  (select value from t24 where key='artifact'),
  'SUPPORTS',
  'O próprio Artifact digest-bound é usado como fonte explícita para examinar esta Claim limitada.',
  'A fonte não prova qualidade, consequência externa ou adoção.',
  null,
  'b4000000-0000-4000-8000-000000000010',
  't24-evidence'
);
update t24 set value=(result->>'evidence_item_id')::uuid where key='evidence';

select set_config('request.jwt.claim.sub','a4000000-0000-4000-8000-000000000001',true);

insert into t24(key, result)
select 'request', public.t2c_assign_and_request_verification(
  (select value from t24 where key='steward_actor'),
  (select value from t24 where key='claim'),
  (select value from t24 where key='reviewer_actor'),
  'Confirmar digest e conteúdo do Artifact em relação à Claim, registrando limites explícitos.',
  'DIGEST_AND_CONTENT_REVIEW',
  now() + interval '7 days',
  'b4000000-0000-4000-8000-000000000011',
  't24-review-delegation',
  'b4000000-0000-4000-8000-000000000012',
  't24-review-request'
);
update t24 set value=(result->>'verification_request_id')::uuid where key='request';

select set_config('request.jwt.claim.sub','a4000000-0000-4000-8000-000000000003',true);

insert into t24(key, result)
select 'verification', public.b2b2_issue_verification(
  (select value from t24 where key='reviewer_actor'),
  (select value from t24 where key='request'),
  'DIGEST_AND_CONTENT_REVIEW',
  'O digest e o conteúdo correspondem à fonte registrada; a Claim é sustentada apenas dentro do escopo local declarado.',
  'PASS',
  'PASS local não demonstra utilidade externa, adoção, PMF, escala ou verdade universal.',
  array[(select value from t24 where key='evidence')],
  'b4000000-0000-4000-8000-000000000013',
  't24-verification'
);
update t24 set value=(result->>'verification_id')::uuid where key='verification';

-- Reviewer and contributor do not acquire substantive decision authority.
select set_config('request.jwt.claim.sub','a4000000-0000-4000-8000-000000000002',true);
select throws_ok(
  format(
    $sql$
      select public.t2d_issue_domain_decision(
        %L::uuid,%L::uuid,array[%L::uuid],
        'ACCEPT_FOR_CONTEXT','Tentativa não autorizada do Contributor.',
        'Sem autoridade de Decision.',
        'b4000000-0000-4000-8000-000000000014'::uuid,'t24-contributor-decision'
      )
    $sql$,
    (select value from t24 where key='contributor_actor'),
    (select value from t24 where key='claim'),
    (select value from t24 where key='verification')
  ),
  '42501',
  'CZ403:CAPABILITY_DENIED',
  'Contributor cannot issue substantive Decision'
);

select set_config('request.jwt.claim.sub','a4000000-0000-4000-8000-000000000003',true);
select throws_ok(
  format(
    $sql$
      select public.t2d_issue_domain_decision(
        %L::uuid,%L::uuid,array[%L::uuid],
        'ACCEPT_FOR_CONTEXT','Tentativa não autorizada do Reviewer.',
        'Verification não implica Decision.',
        'b4000000-0000-4000-8000-000000000015'::uuid,'t24-reviewer-decision'
      )
    $sql$,
    (select value from t24 where key='reviewer_actor'),
    (select value from t24 where key='claim'),
    (select value from t24 where key='verification')
  ),
  '42501',
  'CZ403:CAPABILITY_DENIED',
  'Reviewer cannot issue substantive Decision'
);

select set_config('request.jwt.claim.sub','a4000000-0000-4000-8000-000000000001',true);

select throws_ok(
  format(
    $sql$
      select public.t2d_issue_domain_decision(
        %L::uuid,%L::uuid,'{}'::uuid[],
        'ACCEPT_FOR_CONTEXT','Tentativa sem Verification atribuída.',
        'A aceitação contextual exige pelo menos uma Verification.',
        'b4000000-0000-4000-8000-000000000016'::uuid,'t24-decision-no-verification'
      )
    $sql$,
    (select value from t24 where key='steward_actor'),
    (select value from t24 where key='claim')
  ),
  'P0001',
  'CZ409:DECISION_VERIFICATION_REQUIRED',
  'ACCEPT_FOR_CONTEXT requires at least one issued Verification'
);

insert into t24(key, count_value)
select 'outcomes_before_decision', count(*) from public.outcomes;

insert into t24(key, result)
select 'decision', public.t2d_issue_domain_decision(
  (select value from t24 where key='steward_actor'),
  (select value from t24 where key='claim'),
  array[(select value from t24 where key='verification')],
  'ACCEPT_FOR_CONTEXT',
  'Aceito esta Claim somente no contexto deste Project e desta entrega local, considerando a Verification atribuída.',
  'A Decision não afirma verdade universal nem consequência externa.',
  'b4000000-0000-4000-8000-000000000017',
  't24-decision'
);
update t24 set value=(result->>'decision_id')::uuid where key='decision';

select is(
  (select disposition from public.domain_decisions
   where id=(select value from t24 where key='decision')),
  'ACCEPT_FOR_CONTEXT',
  'substantive Decision preserves contextual disposition'
);

select is(
  (select authority_basis from public.domain_decisions
   where id=(select value from t24 where key='decision')),
  'PROJECT_STEWARDSHIP',
  'substantive Decision records authority basis'
);

select is(
  (select count(*)::integer from public.domain_decision_verifications
   where decision_id=(select value from t24 where key='decision')
     and verification_id=(select value from t24 where key='verification')),
  1,
  'Decision explicitly references considered Verification'
);

select is(
  (select count(*) from public.outcomes),
  (select count_value from t24 where key='outcomes_before_decision'),
  'issuing Decision does not automatically create Outcome'
);

select is(
  public.t2d_reconcile_decision((select value from t24 where key='decision')),
  '{}'::text[],
  'substantive Decision reconciles'
);

select is(
  (
    select count(*)::integer
    from public.decision_records dr
    where dr.target_type = 'DOMAIN_DECISION'
      and dr.target_id = (select value from t24 where key='decision')
      and dr.decision_type = 'DOMAIN_DECISION_ISSUE'
      and dr.outcome = 'ALLOW'
  ),
  1,
  'authorization decision_record remains separate audit for substantive Decision'
);

select throws_ok(
  format(
    $sql$
      select public.t2d_record_outcome(
        %L::uuid,%L::uuid,'OBSERVED',
        'Tentativa de Outcome OBSERVED sem timestamp de observação.',
        null,
        'OBSERVED requer observed_at.',
        'b4000000-0000-4000-8000-000000000018'::uuid,'t24-observed-missing-time'
      )
    $sql$,
    (select value from t24 where key='steward_actor'),
    (select value from t24 where key='decision')
  ),
  '22023',
  'CZ422:OBSERVED_AT_REQUIRED',
  'OBSERVED Outcome cannot be manufactured without observed_at'
);

insert into t24(key, result)
select 'outcome', public.t2d_record_outcome(
  (select value from t24 where key='steward_actor'),
  (select value from t24 where key='decision'),
  'INCONCLUSIVE',
  'A consequência no mundo real permanece inconclusiva porque este é um teste automatizado local.',
  null,
  'Nenhuma utilidade externa, adoção, PMF ou escala foi observada neste teste.',
  'b4000000-0000-4000-8000-000000000019',
  't24-outcome'
);
update t24 set value=(result->>'outcome_id')::uuid where key='outcome';

select is(
  (select classification from public.outcomes
   where id=(select value from t24 where key='outcome')),
  'INCONCLUSIVE',
  'automated local Outcome honestly preserves INCONCLUSIVE'
);

select is(
  (select observed_at from public.outcomes
   where id=(select value from t24 where key='outcome')),
  null::timestamptz,
  'INCONCLUSIVE Outcome has no manufactured observed_at'
);

select is(
  public.t2d_reconcile_outcome((select value from t24 where key='outcome')),
  '{}'::text[],
  'Outcome reconciles'
);

select is(
  (
    select count(*)::integer
    from public.domain_events
    where aggregate_type='DOMAIN_DECISION'
      and aggregate_id=(select value from t24 where key='decision')
      and event_type='DOMAIN_DECISION_ISSUED'
  ),
  1,
  'Decision event is reconstructible'
);

select is(
  (
    select count(*)::integer
    from public.domain_events
    where aggregate_type='OUTCOME'
      and aggregate_id=(select value from t24 where key='outcome')
      and event_type='OUTCOME_RECORDED'
  ),
  1,
  'Outcome event is reconstructible'
);

select is(
  (public.t2d_get_commitment_history(
    (select value from t24 where key='commitment')
  ) ->> 'viewer_scope'),
  'PARTY',
  'Project Steward can read party-scope Coordination History'
);

select is(
  jsonb_array_length(
    public.t2d_get_commitment_history(
      (select value from t24 where key='commitment')
    ) -> 'decisions'
  ),
  1,
  'Coordination History contains substantive Decision'
);

select is(
  jsonb_array_length(
    public.t2d_get_commitment_history(
      (select value from t24 where key='commitment')
    ) -> 'outcomes'
  ),
  1,
  'Coordination History contains Outcome'
);

select set_config('request.jwt.claim.sub','a4000000-0000-4000-8000-000000000003',true);
select is(
  (public.t2d_get_commitment_history(
    (select value from t24 where key='commitment')
  ) ->> 'viewer_scope'),
  'REVIEWER',
  'assigned Reviewer can inspect authorization-bounded Coordination History'
);

select ok(
  (
    public.t2d_get_commitment_history(
      (select value from t24 where key='commitment')
    ) #>> '{contributions,0,description}'
  ) is null,
  'Reviewer history does not widen access to private Contribution body'
);

select set_config('request.jwt.claim.sub','a4000000-0000-4000-8000-000000000004',true);
select throws_ok(
  format(
    'select public.t2d_get_commitment_history(%L::uuid)',
    (select value from t24 where key='commitment')
  ),
  '42501',
  'CZ403:COMMITMENT_HISTORY_DENIED',
  'unrelated authenticated Actor cannot read Coordination History'
);

select set_config('request.jwt.claim.sub','a4000000-0000-4000-8000-000000000001',true);

select ok(
  (
    select count(*) from public.t2_list_social_activity(false, 100)
    where event_type in (
      'CONTRIBUTION_SUBMITTED','ARTIFACT_ATTACHED','CLAIM_RECORDED',
      'EVIDENCE_REGISTERED','VERIFICATION_REQUESTED','VERIFICATION_ISSUED',
      'DOMAIN_DECISION_ISSUED','OUTCOME_RECORDED'
    )
  ) >= 8,
  'authorized Social Projection includes safe T2 semantic summaries'
);

select set_config('request.jwt.claim.sub','',true);
set local role anon;
select is(
  (
    select count(*)::integer from public.t2_list_social_activity(false, 100)
    where event_type in (
      'CONTRIBUTION_SUBMITTED','ARTIFACT_ATTACHED','CLAIM_RECORDED',
      'EVIDENCE_REGISTERED','VERIFICATION_REQUESTED','VERIFICATION_ISSUED',
      'DOMAIN_DECISION_ISSUED','OUTCOME_RECORDED'
    )
  ),
  0,
  'anonymous Social Projection does not leak project/private T2 events'
);
reset role;

select * from finish();
rollback;

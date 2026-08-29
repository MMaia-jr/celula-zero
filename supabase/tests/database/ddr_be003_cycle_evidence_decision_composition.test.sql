begin;

create extension if not exists pgtap with schema extensions;
select no_plan();

-- DDR-BE-003
--
-- TEST-ONLY composition slice.
--
-- No new domain table.
-- No new CycleBinding object type.
--
-- Test:
--
-- DragonCycle
--   -> PLANNING
--   -> canonical Opportunity / Proposal / Commitment
--   -> bounded T3 AgentTask
--   -> DOING
--   -> AgentExecution
--   -> existing CycleBinding(AGENT_EXECUTION / RESULT_OF)
--   -> canonical T2 Contribution / Artifacts
--   -> Claim
--   -> Evidence
--   -> Verification
--   -> contextual Decision
--   -> INCONCLUSIVE Outcome
--   -> CELEBRATING
--   -> New Dream
--
-- The final path must be reconstructible without duplicating
-- Artifact / Claim / Evidence / Verification / Decision inside DDR.
--
-- Reviewer below is a SYNTHETIC TEST FIXTURE only.
-- This does not demonstrate a second real human participant.

select is(
  (
    select count(*)::integer
    from information_schema.tables
    where table_schema='public'
      and table_name in (
        'dragon_artifacts',
        'dragon_claims',
        'dragon_evidence',
        'dragon_verifications',
        'dragon_decisions'
      )
  ),
  0,
  'DDR introduces no duplicate T2 semantic tables'
);


insert into auth.users(
  id,
  aud,
  role,
  email,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at
) values
(
  'd5000000-0000-4000-8000-000000000001',
  'authenticated',
  'authenticated',
  'ddr-be003-steward@example.test',
  '{"provider":"email","providers":["email"]}',
  '{"name":"DDR BE003 Steward"}',
  now(),
  now()
),
(
  'd5000000-0000-4000-8000-000000000002',
  'authenticated',
  'authenticated',
  'ddr-be003-reviewer@example.test',
  '{"provider":"email","providers":["email"]}',
  '{"name":"DDR BE003 Synthetic Reviewer"}',
  now(),
  now()
);


insert into public.pilot_memberships(
  profile_id,
  status,
  source
) values
(
  'd5000000-0000-4000-8000-000000000001',
  'ACTIVE',
  'SEED'
),
(
  'd5000000-0000-4000-8000-000000000002',
  'ACTIVE',
  'SEED'
)
on conflict (profile_id)
do update set status='ACTIVE';


create temporary table ddr_be003(
  key text primary key,
  value uuid,
  result jsonb,
  text_value text
);


insert into ddr_be003(key,value)
select 'steward_actor',actor_id
from public.actor_memberships
where profile_id='d5000000-0000-4000-8000-000000000001'
  and role='OWNER';


insert into ddr_be003(key,value)
select 'reviewer_actor',actor_id
from public.actor_memberships
where profile_id='d5000000-0000-4000-8000-000000000002'
  and role='OWNER';


select set_config(
  'request.jwt.claim.sub',
  'd5000000-0000-4000-8000-000000000001',
  true
);


insert into ddr_be003(key,result)
select 'project',to_jsonb(x)
from public.create_project_atomic(
  'Projeto DDR BE003',
  'projeto-ddr-be003',
  'Projeto determinístico para testar a composição DragonCycle até Evidence, Verification, Decision e Outcome.',
  'Preservar a cadeia completa sem duplicar semânticas T2 dentro do Dragon Dream backend.',
  'Demonstrar que uma execução vinculada ao Cycle é âncora suficiente para reconstruir a trilha canônica posterior.',
  'Uma cadeia backend reconstruível e epistemicamente separada.',
  'Teste local automatizado; sem usuário externo, utilidade externa, adoção, PMF ou escala.',
  array['dragon-cycle','evidence','verification','decision'],
  'VOLUNTARY',
  'OPEN',
  true
) x;

update ddr_be003
set value=(result->>'project_id')::uuid
where key='project';


insert into ddr_be003(key,result)
select 'cycle',public.ddr_open_cycle(
  (select value from ddr_be003 where key='steward_actor'),
  (select value from ddr_be003 where key='project'),
  null,
  null,
  'd6000000-0000-4000-8000-000000000001',
  'ddr-be003-open-cycle'
);

update ddr_be003
set value=(result->>'dragon_cycle_id')::uuid
where key='cycle';


insert into ddr_be003(key,result)
select 'dream',public.ddr_record_cycle_record(
  (select value from ddr_be003 where key='steward_actor'),
  (select value from ddr_be003 where key='cycle'),
  'ORIGINAL_RECORD',
  'Quero provar que um resultado produzido por uma IA pode entrar numa trilha de evidência e avaliação sem a IA adquirir verdade, legitimidade ou decisão.',
  '{}'::jsonb,
  'd6000000-0000-4000-8000-000000000002',
  'ddr-be003-dream'
);

update ddr_be003
set value=(result->>'cycle_record_id')::uuid
where key='dream';


select public.ddr_set_cycle_direction(
  (select value from ddr_be003 where key='steward_actor'),
  (select value from ddr_be003 where key='cycle'),
  (select value from ddr_be003 where key='dream'),
  'd6000000-0000-4000-8000-000000000003',
  'ddr-be003-set-direction'
);


select public.ddr_transition_cycle_phase(
  (select value from ddr_be003 where key='steward_actor'),
  (select value from ddr_be003 where key='cycle'),
  'PLANNING',
  'A direção humana está explícita e agora será traduzida em coordenação e trabalho canônicos.',
  'd6000000-0000-4000-8000-000000000004',
  'ddr-be003-to-planning'
);


insert into ddr_be003(key,result)
select 'plan_record',public.ddr_record_cycle_record(
  (select value from ddr_be003 where key='steward_actor'),
  (select value from ddr_be003 where key='cycle'),
  'ORIGINAL_RECORD',
  'Planejar uma inspeção local limitada, preservar seu resultado como Artifact e submeter a Claim a revisão atribuída.',
  '{}'::jsonb,
  'd6000000-0000-4000-8000-000000000005',
  'ddr-be003-plan-record'
);

update ddr_be003
set value=(result->>'cycle_record_id')::uuid
where key='plan_record';


insert into ddr_be003(key,result)
select 'need',public.t1_create_need(
  (select value from ddr_be003 where key='steward_actor'),
  (select value from ddr_be003 where key='project'),
  'Need DDR BE003',
  'Precisamos testar uma cadeia reconstruível da execução de IA até avaliação contextual humana.',
  'A necessidade pertence ao projeto e apenas materializa parte do Planning.',
  'd6000000-0000-4000-8000-000000000006',
  'ddr-be003-create-need'
);

update ddr_be003
set value=(result->>'need_id')::uuid
where key='need';


select public.t1_publish_need(
  (select value from ddr_be003 where key='steward_actor'),
  (select value from ddr_be003 where key='need'),
  (
    select material_version
    from public.needs
    where id=(select value from ddr_be003 where key='need')
  ),
  'd6000000-0000-4000-8000-000000000039',
  'ddr-be003-publish-need'
);


select public.ddr_bind_cycle_object(
  (select value from ddr_be003 where key='steward_actor'),
  (select value from ddr_be003 where key='cycle'),
  (select value from ddr_be003 where key='plan_record'),
  'NEED',
  (select value from ddr_be003 where key='need'),
  'MATERIALIZES',
  'd6000000-0000-4000-8000-000000000007',
  'ddr-be003-bind-need'
);


insert into ddr_be003(key,result)
select 'agent',public.t3_register_bounded_agent(
  (select value from ddr_be003 where key='steward_actor'),
  (select value from ddr_be003 where key='project'),
  'DDR BE003 Research Agent',
  'DDR BE003 human-controlled test operator',
  'd6000000-0000-4000-8000-000000000008',
  'ddr-be003-register-agent'
);

update ddr_be003
set value=(result->>'agent_actor_id')::uuid
where key='agent';


select public.ddr_add_cycle_ai_participant(
  (select value from ddr_be003 where key='steward_actor'),
  (select value from ddr_be003 where key='cycle'),
  (select value from ddr_be003 where key='agent'),
  'ROOM',
  'RESEARCHER',
  null,
  'ASSIST',
  'Execute apenas trabalho explicitamente autorizado; resultado não constitui Verification ou Decision.',
  'd6000000-0000-4000-8000-000000000009',
  'ddr-be003-add-room-agent'
);


insert into ddr_be003(key,result)
select 'opportunity',public.t1_create_opportunity_for_need(
  (select value from ddr_be003 where key='steward_actor'),
  (select value from ddr_be003 where key='project'),
  (select value from ddr_be003 where key='need'),
  'Executar inspeção DDR BE003',
  'Produzir uma inspeção local delimitada cuja saída possa seguir pela trilha T2.',
  'Sem rede externa; escopo explícito; resultado permanece contestável.',
  'Artifact digest-bound, Claim explícita e revisão humana atribuída.',
  1,
  'd6000000-0000-4000-8000-000000000010',
  'ddr-be003-create-opportunity'
);

update ddr_be003
set value=(result->>'opportunity_id')::uuid
where key='opportunity';


select public.b1_publish_opportunity(
  (select value from ddr_be003 where key='steward_actor'),
  (select value from ddr_be003 where key='opportunity'),
  (
    select material_version
    from public.opportunities
    where id=(select value from ddr_be003 where key='opportunity')
  ),
  'd6000000-0000-4000-8000-000000000011',
  'ddr-be003-publish-opportunity'
);


select public.t3_authorize_agent_opportunity_participation(
  (select value from ddr_be003 where key='steward_actor'),
  (select value from ddr_be003 where key='agent'),
  (select value from ddr_be003 where key='opportunity'),
  now() + interval '2 hours',
  'd6000000-0000-4000-8000-000000000012',
  'ddr-be003-agent-opportunity'
);


insert into ddr_be003(key,result)
select 'proposal',public.b1_submit_proposal(
  (select value from ddr_be003 where key='agent'),
  (select value from ddr_be003 where key='opportunity'),
  'Executarei a inspeção delimitada como SoftwareAgent atribuível.',
  'Escopo local, sem rede e sem inferir legitimidade a partir da execução.',
  'Resultado normalizado e digest-bound para revisão posterior.',
  'Teste voluntário local; nenhum direito econômico.',
  'd6000000-0000-4000-8000-000000000013',
  'ddr-be003-agent-proposal'
);

update ddr_be003
set value=(result->>'proposal_id')::uuid
where key='proposal';


insert into ddr_be003(key,result)
select 'commitment',public.t2b_accept_proposal_for_claim_evidence(
  (select value from ddr_be003 where key='steward_actor'),
  (select value from ddr_be003 where key='proposal'),
  (
    select current_version from public.opportunities
    where id=(select value from ddr_be003 where key='opportunity')
  ),
  (
    select current_version from public.proposals
    where id=(select value from ddr_be003 where key='proposal')
  ),
  (
    select material_version from public.opportunities
    where id=(select value from ddr_be003 where key='opportunity')
  ),
  (
    select material_version from public.proposals
    where id=(select value from ddr_be003 where key='proposal')
  ),
  'Aceito o trabalho delimitado e a trilha posterior de Claim e Evidence.',
  'd6000000-0000-4000-8000-000000000014',
  'ddr-be003-accept-proposal'
);

update ddr_be003
set value=(result->>'commitment_id')::uuid
where key='commitment';


insert into ddr_be003(key,result)
select 'task',public.t3_authorize_agent_task(
  (select value from ddr_be003 where key='steward_actor'),
  (select value from ddr_be003 where key='project'),
  (select value from ddr_be003 where key='agent'),
  'Inspect the canonical STATE.md boundary and produce a bounded deterministic DDR-BE-003 result.',
  array['STATE.md']::text[],
  now() + interval '2 hours',
  'd6000000-0000-4000-8000-000000000015',
  'ddr-be003-agent-execute-delegation',
  'd6000000-0000-4000-8000-000000000016',
  'ddr-be003-agent-task'
);

update ddr_be003
set value=(result->>'agent_task_id')::uuid
where key='task';


select public.ddr_bind_cycle_object(
  (select value from ddr_be003 where key='steward_actor'),
  (select value from ddr_be003 where key='cycle'),
  (select value from ddr_be003 where key='plan_record'),
  'AGENT_TASK',
  (select value from ddr_be003 where key='task'),
  'PLANS',
  'd6000000-0000-4000-8000-000000000017',
  'ddr-be003-bind-task'
);


select public.ddr_transition_cycle_phase(
  (select value from ddr_be003 where key='steward_actor'),
  (select value from ddr_be003 where key='cycle'),
  'DOING',
  'Need, Opportunity, Commitment e AgentTask estão explícitos; a execução delimitada pode iniciar.',
  'd6000000-0000-4000-8000-000000000018',
  'ddr-be003-to-doing'
);


insert into ddr_be003(key,text_value) values
(
  'input_text',
  'DDR-BE-003 bounded deterministic input material'
),
(
  'result_text',
  'DDR-BE-003 bounded deterministic normalized SoftwareAgent result'
);


insert into ddr_be003(key,result)
select 'execution',public.t3_start_agent_execution(
  (select value from ddr_be003 where key='agent'),
  (select value from ddr_be003 where key='task'),
  'OLLAMA_LOCAL',
  'ddr-be003-fixture-runtime',
  encode(
    extensions.digest(
      convert_to(
        (select text_value from ddr_be003 where key='input_text'),
        'UTF8'
      ),
      'sha256'
    ),
    'hex'
  ),
  'd6000000-0000-4000-8000-000000000019',
  'ddr-be003-execution-start'
);

update ddr_be003
set value=(result->>'execution_id')::uuid
where key='execution';


select public.t3_complete_agent_execution(
  (select value from ddr_be003 where key='agent'),
  (select value from ddr_be003 where key='execution'),
  'INCONCLUSIVE',
  'The bounded deterministic execution produced an attributable result that still requires evidence and human evaluation.',
  'Deterministic fixture; no external user and no substantive inference is demonstrated.',
  encode(
    extensions.digest(
      convert_to(
        (select text_value from ddr_be003 where key='result_text'),
        'UTF8'
      ),
      'sha256'
    ),
    'hex'
  ),
  octet_length(
    convert_to(
      (select text_value from ddr_be003 where key='result_text'),
      'UTF8'
    )
  ),
  'd6000000-0000-4000-8000-000000000020',
  'ddr-be003-execution-complete'
);


select public.ddr_bind_cycle_object(
  (select value from ddr_be003 where key='steward_actor'),
  (select value from ddr_be003 where key='cycle'),
  null,
  'AGENT_EXECUTION',
  (select value from ddr_be003 where key='execution'),
  'RESULT_OF',
  'd6000000-0000-4000-8000-000000000021',
  'ddr-be003-bind-execution'
);


insert into ddr_be003(key,result)
select 'contribution',public.b2a_submit_contribution(
  (select value from ddr_be003 where key='agent'),
  (select value from ddr_be003 where key='commitment'),
  'SoftwareAgent submitted its bounded DDR-BE-003 execution result.',
  'Deterministic local fixture; this Contribution is not Verification or Decision.',
  null,
  'd6000000-0000-4000-8000-000000000022',
  'ddr-be003-contribution'
);

update ddr_be003
set value=(result->>'contribution_id')::uuid
where key='contribution';


insert into ddr_be003(key,result)
select 'input_artifact',public.t2a_attach_text_artifact(
  (select value from ddr_be003 where key='agent'),
  (select value from ddr_be003 where key='contribution'),
  (select text_value from ddr_be003 where key='input_text'),
  'd6000000-0000-4000-8000-000000000023',
  'ddr-be003-input-artifact'
);

update ddr_be003
set value=(result->>'artifact_id')::uuid
where key='input_artifact';


insert into ddr_be003(key,result)
select 'result_artifact',public.t2a_attach_text_artifact(
  (select value from ddr_be003 where key='agent'),
  (select value from ddr_be003 where key='contribution'),
  (select text_value from ddr_be003 where key='result_text'),
  'd6000000-0000-4000-8000-000000000024',
  'ddr-be003-result-artifact'
);

update ddr_be003
set value=(result->>'artifact_id')::uuid
where key='result_artifact';


select public.t3_link_agent_execution_artifact(
  (select value from ddr_be003 where key='agent'),
  (select value from ddr_be003 where key='execution'),
  (select value from ddr_be003 where key='input_artifact'),
  'INPUT_MATERIAL',
  'd6000000-0000-4000-8000-000000000025',
  'ddr-be003-link-input'
);


select public.t3_link_agent_execution_artifact(
  (select value from ddr_be003 where key='agent'),
  (select value from ddr_be003 where key='execution'),
  (select value from ddr_be003 where key='result_artifact'),
  'NORMALIZED_RESULT',
  'd6000000-0000-4000-8000-000000000026',
  'ddr-be003-link-result'
);


insert into ddr_be003(key,result)
select 'claim',public.b2b1_record_claim(
  (select value from ddr_be003 where key='agent'),
  'ARTIFACT',
  (select value from ddr_be003 where key='result_artifact'),
  'The normalized result Artifact contains exactly the bounded DDR-BE-003 SoftwareAgent output.',
  'Only the exact local digest-bound result Artifact is asserted.',
  null,
  'd6000000-0000-4000-8000-000000000027',
  'ddr-be003-claim'
);

update ddr_be003
set value=(result->>'claim_id')::uuid
where key='claim';


insert into ddr_be003(key,result)
select 'evidence',public.b2b1_register_evidence(
  (select value from ddr_be003 where key='agent'),
  (select value from ddr_be003 where key='claim'),
  (select value from ddr_be003 where key='input_artifact'),
  'SUPPORTS',
  'The exact digest-bound input material inspected by the SoftwareAgent is explicitly documented as Evidence for the narrow Claim about its normalized result.',
  'The input material supports examination of this bounded local result; it does not by itself prove the Claim, utility, quality, adoption or truth.',
  null,
  'd6000000-0000-4000-8000-000000000028',
  'ddr-be003-evidence'
);

update ddr_be003
set value=(result->>'evidence_item_id')::uuid
where key='evidence';


select set_config(
  'request.jwt.claim.sub',
  'd5000000-0000-4000-8000-000000000001',
  true
);


insert into ddr_be003(key,result)
select 'review_request',public.t2c_assign_and_request_verification(
  (select value from ddr_be003 where key='steward_actor'),
  (select value from ddr_be003 where key='claim'),
  (select value from ddr_be003 where key='reviewer_actor'),
  'Confirm that the exact digest-bound normalized result Artifact supports the narrow recorded Claim.',
  'DIGEST_AND_CONTENT_REVIEW',
  now() + interval '7 days',
  'd6000000-0000-4000-8000-000000000029',
  'ddr-be003-review-delegation',
  'd6000000-0000-4000-8000-000000000030',
  'ddr-be003-review-request'
);

update ddr_be003
set value=(result->>'verification_request_id')::uuid
where key='review_request';


select set_config(
  'request.jwt.claim.sub',
  'd5000000-0000-4000-8000-000000000002',
  true
);


insert into ddr_be003(key,result)
select 'verification',public.b2b2_issue_verification(
  (select value from ddr_be003 where key='reviewer_actor'),
  (select value from ddr_be003 where key='review_request'),
  'DIGEST_AND_CONTENT_REVIEW',
  'The registered digest and Artifact content match the narrow Claim within the deterministic local fixture.',
  'PASS',
  'PASS applies only to this local artifact/content relation and demonstrates no external utility, adoption, PMF or scale.',
  array[
    (select value from ddr_be003 where key='evidence')
  ],
  'd6000000-0000-4000-8000-000000000031',
  'ddr-be003-verification'
);

update ddr_be003
set value=(result->>'verification_id')::uuid
where key='verification';


select is(
  (
    select independence
    from public.verifications
    where id=(select value from ddr_be003 where key='verification')
  ),
  'INDEPENDENT',
  'synthetic reviewer fixture is structurally independent from steward, agent and evidence custodian'
);


select set_config(
  'request.jwt.claim.sub',
  'd5000000-0000-4000-8000-000000000001',
  true
);


insert into ddr_be003(key,result)
select 'decision',public.t2d_issue_domain_decision(
  (select value from ddr_be003 where key='steward_actor'),
  (select value from ddr_be003 where key='claim'),
  array[
    (select value from ddr_be003 where key='verification')
  ],
  'ACCEPT_FOR_CONTEXT',
  'Aceito a Claim somente para o contexto desta execução local e da Verification atribuída.',
  'A Decision não afirma utilidade externa, adoção, verdade universal ou capacidade geral da IA.',
  'd6000000-0000-4000-8000-000000000032',
  'ddr-be003-domain-decision'
);

update ddr_be003
set value=(result->>'decision_id')::uuid
where key='decision';


insert into ddr_be003(key,result)
select 'outcome',public.t2d_record_outcome(
  (select value from ddr_be003 where key='steward_actor'),
  (select value from ddr_be003 where key='decision'),
  'INCONCLUSIVE',
  'A consequência no mundo real permanece inconclusiva porque DDR-BE-003 é um teste backend automatizado.',
  null,
  'Nenhuma utilidade externa, recorrência, adoção, PMF ou escala foi observada.',
  'd6000000-0000-4000-8000-000000000033',
  'ddr-be003-outcome'
);

update ddr_be003
set value=(result->>'outcome_id')::uuid
where key='outcome';


-- CENTRAL ARCHITECTURAL TEST:
-- Can the whole evidence/decision chain be reconstructed starting only from
-- the existing CycleBinding -> AGENT_EXECUTION anchor?
select is(
  (
    select count(*)::integer
    from public.cycle_bindings cb
    join public.agent_task_executions ex
      on cb.object_type='AGENT_EXECUTION'
     and cb.object_id=ex.id
     and cb.relation_type='RESULT_OF'

    join public.agent_execution_artifact_links eal
      on eal.execution_id=ex.id
     and eal.relation='NORMALIZED_RESULT'

    join public.artifacts a
      on a.id=eal.artifact_id

    join public.claims c
      on c.subject_type='ARTIFACT'
     and c.subject_id=a.id

    join public.evidence_links el
      on el.claim_id=c.id

    join public.evidence_items ei
      on ei.id=el.evidence_item_id

    join public.verification_evidence_items vei
      on vei.evidence_item_id=ei.id

    join public.verifications v
      on v.id=vei.verification_id
     and v.claim_id=c.id

    join public.domain_decision_verifications ddv
      on ddv.verification_id=v.id

    join public.domain_decisions dd
      on dd.id=ddv.decision_id
     and dd.claim_id=c.id

    join public.outcomes o
      on o.decision_id=dd.id

    where cb.cycle_id=(
      select value from ddr_be003 where key='cycle'
    )
      and ex.id=(
        select value from ddr_be003 where key='execution'
      )
      and a.id=(
        select value from ddr_be003 where key='result_artifact'
      )
      and c.id=(
        select value from ddr_be003 where key='claim'
      )
      and ei.id=(
        select value from ddr_be003 where key='evidence'
      )
      and v.id=(
        select value from ddr_be003 where key='verification'
      )
      and dd.id=(
        select value from ddr_be003 where key='decision'
      )
      and o.id=(
        select value from ddr_be003 where key='outcome'
      )
  ),
  1,
  'Cycle -> Execution anchor reconstructs Artifact -> Claim -> Evidence -> Verification -> Decision -> Outcome without new DDR semantic tables'
);


select is(
  (
    select concat_ws(
      '|',
      v.classification,
      dd.disposition,
      o.classification
    )
    from public.verifications v
    join public.domain_decision_verifications ddv
      on ddv.verification_id=v.id
    join public.domain_decisions dd
      on dd.id=ddv.decision_id
    join public.outcomes o
      on o.decision_id=dd.id
    where v.id=(
      select value from ddr_be003 where key='verification'
    )
  ),
  'PASS|ACCEPT_FOR_CONTEXT|INCONCLUSIVE',
  'PASS verification remains distinct from contextual Decision and inconclusive real-world Outcome'
);


select is(
  public.t3_reconcile_agent_evidence_path(
    (select value from ddr_be003 where key='execution')
  ),
  '{}'::text[],
  'canonical T3 execution-to-evidence path reconciles'
);


select public.ddr_transition_cycle_phase(
  (select value from ddr_be003 where key='steward_actor'),
  (select value from ddr_be003 where key='cycle'),
  'CELEBRATING',
  'A execução, evidência, Verification e Decision foram preservadas; agora integramos limites e aprendizagem.',
  'd6000000-0000-4000-8000-000000000034',
  'ddr-be003-to-celebrating'
);


insert into ddr_be003(key,result)
select 'celebration',public.ddr_record_cycle_record(
  (select value from ddr_be003 where key='steward_actor'),
  (select value from ddr_be003 where key='cycle'),
  'SYNTHESIS',
  'O backend demonstrou uma cadeia reconstruível até Verification e Decision; o Outcome real permanece INCONCLUSIVE.',
  '{}'::jsonb,
  'd6000000-0000-4000-8000-000000000035',
  'ddr-be003-celebration'
);

update ddr_be003
set value=(result->>'cycle_record_id')::uuid
where key='celebration';


insert into ddr_be003(key,result)
select 'new_dream',public.ddr_record_cycle_record(
  (select value from ddr_be003 where key='steward_actor'),
  (select value from ddr_be003 where key='cycle'),
  'ORIGINAL_RECORD',
  'Novo sonho: substituir a IA simulada por uma intervenção de IA real, mantendo exatamente as mesmas fronteiras de autoria, autoridade e evidência.',
  '{}'::jsonb,
  'd6000000-0000-4000-8000-000000000036',
  'ddr-be003-new-dream'
);

update ddr_be003
set value=(result->>'cycle_record_id')::uuid
where key='new_dream';


insert into ddr_be003(key,result)
select 'child',public.ddr_open_child_cycle(
  (select value from ddr_be003 where key='steward_actor'),
  (select value from ddr_be003 where key='cycle'),
  (select value from ddr_be003 where key='new_dream'),
  'd6000000-0000-4000-8000-000000000037',
  'ddr-be003-child'
);

update ddr_be003
set value=(result->>'dragon_cycle_id')::uuid
where key='child';


select public.ddr_close_cycle(
  (select value from ddr_be003 where key='steward_actor'),
  (select value from ddr_be003 where key='cycle'),
  'A cadeia backend foi concluída localmente e o próximo Dream permanece separado e aberto.',
  'd6000000-0000-4000-8000-000000000038',
  'ddr-be003-close-parent'
);


select is(
  (
    select concat_ws(
      '|',
      p.state,
      c.state,
      c.current_phase
    )
    from public.dragon_cycles p
    join public.dragon_cycles c
      on c.parent_cycle_id=p.id
    where p.id=(
      select value from ddr_be003 where key='cycle'
    )
      and c.id=(
        select value from ddr_be003 where key='child'
      )
  ),
  'CLOSED|OPEN|DREAMING',
  'closed evidence-bearing parent preserves the next Dream as a distinct open child cycle'
);


-- If this test passes, the architecture learned something:
-- Artifact / Claim / Evidence / Verification / Decision do NOT need
-- new CycleBinding types merely to be reconstructible from a cycle.
select is(
  (
    select array_agg(distinct object_type order by object_type)
    from public.cycle_bindings
    where cycle_id=(
      select value from ddr_be003 where key='cycle'
    )
  ),
  array['AGENT_EXECUTION','AGENT_TASK','NEED']::text[],
  'full T2 path remains reconstructible while CycleBinding stays minimal'
);


select * from finish();

rollback;

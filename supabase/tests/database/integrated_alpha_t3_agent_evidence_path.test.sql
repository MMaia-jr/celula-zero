begin;

create extension if not exists pgtap with schema extensions;
select no_plan();

select has_table(
  'public',
  'agent_execution_artifact_links',
  'T3 Block3 has exact Execution↔Artifact links'
);
select has_function(
  'public',
  't3_authorize_agent_opportunity_participation',
  array['uuid','uuid','uuid','timestamp with time zone','uuid','text'],
  'bounded Agent Opportunity participation command exists'
);
select has_function(
  'public',
  't3_link_agent_execution_artifact',
  array['uuid','uuid','uuid','text','uuid','text'],
  'digest-bound Execution↔Artifact link command exists'
);
select has_function(
  'public',
  't3_reconcile_agent_evidence_path',
  array['uuid'],
  'Agent execution to T2 evidence path reconciler exists'
);

insert into auth.users(
  id,aud,role,email,raw_app_meta_data,raw_user_meta_data,created_at,updated_at
) values (
  'aa000000-0000-4000-8000-000000000001',
  'authenticated','authenticated','t3-b3-steward@example.test',
  '{"provider":"email","providers":["email"]}',
  '{"name":"T3 B3 Steward"}',now(),now()
);

insert into public.pilot_memberships(profile_id,status,source)
values ('aa000000-0000-4000-8000-000000000001','ACTIVE','SEED')
on conflict (profile_id) do update set status='ACTIVE';

create temporary table t3b3(
  key text primary key,
  value uuid,
  result jsonb,
  text_value text
);

insert into t3b3(key,value)
select 'steward_actor', actor_id
from public.actor_memberships
where profile_id='aa000000-0000-4000-8000-000000000001'
  and role='OWNER';

select set_config(
  'request.jwt.claim.sub',
  'aa000000-0000-4000-8000-000000000001',
  true
);

insert into t3b3(key,result)
select 'project',to_jsonb(x)
from public.create_project_atomic(
  'Projeto T3 Evidence Path',
  'projeto-t3-evidence-path',
  'Projeto determinístico para testar Agent execution até Claim, Evidence e pedido de revisão humana.',
  'O SoftwareAgent executa sob autoridade limitada e seu resultado entra na trilha T2 sem ganhar legitimidade.',
  'Preservar Execution, Contribution, Artifact, Claim, Evidence, Verification Request e Decision como estados distintos.',
  'Um episódio reconstruível até o gate de revisão humana.',
  'Sem rede externa, deploy, contato externo, serviço pago ou decisão automática.',
  array['software-agent','claim-evidence','human-review'],
  'VOLUNTARY','OPEN',true
) x;
update t3b3 set value=(result->>'project_id')::uuid where key='project';

insert into t3b3(key,result)
select 'agent',public.t3_register_bounded_agent(
  (select value from t3b3 where key='steward_actor'),
  (select value from t3b3 where key='project'),
  'CZ-Agent-B3-Test',
  'T3 Block3 deterministic operator',
  'ba000000-0000-4000-8000-000000000001',
  't3-b3-agent-register'
);
update t3b3 set value=(result->>'agent_actor_id')::uuid where key='agent';

insert into t3b3(key,result)
select 'opportunity',public.b1_create_opportunity(
  (select value from t3b3 where key='steward_actor'),
  (select value from t3b3 where key='project'),
  'Inspect Decision to Outcome boundary',
  'Inspect the bounded T2 implementation and determine whether issuing a Decision itself creates an Outcome automatically.',
  'Use only authorized repository material and preserve limitations.',
  'Attributed bounded inspection result with explicit evidence.',
  1,
  'ba000000-0000-4000-8000-000000000002',
  't3-b3-opportunity-create'
);
update t3b3 set value=(result->>'opportunity_id')::uuid where key='opportunity';

select lives_ok(
  $$
    select public.b1_publish_opportunity(
      (select value from t3b3 where key='steward_actor'),
      (select value from t3b3 where key='opportunity'),
      1,
      'ba000000-0000-4000-8000-000000000003',
      't3-b3-opportunity-publish'
    )
  $$,
  'Steward publishes the exact Opportunity'
);

insert into t3b3(key,result)
select 'participation',public.t3_authorize_agent_opportunity_participation(
  (select value from t3b3 where key='steward_actor'),
  (select value from t3b3 where key='agent'),
  (select value from t3b3 where key='opportunity'),
  now() + interval '2 hours',
  'ba000000-0000-4000-8000-000000000004',
  't3-b3-agent-opportunity-participation'
);

select is(
  (select result->>'scope_type' from t3b3 where key='participation'),
  'OPPORTUNITY',
  'Agent participation is exact Opportunity scope'
);

select is(
  (
    select count(*)::integer
    from public.role_assignments
    where actor_id=(select value from t3b3 where key='agent')
      and scope_type='PROJECT'
      and scope_id=(select value from t3b3 where key='project')
      and revoked_at is null
  ),
  0,
  'Agent receives no Project-scoped role assignment'
);

select ok(
  private.b1_has_capability(
    (select value from t3b3 where key='agent'),
    'proposal.submit',
    'OPPORTUNITY',
    (select value from t3b3 where key='opportunity')
  ),
  'Opportunity-scoped AGENT_OPERATOR permits proposal.submit'
);

select ok(
  not private.b1_has_capability(
    (select value from t3b3 where key='agent'),
    'artifact.attach',
    'PROJECT',
    (select value from t3b3 where key='project')
  ),
  'Opportunity role does not leak artifact.attach to Project scope'
);

insert into t3b3(key,result)
select 'proposal',public.b1_submit_proposal(
  (select value from t3b3 where key='agent'),
  (select value from t3b3 where key='opportunity'),
  'I will inspect the explicitly bounded Decision to Outcome implementation as a SoftwareAgent.',
  'No network; exact authorized files; result remains contestable and unverified.',
  'A structured local inspection result with bounded evidence citations.',
  'No economic right; local voluntary test.',
  'ba000000-0000-4000-8000-000000000005',
  't3-b3-proposal-submit'
);
update t3b3 set value=(result->>'proposal_id')::uuid where key='proposal';

insert into t3b3(key,result)
select 'commitment',public.t2b_accept_proposal_for_claim_evidence(
  (select value from t3b3 where key='steward_actor'),
  (select value from t3b3 where key='proposal'),
  (select current_version from public.opportunities where id=(select value from t3b3 where key='opportunity')),
  (select current_version from public.proposals where id=(select value from t3b3 where key='proposal')),
  (select material_version from public.opportunities where id=(select value from t3b3 where key='opportunity')),
  (select material_version from public.proposals where id=(select value from t3b3 where key='proposal')),
  'Accept bounded Agent work for this local T3 episode.',
  'ba000000-0000-4000-8000-000000000006',
  't3-b3-proposal-accept'
);
update t3b3 set value=(result->>'commitment_id')::uuid where key='commitment';

select ok(
  private.b1_has_capability(
    (select value from t3b3 where key='agent'),
    'artifact.attach',
    'PROJECT',
    (select value from t3b3 where key='project')
  ),
  'accepted Commitment grants exact Project work authority'
);
select ok(
  private.b1_has_capability(
    (select value from t3b3 where key='agent'),
    'claim.record',
    'PROJECT',
    (select value from t3b3 where key='project')
  ),
  'accepted Commitment grants exact Project Claim authority'
);

insert into t3b3(key,result)
select 'task',public.t3_authorize_agent_task(
  (select value from t3b3 where key='steward_actor'),
  (select value from t3b3 where key='project'),
  (select value from t3b3 where key='agent'),
  'Inspect the bounded Decision to Outcome implementation and determine whether issuing a Decision itself creates an Outcome automatically.',
  array[
    'supabase/migrations/20260825235000_integrated_alpha_t2_decision_outcome_history.sql',
    'apps/web/lib/data/decisions.ts'
  ]::text[],
  now() + interval '2 hours',
  'ba000000-0000-4000-8000-000000000007',
  't3-b3-agent-execute-delegation',
  'ba000000-0000-4000-8000-000000000008',
  't3-b3-agent-task'
);
update t3b3 set value=(result->>'agent_task_id')::uuid where key='task';

insert into t3b3(key,text_value) values
  ('input_text','bounded deterministic input material for T3 Block3'),
  ('result_text','bounded deterministic normalized SoftwareAgent result for T3 Block3');

insert into t3b3(key,result)
select 'execution',public.t3_start_agent_execution(
  (select value from t3b3 where key='agent'),
  (select value from t3b3 where key='task'),
  'OLLAMA_LOCAL',
  'fixture-model',
  encode(
    extensions.digest(
      convert_to((select text_value from t3b3 where key='input_text'),'UTF8'),
      'sha256'
    ),
    'hex'
  ),
  'ba000000-0000-4000-8000-000000000009',
  't3-b3-execution-start'
);
update t3b3 set value=(result->>'execution_id')::uuid where key='execution';

select lives_ok(
  $$
    select public.t3_complete_agent_execution(
      (select value from t3b3 where key='agent'),
      (select value from t3b3 where key='execution'),
      'NO_AUTOMATIC_PATH_FOUND',
      'The bounded fixture found no automatic Decision to Outcome creation path.',
      'Fixture output validates materialization semantics only.',
      encode(
        extensions.digest(
          convert_to((select text_value from t3b3 where key='result_text'),'UTF8'),
          'sha256'
        ),
        'hex'
      ),
      octet_length(convert_to((select text_value from t3b3 where key='result_text'),'UTF8')),
      'ba000000-0000-4000-8000-000000000010',
      't3-b3-execution-complete'
    )
  $$,
  'deterministic execution completes'
);

insert into t3b3(key,result)
select 'contribution',public.b2a_submit_contribution(
  (select value from t3b3 where key='agent'),
  (select value from t3b3 where key='commitment'),
  'SoftwareAgent bounded Decision to Outcome inspection result.',
  'Deterministic fixture; not a human Verification or Decision.',
  null,
  'ba000000-0000-4000-8000-000000000011',
  't3-b3-contribution'
);
update t3b3 set value=(result->>'contribution_id')::uuid where key='contribution';

insert into t3b3(key,result)
select 'input_artifact',public.t2a_attach_text_artifact(
  (select value from t3b3 where key='agent'),
  (select value from t3b3 where key='contribution'),
  (select text_value from t3b3 where key='input_text'),
  'ba000000-0000-4000-8000-000000000012',
  't3-b3-input-artifact'
);
update t3b3 set value=(result->>'artifact_id')::uuid where key='input_artifact';

insert into t3b3(key,result)
select 'result_artifact',public.t2a_attach_text_artifact(
  (select value from t3b3 where key='agent'),
  (select value from t3b3 where key='contribution'),
  (select text_value from t3b3 where key='result_text'),
  'ba000000-0000-4000-8000-000000000013',
  't3-b3-result-artifact'
);
update t3b3 set value=(result->>'artifact_id')::uuid where key='result_artifact';

select lives_ok(
  $$
    select public.t3_link_agent_execution_artifact(
      (select value from t3b3 where key='agent'),
      (select value from t3b3 where key='execution'),
      (select value from t3b3 where key='input_artifact'),
      'INPUT_MATERIAL',
      'ba000000-0000-4000-8000-000000000014',
      't3-b3-link-input'
    )
  $$,
  'input Artifact is digest-bound to execution input'
);

select lives_ok(
  $$
    select public.t3_link_agent_execution_artifact(
      (select value from t3b3 where key='agent'),
      (select value from t3b3 where key='execution'),
      (select value from t3b3 where key='result_artifact'),
      'NORMALIZED_RESULT',
      'ba000000-0000-4000-8000-000000000015',
      't3-b3-link-result'
    )
  $$,
  'normalized Result Artifact is digest-bound to execution output'
);

insert into t3b3(key,result)
select 'claim',public.b2b1_record_claim(
  (select value from t3b3 where key='agent'),
  'ARTIFACT',
  (select value from t3b3 where key='result_artifact'),
  'Issuing a substantive domain Decision does not automatically create an Outcome in the bounded inspected material.',
  'Bounded local T3 fixture scope only.',
  null,
  'ba000000-0000-4000-8000-000000000016',
  't3-b3-claim'
);
update t3b3 set value=(result->>'claim_id')::uuid where key='claim';

insert into t3b3(key,result)
select 'evidence',public.b2b1_register_evidence(
  (select value from t3b3 where key='agent'),
  (select value from t3b3 where key='claim'),
  (select value from t3b3 where key='input_artifact'),
  'SUPPORTS',
  'The exact bounded input material inspected by the SoftwareAgent.',
  'Fixture material validates the T3 evidence path, not the substantive code claim.',
  null,
  'ba000000-0000-4000-8000-000000000017',
  't3-b3-evidence'
);
update t3b3 set value=(result->>'evidence_item_id')::uuid where key='evidence';

insert into t3b3(key,result)
select 'review_request',public.b2b2_request_verification(
  (select value from t3b3 where key='steward_actor'),
  (select value from t3b3 where key='claim'),
  (select value from t3b3 where key='steward_actor'),
  'Assess whether the bounded evidence supports the Agent claim while preserving limitations.',
  'HUMAN_BOUNDED_CODE_REVIEW',
  now() + interval '1 day',
  'ba000000-0000-4000-8000-000000000018',
  't3-b3-review-request'
);
update t3b3 set value=(result->>'verification_request_id')::uuid where key='review_request';

select is(
  (select independence from public.verification_requests
   where id=(select value from t3b3 where key='review_request')),
  'NON_INDEPENDENT',
  'same Steward review request is explicitly non-independent'
);

select ok(
  (select conflict_codes @> array['REVIEWER_IS_REQUESTER','REVIEWER_IS_PROJECT_STEWARD']::text[]
   from public.verification_requests
   where id=(select value from t3b3 where key='review_request')),
  'non-independent human review conflicts are explicit'
);

select is(
  public.t3_reconcile_agent_evidence_path(
    (select value from t3b3 where key='execution')
  ),
  '{}'::text[],
  'Execution → input/result Artifacts → Claim → Evidence → Verification Request reconciles'
);

select is(
  (select count(*)::integer from public.verifications
   where request_id=(select value from t3b3 where key='review_request')),
  0,
  'Block3 does not fabricate a human Verification'
);

select is(
  (select count(*)::integer from public.domain_decisions
   where claim_id=(select value from t3b3 where key='claim')),
  0,
  'Block3 does not fabricate a human domain Decision'
);

select * from finish();
rollback;

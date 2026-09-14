-- GENESIS-HUMAN-CANDIDATE-INTERPRETATION-CONTRACT-N1
-- Provider-independent pre-Project interpretation and Human-review contract.
-- A completed controlled execution may be mapped by the controlled worker only;
-- truth, identity, Claim, Evidence and Verification remain distinct.

create table public.preproject_interpretation_authorizations (
  id uuid primary key default gen_random_uuid(),
  subject_actor_id uuid not null references public.actors(id) on delete restrict,
  authorized_by_actor_id uuid not null references public.actors(id) on delete restrict,
  requested_ai_actor_id uuid references public.actors(id) on delete restrict,
  purpose text not null check (char_length(trim(purpose)) between 3 and 1000),
  selected_inputs jsonb not null check (jsonb_typeof(selected_inputs) = 'array'),
  provenance jsonb not null default '{}'::jsonb check (jsonb_typeof(provenance) = 'object'),
  visibility text not null default 'PRIVATE' check (visibility = 'PRIVATE'),
  authority_scope text not null default 'ONE_CANDIDATE_INTERPRETATION'
    check (authority_scope = 'ONE_CANDIDATE_INTERPRETATION'),
  created_at timestamptz not null default now(),
  check (subject_actor_id <> requested_ai_actor_id),
  check (authorized_by_actor_id <> requested_ai_actor_id)
);

create table public.preproject_candidate_interpretations (
  id uuid primary key default gen_random_uuid(),
  authorization_id uuid not null unique
    references public.preproject_interpretation_authorizations(id) on delete restrict,
  subject_actor_id uuid not null references public.actors(id) on delete restrict,
  actual_producer_actor_id uuid references public.actors(id) on delete restrict,
  claimed_ai_actor_id uuid references public.actors(id) on delete restrict,
  imported_by_actor_id uuid references public.actors(id) on delete restrict,
  execution_id uuid unique,
  content text not null check (octet_length(convert_to(content, 'UTF8')) between 1 and 65536),
  content_sha256 text not null check (content_sha256 ~ '^[0-9a-f]{64}$'),
  provenance jsonb not null default '{}'::jsonb check (jsonb_typeof(provenance) = 'object'),
  execution_class text not null check (execution_class in ('SYNTHETIC_TEST_OUTPUT','EXTERNAL_AI_OUTPUT_UNATTESTED','CZ_EXECUTED_AI_OUTPUT')),
  provider text,
  model text,
  started_at timestamptz,
  completed_at timestamptz not null default now(),
  input_tokens bigint check (input_tokens is null or input_tokens >= 0),
  output_tokens bigint check (output_tokens is null or output_tokens >= 0),
  total_tokens bigint check (total_tokens is null or total_tokens >= 0),
  cost_usd numeric(20,10) check (cost_usd is null or cost_usd >= 0),
  cost_status text not null default 'UNKNOWN' check (cost_status in ('KNOWN','UNKNOWN')),
  visibility text not null default 'PRIVATE' check (visibility = 'PRIVATE'),
  status text not null default 'CANDIDATE' check (status = 'CANDIDATE'),
  human_adoption_state text not null default 'NOT_HUMAN_ADOPTED'
    check (human_adoption_state = 'NOT_HUMAN_ADOPTED'),
  created_at timestamptz not null default now(),
  check (subject_actor_id <> actual_producer_actor_id),
  check (
    (execution_class='SYNTHETIC_TEST_OUTPUT' and actual_producer_actor_id is null and claimed_ai_actor_id is null and ((imported_by_actor_id is not null and execution_id is null) or (imported_by_actor_id is null and execution_id is not null)))
    or (execution_class='EXTERNAL_AI_OUTPUT_UNATTESTED' and actual_producer_actor_id is null and claimed_ai_actor_id is not null and imported_by_actor_id is not null and execution_id is null)
    or (execution_class='CZ_EXECUTED_AI_OUTPUT' and actual_producer_actor_id is not null and claimed_ai_actor_id is null and imported_by_actor_id is null and execution_id is not null)
  )
);

create table public.preproject_interpretation_reviews (
  id uuid primary key default gen_random_uuid(),
  candidate_id uuid not null references public.preproject_candidate_interpretations(id) on delete restrict,
  subject_actor_id uuid not null references public.actors(id) on delete restrict,
  reviewer_actor_id uuid not null references public.actors(id) on delete restrict,
  disposition text not null check (disposition in ('REJECT','CORRECT','PARTLY_REPRESENTATIVE','ADOPT')),
  human_statement text not null check (char_length(trim(human_statement)) between 1 and 65536),
  representation_text text,
  visibility text not null default 'PRIVATE' check (visibility='PRIVATE'),
  created_at timestamptz not null default now(),
  check ((disposition in ('CORRECT','PARTLY_REPRESENTATIVE') and representation_text is not null) or disposition in ('REJECT','ADOPT'))
);

create index preproject_interpretation_authorizations_subject_created
  on public.preproject_interpretation_authorizations(subject_actor_id, created_at, id);
create index preproject_candidate_interpretations_subject_created
  on public.preproject_candidate_interpretations(subject_actor_id, created_at, id);

create trigger preproject_interpretation_authorizations_append_only
before update or delete on public.preproject_interpretation_authorizations
for each row execute function private.prevent_append_only_mutation();
create trigger preproject_candidate_interpretations_append_only
before update or delete on public.preproject_candidate_interpretations
for each row execute function private.prevent_append_only_mutation();
create trigger preproject_interpretation_reviews_append_only before update or delete on public.preproject_interpretation_reviews for each row execute function private.prevent_append_only_mutation();

create or replace function private.validate_preproject_interpretation_inputs(
  p_subject_actor_id uuid,
  p_selected_inputs jsonb
)
returns void
language plpgsql
security definer
set search_path = public, private, pg_temp
as $$
declare
  v_input jsonb;
  v_count integer;
begin
  if jsonb_typeof(p_selected_inputs) <> 'array'
     or jsonb_array_length(p_selected_inputs) not between 1 and 32 then
    raise exception using errcode = '22023', message = 'CZ422:INVALID_PREPROJECT_INPUT_SELECTION';
  end if;
  if (select count(distinct value->>'record_id') from jsonb_array_elements(p_selected_inputs))
     <> jsonb_array_length(p_selected_inputs) then
    raise exception using errcode = '22023', message = 'CZ422:DUPLICATE_PREPROJECT_INPUT';
  end if;
  for v_input in select value from jsonb_array_elements(p_selected_inputs) loop
    select count(*) into v_count from jsonb_object_keys(v_input);
    if jsonb_typeof(v_input) <> 'object'
       or v_count <> 3
       or coalesce(v_input->>'record_id','') !~ '^[0-9a-f-]{36}$'
       or coalesce(v_input->>'record_class','') not in ('ORIGINAL_RECORD','SOURCE_MATERIAL')
       or coalesce(v_input->>'content_sha256','') !~ '^[0-9a-f]{64}$'
       or not exists (
         select 1 from public.preproject_records r
         where r.id = (v_input->>'record_id')::uuid
           and r.owner_actor_id = p_subject_actor_id
           and r.record_class = v_input->>'record_class'
           and r.content_sha256 = v_input->>'content_sha256'
           and r.visibility = 'PRIVATE'
       ) then
      raise exception using errcode = '22023', message = 'CZ422:PREPROJECT_INPUT_MISMATCH';
    end if;
  end loop;
end;
$$;

create or replace function public.authorize_preproject_interpretation(
  p_subject_actor_id uuid,
  p_authorizer_actor_id uuid,
  p_ai_actor_id uuid,
  p_purpose text,
  p_selected_inputs jsonb,
  p_provenance jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public, private, pg_temp
as $$
declare
  v_profile_id uuid := auth.uid();
  v_id uuid;
  v_created_at timestamptz;
begin
  if v_profile_id is null then
    raise exception using errcode = '42501', message = 'CZ401:AUTHENTICATION_REQUIRED';
  end if;
  if not exists (
    select 1 from public.actor_memberships am join public.actors a on a.id=am.actor_id
    where am.actor_id=p_subject_actor_id and am.profile_id=v_profile_id
      and am.role in ('OWNER','REPRESENTATIVE') and a.kind='PERSON'
  ) then
    raise exception using errcode = '42501', message = 'CZ403:CONTROLLED_PERSON_REQUIRED';
  end if;
  if not exists (
    select 1 from public.actor_memberships am join public.actors a on a.id=am.actor_id
    where am.actor_id=p_authorizer_actor_id and am.profile_id=v_profile_id
      and am.role='OWNER' and a.kind='PERSON'
  ) then
    raise exception using errcode = '42501', message = 'CZ403:CONTROLLED_HUMAN_AUTHORIZER_REQUIRED';
  end if;
  if p_ai_actor_id is not null and not exists (select 1 from public.actors where id=p_ai_actor_id and kind='AI_AGENT') then
    raise exception using errcode = '22023', message = 'CZ422:AI_AGENT_REQUIRED';
  end if;
  if char_length(trim(coalesce(p_purpose,''))) not between 3 and 1000 then
    raise exception using errcode = '22023', message = 'CZ422:INVALID_INTERPRETATION_PURPOSE';
  end if;
  if p_provenance is null or jsonb_typeof(p_provenance) <> 'object' then
    raise exception using errcode = '22023', message = 'CZ422:INVALID_PREPROJECT_PROVENANCE';
  end if;
  perform private.validate_preproject_interpretation_inputs(p_subject_actor_id,p_selected_inputs);
  insert into public.preproject_interpretation_authorizations(
    subject_actor_id,authorized_by_actor_id,requested_ai_actor_id,purpose,selected_inputs,provenance
  ) values (
    p_subject_actor_id,p_authorizer_actor_id,p_ai_actor_id,trim(p_purpose),p_selected_inputs,p_provenance
  ) returning id,created_at into v_id,v_created_at;
  return jsonb_build_object('ok',true,'authorization_id',v_id,'visibility','PRIVATE',
    'authority_scope','ONE_CANDIDATE_INTERPRETATION','created_at',v_created_at);
end;
$$;

create or replace function public.record_preproject_candidate_interpretation(
  p_subject_actor_id uuid,
  p_importer_actor_id uuid,
  p_ai_actor_id uuid,
  p_authorization_id uuid,
  p_content text,
  p_execution_class text,
  p_provider text,
  p_model text,
  p_provenance jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public, private, extensions, pg_temp
as $$
declare
  v_profile_id uuid := auth.uid();
  v_authorization public.preproject_interpretation_authorizations%rowtype;
  v_id uuid;
  v_digest text;
  v_created_at timestamptz;
begin
  if v_profile_id is null then
    raise exception using errcode = '42501', message = 'CZ401:AUTHENTICATION_REQUIRED';
  end if;
  if not exists (
    select 1 from public.actor_memberships am join public.actors a on a.id=am.actor_id
    where am.actor_id=p_subject_actor_id and am.profile_id=v_profile_id
      and am.role in ('OWNER','REPRESENTATIVE') and a.kind='PERSON'
  ) then
    raise exception using errcode = '42501', message = 'CZ403:CONTROLLED_PERSON_REQUIRED';
  end if;
  if not exists (
    select 1 from public.actor_memberships am join public.actors a on a.id=am.actor_id
    where am.actor_id=p_importer_actor_id and am.profile_id=v_profile_id and am.role='OWNER' and a.kind='PERSON'
  ) then raise exception using errcode='42501',message='CZ403:CONTROLLED_HUMAN_IMPORTER_REQUIRED'; end if;
  select * into v_authorization from public.preproject_interpretation_authorizations
  where id=p_authorization_id;
  if not found or v_authorization.subject_actor_id<>p_subject_actor_id
     or v_authorization.authorized_by_actor_id<>p_importer_actor_id
     or v_authorization.requested_ai_actor_id is distinct from p_ai_actor_id then
    raise exception using errcode = '42501', message = 'CZ403:INTERPRETATION_AUTHORIZATION_MISMATCH';
  end if;
  if p_ai_actor_id is not null and not exists (select 1 from public.actors where id=p_ai_actor_id and kind='AI_AGENT') then
    raise exception using errcode = '22023', message = 'CZ422:AI_AGENT_REQUIRED';
  end if;
  perform private.validate_preproject_interpretation_inputs(
    p_subject_actor_id,v_authorization.selected_inputs
  );
  if p_content is null or octet_length(convert_to(p_content,'UTF8')) not between 1 and 65536 then
    raise exception using errcode = '22023', message = 'CZ422:INVALID_CANDIDATE_INTERPRETATION';
  end if;
  if p_provenance is null or jsonb_typeof(p_provenance) <> 'object' then
    raise exception using errcode = '22023', message = 'CZ422:INVALID_PREPROJECT_PROVENANCE';
  end if;
  if p_execution_class not in ('SYNTHETIC_TEST_OUTPUT','EXTERNAL_AI_OUTPUT_UNATTESTED') then
    raise exception using errcode='42501',message='CZ403:CZ_EXECUTED_OUTPUT_REQUIRES_CONTROLLED_EXECUTOR';
  end if;
  if (p_execution_class='SYNTHETIC_TEST_OUTPUT' and p_ai_actor_id is not null)
     or (p_execution_class='EXTERNAL_AI_OUTPUT_UNATTESTED' and p_ai_actor_id is null) then
    raise exception using errcode='22023',message='CZ422:EXECUTION_ATTRIBUTION_MISMATCH';
  end if;
  v_digest:=encode(extensions.digest(convert_to(p_content,'UTF8'),'sha256'),'hex');
  begin
    insert into public.preproject_candidate_interpretations(
      authorization_id,subject_actor_id,actual_producer_actor_id,claimed_ai_actor_id,imported_by_actor_id,content,content_sha256,provenance,execution_class,provider,model
    ) values (
      p_authorization_id,p_subject_actor_id,null,case when p_execution_class='EXTERNAL_AI_OUTPUT_UNATTESTED' then p_ai_actor_id end,p_importer_actor_id,p_content,v_digest,p_provenance,p_execution_class,nullif(trim(p_provider),''),nullif(trim(p_model),'')
    ) returning id,created_at into v_id,v_created_at;
  exception when unique_violation then
    raise exception using errcode = 'P0001', message = 'CZ409:AUTHORIZATION_ALREADY_USED';
  end;
  return jsonb_build_object('ok',true,'candidate_id',v_id,'content_sha256',v_digest,
    'visibility','PRIVATE','status','CANDIDATE','human_adoption_state','NOT_HUMAN_ADOPTED',
    'created_at',v_created_at);
end;
$$;

create or replace function public.review_preproject_candidate_interpretation(p_subject_actor_id uuid,p_reviewer_actor_id uuid,p_candidate_id uuid,p_disposition text,p_human_statement text,p_representation_text text default null)
returns jsonb language plpgsql security definer set search_path=public,private,pg_temp as $$
declare v_profile uuid:=auth.uid(); v_id uuid;
begin
 if v_profile is null then raise exception using errcode='42501',message='CZ401:AUTHENTICATION_REQUIRED'; end if;
 if not exists(select 1 from public.actor_memberships am join public.actors a on a.id=am.actor_id where am.actor_id=p_subject_actor_id and am.profile_id=v_profile and am.role in ('OWNER','REPRESENTATIVE') and a.kind='PERSON') then raise exception using errcode='42501',message='CZ403:CONTROLLED_PERSON_REQUIRED'; end if;
 if not exists(select 1 from public.actor_memberships am join public.actors a on a.id=am.actor_id where am.actor_id=p_reviewer_actor_id and am.profile_id=v_profile and am.role='OWNER' and a.kind='PERSON') then raise exception using errcode='42501',message='CZ403:CONTROLLED_HUMAN_REVIEWER_REQUIRED'; end if;
 if not exists(select 1 from public.preproject_candidate_interpretations where id=p_candidate_id and subject_actor_id=p_subject_actor_id) then raise exception using errcode='42501',message='CZ403:CANDIDATE_SUBJECT_MISMATCH'; end if;
 if p_disposition not in ('REJECT','CORRECT','PARTLY_REPRESENTATIVE','ADOPT') or char_length(trim(coalesce(p_human_statement,'')))<1 then raise exception using errcode='22023',message='CZ422:INVALID_HUMAN_REVIEW'; end if;
 if p_disposition in ('CORRECT','PARTLY_REPRESENTATIVE') and char_length(trim(coalesce(p_representation_text,'')))<1 then raise exception using errcode='22023',message='CZ422:REPRESENTATION_TEXT_REQUIRED'; end if;
 insert into public.preproject_interpretation_reviews(candidate_id,subject_actor_id,reviewer_actor_id,disposition,human_statement,representation_text) values(p_candidate_id,p_subject_actor_id,p_reviewer_actor_id,p_disposition,p_human_statement,case when p_disposition in ('CORRECT','PARTLY_REPRESENTATIVE') then p_representation_text else null end) returning id into v_id;
 return jsonb_build_object('ok',true,'review_id',v_id,'disposition',p_disposition,'visibility','PRIVATE');
end $$;

alter table public.preproject_interpretation_authorizations enable row level security;
alter table public.preproject_candidate_interpretations enable row level security;
alter table public.preproject_interpretation_reviews enable row level security;
revoke all on public.preproject_interpretation_authorizations,
  public.preproject_candidate_interpretations,public.preproject_interpretation_reviews from public,anon,authenticated;
grant select on public.preproject_interpretation_authorizations,
  public.preproject_candidate_interpretations,public.preproject_interpretation_reviews to authenticated;

create policy preproject_interpretation_authorizations_owner_read
on public.preproject_interpretation_authorizations for select to authenticated using (
  exists(select 1 from public.actor_memberships am join public.actors a on a.id=am.actor_id
    where am.actor_id=subject_actor_id and am.profile_id=auth.uid()
      and am.role in ('OWNER','REPRESENTATIVE') and a.kind='PERSON')
);
create policy preproject_candidate_interpretations_owner_read
on public.preproject_candidate_interpretations for select to authenticated using (
  exists(select 1 from public.actor_memberships am join public.actors a on a.id=am.actor_id
    where am.actor_id=subject_actor_id and am.profile_id=auth.uid()
      and am.role in ('OWNER','REPRESENTATIVE') and a.kind='PERSON')
);
create policy preproject_interpretation_reviews_owner_read on public.preproject_interpretation_reviews for select to authenticated using (exists(select 1 from public.actor_memberships am join public.actors a on a.id=am.actor_id where am.actor_id=subject_actor_id and am.profile_id=auth.uid() and am.role in ('OWNER','REPRESENTATIVE') and a.kind='PERSON'));

revoke all on function private.validate_preproject_interpretation_inputs(uuid,jsonb) from public,anon,authenticated;
revoke all on function public.authorize_preproject_interpretation(uuid,uuid,uuid,text,jsonb,jsonb) from public,anon;
revoke all on function public.record_preproject_candidate_interpretation(uuid,uuid,uuid,uuid,text,text,text,text,jsonb) from public,anon;
revoke all on function public.review_preproject_candidate_interpretation(uuid,uuid,uuid,text,text,text) from public,anon;
grant execute on function public.authorize_preproject_interpretation(uuid,uuid,uuid,text,jsonb,jsonb) to authenticated;
grant execute on function public.record_preproject_candidate_interpretation(uuid,uuid,uuid,uuid,text,text,text,text,jsonb) to authenticated;
grant execute on function public.review_preproject_candidate_interpretation(uuid,uuid,uuid,text,text,text) to authenticated;

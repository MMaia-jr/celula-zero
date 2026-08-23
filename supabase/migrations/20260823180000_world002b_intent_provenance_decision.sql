-- WORLD-002B — intention provenance + human decision + operative projection.
-- Boundaries:
-- Original Record != Interpretation != Human Direction != Truth.
-- provenance != truth; acceptance != verification.
-- Need remains out of this slice.
-- projects.current_intent is compatibility/display cache only; WITHDRAW neutralizes it so withdrawn text is not publicly leaked through legacy readers.
-- projects.current_intent_record_id is the exact operative semantic pointer.

alter table public.project_intents
  add column recorded_by_actor_id uuid references public.actors(id) on delete restrict,
  add column content_origin_actor_id uuid references public.actors(id) on delete restrict,
  add column source_intent_id uuid references public.project_intents(id) on delete restrict,
  add column derivation_type text check (derivation_type in ('INTERPRETS','REVISION_OF')),
  add column provenance_status text not null default 'LEGACY_UNATTRIBUTED'
    check (provenance_status in ('LEGACY_UNATTRIBUTED','RECORDED_ORIGIN_UNSPECIFIED','ATTRIBUTED')),
  add column origin_mechanism text
    check (origin_mechanism in (
      'HUMAN_ORIGINAL_INPUT',
      'ACTOR_INTERPRETATION',
      'AI_AGENT_INTERPRETATION',
      'SYSTEM_DERIVED',
      'UNSPECIFIED_LEGACY_API'
    )),
  add constraint project_intent_source_not_self
    check (source_intent_id is null or source_intent_id <> id),
  add constraint project_intent_provenance_shape check (
    (
      provenance_status = 'LEGACY_UNATTRIBUTED'
      and recorded_by_actor_id is null
      and content_origin_actor_id is null
      and source_intent_id is null
      and derivation_type is null
      and origin_mechanism is null
    )
    or
    (
      provenance_status = 'RECORDED_ORIGIN_UNSPECIFIED'
      and recorded_by_actor_id is not null
      and content_origin_actor_id is null
      and kind = 'INTERPRETATION'
      and source_intent_id is not null
      and derivation_type = 'INTERPRETS'
      and origin_mechanism = 'UNSPECIFIED_LEGACY_API'
    )
    or
    (
      provenance_status = 'ATTRIBUTED'
      and recorded_by_actor_id is not null
      and content_origin_actor_id is not null
      and origin_mechanism is not null
      and (
        (
          kind = 'INTERPRETATION'
          and source_intent_id is not null
          and derivation_type = 'INTERPRETS'
          and origin_mechanism in ('ACTOR_INTERPRETATION','AI_AGENT_INTERPRETATION','SYSTEM_DERIVED')
        )
        or
        (
          kind = 'ORIGINAL'
          and (
            (
              source_intent_id is null
              and derivation_type is null
              and origin_mechanism = 'HUMAN_ORIGINAL_INPUT'
            )
            or
            (
              source_intent_id is not null
              and derivation_type = 'REVISION_OF'
              and origin_mechanism = 'HUMAN_ORIGINAL_INPUT'
            )
          )
        )
      )
    )
  );

drop index if exists public.project_one_original_intent;

alter table public.project_intents
  add constraint project_intents_project_id_id_unique unique(project_id, id);

alter table public.projects
  add column current_intent_record_id uuid;

alter table public.projects
  add constraint projects_current_intent_record_fk
  foreign key (id, current_intent_record_id)
  references public.project_intents(project_id, id)
  on delete restrict;

comment on column public.projects.current_intent is
  'Compatibility/display cache only. Use current_intent_record_id as operative semantic pointer.';
comment on column public.projects.current_intent_record_id is
  'Exact accepted project_intents record currently operative; null means none.';

-- Honest legacy bridge: link exact content when possible, but do not invent
-- producer provenance or new historical decisions.
update public.projects p
set current_intent_record_id = (
  select i.id
  from public.project_intents i
  where i.project_id = p.id and i.content = p.current_intent
  order by case when i.kind='INTERPRETATION' then 0 else 1 end,
           i.version desc, i.created_at desc, i.id
  limit 1
)
where p.current_intent_record_id is null
  and exists (
    select 1 from public.project_intents i
    where i.project_id=p.id and i.content=p.current_intent
  );

insert into public.capability_definitions(code, description) values
  ('intent.interpret','Record a non-operative interpretation derived from an exact intent record.'),
  ('intent.revise_original','Create an append-only ORIGINAL revision.'),
  ('intent.decide','Human-controlled accept, reject or withdraw decision for an exact intent record.')
on conflict (code) do nothing;

insert into public.role_capabilities(role_id, capability_code) values
  ('00000000-0000-4000-8000-00000000c201','intent.interpret'),
  ('00000000-0000-4000-8000-00000000c201','intent.revise_original'),
  ('00000000-0000-4000-8000-00000000c201','intent.decide'),
  ('00000000-0000-4000-8000-00000000c202','intent.interpret'),
  ('00000000-0000-4000-8000-00000000c202','intent.revise_original'),
  ('00000000-0000-4000-8000-00000000c202','intent.decide'),
  ('00000000-0000-4000-8000-00000000c204','intent.interpret'),
  ('00000000-0000-4000-8000-00000000c205','intent.interpret')
on conflict do nothing;

drop policy if exists project_intents_read_public_or_managed on public.project_intents;

create policy project_intents_read_operational_or_authorized
on public.project_intents
for select to anon, authenticated
using (
  (
    private.project_is_public(project_id)
    and exists (
      select 1 from public.projects p
      where p.id = project_intents.project_id
        and p.current_intent_record_id = project_intents.id
    )
  )
  or private.can_manage_project(project_id, auth.uid())
  or (
    recorded_by_actor_id is not null
    and private.b1_current_profile_controls_actor(recorded_by_actor_id)
  )
  or (
    content_origin_actor_id is not null
    and private.b1_current_profile_controls_actor(content_origin_actor_id)
  )
);

create or replace function private.world002b_origin_mechanism(p_origin_actor_id uuid)
returns text
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  v_kind text;
begin
  select kind into v_kind from public.actors where id=p_origin_actor_id;
  if v_kind is null then
    raise exception using errcode='P0001', message='CZ404:ORIGIN_ACTOR_NOT_FOUND';
  end if;
  if v_kind='AI_AGENT' then return 'AI_AGENT_INTERPRETATION'; end if;
  if v_kind='SYSTEM' then return 'SYSTEM_DERIVED'; end if;
  return 'ACTOR_INTERPRETATION';
end;
$$;

create or replace function public.world002b_record_interpretation(
  p_actor_id uuid,
  p_project_id uuid,
  p_source_intent_id uuid,
  p_content text,
  p_content_origin_actor_id uuid,
  p_command_id uuid,
  p_idempotency_key text
)
returns jsonb
language plpgsql
security definer
set search_path = public, private, pg_temp
as $$
declare
  v_project public.projects%rowtype;
  v_source public.project_intents%rowtype;
  v_origin_kind text;
  v_mechanism text;
  v_version integer;
  v_intent_id uuid;
  v_replayed boolean;
  v_result jsonb;
  v_payload jsonb;
begin
  select * into v_project from public.projects where id=p_project_id;
  if not found then
    raise exception using errcode='P0001', message='CZ404:PROJECT_NOT_FOUND';
  end if;

  select * into v_source from public.project_intents where id=p_source_intent_id;
  if not found or v_source.project_id<>p_project_id then
    raise exception using errcode='P0001', message='CZ404:SOURCE_INTENT_NOT_FOUND';
  end if;

  perform private.b1_authorize_actor(p_actor_id,'intent.interpret','PROJECT',p_project_id);

  if p_content_origin_actor_id is null then
    raise exception using errcode='P0001', message='CZ422:CONTENT_ORIGIN_ACTOR_REQUIRED';
  end if;

  if not private.b1_profile_controls_actor(p_content_origin_actor_id,auth.uid()) then
    raise exception using errcode='42501', message='CZ403:ORIGIN_ACTOR_CONTROL_REQUIRED';
  end if;

  if not (
    p_content_origin_actor_id=v_project.steward_actor_id
    or exists (
      select 1 from public.project_members pm
      where pm.project_id=p_project_id and pm.actor_id=p_content_origin_actor_id
    )
  ) then
    raise exception using errcode='P0001', message='CZ409:ORIGIN_ACTOR_NOT_IN_PROJECT';
  end if;

  select kind into v_origin_kind from public.actors where id=p_content_origin_actor_id;
  v_mechanism := private.world002b_origin_mechanism(p_content_origin_actor_id);

  v_payload := jsonb_build_object(
    'project_id',p_project_id,
    'source_intent_id',p_source_intent_id,
    'content_origin_actor_id',p_content_origin_actor_id,
    'origin_actor_kind',v_origin_kind,
    'content_sha256',private.b1_payload_hash(to_jsonb(p_content))
  );

  select replayed,saved_result into v_replayed,v_result
  from private.b1_begin_command(
    v_project.cell_id,p_actor_id,p_command_id,p_idempotency_key,'intent.interpret',v_payload
  );
  if v_replayed then return v_result; end if;

  select coalesce(max(version),0)+1 into v_version
  from public.project_intents
  where project_id=p_project_id and kind='INTERPRETATION';

  insert into public.project_intents(
    project_id,kind,content,version,accepted_at,accepted_by_profile_id,
    recorded_by_actor_id,content_origin_actor_id,source_intent_id,
    derivation_type,provenance_status,origin_mechanism
  ) values (
    p_project_id,'INTERPRETATION',p_content,v_version,null,null,
    p_actor_id,p_content_origin_actor_id,p_source_intent_id,
    'INTERPRETS','ATTRIBUTED',v_mechanism
  ) returning id into v_intent_id;

  perform private.b1_record_event(
    v_project.cell_id,'INTENT_INTERPRETATION_RECORDED',
    'PROJECT',p_project_id,'PROJECT_INTENT',v_intent_id,
    p_actor_id,'intent.interpret','PROJECT',p_project_id,p_command_id,
    v_project.version,v_project.version,'PROJECT',
    jsonb_build_object(
      'intent_id',v_intent_id,
      'source_intent_id',p_source_intent_id,
      'content_origin_actor_id',p_content_origin_actor_id,
      'origin_actor_kind',v_origin_kind,
      'operative',false,
      'provenance_is_truth',false
    )
  );

  v_result := jsonb_build_object(
    'ok',true,'intent_id',v_intent_id,'project_id',p_project_id,
    'kind','INTERPRETATION','version',v_version,
    'source_intent_id',p_source_intent_id,
    'recorded_by_actor_id',p_actor_id,
    'content_origin_actor_id',p_content_origin_actor_id,
    'origin_mechanism',v_mechanism,
    'operative',false,'provenance_is_truth',false
  );
  perform private.b1_finish_command(p_actor_id,p_idempotency_key,v_result);
  return v_result;
end;
$$;

create or replace function public.world002b_revise_original(
  p_actor_id uuid,
  p_project_id uuid,
  p_source_original_intent_id uuid,
  p_content text,
  p_command_id uuid,
  p_idempotency_key text
)
returns jsonb
language plpgsql
security definer
set search_path = public, private, pg_temp
as $$
declare
  v_project public.projects%rowtype;
  v_source public.project_intents%rowtype;
  v_actor_kind text;
  v_version integer;
  v_intent_id uuid;
  v_replayed boolean;
  v_result jsonb;
  v_payload jsonb;
begin
  select * into v_project from public.projects where id=p_project_id;
  if not found then
    raise exception using errcode='P0001', message='CZ404:PROJECT_NOT_FOUND';
  end if;

  select * into v_source from public.project_intents where id=p_source_original_intent_id;
  if not found or v_source.project_id<>p_project_id or v_source.kind<>'ORIGINAL' then
    raise exception using errcode='P0001', message='CZ404:SOURCE_ORIGINAL_INTENT_NOT_FOUND';
  end if;

  perform private.b1_authorize_actor(p_actor_id,'intent.revise_original','PROJECT',p_project_id);
  select kind into v_actor_kind from public.actors where id=p_actor_id;
  if v_actor_kind in ('AI_AGENT','SYSTEM') then
    raise exception using errcode='42501', message='CZ403:HUMAN_DIRECTION_REQUIRED';
  end if;

  v_payload := jsonb_build_object(
    'project_id',p_project_id,
    'source_original_intent_id',p_source_original_intent_id,
    'content_sha256',private.b1_payload_hash(to_jsonb(p_content))
  );

  select replayed,saved_result into v_replayed,v_result
  from private.b1_begin_command(
    v_project.cell_id,p_actor_id,p_command_id,p_idempotency_key,'intent.revise_original',v_payload
  );
  if v_replayed then return v_result; end if;

  select coalesce(max(version),0)+1 into v_version
  from public.project_intents
  where project_id=p_project_id and kind='ORIGINAL';

  insert into public.project_intents(
    project_id,kind,content,version,accepted_at,accepted_by_profile_id,
    recorded_by_actor_id,content_origin_actor_id,source_intent_id,
    derivation_type,provenance_status,origin_mechanism
  ) values (
    p_project_id,'ORIGINAL',p_content,v_version,null,null,
    p_actor_id,p_actor_id,p_source_original_intent_id,
    'REVISION_OF','ATTRIBUTED','HUMAN_ORIGINAL_INPUT'
  ) returning id into v_intent_id;

  perform private.b1_record_event(
    v_project.cell_id,'ORIGINAL_INTENT_REVISED',
    'PROJECT',p_project_id,'PROJECT_INTENT',v_intent_id,
    p_actor_id,'intent.revise_original','PROJECT',p_project_id,p_command_id,
    v_project.version,v_project.version,'PROJECT',
    jsonb_build_object('intent_id',v_intent_id,'revision_of_intent_id',p_source_original_intent_id,'operative',false)
  );

  v_result := jsonb_build_object(
    'ok',true,'intent_id',v_intent_id,'project_id',p_project_id,
    'kind','ORIGINAL','version',v_version,
    'revision_of_intent_id',p_source_original_intent_id,'operative',false
  );
  perform private.b1_finish_command(p_actor_id,p_idempotency_key,v_result);
  return v_result;
end;
$$;

create or replace function public.world002b_decide_intent(
  p_actor_id uuid,
  p_project_id uuid,
  p_intent_id uuid,
  p_decision text,
  p_command_id uuid,
  p_idempotency_key text
)
returns jsonb
language plpgsql
security definer
set search_path = public, private, pg_temp
as $$
declare
  v_project public.projects%rowtype;
  v_intent public.project_intents%rowtype;
  v_actor_kind text;
  v_replayed boolean;
  v_result jsonb;
  v_payload jsonb;
  v_before integer;
  v_after integer;
  v_previous uuid;
  v_decision_type text;
begin
  if p_decision not in ('ACCEPT','REJECT','WITHDRAW') then
    raise exception using errcode='P0001', message='CZ422:INVALID_INTENT_DECISION';
  end if;

  select * into v_project from public.projects where id=p_project_id;
  if not found then
    raise exception using errcode='P0001', message='CZ404:PROJECT_NOT_FOUND';
  end if;
  select * into v_intent from public.project_intents where id=p_intent_id;
  if not found or v_intent.project_id<>p_project_id then
    raise exception using errcode='P0001', message='CZ404:PROJECT_INTENT_NOT_FOUND';
  end if;

  perform private.b1_authorize_actor(p_actor_id,'intent.decide','PROJECT',p_project_id);

  select kind into v_actor_kind from public.actors where id=p_actor_id;
  if v_actor_kind in ('AI_AGENT','SYSTEM') then
    raise exception using errcode='42501', message='CZ403:HUMAN_DIRECTION_REQUIRED';
  end if;

  v_payload := jsonb_build_object('project_id',p_project_id,'intent_id',p_intent_id,'decision',p_decision);
  select replayed,saved_result into v_replayed,v_result
  from private.b1_begin_command(
    v_project.cell_id,p_actor_id,p_command_id,p_idempotency_key,'intent.decide',v_payload
  );
  if v_replayed then return v_result; end if;

  select * into v_project from public.projects where id=p_project_id for update;
  v_before := v_project.version;
  v_after := v_project.version;
  v_previous := v_project.current_intent_record_id;

  if p_decision='ACCEPT' then
    v_decision_type := 'INTENT_ACCEPT';

    perform private.b1_record_decision(
      v_project.cell_id,v_decision_type,'ALLOW','PROJECT_INTENT',p_intent_id,
      p_actor_id,'intent.decide','PROJECT',p_project_id,
      'human direction accepted an exact project intent record',
      p_command_id,null,null,
      jsonb_build_object(
        'project_id',p_project_id,
        'replaces_intent_id',v_previous,
        'acceptance_is_truth',false,
        'acceptance_is_verification',false
      )
    );

    update public.projects
    set current_intent_record_id=p_intent_id,
        current_intent=v_intent.content,
        version=version+1,
        updated_at=now()
    where id=p_project_id
    returning version into v_after;

    insert into public.events(
      project_id,event_type,title,description,actor_id,
      authorized_by_profile_id,material_version,payload
    ) values (
      p_project_id,'PROJECT_UPDATED','Intenção operativa alterada',
      'A projeção agora aponta para um registro de intenção aceito explicitamente.',
      p_actor_id,auth.uid(),v_after,
      jsonb_build_object('intent_id',p_intent_id,'decision','ACCEPT','replaces_intent_id',v_previous)
    );

  elsif p_decision='REJECT' then
    if v_project.current_intent_record_id=p_intent_id then
      raise exception using errcode='P0001', message='CZ409:CURRENT_INTENT_REQUIRES_WITHDRAW';
    end if;
    v_decision_type := 'INTENT_REJECT';
    perform private.b1_record_decision(
      v_project.cell_id,v_decision_type,'ALLOW','PROJECT_INTENT',p_intent_id,
      p_actor_id,'intent.decide','PROJECT',p_project_id,
      'human direction rejected a non-operative project intent record',
      p_command_id,null,null,
      jsonb_build_object('project_id',p_project_id,'acceptance_is_truth',false)
    );

  else
    if v_project.current_intent_record_id is distinct from p_intent_id then
      raise exception using errcode='P0001', message='CZ409:ONLY_CURRENT_INTENT_CAN_BE_WITHDRAWN';
    end if;
    v_decision_type := 'INTENT_WITHDRAW';
    perform private.b1_record_decision(
      v_project.cell_id,v_decision_type,'ALLOW','PROJECT_INTENT',p_intent_id,
      p_actor_id,'intent.decide','PROJECT',p_project_id,
      'human direction withdrew the current operative project intent',
      p_command_id,null,null,
      jsonb_build_object(
        'project_id',p_project_id,
        'legacy_cache_neutralized',true,
        'historical_record_preserved',true
      )
    );

    update public.projects
    set current_intent_record_id=null,
        current_intent='Nenhuma intenção operativa está atualmente selecionada.',
        version=version+1,
        updated_at=now()
    where id=p_project_id
    returning version into v_after;

    insert into public.events(
      project_id,event_type,title,description,actor_id,
      authorized_by_profile_id,material_version,payload
    ) values (
      p_project_id,'PROJECT_UPDATED','Intenção operativa retirada',
      'Nenhum registro de intenção está atualmente operativo para o projeto.',
      p_actor_id,auth.uid(),v_after,
      jsonb_build_object(
        'intent_id',p_intent_id,
        'decision','WITHDRAW',
        'legacy_cache_neutralized',true
      )
    );
  end if;

  perform private.b1_record_event(
    v_project.cell_id,v_decision_type,'PROJECT',p_project_id,
    'PROJECT_INTENT',p_intent_id,p_actor_id,'intent.decide',
    'PROJECT',p_project_id,p_command_id,v_before,v_after,'PROJECT',
    jsonb_build_object(
      'decision',p_decision,
      'current_intent_record_id',
        case when p_decision='WITHDRAW' then null
             when p_decision='ACCEPT' then p_intent_id
             else v_previous end,
      'acceptance_is_truth',false,
      'acceptance_is_verification',false
    )
  );

  v_result := jsonb_build_object(
    'ok',true,'project_id',p_project_id,'intent_id',p_intent_id,'decision',p_decision,
    'material_version',v_after,
    'current_intent_record_id',
      case when p_decision='WITHDRAW' then null
           when p_decision='ACCEPT' then p_intent_id
           else v_previous end,
    'current_intent_text_is_primary_source',false,
    'withdrawn_cache_neutralized',
      case when p_decision='WITHDRAW' then true else false end,
    'acceptance_is_truth',false,
    'acceptance_is_verification',false
  );
  perform private.b1_finish_command(p_actor_id,p_idempotency_key,v_result);
  return v_result;
end;
$$;

create or replace function public.world002b_reconcile_project_intent(p_project_id uuid)
returns text[]
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  with p as (
    select * from public.projects where id=p_project_id
  ),
  current_record as (
    select i.*
    from public.project_intents i
    join p on p.current_intent_record_id=i.id
  ),
  latest_current_decision as (
    select d.*
    from public.decision_records d
    join p on true
    where d.target_type='PROJECT_INTENT'
      and d.target_id=p.current_intent_record_id
      and d.decision_type in ('INTENT_ACCEPT','INTENT_REJECT','INTENT_WITHDRAW')
    order by d.created_at desc,d.id desc
    limit 1
  ),
  checks as (
    select 'missing_project' as issue where not exists(select 1 from p)
    union all
    select 'current_intent_record_missing'
      where exists(select 1 from p where current_intent_record_id is not null)
        and not exists(select 1 from current_record)
    union all
    select 'current_intent_cache_mismatch'
      where exists(select 1 from p join current_record c on true where p.current_intent<>c.content)
    union all
    select 'current_intent_without_acceptance'
      where exists(
        select 1 from p join current_record c on true
        where p.current_intent_record_id is not null
          and not (
            exists(select 1 from latest_current_decision d where d.decision_type='INTENT_ACCEPT')
            or (not exists(select 1 from latest_current_decision) and c.accepted_at is not null)
          )
      )
    union all
    select 'nonlegacy_interpretation_missing_source'
      where exists(
        select 1 from public.project_intents i
        where i.project_id=p_project_id
          and i.kind='INTERPRETATION'
          and i.provenance_status<>'LEGACY_UNATTRIBUTED'
          and (i.source_intent_id is null or i.derivation_type<>'INTERPRETS')
      )
    union all
    select 'nonlegacy_record_missing_recorder'
      where exists(
        select 1 from public.project_intents i
        where i.project_id=p_project_id
          and i.provenance_status<>'LEGACY_UNATTRIBUTED'
          and i.recorded_by_actor_id is null
      )
  )
  select coalesce(array_agg(issue order by issue),'{}'::text[]) from checks;
$$;

-- Keep existing project-creation signature, but make NEW rows honest:
-- the ORIGINAL is attributed to the human; the submitted interpretation's
-- literal producer remains unspecified because this legacy-compatible API
-- has no parameter that can faithfully identify an AI/tool producer.
create or replace function public.create_project_atomic(
  p_title text,
  p_slug_base text,
  p_summary text,
  p_original_intent text,
  p_current_intent text,
  p_intended_result text,
  p_rules_and_limits text,
  p_needs text[],
  p_economic_regime text,
  p_stage text,
  p_publish boolean default true
)
returns table(project_id uuid, slug text)
language plpgsql
security definer
set search_path = public, private, extensions, pg_temp
as $$
declare
  v_profile_id uuid := auth.uid();
  v_actor_id uuid;
  v_project_id uuid;
  v_slug text := left(trim(both '-' from lower(p_slug_base)),72);
  v_version integer := 1;
  v_original_intent_id uuid;
  v_interpretation_id uuid;
  v_cell_id uuid;
  v_policy_version_id uuid;
begin
  if v_profile_id is null then
    raise exception using errcode='insufficient_privilege',message='authentication required';
  end if;
  if not private.is_active_pilot(v_profile_id) then
    raise exception using errcode='insufficient_privilege',message='active pilot invite required';
  end if;

  select am.actor_id into v_actor_id
  from public.actor_memberships am
  join public.actors a on a.id=am.actor_id
  where am.profile_id=v_profile_id
    and am.role in ('OWNER','REPRESENTATIVE')
    and a.kind='PERSON'
  order by am.created_at limit 1;

  if v_actor_id is null then
    raise exception using errcode='integrity_constraint_violation',message='profile has no responsible actor';
  end if;
  if v_slug='' or v_slug !~ '^[a-z0-9]+(?:-[a-z0-9]+)*$' then
    raise exception using errcode='check_violation',message='invalid project slug';
  end if;

  while exists(select 1 from public.projects p where p.slug=v_slug) loop
    v_slug := left(p_slug_base,63)||'-'||substr(replace(gen_random_uuid()::text,'-',''),1,8);
  end loop;

  insert into public.projects(
    slug,title,summary,current_intent,steward_actor_id,stage,visibility,
    economic_regime,intended_result,rules_and_limits,needs,source_label,
    created_by_profile_id,version,published_at
  ) values (
    v_slug,p_title,p_summary,p_current_intent,v_actor_id,p_stage,
    case when p_publish then 'PUBLIC' else 'PRIVATE' end,
    p_economic_regime,p_intended_result,p_rules_and_limits,p_needs,'PILOT',
    v_profile_id,case when p_publish then 2 else 1 end,
    case when p_publish then now() else null end
  )
  returning id,version,cell_id into v_project_id,v_version,v_cell_id;

  insert into public.project_intents(
    project_id,kind,content,version,accepted_at,accepted_by_profile_id,
    recorded_by_actor_id,content_origin_actor_id,source_intent_id,
    derivation_type,provenance_status,origin_mechanism
  ) values (
    v_project_id,'ORIGINAL',p_original_intent,1,null,null,
    v_actor_id,v_actor_id,null,null,'ATTRIBUTED','HUMAN_ORIGINAL_INPUT'
  ) returning id into v_original_intent_id;

  insert into public.project_intents(
    project_id,kind,content,version,accepted_at,accepted_by_profile_id,
    recorded_by_actor_id,content_origin_actor_id,source_intent_id,
    derivation_type,provenance_status,origin_mechanism
  ) values (
    v_project_id,'INTERPRETATION',p_current_intent,1,null,null,
    v_actor_id,null,v_original_intent_id,'INTERPRETS',
    'RECORDED_ORIGIN_UNSPECIFIED','UNSPECIFIED_LEGACY_API'
  ) returning id into v_interpretation_id;

  update public.projects
  set current_intent_record_id=v_interpretation_id
  where id=v_project_id;

  insert into public.project_members(project_id,actor_id,role,granted_by_profile_id)
  values(v_project_id,v_actor_id,'PROJECT_STEWARD',v_profile_id);

  select current_policy_version_id into v_policy_version_id
  from public.cells where id=v_cell_id;

  insert into public.decision_records(
    cell_id,decision_type,outcome,target_type,target_id,actor_id,
    policy_version_id,delegation_id,opportunity_version,proposal_version,
    reason,command_id,payload
  ) values (
    v_cell_id,'INTENT_ACCEPT','ALLOW','PROJECT_INTENT',v_interpretation_id,v_actor_id,
    v_policy_version_id,null,null,null,
    'project creation explicitly selected the submitted interpretation as operative',
    gen_random_uuid(),
    jsonb_build_object(
      'project_id',v_project_id,
      'creation_path','create_project_atomic',
      'origin_unspecified',true,
      'acceptance_is_truth',false
    )
  );

  insert into public.events(
    project_id,event_type,title,description,actor_id,
    authorized_by_profile_id,material_version,payload
  ) values (
    v_project_id,'PROJECT_CREATED','Projeto criado',
    'Registro Original e interpretação inicial foram preservados em objetos distintos.',
    v_actor_id,v_profile_id,1,
    jsonb_build_object('visibility','PRIVATE','stage',p_stage,'current_intent_record_id',v_interpretation_id)
  );

  if p_publish then
    insert into public.events(
      project_id,event_type,title,description,actor_id,
      authorized_by_profile_id,material_version,payload
    ) values (
      v_project_id,'PROJECT_PUBLISHED','Projeto aberto',
      'Leitura pública habilitada; escrita permanece restrita aos responsáveis do piloto.',
      v_actor_id,v_profile_id,v_version,
      jsonb_build_object(
        'visibility','PUBLIC',
        'economic_regime',p_economic_regime,
        'current_intent_record_id',v_interpretation_id
      )
    );
  end if;

  return query select v_project_id,v_slug;
end;
$$;


-- WORLD-002B compatibility update for the original Gate-1 reconciler.
--
-- Gate-1 originally allowed exactly one ORIGINAL total.
-- WORLD-002B adds append-only ORIGINAL revisions linked by REVISION_OF.
-- The invariant is therefore exactly one root ORIGINAL
-- (source_intent_id IS NULL) plus zero or more preserved revisions.
--
-- Keep the historical issue code "original_intent_count" while correcting
-- what it measures, preserving compatibility for existing callers.
create or replace function public.reconcile_project(p_project_id uuid)
returns text[]
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  with material as (
    select p.id, p.version, p.visibility, p.published_at
    from public.projects p
    where p.id = p_project_id
  ),
  checks as (
    select 'missing_material' as issue
    where not exists (select 1 from material)

    union all

    select 'original_intent_count'
    where (
      select count(*)
      from public.project_intents i
      where i.project_id = p_project_id
        and i.kind = 'ORIGINAL'
        and i.source_intent_id is null
    ) <> 1

    union all

    select 'event_material_version'
    where coalesce(
      (select max(e.material_version)
       from public.events e
       where e.project_id = p_project_id),
      0
    ) <> coalesce((select version from material), 0)

    union all

    select 'public_without_publish_event'
    where exists (
      select 1 from material
      where visibility = 'PUBLIC'
        and published_at is not null
    )
    and not exists (
      select 1
      from public.events
      where project_id = p_project_id
        and event_type = 'PROJECT_PUBLISHED'
    )
  )
  select coalesce(array_agg(issue order by issue), '{}'::text[])
  from checks;
$$;

revoke all on function private.world002b_origin_mechanism(uuid) from public;
revoke all on function public.world002b_record_interpretation(uuid,uuid,uuid,text,uuid,uuid,text) from public;
revoke all on function public.world002b_revise_original(uuid,uuid,uuid,text,uuid,text) from public;
revoke all on function public.world002b_decide_intent(uuid,uuid,uuid,text,uuid,text) from public;
revoke all on function public.world002b_reconcile_project_intent(uuid) from public;

grant execute on function public.world002b_record_interpretation(uuid,uuid,uuid,text,uuid,uuid,text) to authenticated;
grant execute on function public.world002b_revise_original(uuid,uuid,uuid,text,uuid,text) to authenticated;
grant execute on function public.world002b_decide_intent(uuid,uuid,uuid,text,uuid,text) to authenticated;

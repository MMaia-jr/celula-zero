-- WORLD-003B — minimal contextual discovery projection.
--
-- One synthetic external-user journey:
-- an anonymous caller searches public Projects and public Opportunities using
-- explicit text/type/state/competency filters and receives deterministic
-- inclusion reason codes.
--
-- This is a read projection, not a recommender or matching engine.
--
-- Boundaries:
-- SEARCH_RESULT != RECOMMENDATION
-- RECOMMENDATION != ENDORSEMENT
-- TEXT_MATCH != TRUTH
-- COMPETENCY_REQUIREMENT_MATCH != ACTOR_COMPETENCE
-- LEXICAL_MATCH != CONTEXTUAL_TRUST
-- PUBLIC_VISIBILITY != PERMISSION_TO_INFER_SENSITIVE_TRAITS
--
-- No search history is persisted.
-- No Actor profile, score, vector, embedding, reputation or Need entity exists.

create or replace function public.world003b_discover(
  p_text_query text default null,
  p_result_types text[] default null,
  p_project_stages text[] default null,
  p_opportunity_states text[] default null,
  p_competency_ids uuid[] default null,
  p_competency_relations text[] default null,
  p_limit integer default 50
)
returns table(
  result_type text,
  object_id uuid,
  project_id uuid,
  title text,
  summary_or_statement text,
  visibility text,
  state_or_stage text,
  matched_reason_codes text[],
  matched_competency_concept_ids uuid[],
  source_version_id uuid
)
language plpgsql
stable
security definer
set search_path = public, private, pg_temp
as $$
declare
  v_query text := nullif(trim(coalesce(p_text_query, '')), '');
  v_result_types text[] := p_result_types;
  v_opportunity_states text[] := coalesce(p_opportunity_states, array['OPEN']::text[]);
begin
  -- Anonymous read surface: bound caller-controlled work before query planning
  -- reaches FTS/ANY joins. These are operational safety limits, not relevance
  -- or ranking semantics.
  if v_query is not null and char_length(v_query) > 500 then
    raise exception using
      errcode = 'P0001',
      message = 'CZ422:DISCOVERY_TEXT_QUERY_TOO_LONG';
  end if;

  if p_result_types is not null and (
    cardinality(p_result_types) > 2
    or array_position(p_result_types, null) is not null
  ) then
    raise exception using
      errcode = 'P0001',
      message = 'CZ422:INVALID_DISCOVERY_RESULT_TYPE_FILTER';
  end if;

  if p_project_stages is not null and (
    cardinality(p_project_stages) > 6
    or array_position(p_project_stages, null) is not null
  ) then
    raise exception using
      errcode = 'P0001',
      message = 'CZ422:INVALID_PROJECT_STAGE_FILTER';
  end if;

  if p_opportunity_states is not null and (
    cardinality(p_opportunity_states) > 2
    or array_position(p_opportunity_states, null) is not null
  ) then
    raise exception using
      errcode = 'P0001',
      message = 'CZ422:INVALID_OPPORTUNITY_STATE_FILTER';
  end if;

  if p_competency_ids is not null and (
    cardinality(p_competency_ids) > 25
    or array_position(p_competency_ids, null) is not null
  ) then
    raise exception using
      errcode = 'P0001',
      message = 'CZ422:INVALID_COMPETENCY_FILTER';
  end if;

  if p_competency_relations is not null and (
    cardinality(p_competency_relations) > 3
    or array_position(p_competency_relations, null) is not null
  ) then
    raise exception using
      errcode = 'P0001',
      message = 'CZ422:INVALID_COMPETENCY_RELATION_FILTER';
  end if;

  if p_limit is null or p_limit < 1 or p_limit > 100 then
    raise exception using
      errcode = 'P0001',
      message = 'CZ422:DISCOVERY_LIMIT_OUT_OF_RANGE';
  end if;

  if v_result_types is not null and exists (
    select 1
    from unnest(v_result_types) x
    where x not in ('PROJECT', 'OPPORTUNITY')
  ) then
    raise exception using
      errcode = 'P0001',
      message = 'CZ422:INVALID_DISCOVERY_RESULT_TYPE';
  end if;

  if p_project_stages is not null and exists (
    select 1
    from unnest(p_project_stages) x
    where x not in ('DRAFT', 'OPEN', 'ACTIVE', 'PAUSED', 'COMPLETED', 'ABANDONED')
  ) then
    raise exception using
      errcode = 'P0001',
      message = 'CZ422:INVALID_PROJECT_STAGE_FILTER';
  end if;

  if v_opportunity_states is not null and exists (
    select 1
    from unnest(v_opportunity_states) x
    where x not in ('OPEN', 'CLOSED')
  ) then
    raise exception using
      errcode = 'P0001',
      message = 'CZ422:INVALID_OPPORTUNITY_STATE_FILTER';
  end if;

  if p_competency_relations is not null and exists (
    select 1
    from unnest(p_competency_relations) x
    where x not in ('REQUIRED', 'PREFERRED', 'LEARNING_TARGET')
  ) then
    raise exception using
      errcode = 'P0001',
      message = 'CZ422:INVALID_COMPETENCY_RELATION_FILTER';
  end if;

  return query
  with current_public_opportunities as (
    select
      o.id as opportunity_id,
      o.project_id,
      o.state,
      o.visibility,
      o.current_version,
      o.created_at,
      ov.id as version_id,
      ov.title,
      ov.statement
    from public.opportunities o
    join public.projects p on p.id = o.project_id
    join public.opportunity_versions ov
      on ov.opportunity_id = o.id
     and ov.version = o.current_version
    where o.visibility = 'PUBLIC'
      and o.state in ('OPEN', 'CLOSED')
      and ov.visibility = 'PUBLIC'
      and ov.state = o.state
      and p.visibility = 'PUBLIC'
      and p.published_at is not null
      and p.archived_at is null
  ),
  opportunity_competency_matches as (
    select
      cpo.opportunity_id,
      array_agg(distinct ovc.competency_id order by ovc.competency_id) as competency_ids,
      array_agg(
        distinct case ovc.relation
          when 'REQUIRED' then 'EXPLICIT_COMPETENCY_REQUIRED_MATCH'
          when 'PREFERRED' then 'EXPLICIT_COMPETENCY_PREFERRED_MATCH'
          when 'LEARNING_TARGET' then 'EXPLICIT_COMPETENCY_LEARNING_TARGET_MATCH'
        end
        order by case ovc.relation
          when 'REQUIRED' then 'EXPLICIT_COMPETENCY_REQUIRED_MATCH'
          when 'PREFERRED' then 'EXPLICIT_COMPETENCY_PREFERRED_MATCH'
          when 'LEARNING_TARGET' then 'EXPLICIT_COMPETENCY_LEARNING_TARGET_MATCH'
        end
      ) as reason_codes
    from current_public_opportunities cpo
    join public.opportunity_version_competencies ovc
      on ovc.opportunity_id = cpo.opportunity_id
     and ovc.opportunity_version = cpo.current_version
    where
      (p_competency_ids is null or ovc.competency_id = any(p_competency_ids))
      and (
        p_competency_relations is null
        or ovc.relation = any(p_competency_relations)
      )
      and (
        p_competency_ids is not null
        or p_competency_relations is not null
      )
    group by cpo.opportunity_id
  ),
  project_rows as (
    select
      'PROJECT'::text as result_type,
      p.id as object_id,
      p.id as project_id,
      p.title,
      p.summary as summary_or_statement,
      p.visibility,
      p.stage as state_or_stage,
      array_remove(array[
        case when v_query is not null then 'TEXT_MATCH' end,
        case when v_result_types is not null then 'EXPLICIT_TYPE_FILTER_MATCH' end,
        case when p_project_stages is not null then 'EXPLICIT_STATE_FILTER_MATCH' end
      ]::text[], null) as matched_reason_codes,
      '{}'::uuid[] as matched_competency_concept_ids,
      null::uuid as source_version_id,
      coalesce(p.published_at, p.created_at) as sort_at
    from public.projects p
    where p.visibility = 'PUBLIC'
      and p.published_at is not null
      and p.archived_at is null
      and (v_result_types is null or 'PROJECT' = any(v_result_types))
      and (p_project_stages is null or p.stage = any(p_project_stages))
      -- Projects do not directly declare competency requirements. When a
      -- competency filter exists, return Opportunity results only rather than
      -- inventing a project-level competency meaning.
      and p_competency_ids is null
      and p_competency_relations is null
      and (
        v_query is null
        or to_tsvector(
          'simple',
          coalesce(p.title, '') || ' ' || coalesce(p.summary, '')
        ) @@ websearch_to_tsquery('simple', v_query)
      )
  ),
  opportunity_rows as (
    select
      'OPPORTUNITY'::text as result_type,
      cpo.opportunity_id as object_id,
      cpo.project_id,
      cpo.title,
      cpo.statement as summary_or_statement,
      cpo.visibility,
      cpo.state as state_or_stage,
      array_cat(
        array_remove(array[
          case when v_query is not null then 'TEXT_MATCH' end,
          case when v_result_types is not null then 'EXPLICIT_TYPE_FILTER_MATCH' end,
          case when p_opportunity_states is not null then 'EXPLICIT_STATE_FILTER_MATCH' end
        ]::text[], null),
        coalesce(ocm.reason_codes, '{}'::text[])
      ) as matched_reason_codes,
      coalesce(ocm.competency_ids, '{}'::uuid[]) as matched_competency_concept_ids,
      cpo.version_id as source_version_id,
      cpo.created_at as sort_at
    from current_public_opportunities cpo
    left join opportunity_competency_matches ocm
      on ocm.opportunity_id = cpo.opportunity_id
    where (v_result_types is null or 'OPPORTUNITY' = any(v_result_types))
      and (v_opportunity_states is null or cpo.state = any(v_opportunity_states))
      and (
        v_query is null
        or to_tsvector(
          'simple',
          coalesce(cpo.title, '') || ' ' || coalesce(cpo.statement, '')
        ) @@ websearch_to_tsquery('simple', v_query)
      )
      and (
        (p_competency_ids is null and p_competency_relations is null)
        or ocm.opportunity_id is not null
      )
  ),
  combined as (
    select * from project_rows
    union all
    select * from opportunity_rows
  )
  select
    c.result_type,
    c.object_id,
    c.project_id,
    c.title,
    c.summary_or_statement,
    c.visibility,
    c.state_or_stage,
    c.matched_reason_codes,
    c.matched_competency_concept_ids,
    c.source_version_id
  from combined c
  order by c.sort_at desc, c.result_type, c.object_id
  limit p_limit;
end;
$$;

revoke all on function public.world003b_discover(
  text, text[], text[], text[], uuid[], text[], integer
) from public;

grant execute on function public.world003b_discover(
  text, text[], text[], text[], uuid[], text[], integer
) to anon, authenticated;

comment on function public.world003b_discover(
  text, text[], text[], text[], uuid[], text[], integer
) is
  'Public contextual-discovery projection using explicit filters and deterministic inclusion reasons; not a recommender, endorsement, reputation or Actor matching engine.';

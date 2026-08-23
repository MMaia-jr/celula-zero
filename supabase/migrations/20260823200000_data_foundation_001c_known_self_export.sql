-- DATA-FOUNDATION-001C — known self-data / structural-association export.
--
-- Purpose:
-- Give an authenticated person an immediate, machine-readable view of data
-- that Célula Zero can STRUCTURALLY associate with their profile/Actors.
--
-- This is deliberately NOT called a complete LGPD access response or
-- portability package because:
-- - free-text mentions of a person are not structurally discoverable;
-- - processing purpose/criteria/recipient registries are not complete;
-- - an authored/operated record is not automatically "personal data about" its author;
-- - portability to another controller is a separate operation.
--
-- Boundaries:
-- STRUCTURAL_ASSOCIATION != PERSONAL_DATA_CLASSIFICATION
-- KNOWN_EXPORT != COMPLETE_DSAR
-- KNOWN_EXPORT != PORTABILITY_TRANSFER
-- ASSOCIATED_RECORD != CLAIM_ABOUT_PERSON
-- EXPORT != LEGAL_COMPLIANCE
-- BLOCKED raw content must never be bypassed by this SECURITY DEFINER function.

create or replace function public.data001c_export_known_self_data()
returns jsonb
language plpgsql
stable
security definer
set search_path = public, auth, private, pg_temp
as $$
declare
  v_profile_id uuid := auth.uid();
  v_result jsonb;
begin
  if v_profile_id is null then
    raise exception using
      errcode = '42501',
      message = 'CZ401:AUTH_REQUIRED';
  end if;

  if not exists (
    select 1
    from public.profiles p
    where p.id = v_profile_id
  ) then
    raise exception using
      errcode = 'P0001',
      message = 'CZ404:PROFILE_NOT_FOUND';
  end if;

  with controlled_actors as (
    select distinct a.id
    from public.actors a
    join public.actor_memberships am
      on am.actor_id = a.id
    where am.profile_id = v_profile_id
      and am.role in ('OWNER','OPERATOR','REPRESENTATIVE')
  ),
  actor_export as (
    select coalesce(
      jsonb_agg(
        jsonb_build_object(
          'actor_id', a.id,
          'kind', a.kind,
          'name', a.name,
          'operator_profile_id', a.operator_profile_id,
          'operator_label', a.operator_label,
          'created_at', a.created_at,
          'control_roles', (
            select coalesce(
              jsonb_agg(am2.role order by am2.role),
              '[]'::jsonb
            )
            from public.actor_memberships am2
            where am2.actor_id = a.id
              and am2.profile_id = v_profile_id
              and am2.role in ('OWNER','OPERATOR','REPRESENTATIVE')
          )
        )
        order by a.created_at, a.id
      ),
      '[]'::jsonb
    ) as value
    from public.actors a
    where a.id in (select id from controlled_actors)
  ),
  intent_rows as (
    select
      i.*,
      p.current_intent_record_id = i.id as operative,
      private.data001b_project_intent_content_is_blocked(i.id) as blocked,
      exists(
        select 1 from controlled_actors ca
        where ca.id = i.recorded_by_actor_id
      ) as recorded_by_controlled,
      exists(
        select 1 from controlled_actors ca
        where ca.id = i.content_origin_actor_id
      ) as content_origin_controlled
    from public.project_intents i
    join public.projects p on p.id = i.project_id
    where exists(
      select 1 from controlled_actors ca
      where ca.id = i.recorded_by_actor_id
         or ca.id = i.content_origin_actor_id
    )
  ),
  intent_export as (
    select coalesce(
      jsonb_agg(
        jsonb_strip_nulls(
          jsonb_build_object(
            'intent_id', i.id,
            'project_id', i.project_id,
            'kind', i.kind,
            'version', i.version,
            'created_at', i.created_at,
            'provenance_status', i.provenance_status,
            'recorded_by_actor_id', i.recorded_by_actor_id,
            'content_origin_actor_id', i.content_origin_actor_id,
            'source_intent_id', i.source_intent_id,
            'derivation_type', i.derivation_type,
            'origin_mechanism', i.origin_mechanism,
            'operative', i.operative,
            'content_state', case when i.blocked then 'BLOCKED' else 'ACTIVE' end,
            'association_types',
              (
                select coalesce(jsonb_agg(x.label order by x.label),'[]'::jsonb)
                from (
                  select 'CONTENT_ORIGIN_CONTROLLED_ACTOR'::text as label
                  where i.content_origin_controlled
                  union all
                  select 'RECORDED_BY_CONTROLLED_ACTOR'::text
                  where i.recorded_by_controlled
                ) x
              ),
            -- Raw content is exported only where structural provenance says
            -- a controlled Actor is the exact content origin AND lifecycle
            -- control does not block the payload.
            'content',
              case
                when not i.blocked and i.content_origin_controlled
                  then i.content
                else null
              end
          )
        )
        order by i.created_at, i.id
      ),
      '[]'::jsonb
    ) as value
    from intent_rows i
  )
  select jsonb_build_object(
    'schema', 'cz.known-self-data-export.v1',
    'generated_at', statement_timestamp(),
    'subject_profile_id', v_profile_id,
    'scope', 'STRUCTURALLY_LINKED_KNOWN_DATA_ONLY',
    'boundaries', jsonb_build_object(
      'structural_association_is_personal_data_classification', false,
      'complete_dsar', false,
      'portability_transfer', false,
      'free_text_mention_detection', false,
      'legal_compliance_claim', false,
      'blocked_content_bypassed', false,
      'purpose_criteria_registry_complete', false
    ),
    'known_gaps', jsonb_build_array(
      'FREE_TEXT_MENTIONS_NOT_DISCOVERED',
      'PROCESSING_PURPOSE_CRITERIA_REGISTRY_INCOMPLETE',
      'RECIPIENT_SHARING_REGISTRY_INCOMPLETE',
      'NOT_A_COMPLETE_ARTICLE_19_II_DECLARATION',
      'NOT_A_PORTABILITY_TRANSFER'
    ),
    'profile',
      (
        select jsonb_build_object(
          'profile_id', p.id,
          'display_name', p.display_name,
          'created_at', p.created_at,
          'updated_at', p.updated_at,
          'account_email', u.email
        )
        from public.profiles p
        left join auth.users u on u.id = p.id
        where p.id = v_profile_id
      ),
    'pilot_membership',
      (
        select coalesce(
          (
            select jsonb_build_object(
              'status', pm.status,
              'source', pm.source,
              'approved_at', pm.approved_at
            )
            from public.pilot_memberships pm
            where pm.profile_id = v_profile_id
          ),
          'null'::jsonb
        )
      ),
    'controlled_actors', (select value from actor_export),
    'known_project_intent_associations', (select value from intent_export)
  )
  into v_result;

  return v_result;
end;
$$;

revoke all on function public.data001c_export_known_self_data()
from public;

grant execute on function public.data001c_export_known_self_data()
to authenticated;

comment on function public.data001c_export_known_self_data() is
  'Self-only export of structurally known profile/Actor data and associated project-intent records. Not a complete DSAR or portability transfer.';

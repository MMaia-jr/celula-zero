-- K002 / D030 — fresh participant-boundary founder invitation bootstrap.
--
-- Full-regression finding from the rejected local candidate:
-- current participant-boundary semantics treat active CELL-scoped role
-- assignments as Cell membership. Therefore a second CELL-scoped functional
-- role is not a bounded representation for invitation bootstrap.
--
-- Smallest composition selected by D030:
-- - keep CELL_MEMBER at zero capabilities;
-- - create no new role / role capability / role assignment;
-- - keep private.b1_has_capability() unchanged;
-- - preserve existing participation.invite role/delegation authority;
-- - additionally allow the exact creator of the current participant-boundary
--   policy to create/revoke invitations only while that PERSON still has the
--   active CELL_MEMBER assignment for the same Cell and current policy.
--
-- This derived basis is intentionally invitation-command-specific and is not a
-- delegable B1 capability.

create or replace function private.k002_d030_founder_can_bootstrap_invitation(
  p_actor_id uuid,
  p_cell_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = public, private, pg_temp
as $$
  select
    auth.uid() is not null
    and private.b1_profile_controls_actor(p_actor_id, auth.uid())
    and exists (
      select 1
      from public.cells c
      join public.policy_versions pv
        on pv.id = c.current_policy_version_id
       and pv.cell_id = c.id
      join public.actors a
        on a.id = p_actor_id
       and a.kind = 'PERSON'
      join public.role_assignments ra
        on ra.cell_id = c.id
       and ra.actor_id = p_actor_id
       and ra.scope_type = 'CELL'
       and ra.scope_id = c.id
       and ra.policy_version_id = c.current_policy_version_id
       and ra.valid_from <= now()
       and (ra.valid_until is null or ra.valid_until > now())
       and ra.revoked_at is null
      join public.role_definitions rd
        on rd.id = ra.role_id
       and rd.cell_id = c.id
       and rd.code = 'CELL_MEMBER'
      where c.id = p_cell_id
        and pv.created_by_actor_id = p_actor_id
        and coalesce(pv.rules, '{}'::jsonb)
            @> '{"participant_boundary": true}'::jsonb
    );
$$;

create or replace function private.k002_d030_authorize_cell_invitation(
  p_actor_id uuid,
  p_cell_id uuid
)
returns text
language plpgsql
stable
security definer
set search_path = public, private, pg_temp
as $$
begin
  if not private.b1_profile_controls_actor(p_actor_id, auth.uid()) then
    raise exception using
      errcode = '42501',
      message = 'CZ403:ACTOR_CONTROL_REQUIRED';
  end if;

  if private.b1_has_capability(
       p_actor_id, 'participation.invite', 'CELL', p_cell_id
     ) then
    return 'B1_CAPABILITY';
  end if;

  if private.k002_d030_founder_can_bootstrap_invitation(
       p_actor_id, p_cell_id
     ) then
    return 'PARTICIPANT_BOUNDARY_FOUNDER';
  end if;

  raise exception using
    errcode = '42501',
    message = 'CZ403:CAPABILITY_DENIED';
end;
$$;

revoke all on function private.k002_d030_founder_can_bootstrap_invitation(uuid, uuid)
from public, anon, authenticated;
revoke all on function private.k002_d030_authorize_cell_invitation(uuid, uuid)
from public, anon, authenticated;

create or replace function public.k002_create_cell_invitation(
  p_actor_id uuid, p_cell_id uuid, p_intended_for text, p_purpose text,
  p_expires_at timestamptz, p_command_id uuid, p_idempotency_key text
) returns jsonb language plpgsql security definer
set search_path = public, private, extensions, pg_temp as $$
declare
  v_replayed boolean;
  v_result jsonb;
  v_persisted_result jsonb;
  v_payload jsonb;
  v_id uuid;
  v_authority_basis text;
  v_token text := encode(extensions.gen_random_bytes(32), 'hex');
begin
  if not exists (select 1 from public.cells where id=p_cell_id) then
    raise exception using errcode='P0001', message='CZ404:CELL_NOT_FOUND';
  end if;

  v_authority_basis := private.k002_d030_authorize_cell_invitation(
    p_actor_id, p_cell_id
  );

  if p_expires_at <= now() or p_expires_at > now() + interval '30 days' then
    raise exception using errcode='22023', message='CZ422:INVALID_INVITATION_EXPIRY';
  end if;

  v_payload := jsonb_build_object(
    'cell_id',p_cell_id,
    'intended_for',trim(p_intended_for),
    'purpose',trim(p_purpose),
    'expires_at',p_expires_at
  );

  select replayed,saved_result into v_replayed,v_result
  from private.b1_begin_command(
    p_cell_id,p_actor_id,p_command_id,p_idempotency_key,
    'participation.invite',v_payload
  );
  if v_replayed then return v_result; end if;

  insert into public.cell_invitations(
    cell_id,invited_by_actor_id,intended_for,purpose,token_hash,expires_at
  ) values(
    p_cell_id,p_actor_id,trim(p_intended_for),trim(p_purpose),
    private.k002_token_hash(v_token),p_expires_at
  ) returning id into v_id;

  perform private.b1_record_decision(
    p_cell_id,
    'PARTICIPATION_INVITE',
    'ALLOW',
    'CELL_INVITATION',
    v_id,
    p_actor_id,
    'participation.invite',
    'CELL',
    p_cell_id,
    'authorized invitation creation',
    p_command_id,
    null,
    null,
    jsonb_build_object('authorization_basis',v_authority_basis)
  );

  perform private.b1_record_event(
    p_cell_id,
    'CELL_INVITATION_CREATED',
    'CELL_INVITATION',
    v_id,
    'CELL_INVITATION',
    v_id,
    p_actor_id,
    'participation.invite',
    'CELL',
    p_cell_id,
    p_command_id,
    null,
    1,
    'PROJECT',
    jsonb_build_object(
      'expires_at',p_expires_at,
      'purpose',trim(p_purpose),
      'authorization_basis',v_authority_basis
    )
  );

  v_persisted_result := jsonb_build_object(
    'ok',true,
    'invitation_id',v_id,
    'expires_at',p_expires_at,
    'token_returned',false,
    'notice','Invitation exists; bearer token is not persisted and cannot be replayed.'
  );
  perform private.b1_finish_command(
    p_actor_id,p_idempotency_key,v_persisted_result
  );
  v_result := v_persisted_result || jsonb_build_object(
    'bearer_token',v_token,'token_returned',true
  );
  return v_result;
end $$;

create or replace function public.k002_revoke_cell_invitation(
  p_actor_id uuid, p_invitation_id uuid, p_command_id uuid, p_idempotency_key text
) returns jsonb language plpgsql security definer
set search_path = public, private, pg_temp as $$
declare
  v_i public.cell_invitations%rowtype;
  v_replayed boolean;
  v_result jsonb;
  v_authority_basis text;
  v_payload jsonb := jsonb_build_object('invitation_id',p_invitation_id);
begin
  select * into v_i from public.cell_invitations where id=p_invitation_id;
  if not found then
    raise exception using errcode='P0001',message='CZ404:INVITATION_NOT_FOUND';
  end if;

  v_authority_basis := private.k002_d030_authorize_cell_invitation(
    p_actor_id, v_i.cell_id
  );

  select replayed,saved_result into v_replayed,v_result
  from private.b1_begin_command(
    v_i.cell_id,p_actor_id,p_command_id,p_idempotency_key,
    'participation.invitation.revoke',v_payload
  );
  if v_replayed then return v_result; end if;

  update public.cell_invitations
  set revoked_at=now(),revoked_by_actor_id=p_actor_id
  where id=p_invitation_id and revoked_at is null;
  if not found then
    raise exception using errcode='P0001',message='CZ409:INVITATION_NOT_ACTIVE';
  end if;

  perform private.b1_record_event(
    v_i.cell_id,
    'CELL_INVITATION_REVOKED',
    'CELL_INVITATION',
    v_i.id,
    'CELL_INVITATION',
    v_i.id,
    p_actor_id,
    'participation.invite',
    'CELL',
    v_i.cell_id,
    p_command_id,
    1,
    2,
    'PROJECT',
    jsonb_build_object('authorization_basis',v_authority_basis)
  );

  v_result:=jsonb_build_object(
    'ok',true,'invitation_id',v_i.id,'status','REVOKED'
  );
  perform private.b1_finish_command(p_actor_id,p_idempotency_key,v_result);
  return v_result;
end $$;

revoke all on function public.k002_create_cell_invitation(
  uuid,uuid,text,text,timestamptz,uuid,text
) from public;
revoke all on function public.k002_revoke_cell_invitation(
  uuid,uuid,uuid,text
) from public;

grant execute on function public.k002_create_cell_invitation(
  uuid,uuid,text,text,timestamptz,uuid,text
) to authenticated;
grant execute on function public.k002_revoke_cell_invitation(
  uuid,uuid,uuid,text
) to authenticated;

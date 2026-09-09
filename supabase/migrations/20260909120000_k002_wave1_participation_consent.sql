-- K002 Wave 1: Invitation, Consent, and Participation remain distinct records.
-- Bearer invitations are 256-bit values returned once; only their SHA-256 digest persists.

create table public.cell_invitations (
  id uuid primary key default gen_random_uuid(),
  cell_id uuid not null references public.cells(id) on delete restrict,
  invited_by_actor_id uuid not null references public.actors(id) on delete restrict,
  intended_for text not null check (char_length(trim(intended_for)) between 2 and 200),
  purpose text not null check (char_length(trim(purpose)) between 10 and 1000),
  token_hash text not null unique check (token_hash ~ '^[0-9a-f]{64}$'),
  expires_at timestamptz not null,
  revoked_at timestamptz,
  revoked_by_actor_id uuid references public.actors(id) on delete restrict,
  created_at timestamptz not null default now(),
  check (expires_at > created_at),
  check ((revoked_at is null and revoked_by_actor_id is null) or
         (revoked_at is not null and revoked_by_actor_id is not null))
);

create table public.cell_consents (
  id uuid primary key default gen_random_uuid(),
  cell_id uuid not null references public.cells(id) on delete restrict,
  invitation_id uuid not null unique references public.cell_invitations(id) on delete restrict,
  actor_id uuid not null references public.actors(id) on delete restrict,
  statement text not null check (char_length(trim(statement)) between 10 and 2000),
  policy_version_id uuid not null references public.policy_versions(id) on delete restrict,
  consented_at timestamptz not null default now()
);

create table public.cell_participations (
  id uuid primary key default gen_random_uuid(),
  cell_id uuid not null references public.cells(id) on delete restrict,
  actor_id uuid not null references public.actors(id) on delete restrict,
  consent_id uuid not null unique references public.cell_consents(id) on delete restrict,
  status text not null default 'ACTIVE' check (status in ('ACTIVE', 'LEFT')),
  joined_at timestamptz not null default now(),
  left_at timestamptz,
  material_version integer not null default 1 check (material_version > 0),
  updated_at timestamptz not null default now(),
  unique (cell_id, actor_id),
  check ((status = 'ACTIVE' and left_at is null) or (status = 'LEFT' and left_at is not null))
);

create index cell_invitations_cell_created on public.cell_invitations(cell_id, created_at desc);
create index cell_participations_cell_status on public.cell_participations(cell_id, status, joined_at);

create trigger cell_invitations_no_delete
before delete on public.cell_invitations for each row execute function private.prevent_append_only_mutation();
create trigger cell_consents_append_only
before update or delete on public.cell_consents for each row execute function private.prevent_append_only_mutation();
create trigger cell_participations_no_delete
before delete on public.cell_participations for each row execute function private.prevent_append_only_mutation();

insert into public.capability_definitions(code, description) values
  ('participation.invite', 'Create or revoke a bearer invitation to consider Cell participation.'),
  ('participation.leave', 'Leave one Cell participation controlled by the acting person.')
on conflict (code) do nothing;

insert into public.role_capabilities(role_id, capability_code) values
  ('00000000-0000-4000-8000-00000000c201', 'participation.invite')
on conflict do nothing;

create or replace function private.k002_token_hash(p_token text)
returns text language sql immutable
set search_path = pg_catalog, extensions, pg_temp
as $$ select encode(extensions.digest(convert_to(p_token, 'UTF8'), 'sha256'), 'hex') $$;

create or replace function public.k002_create_cell_invitation(
  p_actor_id uuid, p_cell_id uuid, p_intended_for text, p_purpose text,
  p_expires_at timestamptz, p_command_id uuid, p_idempotency_key text
) returns jsonb language plpgsql security definer
set search_path = public, private, extensions, pg_temp as $$
declare
  v_replayed boolean; v_result jsonb; v_persisted_result jsonb; v_payload jsonb; v_id uuid;
  v_token text := encode(extensions.gen_random_bytes(32), 'hex');
begin
  if not exists (select 1 from public.cells where id=p_cell_id) then
    raise exception using errcode='P0001', message='CZ404:CELL_NOT_FOUND';
  end if;
  perform private.b1_authorize_actor(p_actor_id, 'participation.invite', 'CELL', p_cell_id);
  if p_expires_at <= now() or p_expires_at > now() + interval '30 days' then
    raise exception using errcode='22023', message='CZ422:INVALID_INVITATION_EXPIRY';
  end if;
  v_payload := jsonb_build_object('cell_id',p_cell_id,'intended_for',trim(p_intended_for),
    'purpose',trim(p_purpose),'expires_at',p_expires_at);
  select replayed,saved_result into v_replayed,v_result from private.b1_begin_command(
    p_cell_id,p_actor_id,p_command_id,p_idempotency_key,'participation.invite',v_payload);
  if v_replayed then return v_result; end if;
  insert into public.cell_invitations(cell_id,invited_by_actor_id,intended_for,purpose,token_hash,expires_at)
  values(p_cell_id,p_actor_id,trim(p_intended_for),trim(p_purpose),private.k002_token_hash(v_token),p_expires_at)
  returning id into v_id;
  perform private.b1_record_decision(p_cell_id,'PARTICIPATION_INVITE','ALLOW','CELL_INVITATION',v_id,
    p_actor_id,'participation.invite','CELL',p_cell_id,'authorized invitation creation',p_command_id);
  perform private.b1_record_event(p_cell_id,'CELL_INVITATION_CREATED','CELL_INVITATION',v_id,
    'CELL_INVITATION',v_id,p_actor_id,'participation.invite','CELL',p_cell_id,p_command_id,null,1,
    'PROJECT',jsonb_build_object('expires_at',p_expires_at,'purpose',trim(p_purpose)));
  v_persisted_result := jsonb_build_object('ok',true,'invitation_id',v_id,
    'expires_at',p_expires_at,'token_returned',false,'notice','Invitation exists; bearer token is not persisted and cannot be replayed.');
  perform private.b1_finish_command(p_actor_id,p_idempotency_key,v_persisted_result);
  v_result := v_persisted_result || jsonb_build_object('bearer_token',v_token,'token_returned',true);
  return v_result;
end $$;

create or replace function public.k002_revoke_cell_invitation(
  p_actor_id uuid, p_invitation_id uuid, p_command_id uuid, p_idempotency_key text
) returns jsonb language plpgsql security definer
set search_path = public, private, pg_temp as $$
declare v_i public.cell_invitations%rowtype; v_replayed boolean; v_result jsonb;
  v_payload jsonb := jsonb_build_object('invitation_id',p_invitation_id);
begin
  select * into v_i from public.cell_invitations where id=p_invitation_id;
  if not found then raise exception using errcode='P0001',message='CZ404:INVITATION_NOT_FOUND'; end if;
  perform private.b1_authorize_actor(p_actor_id,'participation.invite','CELL',v_i.cell_id);
  select replayed,saved_result into v_replayed,v_result from private.b1_begin_command(
    v_i.cell_id,p_actor_id,p_command_id,p_idempotency_key,'participation.invitation.revoke',v_payload);
  if v_replayed then return v_result; end if;
  update public.cell_invitations set revoked_at=now(),revoked_by_actor_id=p_actor_id
  where id=p_invitation_id and revoked_at is null;
  if not found then raise exception using errcode='P0001',message='CZ409:INVITATION_NOT_ACTIVE'; end if;
  perform private.b1_record_event(v_i.cell_id,'CELL_INVITATION_REVOKED','CELL_INVITATION',v_i.id,
    'CELL_INVITATION',v_i.id,p_actor_id,'participation.invite','CELL',v_i.cell_id,p_command_id,1,2,
    'PROJECT','{}'::jsonb);
  v_result:=jsonb_build_object('ok',true,'invitation_id',v_i.id,'status','REVOKED');
  perform private.b1_finish_command(p_actor_id,p_idempotency_key,v_result); return v_result;
end $$;

create or replace function public.k002_accept_cell_invitation(
  p_actor_id uuid, p_bearer_token text, p_consent_statement text,
  p_command_id uuid, p_idempotency_key text
) returns jsonb language plpgsql security definer
set search_path = public, private, pg_temp as $$
declare v_i public.cell_invitations%rowtype; v_actor public.actors%rowtype; v_policy uuid;
  v_replayed boolean; v_result jsonb; v_consent uuid; v_participation uuid; v_payload jsonb;
begin
  if p_bearer_token !~ '^[0-9a-f]{64}$' then
    raise exception using errcode='22023',message='CZ422:INVALID_INVITATION_TOKEN';
  end if;
  select * into v_i from public.cell_invitations where token_hash=private.k002_token_hash(p_bearer_token);
  if not found or v_i.revoked_at is not null or v_i.expires_at <= now() then
    raise exception using errcode='42501',message='CZ403:INVITATION_INVALID';
  end if;
  if not private.b1_profile_controls_actor(p_actor_id,auth.uid()) then
    raise exception using errcode='42501',message='CZ403:ACTOR_CONTROL_REQUIRED';
  end if;
  select * into v_actor from public.actors where id=p_actor_id;
  if v_actor.kind <> 'PERSON' then raise exception using errcode='42501',message='CZ403:PERSON_ACTOR_REQUIRED'; end if;
  if char_length(trim(coalesce(p_consent_statement,''))) < 10 then
    raise exception using errcode='22023',message='CZ422:CONSENT_STATEMENT_REQUIRED';
  end if;
  v_payload:=jsonb_build_object('invitation_id',v_i.id,'consent_statement',trim(p_consent_statement));
  select replayed,saved_result into v_replayed,v_result from private.b1_begin_command(
    v_i.cell_id,p_actor_id,p_command_id,p_idempotency_key,'participation.accept',v_payload);
  if v_replayed then return v_result; end if;
  if exists(select 1 from public.cell_consents where invitation_id=v_i.id) then
    raise exception using errcode='P0001',message='CZ409:INVITATION_ALREADY_ACCEPTED';
  end if;
  select current_policy_version_id into v_policy from public.cells where id=v_i.cell_id;
  insert into public.cell_consents(cell_id,invitation_id,actor_id,statement,policy_version_id)
  values(v_i.cell_id,v_i.id,p_actor_id,trim(p_consent_statement),v_policy) returning id into v_consent;
  insert into public.cell_participations(cell_id,actor_id,consent_id)
  values(v_i.cell_id,p_actor_id,v_consent) returning id into v_participation;
  perform private.b1_record_event(v_i.cell_id,'CELL_PARTICIPATION_JOINED','CELL_PARTICIPATION',v_participation,
    'CELL_PARTICIPATION',v_participation,p_actor_id,'participation.leave','CELL',v_i.cell_id,p_command_id,null,1,
    'PROJECT',jsonb_build_object('invitation_id',v_i.id,'consent_id',v_consent,
      'authority_granted',false,'role_granted',false,'delegation_granted',false));
  v_result:=jsonb_build_object('ok',true,'participation_id',v_participation,'consent_id',v_consent,
    'status','ACTIVE','authority_granted',false);
  perform private.b1_finish_command(p_actor_id,p_idempotency_key,v_result); return v_result;
end $$;

create or replace function public.k002_leave_cell_participation(
  p_actor_id uuid,p_participation_id uuid,p_command_id uuid,p_idempotency_key text
) returns jsonb language plpgsql security definer set search_path=public,private,pg_temp as $$
declare v_p public.cell_participations%rowtype; v_replayed boolean; v_result jsonb;
begin
  select * into v_p from public.cell_participations where id=p_participation_id;
  if not found then raise exception using errcode='P0001',message='CZ404:PARTICIPATION_NOT_FOUND'; end if;
  if v_p.actor_id<>p_actor_id then raise exception using errcode='42501',message='CZ403:PARTICIPANT_REQUIRED'; end if;
  if not private.b1_profile_controls_actor(p_actor_id,auth.uid()) then
    raise exception using errcode='42501',message='CZ403:ACTOR_CONTROL_REQUIRED';
  end if;
  select replayed,saved_result into v_replayed,v_result from private.b1_begin_command(v_p.cell_id,p_actor_id,
    p_command_id,p_idempotency_key,'participation.leave',jsonb_build_object('participation_id',p_participation_id));
  if v_replayed then return v_result; end if;
  update public.cell_participations set status='LEFT',left_at=now(),material_version=material_version+1,updated_at=now()
  where id=p_participation_id and status='ACTIVE';
  if not found then raise exception using errcode='P0001',message='CZ409:PARTICIPATION_NOT_ACTIVE'; end if;
  perform private.b1_record_event(v_p.cell_id,'CELL_PARTICIPATION_LEFT','CELL_PARTICIPATION',v_p.id,
    'CELL_PARTICIPATION',v_p.id,p_actor_id,'participation.leave','CELL',v_p.cell_id,p_command_id,1,2,'PROJECT','{}');
  v_result:=jsonb_build_object('ok',true,'participation_id',v_p.id,'status','LEFT');
  perform private.b1_finish_command(p_actor_id,p_idempotency_key,v_result); return v_result;
end $$;

alter table public.cell_invitations enable row level security;
alter table public.cell_consents enable row level security;
alter table public.cell_participations enable row level security;
create policy k002_policy_versions_read on public.policy_versions for select to authenticated using (
  private.b1_current_profile_has_cell_access(cell_id));
create policy cell_invitations_read on public.cell_invitations for select to authenticated using (
  private.b1_current_profile_controls_actor(invited_by_actor_id) or private.b1_current_profile_has_cell_access(cell_id));
create policy cell_consents_read on public.cell_consents for select to authenticated using (
  private.b1_current_profile_controls_actor(actor_id) or private.b1_current_profile_has_cell_access(cell_id));
create policy cell_participations_read on public.cell_participations for select to authenticated using (
  private.b1_current_profile_controls_actor(actor_id) or private.b1_current_profile_has_cell_access(cell_id));

revoke all on public.cell_invitations,public.cell_consents,public.cell_participations from anon,authenticated;
grant select on public.cell_invitations,public.cell_consents,public.cell_participations to authenticated;
grant select on public.policy_versions to authenticated;
revoke all on function private.k002_token_hash(text) from public;
revoke all on function public.k002_create_cell_invitation(uuid,uuid,text,text,timestamptz,uuid,text) from public;
revoke all on function public.k002_revoke_cell_invitation(uuid,uuid,uuid,text) from public;
revoke all on function public.k002_accept_cell_invitation(uuid,text,text,uuid,text) from public;
revoke all on function public.k002_leave_cell_participation(uuid,uuid,uuid,text) from public;
grant execute on function public.k002_create_cell_invitation(uuid,uuid,text,text,timestamptz,uuid,text) to authenticated;
grant execute on function public.k002_revoke_cell_invitation(uuid,uuid,uuid,text) to authenticated;
grant execute on function public.k002_accept_cell_invitation(uuid,text,text,uuid,text) to authenticated;
grant execute on function public.k002_leave_cell_participation(uuid,uuid,uuid,text) to authenticated;

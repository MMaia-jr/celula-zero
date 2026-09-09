-- K002 Wave 1: references only. Actor != Wallet; TreasuryReference != custody.
-- No keys, mnemonics, seeds, proof messages/signatures, or provider credentials are stored.

create table public.wallet_bindings (
  id uuid primary key default gen_random_uuid(),
  cell_id uuid not null references public.cells(id) on delete restrict,
  actor_id uuid not null references public.actors(id) on delete restrict,
  chain_namespace text not null check (chain_namespace ~ '^[a-z0-9][a-z0-9._-]{1,31}$'),
  chain_reference text not null check (char_length(trim(chain_reference)) between 1 and 80),
  address text not null check (char_length(trim(address)) between 3 and 200),
  verification_method text not null check (verification_method in ('DECLARED','LOCALLY_VERIFIED_PROOF')),
  proof_verified_at timestamptz,
  status text not null default 'ACTIVE' check (status in ('ACTIVE','REVOKED')),
  revoked_at timestamptz,
  material_version integer not null default 1 check (material_version > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (cell_id,chain_namespace,chain_reference,address),
  check ((verification_method='DECLARED' and proof_verified_at is null) or
         (verification_method='LOCALLY_VERIFIED_PROOF' and proof_verified_at is not null)),
  check ((status='ACTIVE' and revoked_at is null) or (status='REVOKED' and revoked_at is not null))
);

create table public.treasury_references (
  id uuid primary key default gen_random_uuid(),
  cell_id uuid not null references public.cells(id) on delete restrict,
  label text not null check (char_length(trim(label)) between 2 and 120),
  chain_namespace text not null check (chain_namespace ~ '^[a-z0-9][a-z0-9._-]{1,31}$'),
  chain_reference text not null check (char_length(trim(chain_reference)) between 1 and 80),
  address text not null check (char_length(trim(address)) between 3 and 200),
  reference_kind text not null check (reference_kind in ('EOA','CONTRACT','SAFE_REFERENCE','OTHER')),
  created_by_actor_id uuid not null references public.actors(id) on delete restrict,
  status text not null default 'ACTIVE' check (status in ('ACTIVE','RETIRED')),
  retired_at timestamptz,
  material_version integer not null default 1 check (material_version > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(cell_id,chain_namespace,chain_reference,address),
  check ((status='ACTIVE' and retired_at is null) or (status='RETIRED' and retired_at is not null))
);

create trigger wallet_bindings_no_delete before delete on public.wallet_bindings
for each row execute function private.prevent_append_only_mutation();
create trigger treasury_references_no_delete before delete on public.treasury_references
for each row execute function private.prevent_append_only_mutation();

insert into public.capability_definitions(code,description) values
 ('wallet.bind','Bind or revoke a public wallet reference for a controlled Actor; grants no authority.'),
 ('treasury.reference','Record or retire a treasury address reference without custody or signing authority.')
on conflict(code) do nothing;
insert into public.role_capabilities(role_id,capability_code)
select id,'wallet.bind' from public.role_definitions on conflict do nothing;
insert into public.role_capabilities(role_id,capability_code) values
 ('00000000-0000-4000-8000-00000000c201','treasury.reference') on conflict do nothing;

create or replace function private.k002_reject_secret_fields(p_value jsonb)
returns void language plpgsql immutable set search_path=pg_catalog,pg_temp as $$
begin
  if p_value ?| array['private_key','privateKey','mnemonic','seed','seed_phrase','secret','signature','message','proof','credential','credentials'] then
    raise exception using errcode='22023',message='CZ422:SECRET_OR_PROOF_MATERIAL_FORBIDDEN';
  end if;
end $$;

create or replace function public.k002_bind_wallet(
 p_actor_id uuid,p_cell_id uuid,p_chain_namespace text,p_chain_reference text,p_address text,
 p_verification_method text,p_proof_verified_at timestamptz,p_command_id uuid,p_idempotency_key text
) returns jsonb language plpgsql security definer set search_path=public,private,pg_temp as $$
declare v_replayed boolean;v_result jsonb;v_id uuid;v_payload jsonb;
begin
 perform private.b1_authorize_actor(p_actor_id,'wallet.bind','CELL',p_cell_id);
 if p_verification_method not in ('DECLARED','LOCALLY_VERIFIED_PROOF') then
  raise exception using errcode='22023',message='CZ422:INVALID_WALLET_VERIFICATION_METHOD'; end if;
 if (p_verification_method='DECLARED')<>(p_proof_verified_at is null) then
  raise exception using errcode='22023',message='CZ422:WALLET_PROOF_STATE_MISMATCH'; end if;
 v_payload:=jsonb_build_object('cell_id',p_cell_id,'chain_namespace',lower(trim(p_chain_namespace)),
  'chain_reference',trim(p_chain_reference),'address',trim(p_address),
  'verification_method',p_verification_method,'proof_verified_at',p_proof_verified_at);
 perform private.k002_reject_secret_fields(v_payload);
 select replayed,saved_result into v_replayed,v_result from private.b1_begin_command(
  p_cell_id,p_actor_id,p_command_id,p_idempotency_key,'wallet.bind',v_payload);
 if v_replayed then return v_result; end if;
 insert into public.wallet_bindings(cell_id,actor_id,chain_namespace,chain_reference,address,verification_method,proof_verified_at)
 values(p_cell_id,p_actor_id,lower(trim(p_chain_namespace)),trim(p_chain_reference),trim(p_address),p_verification_method,p_proof_verified_at)
 returning id into v_id;
 perform private.b1_record_event(p_cell_id,'WALLET_BOUND','WALLET_BINDING',v_id,'WALLET_BINDING',v_id,
  p_actor_id,'wallet.bind','CELL',p_cell_id,p_command_id,null,1,'PROJECT',
  jsonb_build_object('actor_id',p_actor_id,'verification_method',p_verification_method,
   'role_granted',false,'delegation_granted',false,'economic_right_granted',false));
 v_result:=jsonb_build_object('ok',true,'wallet_binding_id',v_id,'status','ACTIVE','authority_granted',false);
 perform private.b1_finish_command(p_actor_id,p_idempotency_key,v_result);return v_result;
end $$;

create or replace function public.k002_revoke_wallet_binding(
 p_actor_id uuid,p_wallet_binding_id uuid,p_command_id uuid,p_idempotency_key text
) returns jsonb language plpgsql security definer set search_path=public,private,pg_temp as $$
declare v_w public.wallet_bindings%rowtype;v_replayed boolean;v_result jsonb;
begin
 select * into v_w from public.wallet_bindings where id=p_wallet_binding_id;
 if not found then raise exception using errcode='P0001',message='CZ404:WALLET_BINDING_NOT_FOUND';end if;
 if v_w.actor_id<>p_actor_id then raise exception using errcode='42501',message='CZ403:BOUND_ACTOR_REQUIRED';end if;
 perform private.b1_authorize_actor(p_actor_id,'wallet.bind','CELL',v_w.cell_id);
 select replayed,saved_result into v_replayed,v_result from private.b1_begin_command(v_w.cell_id,p_actor_id,
  p_command_id,p_idempotency_key,'wallet.revoke',jsonb_build_object('wallet_binding_id',p_wallet_binding_id));
 if v_replayed then return v_result;end if;
 update public.wallet_bindings set status='REVOKED',revoked_at=now(),material_version=material_version+1,updated_at=now()
 where id=v_w.id and status='ACTIVE';
 if not found then raise exception using errcode='P0001',message='CZ409:WALLET_BINDING_NOT_ACTIVE';end if;
 perform private.b1_record_event(v_w.cell_id,'WALLET_BINDING_REVOKED','WALLET_BINDING',v_w.id,'WALLET_BINDING',v_w.id,
  p_actor_id,'wallet.bind','CELL',v_w.cell_id,p_command_id,1,2,'PROJECT','{}');
 v_result:=jsonb_build_object('ok',true,'wallet_binding_id',v_w.id,'status','REVOKED');
 perform private.b1_finish_command(p_actor_id,p_idempotency_key,v_result);return v_result;
end $$;

create or replace function public.k002_create_treasury_reference(
 p_actor_id uuid,p_cell_id uuid,p_label text,p_chain_namespace text,p_chain_reference text,p_address text,
 p_reference_kind text,p_command_id uuid,p_idempotency_key text
) returns jsonb language plpgsql security definer set search_path=public,private,pg_temp as $$
declare v_replayed boolean;v_result jsonb;v_id uuid;v_payload jsonb;
begin
 perform private.b1_authorize_actor(p_actor_id,'treasury.reference','CELL',p_cell_id);
 v_payload:=jsonb_build_object('cell_id',p_cell_id,'label',trim(p_label),'chain_namespace',lower(trim(p_chain_namespace)),
  'chain_reference',trim(p_chain_reference),'address',trim(p_address),'reference_kind',p_reference_kind);
 perform private.k002_reject_secret_fields(v_payload);
 select replayed,saved_result into v_replayed,v_result from private.b1_begin_command(
  p_cell_id,p_actor_id,p_command_id,p_idempotency_key,'treasury.reference.create',v_payload);
 if v_replayed then return v_result;end if;
 insert into public.treasury_references(cell_id,label,chain_namespace,chain_reference,address,reference_kind,created_by_actor_id)
 values(p_cell_id,trim(p_label),lower(trim(p_chain_namespace)),trim(p_chain_reference),trim(p_address),p_reference_kind,p_actor_id)
 returning id into v_id;
 perform private.b1_record_decision(p_cell_id,'TREASURY_REFERENCE_CREATE','ALLOW','TREASURY_REFERENCE',v_id,p_actor_id,
  'treasury.reference','CELL',p_cell_id,'authorized reference recording; no custody or signing authority',p_command_id);
 perform private.b1_record_event(p_cell_id,'TREASURY_REFERENCE_CREATED','TREASURY_REFERENCE',v_id,'TREASURY_REFERENCE',v_id,
  p_actor_id,'treasury.reference','CELL',p_cell_id,p_command_id,null,1,'PROJECT',
  jsonb_build_object('custody_granted',false,'signing_authority_granted',false,'safe_created',false));
 v_result:=jsonb_build_object('ok',true,'treasury_reference_id',v_id,'status','ACTIVE',
  'custody_granted',false,'signing_authority_granted',false);
 perform private.b1_finish_command(p_actor_id,p_idempotency_key,v_result);return v_result;
end $$;

alter table public.wallet_bindings enable row level security;
alter table public.treasury_references enable row level security;
create policy wallet_bindings_read on public.wallet_bindings for select to authenticated using(
 private.b1_current_profile_controls_actor(actor_id) or private.b1_current_profile_has_cell_access(cell_id));
create policy treasury_references_read on public.treasury_references for select to authenticated using(
 private.b1_current_profile_has_cell_access(cell_id));
revoke all on public.wallet_bindings,public.treasury_references from anon,authenticated;
grant select on public.wallet_bindings,public.treasury_references to authenticated;
revoke all on function private.k002_reject_secret_fields(jsonb) from public;
revoke all on function public.k002_bind_wallet(uuid,uuid,text,text,text,text,timestamptz,uuid,text) from public;
revoke all on function public.k002_revoke_wallet_binding(uuid,uuid,uuid,text) from public;
revoke all on function public.k002_create_treasury_reference(uuid,uuid,text,text,text,text,text,uuid,text) from public;
grant execute on function public.k002_bind_wallet(uuid,uuid,text,text,text,text,timestamptz,uuid,text) to authenticated;
grant execute on function public.k002_revoke_wallet_binding(uuid,uuid,uuid,text) to authenticated;
grant execute on function public.k002_create_treasury_reference(uuid,uuid,text,text,text,text,text,uuid,text) to authenticated;

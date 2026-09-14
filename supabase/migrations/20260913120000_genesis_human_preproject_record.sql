-- GENESIS-HUMAN-PREPROJECT-RECORD-N1
-- A Human may speak before a Project exists. These records are attributed to
-- an existing PERSON but are not identity, truth, interpretation, adoption,
-- claim, or Project state.

create table public.preproject_records (
  id uuid primary key default gen_random_uuid(),
  owner_actor_id uuid not null references public.actors(id) on delete restrict,
  record_class text not null
    check (record_class in ('ORIGINAL_RECORD', 'SOURCE_MATERIAL')),
  content text not null check (octet_length(convert_to(content, 'UTF8')) between 1 and 65536),
  content_sha256 text not null check (content_sha256 ~ '^[0-9a-f]{64}$'),
  provenance jsonb not null default '{}'::jsonb
    check (jsonb_typeof(provenance) = 'object'),
  visibility text not null default 'PRIVATE' check (visibility = 'PRIVATE'),
  created_at timestamptz not null default now()
);

create index preproject_records_owner_created
  on public.preproject_records(owner_actor_id, created_at, id);

create trigger preproject_records_append_only
before update or delete on public.preproject_records
for each row execute function private.prevent_append_only_mutation();

alter table public.preproject_records enable row level security;

revoke all on public.preproject_records from public, anon, authenticated;
grant select on public.preproject_records to authenticated;

create policy preproject_records_owner_read
on public.preproject_records
for select to authenticated
using (
  exists (
    select 1
    from public.actor_memberships am
    join public.actors a on a.id = am.actor_id
    where am.actor_id = preproject_records.owner_actor_id
      and am.profile_id = auth.uid()
      and am.role in ('OWNER', 'REPRESENTATIVE')
      and a.kind = 'PERSON'
  )
);

create or replace function public.record_preproject_human_text(
  p_actor_id uuid,
  p_record_class text,
  p_content text,
  p_provenance jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public, private, extensions, pg_temp
as $$
declare
  v_profile_id uuid := auth.uid();
  v_record_id uuid;
  v_digest text;
  v_created_at timestamptz;
begin
  if v_profile_id is null then
    raise exception using errcode = '42501', message = 'CZ401:AUTHENTICATION_REQUIRED';
  end if;

  if not exists (
    select 1
    from public.actor_memberships am
    join public.actors a on a.id = am.actor_id
    where am.actor_id = p_actor_id
      and am.profile_id = v_profile_id
      and am.role in ('OWNER', 'REPRESENTATIVE')
      and a.kind = 'PERSON'
  ) then
    raise exception using errcode = '42501', message = 'CZ403:CONTROLLED_PERSON_REQUIRED';
  end if;

  if p_record_class not in ('ORIGINAL_RECORD', 'SOURCE_MATERIAL') then
    raise exception using errcode = '22023', message = 'CZ422:INVALID_PREPROJECT_RECORD_CLASS';
  end if;
  if p_content is null or octet_length(convert_to(p_content, 'UTF8')) not between 1 and 65536 then
    raise exception using errcode = '22023', message = 'CZ422:INVALID_PREPROJECT_RECORD_CONTENT';
  end if;
  if p_provenance is null or jsonb_typeof(p_provenance) <> 'object' then
    raise exception using errcode = '22023', message = 'CZ422:INVALID_PREPROJECT_PROVENANCE';
  end if;

  v_digest := encode(extensions.digest(convert_to(p_content, 'UTF8'), 'sha256'), 'hex');
  insert into public.preproject_records(
    owner_actor_id, record_class, content, content_sha256, provenance, visibility
  ) values (
    p_actor_id, p_record_class, p_content, v_digest, p_provenance, 'PRIVATE'
  ) returning id, created_at into v_record_id, v_created_at;

  return jsonb_build_object(
    'ok', true,
    'record_id', v_record_id,
    'owner_actor_id', p_actor_id,
    'record_class', p_record_class,
    'content_sha256', v_digest,
    'visibility', 'PRIVATE',
    'created_at', v_created_at
  );
end;
$$;

revoke all on function public.record_preproject_human_text(uuid, text, text, jsonb)
  from public, anon;
grant execute on function public.record_preproject_human_text(uuid, text, text, jsonb)
  to authenticated;

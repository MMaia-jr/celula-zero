begin;
create extension if not exists pgtap with schema extensions;
select no_plan();
select has_table('public','cell_invitations','Invitation is distinct');
select has_table('public','cell_consents','Consent is distinct');
select has_table('public','cell_participations','Participation is distinct');
select has_function('public','k002_accept_cell_invitation',array['uuid','text','text','uuid','text'],'acceptance command exists');
select is((select count(*) from pg_constraint where conrelid='public.cell_consents'::regclass and contype='u' and pg_get_constraintdef(oid)='UNIQUE (invitation_id)'),1::bigint,'one consent record is allowed per invitation');
select is((select count(*) from pg_constraint where conrelid='public.cell_consents'::regclass and contype='u' and pg_get_constraintdef(oid) like 'UNIQUE (cell_id, actor_id%'),0::bigint,'consent history is not falsely limited to one record per actor per Cell');
select is((select count(*) from pg_constraint where conrelid='public.cell_participations'::regclass and contype='u' and pg_get_constraintdef(oid)='UNIQUE (cell_id, actor_id)'),1::bigint,'participation, separately from consent, is unique per actor per Cell');

insert into auth.users(id,aud,role,email,raw_app_meta_data,raw_user_meta_data,created_at,updated_at) values
 ('92000000-0000-4000-8000-000000000001','authenticated','authenticated','k2-inviter@test','{}','{"name":"K2 Inviter"}',now(),now()),
 ('92000000-0000-4000-8000-000000000002','authenticated','authenticated','k2-recipient@test','{}','{"name":"K2 Recipient"}',now(),now());
create temporary table k2p(k text primary key,u uuid,j jsonb,n bigint);
insert into k2p(k,u) select 'inviter',actor_id from public.actor_memberships where profile_id='92000000-0000-4000-8000-000000000001';
insert into k2p(k,u) select 'recipient',actor_id from public.actor_memberships where profile_id='92000000-0000-4000-8000-000000000002';
insert into public.role_assignments(cell_id,actor_id,role_id,scope_type,scope_id,policy_version_id,granted_by_actor_id)
values('00000000-0000-4000-8000-00000000c001',(select u from k2p where k='inviter'),'00000000-0000-4000-8000-00000000c201','CELL','00000000-0000-4000-8000-00000000c001','00000000-0000-4000-8000-00000000c101',(select u from k2p where k='inviter'));
select set_config('request.jwt.claim.sub','92000000-0000-4000-8000-000000000001',true);
insert into k2p(k,j) select 'invite',public.k002_create_cell_invitation((select u from k2p where k='inviter'),'00000000-0000-4000-8000-00000000c001','One intended person','Explicit invitation for bounded Cell participation.',now()+interval '1 day','92000000-0000-4000-8000-000000000101','k2-participation-invite');
select is(length((select j->>'bearer_token' from k2p where k='invite')),64,'bearer token is 256-bit hex');
select ok(not exists(select 1 from public.cell_invitations where token_hash=(select j->>'bearer_token' from k2p where k='invite')),'raw bearer token is not persisted');
select ok(not exists(select 1 from public.command_receipts where result::text like '%'||(select j->>'bearer_token' from k2p where k='invite')||'%'),'raw bearer token is absent from command receipts');
insert into k2p(k,n) select 'roles_before',count(*) from public.role_assignments where actor_id=(select u from k2p where k='recipient');
insert into k2p(k,n) select 'delegations_before',count(*) from public.delegations where delegate_actor_id=(select u from k2p where k='recipient');
insert into k2p(k,n) select 'members_before',count(*) from public.project_members where actor_id=(select u from k2p where k='recipient');
select set_config('request.jwt.claim.sub','92000000-0000-4000-8000-000000000002',true);
insert into k2p(k,j) select 'accept',public.k002_accept_cell_invitation((select u from k2p where k='recipient'),(select j->>'bearer_token' from k2p where k='invite'),'I explicitly consent to bounded Cell participation.','92000000-0000-4000-8000-000000000102','k2-participation-accept');
select is((select j->>'authority_granted' from k2p where k='accept'),'false','acceptance reports zero authority');
select is((select count(*) from public.role_assignments where actor_id=(select u from k2p where k='recipient')),(select n from k2p where k='roles_before'),'acceptance grants no role');
select is((select count(*) from public.delegations where delegate_actor_id=(select u from k2p where k='recipient')),(select n from k2p where k='delegations_before'),'acceptance grants no delegation');
select is((select count(*) from public.project_members where actor_id=(select u from k2p where k='recipient')),(select n from k2p where k='members_before'),'acceptance grants no project membership');
select is((select status from public.cell_participations where id=((select j->>'participation_id' from k2p where k='accept')::uuid)),'ACTIVE','participation is explicit and active');
select throws_ok(format('select public.k002_accept_cell_invitation(%L::uuid,%L,%L,gen_random_uuid(),%L)',(select u from k2p where k='recipient'),'f'||repeat('0',63),'Explicit consent statement.','k2-invalid-token'),'CZ403:INVITATION_INVALID','unknown bearer fails closed');
select * from finish();
rollback;

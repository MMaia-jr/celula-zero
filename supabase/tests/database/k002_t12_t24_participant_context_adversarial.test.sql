begin;

create extension if not exists pgtap with schema extensions;
select no_plan();

insert into auth.users(id,aud,role,email,raw_app_meta_data,raw_user_meta_data,created_at,updated_at) values
('94000000-0000-4000-8000-000000000001','authenticated','authenticated','k002-boundary-recipient@test','{}','{"name":"K002 Recipient"}',now(),now()),
('94000000-0000-4000-8000-000000000002','authenticated','authenticated','k002-boundary-other@test','{}','{"name":"K002 Other"}',now(),now());

create temporary table k002_boundary(k text primary key,u uuid,j jsonb);
grant select on k002_boundary to authenticated;
insert into k002_boundary(k,u)
select 'recipient_actor',actor_id from public.actor_memberships where profile_id='94000000-0000-4000-8000-000000000001' order by created_at,actor_id limit 1;
insert into k002_boundary(k,u)
select 'other_actor',actor_id from public.actor_memberships where profile_id='94000000-0000-4000-8000-000000000002' order by created_at,actor_id limit 1;

insert into public.cell_invitations(id,cell_id,invited_by_actor_id,intended_for,purpose,token_hash,expires_at) values
('94000000-0000-4000-8000-000000000101','00000000-0000-4000-8000-00000000c001','00000000-0000-4000-8000-000000000001','K002 recipient','Bounded participant context hardening fixture without authority grant.',repeat('a',64),now()+interval '1 day');
insert into public.cell_consents(id,cell_id,invitation_id,actor_id,statement,policy_version_id) values
('94000000-0000-4000-8000-000000000102','00000000-0000-4000-8000-00000000c001','94000000-0000-4000-8000-000000000101',(select u from k002_boundary where k='recipient_actor'),'I consent to the bounded participant hardening fixture.','00000000-0000-4000-8000-00000000c101');
insert into public.cell_participations(id,cell_id,actor_id,consent_id,status) values
('94000000-0000-4000-8000-000000000103','00000000-0000-4000-8000-00000000c001',(select u from k002_boundary where k='recipient_actor'),'94000000-0000-4000-8000-000000000102','ACTIVE');

insert into public.projects(id,cell_id,slug,title,summary,current_intent,steward_actor_id,stage,visibility,economic_regime,intended_result,rules_and_limits,needs,source_label,version,published_at) values
('94000000-0000-4000-8000-000000000201','00000000-0000-4000-8000-00000000c001','k002-boundary-public-active','K002 boundary public active','Public project allowed in bounded participant projection.','Only canonically public live project metadata may cross the boundary.','00000000-0000-4000-8000-000000000001','OPEN','PUBLIC','VOLUNTARY','Visible public metadata only.','No authority follows from visibility.',array['projection'],'DEMO / SYNTHETIC',1,now()),
('94000000-0000-4000-8000-000000000202','00000000-0000-4000-8000-00000000c001','k002-boundary-public-archived','K002-ARCHIVED-MARKER','Archived public project excluded from live projection.','Archived context must not cross the participant projection.','00000000-0000-4000-8000-000000000001','COMPLETED','PUBLIC','VOLUNTARY','Remain absent from live context.','Archived means excluded here.',array['archive'],'DEMO / SYNTHETIC',1,now()),
('94000000-0000-4000-8000-000000000203','00000000-0000-4000-8000-00000000c001','k002-boundary-private','K002-PRIVATE-MARKER','Private project excluded from participant projection.','Participation alone must not create project access.','00000000-0000-4000-8000-000000000001','OPEN','PRIVATE','VOLUNTARY','Remain private.','Participation is not project access.',array['privacy'],'DEMO / SYNTHETIC',1,null);
update public.projects set archived_at=now() where id='94000000-0000-4000-8000-000000000202';

select set_config('request.jwt.claim.sub','94000000-0000-4000-8000-000000000001',true);
insert into k002_boundary(k,j)
select 'context',public.k002_get_participant_cell_context((select u from k002_boundary where k='recipient_actor'),'94000000-0000-4000-8000-000000000103');

select is((select count(*)::bigint from jsonb_array_elements((select j->'projects' from k002_boundary where k='context')) p where p->>'id'='94000000-0000-4000-8000-000000000201'),1::bigint,'active PUBLIC project is projected');
select is((select count(*)::bigint from jsonb_array_elements((select j->'projects' from k002_boundary where k='context')) p where p->>'id'='94000000-0000-4000-8000-000000000202'),0::bigint,'archived PUBLIC project is excluded');
select ok(position('K002-PRIVATE-MARKER' in (select j::text from k002_boundary where k='context'))=0,'PRIVATE project marker never crosses projection');
select ok(position('K002-ARCHIVED-MARKER' in (select j::text from k002_boundary where k='context'))=0,'archived marker never crosses projection');

set local role authenticated;
select is((select count(*)::bigint from public.cells where id='00000000-0000-4000-8000-00000000c001'),0::bigint,'CellParticipation alone does not grant Cell read access');
select is((select count(*)::bigint from public.policy_versions where id='00000000-0000-4000-8000-00000000c101'),0::bigint,'CellParticipation alone does not expose policy rules');
select is((select count(*)::bigint from public.role_assignments where cell_id='00000000-0000-4000-8000-00000000c001'),0::bigint,'CellParticipation alone does not expose Cell role assignments');
select throws_ok(format('select public.k002_create_cell_invitation(%L::uuid,%L::uuid,%L,%L,now()+interval ''1 day'',%L::uuid,%L)',(select u from k002_boundary where k='recipient_actor'),'00000000-0000-4000-8000-00000000c001','Unauthorized target','Participation-only actor must not gain Cell invitation authority.','94000000-0000-4000-8000-000000000301','k002-boundary-no-admin'),'42501','CZ403:CAPABILITY_DENIED','CellParticipation alone cannot administer invitations');
reset role;

-- A controlled non-PERSON Actor must still fail the participant-context RPC.
insert into public.actors(id,kind,name) values ('94000000-0000-4000-8000-000000000401','ORGANIZATION','K002 controlled organization');
insert into public.actor_memberships(actor_id,profile_id,role) values ('94000000-0000-4000-8000-000000000401','94000000-0000-4000-8000-000000000001','REPRESENTATIVE');
insert into public.cell_invitations(id,cell_id,invited_by_actor_id,intended_for,purpose,token_hash,expires_at) values
('94000000-0000-4000-8000-000000000402','00000000-0000-4000-8000-00000000c001','00000000-0000-4000-8000-000000000001','Organization fixture','Non-PERSON participation fixture used only to verify fail-closed RPC semantics.',repeat('b',64),now()+interval '1 day');
insert into public.cell_consents(id,cell_id,invitation_id,actor_id,statement,policy_version_id) values
('94000000-0000-4000-8000-000000000403','00000000-0000-4000-8000-00000000c001','94000000-0000-4000-8000-000000000402','94000000-0000-4000-8000-000000000401','I represent this organization for the fixture only.','00000000-0000-4000-8000-00000000c101');
insert into public.cell_participations(id,cell_id,actor_id,consent_id,status) values
('94000000-0000-4000-8000-000000000404','00000000-0000-4000-8000-00000000c001','94000000-0000-4000-8000-000000000401','94000000-0000-4000-8000-000000000403','ACTIVE');
select throws_ok($$select public.k002_get_participant_cell_context('94000000-0000-4000-8000-000000000401'::uuid,'94000000-0000-4000-8000-000000000404'::uuid)$$,'42501','CZ403:PERSON_ACTOR_REQUIRED','non-PERSON Actor cannot use PERSON participant context');

-- Another authenticated profile cannot leave the recipient participation.
select set_config('request.jwt.claim.sub','94000000-0000-4000-8000-000000000002',true);
set local role authenticated;
select throws_ok(format('select public.k002_leave_cell_participation(%L::uuid,%L::uuid,%L::uuid,%L)',(select u from k002_boundary where k='recipient_actor'),'94000000-0000-4000-8000-000000000103','94000000-0000-4000-8000-000000000302','k002-boundary-unauthorized-leave'),'42501','CZ403:ACTOR_CONTROL_REQUIRED','another profile cannot leave the recipient participation');
reset role;

select set_config('request.jwt.claim.sub','94000000-0000-4000-8000-000000000001',true);
set local role authenticated;
select lives_ok(format('select public.k002_leave_cell_participation(%L::uuid,%L::uuid,%L::uuid,%L)',(select u from k002_boundary where k='recipient_actor'),'94000000-0000-4000-8000-000000000103','94000000-0000-4000-8000-000000000303','k002-boundary-leave'),'owner can leave own participation');
select throws_ok(format('select public.k002_get_participant_cell_context(%L::uuid,%L::uuid)',(select u from k002_boundary where k='recipient_actor'),'94000000-0000-4000-8000-000000000103'),'42501','CZ403:ACTIVE_PARTICIPATION_REQUIRED','participant context fails closed after leave');
select is((select count(*)::bigint from public.cell_participations where id='94000000-0000-4000-8000-000000000103' and status='LEFT'),1::bigint,'historical participation remains readable after leave');
select is((select count(*)::bigint from public.cell_consents where id='94000000-0000-4000-8000-000000000102'),1::bigint,'historical consent remains readable after leave');
reset role;

-- Not decided here: invitation revocation != participation revocation.
-- Administrative revocation and retention/deletion remain Human-policy gates.
select * from finish();
rollback;

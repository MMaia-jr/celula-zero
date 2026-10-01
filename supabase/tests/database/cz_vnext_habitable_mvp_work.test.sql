begin;
create extension if not exists pgtap with schema extensions;
select plan(13);

select has_table('public', 'cz_vnext_work_items', 'conversation work has one normalized Cell projection');
select has_column('public', 'cz_vnext_work_items', 'person_actor_id', 'work attribution keeps Person distinct from Profile');
select has_column('public', 'cz_vnext_work_items', 'source_message_id', 'work links to its initiating human message');
select ok((select relrowsecurity from pg_class where oid='public.cz_vnext_work_items'::regclass), 'work reads use RLS');
select is((select count(*)::integer from pg_policies where schemaname='public' and tablename='cz_vnext_work_items'), 1, 'only owner-bound work read policy exists');
select ok(has_table_privilege('authenticated', 'public.cz_vnext_work_items', 'SELECT'), 'authenticated reads are scoped by RLS');
select ok(not has_table_privilege('authenticated', 'public.cz_vnext_work_items', 'INSERT'), 'clients cannot write work directly');
select ok(not has_table_privilege('authenticated', 'public.cz_vnext_work_items', 'UPDATE'), 'clients cannot change work directly');
select ok(not has_table_privilege('authenticated', 'public.cz_vnext_work_items', 'DELETE'), 'clients cannot delete work directly');
select has_function('public', 'cz_vnext_mvp_work', array['text','uuid','text','text','text','uuid'], 'work writes resolve the authenticated Person and Cell in RPC');
select ok(has_function_privilege('authenticated', 'public.cz_vnext_mvp_work(text,uuid,text,text,text,uuid)', 'EXECUTE'), 'authenticated work actions use the checked RPC');
select ok(not has_function_privilege('anon', 'public.cz_vnext_mvp_work(text,uuid,text,text,text,uuid)', 'EXECUTE'), 'anonymous callers cannot write work');
set local role anon;
select throws_ok($$select public.cz_vnext_mvp_work('create', null, 'x', '', 'open', gen_random_uuid())$$, '42501', null, 'anonymous work creation is rejected');

rollback;

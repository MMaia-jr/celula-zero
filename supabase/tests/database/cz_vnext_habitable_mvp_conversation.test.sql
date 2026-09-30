begin;
create extension if not exists pgtap with schema extensions;
select plan(18);

select has_table('public', 'cz_vnext_threads', 'continuing conversation threads are normalized');
select has_table('public', 'cz_vnext_messages', 'attributable messages are normalized');
select ok((select relrowsecurity from pg_class where oid='public.cz_vnext_threads'::regclass), 'thread reads use RLS');
select ok((select relrowsecurity from pg_class where oid='public.cz_vnext_messages'::regclass), 'message reads use RLS');
select is((select count(*)::integer from pg_policies where schemaname='public' and tablename='cz_vnext_threads'), 1, 'thread has only owner read policy');
select is((select count(*)::integer from pg_policies where schemaname='public' and tablename='cz_vnext_messages'), 1, 'message has only owner read policy');
select ok(has_table_privilege('authenticated', 'public.cz_vnext_threads', 'SELECT'), 'authenticated users can read their RLS-scoped thread');
select ok(has_table_privilege('authenticated', 'public.cz_vnext_messages', 'SELECT'), 'authenticated users can read their RLS-scoped messages');
select ok(not has_table_privilege('authenticated', 'public.cz_vnext_threads', 'INSERT'), 'clients cannot create threads directly');
select ok(not has_table_privilege('authenticated', 'public.cz_vnext_messages', 'INSERT'), 'clients cannot append messages directly');
select ok(not has_table_privilege('authenticated', 'public.cz_vnext_messages', 'UPDATE'), 'clients cannot rewrite messages');
select ok(not has_table_privilege('authenticated', 'public.cz_vnext_messages', 'DELETE'), 'clients cannot delete messages');
select has_function('public', 'cz_vnext_ensure_mvp_thread', array[]::text[], 'thread resolution takes no client identity or authority');
select has_function('public', 'cz_vnext_append_mvp_message', array['uuid','text','text','text','text','jsonb','text','text','text','integer','integer'], 'message write accepts no client author/authority id');
select has_function('public', 'cz_vnext_update_own_profile', array['text','text'], 'profile edit is an owner-scoped RPC');
select ok(has_function_privilege('authenticated', 'public.cz_vnext_ensure_mvp_thread()', 'EXECUTE'), 'authenticated can resolve own thread through checked RPC');
select ok(has_function_privilege('authenticated', 'public.cz_vnext_append_mvp_message(uuid,text,text,text,text,jsonb,text,text,text,integer,integer)', 'EXECUTE'), 'authenticated can append through checked RPC');
select ok(not has_function_privilege('anon', 'public.cz_vnext_append_mvp_message(uuid,text,text,text,text,jsonb,text,text,text,integer,integer)', 'EXECUTE'), 'anonymous users cannot append messages');

rollback;

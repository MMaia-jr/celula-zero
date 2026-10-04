begin;
create extension if not exists pgtap with schema extensions;
select plan(9);

select has_table('public', 'cz_vnext_original_records', 'private Habitat Original Records table exists');
select ok((select relrowsecurity from pg_class where oid = 'public.cz_vnext_original_records'::regclass), 'Original Records enable RLS');
select is((select count(*)::integer from pg_policies where schemaname='public' and tablename='cz_vnext_original_records' and cmd='SELECT'), 1, 'only owner-bound read policy exists');
select ok(not has_table_privilege('authenticated', 'public.cz_vnext_original_records', 'INSERT'), 'authenticated cannot insert without the checked RPC');
select ok(not has_table_privilege('authenticated', 'public.cz_vnext_original_records', 'UPDATE'), 'authenticated cannot update an Original Record');
select ok(not has_table_privilege('authenticated', 'public.cz_vnext_original_records', 'DELETE'), 'authenticated cannot delete an Original Record');
select has_function('public', 'cz_vnext_habitat_context', array[]::text[], 'context resolution takes no caller-supplied identity');
select has_function('public', 'cz_vnext_record_intention', array['text','uuid'], 'write operation accepts content and retry key, never an actor or authority');
set local role anon;
select throws_ok($$select public.cz_vnext_habitat_context()$$, '42501', null, 'anonymous sessions cannot reconstruct a Habitat context');

rollback;

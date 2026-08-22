#!/usr/bin/env bash
set -euo pipefail

iterations="${B1_CONCURRENCY_ITERATIONS:-10}"
project_id="celula-zero-gate-1"
db_container="$(docker ps \
  --filter "label=com.supabase.cli.project=${project_id}" \
  --filter "name=supabase_db_" \
  --format '{{.ID}}' | head -n 1)"

if [[ -z "$db_container" ]]; then
  echo "FAIL: isolated Supabase database container not found" >&2
  exit 1
fi

sql() {
  docker exec -i "$db_container" psql -X -qAt -v ON_ERROR_STOP=1 -U postgres -d postgres
}

sql <<'SQL' >/dev/null
insert into public.pilot_invites(email, label) values
  ('b1-race-steward@example.test', 'B1 race steward'),
  ('b1-race-a@example.test', 'B1 race proposer A'),
  ('b1-race-b@example.test', 'B1 race proposer B')
on conflict (email) do nothing;

insert into auth.users(id, aud, role, email, raw_app_meta_data, raw_user_meta_data, created_at, updated_at) values
  ('47000000-0000-4000-8000-000000000001', 'authenticated', 'authenticated', 'b1-race-steward@example.test', '{"provider":"email","providers":["email"]}', '{"name":"B1 Race Steward"}', now(), now()),
  ('47000000-0000-4000-8000-000000000002', 'authenticated', 'authenticated', 'b1-race-a@example.test', '{"provider":"email","providers":["email"]}', '{"name":"B1 Race A"}', now(), now()),
  ('47000000-0000-4000-8000-000000000003', 'authenticated', 'authenticated', 'b1-race-b@example.test', '{"provider":"email","providers":["email"]}', '{"name":"B1 Race B"}', now(), now())
on conflict (id) do nothing;

set request.jwt.claim.sub = '47000000-0000-4000-8000-000000000001';
select public.create_project_atomic(
  'Projeto concorrência B1', 'projeto-concorrencia-b1',
  'Projeto isolado para repetir corridas reais do cenário S7.',
  'Preservar um único compromisso mesmo sob aceitações simultâneas.',
  'Executar sessões PostgreSQL concorrentes sobre a mesma oportunidade.',
  'Dez corridas com vencedor único e perdedor tipado.',
  'Sem frontend, fundos, Web3 ou serviço arquitetural adicional.',
  array['concorrência', 'integridade'], 'VOLUNTARY', 'OPEN', true
);

insert into public.role_assignments(
  cell_id, actor_id, role_id, scope_type, scope_id, policy_version_id, granted_by_actor_id
)
select
  '00000000-0000-4000-8000-00000000c001', actor_id,
  case
    when profile_id = '47000000-0000-4000-8000-000000000001' then '00000000-0000-4000-8000-00000000c202'::uuid
    else '00000000-0000-4000-8000-00000000c204'::uuid
  end,
  'PROJECT', (select id from public.projects where slug = 'projeto-concorrencia-b1'),
  '00000000-0000-4000-8000-00000000c101',
  (select actor_id from public.actor_memberships where profile_id = '47000000-0000-4000-8000-000000000001' and role = 'OWNER')
from public.actor_memberships
where profile_id in (
  '47000000-0000-4000-8000-000000000001',
  '47000000-0000-4000-8000-000000000002',
  '47000000-0000-4000-8000-000000000003'
) and role = 'OWNER';
SQL

steward_actor="$(sql <<'SQL'
select actor_id from public.actor_memberships
where profile_id = '47000000-0000-4000-8000-000000000001' and role = 'OWNER';
SQL
)"
actor_a="$(sql <<'SQL'
select actor_id from public.actor_memberships
where profile_id = '47000000-0000-4000-8000-000000000002' and role = 'OWNER';
SQL
)"
actor_b="$(sql <<'SQL'
select actor_id from public.actor_memberships
where profile_id = '47000000-0000-4000-8000-000000000003' and role = 'OWNER';
SQL
)"
project="$(sql <<'SQL'
select id from public.projects where slug = 'projeto-concorrencia-b1';
SQL
)"

for ((i = 1; i <= iterations; i++)); do
  suffix="$(printf '%012d' "$i")"
  opportunity="$(sql <<SQL
set request.jwt.claim.sub = '47000000-0000-4000-8000-000000000001';
select public.b1_create_opportunity(
  '$steward_actor', '$project', 'Corrida S7 $i',
  'Duas propostas concorrem realmente pela mesma vaga.',
  'A transação perdedora deve retornar erro tipado.',
  'Exatamente um compromisso materializado.', 1,
  '47100000-0000-4000-8000-$suffix', 'race-create-$suffix'
) ->> 'opportunity_id';
SQL
)"

  sql <<SQL >/dev/null
set request.jwt.claim.sub = '47000000-0000-4000-8000-000000000001';
select public.b1_publish_opportunity(
  '$steward_actor', '$opportunity', 1,
  '47200000-0000-4000-8000-$suffix', 'race-publish-$suffix'
);
SQL

  proposal_a="$(sql <<SQL
set request.jwt.claim.sub = '47000000-0000-4000-8000-000000000002';
select public.b1_submit_proposal(
  '$actor_a', '$opportunity', 'Proposta concorrente A da rodada $i.',
  'Condições equivalentes para testar apenas a corrida.', 'Entrega concorrente A.',
  'Sem recompensa.', '47300000-0000-4000-8000-$suffix', 'race-submit-a-$suffix'
) ->> 'proposal_id';
SQL
)"
  proposal_b="$(sql <<SQL
set request.jwt.claim.sub = '47000000-0000-4000-8000-000000000003';
select public.b1_submit_proposal(
  '$actor_b', '$opportunity', 'Proposta concorrente B da rodada $i.',
  'Condições equivalentes para testar apenas a corrida.', 'Entrega concorrente B.',
  'Sem recompensa.', '47400000-0000-4000-8000-$suffix', 'race-submit-b-$suffix'
) ->> 'proposal_id';
SQL
)"

  output_a="$(mktemp)"
  output_b="$(mktemp)"
  cleanup() { rm -f "$output_a" "$output_b"; }
  trap cleanup EXIT

  set +e
  (
    sql >"$output_a" 2>&1 <<SQL
set request.jwt.claim.sub = '47000000-0000-4000-8000-000000000001';
select public.b1_accept_proposal(
  '$steward_actor', '$proposal_a', 2, 1, 2, 1, 'Aceite concorrente A.',
  '47500000-0000-4000-8000-$suffix', 'race-accept-a-$suffix'
);
SQL
  ) &
  pid_a=$!
  (
    sql >"$output_b" 2>&1 <<SQL
set request.jwt.claim.sub = '47000000-0000-4000-8000-000000000001';
select public.b1_accept_proposal(
  '$steward_actor', '$proposal_b', 2, 1, 2, 1, 'Aceite concorrente B.',
  '47600000-0000-4000-8000-$suffix', 'race-accept-b-$suffix'
);
SQL
  ) &
  pid_b=$!
  wait "$pid_a"; status_a=$?
  wait "$pid_b"; status_b=$?
  set -e

  if [[ "$status_a" -eq "$status_b" ]]; then
    echo "FAIL iteration $i: expected exactly one successful session" >&2
    sed 's/^/A: /' "$output_a" >&2
    sed 's/^/B: /' "$output_b" >&2
    exit 1
  fi
  loser_output="$output_a"
  [[ "$status_b" -ne 0 ]] && loser_output="$output_b"
  if ! grep -Eq 'CZ409:(STALE_VERSION|CAPACITY_EXHAUSTED)' "$loser_output"; then
    echo "FAIL iteration $i: loser did not receive a typed concurrency error" >&2
    sed 's/^/LOSER: /' "$loser_output" >&2
    exit 1
  fi

  count="$(sql <<SQL
select count(*) from public.commitments where opportunity_id = '$opportunity';
SQL
)"
  issues="$(sql <<SQL
select public.b1_reconcile_opportunity('$opportunity');
SQL
)"
  if [[ "$count" != "1" || "$issues" != "{}" ]]; then
    echo "FAIL iteration $i: count=$count reconciliation=$issues" >&2
    exit 1
  fi

  cleanup
  trap - EXIT
  echo "PASS S7 iteration $i/$iterations: one commitment, typed loser, reconciled"
done

echo "PASS S7 repeated concurrency: ${iterations}/${iterations}"

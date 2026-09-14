#!/usr/bin/env python3
import importlib.util
import json
from pathlib import Path
import os
import tempfile
import unittest
from unittest.mock import patch


MODULE_PATH = Path(__file__).with_name("cz-living-presence.py")
spec = importlib.util.spec_from_file_location("cz_living_presence", MODULE_PATH)
cz = importlib.util.module_from_spec(spec)
assert spec.loader is not None
spec.loader.exec_module(cz)

HUMAN = {
    "profile_name": "Marcos", "actor_name": "Marcos", "actor_id": "human-internal",
    "profile_id": "profile-internal", "membership_role": "OWNER",
}
RECORD = {
    "id": "record-internal", "record_class": "ORIGINAL_RECORD",
    "content": "Minha intenção humana exata.", "content_sha256": "a" * 64,
    "provenance": {"source": "human"}, "created_at": "2026-09-14T00:00:00Z",
}


class FakeClient:
    def __init__(self, *_):
        self.calls = []

    def rpc(self, name, payload):
        self.calls.append((name, payload))
        if name == "register_preproject_ai_agent":
            return {"agent_actor_id": "ai-internal", "replayed": True}
        if name == "authorize_and_enqueue_preproject_ai_execution":
            return {"execution_id": "execution-internal", "state": "QUEUED"}
        if name == "review_preproject_candidate_interpretation":
            return {"disposition": payload["p_disposition"]}
        raise AssertionError(name)

    def record_preproject_text(self, actor_id, record_class, content, provenance):
        self.calls.append(("record_preproject_human_text", {
            "actor_id": actor_id, "record_class": record_class,
            "content": content, "provenance": provenance,
        }))
        return {"record_id": "new-intention", "content_sha256": "c" * 64}


def workspace(*, completed=False, reviewed=False, active=True):
    candidate = {
        "id": "candidate-internal", "authorization_id": "authorization-internal",
        "content": "Uma leitura candidata.", "content_sha256": "b" * 64,
        "execution_class": "CZ_EXECUTED_AI_OUTPUT", "provider": "moonshotai",
        "model": "moonshotai/kimi-k2.6", "cost_usd": 0.001,
        "cost_status": "KNOWN", "created_at": "2026-09-14T00:01:00Z",
        "execution_id": "execution-internal",
    }
    review = {
        "id": "review-internal", "candidate_id": "candidate-internal",
        "disposition": "ADOPT", "human_statement": "Isto me representa.",
        "representation_text": None, "created_at": "2026-09-14T00:02:00Z",
    }
    return {
        "records": [RECORD], "candidates": [candidate] if completed else [],
        "authorizations": [], "reviews": [review] if reviewed else [],
        "executions": [{"id": "execution-internal", "state": "SUCCEEDED"}] if completed else [],
        "ai_agents": ([{"id": "ai-internal", "name": "Intérprete",
                        "operator_label": "CZ_PREPROJECT_PRIVATE_INTERPRETER"}]
                      if active else []),
        "projects": [{"id": "project-internal", "title": "Projeto atual",
                      "current_intent": "Intenção existente do projeto", "stage": "ACTIVE",
                      "visibility": "PRIVATE", "updated_at": "2026-09-14T00:00:00Z",
                      "steward_actor_id": "human-internal"}],
        "project_memberships": [], "needs": [], "need_versions": [],
        "opportunities": [], "opportunity_versions": [], "company_cycles": [],
        "cycle_participations": [], "dragon_cycles": [], "cycle_records": [],
        "artifacts": [],
    }


class TerminalGoldenPathTests(unittest.TestCase):
    def run_case(self, answers, states, *, founder=False):
        prompts = iter(([] if founder else ["2"]) + answers)
        output = []
        client = FakeClient()
        state_iter = iter(states)
        workers = []
        with tempfile.TemporaryDirectory() as directory:
            with (
                patch.object(cz, "controlled_human", return_value=HUMAN),
                patch.object(cz, "read_workspace", side_effect=lambda *_: next(state_iter)),
                patch.object(cz, "show_presence", wraps=cz.show_presence),
                patch.object(cz, "canonical_direction", return_value={
                    "canonical_human_direction": "D033", "canonical_next_gate": "Discovery N=1",
                    "source": "STATE.md@canonical",
                    "currentness": "LOCALLY KNOWN ORIGIN/MAIN @ canonical; REMOTE FRESHNESS NOT VERIFIED",
                }),
                patch.object(cz, "RUNTIME_DIR", Path(directory)),
                patch.object(cz, "PENDING_COMMAND_FILE", Path(directory) / "pending.json")):
                result = cz.run_terminal(
                    input_fn=lambda _="": next(prompts), output_fn=output.append,
                    configuration_fn=lambda: ("api", "key", "mail", "db"),
                    authenticate_fn=lambda *_: ("secret-token", {"id": "profile-internal"}),
                    client_factory=lambda *_: client,
                    worker_fn=lambda database: workers.append(database),
                )
        return result, output, client, workers

    def test_declined_confirmation_never_enqueues_or_runs_worker(self):
        result, output, client, workers = self.run_case(
            ["1", "", "Compreender minha intenção", "não autorizo"],
            [workspace()],
        )
        self.assertEqual(result["state"], "NOT_AUTHORIZED")
        self.assertEqual(workers, [])
        self.assertEqual(client.calls, [])
        self.assertIn("nenhum provedor foi chamado", "\n".join(output))
        screen = "\n".join(output)
        self.assertIn("Moonshot via Vercel AI Gateway", screen)
        self.assertIn("moonshotai/kimi-k2.6", screen)
        self.assertIn("Máximo de tokens de saída: 4096", screen)
        self.assertIn("UNKNOWN não significa ZERO", screen)

    def test_complete_real_path_enqueues_reviews_and_shows_presence(self):
        result, output, client, workers = self.run_case(
            ["1", "", "Compreender minha intenção", cz.CONFIRMATION,
             "4", "Isto me representa.", ".finish", "CONFIRMAR REVISÃO", "n"],
            [workspace(), workspace(completed=True), workspace(completed=True, reviewed=True)],
        )
        self.assertEqual(result["state"], "ADOPT")
        self.assertEqual(workers, ["db"])
        names = [name for name, _ in client.calls]
        self.assertEqual(names, [
            "authorize_and_enqueue_preproject_ai_execution",
            "review_preproject_candidate_interpretation",
        ])
        enqueue = client.calls[0][1]
        self.assertEqual(enqueue["p_provider"], "moonshotai")
        self.assertEqual(enqueue["p_max_output_tokens"], 4096)
        self.assertIsNone(enqueue["p_max_spend_usd"])
        self.assertEqual(enqueue["p_selected_inputs"][0]["content_sha256"], "a" * 64)
        human_output = "\n".join(output)
        self.assertIn("Minha intenção humana exata.", human_output)
        self.assertIn("INTERPRETAÇÃO CANDIDATA", human_output)
        self.assertIn("[ADOPT] Uma leitura candidata.", human_output)
        for internal in ("ai-internal", "execution-internal"):
            self.assertNotIn(internal, human_output)

    def test_restart_can_review_existing_candidate_without_new_execution(self):
        result, output, client, workers = self.run_case(
            ["5", "1", "Não me representa.", ".finish", "CONFIRMAR REVISÃO", "n"],
            [workspace(completed=True), workspace(completed=True)],
        )
        self.assertEqual(result["state"], "REJECT")
        self.assertEqual(workers, [])
        self.assertEqual([name for name, _ in client.calls], [
            "review_preproject_candidate_interpretation",
        ])
        self.assertIn("aguardando você", "\n".join(output))
        self.assertIn("OPERAÇÕES LEGADAS — LIVING PRESENCE", "\n".join(output))

    def test_reviewed_candidate_can_be_deliberately_superseded_without_ai_work(self):
        result, output, client, workers = self.run_case(
            ["5", "2", "A captura anterior não expressa minha intenção.", ".finish",
             "Esta é a representação deliberada.", ".finish", "CONFIRMAR REVISÃO", "n"],
            [workspace(completed=True, reviewed=True), workspace(completed=True, reviewed=True)],
        )
        self.assertEqual(result["state"], "CORRECT")
        self.assertEqual(workers, [])
        self.assertEqual([name for name, _ in client.calls], ["review_preproject_candidate_interpretation"])
        self.assertIn("nova revisão append-only", "\n".join(output))

    def test_multiline_review_is_preserved_and_paste_lines_stay_in_their_fields(self):
        answers = iter([
            "2", "Linha humana 1", "cd ~/Downloads/celula-zero", "Linha humana 3", ".finish",
            "Representação 1", "npm run live", "Representação 3", ".finish",
            "CONFIRMAR REVISÃO",
        ])
        client = FakeClient()
        result = cz.review_candidate(
            client, workspace(completed=True), HUMAN, workspace(completed=True)["candidates"][0],
            lambda _="": next(answers), lambda _: None,
        )
        self.assertEqual(result, "CORRECT")
        payload = client.calls[0][1]
        self.assertEqual(payload["p_human_statement"], "Linha humana 1\ncd ~/Downloads/celula-zero\nLinha humana 3")
        self.assertEqual(payload["p_representation_text"], "Representação 1\nnpm run live\nRepresentação 3")

    def test_review_abort_before_exact_confirmation_writes_zero_rows(self):
        answers = iter(["2", "Declaração deliberada", ".finish", "Representação deliberada", ".finish", "não"])
        client = FakeClient()
        output = []
        result = cz.review_candidate(
            client, workspace(completed=True), HUMAN, workspace(completed=True)["candidates"][0],
            lambda _="": next(answers), output.append,
        )
        self.assertEqual(result, "REVIEW_ABORTED")
        self.assertEqual(client.calls, [])
        preview = "\n".join(output)
        self.assertIn("DISPOSITION\nCORRECT", preview)
        self.assertIn("HUMAN STATEMENT\nDeclaração deliberada", preview)
        self.assertIn("REPRESENTATION\nRepresentação deliberada", preview)

    def test_append_only_history_keeps_prior_review_and_latest_becomes_effective_export(self):
        state = workspace(completed=True, reviewed=True)
        prior = dict(state["reviews"][0])
        state["reviews"].append({
            "id": "review-latest", "candidate_id": "candidate-internal",
            "disposition": "CORRECT", "human_statement": "Correção deliberada.",
            "representation_text": "Representação humana limpa.",
            "created_at": "2026-09-14T00:03:00Z",
        })
        self.assertEqual(state["reviews"][0], prior)
        self.assertEqual(cz.living_representation(state)[0]["text"], "Representação humana limpa.")
        with tempfile.TemporaryDirectory() as directory:
            with patch.object(cz, "EXPORT_DIR", Path(directory)):
                path = cz.export_presence(state, HUMAN, lambda _: None)
            exported = json.loads(path.read_text(encoding="utf-8"))
        candidate = exported["candidates"][0]
        self.assertEqual(len(candidate["reviewHistory"]), 2)
        self.assertEqual(candidate["reviewHistory"][0]["humanStatement"], prior["human_statement"])
        self.assertEqual(candidate["effectiveReview"]["id"], "review-latest")
        self.assertEqual(exported["adoptedRepresentation"][0]["text"], "Representação humana limpa.")

    def test_enter_and_exit_is_read_only_and_recognizes_existing_agent(self):
        result, output, client, workers = self.run_case(["3"], [workspace()], founder=True)
        self.assertEqual(result["state"], "EXITED")
        self.assertEqual(client.calls, [])
        self.assertEqual(workers, [])
        self.assertIn("WHO YOU ARE NOW", "\n".join(output))
        self.assertIn("Fonte: STATE.md@canonical", "\n".join(output))
        self.assertNotIn("\nCURRENT DIRECTION\n", "\n".join(output))
        self.assertIn("CANONICAL RECORDED DIRECTION ≠ CURRENT HUMAN DIRECTION", "\n".join(output))
        self.assertIn("REMOTE FRESHNESS NOT VERIFIED", "\n".join(output))
        self.assertNotIn("SEUS REGISTROS PRIVADOS AUTORIZÁVEIS", "\n".join(output))
        self.assertNotIn("Minha intenção humana exata.", "\n".join(output))

    def test_founder_intent_path_never_runs_provider_or_creates_operational_objects(self):
        result, output, client, workers = self.run_case(
            ["0", "Uma intenção real", "com duas linhas", ".finish", cz.INTENT_CONFIRMATION],
            [workspace()], founder=True,
        )
        self.assertEqual(result["state"], "INTENTION_RECORDED")
        self.assertEqual(workers, [])
        self.assertEqual([name for name, _ in client.calls], ["record_preproject_human_text"])
        self.assertIn("INTENT-AWARE ROUTING: NOT YET ESTABLISHED", "\n".join(output))
        self.assertIn("GENERIC CAPABILITY LISTING — NOT INTENT-AWARE", "\n".join(output))

    def test_first_activation_requires_explicit_words_and_replay_is_idempotent(self):
        result, _, client, _ = self.run_case(
            ["6", "ATIVAR MEU INTÉRPRETE PRIVADO"], [workspace(active=False)]
        )
        self.assertEqual(result["state"], "AGENT_ACTIVE")
        self.assertEqual([name for name, _ in client.calls], ["register_preproject_ai_agent"])
        result, _, client, _ = self.run_case(
            ["6", "não"], [workspace(active=False)]
        )
        self.assertEqual(result["state"], "AGENT_NOT_ACTIVATED")
        self.assertEqual(client.calls, [])

    def test_private_export_is_outside_repo_with_private_permissions(self):
        with tempfile.TemporaryDirectory() as directory:
            export_dir = Path(directory) / "private-exports"
            with patch.object(cz, "EXPORT_DIR", export_dir):
                path = cz.export_presence(workspace(), HUMAN, lambda _: None)
            self.assertEqual(path.parent, export_dir)
            self.assertEqual(os.stat(export_dir).st_mode & 0o777, 0o700)
            self.assertEqual(os.stat(path).st_mode & 0o777, 0o600)
            self.assertFalse(str(path).startswith(str(cz.ROOT)))

    def test_crash_retry_reuses_exact_command_key_and_terms(self):
        terms = {
            "subject_actor_id": "human-internal",
            "requester_actor_id": "human-internal",
            "selected_inputs": [{
                "record_id": "record-internal", "record_class": "ORIGINAL_RECORD",
                "content_sha256": "a" * 64,
            }],
            "purpose": "Compreender minha intenção", "agent_actor_id": "ai-internal",
            "provider": cz.PROVIDER, "model": cz.MODEL, "max_calls": 1,
            "max_output_tokens": 4096, "max_spend_usd": None,
        }
        with tempfile.TemporaryDirectory() as directory:
            with (
                patch.object(cz, "RUNTIME_DIR", Path(directory)),
                patch.object(cz, "PENDING_COMMAND_FILE", Path(directory) / "pending.json")):
                cz.write_pending_command(terms, "stable-command-key")
                pending_after_crash = cz.read_pending_command()
                self.assertEqual(pending_after_crash["command_key"], "stable-command-key")
                self.assertEqual(pending_after_crash["terms_digest"], cz.terms_digest(terms))
                first = cz.execution_payload(terms, "stable-command-key")
                retry = cz.execution_payload(
                    pending_after_crash["terms"], pending_after_crash["command_key"]
                )
                self.assertEqual(first, retry)
                self.assertEqual(first["p_idempotency_key"], "stable-command-key")
                durable_executions = {}
                first_receipt = durable_executions.setdefault(
                    first["p_idempotency_key"], "one-durable-execution"
                )
                # Simulated client crash: the first receipt was never acknowledged.
                retry_receipt = durable_executions.setdefault(
                    retry["p_idempotency_key"], "a-second-execution"
                )
                self.assertEqual(retry_receipt, first_receipt)
                self.assertEqual(len(durable_executions), 1)
                self.assertEqual(os.stat(cz.PENDING_COMMAND_FILE).st_mode & 0o777, 0o600)
                cz.complete_pending_command()
                self.assertFalse(cz.PENDING_COMMAND_FILE.exists())
                self.assertEqual(os.stat(directory).st_mode & 0o777, 0o700)


class FounderSessionV0Tests(unittest.TestCase):
    def direction(self):
        return {
            "canonical_next_gate": "Discovery N=1", "source": "STATE.md@canonical-sha",
            "currentness": "LOCALLY KNOWN ORIGIN/MAIN @ canonical-sha; REMOTE FRESHNESS NOT VERIFIED",
        }

    def test_local_origin_main_is_never_presented_as_fresh_remote_head(self):
        state_text = """## Current Human Direction\nHuman Direction:\n`decisions/D033.md`\nNext gate: `DISCOVERY N=1`.\n"""
        with patch.object(cz.founder, "run", side_effect=["abc123\n", state_text]):
            direction = cz.canonical_direction()
        self.assertEqual(direction["source"], "STATE.md@abc123")
        self.assertIn("LOCALLY KNOWN ORIGIN/MAIN @ abc123", direction["currentness"])
        self.assertIn("REMOTE FRESHNESS NOT VERIFIED", direction["currentness"])
        self.assertNotIn("VERIFIED CURRENT REMOTE HEAD", direction["currentness"])

    def test_canonical_trajectory_and_recent_result_are_bounded_and_traceable(self):
        state_text = """## Current Human Direction\nHuman Direction:\n`decisions/D033.md`\nCurrent sequence:\n`GENESIS HUMAN = MARCOS`\n`Marcos inhabits CZ → Living Presence → Discovery`\n## Genesis Human / Living Presence — founder real N=1\nResult Package:\n`RP-RECENT.md`\nNext gate: `DISCOVERY N=1`.\n"""
        package_text = "# Result Package\n\n## Result\n\n`PASS N=1 / WITH RECOVERED FAILURES`\n\n## Details\nnot projected\n"
        with patch.object(cz.founder, "run", side_effect=["abc123\n", state_text, package_text]):
            direction = cz.canonical_direction()
        context = cz.founder_context(workspace(), HUMAN, direction)
        self.assertEqual(context["WHAT WE ARE DOING NOW"][0]["text"],
                         "Marcos inhabits CZ → Living Presence → Discovery")
        self.assertEqual(context["WHAT WE ARE DOING NOW"][0]["source"], "STATE.md@abc123")
        self.assertEqual(context["WHAT HAPPENED RECENTLY"][0]["text"],
                         "PASS N=1 / WITH RECOVERED FAILURES")
        self.assertEqual(context["WHAT HAPPENED RECENTLY"][0]["source"],
                         "RP-RECENT.md@abc123")
        self.assertNotIn("not projected", json.dumps(context))

    def test_projection_has_provenance_and_does_not_invent_currentness(self):
        state = workspace(completed=True, reviewed=True)
        state["records"][0] = {**state["records"][0],
                               "provenance": {"capture": "FOUNDER_SESSION_V0"}}
        state["records"].append({
            **RECORD, "id": "old-record", "content": "Uma intenção antiga.",
            "provenance": {"source": "human"}, "created_at": "2026-09-13T00:00:00Z",
        })
        state["cycle_records"] = [{
            "id": "question", "cycle_id": "cycle", "content_class": "ORIGINAL_RECORD",
            "phase_context": "DREAMING", "content": "Isto continua aberto?",
            "provenance": {"room_kind": "QUESTION"}, "created_at": "2026-09-14T00:00:00Z",
        }]
        before = json.dumps(state, sort_keys=True)
        context = cz.founder_context(state, HUMAN, {
            "canonical_next_gate": "Discovery N=1", "source": "STATE.md@canonical",
            "currentness": "LOCALLY KNOWN ORIGIN/MAIN @ canonical; REMOTE FRESHNESS NOT VERIFIED",
        })
        self.assertEqual(json.dumps(state, sort_keys=True), before)
        for items in context.values():
            for item in items:
                self.assertTrue(item["source"])
                self.assertTrue(item["currentness"])
        self.assertIn("NOT REVALIDATED", context["CURRENT INTENTIONS"][0]["currentness"])
        self.assertTrue(any(item["currentness"] == "UNRESOLVED STATUS UNKNOWN"
                            for item in context["WHAT IS OPEN / UNRESOLVED"]))

    def test_every_projection_uses_exact_instances_and_distinguishes_membership(self):
        state = workspace(completed=True, reviewed=True)
        state["records"][0] = {**state["records"][0],
                               "provenance": {"capture": "FOUNDER_SESSION_V0"}}
        state["projects"].append({
            "id": "member-project", "title": "Projeto membro", "current_intent": "x",
            "stage": "OPEN", "visibility": "PRIVATE", "updated_at": "2026-09-14T00:00:00Z",
            "steward_actor_id": "another-human",
        })
        state["project_memberships"] = [{
            "project_id": "member-project", "actor_id": "human-internal",
            "role": "CONTRIBUTOR", "created_at": "2026-09-14T00:00:00Z",
        }]
        state["dragon_cycles"] = [{
            "id": "dragon-cycle", "project_id": "member-project", "current_phase": "DREAMING",
            "state": "OPEN", "created_at": "2026-09-14T00:00:00Z", "closed_at": None,
        }]
        state["cycle_participations"] = [{
            "cycle_id": "dragon-cycle", "actor_id": "human-internal", "social_role": "PARTICIPANT",
            "ended_at": None, "valid_from": "2026-09-14T00:00:00Z",
        }]
        context = cz.founder_context(state, HUMAN, self.direction())
        sources = [item["source"] for items in context.values() for item in items]
        joined = "\n".join(sources)
        self.assertIn("profiles:profile-internal", joined)
        self.assertIn("actors:human-internal", joined)
        self.assertIn("actor_memberships:human-internal:profile-internal:OWNER", joined)
        self.assertIn("preproject_interpretation_reviews:review-internal", joined)
        self.assertIn("preproject_records:record-internal", joined)
        self.assertIn("projects:project-internal:steward_actor_id:human-internal", joined)
        self.assertIn("project_members:member-project:human-internal", joined)
        self.assertIn("dragon_cycles:dragon-cycle", joined)
        self.assertIn("cycle_participations:dragon-cycle:human-internal", joined)
        member_source = next(item["source"] for item in context["WHAT IS ACTUALLY ACTIVE"]
                             if item["text"].startswith("Projeto membro"))
        self.assertNotIn("steward_actor_id:human-internal", member_source)
        for source in sources:
            self.assertRegex(source, r"(:|STATE\.md@)")

    def test_multiline_intention_is_exact_and_only_original_record_is_written(self):
        answers = iter(["Linha 1", "npm run live", "Linha 3", ".finish", cz.INTENT_CONFIRMATION])
        client = FakeClient()
        original = workspace()
        context = cz.founder_context(original, HUMAN, self.direction())
        result = cz.capture_current_intention(
            client, HUMAN, original, context, lambda _="": next(answers), lambda _: None
        )
        self.assertEqual(result["state"], "INTENTION_RECORDED")
        self.assertEqual([name for name, _ in client.calls], ["record_preproject_human_text"])
        payload = client.calls[0][1]
        self.assertEqual(payload["content"], "Linha 1\nnpm run live\nLinha 3")
        self.assertEqual(payload["record_class"], "ORIGINAL_RECORD")
        self.assertEqual(original["needs"], [])
        self.assertEqual(original["company_cycles"], [])

    def test_abort_before_confirmation_writes_nothing(self):
        answers = iter(["Minha intenção", ".finish", "não"])
        client = FakeClient()
        state = workspace()
        result = cz.capture_current_intention(
            client, HUMAN, state, cz.founder_context(state, HUMAN, self.direction()),
            lambda _="": next(answers), lambda _: None
        )
        self.assertEqual(result["state"], "INTENT_ABORTED")
        self.assertEqual(client.calls, [])

    def test_routing_preview_is_deterministic_read_only_and_uses_existing_primitives(self):
        state = workspace()
        before = json.dumps(state, sort_keys=True)
        options = cz.generic_capability_options(state)
        self.assertEqual(json.dumps(state, sort_keys=True), before)
        primitives = " ".join(item["primitive"] for item in options)
        self.assertIn("preproject_records", primitives)
        self.assertIn("t1_create_need", primitives)
        self.assertIn("company_core_create_cycle", primitives)
        self.assertNotIn("provider", primitives.lower())
        for option in options:
            self.assertTrue(option["availability_reason"])
            self.assertTrue(option["change"])
            self.assertTrue(option["authority"])

    def test_routing_boundary_consumes_exact_intention_but_claims_no_semantic_fit(self):
        state = workspace()
        context = cz.founder_context(state, HUMAN, self.direction())
        first = cz.intention_routing_boundary("intenção X", context, state)
        second = cz.intention_routing_boundary("intenção Y", context, state)
        self.assertNotEqual(first["intention_sha256"], second["intention_sha256"])
        self.assertEqual(first["semantic_relevance"], "NOT DETERMINED")
        self.assertIn("explicit Human authorization", first["authorization_boundary"])
        for option in first["generic_capabilities"]:
            self.assertNotIn("intenção X", json.dumps(option, ensure_ascii=False))

    def test_restart_reconstructs_persisted_intention_without_hidden_memory(self):
        state = workspace()
        state["records"] = [{
            **RECORD, "id": "persisted-intention", "content": "Volto amanhã e continuo.",
            "provenance": {"capture": "FOUNDER_SESSION_V0"},
        }]
        context = cz.founder_context(state, HUMAN, {
            "canonical_next_gate": "Discovery N=1", "source": "STATE.md@canonical",
            "currentness": "LOCALLY KNOWN ORIGIN/MAIN @ canonical; REMOTE FRESHNESS NOT VERIFIED",
        })
        item = context["CURRENT INTENTIONS"][0]
        self.assertEqual(item["text"], "Volto amanhã e continuo.")
        self.assertEqual(item["source"], "preproject_records:persisted-intention")
        self.assertEqual(item["currentness"], "DECLARED CURRENT WHEN RECORDED; NOT REVALIDATED")


if __name__ == "__main__":
    unittest.main()

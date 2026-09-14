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

HUMAN = {"profile_name": "Marcos", "actor_name": "Marcos", "actor_id": "human-internal"}
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
    }


class TerminalGoldenPathTests(unittest.TestCase):
    def run_case(self, answers, states):
        prompts = iter(answers)
        output = []
        client = FakeClient()
        state_iter = iter(states)
        workers = []
        with tempfile.TemporaryDirectory() as directory:
            with (
                patch.object(cz, "controlled_human", return_value=HUMAN),
                patch.object(cz, "read_workspace", side_effect=lambda *_: next(state_iter)),
                patch.object(cz, "show_presence", wraps=cz.show_presence),
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
        for internal in ("human-internal", "ai-internal", "record-internal", "execution-internal"):
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
        result, output, client, workers = self.run_case(["4"], [workspace()])
        self.assertEqual(result["state"], "EXITED")
        self.assertEqual(client.calls, [])
        self.assertEqual(workers, [])
        self.assertIn("Intérprete privado: ATIVO", "\n".join(output))

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


if __name__ == "__main__":
    unittest.main()

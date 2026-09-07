#!/usr/bin/env python3
import hashlib
import importlib.util
import json
from pathlib import Path
import tempfile
import unittest
from unittest.mock import Mock, patch

MODULE_PATH = Path(__file__).with_name("cz-founder.py")
spec = importlib.util.spec_from_file_location("cz_founder", MODULE_PATH)
cz = importlib.util.module_from_spec(spec)
assert spec.loader is not None
spec.loader.exec_module(cz)

CYCLE = "25262d4d-4014-474e-9e71-e485a06f09ba"
PROJECT = "e4c8b206-dec6-4b89-ae8a-f2ec249354e7"
HUMAN = "15f70191-19aa-487e-9b20-5da790188b07"
AI = "7b7b125e-7844-4715-882b-7f8bc34708f6"


class RestartResumeTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        root = Path(self.tmp.name) / "room-snapshots"
        root.mkdir()
        cz.SNAPSHOT_DIR = root
        self.path = root / "context.json"
        self.snapshot = {
            "snapshot_schema": "CZ_ROOM_RESUME_SNAPSHOT_V1",
            "classification": "NON_CANONICAL_LOCAL_CONTEXT_SNAPSHOT",
            "project_id": PROJECT,
            "cycle": {
                "id": CYCLE,
                "project_id": PROJECT,
                "state": "OPEN",
                "current_phase": "DOING",
                "current_direction_record_id": "old-direction",
            },
            "cycle_participations": [
                {"actor_id": HUMAN},
                {"actor_id": AI},
            ],
            "human_original_records": [],
            "human_direction": {"id": "old-direction"},
            "canonical_state": {"base": "0" * 40},
        }
        self.live = {
            "cycle_id": CYCLE,
            "project_id": PROJECT,
            "human_actor_id": HUMAN,
            "ai_actor_id": AI,
        }

    def write(self):
        raw = (json.dumps(self.snapshot) + "\n").encode()
        self.path.write_bytes(raw)
        return hashlib.sha256(raw).hexdigest()

    def cfg(self, sha):
        return {
            "room_snapshot_locator": {
                "classification": "NON_CANONICAL_ROOM_SNAPSHOT_LOCATOR",
                "path": str(self.path),
                "sha256": sha,
                "cycle_id": CYCLE,
                "project_id": PROJECT,
                "auto_update": False,
            }
        }

    def test_valid_snapshot_is_available_but_noncanonical(self):
        state = cz.room_snapshot_state(self.cfg(self.write()), self.live)
        self.assertEqual(state["room_state"], "AVAILABLE")
        self.assertEqual(state["room_context_source"], "PORTABLE_SNAPSHOT")
        self.assertEqual(state["live_room_state"], "UNAVAILABLE")
        self.assertEqual(
            state["room_resume_mode"],
            "READ_ONLY_PORTABLE_SNAPSHOT",
        )
        self.assertEqual(state["cycle"]["current_direction_record_id"], "old-direction")

    def test_hash_mismatch_fails_closed(self):
        self.write()
        state = cz.room_snapshot_state(self.cfg("f" * 64), self.live)
        self.assertEqual(state["room_state"], "UNAVAILABLE")
        self.assertEqual(state["room_locator_error"], "ROOM_SNAPSHOT_SHA256_MISMATCH")

    def test_cycle_mismatch_fails_closed(self):
        sha = self.write()
        self.snapshot["cycle"]["id"] = "00000000-0000-4000-8000-000000000000"
        sha = self.write()
        state = cz.room_snapshot_state(self.cfg(sha), self.live)
        self.assertEqual(state["room_locator_error"], "ROOM_SNAPSHOT_CYCLE_MISMATCH")

    def test_historical_plan_restriction_does_not_override_git(self):
        historical_room = {
            "room_state": "AVAILABLE",
            "room_locator_source":
                "PORTABLE_SNAPSHOT_FALLBACK",
            "room_context_source": "PORTABLE_SNAPSHOT",
            "live_room_state": "UNAVAILABLE",
            "room_resume_mode":
                "READ_ONLY_PORTABLE_SNAPSHOT",
            "cycle": {
                "id": CYCLE,
                "project_id": PROJECT,
                "state": "OPEN",
                "current_phase": "DOING",
                "current_direction_record_id":
                    "old-direction",
            },
            "human_direction": {
                "id": "old-direction",
            },
            "human_original_records": [
                {
                    "id": "historical-plan",
                    "created_at":
                        "2026-09-03T00:00:00+00:00",
                    "content":
                        "Não autoriza ainda implementação.",
                    "provenance": {
                        "room_kind": "PLAN_INPUT",
                    },
                },
            ],
            "canonical_state": {},
        }

        controls = {
            "canonical_human_direction":
                "Future Readiness",
            "canonical_next_gate":
                "NEXT PREPAREDNESS CRITERION = "
                "RESTART RESILIENCE / ONE-COMMAND RESUME",
        }

        sha = "a" * 40

        with (
            patch.object(
                cz,
                "room_project_state",
                return_value=historical_room,
            ),
            patch.object(
                cz,
                "canonical_state_controls",
                return_value=controls,
            ),
            patch.object(
                cz,
                "canonical_remote_main_sha",
                return_value=sha,
            ),
            patch.object(
                cz,
                "run",
                return_value="## clean",
            ),
            patch.object(
                cz,
                "git_relation_to_remote",
                return_value="SAME",
            ),
        ):
            bootstrap = cz.read_only_bootstrap()

        self.assertEqual(
            bootstrap["blockers"],
            [],
        )
        self.assertEqual(
            bootstrap["next_allowed_move"],
            "FOLLOW_CANONICAL_NEXT_GATE_FROM_GIT",
        )
        self.assertFalse(
            bootstrap["requires_human"],
        )
        self.assertEqual(
            bootstrap["canonical_human_direction"],
            "Future Readiness",
        )

    def test_unknown_canonical_controls_remain_unresolved(self):
        parsed = cz.parse_canonical_state_controls(
            "# unrelated state\n"
        )
        self.assertEqual(
            parsed["canonical_human_direction"],
            "UNKNOWN",
        )
        self.assertEqual(
            parsed["canonical_next_gate"],
            "UNKNOWN",
        )

    def test_actual_canonical_state_controls_parse(self):
        parsed = cz.parse_canonical_state_controls(
            MODULE_PATH.parent.parent.joinpath("STATE.md").read_text(
                encoding="utf-8"
            )
        )
        self.assertNotEqual(
            parsed["canonical_human_direction"],
            "UNKNOWN",
        )
        self.assertEqual(
            parsed["canonical_human_direction"],
            "decisions/D021-internal-operability-before-external-doing.md",
        )
        self.assertNotEqual(
            parsed["canonical_next_gate"],
            "UNKNOWN",
        )
        self.assertEqual(
            parsed["canonical_next_gate"],
            (
                "GI1-004 / HUMAN REVIEW / SELECT NEXT MATERIAL INTERNAL "
                "OPERABILITY PROPERTY"
            ),
        )

    def test_ambiguous_current_gate_fails_closed(self):
        state = (
            "Human Direction:\n\n`decisions/D020.md`\n\n"
            "Next Human gate before K5:\n\n`G1`\n"
        )
        parsed = cz.parse_canonical_state_controls(state + state)
        self.assertEqual(parsed["canonical_human_direction"], "UNKNOWN")
        self.assertEqual(parsed["canonical_next_gate"], "UNKNOWN")

    def test_mismatched_tracking_ref_rejects_canonical_state(self):
        with patch.object(
            cz,
            "git_sha",
            return_value="b" * 40,
        ):
            parsed = cz.canonical_state_controls("a" * 40)

        self.assertEqual(
            parsed["canonical_human_direction"],
            "UNAVAILABLE",
        )
        self.assertEqual(
            parsed["canonical_next_gate"],
            "UNAVAILABLE",
        )

    def test_canonical_repository_identity_accepts_https_and_ssh(self):
        for remote in (
            "https://github.com/MMaia-jr/celula-zero.git",
            "git@github.com:MMaia-jr/celula-zero.git",
            "ssh://git@github.com/MMaia-jr/celula-zero.git",
        ):
            with self.subTest(remote=remote), patch.object(
                cz,
                "run",
                return_value=remote,
            ):
                self.assertTrue(cz.canonical_repository_identity())

    def test_canonical_repository_identity_rejects_mismatch(self):
        with patch.object(
            cz,
            "run",
            return_value="git@github.com:someone-else/celula-zero.git",
        ):
            self.assertFalse(cz.canonical_repository_identity())

    def test_repository_mismatch_rejects_remote_main(self):
        with patch.object(
            cz,
            "canonical_repository_identity",
            return_value=False,
        ):
            self.assertEqual(
                cz.canonical_remote_main_sha(),
                "UNAVAILABLE:CANONICAL_REPOSITORY_IDENTITY",
            )

    def test_unresolved_controls_block_live_room(self):
        live_room = {
            "room_state": "AVAILABLE",
            "room_context_source": "LIVE_ROOM",
            "cycle": {
                "current_direction_record_id": "direction",
            },
            "human_original_records": [
                {
                    "id": "plan",
                    "created_at": "2026-09-07T00:00:00Z",
                    "content": "bounded plan",
                    "provenance": {"room_kind": "PLAN_INPUT"},
                }
            ],
        }

        with (
            patch.object(cz, "room_project_state", return_value=live_room),
            patch.object(
                cz,
                "canonical_state_controls",
                return_value={
                    "canonical_human_direction": "UNKNOWN",
                    "canonical_next_gate": "UNKNOWN",
                },
            ),
            patch.object(
                cz,
                "canonical_remote_main_sha",
                return_value="a" * 40,
            ),
            patch.object(cz, "git_sha", return_value="a" * 40),
            patch.object(cz, "run", return_value="## clean"),
            patch.object(cz, "git_relation_to_remote", return_value="SAME"),
        ):
            bootstrap = cz.read_only_bootstrap()

        self.assertIn(
            "CANONICAL_STATE_CONTROLS_UNRESOLVED",
            bootstrap["blockers"],
        )
        self.assertTrue(bootstrap["requires_human"])

    def test_unresolved_controls_stop_before_gateway_activity(self):
        gateway_key = Mock()
        bootstrap = {
            "blockers": ["CANONICAL_STATE_CONTROLS_UNRESOLVED"],
            "requires_human": True,
        }

        with (
            patch.object(
                cz,
                "config",
                return_value={
                    "model": "unused",
                    "call_cap_usd": "0",
                    "session_cap_usd": "0",
                    "max_calls_per_session": 0,
                    "max_output_tokens": 0,
                },
            ),
            patch.object(cz, "read_only_bootstrap", return_value=bootstrap),
            patch.object(cz, "print_read_only_bootstrap"),
            patch.object(cz, "gateway_key", gateway_key),
        ):
            with self.assertRaisesRegex(
                RuntimeError,
                "FOUNDER_CANONICAL_CONTROLS_UNRESOLVED",
            ):
                cz.main()

        gateway_key.assert_not_called()

    def test_unrelated_blockers_do_not_stop_founder_conversation(self):
        cz.require_canonical_controls(
            {
                "blockers": ["G5_IMPLEMENTATION_NOT_YET_AUTHORIZED"],
                "requires_human": True,
            }
        )


if __name__ == "__main__":
    unittest.main()

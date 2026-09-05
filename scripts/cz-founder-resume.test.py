#!/usr/bin/env python3
import hashlib
import importlib.util
import json
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch

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
                "git_sha",
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

    def test_canonical_controls_are_separate(self):
        parsed = cz.parse_canonical_state_controls(
            "## Current Human Direction — Future Readiness\n\n"
            "## Current next gate\n\n"
            "`NEXT PREPAREDNESS CRITERION = RESTART RESILIENCE / ONE-COMMAND RESUME`\n"
        )
        self.assertEqual(parsed["canonical_human_direction"], "Future Readiness")
        self.assertEqual(
            parsed["canonical_next_gate"],
            "NEXT PREPAREDNESS CRITERION = RESTART RESILIENCE / ONE-COMMAND RESUME",
        )


if __name__ == "__main__":
    unittest.main()

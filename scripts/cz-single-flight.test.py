#!/usr/bin/env python3

from __future__ import annotations

import os
import signal
import stat
import subprocess
import sys
import tempfile
import time
import unittest
from pathlib import Path


SCRIPT = Path(__file__).with_name(
    "cz-single-flight.py"
)


class SingleFlightTests(
    unittest.TestCase
):
    def setUp(self) -> None:
        self.tmp = (
            tempfile.TemporaryDirectory(
                prefix="cz-single-flight-test-"
            )
        )

        self.home = (
            Path(self.tmp.name)
            / "home"
        )

        self.home.mkdir()

        self.env = {
            **os.environ,
            "HOME": str(self.home),
        }

    def tearDown(self) -> None:
        self.tmp.cleanup()

    def cmd(
        self,
        key: str,
        *child: str,
    ) -> list[str]:
        return [
            sys.executable,
            str(SCRIPT),
            key,
            "--",
            *child,
        ]

    def wait_for(
        self,
        path: Path,
        timeout: float = 5.0,
    ) -> None:
        deadline = (
            time.monotonic()
            + timeout
        )

        while (
            time.monotonic()
            < deadline
        ):
            if path.exists():
                return

            time.sleep(0.02)

        self.fail(
            f"timed out waiting for {path}"
        )

    def test_normal_exec_and_exit_propagation(
        self,
    ) -> None:
        result = subprocess.run(
            self.cmd(
                "normal",
                sys.executable,
                "-c",
                (
                    "import sys; "
                    "print('CHILD_EXECUTED'); "
                    "sys.exit(42)"
                ),
            ),
            env=self.env,
            text=True,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
        )

        self.assertEqual(
            result.returncode,
            42,
        )

        self.assertIn(
            (
                "SINGLE_FLIGHT="
                "ADMITTED key=normal"
            ),
            result.stdout,
        )

        self.assertIn(
            "CHILD_EXECUTED",
            result.stdout,
        )

        locks = (
            self.home
            / ".celula-zero"
            / "locks"
        )

        lock_file = (
            locks
            / "normal.lock"
        )

        self.assertTrue(
            lock_file.is_file()
        )

        self.assertEqual(
            stat.S_IMODE(
                locks.stat().st_mode
            ),
            0o700,
        )

        self.assertEqual(
            stat.S_IMODE(
                lock_file.stat().st_mode
            ),
            0o600,
        )

    def test_concurrent_second_start_is_rejected(
        self,
    ) -> None:
        first_marker = (
            Path(self.tmp.name)
            / "first.marker"
        )

        second_marker = (
            Path(self.tmp.name)
            / "second.marker"
        )

        holder_code = (
            "from pathlib import Path; "
            "import sys,time; "
            "Path(sys.argv[1]).write_text("
            "'started'"
            "); "
            "time.sleep(2)"
        )

        first = subprocess.Popen(
            self.cmd(
                "concurrent",
                sys.executable,
                "-c",
                holder_code,
                str(first_marker),
            ),
            env=self.env,
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
        )

        try:
            self.wait_for(
                first_marker
            )

            second = subprocess.run(
                self.cmd(
                    "concurrent",
                    sys.executable,
                    "-c",
                    (
                        "from pathlib import Path; "
                        "import sys; "
                        "Path(sys.argv[1])"
                        ".write_text('ran')"
                    ),
                    str(second_marker),
                ),
                env=self.env,
                text=True,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
            )

            self.assertEqual(
                second.returncode,
                73,
            )

            self.assertIn(
                (
                    "SINGLE_FLIGHT="
                    "REJECTED "
                    "key=concurrent"
                ),
                second.stdout,
            )

            self.assertFalse(
                second_marker.exists()
            )

            self.assertEqual(
                first.wait(timeout=5),
                0,
            )

        finally:
            if first.poll() is None:
                first.kill()
                first.wait(timeout=5)

    def test_sigkill_releases_lock_and_restart_is_admitted(
        self,
    ) -> None:
        first_marker = (
            Path(self.tmp.name)
            / "crash-first.marker"
        )

        after_marker = (
            Path(self.tmp.name)
            / "crash-after.marker"
        )

        holder_code = (
            "from pathlib import Path; "
            "import sys,time; "
            "Path(sys.argv[1]).write_text("
            "'started'"
            "); "
            "time.sleep(30)"
        )

        first = subprocess.Popen(
            self.cmd(
                "crash",
                sys.executable,
                "-c",
                holder_code,
                str(first_marker),
            ),
            env=self.env,
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
        )

        self.wait_for(
            first_marker
        )

        blocked = subprocess.run(
            self.cmd(
                "crash",
                sys.executable,
                "-c",
                "raise SystemExit(0)",
            ),
            env=self.env,
            text=True,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
        )

        self.assertEqual(
            blocked.returncode,
            73,
        )

        os.kill(
            first.pid,
            signal.SIGKILL,
        )

        self.assertEqual(
            first.wait(timeout=5),
            -signal.SIGKILL,
        )

        restarted = subprocess.run(
            self.cmd(
                "crash",
                sys.executable,
                "-c",
                (
                    "from pathlib import Path; "
                    "import sys; "
                    "Path(sys.argv[1])"
                    ".write_text('restarted')"
                ),
                str(after_marker),
            ),
            env=self.env,
            text=True,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
        )

        self.assertEqual(
            restarted.returncode,
            0,
        )

        self.assertTrue(
            after_marker.exists()
        )

        self.assertIn(
            (
                "SINGLE_FLIGHT="
                "ADMITTED key=crash"
            ),
            restarted.stdout,
        )

    def test_bash_worker_descendant_keeps_lock_after_supervisor_sigkill(
        self,
    ) -> None:
        """
        Match the observed nightshift process shape:

        single-flight -> Bash supervisor -> Bash worker

        If the supervisor dies while the worker is still alive,
        the inherited lock must continue blocking a replacement
        supervisor until the execution tree has actually ended.

        This is a Bash-tree regression test, not a claim about
        arbitrary descendants that deliberately close inherited
        file descriptors.
        """
        root = Path(
            self.tmp.name
        )

        worker_started = (
            root
            / "tree-worker-started.marker"
        )

        worker_done = (
            root
            / "tree-worker-done.marker"
        )

        worker = (
            root
            / "tree-worker.sh"
        )

        supervisor = (
            root
            / "tree-supervisor.sh"
        )

        worker.write_text(
            """#!/bin/bash
set -euo pipefail
touch "$1"
sleep 2
touch "$2"
""",
            encoding="utf-8",
        )

        supervisor.write_text(
            """#!/bin/bash
set -euo pipefail
/bin/bash "$1" "$2" "$3"
""",
            encoding="utf-8",
        )

        worker.chmod(
            0o700
        )

        supervisor.chmod(
            0o700
        )

        first = subprocess.Popen(
            self.cmd(
                "tree",
                "/bin/bash",
                str(supervisor),
                str(worker),
                str(worker_started),
                str(worker_done),
            ),
            env=self.env,
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
        )

        try:
            self.wait_for(
                worker_started
            )

            os.kill(
                first.pid,
                signal.SIGKILL,
            )

            self.assertEqual(
                first.wait(timeout=5),
                -signal.SIGKILL,
            )

            blocked = subprocess.run(
                self.cmd(
                    "tree",
                    "/usr/bin/true",
                ),
                env=self.env,
                text=True,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
            )

            self.assertEqual(
                blocked.returncode,
                73,
            )

            self.assertIn(
                (
                    "SINGLE_FLIGHT="
                    "REJECTED key=tree"
                ),
                blocked.stdout,
            )

            self.wait_for(
                worker_done,
                timeout=5,
            )

            deadline = (
                time.monotonic()
                + 3
            )

            restarted = None

            while (
                time.monotonic()
                < deadline
            ):
                candidate = subprocess.run(
                    self.cmd(
                        "tree",
                        "/usr/bin/true",
                    ),
                    env=self.env,
                    text=True,
                    stdout=subprocess.PIPE,
                    stderr=subprocess.PIPE,
                )

                if candidate.returncode == 0:
                    restarted = candidate
                    break

                self.assertEqual(
                    candidate.returncode,
                    73,
                )

                time.sleep(
                    0.05
                )

            self.assertIsNotNone(
                restarted
            )

            self.assertIn(
                (
                    "SINGLE_FLIGHT="
                    "ADMITTED key=tree"
                ),
                restarted.stdout,
            )

        finally:
            if first.poll() is None:
                first.kill()
                first.wait(timeout=5)


    def test_key_cannot_escape_lock_directory(
        self,
    ) -> None:
        result = subprocess.run(
            self.cmd(
                "../escape",
                sys.executable,
                "-c",
                "raise SystemExit(0)",
            ),
            env=self.env,
            text=True,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
        )

        self.assertEqual(
            result.returncode,
            64,
        )

        self.assertIn(
            (
                "SINGLE_FLIGHT_ERROR="
                "INVALID_KEY"
            ),
            result.stderr,
        )


if __name__ == "__main__":
    unittest.main(
        verbosity=2
    )

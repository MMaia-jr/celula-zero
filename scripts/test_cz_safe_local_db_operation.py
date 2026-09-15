#!/usr/bin/env python3
"""Deterministic interlock matrix using injected read-only Docker fixtures."""
import argparse
import importlib.util
import tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SPEC = importlib.util.spec_from_file_location("cz_guard", ROOT / "scripts/cz-safe-local-db-operation.py")
guard = importlib.util.module_from_spec(SPEC)
assert SPEC.loader
SPEC.loader.exec_module(guard)
COMMIT = "e3f2abb67bb3c9192d7749ea0e46db48d1007c7d"

def fixture(root: Path, **kw):
    project = kw.get("project", "cz-recovery-rehearsal-disposable")
    volume = kw.get("volume", "cz-recovery-rehearsal-disposable-volume")
    port = kw.get("port", 59422)
    workspace = root / "workspace"
    (workspace / "supabase").mkdir(parents=True)
    (workspace / "supabase" / "config.toml").write_text(
        f'project_id = "{kw.get("config_project", project)}"\n[db]\nport = {kw.get("config_port", port)}\n', encoding="utf-8")
    marker = root / "marker.env"
    marker_values = {"CZ_DISPOSABLE_TARGET": "YES", "OPERATION": "reset", "SOURCE_COMMIT": COMMIT,
                     "WORKSPACE": str(workspace.resolve()), "PROJECT_ID": project,
                     "DB_PORT": str(port), "VOLUME": volume}
    marker_values.update(kw.get("marker_values", {}))
    marker.write_text("".join(f"{k}={v}\n" for k, v in marker_values.items()), encoding="utf-8")
    target = {"container_id": "fixture-container", "project_id": project, "volume": volume,
              "db_port": port, "workspace": str(workspace.resolve()), "status": "created",
              "volume_exists": True, "ambiguous": False}
    target.update(kw.get("target", {}))
    args = argparse.Namespace(operation=kw.get("operation", "reset"), workspace=str(workspace),
        expected_commit=kw.get("expected_commit", COMMIT), project_id=project, db_port=port,
        volume=volume, marker=str(marker))
    return args, target, workspace

def run_valid(args, target, workspace, commit=COMMIT):
    guard.validate(args, guard.FixtureDockerInspector([target]), lambda _: commit)

def expect_fail(fn):
    try: fn()
    except guard.GuardError: return
    raise AssertionError("expected GuardError")

def test_matrix():
    cases = []
    def add(name, **kw): cases.append((name, kw))
    add("valid")
    add("protected_project", project="celula-zero-gate-1")
    add("protected_volume", volume="supabase_db_celula-zero-clean-habitable-n1-v5")
    add("marker_missing", marker_values={"CZ_DISPOSABLE_TARGET": ""})
    add("marker_false", marker_values={"CZ_DISPOSABLE_TARGET": "NO"})
    add("expected_commit_mismatch", expected_commit="0" * 40)
    add("workspace_commit_mismatch", commit="0" * 40)
    add("config_project_mismatch", config_project="wrong-recovery-disposable")
    add("config_port_mismatch", config_port=59423)
    add("live_project_mismatch", target={"project_id": "other-recovery-disposable"})
    add("live_volume_mismatch", target={"volume": "other-recovery-disposable-volume"})
    add("live_port_mismatch", target={"db_port": 59423})
    add("zero_docker_matches", target="zero")
    add("multiple_docker_matches", target="multiple")
    add("docker_unavailable", target="unavailable")
    add("protected_disposable_live_volume", target={"volume": "cz-habitable-alpha-wave1-disposable"})
    add("marker_project_mismatch", marker_values={"PROJECT_ID": "other-recovery-disposable"})
    add("marker_volume_mismatch", marker_values={"VOLUME": "other-recovery-disposable-volume"})
    add("marker_port_mismatch", marker_values={"DB_PORT": "59999"})
    add("marker_workspace_mismatch", marker_values={"WORKSPACE": "/private/tmp/other"})
    add("config_outside_workspace", no_config=True)
    add("main_looking_wrong_commit", commit="0" * 40)
    add("unknown_operation", operation="drop")
    add("insufficient_arguments", insufficient=True)
    add("correct_project_wrong_workspace", target={"workspace": "/private/tmp/other-workspace"})
    add("stale_status", target={"status": "exited"})
    add("ambiguous_target", target={"ambiguous": True})
    add("live_workspace_unavailable", target={"workspace": None})
    passed = 0
    for name, kw in cases:
        with tempfile.TemporaryDirectory(prefix="cz-case-") as d:
            args, target, workspace = fixture(Path(d), **{k:v for k,v in kw.items() if k != "target" or isinstance(v, dict)})
            if kw.get("no_config"): (workspace / "supabase" / "config.toml").unlink()
            if kw.get("insufficient"):
                expect_fail(lambda: guard.validate(argparse.Namespace(operation="reset")))
            elif kw.get("target") == "zero": expect_fail(lambda: guard.validate(args, guard.FixtureDockerInspector([]), lambda _: COMMIT))
            elif kw.get("target") == "multiple": expect_fail(lambda: guard.validate(args, guard.FixtureDockerInspector([target, target]), lambda _: COMMIT))
            elif kw.get("target") == "unavailable": expect_fail(lambda: guard.validate(args, guard.FixtureDockerInspector(unavailable=True), lambda _: COMMIT))
            elif name == "expected_commit_mismatch": expect_fail(lambda: run_valid(args, target, workspace))
            elif name in {"workspace_commit_mismatch", "main_looking_wrong_commit"}: expect_fail(lambda: run_valid(args, target, workspace, "0" * 40))
            elif name in {"valid", "live_workspace_unavailable"}: run_valid(args, target, workspace)
            else: expect_fail(lambda: run_valid(args, target, workspace))
            passed += 1
    return len(cases), passed

def test_caller_interlock():
    outcomes = []
    for label, kw in [("valid", {}), ("protected-project", {"project":"celula-zero-gate-1"}),
                      ("protected-volume", {"volume":"supabase_db_celula-zero-clean-habitable-n1-v5"}),
                      ("commit-mismatch", {}), ("marker-live-mismatch", {"target":{"volume":"other-recovery-disposable-volume"}}),
                      ("live-protected-volume", {"target":{"volume":"cz-habitable-alpha-wave1-disposable"}})]:
        with tempfile.TemporaryDirectory(prefix="cz-caller-") as d:
            args, target, workspace = fixture(Path(d), **kw)
            invocations = []
            def caller():
                try: run_valid(args, target, workspace, "0" * 40 if label == "commit-mismatch" else COMMIT)
                except guard.GuardError: return
                invocations.append("fake-destructive-command")
            caller()
            if label == "valid": assert len(invocations) == 1
            else: assert len(invocations) == 0, label
            outcomes.append((label, len(invocations)))
    return outcomes

if __name__ == "__main__":
    scenarios, passed = test_matrix()
    outcomes = test_caller_interlock()
    assert scenarios == passed
    print(f"SCENARIOS={scenarios} PASS={passed} FAIL={scenarios-passed}")
    print("CALLER_VALID_INVOCATIONS=1 CALLER_NEGATIVE_INVOCATIONS=0")

#!/usr/bin/env python3
"""Fail-closed, read-only preflight for destructive local DB operations."""
from __future__ import annotations

import argparse
import json
import os
import re
import subprocess
import sys
from pathlib import Path
from typing import Any, Callable

PROTECTED_PROJECTS = {
    "celula-zero-gate-1", "cz-habitable-alpha-wave1-disposable",
    "cz-discovery-loop-v0-20260914",
}
PROTECTED_VOLUMES = {
    "supabase_db_celula-zero-gate-1",
    "supabase_db_cz-entry-identity-persistence-vs1-202609",
    "supabase_db_celula-zero-clean-habitable-n1-v5",
    "supabase_db_celula-zero-t1-founder-rehearsal-7496",
    "supabase_db_cz-habitable-alpha-wave1-disposable",
    "supabase_db_cz-discovery-loop-v0-20260914",
    "cz_forensic_entry_identity_vs1_20260914_p2",
    "cz_forensic_habitable_n1_v5_20260914_p2",
}

class GuardError(ValueError):
    pass

def fail(message: str) -> int:
    print(f"FAIL:{message}", file=sys.stderr)
    return 1

def protected_workspaces() -> set[Path]:
    result = {Path.home() / ".celula-zero"}
    extra = os.environ.get("CZ_LOCAL_PROTECTED_WORKSPACES", "")
    result.update(Path(p).expanduser().resolve() for p in extra.split(os.pathsep) if p)
    return result

def parse_marker(path: Path) -> dict[str, str]:
    try:
        lines = path.read_text(encoding="utf-8").splitlines()
    except OSError as exc:
        raise GuardError("MARKER_UNREADABLE") from exc
    result: dict[str, str] = {}
    for line in lines:
        if not line.strip() or line.lstrip().startswith("#"):
            continue
        if "=" not in line:
            raise GuardError("MARKER_INVALID_LINE")
        key, value = line.split("=", 1)
        result[key.strip()] = value.strip()
    return result

def parse_config(workspace: Path) -> tuple[str, int]:
    path = workspace / "supabase" / "config.toml"
    if not path.is_file():
        raise GuardError("CONFIG_MISSING_IN_WORKSPACE")
    text = path.read_text(encoding="utf-8")
    project = re.search(r"(?m)^\s*project_id\s*=\s*[\"']([^\"']+)[\"']", text)
    port = re.search(r"(?ms)^\s*\[db\]\s*.*?^\s*port\s*=\s*(\d+)", text)
    if not project or not port:
        raise GuardError("CONFIG_INCOMPLETE")
    return project.group(1), int(port.group(1))

def workspace_commit(workspace: Path) -> str:
    try:
        result = subprocess.run(["git", "-C", str(workspace), "rev-parse", "HEAD"],
                                check=True, capture_output=True, text=True)
    except (OSError, subprocess.CalledProcessError) as exc:
        raise GuardError("WORKSPACE_COMMIT_UNREADABLE") from exc
    return result.stdout.strip()

def _docker_json(*args: str) -> Any:
    try:
        result = subprocess.run(["docker", *args], check=True, capture_output=True, text=True)
        return json.loads(result.stdout)
    except (OSError, subprocess.CalledProcessError, json.JSONDecodeError) as exc:
        raise GuardError("DOCKER_UNAVAILABLE") from exc

class LiveDockerInspector:
    """Authoritative production inspector; all Docker operations are read-only."""
    def inspect(self, project_id: str, volume: str, db_port: int, workspace: Path) -> dict[str, Any]:
        try:
            listing = subprocess.run(
                ["docker", "ps", "-a", "--filter", f"label=com.supabase.cli.project={project_id}",
                 "--format", "{{.ID}}"], check=True, capture_output=True, text=True)
        except (OSError, subprocess.CalledProcessError) as exc:
            raise GuardError("DOCKER_UNAVAILABLE") from exc
        ids = [line.strip() for line in listing.stdout.splitlines() if line.strip()]
        if not ids:
            raise GuardError("ZERO_DOCKER_MATCHES")
        candidates = []
        for container_id in ids:
            inspected = _docker_json("inspect", container_id)
            if not isinstance(inspected, list) or len(inspected) != 1:
                raise GuardError("DOCKER_TARGET_AMBIGUOUS")
            candidate = inspected[0]
            mounts = [m for m in candidate.get("Mounts", [])
                      if m.get("Destination", "").rstrip("/") == "/var/lib/postgresql/data"]
            ports = candidate.get("NetworkSettings", {}).get("Ports", {}).get("5432/tcp", []) or []
            if len(mounts) == 1 and any(p.get("HostPort", "").isdigit() for p in ports):
                candidates.append(candidate)
        if not candidates:
            raise GuardError("ZERO_DB_SERVICE_MATCHES")
        if len(candidates) != 1:
            raise GuardError("MULTIPLE_DOCKER_MATCHES")
        item = candidates[0]
        container_id = item.get("Id", ids[0])
        labels = item.get("Config", {}).get("Labels", {}) or {}
        mounts = [m for m in item.get("Mounts", [])
                  if m.get("Destination", "").rstrip("/") == "/var/lib/postgresql/data"]
        if len(mounts) != 1:
            raise GuardError("DOCKER_VOLUME_AMBIGUOUS")
        observed_volume = mounts[0].get("Name") or Path(mounts[0].get("Source", "")).name
        ports = item.get("NetworkSettings", {}).get("Ports", {}).get("5432/tcp", []) or []
        host_ports = {int(p["HostPort"]) for p in ports if p.get("HostPort", "").isdigit()}
        if len(host_ports) != 1:
            raise GuardError("DOCKER_PORT_AMBIGUOUS")
        volume_data = _docker_json("volume", "inspect", observed_volume)
        if not isinstance(volume_data, list) or len(volume_data) != 1:
            raise GuardError("DOCKER_VOLUME_UNAVAILABLE")
        workspace_label = (labels.get("com.supabase.cli.workdir")
                           or labels.get("com.docker.compose.project.working_dir")
                           or labels.get("cz.workspace"))
        return {
            "container_id": container_id,
            "project_id": labels.get("com.supabase.cli.project") or labels.get("com.docker.compose.project"),
            "volume": observed_volume,
            "db_port": next(iter(host_ports)),
            "workspace": workspace_label,
            "status": item.get("State", {}).get("Status"),
            "volume_exists": volume_data[0].get("Name") == observed_volume,
            "ambiguous": False,
        }

class FixtureDockerInspector:
    """Test-only injected inspector; never exposed as production CLI authority."""
    def __init__(self, targets: list[dict[str, Any]] | None = None, unavailable: bool = False):
        self.targets, self.unavailable = targets or [], unavailable
    def inspect(self, project_id: str, volume: str, db_port: int, workspace: Path) -> dict[str, Any]:
        if self.unavailable:
            raise GuardError("DOCKER_UNAVAILABLE")
        if not self.targets:
            raise GuardError("ZERO_DOCKER_MATCHES")
        if len(self.targets) != 1:
            raise GuardError("MULTIPLE_DOCKER_MATCHES")
        return self.targets[0]

def validate(args: argparse.Namespace, inspector: Any = None,
             commit_reader: Callable[[Path], str] = workspace_commit) -> None:
    required = tuple(getattr(args, name, None) for name in
                     ("operation", "workspace", "expected_commit", "project_id", "db_port", "volume", "marker"))
    if any(value in (None, "") for value in required):
        raise GuardError("INSUFFICIENT_ARGUMENTS")
    if args.operation != "reset":
        raise GuardError("UNKNOWN_OPERATION")
    if not re.fullmatch(r"[0-9a-f]{40}", args.expected_commit):
        raise GuardError("EXPECTED_COMMIT_INVALID")
    workspace = Path(args.workspace).expanduser().resolve()
    if not workspace.is_dir():
        raise GuardError("WORKSPACE_MISSING")
    for protected in protected_workspaces():
        try: workspace.relative_to(protected)
        except ValueError: continue
        raise GuardError("WORKSPACE_PROTECTED_OR_DENYLISTED")
    if commit_reader(workspace) != args.expected_commit:
        raise GuardError("WORKSPACE_COMMIT_MISMATCH")
    if args.project_id in PROTECTED_PROJECTS or not re.search(r"(?:recovery|disposable)", args.project_id):
        raise GuardError("PROJECT_NOT_EXPLICITLY_DISPOSABLE")
    if args.volume in PROTECTED_VOLUMES or not re.search(r"(?:recovery|disposable)", args.volume):
        raise GuardError("VOLUME_NOT_EXPLICITLY_DISPOSABLE")
    if not 1024 <= int(args.db_port) <= 65535:
        raise GuardError("DB_PORT_INVALID")
    expected_marker = {
        "CZ_DISPOSABLE_TARGET": "YES", "OPERATION": "reset",
        "SOURCE_COMMIT": args.expected_commit, "WORKSPACE": str(workspace),
        "PROJECT_ID": args.project_id, "DB_PORT": str(args.db_port), "VOLUME": args.volume,
    }
    marker = parse_marker(Path(args.marker))
    if set(marker) - set(expected_marker):
        raise GuardError("MARKER_UNEXPECTED_FIELD")
    if any(marker.get(k) != v for k, v in expected_marker.items()):
        raise GuardError("MARKER_TARGET_MISMATCH")
    config_project, config_port = parse_config(workspace)
    if config_project != args.project_id:
        raise GuardError("CONFIG_PROJECT_ID_MISMATCH")
    if config_port != int(args.db_port):
        raise GuardError("CONFIG_DB_PORT_MISMATCH")
    observed = (inspector or LiveDockerInspector()).inspect(args.project_id, args.volume,
                                                            int(args.db_port), workspace)
    if observed.get("project_id") != args.project_id:
        raise GuardError("LIVE_PROJECT_ID_MISMATCH")
    if observed.get("volume") != args.volume:
        raise GuardError("LIVE_VOLUME_MISMATCH")
    if observed.get("volume") in PROTECTED_VOLUMES:
        raise GuardError("LIVE_PROTECTED_VOLUME")
    if int(observed.get("db_port", -1)) != int(args.db_port):
        raise GuardError("LIVE_DB_PORT_MISMATCH")
    if observed.get("workspace") is not None and Path(str(observed["workspace"])).resolve() != workspace:
        raise GuardError("LIVE_WORKSPACE_MISMATCH")
    if observed.get("status") not in {"running", "created"} or not observed.get("volume_exists", True):
        raise GuardError("LIVE_TARGET_STATUS_UNSAFE")
    if observed.get("ambiguous"):
        raise GuardError("LIVE_TARGET_AMBIGUOUS")

def build_parser() -> argparse.ArgumentParser:
    p = argparse.ArgumentParser(description=__doc__)
    for name in ("operation", "workspace", "expected-commit", "project-id", "volume", "marker"):
        p.add_argument(f"--{name}", required=True)
    p.add_argument("--db-port", type=int, required=True)
    return p

def main() -> int:
    try: validate(build_parser().parse_args())
    except GuardError as exc: return fail(str(exc))
    print("PASS:LIVE_DISPOSABLE_TARGET_VERIFIED")
    return 0

if __name__ == "__main__": raise SystemExit(main())

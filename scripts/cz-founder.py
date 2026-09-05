#!/usr/bin/env python3

from __future__ import annotations

import difflib
import getpass
import hashlib
import json
import os
import re
import subprocess
import sys
import tempfile
import urllib.request
import urllib.error

from datetime import datetime, timezone
from decimal import Decimal
from pathlib import Path


GATEWAY = "https://ai-gateway.vercel.sh/v1"
CHAT = GATEWAY + "/chat/completions"

ROOT = Path.home() / ".celula-zero"
CONFIG_FILE = ROOT / "founder-habitable.json"
SESSION_DIR = ROOT / "founder-sessions"
SNAPSHOT_DIR = ROOT / "room-snapshots"


def stop(message: str) -> None:
    raise RuntimeError(message)


def run(*cmd: str) -> str:
    p = subprocess.run(
        list(cmd),
        text=True,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        env={**os.environ, "NO_COLOR": "1"},
    )
    if p.returncode:
        stop(
            p.stderr.strip()
            or p.stdout.strip()
            or "command failed: " + " ".join(cmd)
        )
    return p.stdout.strip()


def webjson(
    url: str,
    *,
    key: str | None = None,
    payload: dict | None = None,
    timeout: int = 300,
) -> dict:
    headers = {}

    if key:
        headers["Authorization"] = "Bearer " + key

    data = None
    method = "GET"

    if payload is not None:
        headers["Content-Type"] = "application/json"
        data = json.dumps(
            payload,
            ensure_ascii=False,
        ).encode("utf-8")
        method = "POST"

    req = urllib.request.Request(
        url,
        data=data,
        headers=headers,
        method=method,
    )

    try:
        with urllib.request.urlopen(
            req,
            timeout=timeout,
        ) as response:
            return json.loads(
                response.read().decode("utf-8")
            )
    except urllib.error.HTTPError as exc:
        body = exc.read().decode(
            "utf-8",
            errors="replace",
        )[:1200]

        stop(
            f"gateway HTTP {exc.code}: {body}"
        )


def config() -> dict:
    return json.loads(
        CONFIG_FILE.read_text(
            encoding="utf-8"
        )
    )


def snapshot_unavailable(reason: str) -> dict:
    return {
        "room_state": "UNAVAILABLE",
        "room_locator_source": "PORTABLE_SNAPSHOT_FALLBACK",
        "room_context_source": "PORTABLE_SNAPSHOT",
        "room_locator_error": reason,
    }


def room_snapshot_state(
    cfg: dict,
    live_locator: dict,
) -> dict | None:
    """
    Read one explicitly registered, immutable portable Room snapshot.

    This is continuity evidence only. It never becomes Human Direction or
    canonical Git state merely because the live local Room DB is unavailable.
    """
    locator = cfg.get("room_snapshot_locator") or {}

    if not locator:
        return None

    if (
        locator.get("classification")
        != "NON_CANONICAL_ROOM_SNAPSHOT_LOCATOR"
    ):
        return snapshot_unavailable(
            "INVALID_SNAPSHOT_LOCATOR_CLASSIFICATION"
        )

    if locator.get("auto_update") is not False:
        return snapshot_unavailable(
            "SNAPSHOT_LOCATOR_AUTO_UPDATE_NOT_FALSE"
        )

    raw_path = str(locator.get("path") or "").strip()
    expected_sha = str(locator.get("sha256") or "").strip()

    if not raw_path or not expected_sha:
        return snapshot_unavailable(
            "SNAPSHOT_LOCATOR_INCOMPLETE"
        )

    candidate = Path(raw_path).expanduser()

    try:
        resolved = candidate.resolve(strict=True)
        root = SNAPSHOT_DIR.resolve(strict=True)
        resolved.relative_to(root)
    except (FileNotFoundError, ValueError):
        return snapshot_unavailable(
            "SNAPSHOT_PATH_INVALID"
        )

    if candidate.is_symlink() or not resolved.is_file():
        return snapshot_unavailable(
            "SNAPSHOT_PATH_UNSAFE"
        )

    raw = resolved.read_bytes()
    actual_sha = hashlib.sha256(raw).hexdigest()

    if actual_sha != expected_sha:
        return snapshot_unavailable(
            "ROOM_SNAPSHOT_SHA256_MISMATCH"
        )

    try:
        snapshot = json.loads(raw)
    except json.JSONDecodeError:
        return snapshot_unavailable(
            "ROOM_SNAPSHOT_JSON_INVALID"
        )

    if (
        snapshot.get("snapshot_schema")
        != "CZ_ROOM_RESUME_SNAPSHOT_V1"
        or snapshot.get("classification")
        != "NON_CANONICAL_LOCAL_CONTEXT_SNAPSHOT"
    ):
        return snapshot_unavailable(
            "ROOM_SNAPSHOT_SCHEMA_INVALID"
        )

    cycle = snapshot.get("cycle") or {}

    expected_cycle = (
        live_locator.get("cycle_id")
        or locator.get("cycle_id")
    )
    expected_project = (
        live_locator.get("project_id")
        or locator.get("project_id")
    )

    if cycle.get("id") != expected_cycle:
        return snapshot_unavailable(
            "ROOM_SNAPSHOT_CYCLE_MISMATCH"
        )

    observed_project = (
        cycle.get("project_id")
        or snapshot.get("project_id")
    )

    if observed_project != expected_project:
        return snapshot_unavailable(
            "ROOM_SNAPSHOT_PROJECT_MISMATCH"
        )

    if locator.get("cycle_id") != expected_cycle:
        return snapshot_unavailable(
            "SNAPSHOT_LOCATOR_CYCLE_MISMATCH"
        )

    if locator.get("project_id") != expected_project:
        return snapshot_unavailable(
            "SNAPSHOT_LOCATOR_PROJECT_MISMATCH"
        )

    participants = snapshot.get("cycle_participations") or []
    participant_ids = {
        str(item.get("actor_id") or "")
        for item in participants
        if isinstance(item, dict)
    }

    for key in ("human_actor_id", "ai_actor_id"):
        actor_id = live_locator.get(key)
        if actor_id and actor_id not in participant_ids:
            return snapshot_unavailable(
                "ROOM_SNAPSHOT_PARTICIPANT_MISMATCH"
            )

    result = dict(snapshot)
    result["room_state"] = "AVAILABLE"
    result["room_locator_source"] = (
        "PORTABLE_SNAPSHOT_FALLBACK"
    )
    result["room_context_source"] = "PORTABLE_SNAPSHOT"
    result["live_room_state"] = "UNAVAILABLE"
    result["room_resume_mode"] = "READ_ONLY_PORTABLE_SNAPSHOT"
    result["room_snapshot_path"] = str(resolved)
    result["room_snapshot_sha256"] = actual_sha
    return result


def parse_canonical_state_controls(text: str) -> dict:
    direction = "UNKNOWN"
    next_gate = "UNKNOWN"

    for line in text.splitlines():
        if line.startswith("## Current Human Direction"):
            if "—" in line:
                direction = line.split("—", 1)[1].strip()
            elif "-" in line:
                direction = line.split("-", 1)[1].strip()
            break

    marker = "## Current next gate"
    start = text.find(marker)
    if start >= 0:
        match = re.search(r"`([^`\n]+)`", text[start:])
        if match:
            next_gate = match.group(1).strip()

    return {
        "canonical_human_direction": direction,
        "canonical_next_gate": next_gate,
    }


def canonical_state_controls() -> dict:
    try:
        state = run(
            "git",
            "show",
            "origin/main:STATE.md",
        )
    except RuntimeError:
        return {
            "canonical_human_direction": "UNAVAILABLE",
            "canonical_next_gate": "UNAVAILABLE",
        }

    return parse_canonical_state_controls(state)


def room_project_state() -> dict:
    """
    Read the existing Room projection.

    Locator precedence:
      1. explicit ROOM_* environment
      2. persisted NON_CANONICAL_ROOM_LOCATOR fallback

    The persisted locator answers only "where to read".
    It is never organizational truth and is never auto-updated.
    """
    try:
        cfg = config()
    except Exception:
        return {
            "room_state": "UNAVAILABLE",
            "room_locator_error": "CONFIG_UNREADABLE",
        }

    locator = cfg.get("room_locator") or {}

    if locator:
        if (
            locator.get("classification")
            != "NON_CANONICAL_ROOM_LOCATOR"
        ):
            return {
                "room_state": "UNAVAILABLE",
                "room_locator_error":
                    "INVALID_LOCATOR_CLASSIFICATION",
            }

        if locator.get("auto_update") is not False:
            return {
                "room_state": "UNAVAILABLE",
                "room_locator_error":
                    "LOCATOR_AUTO_UPDATE_NOT_FALSE",
            }

    mapping = {
        "ROOM_PROFILE_ID": "profile_id",
        "ROOM_HUMAN_ACTOR_ID": "human_actor_id",
        "ROOM_AI_ACTOR_ID": "ai_actor_id",
        "ROOM_PROJECT_ID": "project_id",
        "ROOM_CYCLE_ID": "cycle_id",
    }

    child_env = os.environ.copy()
    fallback_keys = []

    for env_name, locator_key in mapping.items():
        if child_env.get(env_name):
            continue

        value = locator.get(locator_key)

        if value:
            child_env[env_name] = str(value)
            fallback_keys.append(env_name)

    missing = [
        env_name
        for env_name in mapping
        if not child_env.get(env_name)
    ]

    if missing:
        return {
            "room_state": "UNAVAILABLE",
            "room_locator_error":
                "ROOM_LOCATOR_INCOMPLETE",
            "room_locator_missing": missing,
        }

    if not fallback_keys:
        locator_source = "ENV_ONLY"
    elif len(fallback_keys) == len(mapping):
        locator_source = "PERSISTED_FALLBACK"
    else:
        locator_source = "MIXED_ENV_AND_FALLBACK"

    repo_root = Path(__file__).resolve().parents[1]

    node_code = (
        "import('./scripts/cz-room.mjs')"
        ".then(m => m.project())"
        ".then(p => console.log(JSON.stringify(p)))"
        ".catch(e => {"
        " console.error(e.message);"
        " process.exit(1);"
        "})"
    )

    result = subprocess.run(
        ["node", "-e", node_code],
        cwd=str(repo_root),
        env=child_env,
        text=True,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
    )

    if result.returncode != 0:
        snapshot = room_snapshot_state(
            cfg,
            locator,
        )

        if snapshot is not None:
            return snapshot

        return {
            "room_state": "UNAVAILABLE",
            "room_locator_source": locator_source,
            "room_context_source": "LIVE_ROOM",
            "room_locator_error":
                "ROOM_PROJECT_READ_FAILED",
        }

    try:
        room = json.loads(result.stdout.strip())
    except json.JSONDecodeError:
        return {
            "room_state": "UNAVAILABLE",
            "room_locator_source": locator_source,
            "room_locator_error":
                "ROOM_PROJECT_JSON_INVALID",
        }

    # --------------------------------------------------------
    # A persisted locator is discovery metadata, not authority.
    # When it was actually used, validate what the Room returned.
    # --------------------------------------------------------
    mismatches = []

    if fallback_keys:
        cycle = room.get("cycle") or {}

        expected_cycle = locator.get("cycle_id")
        observed_cycle = cycle.get("id")

        if (
            expected_cycle
            and observed_cycle != expected_cycle
        ):
            mismatches.append(
                "CYCLE_ID_MISMATCH"
            )

        expected_project = locator.get("project_id")
        observed_project = cycle.get("project_id")

        if (
            expected_project
            and observed_project != expected_project
        ):
            mismatches.append(
                "PROJECT_ID_MISMATCH"
            )

        participants = room.get("cycle_participations") or []

        participant_ids = {
            str(
                participant.get("actor_id")
                or participant.get("id")
                or ""
            )
            for participant in participants
        }

        expected_human = locator.get("human_actor_id")
        if (
            expected_human
            and expected_human not in participant_ids
        ):
            mismatches.append(
                "HUMAN_ACTOR_NOT_IN_CYCLE"
            )

        expected_ai = locator.get("ai_actor_id")
        if (
            expected_ai
            and expected_ai not in participant_ids
        ):
            mismatches.append(
                "AI_ACTOR_NOT_IN_CYCLE"
            )

        # ROOM_PROFILE_ID is indirectly validated by the Room
        # authenticated read itself. It is not promoted to
        # organizational data by this bootstrap.

    if mismatches:
        return {
            "room_state":
                "LOCATOR_CONTEXT_MISMATCH",
            "room_locator_source":
                locator_source,
            "room_locator_mismatches":
                mismatches,
        }

    room["room_state"] = "AVAILABLE"
    room["room_locator_source"] = locator_source
    room["room_locator_fallback_keys"] = fallback_keys

    return room


def git_sha(label: str, *cmd: str) -> str:
    try:
        return run(*cmd)
    except RuntimeError:
        return f"UNAVAILABLE:{label}"


def git_is_ancestor(older: str, newer: str) -> bool | None:
    if (
        not older
        or not newer
        or older.startswith("UNAVAILABLE")
        or newer.startswith("UNAVAILABLE")
    ):
        return None

    result = subprocess.run(
        ["git", "merge-base", "--is-ancestor", older, newer],
        text=True,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        env={**os.environ, "NO_COLOR": "1"},
    )

    if result.returncode == 0:
        return True
    if result.returncode == 1:
        return False
    return None


def git_relation_to_remote(candidate: str, remote: str) -> str:
    if (
        not candidate
        or not remote
        or candidate.startswith("UNAVAILABLE")
        or remote.startswith("UNAVAILABLE")
    ):
        return "UNKNOWN"

    if candidate == remote:
        return "SAME"

    candidate_before_remote = git_is_ancestor(candidate, remote)
    remote_before_candidate = git_is_ancestor(remote, candidate)

    if candidate_before_remote is True:
        return "BEHIND"

    if remote_before_candidate is True:
        return "AHEAD"

    if (
        candidate_before_remote is False
        and remote_before_candidate is False
    ):
        return "DIVERGED"

    return "UNKNOWN"


def read_only_bootstrap() -> dict:
    """
    Gate 5 Session Bootstrap.

    Reads existing Room, Git and local worktree state.
    No model call. No DB write. No Git write.
    """
    room = room_project_state()

    room_state = room.get("room_state") or "AVAILABLE"

    room_available = (
        room_state == "AVAILABLE"
    )

    room_context_source = (
        room.get("room_context_source")
        or ("LIVE_ROOM" if room_available else "UNAVAILABLE")
    )

    controls = canonical_state_controls()

    cycle = room.get("cycle") or {}
    canonical_state = room.get("canonical_state") or {}

    room_base = (
        canonical_state.get("base")
        or "UNAVAILABLE:ROOM_BASE"
    )
    room_base_source = (
        canonical_state.get("source")
        or "UNKNOWN"
    )

    remote_main = git_sha(
        "REMOTE_MAIN",
        "git",
        "rev-parse",
        "origin/main",
    )

    local_head = git_sha(
        "LOCAL_HEAD",
        "git",
        "rev-parse",
        "HEAD",
    )

    try:
        git_status = run(
            "git",
            "status",
            "--short",
            "--branch",
        )
    except RuntimeError:
        git_status = "UNAVAILABLE:GIT_STATUS"

    local_dirty = any(
        line.strip()
        and not line.startswith("##")
        for line in git_status.splitlines()
    )

    human_direction_id = (
        cycle.get("current_direction_record_id")
        or (room.get("human_direction") or {}).get("id")
    )

    plan_inputs = [
        record
        for record in (
            room.get("human_original_records") or []
        )
        if (
            (record.get("provenance") or {})
            .get("room_kind")
            == "PLAN_INPUT"
        )
    ]

    current_plan = max(
        plan_inputs,
        key=lambda record: (
            str(record.get("created_at") or ""),
            str(record.get("id") or ""),
        ),
        default=None,
    )

    current_plan_id = (
        current_plan.get("id")
        if current_plan
        else None
    )

    current_plan_content = (
        current_plan.get("content", "")
        if current_plan
        else ""
    )

    match = re.search(
        r"\bDREAM30D-G\d+-T\d+\b",
        current_plan_content,
    )

    current_plan_label = (
        match.group(0)
        if match
        else "UNLABELED"
    )

    # This is deliberately evidence-based:
    # report the restriction already present in the human PLAN_INPUT.
    implementation_not_authorized = (
        "não autoriza ainda implementação"
        in current_plan_content.lower()
    )

    blockers: list[str] = []

    if room_state == "LOCATOR_CONTEXT_MISMATCH":
        blockers.append("ROOM_LOCATOR_CONTEXT_MISMATCH")
    elif not room_available:
        blockers.append("ROOM_DB_UNREACHABLE")

    if remote_main.startswith("UNAVAILABLE"):
        blockers.append("REMOTE_MAIN_UNRESOLVED")

    if local_head.startswith("UNAVAILABLE"):
        blockers.append("LOCAL_HEAD_UNRESOLVED")

    if room_available and not human_direction_id:
        blockers.append("HUMAN_DIRECTION_MISSING")

    if room_available and not current_plan_id:
        blockers.append("CURRENT_PLAN_INPUT_MISSING")

    if implementation_not_authorized:
        blockers.append(
            "G5_IMPLEMENTATION_NOT_YET_AUTHORIZED"
        )

    if "ROOM_LOCATOR_CONTEXT_MISMATCH" in blockers:
        next_move = "HUMAN_REVIEW_ROOM_LOCATOR"

    elif "ROOM_DB_UNREACHABLE" in blockers:
        next_move = "RESTORE_ROOM_READ_PATH"

    elif (
        "REMOTE_MAIN_UNRESOLVED" in blockers
        or "LOCAL_HEAD_UNRESOLVED" in blockers
    ):
        next_move = "REPAIR_GIT_READ_PATH"

    elif "HUMAN_DIRECTION_MISSING" in blockers:
        next_move = "PROVIDE_HUMAN_DIRECTION"

    elif "CURRENT_PLAN_INPUT_MISSING" in blockers:
        next_move = "PROVIDE_PLAN_INPUT"

    elif implementation_not_authorized:
        next_move = (
            "REQUEST_HUMAN_AUTHORIZATION_"
            "FOR_G5_IMPLEMENTATION"
        )

    elif room_context_source == "PORTABLE_SNAPSHOT":
        next_move = "FOLLOW_CANONICAL_NEXT_GATE_FROM_GIT"

    else:
        next_move = (
            "REVIEW_CURRENT_PLAN_INPUT_"
            "FOR_NEXT_ACTION"
        )

    return {
        "room_state":
            room_state,

        "room_locator_source":
            room.get("room_locator_source")
            or "UNKNOWN",

        "room_context_source":
            room_context_source,

        "live_room_state":
            room.get("live_room_state")
            or (
                "AVAILABLE"
                if room_context_source == "LIVE_ROOM"
                and room_available
                else "UNAVAILABLE"
            ),

        "room_resume_mode":
            room.get("room_resume_mode")
            or (
                "LIVE_ROOM"
                if room_context_source == "LIVE_ROOM"
                else "UNAVAILABLE"
            ),

        "room_snapshot_sha256":
            room.get("room_snapshot_sha256")
            or "NONE",

        "room_direction_authority":
            (
                "HISTORICAL_NON_CANONICAL_SNAPSHOT"
                if room_context_source == "PORTABLE_SNAPSHOT"
                else "ROOM_CONTEXT_ONLY"
            ),

        "canonical_human_direction":
            controls["canonical_human_direction"],

        "canonical_next_gate":
            controls["canonical_next_gate"],

        "cycle_id":
            cycle.get("id") or "UNKNOWN",

        "cycle_state":
            cycle.get("state") or "UNKNOWN",

        "phase":
            cycle.get("current_phase") or "UNKNOWN",

        "human_direction_id":
            human_direction_id or "NONE",

        "current_plan_input_id":
            current_plan_id or "NONE",

        "current_plan_label":
            current_plan_label,

        "room_base_sha":
            room_base,

        "room_base_source":
            room_base_source,

        "remote_main_sha":
            remote_main,

        "local_head_sha":
            local_head,

        "room_base_relation_to_remote":
            git_relation_to_remote(
                room_base,
                remote_main,
            ),

        "local_head_relation_to_remote":
            git_relation_to_remote(
                local_head,
                remote_main,
            ),

        "git_status":
            git_status,

        "local_dirty":
            local_dirty,

        "blockers":
            blockers,

        "next_allowed_move":
            next_move,

        "requires_human":
            bool(blockers),

        "requires_model":
            False,

        "mutation_executed":
            False,
    }


def print_read_only_bootstrap(bootstrap: dict) -> None:
    blockers = bootstrap["blockers"]

    print(
        "============================================================"
    )
    print(
        "CÉLULA ZERO — SESSION BOOTSTRAP"
    )
    print(
        "============================================================"
    )

    print("ROOM_STATE=" + bootstrap["room_state"])
    print(
        "ROOM_LOCATOR_SOURCE="
        + bootstrap["room_locator_source"]
    )
    print(
        "ROOM_CONTEXT_SOURCE="
        + bootstrap["room_context_source"]
    )
    print(
        "LIVE_ROOM_STATE="
        + bootstrap["live_room_state"]
    )
    print(
        "ROOM_RESUME_MODE="
        + bootstrap["room_resume_mode"]
    )
    print(
        "ROOM_SNAPSHOT_SHA256="
        + bootstrap["room_snapshot_sha256"]
    )
    print(
        "ROOM_DIRECTION_AUTHORITY="
        + bootstrap["room_direction_authority"]
    )
    print(
        "CANONICAL_HUMAN_DIRECTION="
        + bootstrap["canonical_human_direction"]
    )
    print(
        "CANONICAL_NEXT_GATE="
        + bootstrap["canonical_next_gate"]
    )
    print("CYCLE_ID=" + bootstrap["cycle_id"])
    print("CYCLE_STATE=" + bootstrap["cycle_state"])
    print("PHASE=" + bootstrap["phase"])

    print(
        "HUMAN_DIRECTION_ID="
        + bootstrap["human_direction_id"]
    )
    print(
        "ROOM_HUMAN_DIRECTION_ID="
        + bootstrap["human_direction_id"]
    )

    print(
        "CURRENT_PLAN_INPUT_ID="
        + bootstrap["current_plan_input_id"]
    )

    print(
        "CURRENT_PLAN_LABEL="
        + bootstrap["current_plan_label"]
    )

    print(
        "ROOM_BASE_SHA="
        + bootstrap["room_base_sha"]
    )

    print(
        "ROOM_BASE_SOURCE="
        + bootstrap["room_base_source"]
    )

    print(
        "REMOTE_MAIN_SHA="
        + bootstrap["remote_main_sha"]
    )

    print(
        "LOCAL_HEAD_SHA="
        + bootstrap["local_head_sha"]
    )

    print(
        "ROOM_BASE_RELATION_TO_REMOTE="
        + bootstrap[
            "room_base_relation_to_remote"
        ]
    )

    print(
        "LOCAL_HEAD_RELATION_TO_REMOTE="
        + bootstrap[
            "local_head_relation_to_remote"
        ]
    )

    print(
        "LOCAL_DIRTY="
        + (
            "YES"
            if bootstrap["local_dirty"]
            else "NO"
        )
    )

    print(
        "BLOCKERS="
        + (
            ",".join(blockers)
            if blockers
            else "NONE"
        )
    )

    print(
        "NEXT_ALLOWED_MOVE="
        + bootstrap["next_allowed_move"]
    )

    print(
        "REQUIRES_HUMAN="
        + (
            "YES"
            if bootstrap["requires_human"]
            else "NO"
        )
    )

    print("REQUIRES_MODEL=NO")
    print("MUTATION_EXECUTED=NO")

    print(
        "============================================================"
    )


def current_state() -> str:
    text = run(
        "git",
        "show",
        "origin/main:STATE.md",
    )

    marker = "## Current Dream / next gate"
    start = text.find(marker)

    if start >= 0:
        text = text[start:]

    marker2 = "\n## Latest completed Dream"
    end = text.find(marker2)

    if end >= 0:
        text = text[:end]

    return text[:10000]


def gateway_key() -> str:
    value = os.environ.get(
        "AI_GATEWAY_API_KEY",
        "",
    ).strip()

    if not value:
        value = getpass.getpass(
            "Vercel AI Gateway API key "
            "(entrada oculta; não será armazenada): "
        ).strip()

    if not value or value in {
        "SUA_CHAVE_AQUI",
        "YOUR_API_KEY",
        "your_api_key_here",
    }:
        stop("AI_GATEWAY_API_KEY missing")

    return value


def credits(key: str) -> dict:
    return webjson(
        GATEWAY + "/credits",
        key=key,
        timeout=30,
    )


def total_used(value: dict) -> Decimal:
    return Decimal(
        str(value["total_used"])
    )


def fresh_rates(
    model: str,
) -> tuple[Decimal, Decimal]:
    """
    Read the current public Vercel AI Gateway model catalog.

    Pricing values are USD per token.
    This is a pre-call safety observation, not a provider invoice.
    """
    obj = webjson(
        GATEWAY + "/models",
        timeout=60,
    )

    rows = obj.get("data") or []

    matches = [
        row
        for row in rows
        if row.get("id") == model
    ]

    if len(matches) != 1:
        stop(
            "Kimi model missing or ambiguous "
            "in fresh Gateway catalog"
        )

    pricing = (
        matches[0].get("pricing")
        or {}
    )

    raw_input = pricing.get("input")
    raw_output = pricing.get("output")

    if (
        raw_input is None
        or raw_output is None
    ):
        stop(
            "fresh Kimi pricing unavailable "
            "in Gateway model catalog"
        )

    input_rate = Decimal(
        str(raw_input)
    )

    output_rate = Decimal(
        str(raw_output)
    )

    if (
        input_rate <= 0
        or output_rate <= 0
    ):
        stop(
            "fresh Kimi pricing invalid"
        )

    print(
        "FRESH_INPUT_USD_PER_M="
        + str(input_rate * Decimal(1_000_000))
    )

    print(
        "FRESH_OUTPUT_USD_PER_M="
        + str(output_rate * Decimal(1_000_000))
    )

    return input_rate, output_rate

def system_prompt(direction: str) -> str:
    return f"""
Você é Kimi trabalhando dentro da Célula Zero para o fundador Marcos.

DIREÇÃO HUMANA ATUAL:
{direction}

O problema vivido agora é simples:
a Célula Zero acumula infraestrutura, testes e registros,
mas Marcos ainda precisa carregar contexto, operar terminal
e coordenar manualmente as IAs para fazê-la avançar.

Sua função é AJUDAR A FAZER A CÉLULA ZERO FICAR PRONTA E ÚTIL
PARA O FUNDADOR.

Preserve:

Original Record != Interpretation != Claim != Evidence
!= Verification != Decision.

PREPARED != EXECUTED != VERIFIED != COMMITTED
!= PUSHED != MERGED != CANONICAL.

Regras:

- não peça usuário externo;
- não proponha frontend por padrão;
- não invente plataforma, daemon, RAG, MCP, blockchain,
  DAO ou nova infraestrutura sem propriedade concreta perdida;
- use primeiro o que já existe;
- reduza plumbing do fundador;
- não transforme sua fala em Human Direction;
- não produza roadmap enorme quando um movimento resolve;
- se existir trabalho técnico concreto, formule o menor
  executor ou mudança capaz de produzir resultado observável;
- diferencie claramente proposta de execução ocorrida.

Responda preferencialmente com:

CURRENT UNDERSTANDING
ONE NEXT MOVE
WHY
EXPECTED RESULT / LEARNING
STOP GATES

A prioridade é progresso real, não documentação sobre progresso.

Você pode PROPOR uma alteração estruturada apenas quando receber conteúdo
exato do arquivo. O runtime, não você, decide se ela é admissível.
Nunca invente autorização. Nunca proponha comandos Git de escrita,
shell arbitrário ou mutação de banco.
""".strip()



ACTION_RE = re.compile(
    r"""<CZ_ACTION_V1>\s*
TYPE:\s*REPLACE_TEXT\s*
PATH:\s*(?P<path>[^\n]+)\s*
<OLD>\n(?P<old>.*?)\n</OLD>\s*
<NEW>\n(?P<new>.*?)\n</NEW>\s*
</CZ_ACTION_V1>""",
    re.S | re.X,
)


FOCUS_MAX_BYTES = 50 * 1024


def resolve_safe_repo_file(
    raw: str,
) -> tuple[str, Path]:
    """
    Resolve one explicit UTF-8 text file inside this Git worktree.

    Deterministically reject:
    - absolute paths;
    - parent traversal;
    - .git internals;
    - symlinks in any path component;
    - non-files;
    - files larger than 50 KiB.
    """

    raw = raw.strip()

    if not raw:
        raise ValueError(
            "focus path is empty"
        )

    rel = Path(raw)

    if (
        rel.is_absolute()
        or raw.startswith("~")
        or ".." in rel.parts
    ):
        raise ValueError(
            "focus path must be relative "
            "and must not contain '..'"
        )

    if (
        rel.parts
        and rel.parts[0] == ".git"
    ):
        raise ValueError(
            ".git internals cannot be focused"
        )

    root = Path(
        run(
            "git",
            "rev-parse",
            "--show-toplevel",
        )
    ).resolve()

    candidate = root

    for part in rel.parts:
        candidate = candidate / part

        if candidate.is_symlink():
            raise ValueError(
                "focus path contains a symlink"
            )

    try:
        resolved = candidate.resolve(
            strict=True
        )
    except FileNotFoundError:
        raise ValueError(
            "focus file does not exist"
        )

    try:
        normalized = resolved.relative_to(
            root
        )
    except ValueError:
        raise ValueError(
            "focus file is outside repository"
        )

    if not resolved.is_file():
        raise ValueError(
            "focus path is not a regular file"
        )

    size = resolved.stat().st_size

    if size > FOCUS_MAX_BYTES:
        raise ValueError(
            "focus file exceeds 50 KiB "
            f"({size} bytes)"
        )

    return (
        normalized.as_posix(),
        resolved,
    )


def exact_file_block(
    relative_path: str,
) -> str:
    normalized, path = (
        resolve_safe_repo_file(
            relative_path
        )
    )

    try:
        content = path.read_text(
            encoding="utf-8"
        )
    except UnicodeDecodeError:
        raise ValueError(
            "focus file is not UTF-8 text"
        )

    return "\n".join([
        (
            "===== EXACT LOCAL FILE: "
            + normalized
            + " ====="
        ),
        "SHA256=" + sha256(content),
        content,
        (
            "===== END EXACT LOCAL FILE: "
            + normalized
            + " ====="
        ),
    ])


def safe_focus_context(
    focus_path: str | None,
) -> tuple[set[str], str]:
    """
    Explicit focus narrows both context and write capability
    to exactly one founder-selected repository file.

    Without explicit focus, preserve the existing launcher
    self-modification context.
    """

    if focus_path is not None:
        normalized, _ = (
            resolve_safe_repo_file(
                focus_path
            )
        )

        return (
            {normalized},
            exact_file_block(
                normalized
            ),
        )

    allowed = {
        "package.json",
        "scripts/cz-founder.py",
    }

    raw = run(
        "git",
        "status",
        "--porcelain=v1",
    )

    observed = set()

    for line in raw.splitlines():
        if len(line) < 4:
            continue

        path = line[3:].strip()

        if " -> " in path:
            path = path.split(
                " -> ",
                1,
            )[1]

        if path in allowed:
            observed.add(path)

    blocks = []

    for path in sorted(observed):
        try:
            blocks.append(
                exact_file_block(path)
            )
        except ValueError:
            continue

    return (
        observed,
        "\n\n".join(blocks)
        or "NONE",
    )

def parse_action(text: str):
    if "<CZ_ACTION_V1>" not in text:
        return None

    matches = list(
        ACTION_RE.finditer(text)
    )

    if len(matches) != 1:
        return {
            "invalid":
                "expected exactly one valid CZ_ACTION_V1 block"
        }

    m = matches[0]

    return {
        "type": "REPLACE_TEXT",
        "path": m.group("path").strip(),
        "old": m.group("old"),
        "new": m.group("new"),
    }


def atomic_write(path: Path, text: str) -> None:
    mode = path.stat().st_mode

    with tempfile.NamedTemporaryFile(
        mode="w",
        encoding="utf-8",
        dir=path.parent,
        prefix=path.name + ".cz-",
        delete=False,
    ) as tmp:
        tmp.write(text)
        tmp_path = Path(tmp.name)

    os.chmod(tmp_path, mode)
    os.replace(tmp_path, path)


def validate_local_change(path: str) -> list[str]:
    results = []

    if path.endswith(".py"):
        p = subprocess.run(
            [
                sys.executable,
                "-m",
                "py_compile",
                path,
            ],
            text=True,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
        )

        if p.returncode:
            raise RuntimeError(
                "python syntax validation failed: "
                + p.stderr.strip()
            )

        results.append(
            "PY_COMPILE=PASS"
        )

    if path == "package.json":
        json.loads(
            Path(path).read_text(
                encoding="utf-8"
            )
        )

        results.append(
            "PACKAGE_JSON=PASS"
        )

    p = subprocess.run(
        [
            "git",
            "diff",
            "--check",
        ],
        text=True,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
    )

    if p.returncode:
        raise RuntimeError(
            "git diff --check failed: "
            + (
                p.stdout.strip()
                or p.stderr.strip()
            )
        )

    results.append(
        "GIT_DIFF_CHECK=PASS"
    )

    return results


def offer_action(
    response_text: str,
    focus_paths: set[str],
    evidence_file: Path,
) -> None:
    action = parse_action(
        response_text
    )

    if action is None:
        print(
            "ACTION_PROPOSAL=NONE"
        )
        return

    if action.get("invalid"):
        print(
            "ACTION_PROPOSAL=INVALID"
        )
        print(
            "ACTION_REASON="
            + action["invalid"]
        )
        print(
            "ACTION_EXECUTED=NO"
        )
        return

    path = action["path"]

    if path not in focus_paths:
        print(
            "ACTION_PROPOSAL=REJECTED"
        )
        print(
            "ACTION_REASON=PATH_NOT_IN_EXACT_FOCUS_CONTEXT"
        )
        print(
            "ACTION_EXECUTED=NO"
        )
        return

    try:
        normalized, target = (
            resolve_safe_repo_file(path)
        )
    except ValueError as exc:
        print(
            "ACTION_PROPOSAL=REJECTED"
        )
        print(
            "ACTION_REASON=UNSAFE_PATH:"
            + str(exc)
        )
        print(
            "ACTION_EXECUTED=NO"
        )
        return

    if normalized != path:
        print(
            "ACTION_PROPOSAL=REJECTED"
        )
        print(
            "ACTION_REASON=PATH_NOT_NORMALIZED"
        )
        print(
            "ACTION_EXECUTED=NO"
        )
        return

    original = target.read_text(
        encoding="utf-8"
    )

    old = action["old"]
    new = action["new"]

    if not old:
        print(
            "ACTION_PROPOSAL=REJECTED"
        )
        print(
            "ACTION_REASON=EMPTY_OLD_TEXT"
        )
        print(
            "ACTION_EXECUTED=NO"
        )
        return

    if original.count(old) != 1:
        print(
            "ACTION_PROPOSAL=REJECTED"
        )
        print(
            "ACTION_REASON=OLD_TEXT_NOT_EXACTLY_ONCE"
        )
        print(
            "ACTION_EXECUTED=NO"
        )
        return

    candidate = original.replace(
        old,
        new,
        1,
    )

    diff = "".join(
        difflib.unified_diff(
            original.splitlines(True),
            candidate.splitlines(True),
            fromfile="a/" + path,
            tofile="b/" + path,
        )
    )

    if not diff:
        print(
            "ACTION_PROPOSAL=REJECTED"
        )
        print(
            "ACTION_REASON=NO_CHANGE"
        )
        print(
            "ACTION_EXECUTED=NO"
        )
        return

    print()
    print(
        "===== AI PROPOSED LOCAL CHANGE ====="
    )
    print(
        "TYPE=REPLACE_TEXT"
    )
    print(
        "PATH=" + path
    )
    print(
        "SHELL_FROM_MODEL=NO"
    )
    print(
        "GIT_INDEX_WRITE=NO"
    )
    print(
        "DB_WRITE=NO"
    )
    print()
    print(diff)

    answer = input(
        "Aplicar exatamente esta alteração local? [y/N] "
    ).strip().lower()

    if answer not in {
        "y",
        "yes",
        "s",
        "sim",
    }:
        print(
            "ACTION_AUTHORIZATION=NO"
        )
        print(
            "ACTION_EXECUTED=NO"
        )
        return

    before_bytes = target.read_bytes()

    try:
        atomic_write(
            target,
            candidate,
        )

        validation = (
            validate_local_change(path)
        )

    except Exception as exc:
        target.write_bytes(
            before_bytes
        )

        print(
            "ACTION_AUTHORIZATION=YES"
        )
        print(
            "ACTION_EXECUTED=YES"
        )
        print(
            "ACTION_RESULT=ROLLED_BACK"
        )
        print(
            "ACTION_ERROR="
            + str(exc)
        )

        return

    execution_file = (
        evidence_file
        .with_name(
            evidence_file.stem
            + ".execution.json"
        )
    )

    execution = {
        "schema":
            "CZ_FOUNDER_LOCAL_EXECUTION_V1",

        "classification":
            "NON_CANONICAL_LOCAL_EXECUTION",

        "action_type":
            "REPLACE_TEXT",

        "path":
            path,

        "founder_authorization":
            "YES",

        "executed":
            True,

        "result":
            "PASS",

        "before_sha256":
            hashlib.sha256(
                before_bytes
            ).hexdigest(),

        "after_sha256":
            sha256(candidate),

        "diff_sha256":
            sha256(diff),

        "validation":
            validation,

        "git_index_write":
            False,

        "commit":
            False,

        "push":
            False,

        "db_write":
            False,
    }

    execution_file.write_text(
        json.dumps(
            execution,
            ensure_ascii=False,
            indent=2,
        ) + "\n",
        encoding="utf-8",
    )

    execution_file.chmod(0o600)

    print(
        "ACTION_AUTHORIZATION=YES"
    )
    print(
        "ACTION_EXECUTED=YES"
    )
    print(
        "ACTION_RESULT=PASS"
    )

    for item in validation:
        print(item)

    print(
        "LOCAL_EXECUTION_EVIDENCE="
        + str(execution_file)
    )


def human_prompt(
    state: str,
    git_status: str,
    focus: str,
    message: str,
) -> str:
    return f"""
===== CANONICAL CURRENT STATE =====

{state}

===== LOCAL WORKTREE =====

{git_status}

===== EXACT LOCAL FOCUS FILES =====

{focus}

===== HUMAN ORIGINAL RECORD =====

{message}

===== REQUEST =====

Ajude Marcos a avançar a Célula Zero a partir dessa necessidade real.
Escolha o menor próximo movimento com consequência concreta.

Se — e somente se — você consegue realizar UMA alteração local concreta
usando o conteúdo EXATO de um arquivo mostrado em EXACT LOCAL FOCUS FILES,
pode anexar ao final da resposta exatamente um bloco:

<CZ_ACTION_V1>
TYPE: REPLACE_TEXT
PATH: caminho/exato
<OLD>
texto existente copiado exatamente
</OLD>
<NEW>
texto substituto completo
</NEW>
</CZ_ACTION_V1>

Regras do action block:

- apenas REPLACE_TEXT;
- apenas arquivo mostrado em EXACT LOCAL FOCUS FILES;
- OLD precisa existir exatamente uma vez;
- proponha a menor alteração suficiente;
- não forneça shell;
- não proponha git add/reset/commit/push/merge/rebase;
- não proponha DB write;
- não alegue execução;
- se você não possui conteúdo exato suficiente, NÃO gere action block.
""".strip()


def sha256(text: str) -> str:
    return hashlib.sha256(
        text.encode("utf-8")
    ).hexdigest()


def save_evidence(
    *,
    base: str,
    cfg: dict,
    human: str,
    response: str,
    usage: dict,
    returned_model,
    response_id,
    before: dict,
    after: dict,
    delta: Decimal,
    session_spend: Decimal,
) -> Path:
    SESSION_DIR.mkdir(
        parents=True,
        exist_ok=True,
        mode=0o700,
    )

    stamp = (
        datetime.now(timezone.utc)
        .isoformat()
        .replace(":", "-")
        .replace(".", "-")
    )

    path = (
        SESSION_DIR
        / f"{stamp}.json"
    )

    record = {
        "schema":
            "CZ_FOUNDER_KIMI_TURN_V1",

        "classification":
            "NON_CANONICAL_LOCAL_AI_CONTRIBUTION",

        "canonical_base": base,

        "human_direction":
            cfg["direction"],

        "human_original_record":
            human,

        "provider":
            "VERCEL_AI_GATEWAY",

        "requested_model":
            cfg["model"],

        "returned_model":
            returned_model,

        "response_id":
            response_id,

        "ai_response":
            response,

        "response_sha256":
            sha256(response),

        "usage":
            usage,

        "gateway_total_used_before":
            before.get("total_used"),

        "gateway_total_used_after":
            after.get("total_used"),

        "observed_account_delta_usd":
            str(delta),

        "session_observed_spend_usd":
            str(session_spend),

        "authority_boundaries": [
            "AI contribution != Human Direction",
            "response != execution",
            "local record != canonical Git state"
        ],
    }

    path.write_text(
        json.dumps(
            record,
            ensure_ascii=False,
            indent=2,
        ) + "\n",
        encoding="utf-8",
    )

    path.chmod(0o600)

    return path


def read_message(input_fn=input) -> str | None:
    """
    Read one founder message.

    Default:
      one line + Enter -> send immediately

    Multiline:
      /multi
      <one or more lines>
      /send

    Controls inside multiline:
      /cancel -> discard block
      /quit   -> exit Founder Mode
    """
    first = input_fn("\nMarcos > ")

    if first == "":
        return None

    if first == "/quit":
        return "/quit"

    if first != "/multi":
        # Preserve previous single-line behavior while preventing
        # whitespace-only input from causing a model call.
        message = first.strip()
        return message or None

    lines: list[str] = []

    while True:
        line = input_fn("")

        if line == "/send":
            if not lines:
                return None
            return "\n".join(lines)

        if line == "/cancel":
            return None

        if line == "/quit":
            return "/quit"

        # Preserve the line exactly as input(), including
        # intentional leading/trailing spaces and blank lines.
        lines.append(line)


def main() -> None:
    cfg = config()

    model = cfg["model"]

    call_cap = Decimal(
        cfg["call_cap_usd"]
    )

    session_cap = Decimal(
        cfg["session_cap_usd"]
    )

    max_calls = int(
        cfg["max_calls_per_session"]
    )

    max_tokens = int(
        cfg["max_output_tokens"]
    )

    bootstrap = read_only_bootstrap()
    print_read_only_bootstrap(bootstrap)

    base = bootstrap["remote_main_sha"]
    state = current_state()
    git_status = bootstrap["git_status"]

    focus_rel: str | None = None

    print(
        "============================================================"
    )
    print(
        "CÉLULA ZERO — FOUNDER MODE / KIMI"
    )
    print(
        "============================================================"
    )
    print("CANONICAL_MAIN=" + base)
    print("MODEL=" + model)
    print("GATEWAY=VERCEL_AI_GATEWAY")
    print(
        f"CALL_CAP_USD={call_cap}"
    )
    print(
        f"SESSION_CAP_USD={session_cap}"
    )
    print(
        f"MAX_CALLS={max_calls}"
    )
    print(
        "KEY_STORAGE=NO"
    )
    print(
        "CANONICAL_WRITE_AUTHORITY=NO"
    )
    print(
        "============================================================"
    )

    if "--check" in sys.argv[1:]:
        print("MODEL_CALLS=0")
        print("PAID_SPEND=0")
        return

    key = gateway_key()

    initial_credits = credits(key)

    rates = fresh_rates(model)

    print(
        "GATEWAY_CREDENTIAL=PASS"
    )

    print(
        "GATEWAY_CREDITS_OBSERVABLE=YES"
    )


    history: list[dict] = []
    calls = 0
    session_spend = Decimal("0")

    async_mode = False

    args = [
        x
        for x in sys.argv[1:]
        if x != "--check"
    ]

    pending = (
        " ".join(args).strip()
        if args
        else None
    )

    while True:
        if pending is not None:
            message = pending
            pending = None
        else:
            try:
                message = read_message()
            except EOFError:
                break

        if message is None:
            continue

        if message == "/quit":
            break

        if calls >= max_calls:
            print(
                "\nSESSION_STOP="
                "MAX_PAID_CALLS_REACHED"
            )
            break

        if session_spend >= session_cap:
            print(
                "\nSESSION_STOP="
                "SPEND_CAP_REACHED"
            )
            break

        if (
            message == "/focus"
            or message.startswith(
                "/focus "
            )
        ):
            argument = message[
                len("/focus"):
            ].strip()

            if not argument:
                print(
                    "FOCUS="
                    + (
                        focus_rel
                        if focus_rel
                        else "NONE"
                    )
                )
                print(
                    "MODEL_CALL=NO"
                )
                continue

            if argument == "clear":
                focus_rel = None
                print(
                    "FOCUS=CLEARED"
                )
                print(
                    "MODEL_CALL=NO"
                )
                continue

            try:
                normalized, target = (
                    resolve_safe_repo_file(
                        argument
                    )
                )

                content = target.read_text(
                    encoding="utf-8"
                )

            except (
                ValueError,
                UnicodeDecodeError,
            ) as exc:
                print(
                    "FOCUS=REJECTED"
                )
                print(
                    "FOCUS_REASON="
                    + str(exc)
                )
                print(
                    "MODEL_CALL=NO"
                )
                continue

            focus_rel = normalized

            print(
                "FOCUS=" + focus_rel
            )
            print(
                "FOCUS_BYTES="
                + str(
                    target.stat().st_size
                )
            )
            print(
                "FOCUS_SHA256="
                + sha256(content)
            )
            print(
                "MODEL_CALL=NO"
            )

            continue

        try:
            focus_paths, focus_text = (
                safe_focus_context(
                    focus_rel
                )
            )
        except ValueError as exc:
            print(
                "FOCUS_INVALIDATED=YES"
            )
            print(
                "FOCUS_REASON="
                + str(exc)
            )
            print(
                "MODEL_CALL=NO"
            )
            focus_rel = None
            continue

        prompt = human_prompt(
            state,
            git_status,
            focus_text,
            message,
        )

        payload = {
            "model": model,
            "messages": [
                {
                    "role": "system",
                    "content":
                        system_prompt(
                            cfg["direction"]
                        ),
                },
                *history,
                {
                    "role": "user",
                    "content": prompt,
                },
            ],
            "reasoning": {
                "effort": "none"
            },
            "temperature": 0.25,
            "max_tokens": max_tokens,
            "stream": False,
        }

        request_bytes = json.dumps(
            payload,
            ensure_ascii=False,
        ).encode("utf-8")

        input_rate, output_rate = rates

        # Deliberately conservative:
        # one billed input token per UTF-8 byte.
        upper = (
            Decimal(len(request_bytes))
            * input_rate
            + Decimal(max_tokens)
            * output_rate
        )

        if upper > call_cap:
            print(
                "\nCALL_STOP="
                "CONSERVATIVE_UPPER_BOUND_EXCEEDS_CAP"
            )
            print(
                "UPPER_BOUND_USD="
                + str(upper)
            )
            break

        before = credits(key)
        used_before = total_used(
            before
        )

        raw = webjson(
            CHAT,
            key=key,
            payload=payload,
            timeout=300,
        )

        choice = (
            raw.get("choices")
            or [{}]
        )[0]

        text = (
            (
                choice.get("message")
                or {}
            )
            .get("content")
            or ""
        ).strip()

        if not text:
            stop(
                "Kimi returned no usable text"
            )

        after = credits(key)

        delta = (
            total_used(after)
            - used_before
        )

        if delta < 0:
            stop(
                "negative gateway account delta"
            )

        calls += 1
        session_spend += delta

        usage = (
            raw.get("usage")
            or {}
        )

        evidence = save_evidence(
            base=base,
            cfg=cfg,
            human=message,
            response=text,
            usage=usage,
            returned_model=
                raw.get("model"),
            response_id=
                raw.get("id"),
            before=before,
            after=after,
            delta=delta,
            session_spend=
                session_spend,
        )

        print("\nKIMI\n")
        print(text)

        print()
        print(
            f"CALL={calls}/{max_calls}"
        )
        print(
            "OBSERVED_CALL_COST_USD="
            + str(delta)
        )
        print(
            "OBSERVED_SESSION_COST_USD="
            + str(session_spend)
        )
        print(
            "LOCAL_EVIDENCE="
            + str(evidence)
        )

        offer_action(
            text,
            focus_paths,
            evidence,
        )

        if delta > call_cap:
            print(
                "SESSION_STOP="
                "OBSERVED_CALL_COST_EXCEEDED_CAP"
            )
            break

        if session_spend >= session_cap:
            print(
                "SESSION_STOP="
                "SESSION_CAP_REACHED"
            )
            break

        history.extend([
            {
                "role": "user",
                "content": message,
            },
            {
                "role": "assistant",
                "content": text,
            },
        ])

        # Preserve only the last two
        # dialogue exchanges.
        history = history[-4:]

        if args:
            break


if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print(
            "\nFOUNDER_MODE_INTERRUPTED=YES"
        )
    except Exception as exc:
        print(
            "\nFOUNDER_MODE_ERROR="
            + str(exc)
        )
        raise SystemExit(1)

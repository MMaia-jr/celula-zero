#!/usr/bin/env python3
"""Human terminal interface for the existing private VS1 Living Presence path."""

from __future__ import annotations

import importlib.util
import hashlib
import json
import os
import subprocess
import sys
from datetime import datetime, timezone
from pathlib import Path


ROOT = Path(__file__).resolve().parent.parent
FOUNDER_PATH = ROOT / "scripts" / "cz-founder.py"
_spec = importlib.util.spec_from_file_location("cz_founder", FOUNDER_PATH)
founder = importlib.util.module_from_spec(_spec)
assert _spec.loader is not None
_spec.loader.exec_module(founder)

CONFIRMATION = "AUTORIZO UMA EXECUÇÃO REAL"
INTENT_CONFIRMATION = "CONFIRMAR INTENÇÃO"
PRIVATE_ROOT = Path.home() / ".celula-zero"
RUNTIME_DIR = PRIVATE_ROOT / "runtime"
EXPORT_DIR = PRIVATE_ROOT / "exports"
PENDING_COMMAND_FILE = RUNTIME_DIR / "living-presence-pending.json"
PROVIDER = "moonshotai"
PROVIDER_LABEL = "Moonshot via Vercel AI Gateway"
MODEL = "moonshotai/kimi-k2.6"
MAX_OUTPUT_TOKENS = 4096
DISPOSITIONS = {
    "1": "REJECT",
    "2": "CORRECT",
    "3": "PARTLY_REPRESENTATIVE",
    "4": "ADOPT",
}


def stop(message: str) -> None:
    raise RuntimeError(message)


class LivingPresenceClient(founder.GenesisLocalClient):
    def rpc(self, name: str, payload: dict) -> dict:
        value = founder.local_json_request(
            f"{self.api}/rest/v1/rpc/{name}",
            method="POST",
            payload=payload,
            headers=self.headers,
        )
        if not isinstance(value, dict):
            stop("CZ_RETURNED_AN_INVALID_RESULT")
        return value


def local_configuration() -> tuple[str, str, str, str]:
    output = founder.run(
        "npx", "--yes", "supabase@2.115.0", "status", "-o", "env"
    )
    values = {}
    for raw in output.splitlines():
        if "=" in raw:
            key, value = raw.split("=", 1)
            values[key.strip()] = value.strip().strip('"')
    api = values.get("API_URL", "").rstrip("/")
    public_key = values.get("ANON_KEY") or values.get("PUBLISHABLE_KEY") or ""
    database_url = values.get("DB_URL", "")
    if not api or not public_key or not database_url:
        stop("CZ_LOCAL_BACKEND_IS_NOT_READY")
    _, _, mailpit = founder.local_supabase_configuration()
    return api, public_key, mailpit, database_url


def controlled_human(client: LivingPresenceClient, user: dict) -> dict:
    identity = founder.resolve_genesis_identity(client, user)
    profile = identity["profile"]
    actor = identity["actor"]
    return {
        "profile_name": profile.get("display_name") or actor.get("name") or "Marcos",
        "actor_name": actor.get("name") or profile.get("display_name") or "Marcos",
        "actor_id": str(actor["id"]),
        "profile_id": str(profile["id"]),
        "membership_role": str(identity["owner_link"]["role"]),
    }


def read_workspace(client: LivingPresenceClient, actor_id: str) -> dict:
    records = client.select(
        "preproject_records",
        "id,record_class,content,content_sha256,provenance,created_at",
        owner_actor_id="eq." + actor_id,
        order="created_at.asc",
    )
    candidates = client.select(
        "preproject_candidate_interpretations",
        "id,authorization_id,content,content_sha256,execution_class,provider,model,cost_usd,cost_status,created_at,execution_id",
        subject_actor_id="eq." + actor_id,
        order="created_at.desc",
    )
    authorizations = client.select(
        "preproject_interpretation_authorizations",
        "id,purpose,selected_inputs",
        subject_actor_id="eq." + actor_id,
    )
    reviews = client.select(
        "preproject_interpretation_reviews",
        "id,candidate_id,disposition,human_statement,representation_text,created_at",
        subject_actor_id="eq." + actor_id,
        order="created_at.desc",
    )
    executions = client.select(
        "ai_executions",
        "id,state,provider,model,max_output_tokens,max_spend_usd,created_at,failure_code",
        subject_actor_id="eq." + actor_id,
        order="created_at.desc",
    )
    ai_agents = client.select(
        "actors", "id,name,operator_label", kind="eq.AI_AGENT",
        operator_profile_id="eq." + str(client.profile_id), order="created_at.asc",
    )
    projects = client.select(
        "projects", "id,title,current_intent,stage,visibility,updated_at,steward_actor_id",
        order="updated_at.desc", limit="50",
    )
    project_memberships = client.select(
        "project_members", "project_id,actor_id,role,created_at",
        actor_id="eq." + actor_id, order="created_at.desc", limit="20",
    )
    member_project_ids = {str(row["project_id"]) for row in project_memberships}
    projects = [project for project in projects
                if str(project["steward_actor_id"]) == actor_id
                or str(project["id"]) in member_project_ids]
    needs = client.select(
        "needs", "id,project_id,state,visibility,current_version,updated_at",
        owner_actor_id="eq." + actor_id, order="updated_at.desc", limit="20",
    )
    need_versions = client.select(
        "need_versions", "need_id,version,title,statement,created_at",
        order="created_at.desc", limit="100",
    )
    opportunities = client.select(
        "opportunities", "id,project_id,state,visibility,current_version,updated_at",
        owner_actor_id="eq." + actor_id, order="updated_at.desc", limit="20",
    )
    opportunity_versions = client.select(
        "opportunity_versions", "opportunity_id,version,title,statement,created_at",
        order="created_at.desc", limit="100",
    )
    company_cycles = client.select(
        "company_core_cycles",
        "id,project_id,dragon_cycle_id,need_title,state,result_content,evaluation_verdict,updated_at",
        owner_actor_id="eq." + actor_id, order="updated_at.desc", limit="20",
    )
    cycle_participations = client.select(
        "cycle_participations", "cycle_id,actor_id,social_role,ended_at,valid_from",
        actor_id="eq." + actor_id, order="valid_from.desc", limit="50",
    )
    dragon_cycles = client.select(
        "dragon_cycles", "id,project_id,current_phase,state,created_at,closed_at",
        order="created_at.desc", limit="50",
    )
    cycle_records = client.select(
        "cycle_records", "id,cycle_id,content_class,phase_context,content,provenance,created_at",
        author_actor_id="eq." + actor_id, order="created_at.desc", limit="20",
    )
    artifacts = client.select(
        "artifacts", "id,project_id,kind,uri,visibility,created_at",
        created_by_actor_id="eq." + actor_id, order="created_at.desc", limit="10",
    )
    return {
        "records": records,
        "candidates": candidates,
        "authorizations": authorizations,
        "reviews": reviews,
        "executions": executions,
        "ai_agents": ai_agents,
        "projects": projects, "project_memberships": project_memberships,
        "needs": needs, "need_versions": need_versions,
        "opportunities": opportunities, "opportunity_versions": opportunity_versions,
        "company_cycles": company_cycles, "cycle_participations": cycle_participations,
        "dragon_cycles": dragon_cycles, "cycle_records": cycle_records,
        "artifacts": artifacts,
    }


def canonical_direction() -> dict:
    try:
        revision = founder.run("git", "rev-parse", "origin/main").strip()
        state_text = founder.run("git", "show", revision + ":STATE.md")
    except RuntimeError:
        revision = "UNKNOWN"
        state_text = (ROOT / "STATE.md").read_text(encoding="utf-8")
    controls = founder.parse_canonical_state_controls(state_text)
    if controls["canonical_next_gate"] == "UNKNOWN":
        match = founder.re.search(r"(?m)^Next gate:\s*`([^`\n]+)`", state_text)
        if match:
            controls["canonical_next_gate"] = match.group(1).strip()
    sequence_match = founder.re.search(
        r"(?ms)^Current sequence:\s*\n\s*`[^`\n]+`\s*\n\s*`([^`\n]*→[^`\n]*)`",
        state_text,
    )
    result_pointer_match = founder.re.search(
        r"(?ms)^## Genesis Human / Living Presence[^\n]*\n.*?^Result Package:\s*\n\s*`([^`\n]+)`",
        state_text,
    )
    result_pointer = result_pointer_match.group(1).strip() if result_pointer_match else "UNKNOWN"
    result = "UNKNOWN"
    if revision != "UNKNOWN" and result_pointer != "UNKNOWN":
        try:
            package_text = founder.run("git", "show", revision + ":" + result_pointer)
            result_match = founder.re.search(r"(?ms)^## Result\s*\n\s*`([^`\n]+)`", package_text)
            if result_match:
                result = result_match.group(1).strip()
        except RuntimeError:
            pass
    return {
        **controls,
        "canonical_sequence": sequence_match.group(1).strip() if sequence_match else "UNKNOWN",
        "recent_result": result,
        "result_pointer": result_pointer,
        "source": "STATE.md@" + revision,
        "currentness": (
            "LOCALLY KNOWN ORIGIN/MAIN @ " + revision
            + "; REMOTE FRESHNESS NOT VERIFIED"
        ),
    }


def _version(rows: list[dict], foreign_key: str, item: dict) -> dict | None:
    return next((row for row in rows if str(row.get(foreign_key)) == str(item["id"])
                 and row.get("version") == item.get("current_version")), None)


def founder_context(workspace: dict, human: dict, direction: dict) -> dict:
    """Build a bounded projection. Every item carries its durable source."""
    effective = living_representation(workspace)
    identity = [{
        "text": human["actor_name"], "currentness": "CURRENT AUTHENTICATED IDENTITY",
        "source": (
            f"profiles:{human['profile_id']}; actors:{human['actor_id']}; "
            f"actor_memberships:{human['actor_id']}:{human['profile_id']}:{human['membership_role']}"
        ),
    }]
    identity += [{"text": item["text"], "currentness": "EFFECTIVE HUMAN REVIEW",
                  "source": "preproject_interpretation_reviews:" + str(item["review_id"])}
                 for item in effective[:1]]
    intentions = []
    for record in reversed(workspace["records"]):
        if record["record_class"] != "ORIGINAL_RECORD":
            continue
        is_session = record.get("provenance", {}).get("capture") == "FOUNDER_SESSION_V0"
        if not is_session:
            continue
        intentions.append({
            "text": record["content"],
            "currentness": ("DECLARED CURRENT WHEN RECORDED; NOT REVALIDATED"
                            if not intentions else "PRESERVED FOUNDER INTENTION; CURRENTNESS UNKNOWN"),
            "source": "preproject_records:" + str(record["id"]),
        })
        if len(intentions) == 5:
            break
    member_project_ids = {str(m["project_id"]) for m in workspace["project_memberships"]}
    related_projects = [p for p in workspace["projects"]
                        if str(p["steward_actor_id"]) == human["actor_id"]
                        or str(p["id"]) in member_project_ids]
    active_projects = []
    for project in related_projects[:10]:
        sources = ["projects:" + str(project["id"])]
        if str(project["steward_actor_id"]) == human["actor_id"]:
            sources.append(f"projects:{project['id']}:steward_actor_id:{human['actor_id']}")
        sources += [f"project_members:{membership['project_id']}:{membership['actor_id']}"
                    for membership in workspace["project_memberships"]
                    if str(membership["project_id"]) == str(project["id"])]
        active_projects.append({
            "text": f"{project['title']} — {project['stage']}",
            "currentness": ("CURRENT BY PROJECT STAGE" if project["stage"] in {"OPEN", "ACTIVE"}
                            else "AVAILABLE; CURRENTNESS NOT ASSERTED"),
            "source": "; ".join(sources),
        })
    active_work = [{
        "text": f"{c['need_title']} — {c['state']}", "currentness": "CURRENT BY OPEN COMPANY CORE STATE",
        "source": "company_core_cycles:" + str(c["id"]),
    } for c in workspace["company_cycles"] if c["state"] != "CLOSED"]
    active_cycle_ids = {str(p["cycle_id"]) for p in workspace["cycle_participations"]
                        if p.get("ended_at") is None}
    for cycle in workspace["dragon_cycles"]:
        if cycle["state"] != "OPEN" or str(cycle["id"]) not in active_cycle_ids:
            continue
        participations = [p for p in workspace["cycle_participations"]
                          if str(p["cycle_id"]) == str(cycle["id"])
                          and p.get("ended_at") is None]
        active_work.append({
            "text": f"Dragon Cycle — {cycle['current_phase']}",
            "currentness": "CURRENT BY OPEN CYCLE + ACTIVE PARTICIPATION",
            "source": "; ".join(
                ["dragon_cycles:" + str(cycle["id"])]
                + [f"cycle_participations:{p['cycle_id']}:{p['actor_id']}" for p in participations]
            ),
        })
    results = [{
        "text": c["result_content"], "currentness": "RECORDED RESULT; NOT ASSERTED CURRENT",
        "source": "company_core_cycles:" + str(c["id"]),
    } for c in workspace["company_cycles"] if c.get("result_content")]
    results += [{
        "text": f"{a['kind']}: {a['uri']}", "currentness": "RECENTLY READ; NOT ASSERTED CURRENT",
        "source": "artifacts:" + str(a["id"]),
    } for a in workspace["artifacts"]]
    open_items = []
    for need in workspace["needs"]:
        if need["state"] not in {"DRAFT", "OPEN"}: continue
        version = _version(workspace["need_versions"], "need_id", need)
        open_items.append({"text": (version or {}).get("title", "Need sem versão legível") + " — " + need["state"],
                           "currentness": "CURRENT BY NEED STATE",
                           "source": ("needs:" + str(need["id"]) +
                                      ("; need_versions:" + str(need["id"]) + ":" + str(version["version"])
                                       if version else ""))})
    for opportunity in workspace["opportunities"]:
        if opportunity["state"] not in {"DRAFT", "OPEN"}: continue
        version = _version(workspace["opportunity_versions"], "opportunity_id", opportunity)
        open_items.append({"text": (version or {}).get("title", "Opportunity sem versão legível") + " — " + opportunity["state"],
                           "currentness": "CURRENT BY OPPORTUNITY STATE",
                           "source": ("opportunities:" + str(opportunity["id"]) +
                                      ("; opportunity_versions:" + str(opportunity["id"]) + ":" + str(version["version"])
                                       if version else ""))})
    for record in workspace["cycle_records"]:
        if record.get("provenance", {}).get("room_kind") == "QUESTION":
            open_items.append({"text": record["content"], "currentness": "UNRESOLVED STATUS UNKNOWN",
                               "source": "cycle_records:" + str(record["id"])})
    recorded_direction = {
        "text": direction["canonical_next_gate"], "currentness": direction["currentness"],
        "source": direction["source"],
    }
    trajectory = [] if direction.get("canonical_sequence", "UNKNOWN") == "UNKNOWN" else [{
        "text": direction["canonical_sequence"],
        "currentness": "CANONICAL RECORDED TRAJECTORY; NOT ASSERTED CURRENT HUMAN DIRECTION",
        "source": direction["source"],
    }]
    recent_canonical = []
    if (direction.get("recent_result", "UNKNOWN") != "UNKNOWN"
            and direction.get("result_pointer", "UNKNOWN") != "UNKNOWN"):
        recent_canonical.append({
            "text": direction["recent_result"],
            "currentness": "CANONICAL RECORDED RESULT; RECENCY IS REPOSITORY ORDER, NOT HUMAN CURRENTNESS",
            "source": direction["result_pointer"] + "@" + direction["source"].split("@", 1)[1],
        })
    return {
        "WHO YOU ARE NOW": identity,
        "CANONICAL RECORDED DIRECTION": [recorded_direction],
        "CURRENT INTENTIONS": intentions,
        "PRESERVED HISTORICAL CONTEXT": historical_living_presence_context(workspace),
        "WHAT WE ARE DOING NOW": trajectory,
        "WHAT HAPPENED RECENTLY": (recent_canonical + results)[:10],
        "WHAT IS ACTUALLY ACTIVE": (active_projects + active_work)[:12],
        "WHAT IS OPEN / UNRESOLVED": ([recorded_direction] + open_items)[:12],
    }


def print_founder_context(context: dict, output_fn=print) -> None:
    output_fn("\nCÉLULA ZERO — FOUNDER SESSION V0")
    output_fn("CANONICAL RECORDED DIRECTION ≠ CURRENT HUMAN DIRECTION")
    output_fn("Uma direção humana posterior pode superseder o registro canônico, mas não é representada aqui sem preservação e promoção duráveis.")
    for heading, items in context.items():
        output_fn("\n" + heading)
        if not items:
            output_fn("[nenhum item durável legível]")
        for item in items:
            output_fn(f"- {item['text']}\n  Atualidade: {item['currentness']}\n  Fonte: {item['source']}")


def generic_capability_options(workspace: dict) -> list[dict]:
    options = [
        ("KEEP AS OPEN QUESTION", "preserva as palavras sem classificação operacional", "preproject_records", "nenhuma mudança", "nenhuma"),
        ("INVESTIGATE", "a intenção pode pedir apuração antes de compromisso", "interpretação durável / Dragon Cycle", "uma investigação ou interpretação seria aberta", "autorização humana específica; provedor somente se escolhido"),
        ("LOOK FOR RELEVANT PEOPLE / PROJECTS / OPPORTUNITIES", "capacidade de leitura e descoberta já existe", "Profiles, Projects, Needs e Opportunities", "somente leitura até nova escolha", "confirmação posterior para formar relação ou proposta"),
        ("NO ACTION YET", "registro original pode permanecer sem consequência", "preproject_records", "nenhuma mudança", "nenhuma"),
    ]
    if workspace["projects"]:
        options += [
            ("CONNECT TO EXISTING PROJECT", "há Project controlado ou acessível", "Project + Need / Dragon Cycle", "uma ligação operacional explícita seria criada", "escolha do Project e confirmação humana"),
            ("CREATE NEED", "Needs existentes são Project-scoped", "t1_create_need", "um Need DRAFT seria criado", "Project, texto estruturado e confirmação humana"),
            ("OPEN A WORK CONTEXT", "Company Core e Dragon Cycle já coordenam trabalho", "company_core_create_cycle / ddr_open_cycle", "um contexto de trabalho seria aberto", "escopo, limites e confirmação humana"),
        ]
    if any(n["state"] in {"DRAFT", "OPEN"} for n in workspace["needs"]):
        options.append(("MAP TO EXISTING NEED", "há Need ainda aberto", "Needs + escolha humana", "o registro seria associado por uma ação explícita futura", "seleção do Need e confirmação humana"))
    return [{"action": a, "availability_reason": why, "primitive": primitive,
             "change": change, "authority": authority}
            for a, why, primitive, change, authority in options]


def print_generic_capabilities(options: list[dict], output_fn=print) -> None:
    output_fn("\nGENERIC CAPABILITY LISTING — NOT INTENT-AWARE")
    for option in options:
        output_fn(f"\n{option['action']}\nWHY THIS CAPABILITY IS AVAILABLE: {option['availability_reason']}\nWHAT EXISTING CZ PRIMITIVE IT USES: {option['primitive']}\nWHAT WOULD CHANGE: {option['change']}\nWHAT AUTHORITY/CONFIRMATION WOULD BE REQUIRED: {option['authority']}")


def intention_routing_boundary(content: str, context: dict, workspace: dict) -> dict:
    """Consume the exact intention without pretending deterministic semantic fit."""
    return {
        "intention_sha256": hashlib.sha256(content.encode("utf-8")).hexdigest(),
        "context_sources": sorted({item["source"] for items in context.values() for item in items}),
        "semantic_relevance": "NOT DETERMINED",
        "reason": "Free-form semantic relevance is not preserved by deterministic CZ rules.",
        "required_composition": "existing bounded durable AI interpretation",
        "authorization_boundary": (
            "Separate explicit Human authorization selecting the exact intention, purpose, provider/model, "
            "one-call/output bounds and cost disclosure before enqueue or provider activity."
        ),
        "generic_capabilities": generic_capability_options(workspace),
    }


def print_intention_boundary(boundary: dict, output_fn=print) -> None:
    output_fn("\nINTENT-AWARE ROUTING: NOT YET ESTABLISHED")
    output_fn("Exact intention digest consumed: " + boundary["intention_sha256"])
    output_fn("Semantic relevance: " + boundary["semantic_relevance"])
    output_fn("Why: " + boundary["reason"])
    output_fn("Required composition: " + boundary["required_composition"])
    output_fn("Authorization boundary: " + boundary["authorization_boundary"])
    print_generic_capabilities(boundary["generic_capabilities"], output_fn)


def capture_current_intention(client, human, workspace, context, input_fn=input, output_fn=print) -> dict:
    content = read_multiline("CURRENT INTENTION", input_fn, output_fn)
    if not content.strip():
        stop("A intenção original não pode ficar vazia.")
    output_fn("\nPREVIEW EXATO — AINDA NÃO GRAVADO\nORIGINAL HUMAN WORDS\n" + content)
    if input_fn("Digite exatamente 'CONFIRMAR INTENÇÃO' para gravar: ") != INTENT_CONFIRMATION:
        output_fn("Intenção abortada. Nenhuma gravação foi feita.")
        return {"state": "INTENT_ABORTED"}
    receipt = client.record_preproject_text(human["actor_id"], "ORIGINAL_RECORD", content, {
        "capture": "FOUNDER_SESSION_V0", "semantic_status": "UNCLASSIFIED_CURRENT_INTENTION",
        "boundary": "ORIGINAL HUMAN WORDS != INTERPRETATION != OPERATIONAL CLASSIFICATION != DECISION",
    })
    output_fn("Intenção original privada preservada.")
    print_intention_boundary(intention_routing_boundary(content, context, workspace), output_fn)
    return {"state": "INTENTION_RECORDED", "record_id": str(receipt["record_id"])}


def print_records(records: list[dict], output_fn=print) -> None:
    output_fn("\nSEUS REGISTROS PRIVADOS AUTORIZÁVEIS")
    if not records:
        output_fn("Ainda não há registros privados para interpretar.")
        return
    for index, record in enumerate(records, 1):
        kind = "registro original" if record["record_class"] == "ORIGINAL_RECORD" else "fonte fornecida (não é verdade verificada)"
        output_fn(f"\n[{index}] {kind}\n{record['content']}")


def choose_records(records: list[dict], input_fn=input) -> list[dict]:
    raw = input_fn("\nQuais registros entram nesta interpretação? [todos]: ").strip()
    if not raw:
        return records
    try:
        indexes = [int(item.strip()) for item in raw.split(",")]
    except ValueError:
        stop("Escolha números separados por vírgula.")
    if len(set(indexes)) != len(indexes) or any(i < 1 or i > len(records) for i in indexes):
        stop("A seleção não corresponde aos registros mostrados.")
    return [records[i - 1] for i in indexes]


def run_worker(database_url: str) -> None:
    env = {
        **os.environ,
        "MOVE2_DATABASE_URL": database_url,
        "MOVE2_WORKER_ONCE": "1",
    }
    result = subprocess.run(
        ["node", "scripts/move2-vs1-worker.mjs"],
        cwd=ROOT,
        env=env,
        text=True,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
    )
    if result.returncode:
        stop("A execução durável não pôde ser processada: " + result.stderr.strip())


def private_directory(path: Path) -> None:
    path.mkdir(parents=True, exist_ok=True, mode=0o700)
    os.chmod(path, 0o700)


def canonical_terms(terms: dict) -> bytes:
    return json.dumps(
        terms, ensure_ascii=False, sort_keys=True, separators=(",", ":")
    ).encode("utf-8")


def terms_digest(terms: dict) -> str:
    return hashlib.sha256(canonical_terms(terms)).hexdigest()


def write_pending_command(terms: dict, command_key: str) -> None:
    private_directory(RUNTIME_DIR)
    payload = {
        "schema": "cz.pending-execution-command.v1",
        "command_key": command_key,
        "terms_digest": terms_digest(terms),
        "terms": terms,
    }
    temporary = PENDING_COMMAND_FILE.with_suffix(".tmp")
    descriptor = os.open(temporary, os.O_WRONLY | os.O_CREAT | os.O_TRUNC, 0o600)
    try:
        with os.fdopen(descriptor, "w", encoding="utf-8") as stream:
            json.dump(payload, stream, ensure_ascii=False, sort_keys=True)
            stream.write("\n")
            stream.flush()
            os.fsync(stream.fileno())
        os.chmod(temporary, 0o600)
        os.replace(temporary, PENDING_COMMAND_FILE)
        os.chmod(PENDING_COMMAND_FILE, 0o600)
    finally:
        if temporary.exists():
            temporary.unlink()


def read_pending_command() -> dict | None:
    if not PENDING_COMMAND_FILE.exists():
        return None
    try:
        payload = json.loads(PENDING_COMMAND_FILE.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        stop("O comando pendente privado está ilegível; CZ não executará nada.")
    terms = payload.get("terms")
    if (
        payload.get("schema") != "cz.pending-execution-command.v1"
        or not isinstance(terms, dict)
        or payload.get("terms_digest") != terms_digest(terms)
        or not str(payload.get("command_key") or "")
    ):
        stop("O comando pendente privado não confere; CZ não executará nada.")
    return payload


def complete_pending_command() -> None:
    if PENDING_COMMAND_FILE.exists():
        PENDING_COMMAND_FILE.unlink()


def execution_payload(terms: dict, command_key: str) -> dict:
    return {
        "p_subject_actor_id": terms["subject_actor_id"],
        "p_requester_actor_id": terms["requester_actor_id"],
        "p_selected_inputs": terms["selected_inputs"],
        "p_purpose": terms["purpose"],
        "p_agent_actor_id": terms["agent_actor_id"],
        "p_provider": terms["provider"],
        "p_model": terms["model"],
        "p_max_output_tokens": terms["max_output_tokens"],
        "p_max_spend_usd": terms["max_spend_usd"],
        "p_idempotency_key": command_key,
    }


def activate_interpreter(client: LivingPresenceClient, actor_id: str) -> dict:
    result = client.rpc(
        "register_preproject_ai_agent", {"p_requester_actor_id": actor_id}
    )
    if not result.get("agent_actor_id"):
        stop("CZ não conseguiu ativar seu intérprete privado.")
    return result


def latest_review(workspace: dict, candidate_id: str) -> dict | None:
    reviews = [r for r in workspace["reviews"] if str(r["candidate_id"]) == candidate_id]
    return max(reviews, key=lambda r: (str(r["created_at"]), str(r["id"])), default=None)


def review_history(workspace: dict, candidate_id: str) -> list[dict]:
    return sorted(
        (r for r in workspace["reviews"] if str(r["candidate_id"]) == candidate_id),
        key=lambda r: (str(r["created_at"]), str(r["id"])),
    )


def living_representation(workspace: dict) -> list[dict]:
    result = []
    for candidate in workspace["candidates"]:
        review = latest_review(workspace, str(candidate["id"]))
        if review and review["disposition"] in {"ADOPT", "CORRECT", "PARTLY_REPRESENTATIVE"}:
            result.append({
                "text": review.get("representation_text") or candidate["content"],
                "status": review["disposition"],
                "review_id": review["id"],
            })
    return result


def historical_living_presence_context(workspace: dict) -> list[dict]:
    """Project exact exported Living Presence as preserved, non-current context."""
    snapshots = []
    for record in workspace.get("records", []):
        if record.get("record_class") != "SOURCE_MATERIAL":
            continue
        provenance = record.get("provenance")
        if not isinstance(provenance, dict) or provenance.get("source_class") != "LOCAL_EXPORTED_EXACT":
            continue
        try:
            payload = json.loads(record.get("content", ""))
            exported_at = payload["exportedAt"]
            if payload.get("schemaVersion") != "cz.living-presence.v0":
                continue
            timestamp_text = str(exported_at)
            if timestamp_text.endswith("Z"):
                timestamp_text = timestamp_text[:-1] + "+00:00"
            timestamp = datetime.fromisoformat(timestamp_text)
            if timestamp.tzinfo is None or timestamp.utcoffset() is None:
                continue
            digest = hashlib.sha256(record["content"].encode("utf-8")).hexdigest()
            if not record.get("content_sha256") or record["content_sha256"] != digest:
                continue
            snapshots.append((timestamp, str(record["id"]), payload, digest))
        except (KeyError, TypeError, ValueError, json.JSONDecodeError):
            continue
    if not snapshots:
        return []
    _, record_id, payload, digest = max(snapshots, key=lambda item: (item[0], item[1]))
    return [
        {
            "text": item["text"],
            "currentness": "PRESERVED HISTORICAL CONTEXT; NOT ASSERTED CURRENT",
            "source": "preproject_records:" + record_id,
            "evidence_class": "LOCAL_EXPORTED_EXACT",
            "source_digest": digest,
        }
        for item in payload.get("adoptedRepresentation", [])
        if isinstance(item, dict) and isinstance(item.get("text"), str)
    ]


def export_presence(workspace: dict, human: dict, output_fn=print) -> Path:
    exported_at = datetime.now(timezone.utc).isoformat()
    payload = {
        "schemaVersion": "cz.living-presence.v0",
        "exportedAt": exported_at,
        "subject": {"name": human["actor_name"]},
        "visibility": "PRIVATE",
        "notices": [
            "SOURCE ≠ TRUTH",
            "AI INTERPRETATION ≠ HUMAN IDENTITY",
            "EXPORT ≠ AUTHORITY",
        ],
        "adoptedRepresentation": living_representation(workspace),
        "records": [
            {
                "class": r["record_class"], "content": r["content"],
                "digest": r["content_sha256"], "createdAt": r["created_at"],
                "provenance": r["provenance"], "visibility": "PRIVATE",
            }
            for r in workspace["records"]
        ],
        "candidates": [{
            "content": c["content"], "digest": c["content_sha256"],
            "executionClass": c["execution_class"], "provider": c["provider"],
            "model": c["model"], "costUsd": c["cost_usd"],
            "costStatus": c["cost_status"], "createdAt": c["created_at"],
            "effectiveReview": (
                None if latest_review(workspace, str(c["id"])) is None else {
                    "id": latest_review(workspace, str(c["id"]))["id"],
                    "disposition": latest_review(workspace, str(c["id"]))["disposition"],
                    "humanStatement": latest_review(workspace, str(c["id"]))["human_statement"],
                    "representationText": latest_review(workspace, str(c["id"]))["representation_text"],
                    "createdAt": latest_review(workspace, str(c["id"]))["created_at"],
                }
            ),
            "reviewHistory": [{
                "id": r["id"], "disposition": r["disposition"],
                "humanStatement": r["human_statement"],
                "representationText": r["representation_text"],
                "createdAt": r["created_at"],
            } for r in review_history(workspace, str(c["id"]))],
        } for c in workspace["candidates"]],
    }
    private_directory(EXPORT_DIR)
    path = EXPORT_DIR / datetime.now().strftime("living-presence-%Y%m%d-%H%M%S.json")
    descriptor = os.open(path, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600)
    with os.fdopen(descriptor, "w", encoding="utf-8") as stream:
        json.dump(payload, stream, ensure_ascii=False, indent=2)
        stream.write("\n")
    os.chmod(path, 0o600)
    output_fn("Sua Living Presence privada foi exportada para: " + str(path))
    return path


def read_multiline(label: str, input_fn=input, output_fn=print, max_characters=65536) -> str:
    output_fn(f"\n{label}\nDigite ou cole várias linhas. Termine com .finish em uma linha separada.")
    lines = []
    size = 0
    while True:
        line = input_fn("")
        if line == ".finish":
            break
        size += len(line) + (1 if lines else 0)
        if size > max_characters:
            stop(f"{label} excede o limite de {max_characters} caracteres.")
        lines.append(line)
    return "\n".join(lines)


def review_candidate(client: LivingPresenceClient, workspace: dict, human: dict,
                     candidate: dict, input_fn=input, output_fn=print) -> str:
    actor_id = human["actor_id"]
    output_fn("\nINTERPRETAÇÃO CANDIDATA\n" + candidate["content"])
    output_fn("\n1. REJEITAR  2. CORRIGIR  3. PARCIALMENTE REPRESENTATIVA  4. ADOTAR")
    choice = input_fn("Sua decisão: ").strip()
    disposition = DISPOSITIONS.get(choice)
    if not disposition:
        output_fn("Sem decisão humana. A candidata permanece não adotada.")
        return "CANDIDATE_UNREVIEWED"
    statement = read_multiline("HUMAN STATEMENT", input_fn, output_fn)
    if not statement.strip():
        stop("A decisão humana precisa de uma declaração.")
    representation = None
    if disposition in {"CORRECT", "PARTLY_REPRESENTATIVE"}:
        representation = read_multiline("REPRESENTATION", input_fn, output_fn)
        if not representation.strip():
            stop("A correção humana não pode ficar vazia.")
    output_fn("\nPREVIEW EXATO — AINDA NÃO GRAVADO")
    output_fn("DISPOSITION\n" + disposition)
    output_fn("HUMAN STATEMENT\n" + statement)
    output_fn("REPRESENTATION\n" + (representation if representation is not None else "[não aplicável]"))
    confirmation = input_fn("Digite exatamente 'CONFIRMAR REVISÃO' para gravar: ")
    if confirmation != "CONFIRMAR REVISÃO":
        output_fn("Revisão abortada. Nenhuma gravação foi feita.")
        return "REVIEW_ABORTED"
    client.rpc("review_preproject_candidate_interpretation", {
        "p_subject_actor_id": actor_id, "p_reviewer_actor_id": actor_id,
        "p_candidate_id": candidate["id"], "p_disposition": disposition,
        "p_human_statement": statement, "p_representation_text": representation,
    })
    return disposition


def run_terminal(*, input_fn=input, output_fn=print, configuration_fn=local_configuration,
                 authenticate_fn=founder.authenticate_local_human,
                 client_factory=LivingPresenceClient, worker_fn=run_worker) -> dict:
    api, public_key, mailpit, database_url = configuration_fn()
    token, user = authenticate_fn(api, public_key, mailpit)
    client = client_factory(api, public_key, token)
    client.profile_id = str(user["id"])
    human = controlled_human(client, user)
    actor_id = human["actor_id"]

    output_fn("\nCÉLULA ZERO — FOUNDER SESSION V0")
    output_fn("Reconheço você como " + human["profile_name"] + ".")
    output_fn("Seu acesso, seu perfil e sua Pessoa continuam distintos.")

    workspace = read_workspace(client, actor_id)
    context = founder_context(workspace, human, canonical_direction())
    print_founder_context(context, output_fn)
    output_fn("\nFOUNDER SESSION — AÇÕES")
    output_fn("0. Expressar e preservar uma intenção atual")
    output_fn("1. Ver a listagem genérica de capacidades existentes")
    output_fn("2. Abrir operações legadas de Living Presence")
    output_fn("3. Sair sem alterar nada")
    founder_action = input_fn("Escolha [0]: ").strip() or "0"
    if founder_action == "0":
        return capture_current_intention(
            client, human, workspace, context, input_fn=input_fn, output_fn=output_fn
        )
    if founder_action == "1":
        print_generic_capabilities(generic_capability_options(workspace), output_fn)
        return {"state": "GENERIC_CAPABILITIES_READ"}
    if founder_action == "3":
        return {"state": "EXITED"}
    if founder_action != "2":
        stop("Ação Founder desconhecida.")

    output_fn("\nOPERAÇÕES LEGADAS — LIVING PRESENCE")
    interpreters = [
        agent for agent in workspace["ai_agents"]
        if agent.get("operator_label") == "CZ_PREPROJECT_PRIVATE_INTERPRETER"
    ]
    if len(interpreters) > 1:
        stop("CZ encontrou mais de um intérprete privado; nenhuma ação será executada.")
    agent_id = str(interpreters[0]["id"]) if interpreters else ""
    output_fn("Intérprete privado: " + ("ATIVO" if agent_id else "NÃO ATIVADO"))
    print_records(workspace["records"], output_fn)

    output_fn("\nAÇÕES LEGADAS DISPONÍVEIS")
    output_fn("1. Preparar uma interpretação real e limitada")
    output_fn("2. Ver sua Living Presence atual")
    output_fn("3. Exportar e sair")
    output_fn("4. Sair sem alterar nada")
    reviewable = workspace["candidates"][0] if workspace["candidates"] else None
    if reviewable:
        if latest_review(workspace, str(reviewable["id"])) is None:
            output_fn("5. Revisar a interpretação candidata que está aguardando você")
        else:
            output_fn("5. Revisar novamente a candidata (nova revisão append-only)")
    if not agent_id:
        output_fn("6. Ativar explicitamente meu intérprete privado")
    pending = read_pending_command()
    if pending:
        output_fn("7. Retomar meu comando de interpretação já autorizado")
    action = input_fn("Escolha [1]: ").strip() or "1"
    if action == "4":
        return {"state": "EXITED"}
    if action == "2":
        show_presence(workspace, output_fn)
        if input_fn("Exportar agora? [s/N]: ").strip().lower() != "s":
            return {"state": "READ"}
        export_presence(workspace, human, output_fn)
        return {"state": "EXPORTED"}
    if action == "3":
        export_presence(workspace, human, output_fn)
        return {"state": "EXPORTED"}
    if action == "6" and not agent_id:
        confirmation = input_fn("Digite 'ATIVAR MEU INTÉRPRETE PRIVADO' para ativar: ")
        if confirmation != "ATIVAR MEU INTÉRPRETE PRIVADO":
            output_fn("Intérprete não ativado. Nenhuma alteração foi feita.")
            return {"state": "AGENT_NOT_ACTIVATED"}
        result = activate_interpreter(client, actor_id)
        output_fn("Intérprete privado: ATIVO" + (" (já estava ativo)." if result.get("replayed") else "."))
        return {"state": "AGENT_ACTIVE"}
    if action == "7" and pending:
        terms = pending["terms"]
        if terms.get("subject_actor_id") != actor_id:
            stop("O comando pendente não pertence à Pessoa reconhecida.")
        execution = client.rpc(
            "authorize_and_enqueue_preproject_ai_execution",
            execution_payload(terms, pending["command_key"]),
        )
        execution_id = str(execution.get("execution_id") or "")
        if not execution_id:
            stop("CZ ainda não identificou o recibo durável; o comando permanece pendente.")
        complete_pending_command()
        output_fn("Comando autorizado recuperado sem criar uma segunda execução.")
        output_fn("Estado da execução: " + str(execution.get("state") or "DESCONHECIDO"))
        return {"state": "EXECUTION_RECOVERED", "execution_id": execution_id}
    if action == "5" and reviewable:
        disposition = review_candidate(
            client, workspace, human, reviewable, input_fn, output_fn
        )
        if disposition == "REVIEW_ABORTED":
            return {"state": disposition}
        workspace = read_workspace(client, actor_id)
        show_presence(workspace, output_fn)
        if input_fn("Exportar sua Living Presence agora? [S/n]: ").strip().lower() != "n":
            export_presence(workspace, human, output_fn)
        return {"state": disposition}
    if action != "1":
        stop("Ação desconhecida.")

    if not workspace["records"]:
        output_fn("Preserve primeiro suas palavras originais antes de preparar uma interpretação.")
        return {"state": "ORIGINAL_RECORD_REQUIRED"}

    if not agent_id:
        output_fn("Ative explicitamente seu intérprete privado antes de preparar uma execução.")
        return {"state": "AGENT_REQUIRED"}

    selected = choose_records(workspace["records"], input_fn)
    purpose = input_fn("O que você quer compreender? ").strip()
    if not 3 <= len(purpose) <= 1000:
        stop("Descreva o propósito em pelo menos 3 caracteres.")
    output_fn("\nINTERPRETAÇÃO PREPARADA — AINDA NÃO EXECUTADA")
    output_fn(f"Finalidade: {purpose}")
    output_fn("Ator de IA da CZ: seu intérprete privado ativo")
    output_fn("Provedor: " + PROVIDER_LABEL)
    output_fn("Modelo: " + MODEL)
    output_fn("Máximo de chamadas: 1")
    output_fn(f"Máximo de tokens de saída: {MAX_OUTPUT_TOKENS}")
    output_fn("Limite em dólares: não há teto rígido em dólares aplicável pelo provedor.")
    output_fn("O custo observado será registrado quando disponível; caso contrário, custo = UNKNOWN.")
    output_fn("UNKNOWN não significa ZERO.")
    output_fn("Materiais privados exatos autorizados:")
    for record in selected:
        output_fn("---\n" + record["content"])
    output_fn("---\nPrivacidade e resultado: somente uma interpretação privada candidata será produzida. Ela não é sua identidade, não é adoção humana e fonte não é verdade.")
    confirmation = input_fn(f"Digite exatamente '{CONFIRMATION}' para enfileirar: ")
    if confirmation != CONFIRMATION:
        output_fn("Nada foi enfileirado e nenhum provedor foi chamado.")
        return {"state": "NOT_AUTHORIZED"}

    terms = {
        "subject_actor_id": actor_id,
        "requester_actor_id": actor_id,
        "selected_inputs": [{
            "record_id": r["id"], "record_class": r["record_class"],
            "content_sha256": r["content_sha256"],
        } for r in selected],
        "purpose": purpose, "agent_actor_id": agent_id,
        "provider": PROVIDER, "model": MODEL, "max_calls": 1,
        "max_output_tokens": MAX_OUTPUT_TOKENS, "max_spend_usd": None,
    }
    command_key = "terminal-" + datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%S%fZ")
    write_pending_command(terms, command_key)
    execution = client.rpc(
        "authorize_and_enqueue_preproject_ai_execution",
        execution_payload(terms, command_key),
    )
    execution_id = str(execution.get("execution_id") or "")
    if not execution_id:
        stop("CZ ainda não identificou o recibo durável; o comando permanece pendente.")
    complete_pending_command()
    output_fn("Execução autorizada e enfileirada. Estado: NA FILA")
    worker_fn(database_url)
    workspace = read_workspace(client, actor_id)
    current = next((e for e in workspace["executions"] if str(e["id"]) == execution_id), None)
    state = str((current or {}).get("state") or "DESCONHECIDO")
    output_fn("Estado da execução: " + state)
    candidate = next((c for c in workspace["candidates"] if str(c.get("execution_id")) == execution_id), None)
    if not candidate:
        output_fn("Ainda não há interpretação candidata. Execute novamente para acompanhar seu estado.")
        return {"state": state}

    disposition = review_candidate(
        client, workspace, human, candidate, input_fn, output_fn
    )
    if disposition == "CANDIDATE_UNREVIEWED":
        return {"state": disposition}
    workspace = read_workspace(client, actor_id)
    show_presence(workspace, output_fn)
    if input_fn("Exportar sua Living Presence agora? [S/n]: ").strip().lower() != "n":
        export_presence(workspace, human, output_fn)
    return {"state": disposition}


def show_presence(workspace: dict, output_fn=print) -> None:
    output_fn("\nSUA LIVING PRESENCE")
    representation = living_representation(workspace)
    if not representation:
        output_fn("Ainda não há representação sustentada por decisão humana.")
    for item in representation:
        output_fn(f"[{item['status']}] {item['text']}")
    output_fn("Privada. Fonte não é verdade. Interpretação de IA não é identidade humana.")


def main() -> int:
    try:
        run_terminal()
        return 0
    except (RuntimeError, KeyboardInterrupt, EOFError) as exc:
        message = str(exc).strip() or "interrompido"
        print("\nCZ parou com segurança: " + message, file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())

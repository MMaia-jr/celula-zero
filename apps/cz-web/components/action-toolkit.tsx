// SPDX-License-Identifier: MPL-2.0
"use client";
import { useState } from "react";
import { AuiConfig, defineToolkit, Tools, useAui, useAuiState, type ToolCallMessagePartComponent } from "@assistant-ui/react";

type ActionKind = "create_work" | "update_work" | "original_record" | "profile_update";
type Proposal = {
  kind: ActionKind;
  proposalId: string;
  title?: string;
  description?: string;
  status?: "open" | "in_progress" | "done";
  workId?: string;
  current?: { id: string; title: string; description: string; status: string };
  content?: string;
  displayName?: string;
  bio?: string;
  available?: boolean;
};

function statusName(status: string | undefined) {
  return status === "in_progress" ? "Em andamento" : status === "done" ? "Concluído" : "Aberto";
}

function ActionProposal({ args, result, status }: { args: Record<string, unknown>; result: Proposal | undefined; status: { type: string } }) {
  const aui = useAui();
  const messages = useAuiState((state) => state.thread.messages);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const proposal = (result ?? args) as unknown as Proposal;
  const proposalId = proposal.proposalId;
  const confirmed = Boolean(proposalId && messages.some((message) =>
    message.role === "user" && message.metadata?.custom?.czConfirmedAction === proposalId,
  ));
  if (status.type === "running") return <div className="action-proposal" role="status">Preparando uma proposta…</div>;
  if (proposal.available === false) return <div className="action-proposal">Esse item não está disponível nesta Célula.</div>;
  if (confirmed || saved) return <div className="action-receipt" role="status"><span>✓</span><div><strong>Confirmado por você</strong><small>{receiptLabel(proposal)}</small></div></div>;
  if (dismissed) return <div className="action-receipt quiet">Proposta deixada para depois.</div>;

  const body = actionBody(proposal);
  if (!body) return <div className="action-proposal">Não foi possível apresentar esta proposta com segurança.</div>;
  async function confirm() {
    if (saving || !proposalId) return;
    setSaving(true);
    try {
      const response = await fetch("/api/actions", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
      });
      const data = await response.json() as { error?: string };
      if (!response.ok) throw new Error(data.error ?? "A ação não foi confirmada.");
      await aui.thread.append({
        role: "user",
        content: [{ type: "text", text: receiptPrompt(proposal) }],
        metadata: { custom: { czConfirmedAction: proposalId } },
        startRun: true,
      });
      setSaved(true);
    } catch {
      // Keep the proposal actionable; the same deterministic action id makes a retry idempotent.
    } finally { setSaving(false); }
  }

  return <section className="action-proposal" aria-label="Proposta para sua confirmação">
    <span className="badge">PROPOSTA · AINDA NÃO SALVA</span>
    <h3>{proposalTitle(proposal)}</h3>
    <p>{proposalDescription(proposal)}</p>
    <div className="proposal-actions">
      <button className="primary" type="button" disabled={saving} onClick={() => void confirm()}>{saving ? "Registrando…" : "Confirmar"}</button>
      <button className="secondary" type="button" disabled={saving} onClick={() => setDismissed(true)}>Agora não</button>
    </div>
  </section>;
}

function actionBody(proposal: Proposal): Record<string, unknown> | null {
  if (!proposal.proposalId) return null;
  if (proposal.kind === "create_work" && proposal.title)
    return { kind: "create_work", actionId: proposal.proposalId, title: proposal.title, description: proposal.description ?? "", status: proposal.status === "in_progress" ? "in_progress" : "open" };
  if (proposal.kind === "update_work" && proposal.current && proposal.workId && proposal.status)
    return { kind: "update_work", actionId: proposal.proposalId, workId: proposal.workId, status: proposal.status };
  if (proposal.kind === "original_record" && proposal.content)
    return { kind: "original_record", actionId: proposal.proposalId, content: proposal.content };
  if (proposal.kind === "profile_update" && proposal.displayName !== undefined && proposal.bio !== undefined)
    return { kind: "profile_update", actionId: proposal.proposalId, displayName: proposal.displayName, bio: proposal.bio };
  return null;
}

function proposalTitle(proposal: Proposal) {
  if (proposal.kind === "create_work") return proposal.title ?? "Novo trabalho";
  if (proposal.kind === "update_work") return proposal.current?.title ?? "Atualizar trabalho";
  if (proposal.kind === "original_record") return "Registrar relato Original";
  return "Atualizar seu Profile";
}

function proposalDescription(proposal: Proposal) {
  if (proposal.kind === "create_work") return `${proposal.description || "Um próximo passo na Célula Zero."} · ${statusName(proposal.status)}`;
  if (proposal.kind === "update_work") return `${proposal.current?.description || "Trabalho da Célula Zero"} · ${statusName(proposal.current?.status)} → ${statusName(proposal.status)}`;
  if (proposal.kind === "original_record") return proposal.content ?? "";
  return `Nome: ${proposal.displayName ?? ""}. Apresentação: ${proposal.bio || "sem apresentação"}.`;
}

function receiptLabel(proposal: Proposal) {
  if (proposal.kind === "create_work") return `Trabalho · ${proposal.title}`;
  if (proposal.kind === "update_work") return `${proposal.current?.title} · ${statusName(proposal.status)}`;
  if (proposal.kind === "original_record") return "Relato Original registrado com sua autoria";
  return "Profile atualizado por você";
}

function receiptPrompt(proposal: Proposal) {
  if (proposal.kind === "create_work") return `Confirmei e registrei o trabalho “${proposal.title}” na Célula Zero.`;
  if (proposal.kind === "update_work") return `Confirmei a atualização de “${proposal.current?.title}” para ${statusName(proposal.status)}.`;
  if (proposal.kind === "original_record") return "Confirmei o registro do relato Original proposto.";
  return "Confirmei a atualização do meu Profile.";
}

const ProposalRenderer: ToolCallMessagePartComponent = (props) => <ActionProposal args={props.args} result={props.result as Proposal | undefined} status={props.status} />;

export const actionToolkit = defineToolkit({
  propose_work: { type: "backend", render: ProposalRenderer },
  propose_work_update: { type: "backend", render: ProposalRenderer },
  propose_original_record: { type: "backend", render: ProposalRenderer },
  propose_profile_update: { type: "backend", render: ProposalRenderer },
});

export const actionToolsConfig = AuiConfig({ tools: Tools({ toolkit: actionToolkit }) });

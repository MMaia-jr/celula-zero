import type { WorkbenchProject } from "@/lib/data/workbench";

export type GuidedWorkbenchStep =
  | "START_INTENTION"
  | "REVIEW_DRAFT"
  | "REGISTER_AGENT"
  | "SUBMIT_PROPOSAL"
  | "HUMAN_ACCEPTANCE"
  | "STATE_GAP"
  | "EXECUTE_COMMITMENT"
  | "REGISTER_CONTRIBUTION"
  | "ATTACH_ARTIFACT"
  | "RECORD_CLAIM"
  | "REGISTER_EVIDENCE"
  | "REQUEST_VERIFICATION"
  | "ISSUE_VERIFICATION"
  | "HUMAN_DECISION";

export interface GuidedWorkbenchAction {
  step: GuidedWorkbenchStep;
  title: string;
  description: string;
  boundary: string;
  focusId?: string;
  commitmentId?: string;
}

function latest<T>(items: T[]): T | undefined {
  return items.length ? items[items.length - 1] : undefined;
}

export function deriveGuidedWorkbenchAction(
  project: WorkbenchProject,
): GuidedWorkbenchAction {
  const opportunity = latest(project.opportunities);

  if (!opportunity || opportunity.state === "CLOSED") {
    return {
      step: "START_INTENTION",
      title: "Comece pelo que precisa mudar",
      description:
        "Registre a próxima intenção operacional da Célula Zero como uma Opportunity. O restante do protocolo continua por baixo do paved road.",
      boundary:
        "Criar uma Opportunity registra trabalho pretendido; não cria Commitment, execução, evidência ou resultado.",
      focusId: `new-opportunity-${project.slug}`,
    };
  }

  if (opportunity.state === "DRAFT") {
    return {
      step: "REVIEW_DRAFT",
      title: "Há uma intenção ainda em rascunho",
      description:
        "Revise a Opportunity antes de tratá-la como trabalho aberto. O estado persistido continua DRAFT.",
      boundary:
        "O workbench atual não oferece publicação posterior deste rascunho nesta superfície; DRAFT não pode ser interpretado como OPEN.",
      focusId: `opportunity-${opportunity.id}`,
    };
  }

  const proposals = project.proposals.filter(
    (proposal) => proposal.opportunityId === opportunity.id,
  );
  const proposal = latest(proposals);

  if (!proposal || proposal.state === "REJECTED" || proposal.state === "REVISION_REQUESTED") {
    const hasControlledAgent = project.actors.some(
      (actor) => actor.kind === "AI_AGENT" && actor.controlled,
    );

    if (!hasControlledAgent) {
      return {
        step: "REGISTER_AGENT",
        title: "Defina quem pode propor o trabalho",
        description:
          "Registre um executor/agente atribuível antes de criar uma Proposal. Isto preserva autoria sem conceder autonomia.",
        boundary:
          "Registrar um AI_AGENT cria identidade e atribuição; não conecta uma IA nem amplia autoridade.",
        focusId: `register-agent-${project.slug}`,
      };
    }

    return {
      step: "SUBMIT_PROPOSAL",
      title: "Transforme a intenção em uma proposta executável",
      description:
        "Há uma Opportunity aberta, mas ainda não existe uma Proposal aceita para realizá-la.",
      boundary:
        "Proposal é uma oferta atribuída de trabalho; ainda não existe Commitment nem autorização para executar.",
      focusId: `opportunity-${opportunity.id}`,
    };
  }

  if (proposal.state === "SUBMITTED") {
    return {
      step: "HUMAN_ACCEPTANCE",
      title: "Decisão humana necessária",
      description:
        "Existe uma Proposal submetida. O paved road para aqui até o steward aceitar explicitamente escopo, condições e entrega.",
      boundary:
        "A aplicação não pode transformar Proposal em Commitment por inferência ou decisão de IA.",
      focusId: `proposal-${proposal.id}`,
    };
  }

  const commitment = latest(
    project.commitments.filter(
      (item) =>
        item.opportunityId === opportunity.id &&
        item.proposalId === proposal.id,
    ),
  );

  if (!commitment) {
    return {
      step: "STATE_GAP",
      title: "Estado inconsistente: Proposal aceita sem Commitment projetado",
      description:
        "O paved road não deve inventar uma etapa ausente. Revise o estado persistido antes de continuar.",
      boundary:
        "ACCEPTED ≠ Commitment quando o objeto Commitment não está presente nos dados carregados.",
      focusId: `proposal-${proposal.id}`,
    };
  }

  const contributions = project.contributions.filter(
    (item) => item.commitmentId === commitment.id,
  );
  const contribution = latest(contributions);

  if (!contribution) {
    return {
      step: "EXECUTE_COMMITMENT",
      title: "Execute o trabalho comprometido",
      description:
        "O Commitment já possui contexto e autoridade congelados. O próximo passo é execução real, não mais planejamento.",
      boundary:
        "Task Capsule prepara a fronteira de execução. Exportá-lo não significa que a tarefa foi EXECUTED ou VERIFIED.",
      focusId: `commitment-${commitment.id}`,
      commitmentId: commitment.id,
    };
  }

  const artifacts = project.artifacts.filter(
    (item) => item.contributionId === contribution.id,
  );
  const artifact = latest(artifacts);

  if (!artifact) {
    return {
      step: "ATTACH_ARTIFACT",
      title: "Ligue a execução a um artefato observável",
      description:
        "Uma Contribution foi registrada, mas ainda não existe Artifact associado que permita inspecionar a entrega.",
      boundary:
        "Contribution descreve trabalho executado; sem Artifact, não há um objeto técnico registrado para sustentar claims sobre a entrega.",
      focusId: `contribution-${contribution.id}`,
    };
  }

  const claims = project.claims.filter(
    (item) => item.subjectType === "ARTIFACT" && item.subjectId === artifact.id,
  );
  const claim = latest(claims);

  if (!claim) {
    return {
      step: "RECORD_CLAIM",
      title: "Diga exatamente o que o artefato demonstra",
      description:
        "O Artifact existe. Agora registre um Claim limitado sobre o que está sendo afirmado a partir dele.",
      boundary:
        "Artifact ≠ Evidence ≠ Verification. A existência do arquivo ou commit não prova utilidade, correção ou outcome.",
      focusId: `artifact-${artifact.id}`,
    };
  }

  const evidenceLinks = project.evidenceLinks.filter(
    (item) => item.claimId === claim.id,
  );

  if (!evidenceLinks.length) {
    return {
      step: "REGISTER_EVIDENCE",
      title: "Declare como o artefato entra como evidência",
      description:
        "O Claim está registrado, mas ainda não existe relação explícita entre uma Evidence e a afirmação.",
      boundary:
        "Registrar Evidence documenta uma relação de suporte, desafio ou contexto; não verifica o Claim.",
      focusId: `claim-${claim.id}`,
    };
  }

  const requests = project.verificationRequests.filter(
    (item) => item.claimId === claim.id,
  );
  const request = latest(requests);

  if (!request) {
    return {
      step: "REQUEST_VERIFICATION",
      title: "Defina o critério antes de verificar",
      description:
        "Claim e Evidence existem. Agora fixe o critério e o método que serão usados para revisão.",
      boundary:
        "Evidence disponível não deve ser convertida automaticamente em PASS.",
      focusId: `claim-${claim.id}`,
    };
  }

  const verification = project.verifications.find(
    (item) => item.requestId === request.id,
  );

  if (!verification) {
    return {
      step: "ISSUE_VERIFICATION",
      title: "Execute a revisão registrada",
      description:
        "Existe uma Verification Request aberta. Registre achados, classificação e limitações sem inferir outcome.",
      boundary:
        "PASS/FAIL/PARTIAL/INCONCLUSIVE valem somente dentro do critério, método, independência e limitações registrados.",
      focusId: `verification-request-${request.id}`,
    };
  }

  return {
    step: "HUMAN_DECISION",
    title: `Verification ${verification.classification}: decida o próximo movimento`,
    description:
      "A trajetória chegou a uma Verification. A próxima mudança de prioridade, promoção ou encerramento continua sendo decisão humana.",
    boundary:
      `${verification.classification} ≠ Outcome, adoção ou utilidade geral. A decisão deve respeitar os achados e limitações registrados.`,
    focusId: `verification-request-${request.id}`,
  };
}

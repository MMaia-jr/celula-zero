import type { WorkbenchProject } from "@/lib/data/workbench";

export function toPortableOperatingLoop(project: WorkbenchProject, exportedAt: string) {
  return {
    schema: "cz.operating-loop.v1",
    exportedAt,
    project: {
      id: project.id,
      slug: project.slug,
      title: project.title,
      stage: project.stage,
      sourceLabel: project.sourceLabel,
      stewardActorId: project.stewardActorId,
    },
    actors: project.actors,
    opportunities: project.opportunities,
    proposals: project.proposals,
    commitments: project.commitments,
    contributions: project.contributions,
    artifacts: project.artifacts,
    claims: project.claims,
    evidenceItems: project.evidenceItems,
    evidenceLinks: project.evidenceLinks,
    verificationRequests: project.verificationRequests,
    verifications: project.verifications,
    trajectory: project.events,
    notices: [
      "Exportação é snapshot portável; não concede autoridade nem direitos econômicos.",
      "Atividade, contribuição, artefato, claim, evidência, verificação e outcome permanecem conceitos distintos.",
      "Verification não cria outcome, reputação, adoção ou verdade universal.",
    ],
  };
}

function actorName(project: WorkbenchProject, actorId: string) {
  return project.actors.find((actor) => actor.id === actorId)?.name ?? actorId;
}

export function operatingLoopToMarkdown(
  project: WorkbenchProject,
  exportedAt: string,
) {
  const lines: string[] = [
    `# ${project.title} — Operating Loop`,
    "",
    `Exportado em: ${exportedAt}`,
    "Schema: cz.operating-loop.v1",
    "",
    "## Estado",
    "",
    `- estágio: ${project.stage}`,
    `- fonte: ${project.sourceLabel}`,
    `- steward: ${actorName(project, project.stewardActorId)}`,
    "",
    "## Atores",
    "",
    ...project.actors.flatMap((actor) => [
      `### ${actor.name}`,
      "",
      `- kind: ${actor.kind}`,
      `- controlado nesta sessão: ${actor.controlled ? "YES" : "NO"}`,
      `- papéis no projeto: ${actor.roles.join(", ") || "nenhum listado"}`,
      ...(actor.operatorLabel ? [`- operador: ${actor.operatorLabel}`] : []),
      "",
    ]),
    "## Ciclo operacional",
    "",
  ];

  for (const opportunity of project.opportunities) {
    lines.push(
      `### Opportunity — ${opportunity.title}`,
      "",
      `- id: ${opportunity.id}`,
      `- estado: ${opportunity.state}`,
      `- owner: ${actorName(project, opportunity.ownerActorId)}`,
      `- capacidade: ${opportunity.capacity}`,
      "",
      opportunity.statement,
      "",
      `**Condições:** ${opportunity.conditions}`,
      "",
      `**Resultado esperado:** ${opportunity.expectedResult}`,
      "",
    );

    for (const proposal of project.proposals.filter(
      (item) => item.opportunityId === opportunity.id,
    )) {
      lines.push(
        `#### Proposal — ${proposal.state}`,
        "",
        `- id: ${proposal.id}`,
        `- proponente: ${actorName(project, proposal.proposerActorId)}`,
        `- versão: ${proposal.currentVersion}`,
        "",
        proposal.statement,
        "",
        `**Condições:** ${proposal.conditions}`,
        "",
        `**Entrega esperada:** ${proposal.expectedDelivery}`,
        "",
        `**Expectativa econômica:** ${proposal.rewardExpectation}`,
        "",
      );

      const commitment = project.commitments.find(
        (item) => item.proposalId === proposal.id,
      );
      if (!commitment) continue;

      lines.push(
        "#### Commitment",
        "",
        `- id: ${commitment.id}`,
        `- contribuinte: ${actorName(project, commitment.proposerActorId)}`,
        `- aceito por: ${actorName(project, commitment.acceptedByActorId)}`,
        `- proposal version: ${commitment.proposalVersion}`,
        `- opportunity version: ${commitment.opportunityVersion}`,
        "",
      );

      for (const contribution of project.contributions.filter(
        (item) => item.commitmentId === commitment.id,
      )) {
        lines.push(
          "#### Contribution",
          "",
          `- id: ${contribution.id}`,
          `- autor: ${actorName(project, contribution.authorActorId)}`,
          "",
          contribution.description,
          "",
          `**Limitações:** ${contribution.limitations}`,
          "",
        );

        for (const artifact of project.artifacts.filter(
          (item) => item.contributionId === contribution.id,
        )) {
          lines.push(
            "##### Artifact",
            "",
            `- id: ${artifact.id}`,
            `- kind: ${artifact.kind}`,
            `- uri: ${artifact.uri}`,
            `- sha256: ${artifact.digest}`,
            `- media type: ${artifact.mediaType}`,
            "",
          );

          for (const claim of project.claims.filter(
            (item) =>
              item.subjectType === "ARTIFACT" &&
              item.subjectId === artifact.id,
          )) {
            lines.push(
              "##### Claim",
              "",
              `- id: ${claim.id}`,
              `- autor: ${actorName(project, claim.authorActorId)}`,
              "",
              claim.statement,
              "",
              `**Escopo:** ${claim.scopeDescription}`,
              "",
            );

            const links = project.evidenceLinks.filter(
              (link) => link.claimId === claim.id,
            );
            for (const link of links) {
              const evidence = project.evidenceItems.find(
                (item) => item.id === link.evidenceItemId,
              );
              if (!evidence) continue;
              lines.push(
                "##### Evidence",
                "",
                `- id: ${evidence.id}`,
                `- relação: ${link.relation}`,
                `- source artifact: ${evidence.sourceArtifactId}`,
                `- sha256: ${evidence.digest}`,
                "",
                evidence.description,
                "",
                `**Limitações:** ${evidence.limitations}`,
                "",
              );
            }

            for (const request of project.verificationRequests.filter(
              (item) => item.claimId === claim.id,
            )) {
              lines.push(
                "##### Verification Request",
                "",
                `- id: ${request.id}`,
                `- reviewer: ${actorName(project, request.reviewerActorId)}`,
                `- independence: ${request.independence}`,
                `- conflitos: ${request.conflictCodes.join(", ") || "nenhum"}`,
                `- método esperado: ${request.expectedMethod}`,
                `- estado: ${request.state}`,
                "",
                request.criteria,
                "",
              );

              const verification = project.verifications.find(
                (item) => item.requestId === request.id,
              );
              if (verification) {
                lines.push(
                  `##### Verification — ${verification.classification}`,
                  "",
                  `- id: ${verification.id}`,
                  `- verifier: ${actorName(project, verification.verifierActorId)}`,
                  `- independence: ${verification.independence}`,
                  `- conflitos: ${verification.conflictCodes.join(", ") || "nenhum"}`,
                  "",
                  verification.findings,
                  "",
                  `**Limitações:** ${verification.limitations}`,
                  "",
                );
              }
            }
          }
        }
      }
    }
  }

  lines.push("## Trajetória operacional", "");
  for (const event of project.events) {
    lines.push(
      `- ${event.occurredAt} — **${event.eventType}** · ${event.aggregateType} · ator ${actorName(project, event.actorId)} · digest ${event.canonicalDigest}`,
    );
  }

  lines.push(
    "",
    "## Avisos",
    "",
    "- Este arquivo é uma exportação portável; não concede autoridade ou direitos econômicos.",
    "- Registro, artifact, claim, evidence e verification permanecem objetos distintos.",
    "- Verification não cria Outcome, reputação, adoção ou verdade universal.",
    "",
  );

  return lines.join("\n");
}

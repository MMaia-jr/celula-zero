import type { PortableProject, ProjectRecord } from "@/lib/domain/types";

export const PORTABILITY_NOTICES = [
  "Este arquivo é uma exportação portável; não concede autoridade ou direitos econômicos.",
  "Registro Original e interpretação atual permanecem objetos distintos.",
  "Bounty, patrocínio e interesse de investimento são declaratórios e liquidados fora da plataforma.",
];

export function toPortableProject(project: ProjectRecord, exportedAt = new Date().toISOString()): PortableProject {
  return {
    schemaVersion: "cz.project.v1",
    exportedAt,
    project,
    notices: PORTABILITY_NOTICES,
  };
}

export function projectToMarkdown(project: ProjectRecord, exportedAt = new Date().toISOString()) {
  const originalIntent = project.originalIntent
    ? `> ${project.originalIntent.replace(/\n/g, "\n> ")}`
    : "> [não exposto nesta projeção pública]";

  const timeline = project.events
    .map(
      (event) =>
        `- ${event.occurredAt} — **${event.title}** (versão material ${event.materialVersion}): ${event.description}`,
    )
    .join("\n");

  return `# ${project.title}

Exportado em: ${exportedAt}
Schema: cz.project.v1
Fonte: ${project.sourceLabel}

## Resumo

${project.summary}

## Registro Original

${originalIntent}

## Interpretação atual

${project.currentIntent}

## Estado operacional

- estágio: ${project.stage}
- visibilidade: ${project.visibility}
- responsável: ${project.steward.name} (${project.steward.kind})
- regime econômico: ${project.economicRegime}
- versão material: ${project.version}

## Resultado pretendido

${project.intendedResult}

## Necessidades atuais

${project.needs.map((need) => `- ${need}`).join("\n")}

## Regras e limites

${project.rulesAndLimits}

## Trajetória

${timeline || "Nenhum evento público registrado."}

## Avisos

${PORTABILITY_NOTICES.map((notice) => `- ${notice}`).join("\n")}
`;
}

import type { ActorKind, EconomicRegime, ProjectStage } from "@/lib/domain/types";

export const projectStageLabel: Record<ProjectStage, string> = {
  DRAFT: "Rascunho",
  OPEN: "Aberto",
  ACTIVE: "Ativo",
  PAUSED: "Pausado",
  COMPLETED: "Concluído",
  ABANDONED: "Encerrado",
};

export const economicRegimeLabel: Record<EconomicRegime, string> = {
  VOLUNTARY: "Voluntário",
  EXCHANGE: "Troca",
  BOUNTY_EXTERNAL: "Bounty externo",
  SPONSORSHIP: "Patrocínio declarado",
  INVESTMENT_INTEREST: "Interesse não vinculante",
};

export const actorKindLabel: Record<ActorKind, string> = {
  PERSON: "Pessoa",
  AI_AGENT: "Agente de IA",
  ORGANIZATION: "Organização",
  SYSTEM: "Sistema",
};

export function formatDate(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(value));
}

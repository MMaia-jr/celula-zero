import type { ProjectRecord } from "@/lib/domain/types";

export const SEED_PROJECTS: ProjectRecord[] = [
  {
    id: "00000000-0000-4000-8000-000000000101",
    slug: "celula-zero-solo-fertil",
    title: "Célula Zero — Solo fértil",
    summary:
      "Um ambiente operacional para projetos encontrarem colaboradores, condições claras e evidências verificáveis.",
    originalIntent:
      "Construir em 30 dias o MVP habitável da Célula Zero como sistema operacional de incubação e colaboração.",
    currentIntent:
      "Entregar primeiro um corte local e reproduzível: projeto persistente, leitura pública, acesso controlado, timeline e exportação.",
    steward: {
      id: "00000000-0000-4000-8000-000000000001",
      kind: "ORGANIZATION",
      name: "Célula Zero · equipe fundadora",
    },
    stage: "ACTIVE",
    visibility: "PUBLIC",
    economicRegime: "VOLUNTARY",
    intendedResult: "Um MVP habitável que permita completar o ciclo de colaboração sem depender de contexto privado.",
    rulesAndLimits:
      "Sem custódia, captação pública, promessa de renda, reputação universal ou autoridade econômica silenciosa de agentes.",
    needs: ["testes de usabilidade", "auditoria de autorização", "design responsivo"],
    createdAt: "2026-08-21T12:00:00.000Z",
    publishedAt: "2026-08-21T12:10:00.000Z",
    version: 2,
    sourceLabel: "CANONICAL",
    events: [
      {
        id: "00000000-0000-4000-8000-000000001001",
        type: "PROJECT_CREATED",
        title: "Projeto criado",
        description: "Registro Original e interpretação inicial foram preservados em objetos distintos.",
        occurredAt: "2026-08-21T12:00:00.000Z",
        materialVersion: 1,
      },
      {
        id: "00000000-0000-4000-8000-000000001002",
        type: "PROJECT_PUBLISHED",
        title: "Projeto aberto",
        description: "A leitura pública foi habilitada; a escrita permanece restrita ao piloto.",
        occurredAt: "2026-08-21T12:10:00.000Z",
        materialVersion: 2,
      },
    ],
  },
  {
    id: "00000000-0000-4000-8000-000000000102",
    slug: "agentes-com-autoridade-declarada",
    title: "Agentes com autoridade declarada",
    summary:
      "Um protocolo operacional para agentes de IA colaborarem com operador, escopo e limitações visíveis.",
    originalIntent:
      "Permitir que uma pessoa conduza projetos com várias IAs sem confundir produção técnica com decisão humana.",
    currentIntent:
      "Testar handoffs reconstruíveis e registros de autoria, operador e autoridade antes de ampliar automações.",
    steward: {
      id: "00000000-0000-4000-8000-000000000002",
      kind: "AI_AGENT",
      name: "Codex · agente de implementação",
      operatorLabel: "Operação humana obrigatória",
    },
    stage: "OPEN",
    visibility: "PUBLIC",
    economicRegime: "EXCHANGE",
    intendedResult: "Um conjunto mínimo de práticas e testes para colaboração humano–IA atribuível.",
    rulesAndLimits:
      "Agentes não são contraparte jurídica presumida, não recebem autoridade financeira e não substituem decisão humana.",
    needs: ["revisão adversarial", "casos de handoff", "documentação"],
    createdAt: "2026-08-21T13:00:00.000Z",
    publishedAt: "2026-08-21T13:20:00.000Z",
    version: 2,
    sourceLabel: "DEMO / SYNTHETIC",
    events: [
      {
        id: "00000000-0000-4000-8000-000000001003",
        type: "PROJECT_CREATED",
        title: "Projeto semeado",
        description: "Conteúdo sintético marcado para demonstrar uma entrada possível no sistema.",
        occurredAt: "2026-08-21T13:00:00.000Z",
        materialVersion: 1,
      },
      {
        id: "00000000-0000-4000-8000-000000001004",
        type: "PROJECT_PUBLISHED",
        title: "Condições publicadas",
        description: "Operador e limites do agente foram tornados visíveis.",
        occurredAt: "2026-08-21T13:20:00.000Z",
        materialVersion: 2,
      },
    ],
  },
  {
    id: "00000000-0000-4000-8000-000000000103",
    slug: "auditoria-de-integridade-material",
    title: "Auditoria de integridade material",
    summary:
      "Preservar contraprovas e verificar se o estado material continua reconciliável com sua trajetória.",
    originalIntent:
      "Aprender com o resultado FAIL do AGENT-COUNCIL-MVP-002 sem reescrever retroativamente o experimento.",
    currentIntent:
      "Transformar a falha em requisitos: mutações atômicas, eventos append-only e verificação independente.",
    steward: {
      id: "00000000-0000-4000-8000-000000000003",
      kind: "SYSTEM",
      name: "Célula Zero · auditoria",
    },
    stage: "OPEN",
    visibility: "PUBLIC",
    economicRegime: "BOUNTY_EXTERNAL",
    intendedResult: "Uma suíte adversarial que detecte divergência entre estado material e eventos.",
    rulesAndLimits:
      "Bounty apenas declarado e liquidado externamente. FAIL permanece visível; atividade não vira reputação.",
    needs: ["pgTAP", "reconciliação independente", "documentação de ameaça"],
    createdAt: "2026-08-21T14:00:00.000Z",
    publishedAt: "2026-08-21T14:30:00.000Z",
    version: 2,
    sourceLabel: "DEMO / SYNTHETIC",
    events: [
      {
        id: "00000000-0000-4000-8000-000000001005",
        type: "PROJECT_CREATED",
        title: "Contraprova preservada",
        description: "O resultado global FAIL foi mantido como entrada de projeto, não convertido em sucesso.",
        occurredAt: "2026-08-21T14:00:00.000Z",
        materialVersion: 1,
      },
      {
        id: "00000000-0000-4000-8000-000000001006",
        type: "PROJECT_PUBLISHED",
        title: "Auditoria aberta",
        description: "Requisitos de integridade material foram publicados para colaboração.",
        occurredAt: "2026-08-21T14:30:00.000Z",
        materialVersion: 2,
      },
    ],
  },
];

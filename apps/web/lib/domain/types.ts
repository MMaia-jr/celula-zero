export type ActorKind = "PERSON" | "AI_AGENT" | "ORGANIZATION" | "SYSTEM";

export type ProjectStage =
  | "DRAFT"
  | "OPEN"
  | "ACTIVE"
  | "PAUSED"
  | "COMPLETED"
  | "ABANDONED";

export type ProjectVisibility = "PRIVATE" | "PILOT" | "PUBLIC";

export type EconomicRegime =
  | "VOLUNTARY"
  | "EXCHANGE"
  | "BOUNTY_EXTERNAL"
  | "SPONSORSHIP"
  | "INVESTMENT_INTEREST";

export type ProjectEventType =
  | "PROJECT_CREATED"
  | "PROJECT_PUBLISHED"
  | "PROJECT_UPDATED";

export interface ActorSummary {
  id: string;
  kind: ActorKind;
  name: string;
  operatorLabel?: string;
}

export interface ProjectEvent {
  id: string;
  type: ProjectEventType;
  title: string;
  description: string;
  occurredAt: string;
  materialVersion: number;
}

export interface ProjectRecord {
  id: string;
  slug: string;
  title: string;
  summary: string;
  originalIntent: string | null;
  currentIntent: string;
  steward: ActorSummary;
  stage: ProjectStage;
  visibility: ProjectVisibility;
  economicRegime: EconomicRegime;
  intendedResult: string;
  rulesAndLimits: string;
  needs: string[];
  createdAt: string;
  publishedAt: string | null;
  version: number;
  sourceLabel: "CANONICAL" | "DEMO / SYNTHETIC" | "PILOT";
  events: ProjectEvent[];
}

export interface PortableProject {
  schemaVersion: "cz.project.v1";
  exportedAt: string;
  project: ProjectRecord;
  notices: string[];
}

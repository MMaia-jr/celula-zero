// SPDX-License-Identifier: MPL-2.0
import { z } from "zod";

export const intelligenceInterpretationSchema = z.object({
  whatIUnderstand: z.string().trim().min(1).max(2000),
  relevantContext: z.array(z.string().trim().min(1).max(500)).max(6),
  availableCapabilities: z.array(z.string().trim().min(1).max(100)).max(6),
  composition: z.string().trim().min(1).max(2000),
  missingCapability: z.string().trim().max(500).nullable(),
  conditions: z.array(z.string().trim().min(1).max(500)).max(6),
  authorityRequired: z.string().trim().min(1).max(500),
  why: z.string().trim().min(1).max(1500),
  nextAction: z.string().trim().min(1).max(1000),
  workProposal: z.object({ title: z.string().trim().min(1).max(160), context: z.string().trim().min(1).max(2000) }).strict().nullable(),
  openTarget: z.object({ kind: z.enum(["work", "project", "opportunity", "meeting", "experience"]), id: z.string().trim().min(1).max(160) }).strict().optional(),
  experienceProposal: z.object({ title: z.string().trim().min(1).max(160), description: z.string().trim().min(1).max(2000), occurredOn: z.iso.date().nullable(), uncertainty: z.string().trim().min(1).max(500) }).strict().optional(),
  continuationProposal: z.object({ possibility: z.string().trim().min(1).max(700), question: z.string().trim().min(1).max(300) }).strict().optional(),
  meetingProposal: z.object({ title: z.string().trim().min(3).max(120), purpose: z.string().trim().min(8).max(1200) }).strict().optional(),
}).strict();

export type IntelligenceInterpretation = z.infer<typeof intelligenceInterpretationSchema>;
export type IntelligenceMode = "interpret" | "compose" | "explain" | "reflect";
export interface IntelligenceContext {
  currentSurface?: string;
  navigation?: Array<{ section: string; label: string; href: string }>;
  entities?: Array<{ kind: "work" | "project" | "opportunity" | "meeting" | "experience"; id: string; label: string; href: string }>;
  runtime?: { environment: "local" | "hosted"; repository: string; localHead: string; canonicalHead: string | null; workingTreeDirty: boolean; changedPathCount: number };
  activeDirection?: {
    status: "CURRENT_HUMAN_DIRECTION_LOCAL_NOT_CANONICAL";
    receivedAt: string;
    source: string;
    campaign: string;
    implementationProgress: string[];
    currentPriority: string[];
    oldOpenWorkBoundary: string;
    canonicalBoundary: string;
    constraints: string[];
  } | null;
  person: { id: string; name: string; profileHeadline: string; profileBio: string };
  cell: { id: string; name: string; purpose: string };
  relations: string[];
  authority: string[];
  openWork: Array<{ id: string; title: string; context: string; updatedAt: string }>;
  meetings: Array<{ id: string; title: string; purpose: string; status: "OPEN" | "CLOSED"; participants: string[]; href: string }>;
  pendingHumanActions: Array<{ kind: "WORK_PROPOSAL"; title: string; context: string }>;
  projects: Array<{ id: string; title: string; stage: string; openOpportunities: Array<{ id: string; title: string; statement: string; conditions: string; expectedResult: string }>; commitments: Array<{ id: string; proposalId: string; opportunityId: string; createdAt: string; agreement?: { expectedResult: string; scope: string; exclusions: string; dependencies: string; evaluationCriterion: string; budgetBoundary: string } }> }>;
  recentMetabolism: Array<{ eventType: string; projectTitle: string; aggregateType: string; occurredAt: string; sourcePresent: boolean; resultDigest?: string; taskCapsuleDigest?: string }>;
  contributions: Array<{ projectTitle: string; description: string; limitations: string; submittedAt: string; claimCount: number; verificationCount: number }>;
  profileCapabilityCandidates?: Array<{ proposedName: string; status: string; sourceLearningPresent: boolean }>;
  recentConversation: Array<{ speaker: string; text: string; createdAt: string }>;
  recentRecords: Array<{ id: string; kind: string; purpose?: string; content: string; createdAt: string }>;
  experiences: Array<{ title: string; description: string; provenance: string }>;
  capabilities: Array<{ id: string; name: string; effect: string; availability: string; conditions: string[] }>;
  currentCapabilities?: Array<{
    id: string;
    label: string;
    enables: string;
    readWrite: "READ_ONLY" | "DRAFT_ONLY" | "DIRECT_HUMAN_WRITE" | "WRITE_AFTER_HUMAN_CONFIRMATION";
    authorityRequired: string;
    costUsageClass: string;
    availability: "AVAILABLE" | "AVAILABLE_WITH_HUMAN_CONFIRMATION" | "BACKGROUND_ONLY" | "CONFIGURED_BUT_UNAVAILABLE" | "NOT_CONFIGURED" | "HISTORICAL_ONLY";
    reason: string;
    actionEntrypoint: string | null;
  }>;
  resources: Array<{ id: string; kind: string; source: string; availability: string; provenance: string }>;
  canonical: {
    repository: string;
    head: string | null;
    statePath: string;
    boundary: string;
    sourceExcerpts: Array<{ path: string; artifactKind: string; excerpt: string }>;
  };
}

export interface IntelligenceResult {
  interpretation: IntelligenceInterpretation;
  provider: string;
  model: string;
  inputTokens: number | null;
  outputTokens: number | null;
  contextDigest: string;
  requestId: string | null;
  contextCharacters?: number;
  promptCharacters?: number;
}

export interface InstitutionalIntelligencePort {
  interpret(input: { text: string; context: IntelligenceContext; mode?: IntelligenceMode; signal?: AbortSignal }): Promise<IntelligenceResult>;
  compose(input: { text: string; context: IntelligenceContext; signal?: AbortSignal }): Promise<IntelligenceResult>;
  explain(input: { text: string; context: IntelligenceContext; signal?: AbortSignal }): Promise<IntelligenceResult>;
  reflect(input: { text: string; context: IntelligenceContext; signal?: AbortSignal }): Promise<IntelligenceResult>;
}

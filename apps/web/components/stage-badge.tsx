import type { ProjectStage } from "@/lib/domain/types";
import { projectStageLabel } from "@/lib/presentation/labels";

export function StageBadge({ stage }: { stage: ProjectStage }) {
  return <span className={`stage-badge stage-${stage.toLowerCase()}`}>{projectStageLabel[stage]}</span>;
}

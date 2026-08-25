import type { ProjectStage } from "@/lib/domain/types";
import { stageLabel, type Locale } from "@/lib/i18n/core";

export function StageBadge({
  stage,
  locale = "pt",
}: {
  stage: ProjectStage;
  locale?: Locale;
}) {
  return (
    <span className={`stage-badge stage-${stage.toLowerCase()}`}>
      {stageLabel(stage, locale)}
    </span>
  );
}

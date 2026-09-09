import { PARTICIPATION_NOTICE } from "@/lib/domain/participation";
import { ParticipationAcceptClient } from "./participation-accept-client";

export default function ParticipationAcceptPage() {
  return <main className="section-shell"><header className="project-hero"><div className="project-hero-main"><p className="mini-label">CONSENT</p><h1>Consider Cell participation</h1><p>{PARTICIPATION_NOTICE}</p></div></header><ParticipationAcceptClient /></main>;
}

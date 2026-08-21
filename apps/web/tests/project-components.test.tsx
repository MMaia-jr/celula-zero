import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ProjectCard } from "@/components/project-card";
import { ProjectTimeline } from "@/components/project-timeline";
import { StageBadge } from "@/components/stage-badge";
import { SEED_PROJECTS } from "@/lib/data/seed-projects";

const project = SEED_PROJECTS[2]!;

describe("public project components", () => {
  it("shows source, regime and responsible actor without implying payment", () => {
    render(<ProjectCard project={project} />);
    expect(screen.getByRole("heading", { name: project.title })).toBeInTheDocument();
    expect(screen.getByText("DEMO / SYNTHETIC")).toBeInTheDocument();
    expect(screen.getByText("Bounty externo")).toBeInTheDocument();
    expect(screen.getByText("fora da plataforma")).toBeInTheDocument();
  });

  it("renders material versions in chronological trajectory", () => {
    render(<ProjectTimeline events={project.events} />);
    expect(screen.getByText("estado material v1")).toBeInTheDocument();
    expect(screen.getByText("estado material v2")).toBeInTheDocument();
  });

  it("translates the stage without changing its domain value", () => {
    render(<StageBadge stage="ACTIVE" />);
    expect(screen.getByText("Ativo")).toHaveClass("stage-active");
  });
});

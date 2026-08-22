import { NextResponse } from "next/server";
import { getPublicProjectBySlug } from "@/lib/data/projects";
import { projectToMarkdown, toPortableProject } from "@/lib/domain/export-project";

interface ExportRouteProps {
  params: Promise<{ slug: string }>;
}

export async function GET(request: Request, { params }: ExportRouteProps) {
  const { slug } = await params;
  const project = await getPublicProjectBySlug(slug);
  if (!project) return NextResponse.json({ error: "Projeto não encontrado." }, { status: 404 });

  const format = new URL(request.url).searchParams.get("format") ?? "json";
  const exportedAt = new Date().toISOString();

  if (format === "md") {
    return new NextResponse(projectToMarkdown(project, exportedAt), {
      headers: {
        "Content-Type": "text/markdown; charset=utf-8",
        "Content-Disposition": `attachment; filename="${project.slug}.md"`,
      },
    });
  }

  return NextResponse.json(toPortableProject(project, exportedAt), {
    headers: { "Content-Disposition": `attachment; filename="${project.slug}.json"` },
  });
}

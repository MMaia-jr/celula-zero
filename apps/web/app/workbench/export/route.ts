import { NextResponse } from "next/server";
import { getWorkbenchData } from "@/lib/data/workbench";
import {
  operatingLoopToMarkdown,
  toPortableOperatingLoop,
} from "@/lib/domain/export-operating-loop";

export async function GET(request: Request) {
  const data = await getWorkbenchData();

  if (data.status === "ANONYMOUS") {
    return NextResponse.json({ error: "Autenticação necessária." }, { status: 401 });
  }
  if (data.status === "UNAVAILABLE") {
    return NextResponse.json({ error: "Backend indisponível." }, { status: 503 });
  }

  const url = new URL(request.url);
  const slug = url.searchParams.get("project");
  const format = url.searchParams.get("format") ?? "json";

  if (!slug) {
    return NextResponse.json({ error: "Projeto ausente." }, { status: 400 });
  }

  const project = data.projects.find((item) => item.slug === slug);
  if (!project) {
    return NextResponse.json({ error: "Projeto não operável." }, { status: 404 });
  }

  const exportedAt = new Date().toISOString();

  if (format === "md") {
    return new NextResponse(operatingLoopToMarkdown(project, exportedAt), {
      headers: {
        "Content-Type": "text/markdown; charset=utf-8",
        "Content-Disposition": `attachment; filename="${project.slug}-operating-loop.md"`,
      },
    });
  }

  return NextResponse.json(toPortableOperatingLoop(project, exportedAt), {
    headers: {
      "Content-Disposition": `attachment; filename="${project.slug}-operating-loop.json"`,
    },
  });
}

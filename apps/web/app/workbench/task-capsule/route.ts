import { NextResponse } from "next/server";
import { getWorkbenchData } from "@/lib/data/workbench";
import {
  createTaskCapsule,
  taskCapsuleToMarkdown,
} from "@/lib/domain/task-capsule";

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
  const commitmentId = url.searchParams.get("commitment");
  const format = url.searchParams.get("format") ?? "json";

  if (!slug || !commitmentId) {
    return NextResponse.json(
      { error: "Projeto e Commitment são obrigatórios." },
      { status: 400 },
    );
  }

  const project = data.projects.find((item) => item.slug === slug);
  if (!project) {
    return NextResponse.json({ error: "Projeto não operável." }, { status: 404 });
  }

  try {
    const capsule = createTaskCapsule(project, commitmentId);

    if (format === "md") {
      return new NextResponse(taskCapsuleToMarkdown(capsule), {
        headers: {
          "Content-Type": "text/markdown; charset=utf-8",
          "Content-Disposition": `attachment; filename="${project.slug}-${capsule.packetId}.md"`,
        },
      });
    }

    return NextResponse.json(capsule, {
      headers: {
        "Content-Disposition": `attachment; filename="${project.slug}-${capsule.packetId}.json"`,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Task Capsule inválido.";
    return NextResponse.json({ error: message }, { status: 409 });
  }
}

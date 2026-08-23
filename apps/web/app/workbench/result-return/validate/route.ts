import { NextResponse } from "next/server";
import { getWorkbenchData } from "@/lib/data/workbench";
import {
  createHumanAssuranceView,
  ResultReturnValidationError,
} from "@/lib/domain/human-assurance";
import { createTaskCapsule } from "@/lib/domain/task-capsule";

const MAX_RESULT_PACKAGE_BYTES = 256 * 1024;

export async function POST(request: Request) {
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

  const raw = await request.text();
  const size = new TextEncoder().encode(raw).length;
  if (size > MAX_RESULT_PACKAGE_BYTES) {
    return NextResponse.json(
      { error: "Result Package excede o limite de 256 KiB para preview." },
      { status: 413 },
    );
  }

  let input: unknown;
  try {
    input = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: "JSON inválido." }, { status: 400 });
  }

  try {
    const capsule = createTaskCapsule(project, commitmentId);
    const assurance = createHumanAssuranceView(input, capsule, []);
    return NextResponse.json(assurance);
  } catch (error) {
    if (error instanceof ResultReturnValidationError) {
      const status =
        error.code === "EXECUTOR_MISMATCH"
          ? 403
          : error.code === "TASK_CAPSULE_MISMATCH"
            ? 409
            : 422;
      return NextResponse.json(
        { error: error.message, code: error.code },
        { status },
      );
    }

    const message = error instanceof Error ? error.message : "Retorno inválido.";
    return NextResponse.json({ error: message }, { status: 409 });
  }
}

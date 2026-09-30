// SPDX-License-Identifier: MPL-2.0
import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { resolve } from "node:path";
import { ZodError } from "zod";
import { LocalStore } from "./local-store";
import { actorFor, applyCommand, projection } from "./foundation";
let store: LocalStore | undefined;
const cookie = "cz_foundation_session";
function database() {
  return (store ??= new LocalStore(
    process.env.CZ_FOUNDATION_DB ?? resolve(".data/foundation.sqlite"),
  ));
}
function allowed(request: NextRequest): boolean {
  const host = request.headers.get("host");
  return (
    process.env.CZ_LOCAL_FOUNDATION === "1" &&
    !!host &&
    /^(127\.0\.0\.1|localhost):[0-9]+$/.test(host)
  );
}
export async function handle(request: NextRequest) {
  if (!allowed(request))
    return NextResponse.json(
      {
        error:
          "A Foundation local precisa ser iniciada no ambiente autorizado.",
      },
      { status: 503 },
    );
  const token = request.cookies.get(cookie)?.value;
  if (
    request.method === "POST" &&
    request.headers.get("origin") !== `http://${request.headers.get("host")}`
  )
    return NextResponse.json(
      { error: "Origem não autorizada." },
      { status: 403 },
    );
  try {
    const db = database();
    if (request.method === "GET") {
      if (!db.session(token)) return NextResponse.json({ view: null });
      const state = db.read();
      const view = projection(
        state,
        actorFor(state, "local-foundation", "founder-fixture"),
      );
      if (request.nextUrl.searchParams.get("export") === "1")
        return new NextResponse(
          JSON.stringify(
            {
              ...view,
              exportedAt: new Date().toISOString(),
              boundary:
                "Local foundation snapshot; not identity verification or a production backup.",
            },
            null,
            2,
          ),
          {
            headers: {
              "Content-Type": "application/json",
              "Content-Disposition":
                'attachment; filename="cz-foundation.json"',
            },
          },
        );
      return NextResponse.json({ view });
    }
    if (!request.headers.get("content-type")?.startsWith("application/json"))
      return NextResponse.json({ error: "Formato inválido." }, { status: 415 });
    const body = await request.text();
    if (Buffer.byteLength(body) > 20000)
      return NextResponse.json(
        { error: "Texto muito longo." },
        { status: 413 },
      );
    const data: unknown = JSON.parse(body);
    if (!data || typeof data !== "object" || !("action" in data))
      return NextResponse.json({ error: "Pedido inválido." }, { status: 400 });
    if (data.action === "enter") {
      // Explicit single-user local fixture; never authentication for external users.
      const state = db.read();
      actorFor(state, "local-foundation", "founder-fixture");
      const response = NextResponse.json({ ok: true });
      response.cookies.set(cookie, db.createSession(), {
        httpOnly: true,
        sameSite: "strict",
        secure: false,
        path: "/",
        maxAge: 8 * 60 * 60,
      });
      return response;
    }
    if (!db.session(token))
      return NextResponse.json(
        { error: "Entre novamente para continuar." },
        { status: 401 },
      );
    if (data.action === "leave") {
      if (token) db.revoke(token);
      const response = NextResponse.json({ ok: true });
      response.cookies.delete(cookie);
      return response;
    }
    if (
      data.action !== "command" ||
      !("command" in data) ||
      !("key" in data) ||
      typeof data.key !== "string"
    )
      return NextResponse.json({ error: "Pedido inválido." }, { status: 400 });
    const key = data.key,
      command = data.command;
    const view = db.transact((state) => {
      const actor = actorFor(state, "local-foundation", "founder-fixture");
      const next = applyCommand(
        state,
        actor,
        command,
        key,
        randomUUID,
        new Date().toISOString(),
      );
      return { state: next, result: projection(next, actor) };
    });
    return NextResponse.json({ view });
  } catch (error) {
    if (error instanceof ZodError || error instanceof SyntaxError)
      return NextResponse.json(
        { error: "Revise os campos: há um valor inválido ou incompleto." },
        { status: 400 },
      );
    const message = error instanceof Error ? error.message : "";
    const known: Record<string, string> = {
      FORBIDDEN: "Você não tem autoridade para essa ação.",
      IDENTITY_UNRESOLVED: "A identidade não pôde ser resolvida com segurança.",
      IDENTITY_ALREADY_RECORDED: "Essa identidade já está no seu perfil.",
      REQUEST_KEY_CONFLICT:
        "Esse pedido já foi utilizado. Recarregue e tente novamente.",
      INVALID_REQUEST_KEY: "Pedido inválido.",
    };
    if (known[message])
      return NextResponse.json(
        { error: known[message] },
        {
          status:
            message === "FORBIDDEN" || message === "IDENTITY_UNRESOLVED"
              ? 403
              : 409,
        },
      );
    console.error(
      "CZ_FOUNDATION_OPERATION_FAILED",
      error instanceof Error ? error.name : "UnknownError",
    );
    return NextResponse.json(
      {
        error:
          "Não foi possível salvar. Seu registro não foi confirmado; tente novamente.",
      },
      { status: 500 },
    );
  }
}

// SPDX-License-Identifier: MPL-2.0
import { createServer } from "node:http";

const account = "8be52aba-16a3-4b48-8f49-b9e6b771fe52";
const server = createServer((request, response) => {
  if (request.method === "GET" && request.url === "/") {
    response.writeHead(200).end("ready");
    return;
  }
  if (request.method === "GET" && request.url === "/api/tags") {
    response.writeHead(200, { "content-type": "application/json" }).end(JSON.stringify({ models: [{ name: "qwen3:4b" }] }));
    return;
  }
  if (request.method !== "POST" || !["/_accounts", "/api/chat"].includes(request.url ?? "")) {
    response.writeHead(404).end();
    return;
  }
  let body = "";
  request.on("data", (chunk) => { body += chunk; });
  request.on("end", () => {
    let parsed;
    try { parsed = JSON.parse(body); } catch {
      response.writeHead(400).end();
      return;
    }
    if (request.url === "/api/chat") {
      const prompt = parsed.messages?.[0]?.content ?? "";
      const originalMarker = "\n\nMENSAGEM ORIGINAL DO MARCOS=";
      const originalHumanText = prompt.includes(originalMarker) ? prompt.split(originalMarker).at(-1) : "";
      const interpretation = {
        whatIUnderstand: "Marcos quer tornar algo possível e continuar a partir do contexto da Célula.",
        relevantContext: ["O input humano será preservado como Original Record.", "A Célula e sua autoridade foram resolvidas da sessão autenticada."],
        availableCapabilities: ["cz:local-work", "invented:capability"],
        composition: "Revisar a intenção e, se fizer sentido, propor trabalho local na Célula.",
        missingCapability: null,
        conditions: ["Nenhum trabalho será criado sem confirmação humana explícita."],
        authorityRequired: "cell.update, resolvida no servidor",
        why: "O trabalho local pode continuar após logout e retorno.",
        nextAction: "Revisar a proposta antes de confirmar.",
        workProposal: { title: "Retomar o trabalho da Célula", context: "Continuar a partir da intenção original e decidir o próximo passo." },
        ...(originalHumanText.includes("XII Fórum de Agroecologia") ? { experienceProposal: { title: "XII Fórum de Agroecologia", description: "Ajudei a organizar e operar o XII Fórum de Agroecologia.", occurredOn: null, uncertainty: "O relato não informa a data nem outros detalhes; revise antes de registrar." } } : {}),
        ...(originalHumanText.includes("reunir Essenthius") ? { meetingProposal: { title: "Conversar com Essenthius", purpose: "Pensar junto sobre o próximo passo do Habitat." } } : {}),
      };
      response.writeHead(200, { "content-type": "application/json" }).end(JSON.stringify({ done: true, prompt_eval_count: 120, eval_count: 85, message: { content: JSON.stringify(interpretation) } }));
      return;
    }
    if (parsed.method !== "login" || parsed.params?.email !== "marcos@example.test" || parsed.params?.password !== "test-password") {
      response.writeHead(401, { "content-type": "application/json" }).end(JSON.stringify({ error: "INVALID_CREDENTIALS" }));
      return;
    }
    response.writeHead(200, { "content-type": "application/json" }).end(JSON.stringify({ result: { account, token: "test-only-huly-token" } }));
  });
});
server.listen(3090, "127.0.0.1");

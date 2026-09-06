import { randomUUID } from "node:crypto";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import {
  authorizeWorkAction,
  defineAgreementAction,
  recordConsequenceAction,
  recordEvaluationAction,
  recordResultAction,
} from "@/app/company-core/actions";
import {
  getAiJobOperationalStatus,
  getAiRunOutput,
  getCompanyCoreCycle,
  listSponsoredBudgetPools,
} from "@/lib/data/company-core";
import { getLocale } from "@/lib/i18n/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

interface CompanyCoreDetailPageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: CompanyCoreDetailPageProps): Promise<Metadata> {
  const { id } = await params;
  const cycle = await getCompanyCoreCycle(id);
  return {
    title: cycle ? `${cycle.needTitle} · Company Core` : "Cycle not found",
  };
}

export default async function CompanyCoreDetailPage({ params }: CompanyCoreDetailPageProps) {
  const locale = await getLocale();
  const en = locale === "en";
  const { id } = await params;
  const cycle = await getCompanyCoreCycle(id);
  if (!cycle) notFound();

  const client = await createSupabaseServerClient();
  if (!client) redirect("/company-core?error=backend-unavailable");

  const { data: authData } = await client.auth.getUser();
  if (!authData.user) redirect(`/login?next=${encodeURIComponent(`/company-core/${id}`)}`);

  const [aiOutput, aiJob] = await Promise.all([
    cycle.aiRunId ? getAiRunOutput(id) : Promise.resolve(null),
    cycle.aiRunId ? getAiJobOperationalStatus(cycle.aiRunId) : Promise.resolve(null),
  ]);
  const sponsoredPools = cycle.state === "AGREEMENT_DEFINED" ? await listSponsoredBudgetPools(cycle.cellId) : [];

  const stateLabel: Record<string, string> = {
    NEED_CREATED: en ? "Need created" : "Need criada",
    AGREEMENT_DEFINED: en ? "Agreement defined" : "Acordo definido",
    WORK_AUTHORIZED: en ? "Work authorized" : "Trabalho autorizado",
    AI_RUNNING: en ? "AI running" : "IA executando",
    AI_COMPLETED: en ? "AI completed" : "IA concluída",
    AI_FAILED: en ? "AI failed" : "IA falhou",
    RESULT_RECORDED: en ? "Result recorded" : "Resultado registrado",
    EVALUATION_RECORDED: en ? "Evaluation recorded" : "Avaliação registrada",
    CONSEQUENCE_RECORDED: en ? "Consequence recorded" : "Consequência registrada",
    CLOSED: en ? "Closed" : "Fechado",
  };

  const nextStepLabel: Record<string, string> = {
    NEED_CREATED: en ? "Define agreement" : "Definir acordo",
    AGREEMENT_DEFINED: en ? "Authorize AI work" : "Autorizar trabalho de IA",
    WORK_AUTHORIZED: en ? "AI is running…" : "IA está executando…",
    AI_RUNNING: en ? "Check AI Job status" : "Verificar estado do Job de IA",
    AI_COMPLETED: en ? "Record result" : "Registrar resultado",
    AI_FAILED: en ? "Record result (AI failed)" : "Registrar resultado (IA falhou)",
    RESULT_RECORDED: en ? "Record evaluation" : "Registrar avaliação",
    EVALUATION_RECORDED: en ? "Record consequence" : "Registrar consequência",
    CONSEQUENCE_RECORDED: en ? "Cycle complete" : "Ciclo completo",
    CLOSED: en ? "Cycle closed" : "Ciclo fechado",
  };

  return (
    <main className="section-shell">
      <div className="breadcrumb">
        <Link href="/">{en ? "Home" : "Início"}</Link>
        <span aria-hidden="true">/</span>
        <Link href="/company-core">{en ? "Company Core" : "Núcleo da Empresa"}</Link>
        <span aria-hidden="true">/</span>
        <span>{cycle.needTitle}</span>
      </div>

      <header className="project-hero">
        <div className="project-hero-main">
          <p className="mini-label">COMPANY CORE v0.1 · {stateLabel[cycle.state] ?? cycle.state}</p>
          <h1>{cycle.needTitle}</h1>
          <p>{cycle.needProblem}</p>
        </div>
      </header>

      {/* Need section */}
      <section className="content-block">
        <p className="mini-label">1 · NEED</p>
        <p><strong>{en ? "Desired result" : "Resultado desejado"}:</strong> {cycle.needDesiredResult}</p>
        {cycle.needContext ? <p><strong>{en ? "Context" : "Contexto"}:</strong> {cycle.needContext}</p> : null}
        {cycle.needPriority ? <p><strong>{en ? "Priority" : "Prioridade"}:</strong> {cycle.needPriority}</p> : null}
        {cycle.needConstraints ? <p><strong>{en ? "Constraints" : "Restrições"}:</strong> {cycle.needConstraints}</p> : null}
        {cycle.needConfidentiality ? <p><strong>{en ? "Confidentiality" : "Confidencialidade"}:</strong> {cycle.needConfidentiality}</p> : null}
      </section>

      {/* Agreement section */}
      <section className="content-block">
        <p className="mini-label">2 · AGREEMENT / WORK DEFINITION</p>
        {cycle.agreementExpectedResult ? (
          <>
            <p><strong>{en ? "Expected result" : "Resultado esperado"}:</strong> {cycle.agreementExpectedResult}</p>
            {cycle.agreementScope ? <p><strong>{en ? "Scope" : "Escopo"}:</strong> {cycle.agreementScope}</p> : null}
            {cycle.agreementExclusions ? <p><strong>{en ? "Exclusions" : "Exclusões"}:</strong> {cycle.agreementExclusions}</p> : null}
            {cycle.agreementDependencies ? <p><strong>{en ? "Dependencies" : "Dependências"}:</strong> {cycle.agreementDependencies}</p> : null}
            <p><strong>{en ? "Evaluation criterion" : "Critério de avaliação"}:</strong> {cycle.agreementEvaluationCriterion}</p>
            {cycle.agreementBudgetBoundary ? <p><strong>{en ? "Budget" : "Orçamento"}:</strong> {cycle.agreementBudgetBoundary}</p> : null}
            {cycle.agreementAuthority ? <p><strong>{en ? "Authority" : "Autoridade"}:</strong> {cycle.agreementAuthority}</p> : null}
            {cycle.agreementDeadline ? <p><strong>{en ? "Deadline" : "Prazo"}:</strong> {new Date(cycle.agreementDeadline).toLocaleDateString(locale)}</p> : null}
          </>
        ) : (
          <p>{en ? "Agreement not yet defined." : "Acordo ainda não definido."}</p>
        )}
      </section>

      {/* AI Work section */}
      <section className="content-block">
        <p className="mini-label">3 · AI WORK</p>
        {cycle.aiRunId ? (
          <>
            <p><strong>{en ? "AI Run state" : "Estado da execução de IA"}:</strong> {cycle.aiRunState}</p>
            <p><strong>{en ? "AI Job operational state" : "Estado operacional do Job de IA"}:</strong> {aiJob?.state ?? "—"}</p>
            {aiJob?.failureCode ? (
              <p><strong>{en ? "AI Job failure code" : "Código de falha do Job de IA"}:</strong> {aiJob.failureCode}</p>
            ) : null}
            {aiJob?.state === "NEEDS_RECONCILIATION" ? (
              <p>
                <strong>{en ? "Reconciliation required" : "Reconciliação necessária"}:</strong>{" "}
                {en
                  ? "The execution outcome is uncertain and requires reconciliation."
                  : "O resultado da execução é incerto e requer reconciliação."}
              </p>
            ) : null}
            <p><strong>{en ? "Provider" : "Provedor"}:</strong> {cycle.aiRunProvider ?? "—"}</p>
            <p><strong>{en ? "Model" : "Modelo"}:</strong> {cycle.aiRunModel ?? "—"}</p>
            {cycle.aiRunInputTokens != null ? (
              <p><strong>{en ? "Tokens" : "Tokens"}:</strong> {cycle.aiRunInputTokens} in / {cycle.aiRunOutputTokens} out / {cycle.aiRunTotalTokens} total</p>
            ) : null}
            {cycle.aiRunCostUsd != null ? (
              <p><strong>{en ? "Cost" : "Custo"}:</strong> ${cycle.aiRunCostUsd.toFixed(6)} ({cycle.aiRunCostSource})</p>
            ) : null}
          </>
        ) : (
          <p>{en ? "No AI execution yet." : "Nenhuma execução de IA ainda."}</p>
        )}

        {aiOutput ? (
          <details className="side-block">
            <summary><strong>{en ? "AI Output (raw)" : "Saída da IA (bruta)"}</strong></summary>
            <pre style={{ whiteSpace: "pre-wrap", fontSize: "0.9rem" }}>{aiOutput}</pre>
          </details>
        ) : null}
      </section>

      {/* Result section */}
      <section className="content-block">
        <p className="mini-label">4 · RESULT</p>
        {cycle.resultContent ? (
          <pre style={{ whiteSpace: "pre-wrap", fontSize: "0.95rem" }}>{cycle.resultContent}</pre>
        ) : (
          <p>{en ? "Result not yet recorded." : "Resultado ainda não registrado."}</p>
        )}
      </section>

      {/* Evaluation section */}
      <section className="content-block">
        <p className="mini-label">5 · EVALUATION</p>
        {cycle.evaluationVerdict ? (
          <>
            <p><strong>{en ? "Verdict" : "Veredicto"}:</strong> {cycle.evaluationVerdict}</p>
            {cycle.evaluationRationale ? <p><strong>{en ? "Rationale" : "Fundamento"}:</strong> {cycle.evaluationRationale}</p> : null}
          </>
        ) : (
          <p>{en ? "Evaluation not yet recorded." : "Avaliação ainda não registrada."}</p>
        )}
      </section>

      {/* Consequence section */}
      <section className="content-block">
        <p className="mini-label">6 · ECONOMIC/OPERATIONAL CONSEQUENCE</p>
        {cycle.consequenceType ? (
          <>
            <p><strong>{en ? "Type" : "Tipo"}:</strong> {cycle.consequenceType}</p>
            {cycle.consequenceDescription ? <p><strong>{en ? "Description" : "Descrição"}:</strong> {cycle.consequenceDescription}</p> : null}
            {cycle.consequenceFounderTimeMinutes != null ? <p><strong>{en ? "Founder time" : "Tempo do fundador"}:</strong> {cycle.consequenceFounderTimeMinutes} min</p> : null}
            {cycle.consequenceAiCostUsd != null ? <p><strong>{en ? "AI cost" : "Custo de IA"}:</strong> ${cycle.consequenceAiCostUsd.toFixed(6)}</p> : null}
          </>
        ) : (
          <p>{en ? "Consequence not yet recorded." : "Consequência ainda não registrada."}</p>
        )}
      </section>

      {/* Next action form */}
      <section className="content-block side-block">
        <p className="mini-label">NEXT ACTION · {nextStepLabel[cycle.state] ?? cycle.state}</p>

        {cycle.state === "NEED_CREATED" ? (
          <form className="project-form" action={defineAgreementAction}>
            <input type="hidden" name="cycleId" value={cycle.id} />
            <input type="hidden" name="commandId" value={randomUUID()} />
            <input type="hidden" name="idempotencyKey" value={`company-core-agreement-${randomUUID()}`} />

            <label>
              <span>{en ? "Expected result" : "Resultado esperado"}</span>
              <textarea name="expectedResult" rows={4} minLength={3} maxLength={2000} required />
            </label>
            <label>
              <span>{en ? "Scope" : "Escopo"}</span>
              <textarea name="scope" rows={3} minLength={3} maxLength={2000} required />
            </label>
            <label>
              <span>{en ? "Exclusions (optional)" : "Exclusões (opcional)"}</span>
              <textarea name="exclusions" rows={3} maxLength={2000} />
            </label>
            <label>
              <span>{en ? "Dependencies (optional)" : "Dependências (opcional)"}</span>
              <textarea name="dependencies" rows={3} maxLength={2000} />
            </label>
            <label>
              <span>{en ? "Evaluation criterion" : "Critério de avaliação"}</span>
              <textarea name="evaluationCriterion" rows={3} minLength={3} maxLength={2000} required />
            </label>
            <label>
              <span>{en ? "Budget boundary (optional)" : "Limite de orçamento (opcional)"}</span>
              <input name="budgetBoundary" maxLength={1000} />
            </label>
            <label>
              <span>{en ? "Authority boundary (optional)" : "Limite de autoridade (opcional)"}</span>
              <textarea name="authority" rows={3} maxLength={2000} />
            </label>
            <label>
              <span>{en ? "Deadline (optional)" : "Prazo (opcional)"}</span>
              <input name="deadline" type="datetime-local" />
            </label>

            <button className="button button-primary" type="submit">
              {en ? "Define Agreement" : "Definir Acordo"}
            </button>
          </form>
        ) : null}

        {cycle.state === "AGREEMENT_DEFINED" ? (
          <form className="project-form" action={authorizeWorkAction}>
            <input type="hidden" name="cycleId" value={cycle.id} />
            <input type="hidden" name="commandId" value={randomUUID()} />
            <input type="hidden" name="idempotencyKey" value={`company-core-auth-${randomUUID()}`} />

            <p>
              {en
                ? "This will execute ONE AI inference through the Vercel AI Gateway (moonshotai/kimi-k2.6). The output will be preserved as an attributable AI Run."
                : "Isso executará UMA inferência de IA através do Vercel AI Gateway (moonshotai/kimi-k2.6). A saída será preservada como um AI Run atribuível."}
            </p>
            <p className="mini-label">{en ? "Authority boundary" : "Limite de autoridade"}</p>
            <p>{cycle.agreementAuthority ?? "Assist only; no human authority is delegated."}</p>

            <label>
              <span>{en ? "Sponsored budget pool" : "Fundo de orçamento patrocinado"}</span>
              <select name="sponsoredPoolId" required>
                <option value="">{en ? "Select a pool…" : "Selecione um fundo…"}</option>
                {sponsoredPools.map((pool) => (
                  <option key={pool.id} value={pool.id}>
                    {pool.name} · ${pool.settledUsd.toFixed(2)} / ${pool.hardLimitUsd.toFixed(2)}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span>{en ? "Sponsored reservation (USD)" : "Reserva patrocinada (USD)"}</span>
              <input name="reservationUsd" type="number" min="0.0000000001" step="0.0000000001" required />
            </label>
            <p>
              {en
                ? "This is an internal sponsored budget reservation. It is not proof of a provider-side hard-spend ceiling."
                : "Esta é uma reserva interna de orçamento patrocinado. Não é prova de um teto rígido de gasto no provedor."}
            </p>

            <button className="button button-primary" type="submit" disabled={sponsoredPools.length === 0}>
              {en ? "Authorize & Queue AI Work" : "Autorizar e Enfileirar Trabalho de IA"}
            </button>
          </form>
        ) : null}

        {cycle.state === "AI_COMPLETED" || cycle.state === "AI_FAILED" ? (
          <form className="project-form" action={recordResultAction}>
            <input type="hidden" name="cycleId" value={cycle.id} />
            <input type="hidden" name="commandId" value={randomUUID()} />
            <input type="hidden" name="idempotencyKey" value={`company-core-result-${randomUUID()}`} />

            <p className="mini-label">{en ? "Epistemic boundary" : "Limite epistêmico"}</p>
            <p>
              {en
                ? "AI output ≠ Result automatically. Record what YOU select as the deliverable."
                : "Saída de IA ≠ Resultado automaticamente. Registre o que VOCÊ seleciona como entregável."}
            </p>

            <label>
              <span>{en ? "Result content" : "Conteúdo do resultado"}</span>
              <textarea
                name="resultContent"
                rows={10}
                minLength={1}
                maxLength={8000}
                required
              />
            </label>

            <button className="button button-primary" type="submit">
              {en ? "Record Result" : "Registrar Resultado"}
            </button>
          </form>
        ) : null}

        {cycle.state === "RESULT_RECORDED" ? (
          <form className="project-form" action={recordEvaluationAction}>
            <input type="hidden" name="cycleId" value={cycle.id} />
            <input type="hidden" name="commandId" value={randomUUID()} />
            <input type="hidden" name="idempotencyKey" value={`company-core-eval-${randomUUID()}`} />

            <label>
              <span>{en ? "Verdict" : "Veredicto"}</span>
              <select name="verdict" required>
                <option value="">{en ? "Select…" : "Selecione…"}</option>
                <option value="USEFUL">{en ? "Useful" : "Útil"}</option>
                <option value="PARTIAL">{en ? "Partial" : "Parcial"}</option>
                <option value="NOT_USEFUL">{en ? "Not useful" : "Não útil"}</option>
                <option value="INCONCLUSIVE">{en ? "Inconclusive" : "Inconclusivo"}</option>
              </select>
            </label>
            <label>
              <span>{en ? "Rationale (optional)" : "Fundamento (opcional)"}</span>
              <textarea name="rationale" rows={4} maxLength={2000} />
            </label>

            <button className="button button-primary" type="submit">
              {en ? "Record Evaluation" : "Registrar Avaliação"}
            </button>
          </form>
        ) : null}

        {cycle.state === "EVALUATION_RECORDED" ? (
          <form className="project-form" action={recordConsequenceAction}>
            <input type="hidden" name="cycleId" value={cycle.id} />
            <input type="hidden" name="commandId" value={randomUUID()} />
            <input type="hidden" name="idempotencyKey" value={`company-core-consequence-${randomUUID()}`} />

            <label>
              <span>{en ? "Consequence type" : "Tipo de consequência"}</span>
              <select name="consequenceType" required>
                <option value="">{en ? "Select…" : "Selecione…"}</option>
                <option value="TIME_SAVED">{en ? "Time saved" : "Tempo economizado"}</option>
                <option value="DECISION_ENABLED">{en ? "Decision enabled" : "Decisão habilitada"}</option>
                <option value="TASK_COMPLETED">{en ? "Task completed" : "Tarefa concluída"}</option>
                <option value="AVOIDED_COST">{en ? "Avoided cost" : "Custo evitado"}</option>
                <option value="NEW_CAPABILITY">{en ? "New capability" : "Nova capacidade"}</option>
                <option value="OPPORTUNITY_CREATED">{en ? "Opportunity created" : "Oportunidade criada"}</option>
                <option value="MONEY_SPENT">{en ? "Money spent" : "Dinheiro gasto"}</option>
                <option value="MONEY_EARNED">{en ? "Money earned" : "Dinheiro ganho"}</option>
                <option value="OTHER">{en ? "Other" : "Outro"}</option>
              </select>
            </label>
            <label>
              <span>{en ? "Description" : "Descrição"}</span>
              <textarea name="description" rows={4} minLength={3} maxLength={4000} required />
            </label>
            <label>
              <span>{en ? "Founder time (minutes, optional)" : "Tempo do fundador (minutos, opcional)"}</span>
              <input name="founderTimeMinutes" type="number" min={0} />
            </label>
            <label>
              <span>{en ? "AI cost USD (optional)" : "Custo de IA em USD (opcional)"}</span>
              <input name="aiCostUsd" type="text" />
            </label>

            <button className="button button-primary" type="submit">
              {en ? "Record Consequence" : "Registrar Consequência"}
            </button>
          </form>
        ) : null}

        {cycle.state === "CONSEQUENCE_RECORDED" || cycle.state === "CLOSED" ? (
          <p>{en ? "This cycle is complete." : "Este ciclo está completo."}</p>
        ) : null}
      </section>
    </main>
  );
}

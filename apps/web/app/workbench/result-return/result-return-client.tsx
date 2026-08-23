"use client";

import { useState, type FormEvent } from "react";
import type { HumanAssuranceView } from "@/lib/domain/human-assurance";

interface ResultReturnClientProps {
  endpoint: string;
  packetId: string;
  capsuleDigest: string;
  expectedExecutorId: string;
  expectedExecutorLabel: string;
}

export function ResultReturnClient({
  endpoint,
  packetId,
  capsuleDigest,
  expectedExecutorId,
  expectedExecutorLabel,
}: ResultReturnClientProps) {
  const [payload, setPayload] = useState("");
  const [assurance, setAssurance] = useState<HumanAssuranceView | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setAssurance(null);

    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: payload,
      });
      const body = (await response.json()) as HumanAssuranceView | { error?: string };
      if (!response.ok) {
        setError("error" in body && body.error ? body.error : "Result Package rejeitado.");
        return;
      }
      setAssurance(body as HumanAssuranceView);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Falha ao validar retorno.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <section className="content-block">
        <p className="mini-label">RECEIVE · VALIDATE</p>
        <h2>Receber Result Package</h2>
        <dl>
          <div><dt>Task Capsule</dt><dd>{packetId}</dd></div>
          <div><dt>Digest esperado</dt><dd><code>{capsuleDigest}</code></dd></div>
          <div>
            <dt>Executor autorizado</dt>
            <dd>{expectedExecutorLabel} · <code>{expectedExecutorId}</code></dd>
          </div>
        </dl>

        <form className="project-form" onSubmit={submit}>
          <label>
            <span>Carregar arquivo JSON</span>
            <input
              type="file"
              accept="application/json,.json"
              onChange={async (event) => {
                const file = event.target.files?.[0];
                if (file) setPayload(await file.text());
              }}
            />
          </label>
          <label>
            <span>Ou colar cz.result-package.v1</span>
            <textarea
              rows={14}
              value={payload}
              onChange={(event) => setPayload(event.target.value)}
              placeholder='{"schema":"cz.result-package.v1", ...}'
              required
            />
          </label>
          <button className="button button-primary" type="submit" disabled={loading}>
            {loading ? "Validando..." : "Validar e projetar Assurance"}
          </button>
        </form>

        {error ? (
          <p className="form-message form-error" role="alert">
            REJECTED: {error}
          </p>
        ) : null}
      </section>

      {assurance ? (
        <section className="content-block">
          <p className="mini-label">HUMAN ASSURANCE · {assurance.schema}</p>
          <h2>Retorno validado sem promoção epistemológica</h2>

          <div className="side-block">
            <p className="mini-label">PROVENIÊNCIA</p>
            <p><strong>Executor:</strong> {assurance.executor.label} · {assurance.executor.id}</p>
            <p><strong>Status reportado:</strong> {assurance.reportedStatus}</p>
            <p>
              <strong>Origem:</strong> {assurance.taskCapsule.packetId} ·{" "}
              <code>{assurance.taskCapsule.digest}</code>
            </p>
          </div>

          <div className="side-block">
            <p className="mini-label">RELATO · REPORTED_BY_EXECUTOR</p>
            <p>{assurance.executionReport.text}</p>
          </div>

          <div className="side-block">
            <p className="mini-label">ARTIFACTS REPORTADOS</p>
            {assurance.reportedArtifacts.length ? (
              <ul>
                {assurance.reportedArtifacts.map((artifact, index) => (
                  <li key={`${artifact.uri}-${index}`}>
                    <code>{artifact.uri}</code>
                    {artifact.digest ? <> · <code>{artifact.digest}</code></> : null}
                    {artifact.description ? <> · {artifact.description}</> : null}
                  </li>
                ))}
              </ul>
            ) : <p>Nenhum artifact reportado.</p>}
          </div>

          <div className="side-block">
            <p className="mini-label">CHECKS REPORTADOS · NÃO SÃO VERIFICATION</p>
            {assurance.reportedChecks.length ? (
              <ul>
                {assurance.reportedChecks.map((check, index) => (
                  <li key={`${check.name}-${index}`}>
                    <strong>{check.status}</strong> · {check.name}
                    {check.details ? <> · {check.details}</> : null}
                  </li>
                ))}
              </ul>
            ) : <p>Nenhum check reportado.</p>}
          </div>

          <div className="side-block">
            <p className="mini-label">CLAIMS REPORTADOS · NÃO SÃO EVIDENCE</p>
            {assurance.reportedClaims.length ? (
              <ul>
                {assurance.reportedClaims.map((claim, index) => (
                  <li key={`${claim.statement}-${index}`}>
                    {claim.statement} <small>Escopo: {claim.scope}</small>
                  </li>
                ))}
              </ul>
            ) : <p>Nenhum claim reportado.</p>}
          </div>

          <div className="side-block">
            <p className="mini-label">LIMITAÇÕES DECLARADAS</p>
            {assurance.declaredLimitations.length ? (
              <ul>{assurance.declaredLimitations.map((item) => <li key={item}>{item}</li>)}</ul>
            ) : <p>Nenhuma limitação declarada pelo executor.</p>}
          </div>

          <div className="side-block">
            <p className="mini-label">MUDANÇAS INESPERADAS REPORTADAS</p>
            {assurance.reportedUnexpectedChanges.length ? (
              <ul>{assurance.reportedUnexpectedChanges.map((item) => <li key={item}>{item}</li>)}</ul>
            ) : <p>Nenhuma mudança inesperada reportada.</p>}
          </div>

          <div className="side-block">
            <p className="mini-label">NOT DONE</p>
            {assurance.reportedNotDone.length ? (
              <ul>{assurance.reportedNotDone.map((item) => <li key={item}>{item}</li>)}</ul>
            ) : <p>Nada adicional foi marcado como não realizado.</p>}
          </div>

          <div className="side-block">
            <p className="mini-label">SINAIS INDEPENDENTES</p>
            {assurance.independentSignals.length ? (
              <ul>
                {assurance.independentSignals.map((signal, index) => (
                  <li key={`${signal.source}-${signal.label}-${index}`}>
                    <strong>{signal.status}</strong> · {signal.source} · {signal.label} · {signal.details}
                  </li>
                ))}
              </ul>
            ) : (
              <p>
                Nenhum sinal independente está conectado neste slice. Checks reportados
                permanecem autorrelato do executor.
              </p>
            )}
          </div>

          <div className="side-block">
            <p className="mini-label">AINDA NÃO VERIFICADO</p>
            <ul>{assurance.notVerified.map((item) => <li key={item}>{item}</li>)}</ul>
          </div>

          <div className="side-block">
            <p className="mini-label">PRÓXIMA DECISÃO HUMANA</p>
            <p><strong>Sugestão reportada pelo executor:</strong> {assurance.nextHumanDecision.suggestion}</p>
            <p>Decisões legítimas disponíveis; nenhuma é executada automaticamente neste slice:</p>
            <ul>
              {assurance.nextHumanDecision.legitimateActions.map((action) => (
                <li key={action.id}>
                  <strong>{action.label}</strong> · {action.boundary}
                </li>
              ))}
            </ul>
          </div>
        </section>
      ) : null}
    </>
  );
}

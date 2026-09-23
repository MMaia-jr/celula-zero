"use client";

import { useRef, useState, type FormEvent } from "react";
import { recordGenesisMessage } from "@/app/genesis/actions";
import type { GenesisRecord } from "@/lib/genesis/context";

export function GenesisConsole({ records, gatewayReady }: { records: GenesisRecord[]; gatewayReady: boolean }) {
  const submissionLock = useRef(false);
  const [submitting, setSubmitting] = useState(false);

  function guardSubmission(event: FormEvent<HTMLFormElement>) {
    if (submissionLock.current) {
      event.preventDefault();
      return;
    }

    submissionLock.current = true;
    setSubmitting(true);
  }

  return (
    <section className="content-block">
      <p className="mini-label">Original Record</p>
      <h2>Conversa Genesis</h2>
      <form className="project-form" action={recordGenesisMessage} onSubmit={guardSubmission}>
        <label htmlFor="genesis-message">Mensagem</label>
        <textarea
          id="genesis-message"
          name="message"
          rows={5}
          maxLength={16000}
          required
          placeholder="Registre o que você quer preservar…"
          readOnly={submitting}
        />
        <button className="button button-primary" type="submit" disabled={submitting}>
          {submitting ? "Preservando…" : "Preservar como Original Record"}
        </button>
      </form>
      <p className="form-message form-neutral">
        {gatewayReady
          ? "Kimi está configurado, mas a interação permanece PREPARED / UNAVAILABLE: esta superfície não possui um worker persistente autorizado para despacho, custo e proveniência duráveis."
          : "Kimi está UNAVAILABLE: credencial ausente e, adicionalmente, esta superfície não possui um worker persistente autorizado para despacho, custo e proveniência duráveis."}
      </p>
      <small>Mensagem humana = Original Record. Saída de AI = interpretação candidata. Nenhuma delas vira Human Direction automaticamente.</small>
      <div className="divider" />
      <h3>Registros recentes</h3>
      {records.length ? (
        <ol>
          {records.map((record) => <li key={record.id}><strong>{record.recordClass}</strong> · {new Date(record.createdAt).toLocaleString("pt-BR")}<p>{record.content}</p></li>)}
        </ol>
      ) : <p>Nenhum registro privado recente disponível.</p>}
    </section>
  );
}

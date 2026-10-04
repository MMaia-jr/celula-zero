// SPDX-License-Identifier: MPL-2.0
"use client";
import { useEffect } from "react";
import Link from "next/link";

export default function ErrorBoundary({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => { console.error("CZ_HABITAT_RENDER_FAILED", error.digest ?? error.name); }, [error]);
  return (
    <main className="entry">
      <div className="entry-card recovery-card">
        <span className="brand-mark" aria-hidden="true"><span /></span>
        <p className="eyebrow">CÉLULA ZERO</p>
        <h1>Não conseguimos abrir seu espaço</h1>
        <p className="lead">Sua continuidade permanece guardada. Tente abrir novamente ou volte à entrada para recuperar a sessão.</p>
        <button className="primary" onClick={reset}>Tentar novamente <span>↻</span></button>
        <Link className="text-button recovery-link" href="/">Voltar à entrada</Link>
      </div>
    </main>
  );
}

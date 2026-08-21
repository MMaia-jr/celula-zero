import type { Metadata } from "next";

export const metadata: Metadata = { title: "Gate 1" };

export default function GateOnePage() {
  return (
    <div className="document-page section-shell">
      <header>
        <p className="kicker">Arquitetura executável</p>
        <h1>Gate 1: base habitável, local e verificável.</h1>
        <p>Este corte não é o MVP completo e não está publicado externamente.</p>
      </header>

      <section>
        <h2>O que existe</h2>
        <ul>
          <li>Next.js e TypeScript estrito em <code>apps/web</code>;</li>
          <li>catálogo público com três projetos semeados e rotulados;</li>
          <li>autenticação local por link e escrita limitada a convite;</li>
          <li>criação transacional de projeto, Registro Original e eventos;</li>
          <li>RLS deny-by-default e testes pgTAP adversariais;</li>
          <li>exportação JSON e Markdown em formato aberto.</li>
        </ul>
      </section>

      <section>
        <h2>Como reproduzir localmente</h2>
        <ol>
          <li>Use Node 24 e instale dependências com <code>npm ci</code>.</li>
          <li>Instale o Supabase CLI e tenha Docker ativo.</li>
          <li>Execute <code>supabase start</code> e <code>supabase db reset</code>.</li>
          <li>Copie <code>.env.example</code> para <code>.env.local</code> e preencha a chave local.</li>
          <li>Execute <code>npm run dev</code>.</li>
          <li>Entre como <code>pilot@celulazero.local</code> e abra o link no Inbucket local.</li>
        </ol>
      </section>

      <section className="document-warning">
        <h2>Limites ativos</h2>
        <p>
          Sem deploy, plano pago, projeto Supabase remoto, smart contract, testnet, wallet,
          captação, custódia ou movimentação financeira. A versão atual do Next.js é somente
          para desenvolvimento local até a atualização de segurança já agendada pelo projeto.
        </p>
      </section>
    </div>
  );
}

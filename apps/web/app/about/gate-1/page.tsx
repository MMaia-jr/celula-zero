import type { Metadata } from "next";
import { getLocale } from "@/lib/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  return {
    title: locale === "en" ? "How it works" : "Como funciona",
    description:
      locale === "en"
        ? "How Célula Zero coordinates projects, opportunities, proposals, contributions and evidence."
        : "Como a Célula Zero coordena projetos, oportunidades, propostas, contribuições e evidências.",
  };
}

export default async function GateOnePage() {
  const locale = await getLocale();
  const en = locale === "en";

  return (
    <div className="document-page section-shell">
      <header>
        <p className="kicker">{en ? "Public Alpha" : "Alpha pública"}</p>
        <h1>{en ? "How Célula Zero works." : "Como a Célula Zero funciona."}</h1>
        <p>
          {en
            ? "A live coordination environment where attributable actions create reconstructible history without turning activity into truth, authority or universal reputation."
            : "Um ambiente de coordenação em produção onde ações atribuíveis criam histórico reconstruível sem transformar atividade em verdade, autoridade ou reputação universal."}
        </p>
      </header>

      <section>
        <h2>{en ? "The operating path" : "O caminho operacional"}</h2>
        <p>
          <code>Project</code> → <code>Opportunity</code> → <code>Proposal</code> →{" "}
          <code>Commitment</code> → <code>Contribution</code> → <code>Evidence</code> →{" "}
          <code>Verification</code> → <code>Decision</code>
        </p>
        <p>
          {en
            ? "Not every coordination must traverse every object. The chain becomes deeper only when the real situation requires stronger evidence, verification or explicit decision."
            : "Nem toda coordenação precisa atravessar todos os objetos. A cadeia se aprofunda apenas quando a situação real exige evidência, verificação ou decisão explícita mais forte."}
        </p>
      </section>

      <section>
        <h2>{en ? "What exists now" : "O que existe agora"}</h2>
        <ul>
          <li>{en ? "a public Next.js application deployed on Vercel;" : "uma aplicação pública Next.js implantada na Vercel;"}</li>
          <li>{en ? "hosted Supabase authentication and database;" : "autenticação e banco Supabase hospedados;"}</li>
          <li>{en ? "email magic-link accounts with Profile + attributable PERSON Actor;" : "contas por magic link com Profile + Actor PERSON atribuível;"}</li>
          <li>{en ? "authenticated users can create and steward their own projects;" : "usuários autenticados podem criar e conduzir seus próprios projetos;"}</li>
          <li>{en ? "project stewards can open public opportunities and external people can submit Proposals;" : "stewards de projeto podem abrir oportunidades públicas e pessoas externas podem enviar Proposals;"}</li>
          <li>{en ? "append-only/versioned coordination records, contextual authority and reconstructible events;" : "registros de coordenação versionados/append-only, autoridade contextual e eventos reconstruíveis;"}</li>
          <li>{en ? "open JSON and Markdown exports;" : "exportações abertas em JSON e Markdown;"}</li>
          <li>{en ? "Portuguese and English interface on the external participation path." : "interface em português e inglês no caminho de participação externa."}</li>
        </ul>
      </section>

      <section>
        <h2>{en ? "Distinctions that remain explicit" : "Distinções que permanecem explícitas"}</h2>
        <ul>
          <li>Original Record ≠ Interpretation</li>
          <li>Proposal ≠ Commitment</li>
          <li>Activity ≠ Contribution ≠ Result</li>
          <li>Claim ≠ Evidence ≠ Verification ≠ Decision</li>
          <li>Identity ≠ Authentication ≠ Authority</li>
          <li>{en ? "Provenance ≠ truth" : "Proveniência ≠ verdade"}</li>
          <li>{en ? "Profile ≠ universal reputation" : "Profile ≠ reputação universal"}</li>
        </ul>
      </section>

      <section className="document-warning">
        <h2>{en ? "Active limits" : "Limites ativos"}</h2>
        <p>
          {en
            ? "Célula Zero does not custody or internally move funds, does not assign a universal reputation score, does not make a Proposal a Commitment automatically, and does not treat a translation as the Original Record. User-authored content remains in its source language unless an explicit derived presentation exists."
            : "A Célula Zero não custodia nem movimenta fundos internamente, não atribui score universal de reputação, não transforma Proposal em Commitment automaticamente e não trata tradução como Registro Original. Conteúdo autorado por usuários permanece no idioma de origem salvo quando existe uma apresentação derivada explícita."}
        </p>
      </section>
    </div>
  );
}

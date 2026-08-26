import type { Metadata } from "next";
import { NeedCard } from "@/components/need-card";
import { listPublicNeeds } from "@/lib/data/needs";
import { getLocale } from "@/lib/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  return { title: "Needs" };
}

export default async function NeedsPage() {
  const locale = await getLocale();
  const en = locale === "en";
  const needs = await listPublicNeeds();

  return (
    <div className="page-shell section-shell">
      <header className="page-header">
        <div>
          <p className="kicker">NEEDS</p>
          <h1>{en ? "What is missing, before it becomes an Opportunity." : "O que está faltando, antes de virar Opportunity."}</h1>
          <p>{en ? "A Need names a contextual lack, question or desired change. An Opportunity adds actionable conditions." : "Need nomeia uma falta, questão ou mudança desejada em contexto. Opportunity adiciona condições para agir."}</p>
        </div>
      </header>

      <section className="content-block">
        <p className="mini-label">SEMANTIC BOUNDARY</p>
        <strong>Need ≠ Opportunity</strong>
        <p>{en ? "Legacy project need labels remain project fields. They are not retroactively presented as first-class Need records." : "Rótulos legados de necessidade do projeto continuam sendo campos do projeto. Eles não são apresentados retroativamente como registros Need de primeira classe."}</p>
      </section>

      {needs.length ? (
        <div className="project-grid project-grid-page">
          {needs.map((need) => <NeedCard key={need.id} need={need} locale={locale} />)}
        </div>
      ) : (
        <section className="content-block">
          <p>{en ? "No public first-class Need is open yet." : "Nenhuma Need pública de primeira classe está aberta ainda."}</p>
        </section>
      )}
    </div>
  );
}

import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { htmlLang } from "@/lib/i18n/core";
import { getLocale } from "@/lib/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  return locale === "en"
    ? {
        title: {
          default: "Célula Zero — Coordination with evidence",
          template: "%s · Célula Zero",
        },
        description:
          "A coordination environment where projects, people, agents, proposals, contributions and evidence can meet.",
      }
    : {
        title: {
          default: "Célula Zero — Solo fértil",
          template: "%s · Célula Zero",
        },
        description:
          "Um ambiente de coordenação onde projetos, pessoas, agentes, propostas, contribuições e evidências podem se encontrar.",
      };
}

export default async function RootLayout({
  children,
}: Readonly<{ children: ReactNode }>) {
  const locale = await getLocale();

  return (
    <html lang={htmlLang(locale)}>
      <body>
        <a className="skip-link" href="#conteudo">
          {locale === "en" ? "Skip to content" : "Ir para o conteúdo"}
        </a>
        <SiteHeader locale={locale} />
        <main id="conteudo">{children}</main>
        <SiteFooter locale={locale} />
      </body>
    </html>
  );
}

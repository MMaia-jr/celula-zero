// SPDX-License-Identifier: MPL-2.0
import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = {
  title: "Célula Zero",
  description: "Seu contexto, suas relações e o que vem a seguir.",
};
export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}

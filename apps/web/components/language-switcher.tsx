"use client";

import type { Locale } from "@/lib/i18n/core";

export function LanguageSwitcher({ locale }: { locale: Locale }) {
  function selectLocale(nextLocale: Locale) {
    if (nextLocale === locale) return;
    document.cookie = `cz_locale=${nextLocale}; Path=/; Max-Age=31536000; SameSite=Lax`;
    window.location.reload();
  }

  return (
    <div
      className="language-switcher"
      role="group"
      aria-label={locale === "en" ? "Language" : "Idioma"}
    >
      <button
        type="button"
        className={locale === "pt" ? "language-active" : ""}
        aria-pressed={locale === "pt"}
        onClick={() => selectLocale("pt")}
      >
        PT
      </button>
      <span aria-hidden="true">/</span>
      <button
        type="button"
        className={locale === "en" ? "language-active" : ""}
        aria-pressed={locale === "en"}
        onClick={() => selectLocale("en")}
      >
        EN
      </button>
    </div>
  );
}

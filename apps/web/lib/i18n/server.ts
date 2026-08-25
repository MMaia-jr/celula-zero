import { cookies, headers } from "next/headers";
import { isLocale, type Locale } from "@/lib/i18n/core";

const LOCALE_COOKIE = "cz_locale";

export async function getLocale(): Promise<Locale> {
  const cookieStore = await cookies();
  const cookieLocale = cookieStore.get(LOCALE_COOKIE)?.value;
  if (isLocale(cookieLocale)) return cookieLocale;

  const requestHeaders = await headers();
  const acceptLanguage = requestHeaders.get("accept-language")?.toLowerCase() ?? "";
  if (acceptLanguage.startsWith("pt") || acceptLanguage.includes(",pt")) return "pt";

  return "en";
}

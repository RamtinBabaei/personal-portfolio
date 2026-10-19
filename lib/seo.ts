import type { Metadata } from "next";
import { isLocale } from "./domain";
export function localizedMetadata(
  locale: string,
  path: string,
  en: string,
  fa: string,
): Metadata {
  if (!isLocale(locale)) return {};
  return {
    title: locale === "en" ? en : fa,
    alternates: {
      canonical: `/${locale}${path}`,
      languages: { en: `/en${path}`, fa: `/fa${path}` },
    },
  };
}

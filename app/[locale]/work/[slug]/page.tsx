import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { isLocale } from "@/lib/domain";
import { publishedEntry } from "@/lib/server/entries";
import { EntryDetail } from "@/components/entry-detail";
export const dynamic = "force-dynamic";
type Props = { params: Promise<{ locale: string; slug: string }> };
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, slug } = await params;
  if (!isLocale(locale)) return {};
  const entry = await publishedEntry("project", slug);
  if (!entry) return {};
  return {
    title: entry[locale].title,
    description: entry[locale].summary,
    alternates: {
      canonical: `/${locale}/work/${slug}`,
      languages: { en: `/en/work/${slug}`, fa: `/fa/work/${slug}` },
    },
  };
}
export default async function Project({ params }: Props) {
  const { locale, slug } = await params;
  if (!isLocale(locale)) notFound();
  const entry = await publishedEntry("project", slug);
  if (!entry) notFound();
  return <EntryDetail entry={entry} locale={locale} />;
}

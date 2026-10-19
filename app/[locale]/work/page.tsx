import { localizedMetadata } from "@/lib/seo";
import { notFound } from "next/navigation";
import { isLocale, toWorkCards } from "@/lib/domain";
import { t } from "@/lib/copy";
import { publishedEntries } from "@/lib/server/entries";
import { Label } from "@/components/ui-elements";
import { WorkGrid } from "@/components/work-grid";
export const dynamic = "force-dynamic";
export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  return localizedMetadata(locale, "/work", "Selected work", "پروژه‌ها");
}
export default async function Work({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const text = t(locale);
  return (
    <main id="main" className="page-enter section inner-page work-page">
      <Label index="01">{text.workLabel}</Label>
      <h1 className="page-title">{text.workTitle}</h1>
      <p className="page-intro">
        {locale === "en"
          ? "A closer look at the interfaces, systems, and decisions behind my projects."
          : "نگاهی نزدیک‌تر به رابط‌ها، سیستم‌ها و تصمیم‌های فنی پشت پروژه‌هایم."}
      </p>
      <WorkGrid
        locale={locale}
        entries={toWorkCards(await publishedEntries("project"))}
        filters
      />
    </main>
  );
}

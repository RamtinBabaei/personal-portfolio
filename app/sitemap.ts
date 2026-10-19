import type { MetadataRoute } from "next";
import { locales } from "@/lib/domain";
import { runtime } from "@/lib/server/runtime";
import { publishedEntries } from "@/lib/server/entries";
export const dynamic = "force-dynamic";
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const origin =
    runtime().SITE_URL ??
    "https://ramtin-babaei-portfolio.shaficp.chatgpt.site";
  const entries = await publishedEntries("project");
  return locales.flatMap((locale) => [
    ...["", "/work", "/about", "/contact"].map((path) => ({
      url: `${origin}/${locale}${path}`,
      alternates: {
        languages: { en: `${origin}/en${path}`, fa: `${origin}/fa${path}` },
      },
    })),
    ...entries.map((e) => ({
      url: `${origin}/${locale}/work/${e.slug}`,
      lastModified: new Date(e.updatedAt),
    })),
  ]);
}

import type { MetadataRoute } from "next";
import { runtime } from "@/lib/server/runtime";
export const dynamic = "force-dynamic";
export default function robots(): MetadataRoute.Robots {
  const env = runtime();
  return {
    rules:
      env.OWNER_PRIVATE_MODE === "true"
        ? { userAgent: "*", disallow: "/" }
        : {
            userAgent: "*",
            allow: "/",
            disallow: ["/api/", "/en/studio/", "/fa/studio/"],
          },
    sitemap: `${env.SITE_URL ?? "https://ramtin-babaei-portfolio.shaficp.chatgpt.site"}/sitemap.xml`,
  };
}

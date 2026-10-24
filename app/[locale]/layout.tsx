import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { isLocale } from "@/lib/domain";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { PageTransition } from "@/components/page-transition";
import { MotionSystem } from "@/components/motion";
import "../globals.css";
const baseMetadata: Metadata = {
  metadataBase: new URL(
    "https://personal-portfolio.ramtinbabaei-portfolio.workers.dev",
  ),
  title: {
    default: "Ramtin Babaei — Software Engineer",
    template: "%s — Ramtin Babaei",
  },
  description:
    "Full-stack web development, thoughtful interfaces, and reliable systems. Explore Ramtin Babaei's work and approach.",
  openGraph: {
    type: "website",
    siteName: "Ramtin Babaei",
    images: [
      {
        url: "/images/hero-1600.webp",
        width: 1600,
        height: 900,
        alt: "Ramtin Babaei — Software Engineer",
      },
    ],
  },
  twitter: { card: "summary_large_image" },
  icons: { icon: "/favicon.svg" },
};
export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  return {
    ...baseMetadata,
    ...(locale === "fa"
      ? {
          title: {
            default: "رامتین بابایی — مهندس نرم‌افزار",
            template: "%s — رامتین بابایی",
          },
          description:
            "وب‌سایت شخصی رامتین بابایی؛ توسعه فول‌استک وب، رابط کاربری، سیستم‌های بک‌اند، پروژه‌ها و شیوه کار.",
        }
      : {}),
  };
}
const themeScript =
  "try{var t=localStorage.getItem('theme');document.documentElement.dataset.theme=t==='dark'||t==='light'?t:matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light'}catch(e){}";
export default async function Layout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  return (
    <html
      lang={locale}
      dir={locale === "fa" ? "rtl" : "ltr"}
      suppressHydrationWarning
    >
      <head>
        <link
          rel="preload"
          as="font"
          type="font/woff2"
          crossOrigin="anonymous"
          href={
            locale === "fa"
              ? "/api/fonts/vazirmatn-arabic.woff2"
              : "/api/fonts/manrope-latin.woff2"
          }
        />
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "Person",
              name: "Ramtin Babaei",
              jobTitle: "Software Engineer",
              url: "https://personal-portfolio.ramtinbabaei-portfolio.workers.dev",
              sameAs: [
                "https://github.com/RamtinBabaei",
                "https://www.linkedin.com/in/ramtin-babaei",
              ],
            }),
          }}
        />
      </head>
      <body>
        <Header locale={locale} />
        <PageTransition locale={locale} />
        {children}
        <Footer locale={locale} />
        <MotionSystem />
      </body>
    </html>
  );
}

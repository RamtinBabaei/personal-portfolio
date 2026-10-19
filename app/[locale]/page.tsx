import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { isLocale, toWorkCards } from "@/lib/domain";
import { profile, t } from "@/lib/copy";
import { publishedEntries } from "@/lib/server/entries";
import { Photo, Label, Arrow } from "@/components/ui-elements";
import { Services } from "@/components/services";
import { MagneticButton } from "@/components/magnetic-button";
import { HeroRoles } from "@/components/hero-roles";
import { Toolkit } from "@/components/toolkit";
import { WorkGrid } from "@/components/work-grid";
export const dynamic = "force-dynamic";
export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  return {
    alternates: {
      canonical: `/${locale}`,
      languages: { en: "/en", fa: "/fa" },
    },
  };
}
export default async function Home({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const text = t(locale);
  const projects = await publishedEntries("project");
  return (
    <main id="main" className="page-enter home-page">
      <section className="hero" aria-labelledby="hero-title">
        <Photo
          name="hero"
          className="hero-image"
          priority
          alt={
            locale === "en"
              ? "Ramtin Babaei in a charcoal overshirt against a minimal studio background"
              : "رامتین بابایی با پیراهن زغالی در استودیو"
          }
          sizes="100vw"
        />
        <div className="hero-index" aria-hidden="true">
          <span>RB / PORTFOLIO</span>
          <span>01 — ENGINEERING & INTERACTION</span>
        </div>
        <div className="hero-content">
          <p className="eyebrow hero-eyebrow">
            <span className="status-dot" />
            {text.eyebrow}
          </p>
          <h1 id="hero-title">
            <span className="hero-line">
              <span className="hero-word">{text.heroTop}</span>
            </span>
            <span className="hero-line">
              <span className="hero-word">{text.heroBottom}</span>
            </span>
          </h1>
          <p className="hero-description">{text.intro}</p>
          <MagneticButton
            href={"/" + locale + "/work"}
            shape="pill"
            className="hero-cta"
          >
            {text.explore}
            <Arrow diagonal />
          </MagneticButton>
        </div>
        <div className="hero-bottom">
          <a href="#introduction" className="eyebrow">
            ↓ {text.scroll}
          </a>
          <p className="eyebrow">
            {locale === "en"
              ? "CODE / DESIGN / INTERACTION"
              : "کد / طراحی / تعامل"}
          </p>
        </div>
        <span className="hero-signature" aria-hidden="true">
          RB.
        </span>
      </section>
      <HeroRoles locale={locale} />
      <section className="section introduction" id="introduction">
        <Label index="01">{text.aboutLabel}</Label>
        <div className="intro-grid">
          <h2 className="large-copy reveal">{text.aboutTitle}</h2>
          <div className="intro-description" data-interactive-reveal>
            <p>{text.aboutText}</p>
            <MagneticButton href={"/" + locale + "/about"}>
              {text.aboutLink}
              <Arrow diagonal />
            </MagneticButton>
          </div>
        </div>
        <div
          className="intro-image reveal"
          data-cursor={locale === "en" ? "HELLO" : "سلام"}
        >
          <Photo
            name="workspace"
            alt={
              locale === "en"
                ? "Ramtin working at a laptop in a daylight studio"
                : "رامتین در حال کار با لپ‌تاپ در استودیو"
            }
            sizes="(max-width: 760px) calc(100vw - 48px), 87vw"
          />
          <div className="image-caption">
            <span className="eyebrow">{text.index}</span>
            <span aria-hidden="true">↗</span>
          </div>
        </div>
      </section>
      <section className="section work-section">
        <div className="section-heading">
          <div>
            <Label index="02">{text.workLabel}</Label>
            <h2 className="section-title reveal">{text.workTitle}</h2>
          </div>
          <MagneticButton href={"/" + locale + "/work"} shape="pill">
            {text.allWork}
            <Arrow diagonal />
          </MagneticButton>
        </div>
        <WorkGrid
          locale={locale}
          entries={toWorkCards(
            projects.filter((p) => p.featured).length
              ? projects.filter((p) => p.featured).slice(0, 4)
              : projects.slice(0, 4),
          )}
        />
      </section>
      <Services locale={locale} />
      <div className="capability-surface" data-surface-wash>
        <section className="section toolkit-section">
          <div>
            <Label index="04">{text.toolkit}</Label>
            <h2 className="section-title reveal">{text.toolkitTitle}</h2>
            <MagneticButton href={profile.github} shape="pill" external>
              {locale === "en" ? "Explore GitHub" : "مشاهده گیت‌هاب"}
              <Arrow diagonal />
            </MagneticButton>
          </div>
          <Toolkit locale={locale} />
        </section>
        <section className="section process-section">
          <Label index="05">{text.processLabel}</Label>
          <h2 className="section-title reveal">{text.processTitle}</h2>
          <div className="process-grid">
            {text.processNames.map((name, i) => (
              <div key={name} className="process-step reveal">
                <span className="process-number">0{i + 1}</span>
                <h3>{name}</h3>
                <p>{text.processText[i]}</p>
              </div>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}

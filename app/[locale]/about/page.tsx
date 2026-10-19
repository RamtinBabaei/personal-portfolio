import { localizedMetadata } from "@/lib/seo";
import { notFound } from "next/navigation";
import { isLocale } from "@/lib/domain";
import { t } from "@/lib/copy";
import { Services } from "@/components/services";
import { Photo, Label } from "@/components/ui-elements";
export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  return localizedMetadata(locale, "/about", "About", "درباره من");
}
export default async function About({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const text = t(locale);
  return (
    <main id="main" className="page-enter about-page">
      <section className="section inner-page about-heading">
        <Label index="01">{text.aboutLabel}</Label>
        <h1 className="page-title">{text.aboutTitle}</h1>
        <div className="about-grid">
          <Photo
            name="street"
            alt={
              locale === "en"
                ? "Editorial portrait of Ramtin wearing sunglasses on a Toronto street"
                : "پرتره رامتین با عینک آفتابی در خیابانی در تورنتو"
            }
            priority
            sizes="(max-width: 700px) 100vw, 50vw"
          />
          <div className="about-story">
            <span className="asterisk" data-turn aria-hidden="true">
              ✳
            </span>
            <p className="large-body">{text.aboutText}</p>
            <p>{text.aboutSecond}</p>
            <p>
              {locale === "en"
                ? "This is where I share my projects, approach, and the ideas behind my work."
                : "اینجا پروژه‌ها، روش کار و تجربه‌هایی را به اشتراک می‌گذارم که در مسیر ساختن یاد می‌گیرم."}
            </p>
          </div>
        </div>
      </section>
      <div className="about-surface" data-surface-wash>
        <Services locale={locale} index="02" />
        <section className="section values-section">
          <Label index="03">{text.values}</Label>
          <div className="values-grid">
            {text.valueNames.map((name, i) => (
              <article className="reveal" key={name}>
                <span className="eyebrow">0{i + 1}</span>
                <h2>{name}</h2>
                <p>{text.valueText[i]}</p>
              </article>
            ))}
          </div>
        </section>
      </div>
      <section className="section journey-section">
        <div>
          <Label index="04">{text.journey}</Label>
          <h2 className="section-title">{text.journeyTitle}</h2>
        </div>
        <div className="journey-list">
          {[text.experience, text.education].map((label) => (
            <div key={label}>
              <h3>{label}</h3>
              <p>{text.pending}</p>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}

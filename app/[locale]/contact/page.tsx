import { localizedMetadata } from "@/lib/seo";
import { notFound } from "next/navigation";
import { isLocale } from "@/lib/domain";
import { profile, t } from "@/lib/copy";
import { Label, Photo, Arrow } from "@/components/ui-elements";
import { ContactForm } from "@/components/contact-form";
export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  return localizedMetadata(locale, "/contact", "Contact", "تماس");
}
export default async function Contact({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const text = t(locale);
  return (
    <main id="main" className="page-enter section inner-page contact-page">
      <div className="contact-layout">
        <header className="contact-heading-copy">
          <Label index="01">{text.nav[3]}</Label>
          <h1 className="contact-title">
            {text.contactTitle.split("\n").map((line) => (
              <span className="contact-title-line" key={line}>
                <span>{line}</span>
              </span>
            ))}
          </h1>
          <p className="contact-lead">{text.contactText}</p>
        </header>
        <aside className="contact-aside" aria-label={text.contactDetails}>
          <div className="contact-portrait">
            <Photo
              name="about"
              priority
              alt={
                locale === "en"
                  ? "Portrait of Ramtin Babaei"
                  : "پرتره رامتین بابایی"
              }
              sizes="(max-width: 760px) 92px, 150px"
            />
            <span className="contact-direction" aria-hidden="true">
              ↘
            </span>
          </div>
          <div>
            <h2 className="eyebrow">{text.contactDetails}</h2>
            <a
              className="contact-email"
              dir="ltr"
              href={"mailto:" + profile.email}
            >
              {profile.email}
            </a>
          </div>
          <div>
            <h2 className="eyebrow">{text.contactSocials}</h2>
            <a href={profile.github} target="_blank" rel="noopener noreferrer">
              GitHub
              <Arrow diagonal />
            </a>
            <a
              href={profile.linkedin}
              target="_blank"
              rel="noopener noreferrer"
            >
              LinkedIn
              <Arrow diagonal />
            </a>
          </div>
          <div className="contact-aside-guide">
            <h2 className="eyebrow">{text.contactStart}</h2>
            <p>{text.contactGuide}</p>
          </div>
        </aside>
        <ContactForm locale={locale} />
      </div>
    </main>
  );
}

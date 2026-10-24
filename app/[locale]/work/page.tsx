import { localizedMetadata } from "@/lib/seo";
import { notFound } from "next/navigation";
import { isLocale, toWorkCards } from "@/lib/domain";
import { t } from "@/lib/copy";
import { publishedEntries } from "@/lib/server/entries";
import { Label } from "@/components/ui-elements";
import { WorkGrid } from "@/components/work-grid";
export const dynamic = "force-dynamic";
const workStyles = `
.work-page{padding-top:0;overflow:clip}
body:has(.work-page) .site-header{color:#f7f7f4}
body:has(.work-page) .site-header .brand-role{color:#aeb2ba}
body:has(.work-page) .site-header .icon-button:hover{background:#ffffff1a}
.work-hero{width:calc(100% + (var(--pad)*2));margin-inline:calc(var(--pad)*-1);padding:clamp(180px,21vw,330px) var(--pad) clamp(95px,11vw,170px);color:#f7f7f4;background:#17181b;border-radius:0 0 50% 9%}
.work-hero-inner{max-width:1080px;margin-inline:auto}
.work-hero .section-label{color:#aeb2ba;margin-bottom:38px}
.work-hero .page-title{max-width:900px;font-size:clamp(54px,8.4vw,128px);letter-spacing:-.075em;line-height:.98}
.work-hero .page-intro{max-width:590px;margin-top:42px;color:#b8bbc2;font-size:clamp(15px,1.3vw,19px);line-height:1.8}
.work-content{max-width:1120px;margin:0 auto;padding:clamp(70px,9vw,130px) 0 clamp(100px,12vw,180px)}
.work-content .work-toolbar{margin:0 0 70px;align-items:end}
.work-content .filters button{min-height:52px;padding-inline:22px;background:transparent}
.work-content .filters button[aria-pressed=true]{background:var(--ink)}
.work-content .work-column-labels{grid-template-columns:34px minmax(0,1.45fr) minmax(170px,.8fr) 78px 28px;padding-bottom:22px;font-size:9px;letter-spacing:.12em}
.work-content .project-list .project-card{grid-template-columns:34px minmax(0,1.45fr) minmax(170px,.8fr) 78px 28px;min-height:142px;padding:34px 0;gap:22px}
.work-content .project-list .project-caption h2{font-size:clamp(30px,4vw,62px);letter-spacing:-.07em}
.work-content .project-list .project-caption p{max-width:480px;margin-top:9px;font-size:12px;line-height:1.7}
.work-content .project-list .project-category{align-self:center}
.work-content .project-list .project-cover{width:clamp(280px,34vw,470px);aspect-ratio:1.32;background:#dfe3ea;border:1px solid #c9cdd4}
.work-content .typographic-cover{min-height:0;background:linear-gradient(135deg,#dfe4eb 0%,#b9c2d0 100%)}
.work-content .project-card:hover .typographic-cover{background:linear-gradient(135deg,#d4dcff 0%,#92a5ff 100%)}
.work-content .project-view-badge{background:var(--ink)}
html[dir=rtl] .work-hero{border-radius:0 0 9% 50%}
html[dir=rtl] .work-hero .page-title{letter-spacing:-.025em}
@media(max-width:760px){.work-hero{padding-top:155px;padding-bottom:74px;border-radius:0 0 42% 5%}.work-hero .page-title{font-size:clamp(48px,14vw,76px)}.work-hero .page-intro{margin-top:28px;font-size:14px}.work-content{padding-top:58px}.work-content .work-toolbar{margin-bottom:42px}.work-content .project-list .project-card{min-height:0}}
`;
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
  const featuredSlugs = new Set([
    "prescripto-platform",
    "noteflow",
    "shopsphere",
  ]);
  const entries = (await publishedEntries("project")).filter((entry) =>
    featuredSlugs.has(entry.slug),
  );
  return (
    <main id="main" className="page-enter section inner-page work-page">
      <style dangerouslySetInnerHTML={{ __html: workStyles }} />
      <section className="work-hero" aria-labelledby="work-title">
        <div className="work-hero-inner">
          <Label index="01">{text.workLabel}</Label>
          <h1 id="work-title" className="page-title">
            {locale === "en"
              ? "Creating digital products with care."
              : "ساخت محصولات دیجیتال با دقت و هدف."}
          </h1>
          <p className="page-intro">
            {locale === "en"
              ? "Three selected projects that show how I turn interfaces, APIs, and product decisions into useful experiences."
              : "سه پروژه‌ی منتخب که نشان می‌دهند چطور رابط کاربری، API و تصمیم‌های محصول را به تجربه‌هایی کاربردی تبدیل می‌کنم."}
          </p>
        </div>
      </section>
      <section className="work-content" aria-label={text.workLabel}>
        <WorkGrid locale={locale} entries={toWorkCards(entries)} filters />
      </section>
    </main>
  );
}

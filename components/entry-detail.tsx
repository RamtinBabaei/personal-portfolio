import Link from "next/link";
import type { Entry, Locale } from "@/lib/domain";
import { t } from "@/lib/copy";
import { Arrow, Label } from "./ui-elements";
export function EntryDetail({
  entry,
  locale,
}: {
  entry: Entry;
  locale: Locale;
}) {
  const text = t(locale);
  const content = entry[locale];
  return (
    <main id="main" className="page-enter">
      <article className="section inner-page">
        <Label>{text.workLabel}</Label>
        <h1 className="page-title">{content.title || entry.slug}</h1>
        <p className="page-intro">{content.summary}</p>
        {
          <div className="detail-meta">
            <div>
              <p className="eyebrow">{text.role}</p>
              <p>{content.role || "—"}</p>
            </div>
            <div>
              <p className="eyebrow">{text.stack}</p>
              <p dir="ltr">{entry.technologies.join(" / ") || "—"}</p>
            </div>
            <div>
              <p className="eyebrow">{text.year}</p>
              <p>{entry.year}</p>
            </div>
          </div>
        }
        <div className="detail-links">
          {entry.liveUrl && (
            <a
              className="pill-button"
              href={entry.liveUrl}
              target="_blank"
              rel="noopener noreferrer"
            >
              <span>
                {text.live}
                <Arrow diagonal />
              </span>
            </a>
          )}
          {entry.githubUrl && (
            <a
              className="pill-button"
              href={entry.githubUrl}
              target="_blank"
              rel="noopener noreferrer"
            >
              <span>
                {text.source}
                <Arrow diagonal />
              </span>
            </a>
          )}
        </div>
        {entry.cover && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            className="detail-cover"
            src={entry.cover}
            alt={content.alt}
            width="1200"
            height="900"
            fetchPriority="high"
          />
        )}
        <div className="detail-body">
          {content.body
            .split(/\n\s*\n/)
            .filter(Boolean)
            .map((paragraph, i) => (
              <p key={i}>{paragraph}</p>
            ))}
          {[
            [text.challenge, content.challenge],
            [text.solution, content.solution],
            [text.outcome, content.outcome],
          ].map(
            ([label, value]) =>
              value && (
                <section key={label}>
                  <h2>{label}</h2>
                  <p>{value}</p>
                </section>
              ),
          )}
        </div>
        {entry.gallery.length > 0 && (
          <div className="detail-gallery">
            {entry.gallery.map((url, i) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={url}
                src={url}
                alt={`${content.alt} — ${i + 1}`}
                width="1200"
                height="900"
                loading="lazy"
              />
            ))}
          </div>
        )}
        <Link className="text-link detail-back" href={`/${locale}/work`}>
          {text.backWork}
          <Arrow />
        </Link>
      </article>
    </main>
  );
}

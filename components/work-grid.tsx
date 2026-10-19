"use client";
import Link from "next/link";
import { useState, type CSSProperties } from "react";
import { categories, type WorkCard, type Locale } from "@/lib/domain";
import { profile, t } from "@/lib/copy";
import { Arrow } from "./ui-elements";

export function WorkGrid({
  entries,
  locale,
  filters = false,
}: {
  entries: WorkCard[];
  locale: Locale;
  filters?: boolean;
}) {
  const text = t(locale);
  const [category, setCategory] = useState("all");
  const [view, setView] = useState<"list" | "gallery">("list");
  const visible = entries.filter(
    (entry) => category === "all" || entry.category === category,
  );
  const mode = filters ? view : "gallery";
  return (
    <>
      {filters && (
        <div className="work-toolbar">
          <div
            className="filters"
            aria-label={locale === "en" ? "Filter projects" : "فیلتر پروژه‌ها"}
          >
            {["all", ...categories].map((value, index) => (
              <button
                key={value}
                onClick={() => setCategory(value)}
                aria-pressed={category === value}
              >
                {text.filters[index]}
                <sup>
                  {value === "all"
                    ? entries.length
                    : entries.filter((entry) => entry.category === value)
                        .length}
                </sup>
              </button>
            ))}
          </div>
          <div
            className="work-view"
            aria-label={
              locale === "en" ? "Project presentation" : "نمایش پروژه‌ها"
            }
          >
            <button
              onClick={() => setView("list")}
              aria-pressed={view === "list"}
              aria-label={locale === "en" ? "List view" : "نمای فهرست"}
            >
              <span aria-hidden="true">☰</span>
            </button>
            <button
              onClick={() => setView("gallery")}
              aria-pressed={view === "gallery"}
              aria-label={locale === "en" ? "Gallery view" : "نمای گالری"}
            >
              <span aria-hidden="true">▦</span>
            </button>
          </div>
        </div>
      )}
      <div className="work-results" aria-live="polite" aria-atomic="false">
        {visible.length ? (
          <div
            key={category + mode}
            className={"project-collection project-" + mode}
          >
            {mode === "list" && (
              <div className="work-column-labels eyebrow" aria-hidden="true">
                <span>№</span>
                <span>{locale === "en" ? "PROJECT" : "پروژه"}</span>
                <span>
                  {locale === "en" ? "FOCUS / STACK" : "حوزه / فناوری"}
                </span>
                <span>{text.year}</span>
              </div>
            )}
            {visible.map((entry, index) => (
              <Link
                className="project-card"
                href={"/" + locale + "/work/" + entry.slug}
                key={entry.id}
                style={{ "--card-index": index } as CSSProperties}
                data-cursor={locale === "en" ? "VIEW" : "مشاهده"}
              >
                <span className="project-index" aria-hidden="true">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <div className="project-cover">
                  {entry.cover ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={entry.cover}
                      alt={entry[locale].alt}
                      width="1200"
                      height="900"
                      loading="lazy"
                    />
                  ) : (
                    <div className="typographic-cover">
                      <span>RB / 0{index + 1}</span>
                      <b>{entry[locale].title}</b>
                      <span>{entry.year}</span>
                    </div>
                  )}
                  <span className="project-view-badge">
                    {text.view}
                    <Arrow diagonal />
                  </span>
                </div>
                <div className="project-caption">
                  <h2>{entry[locale].title}</h2>
                  <p>{entry[locale].summary}</p>
                </div>
                <div className="project-category">
                  <span>
                    {text.filters[categories.indexOf(entry.category) + 1]}
                  </span>
                  <small dir="ltr">{entry.technologies.join(" / ")}</small>
                </div>
                <span className="project-year">{entry.year}</span>
                <Arrow diagonal className="project-arrow" />
              </Link>
            ))}
          </div>
        ) : (
          <div className="work-empty">
            <div className="empty-orbit" aria-hidden="true">
              <span>↗</span>
              <i />
            </div>
            <div>
              <span className="eyebrow">
                {locale === "en"
                  ? "ROOM FOR WHAT COMES NEXT"
                  : "فضایی برای فصل بعد"}
              </span>
              <h2>{entries.length ? text.emptyFilter : text.emptyTitle}</h2>
              <p>{text.emptyText}</p>
              <a
                className="text-link"
                href={profile.github}
                target="_blank"
                rel="noopener noreferrer"
              >
                {text.github}
                <Arrow diagonal />
              </a>
            </div>
            <span className="empty-count" aria-hidden="true">
              00
            </span>
          </div>
        )}
      </div>
    </>
  );
}

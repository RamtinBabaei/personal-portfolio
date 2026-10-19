import { t } from "@/lib/copy";
import type { Locale } from "@/lib/domain";
import { Label } from "./ui-elements";
export function Services({
  locale,
  index = "03",
}: {
  locale: Locale;
  index?: string;
}) {
  const text = t(locale);
  return (
    <section className="section services-section">
      <div className="service-heading">
        <div>
          <Label index={index}>{text.servicesLabel}</Label>
          <h2 className="section-title narrow reveal">{text.servicesTitle}</h2>
        </div>
        <span className="service-symbol" data-turn aria-hidden="true">
          ✳
        </span>
      </div>
      <div className="service-list">
        {text.serviceNames.map((name, i) => (
          <details className="service-row reveal" key={name} open={i === 0}>
            <summary>
              <span className="eyebrow">0{i + 1}</span>
              <h3>{name}</h3>
              <span className="service-plus" aria-hidden="true">
                +
              </span>
            </summary>
            <div className="service-detail">
              <p>{text.serviceText[i]}</p>
              <div className="small-tags">
                {text.serviceTags[i].map((tag) => (
                  <span key={tag}>{tag}</span>
                ))}
              </div>
            </div>
          </details>
        ))}
      </div>
    </section>
  );
}

import { MagneticButton } from "./magnetic-button";
import { profile, t } from "@/lib/copy";
import type { Locale } from "@/lib/domain";
import { Arrow, Photo } from "./ui-elements";
import { FooterClock } from "./footer-clock";

export function Footer({ locale }: { locale: Locale }) {
  const text = t(locale);
  return (
    <footer className="site-footer" aria-labelledby="footer-title">
      <div className="footer-edge" aria-hidden="true" />
      <div className="footer-inner">
        <div className="footer-overline">
          <span className="eyebrow">
            {locale === "en"
              ? "NEXT / A GOOD CONVERSATION"
              : "قدم بعد / یک گفت‌وگوی خوب"}
          </span>
          <span className="footer-spark" aria-hidden="true">
            ↘
          </span>
        </div>
        <div className="footer-invite">
          <Photo
            name="portrait"
            alt={
              locale === "en"
                ? "Portrait of Ramtin Babaei"
                : "پرتره رامتین بابایی"
            }
            sizes="(max-width: 760px) 64px, 100px"
          />
          <h2 id="footer-title">{text.footerTitle}</h2>
        </div>
        <div className="footer-action-line">
          <MagneticButton
            href={"/" + locale + "/contact"}
            className="footer-magnetic"
          >
            {text.contactAction}
            <Arrow diagonal />
          </MagneticButton>
        </div>
        <div className="footer-contact">
          <MagneticButton href={"/" + locale + "/contact"} shape="pill">
            {locale === "en" ? "Email me" : "ارسال ایمیل"}
            <Arrow diagonal />
          </MagneticButton>
          <MagneticButton href={"/" + locale + "/work"} shape="pill">
            {text.allWork}
            <Arrow diagonal />
          </MagneticButton>
        </div>
        <div className="footer-bottom">
          <div>
            <p className="eyebrow">
              {locale === "en" ? "CRAFTED BY" : "طراحی و توسعه"}
            </p>
            <span>
              © {new Date().getFullYear()} {text.name}
            </span>
          </div>
          <div>
            <p className="eyebrow">
              {locale === "en" ? "YOUR LOCAL TIME" : "زمان محلی شما"}
            </p>
            <FooterClock locale={locale} />
          </div>
          <div className="footer-social">
            <p className="eyebrow">
              {locale === "en" ? "ELSEWHERE" : "لینک‌های حرفه‌ای"}
            </p>
            <div>
              <a
                href={profile.github}
                target="_blank"
                rel="noopener noreferrer"
              >
                GitHub ↗
              </a>
              <a
                href={profile.linkedin}
                target="_blank"
                rel="noopener noreferrer"
              >
                LinkedIn ↗
              </a>
              <a href="#top">{text.backTop} ↑</a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}

"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { localizedPath, type Locale } from "@/lib/domain";
import { navigationItems } from "@/lib/navigation";
import { profile, t } from "@/lib/copy";
import { Arrow, Mark } from "./ui-elements";

export function Header({ locale }: { locale: Locale }) {
  const text = t(locale);
  const pathname = usePathname();
  const dialog = useRef<HTMLDialogElement>(null);
  const sentinel = useRef<HTMLSpanElement>(null);
  const closeAnimation = useRef<Animation | null>(null);
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const routes = navigationItems(locale);
  const active = (href: string) =>
    href === "/" + locale
      ? pathname === href
      : pathname === href || pathname.startsWith(href + "/");

  useEffect(() => {
    const element = sentinel.current;
    if (!element) return;
    const observer = new IntersectionObserver(([entry]) =>
      setScrolled(!entry.isIntersecting),
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [open]);
  useEffect(() => () => closeAnimation.current?.cancel(), []);

  function toggleTheme() {
    const theme =
      document.documentElement.dataset.theme === "dark" ? "light" : "dark";
    document.documentElement.dataset.theme = theme;
    try {
      localStorage.setItem("theme", theme);
    } catch {}
  }
  function openMenu() {
    if (!dialog.current || dialog.current.open) return;
    closeAnimation.current?.cancel();
    dialog.current.showModal();
    setOpen(true);
  }
  async function closeMenu() {
    const element = dialog.current;
    if (!element?.open || closeAnimation.current) return;
    if (
      !window.matchMedia("(prefers-reduced-motion: reduce)").matches &&
      element.animate
    ) {
      const animation = element.animate(
        [
          { transform: "translateX(0)", opacity: 1 },
          {
            transform:
              locale === "fa" ? "translateX(-100%)" : "translateX(100%)",
            opacity: 0.6,
          },
        ],
        { duration: 260, easing: "cubic-bezier(0.76,0,0.24,1)" },
      );
      closeAnimation.current = animation;
      try {
        await animation.finished;
      } catch {}
    }
    element.close();
    setOpen(false);
    closeAnimation.current = null;
  }
  return (
    <>
      <a className="skip-link" href="#main">
        {text.skip}
      </a>
      <span className="top-anchor" id="top" aria-hidden="true" />
      <span className="header-sentinel" ref={sentinel} aria-hidden="true" />
      <header className={"site-header" + (scrolled ? " is-scrolled" : "")}>
        <Link
          href={"/" + locale}
          className="brand"
          aria-label={text.name + " — " + text.title}
        >
          <span className="brand-mark">
            <Mark />
          </span>
          <span className="brand-copy">
            <span>{text.name}</span>
            <span className="brand-role">{text.title}</span>
          </span>
        </Link>
        <nav
          className="desktop-nav"
          aria-label={locale === "fa" ? "منوی اصلی" : "Main navigation"}
        >
          {routes.map(({ href, label }) => (
            <Link
              href={href}
              key={href}
              data-magnetic
              className={active(href) ? "active" : ""}
              aria-current={active(href) ? "page" : undefined}
            >
              <span className="nav-label">
                <span>{label}</span>
                <span aria-hidden="true">{label}</span>
              </span>
              <span className="nav-dot" />
            </Link>
          ))}
        </nav>
        <div className="header-tools">
          <Link
            className="language-toggle"
            href={localizedPath(pathname, locale === "en" ? "fa" : "en")}
            lang={locale === "en" ? "fa" : "en"}
            hrefLang={locale === "en" ? "fa" : "en"}
            aria-label={
              locale === "en" ? "Switch to Persian" : "Switch to English"
            }
          >
            {locale === "en" ? "فا" : "EN"}
          </Link>
          <button
            className="theme-toggle icon-button"
            onClick={toggleTheme}
            aria-label={text.theme}
          >
            <svg
              className="sun-icon"
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              aria-hidden="true"
            >
              <circle cx="12" cy="12" r="4" />
              <path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.5 1.5m11 11L19 19M5 19l1.5-1.5m11-11L19 5" />
            </svg>
            <svg
              className="moon-icon"
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              aria-hidden="true"
            >
              <path d="M20 15A9 9 0 0 1 9 4a9 9 0 1 0 11 11Z" />
            </svg>
          </button>
          <button
            className="menu-button icon-button"
            onClick={openMenu}
            aria-label={text.menu}
            aria-expanded={open}
            aria-haspopup="dialog"
            aria-controls="navigation-drawer"
          >
            <span />
            <span />
          </button>
        </div>
      </header>
      <button
        className={
          "floating-menu icon-button" + (scrolled ? " is-visible" : "")
        }
        onClick={openMenu}
        aria-label={text.menu}
        aria-expanded={open}
        aria-haspopup="dialog"
        aria-controls="navigation-drawer"
        tabIndex={scrolled ? 0 : -1}
        aria-hidden={!scrolled}
      >
        <span />
        <span />
      </button>
      <dialog
        ref={dialog}
        id="navigation-drawer"
        className="mobile-menu"
        aria-labelledby="menu-title"
        onCancel={(event) => {
          event.preventDefault();
          void closeMenu();
        }}
        onClose={() => setOpen(false)}
        onClick={(event) => {
          if (event.target === event.currentTarget) void closeMenu();
        }}
      >
        <div className="menu-panel">
          <div className="menu-top">
            <span className="eyebrow">RB / {text.title}</span>
            <button
              className="menu-close icon-button"
              onClick={() => void closeMenu()}
              aria-label={text.close}
            >
              ✕
            </button>
          </div>
          <p className="eyebrow" id="menu-title">
            {locale === "en" ? "EXPLORE / NAVIGATION" : "کاوش / ناوبری"}
          </p>
          <nav aria-label={text.menu}>
            {routes.map(({ href, label }, index) => (
              <Link
                key={href}
                href={href}
                aria-current={active(href) ? "page" : undefined}
                onClick={() => void closeMenu()}
              >
                <small aria-hidden="true">0{index + 1}</small>
                <span>{label}</span>
                <Arrow diagonal />
              </Link>
            ))}
          </nav>
          <div className="menu-utilities">
            <Link
              href={localizedPath(pathname, locale === "en" ? "fa" : "en")}
              hrefLang={locale === "en" ? "fa" : "en"}
              lang={locale === "en" ? "fa" : "en"}
              onClick={() => void closeMenu()}
              aria-label={
                locale === "en" ? "Switch to Persian" : "Switch to English"
              }
            >
              {locale === "en" ? "فارسی ↗" : "English ↗"}
            </Link>
            <button onClick={toggleTheme}>{text.theme} ◐</button>
          </div>
          <div className="menu-bottom">
            <p className="eyebrow">
              {locale === "en" ? "LET’S BUILD SOMETHING." : "چیزی تازه بسازیم."}
            </p>
            <a href={"mailto:" + profile.email} dir="ltr">
              {profile.email}
            </a>
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
            </div>
          </div>
        </div>
      </dialog>
    </>
  );
}

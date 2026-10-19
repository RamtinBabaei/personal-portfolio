import type { Locale } from "./domain";
import { t } from "./copy";

export function navigationItems(locale: Locale) {
  const labels = t(locale).nav;
  return ["", "/work", "/about", "/contact"].map((path, index) => ({
    href: "/" + locale + path,
    label: labels[index],
  }));
}

/** Only ordinary, same-language public page visits use the transition cover. */
export function transitionDestination(href: string, current: string) {
  const from = new URL(current);
  const to = new URL(href, from);
  if (
    !/^\/(en|fa)(?:\/(work|about|contact)(?:\/[^/]+)?)?\/?$/.test(
      from.pathname,
    ) ||
    to.origin !== from.origin ||
    !/^\/(en|fa)(?:\/(work|about|contact)(?:\/[^/]+)?)?\/?$/.test(
      to.pathname,
    ) ||
    to.pathname.split("/")[1] !== from.pathname.split("/")[1] ||
    (to.pathname === from.pathname && to.search === from.search)
  )
    return null;
  return to.pathname + to.search + to.hash;
}

export function pageLabel(pathname: string, locale: Locale) {
  const items = navigationItems(locale);
  return (
    items.find((item) => item.href === pathname)?.label ??
    (pathname.includes("/work/") ? t(locale).view : t(locale).name)
  );
}

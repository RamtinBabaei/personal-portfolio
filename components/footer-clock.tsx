"use client";
import { useEffect, useRef } from "react";
import type { Locale } from "@/lib/domain";
export function FooterClock({ locale }: { locale: Locale }) {
  const element = useRef<HTMLTimeElement>(null);
  useEffect(() => {
    const formatter = new Intl.DateTimeFormat(
      locale === "fa" ? "fa-IR" : "en-GB",
      {
        hour: "2-digit",
        minute: "2-digit",
        timeZoneName: "short",
      },
    );
    const update = () => {
      if (!element.current) return;
      const now = new Date();
      element.current.dateTime = now.toISOString();
      element.current.textContent = formatter.format(now);
    };
    update();
    const timer = setInterval(update, 30000);
    return () => clearInterval(timer);
  }, [locale]);
  return (
    <time ref={element} className="footer-clock" aria-live="off">
      --:--
    </time>
  );
}

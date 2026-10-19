"use client";
import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import type { Locale } from "@/lib/domain";
import { pageLabel, transitionDestination } from "@/lib/navigation";

const easing = "cubic-bezier(0.76, 0, 0.24, 1)";
export function PageTransition({ locale }: { locale: Locale }) {
  const router = useRouter();
  const pathname = usePathname();
  const routerRef = useRef(router);
  const readinessCleanup = useRef<(() => void) | null>(null);
  // Vinext changes the router object on navigation; keep the click subscription stable.
  useEffect(() => {
    routerRef.current = router;
  }, [router]);
  const cover = useRef<HTMLDivElement>(null);
  const pending = useRef(false);
  const target = useRef("");
  const animations = useRef<Animation[]>([]);
  const recovery = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [label, setLabel] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    const element = cover.current;
    if (!element) return;
    let disposed = false;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    const reset = () => {
      readinessCleanup.current?.();
      animations.current.forEach((animation) => animation.cancel());
      animations.current = [];
      element.style.transform = "translate3d(0, 105%, 0)";
      document.documentElement.removeAttribute("data-navigating");
      pending.current = false;
      setMessage("");
      if (recovery.current) clearTimeout(recovery.current);
    };
    const click = async (event: MouseEvent) => {
      const anchor = (
        event.target as Element | null
      )?.closest<HTMLAnchorElement>("a[href]");
      if (
        !anchor ||
        event.defaultPrevented ||
        event.button !== 0 ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey ||
        anchor.hasAttribute("download") ||
        (anchor.target && anchor.target !== "_self") ||
        anchor.hasAttribute("hreflang") ||
        anchor.dataset.transition === "off"
      )
        return;
      const destination = transitionDestination(
        anchor.href,
        window.location.href,
      );
      if (!destination) return;
      if (reduced.matches || !element.animate) return;
      event.preventDefault();
      if (pending.current) return;
      pending.current = true;
      target.current = destination;
      const nextLabel = pageLabel(new URL(anchor.href).pathname, locale);
      setLabel(nextLabel);
      setMessage(
        (locale === "en" ? "Opening " : "در حال بازکردن ") + nextLabel,
      );
      document.documentElement.dataset.navigating = "true";
      recovery.current = setTimeout(reset, 8000);
      try {
        const animation = element.animate(
          [
            {
              transform: "translate3d(0, 105%, 0)",
            },
            { transform: "translate3d(0, 0, 0)" },
          ],
          { duration: 460, easing, fill: "forwards" },
        );
        animations.current.push(animation);
        await animation.finished;
        if (!disposed) routerRef.current.push(destination, { scroll: false });
      } catch {
        reset();
      }
    };
    const mediaChange = () => {
      if (reduced.matches && pending.current) {
        const destination = target.current;
        reset();
        routerRef.current.push(destination);
      }
    };
    document.addEventListener("click", click, true);
    reduced.addEventListener("change", mediaChange);
    return () => {
      disposed = true;
      document.removeEventListener("click", click, true);
      reduced.removeEventListener("change", mediaChange);
      reset();
    };
  }, [locale]);

  useEffect(() => {
    const element = cover.current;
    if (!element || !pending.current) return;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const reveal = async () => {
      try {
        const hash = new URL(target.current, window.location.origin).hash;
        const hashTarget = hash
          ? document.getElementById(decodeURIComponent(hash.slice(1)))
          : null;
        if (hashTarget) hashTarget.scrollIntoView();
        else window.scrollTo({ top: 0, behavior: "instant" });
        const heading = document.querySelector<HTMLElement>("main h1");
        heading?.setAttribute("tabindex", "-1");
        heading?.focus({ preventScroll: true });
        const animation = element.animate(
          [
            { transform: "translate3d(0, 0, 0)" },
            {
              transform: "translate3d(0, -105%, 0)",
            },
          ],
          { duration: 540, easing, fill: "forwards" },
        );
        animations.current.push(animation);
        await animation.finished;
      } catch {
        /* Cancelled navigation must never leave a blocking cover. */
      } finally {
        if (!cancelled) {
          animations.current.forEach((animation) => animation.cancel());
          animations.current = [];
          element.style.transform = "translate3d(0, 105%, 0)";
          pending.current = false;
          document.documentElement.removeAttribute("data-navigating");
          if (recovery.current) clearTimeout(recovery.current);
          setMessage("");
        }
      }
    };
    const checkReady = () => {
      if (
        !pending.current ||
        timer ||
        !document.querySelector("main h1") ||
        document.querySelector("main.loading-page")
      )
        return;
      observer?.disconnect();
      timer = setTimeout(() => {
        void reveal();
      }, 80);
    };
    const observer = new MutationObserver(checkReady);
    observer.observe(document.body, { childList: true, subtree: true });
    checkReady();
    const cleanup = () => {
      cancelled = true;
      observer.disconnect();
      if (timer) clearTimeout(timer);
    };
    readinessCleanup.current = cleanup;
    return () => {
      cleanup();
      if (readinessCleanup.current === cleanup) readinessCleanup.current = null;
    };
  }, [pathname]);

  return (
    <>
      <div className="page-transition-cover" ref={cover} aria-hidden="true">
        <span className="transition-mark">
          RB<span>↗</span>
        </span>
        <span className="transition-title">{label}</span>
        <span className="transition-caption">CODE / DESIGN / INTERACTION</span>
      </div>
      <span className="sr-only" role="status" aria-live="polite">
        {message}
      </span>
    </>
  );
}

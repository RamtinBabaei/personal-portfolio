"use client";
import { useEffect, useRef, useState } from "react";
import type { Locale } from "@/lib/domain";
import { scrollDirection, scrollPace } from "@/lib/motion";

export function HeroRoles({ locale }: { locale: Locale }) {
  const root = useRef<HTMLDivElement>(null);
  const [paused, setPaused] = useState(false);
  const phase = useRef(0);
  const text =
    locale === "en"
      ? "Full-Stack Developer & Software Engineer"
      : "توسعه‌دهنده فول‌استک و مهندس نرم‌افزار";
  useEffect(() => {
    const element = root.current;
    const track = element?.querySelector<HTMLElement>(".roles-track");
    if (!element || !track) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    let inView = false;
    let frame = 0;
    let lastTime = 0;
    let distance = track.scrollWidth / 2;
    let direction: 1 | -1 = 1;
    let pace = 1;
    let targetPace = 1;
    let previousY = window.scrollY;
    let previousTime = performance.now();
    let alive = true;
    const tick = (now: number) => {
      const dt = Math.min((now - lastTime) / 1000, 0.05);
      lastTime = now;
      pace += (targetPace - pace) * Math.min(1, dt * 8);
      targetPace += (1 - targetPace) * Math.min(1, dt * 3);
      phase.current =
        (((phase.current + (direction * dt * pace) / 42) % 1) + 1) % 1;
      track.style.transform =
        "translate3d(" + -phase.current * distance + "px,0,0)";
      frame = requestAnimationFrame(tick);
    };
    const update = () => {
      cancelAnimationFrame(frame);
      const running = !paused && inView && !document.hidden && !reduced.matches;
      element.dataset.running = String(running);
      track.style.willChange = running ? "transform" : "auto";
      if (running) {
        lastTime = performance.now();
        frame = requestAnimationFrame(tick);
      }
    };
    const scroll = () => {
      const now = performance.now();
      const velocity =
        ((window.scrollY - previousY) * 1000) /
        Math.max(16, now - previousTime);
      direction = scrollDirection(velocity, direction);
      targetPace = scrollPace(velocity);
      element.dataset.direction = direction === 1 ? "forward" : "reverse";
      previousY = window.scrollY;
      previousTime = now;
    };
    const resize = () => {
      distance = track.scrollWidth / 2;
    };
    const observer = new IntersectionObserver(([entry]) => {
      inView = entry.isIntersecting;
      update();
    });
    const sizeObserver = new ResizeObserver(resize);
    sizeObserver.observe(track);
    observer.observe(element);
    void document.fonts.ready.then(() => {
      if (alive) resize();
    });
    window.addEventListener("scroll", scroll, { passive: true });
    document.addEventListener("visibilitychange", update);
    reduced.addEventListener("change", update);
    update();
    return () => {
      alive = false;
      cancelAnimationFrame(frame);
      observer.disconnect();
      sizeObserver.disconnect();
      window.removeEventListener("scroll", scroll);
      document.removeEventListener("visibilitychange", update);
      reduced.removeEventListener("change", update);
      track.style.removeProperty("will-change");
    };
  }, [paused]);
  return (
    <div className="hero-roles" ref={root} data-running="false">
      <p className="sr-only">{text}</p>
      <div className="roles-window" aria-hidden="true">
        <div className="roles-track">
          {[0, 1].map((index) => (
            <span className="roles-group" key={index}>
              <span dir={locale === "fa" ? "rtl" : "ltr"}>{text}</span>
              <span className="roles-star">✳</span>
            </span>
          ))}
        </div>
      </div>
      <button
        type="button"
        className="roles-control"
        onClick={() => setPaused(!paused)}
        aria-pressed={paused}
        aria-label={
          locale === "en"
            ? paused
              ? "Play title animation"
              : "Pause title animation"
            : paused
              ? "پخش انیمیشن عنوان"
              : "توقف انیمیشن عنوان"
        }
      >
        <span aria-hidden="true">{paused ? "▶" : "Ⅱ"}</span>
      </button>
    </div>
  );
}

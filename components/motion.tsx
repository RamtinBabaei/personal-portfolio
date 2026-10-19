"use client";
import { useEffect } from "react";
import { usePathname } from "next/navigation";

/** Optional progressive motion. Native scrolling and readable HTML are the baseline. */
export function MotionSystem() {
  const pathname = usePathname();
  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    let disposeMotion: (() => void) | undefined;
    let disposed = false;
    let generation = 0;
    const initialize = async () => {
      const current = ++generation;
      disposeMotion?.();
      disposeMotion = undefined;
      if (disposed || reduced.matches) return;
      try {
        const [{ gsap }, { ScrollTrigger }] = await Promise.all([
          import("gsap"),
          import("gsap/ScrollTrigger"),
        ]);
        if (disposed || reduced.matches || current !== generation) return;
        gsap.registerPlugin(ScrollTrigger);
        const controller = new AbortController();
        let refreshFrame = 0;
        const refresh = () => {
          cancelAnimationFrame(refreshFrame);
          refreshFrame = requestAnimationFrame(() => ScrollTrigger.refresh());
        };
        const mobile = window.matchMedia("(max-width: 760px)").matches;
        const context = gsap.context(() => {
          // Initially visible content is never hidden. Upcoming reveals reset on
          // leaveBack, so the same section can enter naturally on a return scroll.
          document
            .querySelectorAll<HTMLElement>(".reveal")
            .forEach((element) => {
              if (
                element.getBoundingClientRect().top <=
                window.innerHeight * 0.92
              )
                return;
              gsap.fromTo(
                element,
                { y: mobile ? 20 : 38, autoAlpha: 0 },
                {
                  y: 0,
                  autoAlpha: 1,
                  duration: 0.95,
                  ease: "power3.out",
                  scrollTrigger: {
                    trigger: element,
                    start: "top 92%",
                    toggleActions: "play none none reverse",
                  },
                },
              );
            });
          document
            .querySelectorAll<HTMLElement>(
              "[data-form-reveal], [data-interactive-reveal]",
            )
            .forEach((element) => {
              if (
                element.getBoundingClientRect().top <=
                window.innerHeight * 0.92
              )
                return;
              const animation = gsap.fromTo(
                element,
                { y: mobile ? 12 : 22 },
                {
                  y: 0,
                  duration: 0.8,
                  ease: "power3.out",
                  scrollTrigger: {
                    trigger: element,
                    start: "top 94%",
                    toggleActions: "play none none reverse",
                  },
                },
              );
              element.addEventListener(
                "focusin",
                () => {
                  animation.scrollTrigger?.kill();
                  animation.progress(1).pause();
                  gsap.set(element, { clearProps: "transform" });
                },
                { once: true, signal: controller.signal },
              );
            });
          const signature = document.querySelector(".hero-signature");
          if (signature)
            gsap.to(signature, {
              y: mobile ? -20 : -65,
              rotation: -8,
              ease: "none",
              scrollTrigger: {
                trigger: ".hero",
                start: "top top",
                end: "bottom top",
                scrub: 0.7,
              },
            });
          document
            .querySelectorAll<HTMLElement>("[data-turn]")
            .forEach((element) => {
              gsap.fromTo(
                element,
                { rotation: -20 },
                {
                  rotation: 75,
                  ease: "none",
                  scrollTrigger: {
                    trigger: element.parentElement,
                    start: "top bottom",
                    end: "bottom top",
                    scrub: 0.8,
                  },
                },
              );
            });
          document
            .querySelectorAll<HTMLElement>("[data-surface-wash]")
            .forEach((element) => {
              gsap.fromTo(
                element,
                { "--wash": 0 },
                {
                  "--wash": 1,
                  ease: "none",
                  scrollTrigger: {
                    trigger: element,
                    start: "top 85%",
                    end: "top 10%",
                    scrub: 0.8,
                  },
                },
              );
            });
          const footer = document.querySelector<HTMLElement>(".site-footer");
          if (footer && !document.querySelector(".contact-page")) {
            const timeline = gsap.timeline({
              scrollTrigger: {
                trigger: footer,
                start: "top bottom",
                end: "top 22%",
                scrub: 0.8,
              },
            });
            timeline
              .fromTo(
                footer.querySelector(".footer-edge"),
                { scaleY: 1 },
                { scaleY: 0, ease: "none" },
                0,
              )
              .fromTo(
                footer.querySelector(".footer-inner"),
                { y: mobile ? 25 : 65 },
                { y: 0, ease: "none" },
                0,
              )
              .fromTo(
                footer.querySelector(".footer-spark"),
                { rotation: -45 },
                { rotation: 0, ease: "none" },
                0,
              )
              .fromTo(
                footer.querySelector(".footer-magnetic"),
                { x: mobile ? 20 : 85 },
                { x: 0, ease: "none" },
                0,
              );
          }
        });
        document.querySelectorAll("details").forEach((details) =>
          details.addEventListener("toggle", refresh, {
            signal: controller.signal,
          }),
        );
        document.querySelectorAll("img").forEach((image) => {
          if (!image.complete)
            image.addEventListener("load", refresh, {
              once: true,
              signal: controller.signal,
            });
        });
        void document.fonts.ready.then(() => {
          if (!controller.signal.aborted) refresh();
        });
        let orb: HTMLDivElement | undefined;
        let pointerFrame = 0;
        let magnet: HTMLElement | null = null;
        let magnetRect: DOMRect | undefined;
        const resetMagnet = () => {
          magnet?.style.removeProperty("--mx");
          magnet?.style.removeProperty("--my");
          magnet = null;
          magnetRect = undefined;
        };
        if (window.matchMedia("(hover: hover) and (pointer: fine)").matches) {
          orb = document.createElement("div");
          orb.className = "cursor-orb";
          orb.setAttribute("aria-hidden", "true");
          document.body.appendChild(orb);
          // Delegation also covers newly filtered project rows, with one RAF.
          document.addEventListener(
            "pointermove",
            (event) => {
              if (event.pointerType === "touch") return;
              const target =
                event.target instanceof Element ? event.target : null;
              const nextMagnet =
                target?.closest<HTMLElement>("[data-magnetic]") ?? null;
              if (nextMagnet !== magnet) {
                resetMagnet();
                magnet = nextMagnet;
                magnetRect = magnet?.getBoundingClientRect();
              }
              const preview = target?.closest<HTMLElement>("[data-cursor]");
              orb!.classList.toggle("visible", !!preview);
              orb!.textContent = preview?.dataset.cursor ?? "";
              cancelAnimationFrame(pointerFrame);
              pointerFrame = requestAnimationFrame(() => {
                orb!.style.transform =
                  "translate3d(" +
                  event.clientX +
                  "px," +
                  event.clientY +
                  "px,0)";
                if (magnet && magnetRect) {
                  magnet.style.setProperty(
                    "--mx",
                    Math.max(
                      -12,
                      Math.min(
                        12,
                        (event.clientX -
                          magnetRect.left -
                          magnetRect.width / 2) *
                          0.12,
                      ),
                    ) + "px",
                  );
                  magnet.style.setProperty(
                    "--my",
                    Math.max(
                      -12,
                      Math.min(
                        12,
                        (event.clientY -
                          magnetRect.top -
                          magnetRect.height / 2) *
                          0.12,
                      ),
                    ) + "px",
                  );
                }
              });
            },
            { signal: controller.signal, passive: true },
          );
          document.addEventListener(
            "pointerleave",
            () => {
              orb?.classList.remove("visible");
              resetMagnet();
            },
            { signal: controller.signal },
          );
          window.addEventListener(
            "scroll",
            () => {
              resetMagnet();
              orb?.classList.remove("visible");
            },
            {
              signal: controller.signal,
              passive: true,
            },
          );
        }
        refresh();
        disposeMotion = () => {
          controller.abort();
          cancelAnimationFrame(refreshFrame);
          cancelAnimationFrame(pointerFrame);
          resetMagnet();
          orb?.remove();
          context.revert();
        };
      } catch {
        // Optional motion failure does not prevent navigation or reading.
      }
    };
    let started = false;
    const startWhenReady = () => {
      if (
        started ||
        !document.querySelector("main h1") ||
        document.querySelector("main.loading-page")
      )
        return;
      started = true;
      observer.disconnect();
      void initialize();
    };
    const observer = new MutationObserver(startWhenReady);
    observer.observe(document.body, { childList: true, subtree: true });
    const timeout = window.setTimeout(startWhenReady, 160);
    const preferenceChanged = () => {
      if (started) void initialize();
    };
    reduced.addEventListener("change", preferenceChanged);
    return () => {
      disposed = true;
      generation++;
      clearTimeout(timeout);
      observer.disconnect();
      reduced.removeEventListener("change", preferenceChanged);
      disposeMotion?.();
    };
  }, [pathname]);
  return null;
}

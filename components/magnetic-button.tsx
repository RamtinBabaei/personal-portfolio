"use client";

import Link from "next/link";
import {
  useEffect,
  useRef,
  type ReactNode,
  type MouseEventHandler,
} from "react";
import { magneticOffset, MAGNETIC_RADIUS } from "@/lib/motion";

type Common = {
  children: ReactNode;
  className?: string;
  ariaLabel?: string;
  shape?: "circle" | "pill";
  external?: boolean;
};
type Props = Common &
  (
    | {
        href: string;
        type?: never;
        disabled?: never;
        busy?: never;
        onClick?: never;
      }
    | {
        href?: never;
        type?: "submit" | "button";
        disabled?: boolean;
        busy?: boolean;
        onClick?: MouseEventHandler<HTMLButtonElement>;
      }
  );

export function MagneticButton(props: Props) {
  const root = useRef<HTMLSpanElement>(null);
  const disabled = props.disabled ?? false;
  const busy = props.busy ?? false;
  useEffect(() => {
    const element = root.current;
    const hit = element?.querySelector<HTMLElement>(".magnetic-hit");
    const disc = element?.querySelector<HTMLElement>(".magnetic-disc");
    const label = element?.querySelector<HTMLElement>(".magnetic-label");
    const fill = element?.querySelector<HTMLElement>(".magnetic-fill");
    if (!element || !hit || !disc || !label || !fill) return;
    const reduced = matchMedia("(prefers-reduced-motion: reduce)");
    const fine = matchMedia("(hover: hover) and (pointer: fine)");
    let alive = true;
    let generation = 0;
    let stop: (() => void) | undefined;
    const initialize = async () => {
      const current = ++generation;
      stop?.();
      stop = undefined;
      if (!alive || disabled || busy || reduced.matches || !fine.matches)
        return;
      try {
        const { gsap } = await import("gsap");
        if (
          !alive ||
          current !== generation ||
          reduced.matches ||
          !fine.matches
        )
          return;
        const controller = new AbortController();
        let frame = 0;
        let inside = false;
        let pointer = { x: 0, y: 0 };
        gsap.set(disc, { force3D: true });
        const followers = () => ({
          x: gsap.quickTo(disc, "x", { duration: 0.48, ease: "power3.out" }),
          y: gsap.quickTo(disc, "y", { duration: 0.48, ease: "power3.out" }),
          tx: gsap.quickTo(label, "x", { duration: 0.6, ease: "power3.out" }),
          ty: gsap.quickTo(label, "y", { duration: 0.6, ease: "power3.out" }),
        });
        let follow = followers();
        const reveal = () => {
          const active = inside || document.activeElement === hit;
          gsap.to(fill, {
            "--fill": active ? "0%" : "105%",
            duration: 0.52,
            ease: "power3.inOut",
            overwrite: true,
          });
        };
        const enter = () => {
          if (inside) return;
          inside = true;
          gsap.killTweensOf([disc, label]);
          follow = followers();
          disc.style.willChange = "transform";
          reveal();
        };
        const leave = () => {
          if (!inside) return;
          inside = false;
          cancelAnimationFrame(frame);
          gsap.killTweensOf([disc, label]);
          gsap.to([disc, label], {
            x: 0,
            y: 0,
            duration: 0.9,
            ease: "elastic.out(1,0.55)",
            overwrite: true,
            onComplete: () => {
              if (!inside) disc.style.removeProperty("will-change");
            },
          });
          reveal();
        };
        const move = (event: PointerEvent) => {
          if (event.pointerType === "touch") return;
          enter();
          pointer = { x: event.clientX, y: event.clientY };
          cancelAnimationFrame(frame);
          frame = requestAnimationFrame(() => {
            const bounds = hit.getBoundingClientRect();
            const point = magneticOffset(
              pointer.x - bounds.left - bounds.width / 2,
              pointer.y - bounds.top - bounds.height / 2,
            );
            follow.x(point.x);
            follow.y(point.y);
            follow.tx(point.x * 0.18);
            follow.ty(point.y * 0.18);
          });
        };
        hit.addEventListener(
          "pointerenter",
          (event) => {
            if (event.pointerType !== "touch") enter();
          },
          { signal: controller.signal },
        );
        hit.addEventListener("pointermove", move, {
          signal: controller.signal,
          passive: true,
        });
        hit.addEventListener("pointerleave", leave, {
          signal: controller.signal,
        });
        hit.addEventListener("pointercancel", leave, {
          signal: controller.signal,
        });
        hit.addEventListener("focus", reveal, { signal: controller.signal });
        hit.addEventListener("blur", reveal, { signal: controller.signal });
        window.addEventListener("scroll", leave, {
          signal: controller.signal,
          passive: true,
        });
        window.addEventListener("resize", leave, { signal: controller.signal });
        element.dataset.motionReady = "true";
        if (hit.matches(":hover")) enter();
        else reveal();
        stop = () => {
          controller.abort();
          cancelAnimationFrame(frame);
          gsap.killTweensOf([disc, label, fill]);
          gsap.set([disc, label], { clearProps: "transform,willChange" });
          fill.style.removeProperty("--fill");
          delete element.dataset.motionReady;
        };
      } catch {
        // Native links/buttons and the CSS reveal remain usable without GSAP.
      }
    };
    const change = () => {
      void initialize();
    };
    reduced.addEventListener("change", change);
    fine.addEventListener("change", change);
    void initialize();
    return () => {
      alive = false;
      generation++;
      stop?.();
      reduced.removeEventListener("change", change);
      fine.removeEventListener("change", change);
    };
  }, [disabled, busy]);

  const content = (
    <span className="magnetic-disc">
      <span className="magnetic-fill" aria-hidden="true" />
      <span className="magnetic-label">{props.children}</span>
    </span>
  );
  return (
    <span
      ref={root}
      className={
        "magnetic-button magnetic-button--" +
        (props.shape ?? "circle") +
        " " +
        (props.className ?? "")
      }
      data-magnetic-radius={MAGNETIC_RADIUS}
    >
      {props.href !== undefined && props.external ? (
        <a
          href={props.href}
          className="magnetic-hit"
          aria-label={props.ariaLabel}
          target="_blank"
          rel="noopener noreferrer"
        >
          {content}
        </a>
      ) : props.href !== undefined ? (
        <Link
          href={props.href}
          className="magnetic-hit"
          aria-label={props.ariaLabel}
        >
          {content}
        </Link>
      ) : (
        <button
          className="magnetic-hit"
          type={props.type ?? "button"}
          disabled={disabled}
          aria-busy={busy}
          aria-label={props.ariaLabel}
          onClick={props.onClick}
        >
          {content}
        </button>
      )}
    </span>
  );
}

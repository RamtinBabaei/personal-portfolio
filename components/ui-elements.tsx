/* eslint-disable @next/next/no-img-element -- Precompressed, self-hosted responsive WebP assets bypass runtime image processing. */
import type { ReactNode } from "react";
export function Arrow({
  diagonal = false,
  className = "",
}: {
  diagonal?: boolean;
  className?: string;
}) {
  return (
    <svg
      className={`arrow ${className}`}
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <path
        d={diagonal ? "M5 19 19 5M5 5h14v14" : "M4 12h15m-6-6 6 6-6 6"}
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
export function Mark() {
  return (
    <svg
      width="32"
      height="32"
      viewBox="0 0 32 32"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="m11 5-8 11 8 11M21 5l8 11-8 11M19 4l-6 24"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
export function Label({
  children,
  index,
}: {
  children: ReactNode;
  index?: string;
}) {
  return (
    <p className="eyebrow section-label">
      <span>{children}</span>
      {index && <span aria-hidden="true">({index})</span>}
    </p>
  );
}
export function Photo({
  name,
  alt,
  className = "",
  priority = false,
  sizes = "(max-width: 700px) 100vw, 50vw",
}: {
  name: "hero" | "about" | "street" | "workspace" | "portrait";
  alt: string;
  className?: string;
  priority?: boolean;
  sizes?: string;
}) {
  const width = name === "hero" ? 1600 : name === "workspace" ? 1536 : 1122;
  const height = name === "hero" ? 900 : name === "workspace" ? 1024 : 1402;
  // Assets are precompressed and have explicit responsive sources; no runtime image proxy is needed.
  return (
    <img
      src={`/images/${name}-960.webp`}
      srcSet={`/images/${name}-480.webp 480w, /images/${name}-960.webp 960w, /images/${name}-1600.webp ${width}w`}
      sizes={sizes}
      width={width}
      height={height}
      alt={alt}
      loading={priority ? "eager" : "lazy"}
      fetchPriority={priority ? "high" : "auto"}
      decoding="async"
      className={className}
    />
  );
}

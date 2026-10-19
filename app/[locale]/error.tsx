"use client";
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <main id="main" className="section inner-page">
      <p className="eyebrow">SOMETHING WENT WRONG</p>
      <h1 className="page-title">Let&apos;s try that again.</h1>
      <p>The page could not load. Please try again.</p>
      <button className="pill-button" onClick={reset}>
        <span>Try again ↗</span>
      </button>
    </main>
  );
}

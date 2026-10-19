export default function Loading() {
  return (
    <main
      className="section inner-page loading-page"
      id="main"
      role="status"
      aria-label="Loading page"
    >
      <div className="loading-line" />
      <div className="loading-line" />
      <div className="loading-block" />
      <span className="sr-only">Loading…</span>
    </main>
  );
}

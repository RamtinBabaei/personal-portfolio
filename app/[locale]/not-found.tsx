import Link from "next/link";
export default function NotFound() {
  return (
    <main className="section inner-page" id="main">
      <p className="eyebrow">404 / NOT FOUND</p>
      <h1 className="page-title">This page took a different path.</h1>
      <Link className="pill-button" href="/en">
        <span>Back to home ↗</span>
      </Link>
    </main>
  );
}

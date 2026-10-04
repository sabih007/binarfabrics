import Link from "next/link";

/** Shared 404 body — rendered by both the shop and the root not-found pages. */
export default function NotFoundContent() {
  return (
    <section className="section">
      <div className="container text-center" style={{ padding: "80px 0" }}>
        <span className="eyebrow">404</span>
        <h1 style={{ fontSize: "clamp(30px, 4vw, 46px)", marginBottom: 12 }}>We couldn&apos;t find that page</h1>
        <p style={{ color: "var(--ink-3)", marginBottom: 28 }}>The product or page may have moved or is no longer available.</p>
        <Link className="btn btn--primary" href="/shop">Continue shopping</Link>
      </div>
    </section>
  );
}

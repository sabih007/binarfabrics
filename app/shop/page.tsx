import { Suspense } from "react";
import type { Metadata } from "next";
import ShopClient from "./ShopClient";

export const metadata: Metadata = {
  title: "Shop",
  description: "Browse all BinAr Fabrics unstitched and ready-to-wear products. Filter by category, fabric and price.",
};

export default function ShopPage() {
  // useSearchParams() in the client component requires a Suspense boundary
  return (
    <Suspense fallback={<div className="container section-tight" style={{ padding: "60px 0", color: "var(--ink-3)" }}>Loading products…</div>}>
      <ShopClient />
    </Suspense>
  );
}

import type { Metadata } from "next";
import { Suspense } from "react";
import OrdersClient from "./OrdersClient";

export const metadata: Metadata = { title: "Orders" };
export const dynamic = "force-dynamic";

export default function AdminOrdersPage() {
  return (
    <Suspense fallback={<div className="adm-empty">Loading…</div>}>
      <OrdersClient />
    </Suspense>
  );
}

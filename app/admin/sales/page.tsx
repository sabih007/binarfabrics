import type { Metadata } from "next";
import { Suspense } from "react";
import { getSession } from "@/lib/auth";
import SalesClient from "./SalesClient";
// Shares the totals rows and receipt styling with the till.
import "../pos/pos.css";

export const metadata: Metadata = { title: "Counter sales" };
export const dynamic = "force-dynamic";

export default async function AdminSalesPage() {
  const session = await getSession();

  return (
    <Suspense fallback={<div className="adm-empty">Loading…</div>}>
      {/* Voiding is owner-only server-side; hide the button for staff rather
          than letting them click into a 403. */}
      <SalesClient canVoid={session?.role === "OWNER"} />
    </Suspense>
  );
}

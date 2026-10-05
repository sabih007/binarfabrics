import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { money } from "@/lib/products";
import { toApiSale } from "@/lib/serialize";
import Receipt from "@/components/admin/Receipt";
import PrintButton from "./PrintButton";
import "../../pos/pos.css";

export const metadata: Metadata = { title: "Receipt" };
export const dynamic = "force-dynamic";

/** Reads straight from the database — no self-fetch back into our own API. */
export default async function SaleReceiptPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const row = await prisma.sale.findUnique({ where: { id }, include: { items: true } });
  if (!row) notFound();

  const sale = toApiSale(row);

  return (
    <>
      <div className="adm__head">
        <div>
          <h1>Receipt {sale.number}</h1>
          <p>
            {money(sale.total)} · {sale.items.reduce((n, i) => n + i.qty, 0)} item(s) · rung up by{" "}
            {sale.cashierName}
            {sale.status === "VOIDED" && " · voided"}
          </p>
        </div>
        <div className="adm-actions">
          <PrintButton />
          <Link className="adm-btn" href="/admin/sales">
            Back to sales
          </Link>
        </div>
      </div>

      <div className="rcpt-paper">
        <Receipt sale={sale} />
      </div>
    </>
  );
}

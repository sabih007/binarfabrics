import type { Metadata } from "next";
import { Suspense } from "react";
import { prisma } from "@/lib/db";
import { toApiCategory } from "@/lib/serialize";
import ProductsClient from "./ProductsClient";

export const metadata: Metadata = { title: "Products" };
export const dynamic = "force-dynamic";

export default async function AdminProductsPage() {
  // Categories are needed by the form on first paint, so fetch them here
  // rather than making the client wait on a second round trip.
  const categories = await prisma.category.findMany({
    include: { _count: { select: { products: true } } },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
  });

  return (
    <Suspense fallback={<div className="adm-empty">Loading…</div>}>
      <ProductsClient categories={categories.map(toApiCategory)} />
    </Suspense>
  );
}

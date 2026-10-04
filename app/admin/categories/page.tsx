import type { Metadata } from "next";
import { prisma } from "@/lib/db";
import { toApiCategory } from "@/lib/serialize";
import CategoriesClient from "./CategoriesClient";

export const metadata: Metadata = { title: "Categories" };
export const dynamic = "force-dynamic";

export default async function AdminCategoriesPage() {
  const rows = await prisma.category.findMany({
    include: { _count: { select: { products: true } } },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
  });

  return <CategoriesClient initial={rows.map(toApiCategory)} />;
}

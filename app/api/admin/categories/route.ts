/* ==========================================================================
   GET  /api/admin/categories — all categories, inactive included
   POST /api/admin/categories — create
   ========================================================================== */

import { handler, ok, readJson } from "@/lib/api";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { toApiCategory } from "@/lib/serialize";
import { categoryCreateSchema } from "@/lib/validation";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export const GET = handler(async () => {
  await requireAdmin();

  const rows = await prisma.category.findMany({
    include: { _count: { select: { products: true } } },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
  });

  return ok({ categories: rows.map(toApiCategory) });
});

export const POST = handler(async (req: Request) => {
  await requireAdmin();

  const data = categoryCreateSchema.parse(await readJson(req));
  const category = await prisma.category.create({
    data: { ...data, href: data.href ?? `/shop?cat=${data.slug}` },
    include: { _count: { select: { products: true } } },
  });

  return ok({ category: toApiCategory(category) }, { status: 201 });
});

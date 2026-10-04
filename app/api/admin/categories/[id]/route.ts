/* ==========================================================================
   PATCH  /api/admin/categories/:id
   DELETE /api/admin/categories/:id — refuses while products still use it
   ========================================================================== */

import { fail, handler, ok, readJson, HttpError } from "@/lib/api";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { toApiCategory } from "@/lib/serialize";
import { categoryUpdateSchema } from "@/lib/validation";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type Ctx = { params: Promise<{ id: string }> };

export const PATCH = handler(async (req: Request, ctx: Ctx) => {
  await requireAdmin();
  const { id } = await ctx.params;

  const patch = categoryUpdateSchema.parse(await readJson(req));
  const category = await prisma.category.update({
    where: { id },
    data: patch,
    include: { _count: { select: { products: true } } },
  });

  return ok({ category: toApiCategory(category) });
});

export const DELETE = handler(async (_req: Request, ctx: Ctx) => {
  await requireAdmin();
  const { id } = await ctx.params;

  const category = await prisma.category.findUnique({
    where: { id },
    include: { _count: { select: { products: true } } },
  });
  if (!category) return fail("Category not found.", 404, { code: "NOT_FOUND" });

  // Products require a category, so deleting one with products would orphan
  // them. Tell the admin what to do instead of failing on a constraint.
  if (category._count.products > 0) {
    throw new HttpError(
      409,
      `"${category.name}" still has ${category._count.products} product(s). Move them to another category first, or set this one to inactive.`,
      "CATEGORY_IN_USE"
    );
  }

  await prisma.category.delete({ where: { id } });
  return ok({ deleted: true });
});

/* ==========================================================================
   PATCH  /api/admin/categories/:id
   DELETE /api/admin/categories/:id — refuses while products still use it
   ========================================================================== */

import { fail, handler, ok, readJson, HttpError } from "@/lib/api";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { assertHasNoChildren, assertParentIsTopLevel } from "@/lib/categories";
import { toApiCategory } from "@/lib/serialize";
import { categoryUpdateSchema } from "@/lib/validation";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type Ctx = { params: Promise<{ id: string }> };

export const PATCH = handler(async (req: Request, ctx: Ctx) => {
  await requireAdmin();
  const { id } = await ctx.params;

  const patch = categoryUpdateSchema.parse(await readJson(req));

  // The tree is deliberately one level deep, so a category may only sit under
  // a top-level group — and never under itself.
  if (patch.parentId !== undefined) {
    if (patch.parentId === id) {
      throw new HttpError(400, "A category can't be its own parent.", "INVALID_PARENT");
    }
    await assertParentIsTopLevel(patch.parentId);
    if (patch.parentId) await assertHasNoChildren(id);
  }

  const category = await prisma.category.update({
    where: { id },
    data: patch,
    include: { _count: { select: { products: true } }, parent: true },
  });

  return ok({ category: toApiCategory(category) });
});

export const DELETE = handler(async (_req: Request, ctx: Ctx) => {
  await requireAdmin();
  const { id } = await ctx.params;

  const category = await prisma.category.findUnique({
    where: { id },
    include: { _count: { select: { products: true, children: true } } },
  });
  if (!category) return fail("Category not found.", 404, { code: "NOT_FOUND" });

  // Deleting a group would silently detach its subcategories, so make the
  // admin deal with them first.
  if (category._count.children > 0) {
    throw new HttpError(
      409,
      `"${category.name}" still has ${category._count.children} subcategor${
        category._count.children === 1 ? "y" : "ies"
      }. Delete or move those first.`,
      "CATEGORY_HAS_CHILDREN"
    );
  }

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

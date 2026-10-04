/* ==========================================================================
   GET    /api/admin/products/:id
   PATCH  /api/admin/products/:id
   DELETE /api/admin/products/:id — archives if the product has order history
   ========================================================================== */

import { fail, handler, ok, readJson, HttpError } from "@/lib/api";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { toAdminProduct } from "@/lib/serialize";
import { productUpdateSchema } from "@/lib/validation";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type Ctx = { params: Promise<{ id: string }> };

export const GET = handler(async (_req: Request, ctx: Ctx) => {
  await requireAdmin();
  const { id } = await ctx.params;

  const product = await prisma.product.findUnique({ where: { id }, include: { category: true } });
  if (!product) return fail("Product not found.", 404, { code: "NOT_FOUND" });

  return ok({ product: toAdminProduct(product) });
});

export const PATCH = handler(async (req: Request, ctx: Ctx) => {
  await requireAdmin();
  const { id } = await ctx.params;

  const patch = productUpdateSchema.parse(await readJson(req));

  const current = await prisma.product.findUnique({ where: { id } });
  if (!current) return fail("Product not found.", 404, { code: "NOT_FOUND" });

  // A partial update can set oldPrice without price (or vice versa); re-check
  // the pair against what's actually stored.
  const price = patch.price ?? current.price;
  const oldPrice = patch.oldPrice === undefined ? current.oldPrice : patch.oldPrice;
  if (oldPrice && oldPrice <= price) {
    throw new HttpError(422, "The old price should be higher than the current price.");
  }

  if (patch.categoryId) {
    const category = await prisma.category.findUnique({ where: { id: patch.categoryId } });
    if (!category) throw new HttpError(422, "That category no longer exists.", "BAD_CATEGORY");
  }

  const product = await prisma.product.update({
    where: { id },
    data: { ...patch, oldPrice: oldPrice || null },
    include: { category: true },
  });

  return ok({ product: toAdminProduct(product) });
});

export const DELETE = handler(async (_req: Request, ctx: Ctx) => {
  await requireAdmin();
  const { id } = await ctx.params;

  const product = await prisma.product.findUnique({
    where: { id },
    include: { _count: { select: { items: true } } },
  });
  if (!product) return fail("Product not found.", 404, { code: "NOT_FOUND" });

  // Deleting a sold product would blank its name on past orders, so archive
  // it instead — it disappears from the shop either way.
  if (product._count.items > 0) {
    const archived = await prisma.product.update({
      where: { id },
      data: { active: false },
      include: { category: true },
    });
    return ok({
      deleted: false,
      archived: true,
      product: toAdminProduct(archived),
      message: "This product appears on past orders, so it was hidden from the shop instead of deleted.",
    });
  }

  await prisma.product.delete({ where: { id } });
  return ok({ deleted: true, archived: false });
});

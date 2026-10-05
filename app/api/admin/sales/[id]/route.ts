/* ==========================================================================
   GET   /api/admin/sales/:id — reprint a receipt
   PATCH /api/admin/sales/:id — void a sale (owner only)
   ========================================================================== */

import { fail, handler, ok, readJson } from "@/lib/api";
import { requireAdmin, requireOwner } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { voidSale } from "@/lib/sales";
import { toApiSale } from "@/lib/serialize";
import { saleVoidSchema } from "@/lib/validation";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type Ctx = { params: Promise<{ id: string }> };

export const GET = handler(async (_req: Request, ctx: Ctx) => {
  await requireAdmin();
  const { id } = await ctx.params;

  const sale = await prisma.sale.findUnique({ where: { id }, include: { items: true } });
  if (!sale) return fail("Sale not found.", 404, { code: "NOT_FOUND" });

  return ok({ sale: toApiSale(sale) });
});

export const PATCH = handler(async (req: Request, ctx: Ctx) => {
  // Voiding rewrites the day's takings, so it follows the same owner-only
  // rule as the other destructive admin actions.
  await requireOwner();
  const { id } = await ctx.params;

  const patch = saleVoidSchema.parse(await readJson(req));
  const sale = await voidSale(id, patch.voidReason);

  return ok({ sale: toApiSale(sale), restocked: true });
});

/* ==========================================================================
   GET   /api/admin/orders/:id
   PATCH /api/admin/orders/:id — change status / payment status
   ========================================================================== */

import { fail, handler, ok, readJson, HttpError } from "@/lib/api";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { restock } from "@/lib/orders";
import { toApiOrder } from "@/lib/serialize";
import { orderUpdateSchema } from "@/lib/validation";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type Ctx = { params: Promise<{ id: string }> };

export const GET = handler(async (_req: Request, ctx: Ctx) => {
  await requireAdmin();
  const { id } = await ctx.params;

  const order = await prisma.order.findUnique({ where: { id }, include: { items: true } });
  if (!order) return fail("Order not found.", 404, { code: "NOT_FOUND" });

  return ok({ order: toApiOrder(order) });
});

export const PATCH = handler(async (req: Request, ctx: Ctx) => {
  await requireAdmin();
  const { id } = await ctx.params;

  const patch = orderUpdateSchema.parse(await readJson(req));

  const current = await prisma.order.findUnique({ where: { id } });
  if (!current) return fail("Order not found.", 404, { code: "NOT_FOUND" });

  // A delivered order has left the building; reopening it would misreport
  // revenue and can't un-ship the parcel.
  if (current.status === "DELIVERED" && patch.status && patch.status !== "DELIVERED") {
    throw new HttpError(409, "A delivered order can't be moved back.", "ALREADY_DELIVERED");
  }

  // Cancelling returns the reserved stock to the shelf — but only once.
  const cancelling = patch.status === "CANCELLED" && current.status !== "CANCELLED";
  if (cancelling) await restock(id);

  const order = await prisma.order.update({
    where: { id },
    data: patch,
    include: { items: true },
  });

  return ok({ order: toApiOrder(order), restocked: cancelling });
});

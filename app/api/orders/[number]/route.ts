/* ==========================================================================
   GET /api/orders/:number?phone=03xxxxxxxxx — order tracking.

   Order numbers are sequential and therefore guessable, so the phone number
   on the order acts as the shared secret. Without it, or with the wrong one,
   the response is an indistinguishable 404.
   ========================================================================== */

import { clientIp, fail, handler, ok } from "@/lib/api";
import { enforce } from "@/lib/rate-limit";
import { prisma } from "@/lib/db";
import { toApiOrder } from "@/lib/serialize";
import { orderLookupSchema } from "@/lib/validation";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ number: string }> };

/** Compares phone numbers ignoring spacing and the +92 / 0 prefix. */
const normalisePhone = (p: string) => p.replace(/[\s-()]/g, "").replace(/^(\+92|0092|92|0)/, "");

export const GET = handler(async (req: Request, ctx: Ctx) => {
  // Throttled because the number space is enumerable.
  enforce(`track:${clientIp(req)}`, 20, 5 * 60_000);

  const { number } = await ctx.params;
  const phone = new URL(req.url).searchParams.get("phone") ?? "";
  const lookup = orderLookupSchema.safeParse({ number, phone });

  const notFound = () => fail("No order matches that number and phone.", 404, { code: "NOT_FOUND" });
  if (!lookup.success) return notFound();

  const order = await prisma.order.findUnique({
    where: { number: lookup.data.number.toUpperCase() },
    include: { items: true },
  });

  if (!order || normalisePhone(order.phone) !== normalisePhone(lookup.data.phone)) {
    return notFound();
  }

  return ok({ order: toApiOrder(order) });
});

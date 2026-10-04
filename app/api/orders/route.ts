/* ==========================================================================
   POST /api/orders — cart re-pricing preview.

   Lets the checkout page show authoritative totals (and catch a sold-out
   item) before the customer fills in their address. It writes nothing.
   ========================================================================== */

import { clientIp, handler, ok, readJson } from "@/lib/api";
import { enforce } from "@/lib/rate-limit";
import { priceCart } from "@/lib/orders";
import { cartLineSchema } from "@/lib/validation";
import { z } from "zod";

export const dynamic = "force-dynamic";

const bodySchema = z.object({ items: z.array(cartLineSchema).max(50) });

export const POST = handler(async (req: Request) => {
  enforce(`quote:${clientIp(req)}`, 60, 60_000);

  const { items } = bodySchema.parse(await readJson(req));
  if (items.length === 0) {
    return ok({ lines: [], subtotal: 0, shipping: 0, discount: 0, total: 0 });
  }

  return ok(await priceCart(items));
});

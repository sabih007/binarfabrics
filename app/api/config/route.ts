/* ==========================================================================
   GET /api/config — which optional store features are switched on.

   The website reads this from `NEXT_PUBLIC_*` at build time, but the mobile app
   is built separately and cannot: it has to ask at runtime whether to offer the
   card option at checkout. Nothing here is secret — only whether a feature is
   configured, never the key that configures it.
   ========================================================================== */

import { handler, ok } from "@/lib/api";
import { env } from "@/lib/env";
import { FREE_SHIPPING_AT, SHIPPING_FEE } from "@/lib/products";

export const dynamic = "force-dynamic";

export const GET = handler(async () =>
  ok({
    stripeEnabled: env.stripeEnabled,
    freeShippingAt: FREE_SHIPPING_AT,
    shippingFee: SHIPPING_FEE,
    currency: "PKR",
  })
);

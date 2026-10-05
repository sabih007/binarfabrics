/* ==========================================================================
   POST /api/checkout

   Body: { items:[{slug,qty,color?,size?}], customerName, phone, email?,
           address, city, postalCode?, notes?, paymentMethod:"COD"|"CARD"|"BANK" }

   COD  -> order is created, confirmed, stock reserved, emails sent.
   BANK -> order is created PENDING/UNPAID with stock reserved; the shop
           confirms it by hand once the transfer lands.
   CARD -> order is created as PENDING/UNPAID and a Stripe Checkout URL is
           returned; the webhook confirms it once payment succeeds.
   ========================================================================== */

import { clientIp, handler, ok, readJson, HttpError } from "@/lib/api";
import { enforce } from "@/lib/rate-limit";
import { prisma } from "@/lib/db";
import { createOrder, priceCart, restock } from "@/lib/orders";
import { checkoutSchema } from "@/lib/validation";
import { createCheckoutSession } from "@/lib/stripe";
import { sendOrderConfirmation, sendOrderNotification } from "@/lib/mail";
import { env } from "@/lib/env";
import { toApiOrder } from "@/lib/serialize";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export const POST = handler(async (req: Request) => {
  // Order placement is expensive and writes stock; keep it tight.
  enforce(`checkout:${clientIp(req)}`, 10, 10 * 60_000);

  const input = checkoutSchema.parse(await readJson(req));

  if (input.paymentMethod === "CARD" && !env.stripeEnabled) {
    throw new HttpError(
      503,
      "Card payments aren't available yet. Please choose cash on delivery.",
      "STRIPE_DISABLED"
    );
  }

  // Prices come from the database, never from the request body.
  const cart = await priceCart(input.items);
  const orderId = await createOrder({ ...input, cart });

  const order = await prisma.order.findUniqueOrThrow({
    where: { id: orderId },
    include: { items: true },
  });

  // ---- card: hand back a Stripe Checkout URL ----------------------------
  if (input.paymentMethod === "CARD") {
    try {
      const session = await createCheckoutSession({
        orderId: order.id,
        orderNumber: order.number,
        cart,
        email: order.email,
      });
      await prisma.order.update({
        where: { id: order.id },
        data: { stripeSessionId: session.id },
      });
      return ok({ order: toApiOrder(order), payment: { provider: "stripe", url: session.url } }, { status: 201 });
    } catch (err) {
      // Never leave stock reserved against an order the customer can't pay for.
      await restock(order.id);
      await prisma.order.update({
        where: { id: order.id },
        data: { status: "CANCELLED", paymentStatus: "FAILED" },
      });
      throw err;
    }
  }

  /* ---- bank transfer -----------------------------------------------------
     The money arrives out of band, so the order stays PENDING and UNPAID
     until someone sees it in the account and marks it paid in the admin.
     Stock is still reserved — the customer has committed, and an order that
     sells out between placing and paying would be worse than a held piece. */
  if (input.paymentMethod === "BANK") {
    const placed = await prisma.order.findUniqueOrThrow({
      where: { id: order.id },
      include: { items: true },
    });

    const bankMail = {
      number: placed.number,
      customerName: placed.customerName,
      email: placed.email,
      phone: placed.phone,
      address: placed.address,
      city: placed.city,
      paymentMethod: placed.paymentMethod,
      subtotal: placed.subtotal,
      shipping: placed.shipping,
      total: placed.total,
      items: placed.items.map((i) => ({ name: i.name, qty: i.qty, price: i.price })),
    };
    await Promise.allSettled([sendOrderConfirmation(bankMail), sendOrderNotification(bankMail)]);

    return ok({ order: toApiOrder(placed), payment: { provider: "bank" } }, { status: 201 });
  }

  // ---- cash on delivery: done, subject to a phone confirmation ----------
  const confirmed = await prisma.order.update({
    where: { id: order.id },
    data: { status: "CONFIRMED" },
    include: { items: true },
  });

  // Fire-and-forget: a mail failure must not fail a saved order.
  const mail = {
    number: confirmed.number,
    customerName: confirmed.customerName,
    email: confirmed.email,
    phone: confirmed.phone,
    address: confirmed.address,
    city: confirmed.city,
    paymentMethod: confirmed.paymentMethod,
    subtotal: confirmed.subtotal,
    shipping: confirmed.shipping,
    total: confirmed.total,
    items: confirmed.items.map((i) => ({ name: i.name, qty: i.qty, price: i.price })),
  };
  await Promise.allSettled([sendOrderConfirmation(mail), sendOrderNotification(mail)]);

  return ok({ order: toApiOrder(confirmed), payment: { provider: "cod" } }, { status: 201 });
});

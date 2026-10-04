/* ==========================================================================
   POST /api/webhooks/stripe

   The only place a card order becomes PAID. The browser returning to
   /checkout/success proves nothing — this signed event does.

   Local testing:
     stripe listen --forward-to localhost:3000/api/webhooks/stripe
   ========================================================================== */

import type Stripe from "stripe";
import { handler, ok } from "@/lib/api";
import { prisma } from "@/lib/db";
import { verifyWebhook } from "@/lib/stripe";
import { restock } from "@/lib/orders";
import { sendOrderConfirmation, sendOrderNotification } from "@/lib/mail";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** Stripe signs the raw bytes, so the body must not be parsed as JSON first. */
export const POST = handler(async (req: Request) => {
  const payload = await req.text();
  const event = verifyWebhook(payload, req.headers.get("stripe-signature"));

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      // Asynchronous methods can complete the session before funds clear.
      if (session.payment_status === "paid") await markPaid(session);
      break;
    }
    case "checkout.session.async_payment_succeeded": {
      await markPaid(event.data.object as Stripe.Checkout.Session);
      break;
    }
    case "checkout.session.expired":
    case "checkout.session.async_payment_failed": {
      await markFailed(event.data.object as Stripe.Checkout.Session);
      break;
    }
    default:
      // Everything else is acknowledged and ignored, so Stripe stops retrying.
      break;
  }

  return ok({ received: true });
});

function findOrderId(session: Stripe.Checkout.Session): string | null {
  return session.metadata?.orderId ?? session.client_reference_id ?? null;
}

async function markPaid(session: Stripe.Checkout.Session) {
  const orderId = findOrderId(session);
  if (!orderId) return;

  const order = await prisma.order.findUnique({ where: { id: orderId }, include: { items: true } });
  if (!order) return;
  // Stripe retries on any non-2xx, so this handler must be idempotent.
  if (order.paymentStatus === "PAID") return;

  const paid = await prisma.order.update({
    where: { id: orderId },
    data: {
      paymentStatus: "PAID",
      status: "CONFIRMED",
      stripePaymentIntentId:
        typeof session.payment_intent === "string"
          ? session.payment_intent
          : (session.payment_intent?.id ?? null),
    },
    include: { items: true },
  });

  const mail = {
    number: paid.number,
    customerName: paid.customerName,
    email: paid.email ?? session.customer_details?.email ?? null,
    phone: paid.phone,
    address: paid.address,
    city: paid.city,
    paymentMethod: paid.paymentMethod,
    subtotal: paid.subtotal,
    shipping: paid.shipping,
    total: paid.total,
    items: paid.items.map((i) => ({ name: i.name, qty: i.qty, price: i.price })),
  };
  await Promise.allSettled([sendOrderConfirmation(mail), sendOrderNotification(mail)]);
}

async function markFailed(session: Stripe.Checkout.Session) {
  const orderId = findOrderId(session);
  if (!orderId) return;

  const order = await prisma.order.findUnique({ where: { id: orderId } });
  // Don't touch an order that already went through, and don't restock twice.
  if (!order || order.paymentStatus === "PAID" || order.status === "CANCELLED") return;

  await restock(order.id);
  await prisma.order.update({
    where: { id: order.id },
    data: { status: "CANCELLED", paymentStatus: "FAILED" },
  });
}

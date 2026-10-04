/* ==========================================================================
   Stripe (optional).

   Card payments are off unless STRIPE_SECRET_KEY is set — the checkout page
   then offers cash on delivery only. Stripe treats PKR as a two-decimal
   currency, so rupee amounts are multiplied by 100 on the way out.
   ========================================================================== */

import Stripe from "stripe";
import { env } from "./env";
import { HttpError } from "./api";
import type { PricedCart } from "./orders";

let client: Stripe | null = null;

export function stripe(): Stripe {
  if (!env.stripeEnabled) {
    throw new HttpError(
      503,
      "Card payments aren't set up yet. Please choose cash on delivery.",
      "STRIPE_DISABLED"
    );
  }
  client ??= new Stripe(env.stripeSecret);
  return client;
}

const CURRENCY = "pkr";

/** Rupees -> the smallest unit Stripe expects for this currency. */
const toMinorUnits = (rupees: number) => Math.round(rupees * 100);

export async function createCheckoutSession(args: {
  orderId: string;
  orderNumber: string;
  cart: PricedCart;
  email?: string | null;
}) {
  const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = args.cart.lines.map((line) => {
    const variant = [line.size ? `Size ${line.size}` : null, line.color ? `Colour ${line.color}` : null]
      .filter(Boolean)
      .join(" / ");

    return {
      quantity: line.qty,
      price_data: {
        currency: CURRENCY,
        unit_amount: toMinorUnits(line.price),
        product_data: {
          name: line.name,
          ...(variant ? { description: variant } : {}),
        },
      },
    };
  });

  if (args.cart.shipping > 0) {
    lineItems.push({
      quantity: 1,
      price_data: {
        currency: CURRENCY,
        unit_amount: toMinorUnits(args.cart.shipping),
        product_data: { name: "Delivery" },
      },
    });
  }

  const session = await stripe().checkout.sessions.create({
    mode: "payment",
    line_items: lineItems,
    // Referenced both ways so the webhook can still find the order if one
    // of the two is ever missing from the event payload.
    client_reference_id: args.orderId,
    metadata: { orderId: args.orderId, orderNumber: args.orderNumber },
    customer_email: args.email ?? undefined,
    success_url: `${env.siteUrl}/checkout/success?order=${encodeURIComponent(args.orderNumber)}`,
    cancel_url: `${env.siteUrl}/checkout?cancelled=1`,
  });

  if (!session.url) throw new HttpError(502, "Stripe did not return a payment link.");
  return { id: session.id, url: session.url };
}

/** Verifies the signature — an unsigned body must never mark an order paid. */
export function verifyWebhook(payload: string, signature: string | null): Stripe.Event {
  if (!env.stripeWebhookSecret) {
    throw new HttpError(503, "Webhook secret is not configured.", "NO_WEBHOOK_SECRET");
  }
  if (!signature) throw new HttpError(400, "Missing stripe-signature header.");
  try {
    return stripe().webhooks.constructEvent(payload, signature, env.stripeWebhookSecret);
  } catch (err) {
    throw new HttpError(400, `Invalid webhook signature: ${(err as Error).message}`);
  }
}

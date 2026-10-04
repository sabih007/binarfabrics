import Link from "next/link";
import type { Metadata } from "next";
import OrderConfirmation from "./OrderConfirmation";

export const metadata: Metadata = {
  title: "Order confirmed",
  robots: { index: false, follow: false },
};

/**
 * Landing page for a completed order. COD arrives here straight from the
 * checkout form; a card payment arrives via Stripe's success_url, which is
 * configured in lib/stripe.ts to carry `?order=<number>`.
 */
export default async function CheckoutSuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ order?: string }>;
}) {
  const { order } = await searchParams;

  if (!order) {
    return (
      <section className="section">
        <div className="container checkout__empty">
          <h2>No order to show</h2>
          <p>This page needs an order number. If you&apos;ve just ordered, check your messages for the confirmation.</p>
          <Link className="btn btn--primary" href="/shop">
            Back to the shop
          </Link>
        </div>
      </section>
    );
  }

  return (
    <section className="section">
      <div className="container">
        <OrderConfirmation orderNumber={order} />
      </div>
    </section>
  );
}

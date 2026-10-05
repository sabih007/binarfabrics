"use client";

import Link from "next/link";
import { BANK, bankEnabled, formatIban } from "@/lib/bank";
import { useEffect, useState } from "react";
import { useStore } from "@/components/StoreProvider";
import { money } from "@/lib/products";
import { apiGet } from "@/lib/client";

interface Order {
  number: string;
  status: string;
  paymentMethod: "COD" | "CARD" | "BANK";
  paymentStatus: string;
  customerName: string;
  phone: string;
  address: string;
  city: string;
  postalCode: string | null;
  subtotal: number;
  shipping: number;
  discount: number;
  total: number;
  items: { id: string; name: string; price: number; qty: number; lineTotal: number }[];
  createdAt: string;
}

const PAY_LABEL: Record<string, string> = {
  COD: "Cash on delivery",
  CARD: "Card",
  BANK: "Bank transfer",
};

const STATUS_COPY: Record<string, string> = {
  PENDING: "Awaiting payment",
  CONFIRMED: "Confirmed",
  PROCESSING: "Being prepared",
  SHIPPED: "On its way",
  DELIVERED: "Delivered",
  CANCELLED: "Cancelled",
};

export default function OrderConfirmation({ orderNumber }: { orderNumber: string }) {
  const { cart, clearCart } = useStore();
  const [order, setOrder] = useState<Order | null>(null);
  const [state, setState] = useState<"loading" | "ready" | "nodetails">("loading");

  /**
   * A card payment leaves the site and comes back here, so the bag is only
   * emptied once we know an order exists. COD already cleared it before
   * navigating; this covers the Stripe return trip.
   */
  useEffect(() => {
    if (cart.length > 0) clearCart();
    // Intentionally runs once on mount — clearing is idempotent and must not
    // re-fire as the cart empties.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /**
   * The lookup API needs the phone as a shared secret. Checkout stashed it in
   * sessionStorage; without it (a reopened link, another device) we still
   * confirm the order number but can't show its contents.
   */
  useEffect(() => {
    let stored: { number?: string; phone?: string } = {};
    try {
      stored = JSON.parse(sessionStorage.getItem("binar_last_order") ?? "{}");
    } catch {}

    if (!stored.phone || stored.number !== orderNumber) {
      setState("nodetails");
      return;
    }

    let cancelled = false;
    apiGet<{ order: Order }>(
      `/api/orders/${encodeURIComponent(orderNumber)}?phone=${encodeURIComponent(stored.phone)}`
    )
      .then((d) => {
        if (cancelled) return;
        setOrder(d.order);
        setState("ready");
      })
      .catch(() => {
        if (!cancelled) setState("nodetails");
      });

    return () => {
      cancelled = true;
    };
  }, [orderNumber]);

  return (
    <div className="confirm">
      <div className="confirm__mark" aria-hidden="true">
        ✓
      </div>
      <span className="eyebrow">Order placed</span>
      <h1>Thank you{order ? `, ${order.customerName.split(" ")[0]}` : ""}</h1>
      <p className="confirm__lead">
        Your order <strong>{orderNumber}</strong> is in. We&apos;ll call to confirm before dispatch
        — usually within one working day.
      </p>

      {state === "loading" && <p className="confirm__pending">Fetching your order…</p>}

      {state === "nodetails" && (
        <p className="confirm__pending">
          Keep <strong>{orderNumber}</strong> handy — quote it along with your phone number and we
          can pull your order up any time.
        </p>
      )}

      {order && (
        <div className="confirm__card">
          <div className="confirm__meta">
            <div>
              <span>Status</span>
              <strong>{STATUS_COPY[order.status] ?? order.status}</strong>
            </div>
            <div>
              <span>Payment</span>
              <strong>
                {PAY_LABEL[order.paymentMethod]}
                {order.paymentStatus === "PAID" ? " · paid" : ""}
              </strong>
            </div>
            <div>
              <span>Delivering to</span>
              <strong>
                {order.address}, {order.city}
                {order.postalCode ? ` ${order.postalCode}` : ""}
              </strong>
            </div>
            <div>
              <span>Phone</span>
              <strong>{order.phone}</strong>
            </div>
          </div>

          <div className="co-lines">
            {order.items.map((item) => (
              <div className="co-line co-line--plain" key={item.id}>
                <div>
                  <div className="co-line__name">{item.name}</div>
                  <div className="co-line__meta">
                    {money(item.price)} · Qty {item.qty}
                  </div>
                </div>
                <div className="co-line__price">{money(item.lineTotal)}</div>
              </div>
            ))}
          </div>

          <div className="co-row">
            <span>Subtotal</span>
            <span>{money(order.subtotal)}</span>
          </div>
          <div className="co-row">
            <span>Delivery</span>
            <span>{order.shipping ? money(order.shipping) : "Free"}</span>
          </div>
          {!!order.discount && (
            <div className="co-row">
              <span>Discount</span>
              <span>−{money(order.discount)}</span>
            </div>
          )}
          <div className="co-row co-row--total">
            <span>
              {order.paymentMethod === "COD"
                ? "Due on delivery"
                : order.paymentMethod === "BANK"
                  ? order.paymentStatus === "PAID" ? "Paid" : "Awaiting your transfer"
                  : "Paid"}
            </span>
            <span>{money(order.total)}</span>
          </div>

          {/* The order number doubles as the transfer reference — it is how
              an incoming payment gets matched back to this order. */}
          {order.paymentMethod === "BANK" && order.paymentStatus !== "PAID" && bankEnabled && (
            <div className="bank-box">
              <h3>Transfer {money(order.total)} to complete your order</h3>
              <dl>
                <div>
                  <dt>Bank</dt>
                  <dd>{BANK.name}</dd>
                </div>
                <div>
                  <dt>Account title</dt>
                  <dd>{BANK.title}</dd>
                </div>
                <div>
                  <dt>IBAN</dt>
                  <dd className="bank-box__iban">{formatIban(BANK.iban)}</dd>
                </div>
                {BANK.account && (
                  <div>
                    <dt>Account number</dt>
                    <dd className="bank-box__iban">{BANK.account}</dd>
                  </div>
                )}
                <div>
                  <dt>Reference</dt>
                  <dd className="bank-box__iban">{order.number}</dd>
                </div>
              </dl>
              <p>
                Put <strong>{order.number}</strong> in the transfer reference so we can match it.
                We&apos;ll confirm and dispatch once it arrives — usually the same working day.
              </p>
            </div>
          )}
        </div>
      )}

      <div className="confirm__actions">
        <Link className="btn btn--primary" href="/shop">
          Continue shopping
        </Link>
        <Link className="btn btn--ghost" href="/contact">
          Need help with this order?
        </Link>
      </div>
    </div>
  );
}

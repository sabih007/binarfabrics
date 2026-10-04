"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { useStore } from "@/components/StoreProvider";
import Swatch from "@/components/Swatch";
import { money } from "@/lib/products";
import { ApiError, apiGet, apiSend } from "@/lib/client";

/** Server-priced cart. The client total is a preview; this is authoritative. */
interface Quote {
  lines: {
    slug: string;
    name: string;
    price: number;
    qty: number;
    color: string | null;
    size: string | null;
    lineTotal: number;
  }[];
  subtotal: number;
  shipping: number;
  discount: number;
  total: number;
}

interface CheckoutResult {
  order: { number: string; total: number };
  payment: { provider: "cod" | "stripe"; url?: string };
}

type Pay = "COD" | "CARD";

export default function CheckoutForm({ cancelled }: { cancelled: boolean }) {
  const router = useRouter();
  const { cart, hydrated, productById, clearCart, showToast } = useStore();

  const [quote, setQuote] = useState<Quote | null>(null);
  const [quoteError, setQuoteError] = useState<string | null>(null);
  const [cardEnabled, setCardEnabled] = useState(false);
  const [pay, setPay] = useState<Pay>("COD");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fields, setFields] = useState<Record<string, string>>({});

  // Card availability is a server setting; the option stays hidden without it.
  useEffect(() => {
    apiGet<{ stripeEnabled: boolean }>("/api/config")
      .then((c) => setCardEnabled(c.stripeEnabled))
      .catch(() => setCardEnabled(false));
  }, []);

  /**
   * Re-price on the server whenever the bag changes. This is what catches a
   * price change or a sold-out item between adding to the bag and paying.
   */
  const items = cart.map((l) => ({ slug: l.id, qty: l.qty, color: l.color, size: l.size }));
  const itemsKey = JSON.stringify(items);

  useEffect(() => {
    if (!hydrated || cart.length === 0) {
      setQuote(null);
      return;
    }

    let cancelledRequest = false;
    setQuoteError(null);

    apiSend<Quote>("/api/orders", "POST", { items: JSON.parse(itemsKey) })
      .then((q) => {
        if (!cancelledRequest) setQuote(q);
      })
      .catch((err) => {
        if (cancelledRequest) return;
        setQuoteError(
          err instanceof ApiError ? err.message : "Couldn't price your bag. Please refresh."
        );
      });

    return () => {
      cancelledRequest = true;
    };
  }, [hydrated, cart.length, itemsKey]);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setFields({});

    const form = new FormData(e.currentTarget);
    const phone = String(form.get("phone") ?? "");

    try {
      const result = await apiSend<CheckoutResult>("/api/checkout", "POST", {
        items,
        customerName: String(form.get("customerName") ?? ""),
        phone,
        email: String(form.get("email") ?? ""),
        address: String(form.get("address") ?? ""),
        city: String(form.get("city") ?? ""),
        postalCode: String(form.get("postalCode") ?? ""),
        notes: String(form.get("notes") ?? ""),
        paymentMethod: pay,
      });

      // The success page needs the phone to read the order back — the lookup
      // API treats it as the shared secret. sessionStorage keeps it out of the
      // URL and out of the browser history.
      try {
        sessionStorage.setItem(
          "binar_last_order",
          JSON.stringify({ number: result.order.number, phone })
        );
      } catch {}

      if (result.payment.provider === "stripe" && result.payment.url) {
        // Bag is deliberately kept until payment succeeds, so a cancelled
        // payment returns the customer to a bag that still has their items.
        window.location.href = result.payment.url;
        return;
      }

      clearCart();
      showToast(`Order ${result.order.number} confirmed`);
      router.push(`/checkout/success?order=${encodeURIComponent(result.order.number)}`);
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
        if (err.fields) setFields(err.fields);
      } else {
        setError("Couldn't place your order. Please try again.");
      }
      setBusy(false);
    }
  }

  const err = (key: string) =>
    fields[key] ? <span className="field__error">{fields[key]}</span> : null;

  // ---- empty / loading states -------------------------------------------

  if (!hydrated) {
    return <p className="checkout__placeholder">Loading your bag…</p>;
  }

  if (cart.length === 0) {
    return (
      <div className="checkout__empty">
        <h2>Your bag is empty</h2>
        <p>Add a few pieces and they&apos;ll show up here, ready to order.</p>
        <Link className="btn btn--primary" href="/shop">
          Browse the collection
        </Link>
      </div>
    );
  }

  // Totals fall back to the client preview until the server answers.
  const subtotal = quote?.subtotal ?? 0;
  const shipping = quote?.shipping ?? 0;
  const total = quote?.total ?? 0;

  return (
    <div className="checkout">
      <form className="form checkout__form" onSubmit={onSubmit} noValidate>
        {cancelled && (
          <div className="notice notice--warn">
            Payment was cancelled, so nothing has been charged. Your bag is still here whenever
            you&apos;re ready.
          </div>
        )}
        {error && <div className="notice notice--error">{error}</div>}
        {quoteError && <div className="notice notice--error">{quoteError}</div>}

        <h2 className="checkout__legend">Delivery details</h2>

        <div className="form__row">
          <div className="field">
            <label htmlFor="customerName">Full name</label>
            <input id="customerName" name="customerName" type="text" required autoComplete="name" placeholder="Your name" />
            {err("customerName")}
          </div>
          <div className="field">
            <label htmlFor="phone">Phone</label>
            <input id="phone" name="phone" type="tel" required autoComplete="tel" placeholder="03XX-XXXXXXX" />
            {err("phone")}
          </div>
        </div>

        <div className="field">
          <label htmlFor="email">Email (optional)</label>
          <input id="email" name="email" type="email" autoComplete="email" placeholder="you@example.com" />
          <span className="field__hint">We&apos;ll email your order confirmation if you add one.</span>
          {err("email")}
        </div>

        <div className="field">
          <label htmlFor="address">Street address</label>
          <input id="address" name="address" type="text" required autoComplete="street-address" placeholder="House / flat, street, area" />
          {err("address")}
        </div>

        <div className="form__row">
          <div className="field">
            <label htmlFor="city">City</label>
            <input id="city" name="city" type="text" required autoComplete="address-level2" placeholder="e.g. Karachi" />
            {err("city")}
          </div>
          <div className="field">
            <label htmlFor="postalCode">Postal code (optional)</label>
            <input id="postalCode" name="postalCode" type="text" autoComplete="postal-code" placeholder="e.g. 75500" />
            {err("postalCode")}
          </div>
        </div>

        <div className="field">
          <label htmlFor="notes">Delivery notes (optional)</label>
          <textarea id="notes" name="notes" placeholder="A landmark, a better time to call, anything that helps us deliver." />
          {err("notes")}
        </div>

        <h2 className="checkout__legend">Payment</h2>

        <div className="pay">
          <label className={`pay__option${pay === "COD" ? " is-active" : ""}`}>
            <input type="radio" name="paymentMethod" value="COD" checked={pay === "COD"} onChange={() => setPay("COD")} />
            <span>
              <strong>Cash on delivery</strong>
              <small>Pay the courier when your order arrives. Available nationwide.</small>
            </span>
          </label>

          {cardEnabled && (
            <label className={`pay__option${pay === "CARD" ? " is-active" : ""}`}>
              <input type="radio" name="paymentMethod" value="CARD" checked={pay === "CARD"} onChange={() => setPay("CARD")} />
              <span>
                <strong>Debit / credit card</strong>
                <small>You&apos;ll be taken to our secure payment page to finish.</small>
              </span>
            </label>
          )}
        </div>
        {err("paymentMethod")}

        <div>
          <button className="btn btn--green btn--block" type="submit" disabled={busy || !quote}>
            {busy
              ? "Placing your order…"
              : pay === "CARD"
                ? `Continue to payment — ${money(total)}`
                : `Place order — ${money(total)}`}
          </button>
          <p className="checkout__terms">
            By placing this order you agree to our delivery and exchange policy.
          </p>
        </div>
      </form>

      <aside className="checkout__summary" aria-label="Order summary">
        <h2 className="checkout__legend">Your order</h2>

        <div className="co-lines">
          {(quote?.lines ?? []).map((line) => {
            const p = productById(line.slug);
            return (
              <div className="co-line" key={`${line.slug}|${line.color ?? ""}|${line.size ?? ""}`}>
                <Swatch
                  pattern={p?.pattern ?? "plain"}
                  colors={line.color ? [line.color, ...(p?.colors ?? []).filter((c) => c !== line.color)] : (p?.colors ?? [])}
                  image={p?.image}
                />
                <div>
                  <div className="co-line__name">{line.name}</div>
                  <div className="co-line__meta">
                    {[p?.fabric, line.size ? `Size ${line.size}` : null, `Qty ${line.qty}`]
                      .filter(Boolean)
                      .join(" · ")}
                  </div>
                </div>
                <div className="co-line__price">{money(line.lineTotal)}</div>
              </div>
            );
          })}
          {!quote && <div className="co-line__pending">Pricing your bag…</div>}
        </div>

        <div className="co-row">
          <span>Subtotal</span>
          <span>{money(subtotal)}</span>
        </div>
        <div className="co-row">
          <span>Delivery</span>
          <span>{shipping ? money(shipping) : "Free"}</span>
        </div>
        {!!quote?.discount && (
          <div className="co-row">
            <span>Discount</span>
            <span>−{money(quote.discount)}</span>
          </div>
        )}
        <div className="co-row co-row--total">
          <span>Total</span>
          <span>{money(total)}</span>
        </div>

        <p className="co-note">
          Prices are confirmed against live stock the moment you order, so this is what you pay.
        </p>
      </aside>
    </div>
  );
}

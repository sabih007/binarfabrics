"use client";

import Link from "next/link";
import { FREE_SHIPPING_AT, money } from "@/lib/products";
import { useStore } from "./StoreProvider";
import { BagIcon, CloseIcon } from "./Icons";
import Swatch from "./Swatch";

export default function CartDrawer() {
  const { cart, cartOpen, closeCart, setQty, totals, productById } = useStore();
  const remaining = Math.max(0, FREE_SHIPPING_AT - totals.subtotal);
  const pct = Math.min(100, Math.round((totals.subtotal / FREE_SHIPPING_AT) * 100));

  return (
    <div className={`cart-drawer${cartOpen ? " is-open" : ""}`} aria-hidden={!cartOpen}>
      <div className="cart-drawer__backdrop" onClick={closeCart} />
      <aside className="cart-drawer__panel" aria-label="Shopping bag">
        <div className="cart-drawer__head">
          <h3>
            Your Bag{" "}
            {totals.count > 0 && (
              <span style={{ color: "var(--ink-3)", fontSize: 14, fontFamily: "var(--sans)" }}>
                ({totals.count})
              </span>
            )}
          </h3>
          <button className="icon-btn" onClick={closeCart} aria-label="Close cart">
            <CloseIcon />
          </button>
        </div>

        <div className="cart-drawer__body">
          {cart.length === 0 ? (
            <div className="cart-drawer__empty">
              <BagIcon />
              <p>Your bag is empty.</p>
              <p style={{ marginTop: 16 }}>
                <Link className="btn btn--primary btn--sm" href="/shop" onClick={closeCart}>
                  Start shopping
                </Link>
              </p>
            </div>
          ) : (
            cart.map((l) => {
              const p = productById(l.id);
              // The product is still being fetched — hold the row's space
              // rather than dropping the line out from under the customer.
              if (!p) {
                return (
                  <div className="cart-item" key={l.key}>
                    <div className="swatch" />
                    <div>
                      <div className="cart-item__meta">Loading…</div>
                    </div>
                    <div />
                  </div>
                );
              }

              const meta = [p.fabric, l.size ? `Size ${l.size}` : null, l.color ? "Colour selected" : null]
                .filter(Boolean)
                .join(" · ");
              const atMax = l.qty >= p.stock;

              return (
                <div className="cart-item" key={l.key}>
                  <Link href={`/product/${p.id}`} onClick={closeCart}>
                    <Swatch
                      pattern={p.pattern}
                      colors={l.color ? [l.color, ...p.colors.filter((c) => c !== l.color)] : p.colors}
                      image={p.image}
                    />
                  </Link>
                  <div>
                    <div className="cart-item__title">{p.name}</div>
                    <div className="cart-item__meta">{meta}</div>
                    <div className="qty">
                      <button onClick={() => setQty(l.key, l.qty - 1)} aria-label="Decrease">
                        −
                      </button>
                      <span>{l.qty}</span>
                      <button
                        onClick={() => setQty(l.key, l.qty + 1)}
                        aria-label="Increase"
                        disabled={atMax}
                        title={atMax ? "No more stock available" : undefined}
                      >
                        +
                      </button>
                    </div>
                    {!p.inStock && (
                      <div className="cart-item__meta" style={{ color: "var(--red, #b91c1c)" }}>
                        Out of stock
                      </div>
                    )}
                  </div>
                  <div>
                    <div className="cart-item__price">{money(p.price * l.qty)}</div>
                    <button className="cart-item__remove" onClick={() => setQty(l.key, 0)}>
                      Remove
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {cart.length > 0 && (
          <div className="cart-drawer__foot">
            <div style={{ fontSize: 13 }}>
              {remaining > 0 ? (
                <>
                  Add <strong>{money(remaining)}</strong> more for free delivery
                </>
              ) : (
                <strong style={{ color: "var(--green)" }}>You&apos;ve unlocked free delivery ✓</strong>
              )}
            </div>
            <div className="progress">
              <span style={{ width: `${pct}%` }} />
            </div>
            <div className="cart-drawer__row">
              <span>Subtotal</span>
              <span>{money(totals.subtotal)}</span>
            </div>
            <div className="cart-drawer__row">
              <span>Delivery</span>
              <span>{totals.shipping ? money(totals.shipping) : "Free"}</span>
            </div>
            <div className="cart-drawer__row cart-drawer__row--total">
              <span>Total</span>
              <span>{money(totals.total)}</span>
            </div>
            <Link className="btn btn--green btn--block" href="/checkout" onClick={closeCart}>
              Proceed to checkout
            </Link>
            <div className="cart-drawer__note">
              Cash on delivery accepted nationwide
            </div>
          </div>
        )}
      </aside>
    </div>
  );
}

export function Toast() {
  const { toast, openCart } = useStore();
  return (
    <div className={`toast${toast ? " is-visible" : ""}`} role="status">
      {toast?.msg}
      {toast?.link &&
        (toast.link.action === "openCart" ? (
          <a
            href="#"
            onClick={(e) => {
              e.preventDefault();
              openCart();
            }}
          >
            {toast.link.label}
          </a>
        ) : (
          <Link href={toast.link.href ?? "/"}>{toast.link.label}</Link>
        ))}
    </div>
  );
}

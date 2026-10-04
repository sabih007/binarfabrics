"use client";

import Link from "next/link";
import { useState } from "react";
import { catName, money, type Product } from "@/lib/products";
import { useStore } from "@/components/StoreProvider";
import { Price } from "@/components/ProductCard";
import Swatch from "@/components/Swatch";
import { CardIcon, RefreshIcon, TruckIcon } from "@/components/Icons";

export default function ProductDetail({ product: p }: { product: Product }) {
  const { addToCart, toggleWishlist, isWished } = useStore();
  const [view, setView] = useState(0);
  const [color, setColor] = useState(p.colors[0]);
  const [qty, setQty] = useState(1);

  // The admin can set sizes per product; otherwise fall back to the sensible
  // default for the category.
  const sizes =
    p.sizes.length > 0
      ? p.sizes
      : p.category === "home"
        ? ["Single", "Double", "King"]
        : p.category === "kids"
          ? ["2–4 Y", "5–7 Y", "8–10 Y", "11–12 Y"]
          : null;
  const [size, setSize] = useState<string | null>(sizes ? sizes[0] : null);

  const colorsFor = (c: string) => [c, ...p.colors.filter((x) => x !== c)];

  // Real photos when the product has them, cover image first. Otherwise the
  // generated "views" stand in for a photo shoot.
  const photos = [...(p.image ? [p.image] : []), ...p.images.filter((src) => src !== p.image)];
  const views: { pattern: Product["pattern"]; colors: string[]; image?: string }[] =
    photos.length > 0
      ? photos.map((src) => ({ pattern: p.pattern, colors: colorsFor(color), image: src }))
      : [
          { pattern: p.pattern, colors: colorsFor(color) },
          { pattern: "plain", colors: colorsFor(color) },
          { pattern: p.pattern, colors: [...colorsFor(color)].reverse() },
          { pattern: "stripe", colors: colorsFor(color) },
        ];
  const current = views[Math.min(view, views.length - 1)];

  const stars = "★".repeat(Math.round(p.rating)) + "☆".repeat(5 - Math.round(p.rating));
  const isUnstitched = p.category !== "home";
  const perUnit = p.category === "home" ? "Set" : p.pieces === 1 ? "Suit length (4.5 m)" : `${p.pieces}-piece suit`;
  const includes = !isUnstitched ? p.description.split(".")[0]
    : p.pieces === 3 ? "Shirt 3 m, Dupatta 2.5 m, Trouser 2.5 m"
    : p.pieces === 2 ? "Shirt 3 m, Trouser 2.5 m" : "4.5 m unstitched suit length";
  const wished = isWished(p.id);
  // Never let the box offer more than the shop can ship.
  const maxQty = Math.max(1, Math.min(10, p.stock));

  return (
    <div className="product">
      <div className="gallery">
        <div className="gallery__thumbs">
          {views.map((v, i) => (
            <button key={i} className={i === view ? "is-active" : ""} onClick={() => setView(i)} aria-label={`View ${i + 1}`}>
              <Swatch pattern={v.pattern} colors={v.colors} image={v.image} />
            </button>
          ))}
        </div>
        <div className="gallery__main">
          <Swatch pattern={current.pattern} colors={current.colors} image={current.image} alt={p.name} label={p.fabric} />
        </div>
      </div>

      <div className="pd">
        <div className="pd__cat">{p.categoryName || catName(p.category)} · {p.fabric} · {p.collection}</div>
        <h1>{p.name}</h1>
        <Price product={p} />
        <div className="pd__tax">Inclusive of all taxes · {perUnit}</div>
        <div className="pd__rating"><span className="stars">{stars}</span><span>{p.rating.toFixed(1)}</span><span style={{ color: "var(--ink-3)" }}>({p.reviews} reviews)</span></div>
        <p className="pd__desc">{p.description}</p>

        <div className="pd__opt">
          <div className="pd__opt-label">Colour <span>{p.colors.length} option{p.colors.length > 1 ? "s" : ""}</span></div>
          <div className="color-opts">
            {p.colors.map((c, i) => (
              <button key={c} className={`color-opt${c === color ? " is-active" : ""}`} style={{ background: c }} onClick={() => setColor(c)} aria-label={`Colour ${i + 1}`} />
            ))}
          </div>
        </div>

        {sizes && (
          <div className="pd__opt">
            <div className="pd__opt-label">Size <span>Select one</span></div>
            <div className="size-opts">
              {sizes.map((s) => <button key={s} className={`size-opt${s === size ? " is-active" : ""}`} onClick={() => setSize(s)}>{s}</button>)}
            </div>
          </div>
        )}

        <div className="pd__buy">
          <div className="qty">
            <button onClick={() => setQty((q) => Math.max(1, q - 1))} aria-label="Decrease">−</button>
            <span>{qty}</span>
            <button onClick={() => setQty((q) => Math.min(maxQty, q + 1))} aria-label="Increase">+</button>
          </div>
          <button className="btn btn--primary" onClick={() => addToCart(p, qty, { color, size })} disabled={!p.inStock}>
            {p.inStock ? <>Add to bag — <span>{money(p.price * qty)}</span></> : "Sold out"}
          </button>
        </div>
        <button className="btn btn--outline btn--block" onClick={() => toggleWishlist(p.id, p)}>
          {wished ? "♥ Saved to wishlist" : "♡ Add to wishlist"}
        </button>
        <div className="pd__stock">
          {!p.inStock
            ? "Out of stock — check back soon"
            : p.badge === "low"
              ? `Only ${p.stock} left`
              : "In stock — ships in 1–2 working days"}
        </div>

        <ul className="pd__perks">
          <li><TruckIcon />Free delivery on orders above PKR 3,000</li>
          <li><CardIcon />Cash on delivery available nationwide</li>
          <li><RefreshIcon />7-day easy exchange</li>
        </ul>

        <div className="accordion">
          <details open>
            <summary>Details</summary>
            <div className="accordion__body">
              <ul>
                <li><strong>Fabric:</strong> {p.fabric}</li>
                <li><strong>Includes:</strong> {includes}</li>
                <li><strong>Collection:</strong> {p.collection}</li>
                <li><strong>Product code:</strong> {p.id.toUpperCase()}</li>
              </ul>
            </div>
          </details>
          <details>
            <summary>Care instructions</summary>
            <div className="accordion__body">
              <ul>
                <li>Dry clean recommended for first wash</li>
                <li>Gentle machine wash in cold water thereafter</li>
                <li>Do not bleach; iron on reverse side</li>
                <li>Colours may vary slightly from screen</li>
              </ul>
            </div>
          </details>
          <details>
            <summary>Shipping &amp; returns</summary>
            <div className="accordion__body">
              Orders are dispatched within 1–2 working days and delivered across Pakistan in 2–5 days. Exchanges are accepted within 7 days of delivery for unused fabric with tags intact.{" "}
              <Link href="/contact#faq" style={{ textDecoration: "underline" }}>Read our full policy</Link>.
            </div>
          </details>
        </div>
      </div>
    </div>
  );
}

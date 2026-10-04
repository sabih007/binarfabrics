"use client";

import Link from "next/link";
import { catName, money, type Product } from "@/lib/products";
import { useStore } from "./StoreProvider";
import { HeartIcon } from "./Icons";
import Swatch from "./Swatch";

const BADGES: Record<string, { cls: string; text: string }> = {
  sale: { cls: "badge badge--sale", text: "Sale" },
  new: { cls: "badge badge--new", text: "New" },
  low: { cls: "badge badge--low", text: "Few left" },
};

export function Price({ product }: { product: Pick<Product, "price" | "oldPrice"> }) {
  return product.oldPrice ? (
    <div className="price">
      <span className="price--sale">{money(product.price)}</span>
      <del>{money(product.oldPrice)}</del>
    </div>
  ) : (
    <div className="price">
      <span>{money(product.price)}</span>
    </div>
  );
}

export default function ProductCard({ product: p }: { product: Product }) {
  const { addToCart, toggleWishlist, isWished } = useStore();
  const badge = !p.inStock ? { cls: "badge badge--low", text: "Sold out" } : p.badge ? BADGES[p.badge] : null;
  const wished = isWished(p.id);

  return (
    <article className="product-card reveal" data-id={p.id}>
      <div className="product-card__media">
        {badge && <span className={badge.cls}>{badge.text}</span>}
        <button
          className={`wish-btn${wished ? " is-active" : ""}`}
          onClick={() => toggleWishlist(p.id, p)}
          aria-label={wished ? "Remove from wishlist" : "Add to wishlist"}
        >
          <HeartIcon />
        </button>
        <Link href={`/product/${p.id}`} aria-label={p.name}>
          <Swatch pattern={p.pattern} colors={p.colors} image={p.image} alt={p.name} />
        </Link>
        <div className="product-card__quick">
          <button className="btn" onClick={() => addToCart(p)} disabled={!p.inStock}>
            {p.inStock ? "Add to bag" : "Sold out"}
          </button>
        </div>
      </div>
      <div className="product-card__body">
        <div className="product-card__cat">
          {p.categoryName || catName(p.category)} · {p.fabric}
        </div>
        <h3 className="product-card__title">
          <Link href={`/product/${p.id}`}>{p.name}</Link>
        </h3>
        <Price product={p} />
        <div className="product-card__colors">
          {p.colors.map((c) => (
            <span key={c} className="dot" style={{ background: c }} />
          ))}
        </div>
      </div>
    </article>
  );
}

/* ==========================================================================
   Database rows -> the plain shapes the UI consumes.

   Keeps `Date`s and Prisma decorations out of client components, and derives
   the "low" badge from live stock so it can never go stale.
   ========================================================================== */

import type {
  Category as DbCategory,
  Order as DbOrder,
  OrderItem as DbOrderItem,
  Product as DbProduct,
  Sale as DbSale,
  SaleItem as DbSaleItem,
} from "@prisma/client";
import type { Badge, Category, Pattern, Product } from "./types";

/** The public product shape. Identical to the UI's `Product`. */
export type ApiProduct = Product;
export type ApiCategory = Category;

type ProductRow = DbProduct & { category?: DbCategory | null };

export function toApiProduct(p: ProductRow): ApiProduct {
  const inStock = p.stock > 0;

  // Stock-driven badges win over the manual one: a nearly sold-out item must
  // not still be advertised as "new".
  const badge: Badge = !inStock || p.stock <= p.lowStockAt ? "low" : ((p.badge as Badge) ?? null);

  return {
    id: p.slug,
    slug: p.slug,
    name: p.name,
    category: p.category?.slug ?? "",
    categoryName: p.category?.name ?? "",
    collection: p.collection,
    fabric: p.fabric,
    price: p.price,
    oldPrice: p.oldPrice ?? null,
    pieces: p.pieces,
    pattern: (p.pattern as Pattern) ?? "plain",
    colors: p.colors,
    sizes: p.sizes,
    badge,
    rating: p.rating,
    reviews: p.reviews,
    description: p.description,
    image: p.image ?? undefined,
    images: p.images,
    inStock,
    stock: p.stock,
    featured: p.featured,
    createdAt: p.createdAt.toISOString(),
  };
}

/** The admin table needs the raw fields, drafts included. */
export function toAdminProduct(p: ProductRow) {
  return {
    ...toApiProduct(p),
    dbId: p.id,
    categoryId: p.categoryId,
    active: p.active,
    rawBadge: p.badge,
    lowStockAt: p.lowStockAt,
    sortOrder: p.sortOrder,
    updatedAt: p.updatedAt.toISOString(),
  };
}

export function toApiCategory(c: DbCategory & { _count?: { products: number } }): ApiCategory {
  return {
    id: c.id,
    slug: c.slug,
    name: c.name,
    sub: c.sub ?? "",
    pattern: (c.pattern as Pattern) ?? "plain",
    colors: c.colors,
    image: c.image ?? undefined,
    href: c.href || `/shop?cat=${c.slug}`,
    productCount: c._count?.products,
    active: c.active,
    showOnHome: c.showOnHome,
    sortOrder: c.sortOrder,
  };
}

export function toApiOrder(o: DbOrder & { items: DbOrderItem[] }) {
  return {
    id: o.id,
    number: o.number,
    status: o.status,
    paymentMethod: o.paymentMethod,
    paymentStatus: o.paymentStatus,
    customerName: o.customerName,
    phone: o.phone,
    email: o.email,
    address: o.address,
    city: o.city,
    postalCode: o.postalCode,
    notes: o.notes,
    subtotal: o.subtotal,
    shipping: o.shipping,
    discount: o.discount,
    total: o.total,
    items: o.items.map((i) => ({
      id: i.id,
      slug: i.slug,
      name: i.name,
      price: i.price,
      qty: i.qty,
      color: i.color,
      size: i.size,
      image: i.image,
      lineTotal: i.price * i.qty,
    })),
    createdAt: o.createdAt.toISOString(),
    updatedAt: o.updatedAt.toISOString(),
  };
}

export type ApiOrder = ReturnType<typeof toApiOrder>;

/**
 * Counter sale -> receipt-ready shape. `taxRate` is converted from basis
 * points to a percentage here so no UI has to know the storage unit.
 */
export function toApiSale(s: DbSale & { items: DbSaleItem[] }) {
  return {
    id: s.id,
    number: s.number,
    status: s.status,
    payment: s.payment,
    cashierName: s.cashierName,
    customerName: s.customerName,
    phone: s.phone,
    subtotal: s.subtotal,
    discount: s.discount,
    taxRate: s.taxRate / 100,
    tax: s.tax,
    total: s.total,
    cashGiven: s.cashGiven,
    cardAmount: s.cardAmount,
    change: s.change,
    notes: s.notes,
    voidedAt: s.voidedAt?.toISOString() ?? null,
    voidReason: s.voidReason,
    items: s.items.map((i) => ({
      id: i.id,
      slug: i.slug,
      name: i.name,
      price: i.price,
      qty: i.qty,
      color: i.color,
      size: i.size,
      lineTotal: i.price * i.qty,
    })),
    createdAt: s.createdAt.toISOString(),
  };
}

export type ApiSale = ReturnType<typeof toApiSale>;
export type ApiSaleItem = ApiSale["items"][number];

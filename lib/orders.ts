/* ==========================================================================
   Order pricing and creation.

   The client sends slugs and quantities — never prices. Everything monetary
   is recomputed here from the database, so a tampered cart payload cannot
   buy a PKR 12,990 silk suit for PKR 1.
   ========================================================================== */

import { Prisma, type PaymentMethod } from "@prisma/client";
import { prisma } from "./db";
import { HttpError } from "./api";
import { FREE_SHIPPING_AT, SHIPPING_FEE } from "./products";
import type { CheckoutInput } from "./validation";

export interface PricedLine {
  productId: string;
  slug: string;
  name: string;
  price: number;
  qty: number;
  color: string | null;
  size: string | null;
  image: string | null;
  lineTotal: number;
}

export interface PricedCart {
  lines: PricedLine[];
  subtotal: number;
  shipping: number;
  discount: number;
  total: number;
}

type CartInput = CheckoutInput["items"];

/**
 * Re-prices a cart against the database and checks availability.
 * Throws a 409 naming the offending product rather than silently dropping it,
 * so the customer can see what changed.
 */
export async function priceCart(items: CartInput): Promise<PricedCart> {
  // Merge duplicate lines up front so quantity checks see the real total.
  const merged = new Map<string, CartInput[number]>();
  for (const item of items) {
    const key = `${item.slug}|${item.color ?? ""}|${item.size ?? ""}`;
    const existing = merged.get(key);
    if (existing) existing.qty += item.qty;
    else merged.set(key, { ...item });
  }
  const lines = [...merged.values()];

  const products = await prisma.product.findMany({
    where: { slug: { in: lines.map((l) => l.slug) } },
  });
  const bySlug = new Map(products.map((p) => [p.slug, p]));

  const priced: PricedLine[] = [];
  for (const line of lines) {
    const product = bySlug.get(line.slug);
    if (!product || !product.active) {
      throw new HttpError(409, `"${line.slug}" is no longer available.`, "ITEM_UNAVAILABLE");
    }
    if (product.stock < line.qty) {
      throw new HttpError(
        409,
        product.stock === 0
          ? `"${product.name}" has just sold out.`
          : `Only ${product.stock} left of "${product.name}".`,
        "INSUFFICIENT_STOCK"
      );
    }
    // A colour that is no longer offered would silently become "any colour".
    if (line.color && product.colors.length && !product.colors.includes(line.color)) {
      throw new HttpError(409, `That colour is no longer offered for "${product.name}".`, "BAD_VARIANT");
    }
    if (line.size && product.sizes.length && !product.sizes.includes(line.size)) {
      throw new HttpError(409, `That size is no longer offered for "${product.name}".`, "BAD_VARIANT");
    }

    priced.push({
      productId: product.id,
      slug: product.slug,
      name: product.name,
      price: product.price,
      qty: line.qty,
      color: line.color ?? null,
      size: line.size ?? null,
      image: product.image ?? null,
      lineTotal: product.price * line.qty,
    });
  }

  const subtotal = priced.reduce((sum, l) => sum + l.lineTotal, 0);
  const shipping = subtotal >= FREE_SHIPPING_AT ? 0 : SHIPPING_FEE;
  const discount = 0;

  return { lines: priced, subtotal, shipping, discount, total: subtotal + shipping - discount };
}

/**
 * Sequential, human-readable order numbers (BA-10001, BA-10002…).
 * Derived from the row count inside the same transaction as the insert, with
 * a retry on collision — two simultaneous checkouts can otherwise pick the
 * same number.
 */
function orderNumber(seq: number): string {
  return `BA-${10_000 + seq}`;
}

export interface CreateOrderArgs extends Omit<CheckoutInput, "items"> {
  cart: PricedCart;
}

export async function createOrder({ cart, paymentMethod, ...customer }: CreateOrderArgs) {
  const attempt = async (): Promise<string> =>
    prisma.$transaction(async (tx) => {
      const count = await tx.order.count();
      const number = orderNumber(count + 1);

      const order = await tx.order.create({
        data: {
          number,
          paymentMethod: paymentMethod as PaymentMethod,
          // Card orders stay PENDING/UNPAID until the Stripe webhook confirms.
          status: "PENDING",
          paymentStatus: "UNPAID",
          customerName: customer.customerName,
          phone: customer.phone,
          email: customer.email ?? null,
          address: customer.address,
          city: customer.city,
          postalCode: customer.postalCode ?? null,
          notes: customer.notes ?? null,
          subtotal: cart.subtotal,
          shipping: cart.shipping,
          discount: cart.discount,
          total: cart.total,
          items: {
            create: cart.lines.map((l) => ({
              productId: l.productId,
              slug: l.slug,
              name: l.name,
              price: l.price,
              qty: l.qty,
              color: l.color,
              size: l.size,
              image: l.image,
            })),
          },
        },
      });

      // Reserve stock immediately. The conditional `gte` makes this safe under
      // concurrency: if another checkout got there first the update matches no
      // rows, and we abort the whole transaction.
      for (const line of cart.lines) {
        const reserved = await tx.product.updateMany({
          where: { id: line.productId, stock: { gte: line.qty } },
          data: { stock: { decrement: line.qty } },
        });
        if (reserved.count === 0) {
          throw new HttpError(409, `"${line.name}" sold out while you were checking out.`, "INSUFFICIENT_STOCK");
        }
      }

      return order.id;
    });

  for (let tries = 0; tries < 3; tries++) {
    try {
      return await attempt();
    } catch (err) {
      const duplicateNumber =
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === "P2002" &&
        (err.meta?.target as string[] | undefined)?.includes("number");
      if (!duplicateNumber || tries === 2) throw err;
    }
  }
  throw new HttpError(500, "Could not place the order. Please try again.");
}

/** Puts stock back when an order is cancelled or a card payment fails. */
export async function restock(orderId: string) {
  await prisma.$transaction(async (tx) => {
    const items = await tx.orderItem.findMany({ where: { orderId } });
    for (const item of items) {
      if (!item.productId) continue;
      await tx.product.update({
        where: { id: item.productId },
        data: { stock: { increment: item.qty } },
      });
    }
  });
}

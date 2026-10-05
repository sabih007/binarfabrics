/* ==========================================================================
   Counter-sale pricing, creation and voiding.

   Same rule as lib/orders.ts: the till sends slugs and quantities, never
   prices, for anything that exists in the catalogue. Manual lines are the
   one exception — there is no catalogue row to price them from — so they
   carry an amount typed by a signed-in cashier, which is the same trust
   level as editing the product's price in the admin.
   ========================================================================== */

import { Prisma } from "@prisma/client";
import { prisma } from "./db";
import { HttpError } from "./api";
import { BP, percentToBp, resolveDiscount, saleTotals } from "./pos";
import type { SaleCreateInput } from "./validation";

export interface PricedSaleLine {
  productId: string | null;
  slug: string | null;
  name: string;
  price: number;
  qty: number;
  color: string | null;
  size: string | null;
  lineTotal: number;
}

export interface PricedSale {
  lines: PricedSaleLine[];
  subtotal: number;
  discount: number;
  taxRateBp: number;
  tax: number;
  total: number;
}

type SaleLines = SaleCreateInput["items"];

/**
 * Resolves a till basket against the catalogue and computes the totals.
 *
 * Unlike the storefront this does *not* reject out-of-stock items outright:
 * the customer is standing at the counter holding the garment, so a stock
 * count that disagrees with the shelf is a bookkeeping problem, not a reason
 * to refuse the sale. Stock is still decremented (and allowed to go
 * negative) so the discrepancy stays visible in the admin.
 */
export async function priceSale(
  items: SaleLines,
  opts: { discountMode: "amount" | "percent"; discountValue: number; taxRate: number }
): Promise<PricedSale> {
  const slugs = [...new Set(items.map((i) => i.slug).filter((s): s is string => Boolean(s)))];

  const products = slugs.length
    ? await prisma.product.findMany({ where: { slug: { in: slugs } } })
    : [];
  const bySlug = new Map(products.map((p) => [p.slug, p]));

  const lines: PricedSaleLine[] = items.map((item) => {
    if (item.slug) {
      const product = bySlug.get(item.slug);
      if (!product) {
        throw new HttpError(409, `"${item.slug}" is no longer in the catalogue.`, "ITEM_UNAVAILABLE");
      }
      return {
        productId: product.id,
        slug: product.slug,
        name: product.name,
        price: product.price,
        qty: item.qty,
        color: item.color ?? null,
        size: item.size ?? null,
        lineTotal: product.price * item.qty,
      };
    }

    // Guaranteed present by saleLineSchema's refine, but narrow for TS.
    const name = item.name!;
    const price = item.price!;
    return {
      productId: null,
      slug: null,
      name,
      price,
      qty: item.qty,
      color: item.color ?? null,
      size: item.size ?? null,
      lineTotal: price * item.qty,
    };
  });

  const bare = lines.reduce((sum, l) => sum + l.lineTotal, 0);
  const discount = resolveDiscount(opts.discountMode, opts.discountValue, bare);
  const taxRateBp = percentToBp(opts.taxRate);
  const totals = saleTotals({ lines, discount, taxRateBp });

  return { lines, ...totals, taxRateBp };
}

/**
 * Sequential receipt numbers (BA-S-1001, BA-S-1002…), derived from the row
 * count inside the insert's own transaction with a retry on collision — two
 * tills ringing up at the same instant would otherwise pick the same number.
 */
const saleNumber = (seq: number) => `BA-S-${1_000 + seq}`;

export interface TenderBreakdown {
  payment: "CASH" | "CARD" | "MIXED";
  cashGiven: number | null;
  cardAmount: number | null;
  change: number;
}

/**
 * Works out what was tendered and what the cashier owes back, rejecting a
 * basket that hasn't actually been paid for.
 */
export function settleTender(
  total: number,
  input: { payment: "CASH" | "CARD" | "MIXED"; cashGiven?: number; cardAmount?: number }
): TenderBreakdown {
  if (input.payment === "CARD") {
    return { payment: "CARD", cashGiven: null, cardAmount: total, change: 0 };
  }

  if (input.payment === "CASH") {
    const cashGiven = input.cashGiven ?? 0;
    if (cashGiven < total) {
      throw new HttpError(400, "Cash received is less than the total.", "SHORT_TENDER");
    }
    return { payment: "CASH", cashGiven, cardAmount: null, change: cashGiven - total };
  }

  const cardAmount = Math.min(input.cardAmount ?? 0, total);
  const cashGiven = input.cashGiven ?? 0;
  if (cardAmount + cashGiven < total) {
    throw new HttpError(400, "Cash and card together don't cover the total.", "SHORT_TENDER");
  }
  return { payment: "MIXED", cashGiven, cardAmount, change: cashGiven + cardAmount - total };
}

export interface CreateSaleArgs {
  sale: PricedSale;
  tender: TenderBreakdown;
  cashier: { id: string; name: string };
  customerName?: string;
  phone?: string;
  notes?: string;
}

export async function createSale({ sale, tender, cashier, ...customer }: CreateSaleArgs) {
  const attempt = async (): Promise<string> =>
    prisma.$transaction(async (tx) => {
      const count = await tx.sale.count();

      const row = await tx.sale.create({
        data: {
          number: saleNumber(count + 1),
          status: "COMPLETED",
          payment: tender.payment,
          cashierId: cashier.id,
          cashierName: cashier.name,
          customerName: customer.customerName ?? null,
          phone: customer.phone ?? null,
          subtotal: sale.subtotal,
          discount: sale.discount,
          taxRate: sale.taxRateBp,
          tax: sale.tax,
          total: sale.total,
          cashGiven: tender.cashGiven,
          cardAmount: tender.cardAmount,
          change: tender.change,
          notes: customer.notes ?? null,
          items: {
            create: sale.lines.map((l) => ({
              productId: l.productId,
              slug: l.slug,
              name: l.name,
              price: l.price,
              qty: l.qty,
              color: l.color,
              size: l.size,
            })),
          },
        },
      });

      // Unconditional decrement — see the note in priceSale on why a counter
      // sale is allowed to push stock negative instead of failing.
      for (const line of sale.lines) {
        if (!line.productId) continue;
        await tx.product.update({
          where: { id: line.productId },
          data: { stock: { decrement: line.qty } },
        });
      }

      return row.id;
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
  throw new HttpError(500, "Could not save the sale. Please try again.");
}

/**
 * Voids a sale and returns its catalogue items to stock. Kept idempotent-ish
 * by the status guard: a second void can't double-restock.
 */
export async function voidSale(id: string, reason: string) {
  return prisma.$transaction(async (tx) => {
    const sale = await tx.sale.findUnique({ where: { id }, include: { items: true } });
    if (!sale) throw new HttpError(404, "That sale no longer exists.", "NOT_FOUND");
    if (sale.status === "VOIDED") {
      throw new HttpError(409, `${sale.number} is already voided.`, "ALREADY_VOIDED");
    }

    for (const item of sale.items) {
      if (!item.productId) continue;
      await tx.product.update({
        where: { id: item.productId },
        data: { stock: { increment: item.qty } },
      });
    }

    return tx.sale.update({
      where: { id },
      data: { status: "VOIDED", voidedAt: new Date(), voidReason: reason },
      include: { items: true },
    });
  });
}

/** Till summary for the dashboard and the sales screen header. */
export async function salesSummary(since: Date) {
  const earning = { status: "COMPLETED" as const };
  const [all, window, byPayment] = await Promise.all([
    prisma.sale.aggregate({ _sum: { total: true }, _count: true, where: earning }),
    prisma.sale.aggregate({
      _sum: { total: true, tax: true, discount: true },
      _count: true,
      where: { ...earning, createdAt: { gte: since } },
    }),
    prisma.sale.groupBy({
      by: ["payment"],
      _sum: { total: true },
      where: { ...earning, createdAt: { gte: since } },
    }),
  ]);

  return {
    allTime: { revenue: all._sum.total ?? 0, count: all._count },
    window: {
      revenue: window._sum.total ?? 0,
      tax: window._sum.tax ?? 0,
      discount: window._sum.discount ?? 0,
      count: window._count,
    },
    byPayment: byPayment.map((p) => ({ payment: p.payment, revenue: p._sum.total ?? 0 })),
  };
}

/** Exported for tests / callers that want the raw basis-point divisor. */
export { BP };

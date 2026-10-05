/* ==========================================================================
   GET  /api/admin/sales?status=COMPLETED&q=BA-S-1001&from=2026-10-01&page=1
   POST /api/admin/sales — ring up a counter sale
   ========================================================================== */

import { handler, ok, readJson } from "@/lib/api";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { shopDayFrom } from "@/lib/pos";
import { createSale, priceSale, settleTender } from "@/lib/sales";
import { toApiSale } from "@/lib/serialize";
import { saleCreateSchema, saleQuerySchema } from "@/lib/validation";
import type { Prisma } from "@prisma/client";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * `from`/`to` are inclusive calendar days on the shop's clock, not the
 * server's — see SHOP_UTC_OFFSET. `to` is widened to cover its whole day.
 */
function dayRange(from?: string, to?: string): Prisma.DateTimeFilter | undefined {
  if (!from && !to) return undefined;
  const filter: Prisma.DateTimeFilter = {};
  if (from) filter.gte = shopDayFrom(from);
  if (to) filter.lt = new Date(shopDayFrom(to).getTime() + DAY_MS);
  return filter;
}

export const GET = handler(async (req: Request) => {
  await requireAdmin();

  const query = saleQuerySchema.parse(Object.fromEntries(new URL(req.url).searchParams));

  const where: Prisma.SaleWhereInput = {};
  if (query.status) where.status = query.status;
  if (query.payment) where.payment = query.payment;

  const createdAt = dayRange(query.from, query.to);
  if (createdAt) where.createdAt = createdAt;

  if (query.q) {
    where.OR = [
      { number: { contains: query.q, mode: "insensitive" } },
      { customerName: { contains: query.q, mode: "insensitive" } },
      { phone: { contains: query.q } },
      { cashierName: { contains: query.q, mode: "insensitive" } },
      { items: { some: { name: { contains: query.q, mode: "insensitive" } } } },
    ];
  }

  // Totals for the rows the filter actually matched, so the header figure
  // agrees with the table underneath it.
  const [rows, total, matched] = await Promise.all([
    prisma.sale.findMany({
      where,
      include: { items: true },
      orderBy: { createdAt: "desc" },
      skip: (query.page - 1) * query.perPage,
      take: query.perPage,
    }),
    prisma.sale.count({ where }),
    prisma.sale.aggregate({
      _sum: { total: true, tax: true, discount: true },
      where: { ...where, status: "COMPLETED" },
    }),
  ]);

  return ok({
    sales: rows.map(toApiSale),
    totals: {
      revenue: matched._sum.total ?? 0,
      tax: matched._sum.tax ?? 0,
      discount: matched._sum.discount ?? 0,
    },
    total,
    page: query.page,
    perPage: query.perPage,
    pages: Math.max(1, Math.ceil(total / query.perPage)),
  });
});

export const POST = handler(async (req: Request) => {
  const session = await requireAdmin();
  const input = saleCreateSchema.parse(await readJson(req));

  const priced = await priceSale(input.items, {
    discountMode: input.discountMode,
    discountValue: input.discountValue,
    taxRate: input.taxRate,
  });

  const tender = settleTender(priced.total, {
    payment: input.payment,
    cashGiven: input.cashGiven,
    cardAmount: input.cardAmount,
  });

  const id = await createSale({
    sale: priced,
    tender,
    cashier: { id: session.sub, name: session.name },
    customerName: input.customerName,
    phone: input.phone,
    notes: input.notes,
  });

  const saved = await prisma.sale.findUniqueOrThrow({ where: { id }, include: { items: true } });
  return ok({ sale: toApiSale(saved) }, { status: 201 });
});

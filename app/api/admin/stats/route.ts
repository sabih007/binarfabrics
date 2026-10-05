/* ==========================================================================
   GET /api/admin/stats — dashboard summary.
   ========================================================================== */

import { handler, ok } from "@/lib/api";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { salesSummary } from "@/lib/sales";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export const GET = handler(async () => {
  await requireAdmin();

  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  // Cancelled orders are excluded from revenue — they were never money.
  const earning = { status: { not: "CANCELLED" as const } };

  const [
    revenueAll,
    revenue30,
    orderCount,
    pending,
    productCount,
    lowStock,
    unreadMessages,
    subscribers,
    recent,
    topProducts,
  ] = await Promise.all([
    prisma.order.aggregate({ _sum: { total: true }, where: earning }),
    prisma.order.aggregate({
      _sum: { total: true },
      _count: true,
      where: { ...earning, createdAt: { gte: thirtyDaysAgo } },
    }),
    prisma.order.count(),
    prisma.order.count({ where: { status: "PENDING" } }),
    prisma.product.count({ where: { active: true } }),
    prisma.product.count({ where: { active: true, stock: { lte: 5 } } }),
    prisma.contactMessage.count({ where: { status: "NEW" } }),
    prisma.subscriber.count({ where: { active: true } }),
    prisma.order.findMany({
      orderBy: { createdAt: "desc" },
      take: 8,
      select: {
        id: true,
        number: true,
        customerName: true,
        total: true,
        status: true,
        paymentMethod: true,
        createdAt: true,
      },
    }),
    prisma.orderItem.groupBy({
      by: ["slug", "name"],
      _sum: { qty: true },
      orderBy: { _sum: { qty: "desc" } },
      take: 5,
    }),
  ]);

  // Counter takings live in their own table — see the Sale model's note.
  const counter = await salesSummary(thirtyDaysAgo);

  return ok({
    revenue: { allTime: revenueAll._sum.total ?? 0, last30Days: revenue30._sum.total ?? 0 },
    counter: {
      allTime: counter.allTime.revenue,
      last30Days: counter.window.revenue,
      sales: counter.window.count,
      tax: counter.window.tax,
      discount: counter.window.discount,
      byPayment: counter.byPayment,
    },
    orders: { total: orderCount, last30Days: revenue30._count, pending },
    catalogue: { products: productCount, lowStock },
    inbox: { unread: unreadMessages },
    subscribers,
    recentOrders: recent.map((o) => ({ ...o, createdAt: o.createdAt.toISOString() })),
    topProducts: topProducts.map((p) => ({ slug: p.slug, name: p.name, sold: p._sum.qty ?? 0 })),
  });
});

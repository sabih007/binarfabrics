import Link from "next/link";
import type { Metadata } from "next";
import { prisma } from "@/lib/db";
import { money } from "@/lib/products";
import { shopDayStart } from "@/lib/pos";

export const metadata: Metadata = { title: "Dashboard" };
export const dynamic = "force-dynamic";

/** Reads straight from the database — no self-fetch back into our own API. */
async function getStats() {
  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const earning = { status: { not: "CANCELLED" as const } };

  const [revenue, last30, pending, products, lowStock, unread, subscribers, recent, top] =
    await Promise.all([
      prisma.order.aggregate({ _sum: { total: true }, _count: true, where: earning }),
      prisma.order.aggregate({
        _sum: { total: true },
        _count: true,
        where: { ...earning, createdAt: { gte: since } },
      }),
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

  // Counter takings live in their own table — see the note on the Sale model
  // in schema.prisma. Midnight is the shop's, not the server's.
  const startOfToday = shopDayStart();
  const sold = { status: "COMPLETED" as const };

  const [counterToday, counter30] = await Promise.all([
    prisma.sale.aggregate({
      _sum: { total: true },
      _count: true,
      where: { ...sold, createdAt: { gte: startOfToday } },
    }),
    prisma.sale.aggregate({ _sum: { total: true }, _count: true, where: { ...sold, createdAt: { gte: since } } }),
  ]);

  return {
    revenue,
    last30,
    pending,
    products,
    lowStock,
    unread,
    subscribers,
    recent,
    top,
    counterToday,
    counter30,
  };
}

export default async function DashboardPage() {
  const s = await getStats();

  return (
    <>
      <div className="adm__head">
        <div>
          <h1>Dashboard</h1>
          <p>An overview of the last 30 days.</p>
        </div>
        <div className="adm-actions">
          <Link className="adm-btn adm-btn--primary" href="/admin/pos">
            New counter sale
          </Link>
          <Link className="adm-btn" href="/admin/products?new=1">
            Add product
          </Link>
        </div>
      </div>

      <div className="adm-stats">
        <div className="adm-stat">
          <div className="adm-stat__label">Counter · today</div>
          <div className="adm-stat__value">{money(s.counterToday._sum.total ?? 0)}</div>
          <div className="adm-stat__sub">
            {s.counterToday._count} sale(s) · {money(s.counter30._sum.total ?? 0)} in 30 days
          </div>
        </div>
        <div className="adm-stat">
          <div className="adm-stat__label">Online · 30 days</div>
          <div className="adm-stat__value">{money(s.last30._sum.total ?? 0)}</div>
          <div className="adm-stat__sub">{money(s.revenue._sum.total ?? 0)} all time</div>
        </div>
        <div className="adm-stat">
          <div className="adm-stat__label">Orders · 30 days</div>
          <div className="adm-stat__value">{s.last30._count}</div>
          <div className="adm-stat__sub">{s.revenue._count} all time</div>
        </div>
        <div className="adm-stat">
          <div className="adm-stat__label">Awaiting action</div>
          <div className="adm-stat__value">{s.pending}</div>
          <div className="adm-stat__sub">orders still pending</div>
        </div>
        <div className="adm-stat">
          <div className="adm-stat__label">Catalogue</div>
          <div className="adm-stat__value">{s.products}</div>
          <div className="adm-stat__sub">
            {s.lowStock > 0 ? `${s.lowStock} low on stock` : "stock levels healthy"}
          </div>
        </div>
        <div className="adm-stat">
          <div className="adm-stat__label">Subscribers</div>
          <div className="adm-stat__value">{s.subscribers}</div>
          <div className="adm-stat__sub">{s.unread} unread messages</div>
        </div>
      </div>

      <div className="adm-panel">
        <div className="adm-panel__head">
          <span>Recent orders</span>
          <Link className="adm-btn adm-btn--sm" href="/admin/orders">
            View all
          </Link>
        </div>
        {s.recent.length === 0 ? (
          <div className="adm-empty">No orders yet. They&apos;ll appear here as they come in.</div>
        ) : (
          <div className="adm-table-wrap">
            <table className="adm-table">
              <thead>
                <tr>
                  <th>Order</th>
                  <th>Customer</th>
                  <th>Payment</th>
                  <th>Status</th>
                  <th className="num">Total</th>
                  <th>Placed</th>
                </tr>
              </thead>
              <tbody>
                {s.recent.map((o) => (
                  <tr key={o.id}>
                    <td>
                      <Link href={`/admin/orders?q=${o.number}`}>
                        <strong>{o.number}</strong>
                      </Link>
                    </td>
                    <td>{o.customerName}</td>
                    <td>{o.paymentMethod === "COD" ? "Cash on delivery" : "Card"}</td>
                    <td>
                      <span className={`adm-pill adm-pill--${o.status}`}>{o.status}</span>
                    </td>
                    <td className="num">{money(o.total)}</td>
                    <td className="adm-table__muted">
                      {o.createdAt.toLocaleDateString("en-PK", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {s.top.length > 0 && (
        <div className="adm-panel">
          <div className="adm-panel__head">Best sellers</div>
          <div className="adm-table-wrap">
            <table className="adm-table">
              <thead>
                <tr>
                  <th>Product</th>
                  <th className="num">Units sold</th>
                </tr>
              </thead>
              <tbody>
                {s.top.map((p) => (
                  <tr key={p.slug}>
                    <td>{p.name}</td>
                    <td className="num">{p._sum.qty ?? 0}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </>
  );
}

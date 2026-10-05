"use client";

import { Fragment, useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { ApiError, apiGet, apiSend } from "@/lib/client";
import { money } from "@/lib/products";

const STATUSES = ["PENDING", "CONFIRMED", "PROCESSING", "SHIPPED", "DELIVERED", "CANCELLED"] as const;
type Status = (typeof STATUSES)[number];

interface OrderItem {
  id: string;
  name: string;
  slug: string;
  price: number;
  qty: number;
  color: string | null;
  size: string | null;
  lineTotal: number;
}

interface Order {
  id: string;
  number: string;
  status: Status;
  paymentMethod: "COD" | "CARD" | "BANK";
  paymentStatus: "UNPAID" | "PAID" | "REFUNDED" | "FAILED";
  customerName: string;
  phone: string;
  email: string | null;
  address: string;
  city: string;
  postalCode: string | null;
  notes: string | null;
  subtotal: number;
  shipping: number;
  total: number;
  items: OrderItem[];
  createdAt: string;
}

const dateTime = (iso: string) =>
  new Date(iso).toLocaleString("en-PK", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

export default function OrdersClient() {
  const params = useSearchParams();

  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [search, setSearch] = useState(params.get("q") ?? "");
  const [statusFilter, setStatusFilter] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const query = new URLSearchParams({ perPage: "60" });
      if (search.trim()) query.set("q", search.trim());
      if (statusFilter) query.set("status", statusFilter);

      const data = await apiGet<{ orders: Order[] }>(`/api/admin/orders?${query}`);
      setOrders(data.orders);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't load orders.");
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter]);

  useEffect(() => {
    const timer = setTimeout(load, 250);
    return () => clearTimeout(timer);
  }, [load]);

  async function setStatus(order: Order, status: Status) {
    if (status === order.status) return;
    if (status === "CANCELLED" && !confirm(`Cancel ${order.number}? Stock will be returned.`)) return;

    setSavingId(order.id);
    setError(null);
    try {
      const res = await apiSend<{ order: Order; restocked: boolean }>(
        `/api/admin/orders/${order.id}`,
        "PATCH",
        { status }
      );
      setOrders((prev) => prev.map((o) => (o.id === order.id ? res.order : o)));
      setNotice(
        res.restocked
          ? `${order.number} cancelled and stock returned.`
          : `${order.number} is now ${status.toLowerCase()}.`
      );
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't update that order.");
    } finally {
      setSavingId(null);
    }
  }

  async function markPaid(order: Order) {
    setSavingId(order.id);
    setError(null);
    try {
      const res = await apiSend<{ order: Order }>(`/api/admin/orders/${order.id}`, "PATCH", {
        paymentStatus: "PAID",
      });
      setOrders((prev) => prev.map((o) => (o.id === order.id ? res.order : o)));
      setNotice(`${order.number} marked paid.`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't update that order.");
    } finally {
      setSavingId(null);
    }
  }

  return (
    <>
      <div className="adm__head">
        <div>
          <h1>Orders</h1>
          <p>{orders.length} shown · newest first.</p>
        </div>
      </div>

      {error && <div className="adm-note adm-note--error" style={{ marginBottom: 16 }}>{error}</div>}
      {notice && <div className="adm-note adm-note--ok" style={{ marginBottom: 16 }}>{notice}</div>}

      <div className="adm-toolbar">
        <input
          type="search"
          placeholder="Order number, name, phone…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ minWidth: 250 }}
        />
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="">All statuses</option>
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </div>

      <div className="adm-panel">
        {loading ? (
          <div className="adm-empty">Loading orders…</div>
        ) : orders.length === 0 ? (
          <div className="adm-empty">No orders match.</div>
        ) : (
          <div className="adm-table-wrap">
            <table className="adm-table">
              <thead>
                <tr>
                  <th>Order</th>
                  <th>Customer</th>
                  <th>Payment</th>
                  <th className="num">Total</th>
                  <th>Status</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {orders.map((o) => (
                  <Fragment key={o.id}>
                    <tr>
                      <td>
                        <strong>{o.number}</strong>
                        <div className="adm-table__muted">{dateTime(o.createdAt)}</div>
                      </td>
                      <td>
                        {o.customerName}
                        <div className="adm-table__muted">
                          {o.phone}
                          <br />
                          {o.city}
                        </div>
                      </td>
                      <td>
                        {o.paymentMethod === "COD" ? "Cash on delivery" : o.paymentMethod === "BANK" ? "Bank transfer" : "Card"}
                        <div style={{ marginTop: 4 }}>
                          <span className={`adm-pill adm-pill--${o.paymentStatus}`}>{o.paymentStatus}</span>
                        </div>
                      </td>
                      <td className="num">
                        {money(o.total)}
                        <div className="adm-table__muted">{o.items.length} item(s)</div>
                      </td>
                      <td>
                        <select
                          value={o.status}
                          onChange={(e) => setStatus(o, e.target.value as Status)}
                          disabled={savingId === o.id || o.status === "DELIVERED"}
                          style={{ padding: "5px 8px", borderRadius: 7, fontSize: 12 }}
                        >
                          {STATUSES.map((s) => (
                            <option key={s} value={s}>
                              {s}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td>
                        <div className="adm-actions">
                          <button
                            className="adm-btn adm-btn--sm"
                            onClick={() => setExpanded(expanded === o.id ? null : o.id)}
                          >
                            {expanded === o.id ? "Hide" : "Details"}
                          </button>
                          {o.paymentStatus === "UNPAID" && o.status !== "CANCELLED" && (
                            <button
                              className="adm-btn adm-btn--sm"
                              onClick={() => markPaid(o)}
                              disabled={savingId === o.id}
                            >
                              Mark paid
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>

                    {expanded === o.id && (
                      <tr>
                        <td colSpan={6} style={{ background: "#fbfaf7" }}>
                          <div style={{ display: "grid", gap: 18, gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))" }}>
                            <div>
                              <strong style={{ fontSize: 12, textTransform: "uppercase", letterSpacing: "0.07em" }}>
                                Items
                              </strong>
                              <table className="adm-table" style={{ marginTop: 6 }}>
                                <tbody>
                                  {o.items.map((i) => (
                                    <tr key={i.id}>
                                      <td>
                                        {i.name}
                                        {(i.size || i.color) && (
                                          <div className="adm-table__muted">
                                            {[i.size && `Size ${i.size}`, i.color && `Colour ${i.color}`]
                                              .filter(Boolean)
                                              .join(" · ")}
                                          </div>
                                        )}
                                      </td>
                                      <td className="num">
                                        {i.qty} × {money(i.price)}
                                      </td>
                                      <td className="num">{money(i.lineTotal)}</td>
                                    </tr>
                                  ))}
                                  <tr>
                                    <td colSpan={2}>Subtotal</td>
                                    <td className="num">{money(o.subtotal)}</td>
                                  </tr>
                                  <tr>
                                    <td colSpan={2}>Delivery</td>
                                    <td className="num">{o.shipping ? money(o.shipping) : "Free"}</td>
                                  </tr>
                                  <tr>
                                    <td colSpan={2}>
                                      <strong>Total</strong>
                                    </td>
                                    <td className="num">
                                      <strong>{money(o.total)}</strong>
                                    </td>
                                  </tr>
                                </tbody>
                              </table>
                            </div>

                            <div>
                              <strong style={{ fontSize: 12, textTransform: "uppercase", letterSpacing: "0.07em" }}>
                                Deliver to
                              </strong>
                              <p style={{ marginTop: 6, lineHeight: 1.6 }}>
                                {o.customerName}
                                <br />
                                {o.address}
                                <br />
                                {o.city}
                                {o.postalCode ? ` ${o.postalCode}` : ""}
                                <br />
                                {o.phone}
                                {o.email && (
                                  <>
                                    <br />
                                    {o.email}
                                  </>
                                )}
                              </p>
                              {o.notes && (
                                <p className="adm-note adm-note--info" style={{ marginTop: 10 }}>
                                  <strong>Note:</strong> {o.notes}
                                </p>
                              )}
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}

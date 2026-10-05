"use client";

import { Fragment, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ApiError, apiGet, apiSend } from "@/lib/client";
import { money } from "@/lib/products";
import { shopToday } from "@/lib/pos";
import type { ApiSale } from "@/lib/serialize";

const PAYMENT_LABEL: Record<ApiSale["payment"], string> = {
  CASH: "Cash",
  CARD: "Card",
  MIXED: "Cash + card",
};

interface Totals {
  revenue: number;
  tax: number;
  discount: number;
}

const dateTime = (iso: string) =>
  new Date(iso).toLocaleString("en-PK", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

/**
 * The shop's calendar day, not the browser's — the API filters on the same
 * clock, so an owner checking takings from another timezone still sees the
 * shop's "today".
 */
const today = () => shopToday();

export default function SalesClient({ canVoid }: { canVoid: boolean }) {
  const [sales, setSales] = useState<ApiSale[]>([]);
  const [totals, setTotals] = useState<Totals>({ revenue: 0, tax: 0, discount: 0 });
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [payment, setPayment] = useState("");
  const [from, setFrom] = useState(today());
  const [to, setTo] = useState(today());

  const [expanded, setExpanded] = useState<string | null>(null);
  const [voidingId, setVoidingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const query = new URLSearchParams({ perPage: "60" });
      if (search.trim()) query.set("q", search.trim());
      if (status) query.set("status", status);
      if (payment) query.set("payment", payment);
      if (from) query.set("from", from);
      if (to) query.set("to", to);

      const data = await apiGet<{ sales: ApiSale[]; totals: Totals; total: number }>(
        `/api/admin/sales?${query}`
      );
      setSales(data.sales);
      setTotals(data.totals);
      setCount(data.total);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't load sales.");
    } finally {
      setLoading(false);
    }
  }, [search, status, payment, from, to]);

  useEffect(() => {
    const timer = setTimeout(load, 250);
    return () => clearTimeout(timer);
  }, [load]);

  async function voidSale(sale: ApiSale) {
    const reason = prompt(
      `Void ${sale.number} (${money(sale.total)})?\nItems go back into stock. Reason:`
    );
    if (reason === null) return;
    if (reason.trim().length < 3) {
      setError("Please give a reason of at least 3 characters.");
      return;
    }

    setVoidingId(sale.id);
    setError(null);
    try {
      const res = await apiSend<{ sale: ApiSale }>(`/api/admin/sales/${sale.id}`, "PATCH", {
        status: "VOIDED",
        voidReason: reason.trim(),
      });
      setSales((prev) => prev.map((s) => (s.id === sale.id ? res.sale : s)));
      setNotice(`${sale.number} voided and stock returned.`);
      // The header figures include this sale, so pull them again.
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't void that sale.");
    } finally {
      setVoidingId(null);
    }
  }

  const sameDay = from === to;

  return (
    <>
      <div className="adm__head">
        <div>
          <h1>Counter sales</h1>
          <p>
            {count} sale(s){sameDay && from === today() ? " today" : ""} · newest first.
          </p>
        </div>
        <Link className="adm-btn adm-btn--primary" href="/admin/pos">
          New sale
        </Link>
      </div>

      <div className="adm-stats">
        <div className="adm-stat">
          <div className="adm-stat__label">Takings · filtered</div>
          <div className="adm-stat__value">{money(totals.revenue)}</div>
          <div className="adm-stat__sub">voided sales excluded</div>
        </div>
        <div className="adm-stat">
          <div className="adm-stat__label">GST collected</div>
          <div className="adm-stat__value">{money(totals.tax)}</div>
          <div className="adm-stat__sub">within the same filter</div>
        </div>
        <div className="adm-stat">
          <div className="adm-stat__label">Discounts given</div>
          <div className="adm-stat__value">{money(totals.discount)}</div>
          <div className="adm-stat__sub">off {count} sale(s)</div>
        </div>
      </div>

      {error && (
        <div className="adm-note adm-note--error" style={{ marginBottom: 16 }}>
          {error}
        </div>
      )}
      {notice && (
        <div className="adm-note adm-note--ok" style={{ marginBottom: 16 }}>
          {notice}
        </div>
      )}

      <div className="adm-toolbar">
        <input
          type="search"
          value={search}
          placeholder="Receipt no., customer, cashier, item…"
          onChange={(e) => setSearch(e.target.value)}
          style={{ minWidth: 240 }}
        />
        <select value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">All statuses</option>
          <option value="COMPLETED">Completed</option>
          <option value="VOIDED">Voided</option>
        </select>
        <select value={payment} onChange={(e) => setPayment(e.target.value)}>
          <option value="">Any payment</option>
          <option value="CASH">Cash</option>
          <option value="CARD">Card</option>
          <option value="MIXED">Cash + card</option>
        </select>
        <input
          type="date"
          value={from}
          aria-label="From date"
          onChange={(e) => setFrom(e.target.value)}
        />
        <input type="date" value={to} aria-label="To date" onChange={(e) => setTo(e.target.value)} />
        <button
          className="adm-btn adm-btn--sm"
          onClick={() => {
            setFrom("");
            setTo("");
          }}
        >
          All dates
        </button>
      </div>

      <div className="adm-panel">
        {loading && sales.length === 0 ? (
          <div className="adm-empty">Loading…</div>
        ) : sales.length === 0 ? (
          <div className="adm-empty">
            No sales match that filter. <Link href="/admin/pos">Ring one up →</Link>
          </div>
        ) : (
          <div className="adm-table-wrap">
            <table className="adm-table">
              <thead>
                <tr>
                  <th>Receipt</th>
                  <th>When</th>
                  <th>Cashier</th>
                  <th>Customer</th>
                  <th>Payment</th>
                  <th className="num">Total</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {sales.map((sale) => {
                  const open = expanded === sale.id;
                  return (
                    <Fragment key={sale.id}>
                      <tr>
                        <td>
                          <button
                            className="adm-btn adm-btn--sm"
                            onClick={() => setExpanded(open ? null : sale.id)}
                            aria-expanded={open}
                          >
                            <strong>{sale.number}</strong>
                          </button>
                          {sale.status === "VOIDED" && (
                            <>
                              {" "}
                              <span className="adm-pill adm-pill--CANCELLED">Voided</span>
                            </>
                          )}
                        </td>
                        <td className="adm-table__muted">{dateTime(sale.createdAt)}</td>
                        <td>{sale.cashierName}</td>
                        <td>
                          {sale.customerName || <span className="adm-table__muted">Walk-in</span>}
                          {sale.phone && <div className="adm-table__muted">{sale.phone}</div>}
                        </td>
                        <td>{PAYMENT_LABEL[sale.payment]}</td>
                        <td className="num">{money(sale.total)}</td>
                        <td>
                          <div className="adm-actions">
                            <Link className="adm-btn adm-btn--sm" href={`/admin/sales/${sale.id}`}>
                              Receipt
                            </Link>
                            {canVoid && sale.status === "COMPLETED" && (
                              <button
                                className="adm-btn adm-btn--sm adm-btn--danger"
                                onClick={() => voidSale(sale)}
                                disabled={voidingId === sale.id}
                              >
                                {voidingId === sale.id ? "Voiding…" : "Void"}
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>

                      {open && (
                        <tr>
                          <td colSpan={7} style={{ background: "#fcfbf9" }}>
                            <table className="adm-table" style={{ background: "transparent" }}>
                              <thead>
                                <tr>
                                  <th>Item</th>
                                  <th className="num">Price</th>
                                  <th className="num">Qty</th>
                                  <th className="num">Line total</th>
                                </tr>
                              </thead>
                              <tbody>
                                {sale.items.map((item) => (
                                  <tr key={item.id}>
                                    <td>
                                      {item.name}
                                      <div className="adm-table__muted">
                                        {item.slug ?? "manual line"}
                                        {item.size && ` · size ${item.size}`}
                                      </div>
                                    </td>
                                    <td className="num">{money(item.price)}</td>
                                    <td className="num">{item.qty}</td>
                                    <td className="num">{money(item.lineTotal)}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>

                            <div style={{ padding: "12px 14px", display: "grid", gap: 4, maxWidth: 320 }}>
                              <div className="pos-sum__row pos-sum__row--muted">
                                <span>Subtotal</span>
                                <span>{money(sale.subtotal)}</span>
                              </div>
                              {sale.discount > 0 && (
                                <div className="pos-sum__row pos-sum__row--muted">
                                  <span>Discount</span>
                                  <span>−{money(sale.discount)}</span>
                                </div>
                              )}
                              {sale.tax > 0 && (
                                <div className="pos-sum__row pos-sum__row--muted">
                                  <span>GST {sale.taxRate}%</span>
                                  <span>{money(sale.tax)}</span>
                                </div>
                              )}
                              <div className="pos-sum__row">
                                <span>Total</span>
                                <span>{money(sale.total)}</span>
                              </div>
                              {sale.cashGiven != null && sale.cashGiven > 0 && (
                                <div className="pos-sum__row pos-sum__row--muted">
                                  <span>Cash received</span>
                                  <span>{money(sale.cashGiven)}</span>
                                </div>
                              )}
                              {sale.change > 0 && (
                                <div className="pos-sum__row pos-sum__row--muted">
                                  <span>Change given</span>
                                  <span>{money(sale.change)}</span>
                                </div>
                              )}
                              {sale.notes && (
                                <p className="adm-table__muted" style={{ margin: "6px 0 0" }}>
                                  Note: {sale.notes}
                                </p>
                              )}
                              {sale.voidReason && (
                                <p className="adm-table__muted" style={{ margin: "6px 0 0" }}>
                                  Voided: {sale.voidReason}
                                </p>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}

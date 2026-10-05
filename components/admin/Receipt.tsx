/* ==========================================================================
   The printed receipt — an 80mm thermal slip.

   Presentational only: it renders whatever sale it is handed, so the till
   and the reprint screen produce byte-identical paper. The print rules that
   isolate it on the page live in app/admin/pos/pos.css.
   ========================================================================== */

import BrandMark from "@/components/BrandMark";
import { STORE } from "@/lib/pos";
import type { ApiSale } from "@/lib/serialize";

/** Bare grouped number — the receipt says "PKR" once, on the total line. */
const amt = (n: number) => n.toLocaleString("en-PK");

/** `sale.taxRate` already arrives as a percentage — trim a trailing ".0". */
const pct = (p: number) => `${Number(p.toFixed(2))}%`;

const stamp = (iso: string) =>
  new Date(iso).toLocaleString("en-PK", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

const PAYMENT_LABEL: Record<ApiSale["payment"], string> = {
  CASH: "Cash",
  CARD: "Card",
  MIXED: "Cash + Card",
};

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className={strong ? "rcpt__row rcpt__row--strong" : "rcpt__row"}>
      <span>{label}</span>
      <span>{value}</span>
    </div>
  );
}

export default function Receipt({ sale }: { sale: ApiSale }) {
  const variant = (item: ApiSale["items"][number]) =>
    [item.color, item.size].filter(Boolean).join(" / ");

  return (
    <div className="rcpt">
      <header className="rcpt__head">
        {/* Single-ink: a thermal head has one colour, and solid black bars
            survive the reproduction better than four screened greys. */}
        <BrandMark size={46} tone="ink" className="rcpt__mark" />
        <strong>{STORE.name}</strong>
        {STORE.address && <span>{STORE.address}</span>}
        {STORE.phone && <span>Ph: {STORE.phone}</span>}
        {STORE.ntn && <span>NTN: {STORE.ntn}</span>}
      </header>

      {sale.status === "VOIDED" && <div className="rcpt__void">* * VOIDED * *</div>}

      <div className="rcpt__rule" />

      <Row label="Receipt" value={sale.number} />
      <Row label="Date" value={stamp(sale.createdAt)} />
      <Row label="Cashier" value={sale.cashierName} />
      {sale.customerName && <Row label="Customer" value={sale.customerName} />}
      {sale.phone && <Row label="Phone" value={sale.phone} />}

      <div className="rcpt__rule" />

      <ul className="rcpt__items">
        {sale.items.map((item) => (
          <li key={item.id}>
            <div className="rcpt__name">
              {item.name}
              {variant(item) && <em> ({variant(item)})</em>}
            </div>
            <div className="rcpt__row">
              <span>
                {item.qty} × {amt(item.price)}
              </span>
              <span>{amt(item.lineTotal)}</span>
            </div>
          </li>
        ))}
      </ul>

      <div className="rcpt__rule" />

      <Row label="Subtotal" value={amt(sale.subtotal)} />
      {sale.discount > 0 && <Row label="Discount" value={`-${amt(sale.discount)}`} />}
      {sale.tax > 0 && <Row label={`GST ${pct(sale.taxRate)}`} value={amt(sale.tax)} />}

      <div className="rcpt__rule" />
      <Row label="TOTAL" value={`PKR ${amt(sale.total)}`} strong />
      <div className="rcpt__rule" />

      <Row label="Paid by" value={PAYMENT_LABEL[sale.payment]} />
      {sale.cardAmount != null && sale.cardAmount > 0 && (
        <Row label="Card" value={amt(sale.cardAmount)} />
      )}
      {sale.cashGiven != null && sale.cashGiven > 0 && (
        <Row label="Cash" value={amt(sale.cashGiven)} />
      )}
      {sale.change > 0 && <Row label="Change" value={amt(sale.change)} />}

      {sale.notes && <p className="rcpt__notes">{sale.notes}</p>}

      {sale.status === "VOIDED" && (
        <>
          <div className="rcpt__rule" />
          <p className="rcpt__notes">
            Voided{sale.voidedAt ? ` on ${stamp(sale.voidedAt)}` : ""}
            {sale.voidReason ? ` — ${sale.voidReason}` : ""}
          </p>
        </>
      )}

      <div className="rcpt__rule" />
      <footer className="rcpt__foot">
        <span>{STORE.footer}</span>
        <span className="rcpt__small">
          {sale.items.reduce((n, i) => n + i.qty, 0)} item(s) · {sale.number}
        </span>
      </footer>
    </div>
  );
}

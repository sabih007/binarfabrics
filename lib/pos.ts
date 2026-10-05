/* ==========================================================================
   Counter / point-of-sale constants.

   Safe to import from both server and client components: every value is a
   literal or a NEXT_PUBLIC_ variable, which Next inlines at build time.
   ========================================================================== */

/** Printed at the top of every receipt. Override per-shop in .env. */
export const STORE = {
  name: process.env.NEXT_PUBLIC_STORE_NAME || "BinAr Fabrics",
  address: process.env.NEXT_PUBLIC_STORE_ADDRESS || "",
  phone: process.env.NEXT_PUBLIC_STORE_PHONE || "",
  /** Sales-tax registration number, if the shop has one. */
  ntn: process.env.NEXT_PUBLIC_STORE_NTN || "",
  footer: process.env.NEXT_PUBLIC_RECEIPT_FOOTER || "Thank you for shopping with us!",
};

/**
 * Tax rates are held in basis points so the arithmetic stays in integers —
 * 1800 bp = 18.00%. Whole PKR everywhere else in this codebase, same here.
 */
export const BP = 10_000;

/** Prefills the GST box at the till. `NEXT_PUBLIC_POS_TAX_RATE=18` → 18%. */
export const DEFAULT_TAX_RATE_BP = (() => {
  const percent = Number(process.env.NEXT_PUBLIC_POS_TAX_RATE ?? 0);
  if (!Number.isFinite(percent) || percent < 0 || percent > 100) return 0;
  return Math.round(percent * 100);
})();

/**
 * Minutes to add to UTC to reach the shop's wall clock — PKT (UTC+5) is 300.
 *
 * "Today's takings" has to mean the same thing whether the server runs in
 * Karachi or on a UTC host in Virginia, and whether the owner checks the
 * dashboard from the shop or from abroad. Anchoring every day boundary to one
 * configured offset is what makes the daily figure reproducible.
 */
export const SHOP_UTC_OFFSET = (() => {
  const raw = Number(process.env.NEXT_PUBLIC_SHOP_UTC_OFFSET ?? 300);
  return Number.isFinite(raw) && Math.abs(raw) <= 840 ? raw : 300;
})();

/** Midnight at the start of `at`'s shop-local day, as a UTC instant. */
export function shopDayStart(at: Date = new Date()): Date {
  const shopClock = new Date(at.getTime() + SHOP_UTC_OFFSET * 60_000);
  shopClock.setUTCHours(0, 0, 0, 0);
  return new Date(shopClock.getTime() - SHOP_UTC_OFFSET * 60_000);
}

/** Midnight starting the shop-local calendar day "YYYY-MM-DD", as UTC. */
export function shopDayFrom(day: string): Date {
  const [y, m, d] = day.split("-").map(Number);
  return new Date(Date.UTC(y!, (m ?? 1) - 1, d ?? 1) - SHOP_UTC_OFFSET * 60_000);
}

/** The shop's current calendar day as "YYYY-MM-DD", for `<input type="date">`. */
export function shopToday(at: Date = new Date()): string {
  return new Date(at.getTime() + SHOP_UTC_OFFSET * 60_000).toISOString().slice(0, 10);
}

export const bpToPercent = (bp: number) => bp / 100;
export const percentToBp = (percent: number) => Math.round(percent * 100);

/** "18%" / "17.5%" — no trailing ".0". */
export const formatRate = (bp: number) =>
  `${Number(bpToPercent(bp).toFixed(2))}%`;

/**
 * The one place sale totals are computed. The till previews with it and the
 * API recomputes with it, so what the cashier sees and what is stored can
 * never drift apart.
 *
 * Discount comes off first, then tax applies to the discounted subtotal —
 * the usual order, and the one the FBR expects on a sales-tax invoice.
 */
export function saleTotals(input: {
  lines: { price: number; qty: number }[];
  discount: number;
  taxRateBp: number;
}) {
  const subtotal = input.lines.reduce((sum, l) => sum + l.price * l.qty, 0);
  // Never let a discount exceed the goods — that would mint a negative total.
  const discount = Math.min(Math.max(0, Math.round(input.discount)), subtotal);
  const taxable = subtotal - discount;
  const tax = Math.round((taxable * input.taxRateBp) / BP);
  return { subtotal, discount, tax, total: taxable + tax };
}

/** A flat-rupee or percentage discount, resolved against the subtotal. */
export function resolveDiscount(
  mode: "amount" | "percent",
  value: number,
  subtotal: number
): number {
  if (!Number.isFinite(value) || value <= 0) return 0;
  if (mode === "percent") return Math.min(subtotal, Math.round((subtotal * Math.min(value, 100)) / 100));
  return Math.min(subtotal, Math.round(value));
}

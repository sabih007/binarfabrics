"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ApiError, apiGet, apiSend } from "@/lib/client";
import { money } from "@/lib/products";
import { DEFAULT_TAX_RATE_BP, bpToPercent, percentToBp, resolveDiscount, saleTotals } from "@/lib/pos";
import type { ApiSale } from "@/lib/serialize";
import Receipt from "@/components/admin/Receipt";
import { printReceipt } from "@/lib/print";

/* ------------------------------------------------------------------ types */

/** The slice of the public product payload the till needs. */
interface Found {
  slug: string;
  name: string;
  price: number;
  stock: number;
  sizes: string[];
  category: string;
  categoryName: string;
  fabric: string;
  image?: string;
}

interface Line {
  /** Stable React key; also how a row is addressed for edits. */
  key: string;
  /** null for a line typed in by hand — something not in the catalogue. */
  slug: string | null;
  name: string;
  price: number;
  qty: number;
  size: string | null;
  /** Catalogue stock at the time the line was added, for the warning only. */
  stock: number | null;
  sizeOptions: string[];
  image?: string;
}

type Payment = "CASH" | "CARD" | "MIXED";
type DiscountMode = "amount" | "percent";

/* ---------------------------------------------------------------- helpers */

/** Number inputs are kept as strings so a cleared box isn't a sticky 0. */
const num = (v: string) => {
  const n = Number(v.replace(/,/g, ""));
  return Number.isFinite(n) && n > 0 ? n : 0;
};

const newKey = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `k${Date.now()}${Math.random()}`;

/** Bare grouped number — the label carries "Rs", not every figure. */
const rs = (n: number) => n.toLocaleString("en-PK");

/**
 * One-tap cash amounts for whatever is still owed: the round figures just
 * above the bill, plus the note a customer is likely to hand over. Tapping
 * one *sets* the cash received, so the change appears in a single tap rather
 * than the cashier adding notes up in their head.
 */
function tenderOptions(owed: number): number[] {
  if (owed <= 0) return [];
  const amounts = new Set<number>();
  for (const step of [100, 500, 1000, 5000]) {
    const up = Math.ceil(owed / step) * step;
    if (up > owed) amounts.add(up);
  }
  for (const note of [500, 1000, 2000, 5000]) if (note > owed) amounts.add(note);
  return [...amounts].sort((a, b) => a - b).slice(0, 3);
}

/**
 * The three-step strip is for a cashier's first shift, so it remembers being
 * dismissed. Storage can throw (private window, site data blocked) and a till
 * that won't open because of a help banner would be absurd — so every access
 * is guarded and failure just shows the strip.
 */
const HELP_KEY = "pos.help.dismissed";

function helpDismissed() {
  try {
    return localStorage.getItem(HELP_KEY) === "1";
  } catch {
    return false;
  }
}

/** Numbered heading, so the panel still reads as a step in a sequence. */
function Step({ n, title, hint }: { n: number; title: string; hint?: string }) {
  return (
    <div className="pos-step">
      <span className="pos-step__n" aria-hidden="true">
        {n}
      </span>
      <div>
        <h2 className="pos-step__title">{title}</h2>
        {hint && <p className="pos-step__hint">{hint}</p>}
      </div>
    </div>
  );
}

/**
 * Product tile. Falls back to the first letter when there's no photo.
 *
 * `inBasket` is what this sale has already taken, so the badge counts down
 * as the cashier taps rather than repeating a figure that stopped being true
 * on the first tap.
 */
function Tile({ p, inBasket, onAdd }: { p: Found; inBasket: number; onAdd: (p: Found) => void }) {
  const left = p.stock - inBasket;

  return (
    <button type="button" className="pos-tile" onClick={() => onAdd(p)}>
      <span className="pos-tile__media">
        {p.image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={p.image} alt="" loading="lazy" />
        ) : (
          <span className="pos-tile__letter" aria-hidden="true">
            {p.name.charAt(0)}
          </span>
        )}
        <span className={left > 0 ? "pos-tile__stock" : "pos-tile__stock is-out"}>
          {left > 0 ? `${left} in stock` : left === 0 ? "None left" : `${-left} oversold`}
        </span>
      </span>
      <span className="pos-tile__name">{p.name}</span>
      <span className="pos-tile__meta">
        {p.fabric}
        {p.categoryName && ` · ${p.categoryName}`}
      </span>
      <span className="pos-tile__foot">
        <span className="pos-tile__price">{money(p.price)}</span>
        <span className="pos-tile__add">+ Add</span>
      </span>
    </button>
  );
}

export default function PosClient() {
  // ---- catalogue ------------------------------------------------------
  const [catalogue, setCatalogue] = useState<Found[]>([]);
  const [loading, setLoading] = useState(true);
  const [cat, setCat] = useState("all");
  const [query, setQuery] = useState("");
  const searchRef = useRef<HTMLInputElement>(null);
  const billRef = useRef<HTMLElement>(null);

  // ---- basket ---------------------------------------------------------
  const [lines, setLines] = useState<Line[]>([]);

  // ---- hand-typed line ------------------------------------------------
  const [manualName, setManualName] = useState("");
  const [manualPrice, setManualPrice] = useState("");
  const [manualQty, setManualQty] = useState("1");

  // ---- sale details ---------------------------------------------------
  const [customerName, setCustomerName] = useState("");
  const [phone, setPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [discountMode, setDiscountMode] = useState<DiscountMode>("amount");
  const [discountValue, setDiscountValue] = useState("");
  const [taxRate, setTaxRate] = useState(String(bpToPercent(DEFAULT_TAX_RATE_BP)));
  const [payment, setPayment] = useState<Payment>("CASH");
  const [cashGiven, setCashGiven] = useState("");
  const [cardAmount, setCardAmount] = useState("");

  /* ---- what's on screen ----------------------------------------------
     A plain cash sale should need nothing but a tap and the cash received,
     so everything else starts folded away. GST is the exception: where the
     shop configured a rate it applies to every sale. */
  const [showManual, setShowManual] = useState(false);
  const [showDiscount, setShowDiscount] = useState(false);
  const [showTax, setShowTax] = useState(DEFAULT_TAX_RATE_BP > 0);
  const [showCustomer, setShowCustomer] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);

  // ---- submission -----------------------------------------------------
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fields, setFields] = useState<Record<string, string>>({});
  const [done, setDone] = useState<ApiSale | null>(null);

  // Read after mount: localStorage doesn't exist while the page renders on
  // the server, and reading it in useState would break hydration.
  useEffect(() => setHelpOpen(!helpDismissed()), []);

  /* --------------------------------------------------------- catalogue */

  /**
   * The whole catalogue in one request, then filtered in the browser.
   * A counter needs tapping between categories to feel instant, and it
   * makes the chip counts agree with what's actually on screen. The cap is
   * the API's own maximum; a shop that outgrows it wants paging here.
   */
  const loadCatalogue = useCallback(async () => {
    try {
      const d = await apiGet<{ products: Found[] }>("/api/products?perPage=100&sort=featured");
      setCatalogue(d.products);
    } catch {
      setError("Couldn't load the catalogue. You can still type items in by hand.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCatalogue();
  }, [loadCatalogue]);

  /** Chips: every category present in the catalogue, with its count. */
  const categories = useMemo(() => {
    const seen = new Map<string, { slug: string; name: string; count: number }>();
    for (const p of catalogue) {
      if (!p.category) continue;
      const row = seen.get(p.category) ?? { slug: p.category, name: p.categoryName || p.category, count: 0 };
      row.count++;
      seen.set(p.category, row);
    }
    return [...seen.values()].sort((a, b) => b.count - a.count);
  }, [catalogue]);

  /** How many of each catalogue line this sale has already taken. */
  const basketBySlug = useMemo(() => {
    const counts = new Map<string, number>();
    for (const l of lines) {
      if (!l.slug) continue;
      counts.set(l.slug, (counts.get(l.slug) ?? 0) + l.qty);
    }
    return counts;
  }, [lines]);

  const shown = useMemo(() => {
    const term = query.trim().toLowerCase();
    return catalogue.filter((p) => {
      if (cat !== "all" && p.category !== cat) return false;
      if (!term) return true;
      return (
        p.name.toLowerCase().includes(term) ||
        p.slug.toLowerCase().includes(term) ||
        p.fabric.toLowerCase().includes(term) ||
        p.categoryName.toLowerCase().includes(term)
      );
    });
  }, [catalogue, cat, query]);

  /* ------------------------------------------------------------ totals */

  // Computed with the same helpers the API uses, so the figure on screen is
  // the figure that gets stored.
  const totals = useMemo(() => {
    const bare = lines.reduce((sum, l) => sum + l.price * l.qty, 0);
    const discount = resolveDiscount(discountMode, num(discountValue), bare);
    return saleTotals({ lines, discount, taxRateBp: percentToBp(num(taxRate)) });
  }, [lines, discountMode, discountValue, taxRate]);

  const card = payment === "CARD" ? totals.total : payment === "MIXED" ? num(cardAmount) : 0;
  const cash = payment === "CARD" ? 0 : num(cashGiven);
  const tendered = cash + Math.min(card, totals.total);
  const change = tendered - totals.total;
  const short = lines.length > 0 && change < 0;

  /** What's left for the customer to pay in cash. */
  const owed = Math.max(0, totals.total - Math.min(card, totals.total));

  const tenders = useMemo(() => tenderOptions(owed), [owed]);

  /**
   * Why the finish button is off, in the words a cashier would use. A dead
   * button with no explanation is the most confusing thing a till can do.
   */
  const blocked = (() => {
    if (lines.length === 0) return "Tap a product to start the sale.";
    if (payment === "MIXED" && card <= 0) return "Type how much is going on the card.";
    if (short) return `Not covered yet — ${money(-change)} still to pay.`;
    return null;
  })();

  /* --------------------------------------------------------- shortcuts

     The counter keyboard beats the mouse, and a barcode scanner is just a
     keyboard that types fast and presses Enter — both are served here. The
     handler binds once and reads fresh state through a ref, so it never
     reattaches between keystrokes. */

  const latest = useRef({
    finish: () => {},
    exact: () => {},
    blocked: null as string | null,
    done: false,
  });

  useEffect(() => {
    latest.current = {
      finish: complete,
      exact: () => setCashGiven(String(owed)),
      blocked,
      done: done !== null,
    };
  });

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const el = e.target as HTMLElement | null;
      const typing =
        !!el &&
        (el.tagName === "INPUT" ||
          el.tagName === "SELECT" ||
          el.tagName === "TEXTAREA" ||
          el.isContentEditable);
      const now = latest.current;

      if (e.key === "F2") {
        e.preventDefault();
        searchRef.current?.focus();
        searchRef.current?.select();
        return;
      }
      if (e.key === "F4" && !now.done) {
        e.preventDefault();
        now.exact();
        return;
      }
      if (e.key === "F9" && !now.done) {
        e.preventDefault();
        if (!now.blocked) now.finish();
        return;
      }
      if (e.key === "Escape" && el === searchRef.current) {
        setQuery("");
        return;
      }

      // A scan — or a cashier simply starting to type — while focus sits
      // nowhere useful lands in the search box instead of being swallowed.
      // Letters, digits and a dash only: Space and Enter have to keep working
      // as "press the button I'm on".
      if (!typing && /^[\w-]$/.test(e.key) && !e.ctrlKey && !e.altKey && !e.metaKey) {
        searchRef.current?.focus();
      }
    }

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  /* -------------------------------------------------------- basket ops */

  const addProduct = useCallback((p: Found) => {
    // One size on the product means there is nothing to choose — fill it in
    // rather than asking the cashier to confirm the obvious.
    const size = p.sizes.length === 1 ? p.sizes[0]! : null;

    setLines((prev) => {
      // Same product at the same size → bump the existing row instead of
      // stacking duplicates, which is what tapping twice means.
      const at = prev.findIndex((l) => l.slug === p.slug && l.size === size);
      if (at >= 0) {
        const next = [...prev];
        next[at] = { ...next[at]!, qty: next[at]!.qty + 1 };
        return next;
      }
      return [
        ...prev,
        {
          key: newKey(),
          slug: p.slug,
          name: p.name,
          price: p.price,
          qty: 1,
          size,
          stock: p.stock,
          sizeOptions: p.sizes,
          image: p.image,
        },
      ];
    });
  }, []);

  function addManual() {
    const name = manualName.trim();
    const price = num(manualPrice);
    const qty = Math.max(1, Math.round(num(manualQty) || 1));
    if (!name || price <= 0) {
      setError("A hand-typed line needs a description and a price above zero.");
      return;
    }

    setError(null);
    setLines((prev) => [
      ...prev,
      { key: newKey(), slug: null, name, price, qty, size: null, stock: null, sizeOptions: [] },
    ]);
    setManualName("");
    setManualPrice("");
    setManualQty("1");
    setShowManual(false);
  }

  const patchLine = (key: string, patch: Partial<Line>) =>
    setLines((prev) => prev.map((l) => (l.key === key ? { ...l, ...patch } : l)));

  const removeLine = (key: string) => setLines((prev) => prev.filter((l) => l.key !== key));

  function clearSale() {
    setLines([]);
    setCustomerName("");
    setPhone("");
    setNotes("");
    setDiscountValue("");
    setDiscountMode("amount");
    setTaxRate(String(bpToPercent(DEFAULT_TAX_RATE_BP)));
    setPayment("CASH");
    setCashGiven("");
    setCardAmount("");
    setError(null);
    setFields({});
    setQuery("");
    setShowManual(false);
    setShowDiscount(false);
    setShowTax(DEFAULT_TAX_RATE_BP > 0);
    setShowCustomer(false);
  }

  function dismissHelp() {
    setHelpOpen(false);
    try {
      localStorage.setItem(HELP_KEY, "1");
    } catch {
      /* fine — the strip simply comes back next time */
    }
  }

  /** Folding the discount away removes it, so nothing can apply unseen. */
  function toggleDiscount() {
    setShowDiscount((open) => {
      if (open) setDiscountValue("");
      return !open;
    });
  }

  /** Same for GST — closed means 0%, not "hidden but still charged". */
  function toggleTax() {
    setShowTax((open) => {
      setTaxRate(open ? "0" : String(bpToPercent(DEFAULT_TAX_RATE_BP) || 0));
      return !open;
    });
  }

  /* ------------------------------------------------------------ submit */

  async function complete() {
    if (!lines.length) return;

    setSaving(true);
    setError(null);
    setFields({});
    try {
      const res = await apiSend<{ sale: ApiSale }>("/api/admin/sales", "POST", {
        items: lines.map((l) =>
          l.slug
            ? { slug: l.slug, qty: l.qty, size: l.size }
            : { name: l.name, price: l.price, qty: l.qty, size: l.size }
        ),
        customerName: customerName.trim(),
        phone: phone.trim(),
        discountMode,
        discountValue: num(discountValue),
        taxRate: num(taxRate),
        payment,
        ...(payment !== "CARD" && { cashGiven: cash }),
        ...(payment === "MIXED" && { cardAmount: num(cardAmount) }),
        notes: notes.trim(),
      });
      setDone(res.sale);
      // The sale just moved stock. Pull the catalogue again so the next
      // customer's tiles show what is actually left on the shelf.
      loadCatalogue();
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
        setFields(err.fields ?? {});
      } else {
        setError("Couldn't save the sale.");
      }
    } finally {
      setSaving(false);
    }
  }

  /* -------------------------------------------------------- after sale */

  if (done) {
    const sold = done.items.reduce((n, i) => n + i.qty, 0);

    return (
      <>
        <div className="adm__head">
          <div>
            <h1>Sale saved</h1>
            <p>
              Receipt {done.number} · {sold} item(s) · {money(done.total)}
            </p>
          </div>
          <div className="adm-actions">
            <button className="adm-btn adm-btn--primary" onClick={printReceipt}>
              Print receipt
            </button>
            <button
              className="adm-btn"
              onClick={() => {
                setDone(null);
                clearSale();
                setTimeout(() => searchRef.current?.focus(), 0);
              }}
            >
              Start next sale
            </button>
          </div>
        </div>

        {done.change > 0 && (
          <div className="pos-change pos-change--big" style={{ marginBottom: 18 }}>
            <span>Give back</span>
            <span>{money(done.change)}</span>
          </div>
        )}

        <p className="pos-step__hint" style={{ marginBottom: 10 }}>
          Below is exactly what the printer will produce. Need it again later, it's saved under
          Counter sales as {done.number}.
        </p>

        <div className="rcpt-paper">
          <Receipt sale={done} />
        </div>
      </>
    );
  }

  /* -------------------------------------------------------------- till */

  const itemCount = lines.reduce((n, l) => n + l.qty, 0);

  return (
    <div className="pos">
      {/* ------------------------------------------------ catalogue side */}
      <div className="pos__main">
        <div className="adm__head">
          <div>
            <h1>New sale</h1>
          </div>
          <div className="adm-actions">
            {!helpOpen && (
              <button className="adm-btn adm-btn--sm" onClick={() => setHelpOpen(true)}>
                How this works
              </button>
            )}
          </div>
        </div>

        {helpOpen && (
          <div className="pos-help">
            <ol>
              <li>
                <strong>Add the items.</strong> Tap a product below, or just start typing the name
                or the code on the tag — a scan goes straight into the search box too. Enter adds
                the first match. Tap the same product again and the quantity goes up.
              </li>
              <li>
                <strong>Check the bill.</strong> It adds up on the right. Where a product comes in
                sizes, tap the one being sold. Only open discount or GST if this sale needs them.
              </li>
              <li>
                <strong>Take the money.</strong> Choose cash or card, then tap the amount the
                customer handed over — the change works itself out. Press the green button and
                print.
              </li>
              <li>
                <strong>Without the mouse.</strong> <kbd className="pos-kbd">F2</kbd> jumps to
                search, <kbd className="pos-kbd">F4</kbd> fills in the exact cash, and{" "}
                <kbd className="pos-kbd">F9</kbd> finishes the sale.
              </li>
            </ol>
            <button className="pos-help__x" onClick={dismissHelp}>
              Got it, hide this
            </button>
          </div>
        )}

        {error && (
          <div className="adm-note adm-note--error" style={{ marginBottom: 16 }}>
            {error}
          </div>
        )}

        <Step
          n={1}
          title="Add the items"
          hint="Tap a product, or type a name or the code from the tag and press Enter. Tap the same product again to raise the quantity."
        />

        <div className="pos-filters">
          <div className="pos-chips" role="group" aria-label="Filter by category">
            <button
              type="button"
              className="pos-chip"
              aria-pressed={cat === "all"}
              onClick={() => setCat("all")}
            >
              All products <span className="pos-chip__n">{catalogue.length}</span>
            </button>
            {categories.map((c) => (
              <button
                key={c.slug}
                type="button"
                className="pos-chip"
                aria-pressed={cat === c.slug}
                onClick={() => setCat(c.slug)}
              >
                {c.name} <span className="pos-chip__n">{c.count}</span>
              </button>
            ))}
          </div>

          <div className="pos-search">
            <input
              ref={searchRef}
              type="search"
              value={query}
              autoFocus
              placeholder="Search or scan a code…  (F2)"
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                // Enter adds the only thing on screen — the fast path when a
                // cashier types a code off the tag.
                if (e.key === "Enter" && shown.length > 0) {
                  e.preventDefault();
                  addProduct(shown[0]!);
                  setQuery("");
                }
              }}
            />
          </div>
        </div>

        {loading ? (
          <div className="adm-panel">
            <div className="adm-empty">Loading the catalogue…</div>
          </div>
        ) : shown.length === 0 ? (
          <div className="adm-panel">
            <div className="adm-empty">
              Nothing matches that.
              <div className="pos-empty__hint">
                Check the spelling, or add it by hand below.
              </div>
            </div>
          </div>
        ) : (
          <div className="pos-grid">
            {shown.map((p) => (
              <Tile key={p.slug} p={p} inBasket={basketBySlug.get(p.slug) ?? 0} onAdd={addProduct} />
            ))}
          </div>
        )}

        <button
          type="button"
          className="pos-more"
          aria-expanded={showManual}
          onClick={() => setShowManual((v) => !v)}
        >
          {showManual ? "− Hide" : "+ Add something not in the catalogue"}
        </button>

        {showManual && (
          <div className="pos-adjust__body">
            <p className="adm-field__hint" style={{ marginBottom: 10 }}>
              For stitching, alterations, or anything without a catalogue entry. You set the price
              yourself and stock isn't touched.
            </p>
            <div className="pos-manual">
              <div className="adm-field">
                <label htmlFor="pos-mname">What is it?</label>
                <input
                  id="pos-mname"
                  type="text"
                  value={manualName}
                  placeholder="Stitching charges, alteration…"
                  onChange={(e) => setManualName(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && addManual()}
                />
              </div>
              <div className="adm-field">
                <label htmlFor="pos-mprice">Price (Rs)</label>
                <input
                  id="pos-mprice"
                  type="number"
                  min={1}
                  value={manualPrice}
                  placeholder="0"
                  onChange={(e) => setManualPrice(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && addManual()}
                />
              </div>
              <div className="adm-field">
                <label htmlFor="pos-mqty">How many?</label>
                <input
                  id="pos-mqty"
                  type="number"
                  min={1}
                  value={manualQty}
                  onChange={(e) => setManualQty(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && addManual()}
                />
              </div>
              <button className="adm-btn" onClick={addManual} type="button">
                Add to sale
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ---------------------------------------------------- bill side */}
      <aside className="pos__side" ref={billRef}>
        <div className="pos-bill">
          <div className="pos-bill__head">
            <Step n={2} title="Check the bill" />
            {lines.length > 0 && (
              <button className="pos-reset" onClick={clearSale} disabled={saving}>
                Start over
              </button>
            )}
          </div>

          {lines.length === 0 ? (
            <div className="pos-bill__empty">
              <p>Nothing added yet.</p>
              <span>Tap a product to begin.</span>
            </div>
          ) : (
            <ul className="pos-lines">
              {lines.map((line) => (
                <li className="pos-line" key={line.key}>
                  <span className="pos-line__thumb">
                    {line.image ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={line.image} alt="" />
                    ) : (
                      <span aria-hidden="true">{line.name.charAt(0)}</span>
                    )}
                  </span>

                  <div className="pos-line__body">
                    <div className="pos-line__top">
                      <span className="pos-line__name">{line.name}</span>
                      <button
                        className="pos-line__x"
                        type="button"
                        aria-label={`Remove ${line.name}`}
                        onClick={() => removeLine(line.key)}
                      >
                        ×
                      </button>
                    </div>

                    <div className="pos-line__meta">
                      {line.sizeOptions.length > 0 ? (
                        <div className="pos-sizes" role="group" aria-label={`Size for ${line.name}`}>
                          {line.sizeOptions.map((s) => (
                            <button
                              key={s}
                              type="button"
                              className="pos-size"
                              aria-pressed={line.size === s}
                              onClick={() => patchLine(line.key, { size: line.size === s ? null : s })}
                            >
                              {s}
                            </button>
                          ))}
                        </div>
                      ) : (
                        <span>{line.slug ? `Code ${line.slug}` : "Typed in by hand"}</span>
                      )}
                    </div>

                    {/* Easy to skip in a hurry, and a receipt with no size
                        starts an argument later — so say so on the line. */}
                    {line.sizeOptions.length > 0 && !line.size && (
                      <div className="pos-warn">Tap the size the customer is taking</div>
                    )}

                    {/* Counter sales may outrun the stock count, but the
                        cashier should see it happen. */}
                    {line.stock !== null && line.qty > line.stock && (
                      <div className="pos-warn">
                        Only {line.stock} left on the system — selling {line.qty}
                      </div>
                    )}

                    <div className="pos-line__foot">
                      <div className="pos-qty">
                        <button
                          type="button"
                          aria-label={`One fewer ${line.name}`}
                          disabled={line.qty <= 1}
                          onClick={() => patchLine(line.key, { qty: line.qty - 1 })}
                        >
                          −
                        </button>
                        <input
                          type="number"
                          min={1}
                          aria-label={`Quantity of ${line.name}`}
                          value={line.qty}
                          onChange={(e) =>
                            patchLine(line.key, {
                              qty: Math.max(1, Math.round(num(e.target.value) || 1)),
                            })
                          }
                        />
                        <button
                          type="button"
                          className="pos-qty__up"
                          aria-label={`One more ${line.name}`}
                          onClick={() => patchLine(line.key, { qty: line.qty + 1 })}
                        >
                          +
                        </button>
                      </div>
                      <span className="pos-line__total">{money(line.price * line.qty)}</span>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}

          {/* ------------------------------------------------- totals */}
          <div className="pos-bill__section">
            <div className="pos-adjust">
              <button type="button" className="pos-more" aria-expanded={showDiscount} onClick={toggleDiscount}>
                {showDiscount ? "− Remove the discount" : "+ Give a discount"}
              </button>

              {showDiscount && (
                <div className="pos-adjust__body">
                  <div className="pos-split">
                    <div className={fields.discountValue ? "adm-field adm-field--invalid" : "adm-field"}>
                      <label htmlFor="pos-disc">
                        {discountMode === "percent" ? "Take off (%)" : "Take off (Rs)"}
                      </label>
                      <input
                        id="pos-disc"
                        type="number"
                        min={0}
                        autoFocus
                        value={discountValue}
                        placeholder="0"
                        onChange={(e) => setDiscountValue(e.target.value)}
                      />
                    </div>
                    <div className="pos-seg" role="group" aria-label="Discount in rupees or percent">
                      <button type="button" aria-pressed={discountMode === "amount"} onClick={() => setDiscountMode("amount")}>
                        Rs
                      </button>
                      <button type="button" aria-pressed={discountMode === "percent"} onClick={() => setDiscountMode("percent")}>
                        %
                      </button>
                    </div>
                  </div>
                  {fields.discountValue ? (
                    <p className="adm-field__error">{fields.discountValue}</p>
                  ) : (
                    <p className="adm-field__hint">
                      {discountMode === "percent"
                        ? "A share of the item total — type 10 for 10% off."
                        : "A flat amount off — type 200 for Rs 200 off."}
                    </p>
                  )}
                </div>
              )}

              <button type="button" className="pos-more" aria-expanded={showTax} onClick={toggleTax}>
                {showTax ? "− Don't charge GST" : "+ Add GST"}
              </button>

              {showTax && (
                <div className="pos-adjust__body">
                  <div className="adm-field" style={{ maxWidth: 130 }}>
                    <label htmlFor="pos-tax">GST rate (%)</label>
                    <input
                      id="pos-tax"
                      type="number"
                      min={0}
                      max={100}
                      step="0.5"
                      value={taxRate}
                      onChange={(e) => setTaxRate(e.target.value)}
                    />
                  </div>
                  <p className="adm-field__hint">
                    Charged after any discount. The receipt keeps whatever rate you use here.
                  </p>
                </div>
              )}
            </div>

            <div className="pos-sum">
              <div className="pos-sum__row">
                <span>Items ({itemCount})</span>
                <span>{rs(totals.subtotal)}</span>
              </div>
              {totals.discount > 0 && (
                <div className="pos-sum__row pos-sum__row--muted">
                  <span>Discount</span>
                  <span>−{rs(totals.discount)}</span>
                </div>
              )}
              {totals.tax > 0 && (
                <div className="pos-sum__row pos-sum__row--muted">
                  <span>GST {Number(num(taxRate).toFixed(2))}%</span>
                  <span>{rs(totals.tax)}</span>
                </div>
              )}
              <div className="pos-sum__total">
                <span>Customer pays</span>
                <span>{money(totals.total)}</span>
              </div>
            </div>
          </div>

          {/* ------------------------------------------------ payment */}
          <div className="pos-bill__section">
            <Step n={3} title="Take the payment" />

            <div className="pos-pay">
              <div className="pos-seg pos-seg--wide" role="group" aria-label="Payment method">
                {(
                  [
                    ["CASH", "Cash"],
                    ["CARD", "Card"],
                    ["MIXED", "Both"],
                  ] as const
                ).map(([value, label]) => (
                  <button key={value} type="button" aria-pressed={payment === value} onClick={() => setPayment(value)}>
                    {label}
                  </button>
                ))}
              </div>

              {payment === "CARD" && (
                <p className="adm-field__hint">
                  The whole {money(totals.total)} goes on the card — nothing else to fill in.
                </p>
              )}

              {payment === "MIXED" && (
                <div className={fields.cardAmount ? "adm-field adm-field--invalid" : "adm-field"}>
                  <label htmlFor="pos-card">How much on the card? (Rs)</label>
                  <input
                    id="pos-card"
                    type="number"
                    min={0}
                    value={cardAmount}
                    placeholder="0"
                    onChange={(e) => setCardAmount(e.target.value)}
                  />
                  {fields.cardAmount ? (
                    <p className="adm-field__error">{fields.cardAmount}</p>
                  ) : (
                    <p className="adm-field__hint">The rest, {money(owed)}, comes in cash below.</p>
                  )}
                </div>
              )}

              {payment !== "CARD" && (
                <>
                  <div className="adm-field">
                    <label htmlFor="pos-cash">
                      Cash handed over (Rs)
                      {owed > 0 && <span className="pos-due"> {money(owed)} due</span>}
                    </label>
                    <input
                      id="pos-cash"
                      type="number"
                      min={0}
                      value={cashGiven}
                      placeholder="0"
                      onChange={(e) => setCashGiven(e.target.value)}
                    />
                  </div>

                  <div className="pos-tender">
                    <button
                      className="adm-btn adm-btn--sm"
                      type="button"
                      disabled={owed <= 0}
                      onClick={() => setCashGiven(String(owed))}
                    >
                      Exact{owed > 0 ? ` · ${rs(owed)}` : ""}
                    </button>
                    {tenders.map((amount) => (
                      <button
                        key={amount}
                        className="adm-btn adm-btn--sm"
                        type="button"
                        title={`Customer handed over ${rs(amount)}`}
                        onClick={() => setCashGiven(String(amount))}
                      >
                        {rs(amount)}
                      </button>
                    ))}
                    {cash > 0 && (
                      <button className="adm-btn adm-btn--sm" type="button" onClick={() => setCashGiven("")}>
                        Clear
                      </button>
                    )}
                  </div>
                </>
              )}

              {lines.length > 0 && (
                <div
                  className={
                    short ? "pos-change pos-change--big pos-change--short" : "pos-change pos-change--big"
                  }
                >
                  <span>{short ? "Still to pay" : "Give back"}</span>
                  <span>{money(Math.abs(change))}</span>
                </div>
              )}
            </div>
          </div>

          {/* Walk-ins are usually anonymous, so this stays out of the way. */}
          <div className="pos-bill__section">
            <button
              type="button"
              className="pos-more pos-more--flush"
              aria-expanded={showCustomer}
              onClick={() => setShowCustomer((v) => !v)}
            >
              {showCustomer ? "− Hide customer details" : "+ Add a customer name or a note"}
            </button>

            {/* Collapsed but filled in — show it, so nothing rides along
                invisibly onto the receipt. */}
            {!showCustomer && (customerName || phone || notes) && (
              <p className="adm-field__hint" style={{ marginTop: 8 }}>
                On this sale: {[customerName, phone, notes].filter(Boolean).join(" · ")}
              </p>
            )}

            {showCustomer && (
              <div className="adm-form" style={{ marginTop: 13 }}>
                <div className="adm-field">
                  <label htmlFor="pos-cname">Customer name</label>
                  <input id="pos-cname" type="text" value={customerName} onChange={(e) => setCustomerName(e.target.value)} />
                </div>
                <div className={fields.phone ? "adm-field adm-field--invalid" : "adm-field"}>
                  <label htmlFor="pos-phone">Phone</label>
                  <input
                    id="pos-phone"
                    type="text"
                    value={phone}
                    placeholder="03xx xxxxxxx"
                    onChange={(e) => setPhone(e.target.value)}
                  />
                  {fields.phone && <p className="adm-field__error">{fields.phone}</p>}
                </div>
                <div className="adm-field">
                  <label htmlFor="pos-notes">Note to print on the receipt</label>
                  <input
                    id="pos-notes"
                    type="text"
                    value={notes}
                    placeholder="Exchange within 7 days…"
                    onChange={(e) => setNotes(e.target.value)}
                  />
                </div>
              </div>
            )}
          </div>

          <div className="pos-done">
            <button
              className="adm-btn adm-btn--primary adm-btn--block"
              onClick={complete}
              disabled={saving || Boolean(blocked)}
            >
              {saving ? "Saving…" : `Finish sale · ${money(totals.total)}`}
            </button>
            {blocked ? (
              <p className="pos-blocked">{blocked}</p>
            ) : (
              <p className="pos-hint">Saves the sale, then shows the receipt to print.</p>
            )}
            <p className="pos-hint">
              <kbd className="pos-kbd">F2</kbd> search · <kbd className="pos-kbd">F4</kbd> exact cash ·{" "}
              <kbd className="pos-kbd">F9</kbd> finish
            </p>
          </div>
        </div>
      </aside>

      {/* Below 1100px the bill sits under the whole catalogue, so the running
          total and the way to finish follow the cashier down the page. */}
      {lines.length > 0 && (
        <div className="pos-dock">
          <div className="pos-dock__sum">
            <span>
              {itemCount} item{itemCount === 1 ? "" : "s"}
            </span>
            <strong>{money(totals.total)}</strong>
          </div>
          <button
            type="button"
            className="adm-btn adm-btn--primary"
            disabled={saving}
            onClick={() => {
              if (blocked) billRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
              else complete();
            }}
          >
            {saving ? "Saving…" : blocked ? "Go to the bill" : "Finish sale"}
          </button>
        </div>
      )}
    </div>
  );
}

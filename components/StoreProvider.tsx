"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { FREE_SHIPPING_AT, SHIPPING_FEE, type Product } from "@/lib/products";
import { apiGet } from "@/lib/client";

export interface CartLine {
  key: string;
  id: string;
  qty: number;
  color: string | null;
  size: string | null;
}

interface ToastState {
  msg: string;
  link?: { href?: string; action?: "openCart"; label: string };
}

interface StoreValue {
  cart: CartLine[];
  wishlist: string[];
  hydrated: boolean;
  /** Products referenced by the cart/wishlist, fetched from the API. */
  catalogue: Record<string, Product>;
  productById: (id: string) => Product | undefined;
  addToCart: (product: Product | string, qty?: number, opts?: { color?: string | null; size?: string | null }) => void;
  setQty: (key: string, qty: number) => void;
  clearCart: () => void;
  toggleWishlist: (id: string, product?: Product) => void;
  isWished: (id: string) => boolean;
  totals: { subtotal: number; count: number; shipping: number; total: number };
  cartOpen: boolean;
  openCart: () => void;
  closeCart: () => void;
  searchOpen: boolean;
  openSearch: () => void;
  closeSearch: () => void;
  mobileOpen: boolean;
  openMobile: () => void;
  closeMobile: () => void;
  toast: ToastState | null;
  showToast: (msg: string, link?: ToastState["link"]) => void;
}

const StoreContext = createContext<StoreValue | null>(null);

function load<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}
function save(key: string, val: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(val));
  } catch {}
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const [cart, setCart] = useState<CartLine[]>([]);
  const [wishlist, setWishlist] = useState<string[]>([]);
  const [catalogue, setCatalogue] = useState<Record<string, Product>>({});
  const [hydrated, setHydrated] = useState(false);
  const [cartOpen, setCartOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [toast, setToast] = useState<ToastState | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load persisted state after mount to avoid hydration mismatches.
  useEffect(() => {
    setCart(load<CartLine[]>("binar_cart", []));
    setWishlist(load<string[]>("binar_wishlist", []));
    setHydrated(true);
  }, []);
  useEffect(() => {
    if (hydrated) save("binar_cart", cart);
  }, [cart, hydrated]);
  useEffect(() => {
    if (hydrated) save("binar_wishlist", wishlist);
  }, [wishlist, hydrated]);

  /**
   * A saved cart survives across sessions, so the products it names must be
   * re-fetched — prices and stock may have changed since. Adding to the cart
   * seeds the catalogue directly, so this only runs for items we don't have.
   */
  useEffect(() => {
    if (!hydrated) return;

    const missing = [...new Set([...cart.map((l) => l.id), ...wishlist])].filter(
      (id) => !catalogue[id]
    );
    if (missing.length === 0) return;

    let cancelled = false;
    Promise.all(
      missing.map((slug) =>
        apiGet<{ product: Product }>(`/api/products/${encodeURIComponent(slug)}`)
          .then((d) => d.product)
          .catch(() => null)
      )
    ).then((products) => {
      if (cancelled) return;

      const found = products.filter((p): p is Product => p !== null);
      if (found.length > 0) {
        setCatalogue((prev) => ({
          ...prev,
          ...Object.fromEntries(found.map((p) => [p.id, p])),
        }));
      }

      // Drop cart lines whose product has been deleted or unpublished, so the
      // bag can't show a blank row or quote a stale total.
      const gone = new Set(
        missing.filter((slug) => !found.some((p) => p.id === slug))
      );
      if (gone.size > 0) {
        setCart((prev) => prev.filter((l) => !gone.has(l.id)));
        setWishlist((prev) => prev.filter((id) => !gone.has(id)));
      }
    });

    return () => {
      cancelled = true;
    };
  }, [hydrated, cart, wishlist, catalogue]);

  // Lock body scroll while any overlay is open.
  useEffect(() => {
    document.body.classList.toggle("no-scroll", cartOpen || searchOpen || mobileOpen);
  }, [cartOpen, searchOpen, mobileOpen]);

  // Escape closes everything.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setCartOpen(false);
        setSearchOpen(false);
        setMobileOpen(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const showToast = useCallback((msg: string, link?: ToastState["link"]) => {
    setToast({ msg, link });
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 3200);
  }, []);

  const productById = useCallback((id: string) => catalogue[id], [catalogue]);

  const addToCart: StoreValue["addToCart"] = useCallback(
    (product, qty = 1, opts = {}) => {
      // Callers that already hold the product pass it in, which keeps the
      // catalogue warm and means no round trip before the bag can render.
      const id = typeof product === "string" ? product : product.id;
      const known = typeof product === "string" ? catalogue[id] : product;

      if (typeof product !== "string") {
        setCatalogue((prev) => ({ ...prev, [product.id]: product }));
      }

      if (known && !known.inStock) {
        showToast(`Sorry — “${known.name.split(" — ")[0]}” is out of stock.`);
        return;
      }

      const key = `${id}|${opts.color ?? ""}|${opts.size ?? ""}`;
      setCart((prev) => {
        const line = prev.find((l) => l.key === key);
        if (line) {
          // Never let the bag hold more than the shop has.
          const cap = known?.stock ?? 20;
          const next = Math.min(line.qty + qty, cap);
          if (next === line.qty) {
            showToast(`That's all the stock we have of this one.`);
            return prev;
          }
          return prev.map((l) => (l.key === key ? { ...l, qty: next } : l));
        }
        return [...prev, { key, id, qty, color: opts.color ?? null, size: opts.size ?? null }];
      });

      const label = known?.name.split(" — ")[0] ?? "Item";
      showToast(`Added “${label}” to your bag`, { action: "openCart", label: "View bag" });
    },
    [catalogue, showToast]
  );

  const setQty = useCallback((key: string, qty: number) => {
    setCart((prev) =>
      qty <= 0 ? prev.filter((l) => l.key !== key) : prev.map((l) => (l.key === key ? { ...l, qty } : l))
    );
  }, []);

  const clearCart = useCallback(() => setCart([]), []);

  const toggleWishlist = useCallback(
    (id: string, product?: Product) => {
      if (product) setCatalogue((prev) => ({ ...prev, [product.id]: product }));
      setWishlist((prev) => {
        const on = !prev.includes(id);
        showToast(
          on ? "Saved to your wishlist" : "Removed from wishlist",
          on ? { href: "/shop?wishlist=1", label: "View" } : undefined
        );
        return on ? [...prev, id] : prev.filter((x) => x !== id);
      });
    },
    [showToast]
  );

  const totals = useMemo(() => {
    // Lines whose product hasn't loaded yet contribute nothing rather than
    // guessing a price — the server re-prices at checkout regardless.
    const subtotal = cart.reduce((s, l) => s + (catalogue[l.id]?.price ?? 0) * l.qty, 0);
    const count = cart.reduce((s, l) => s + l.qty, 0);
    const shipping = subtotal === 0 || subtotal >= FREE_SHIPPING_AT ? 0 : SHIPPING_FEE;
    return { subtotal, count, shipping, total: subtotal + shipping };
  }, [cart, catalogue]);

  const value: StoreValue = {
    cart,
    wishlist,
    hydrated,
    catalogue,
    productById,
    addToCart,
    setQty,
    clearCart,
    toggleWishlist,
    isWished: (id) => wishlist.includes(id),
    totals,
    cartOpen,
    openCart: () => setCartOpen(true),
    closeCart: () => setCartOpen(false),
    searchOpen,
    openSearch: () => setSearchOpen(true),
    closeSearch: () => setSearchOpen(false),
    mobileOpen,
    openMobile: () => setMobileOpen(true),
    closeMobile: () => setMobileOpen(false),
    toast,
    showToast,
  };

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useStore must be used within StoreProvider");
  return ctx;
}

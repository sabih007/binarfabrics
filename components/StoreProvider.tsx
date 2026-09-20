"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { byId, FREE_SHIPPING_AT, SHIPPING_FEE } from "@/lib/products";

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
  addToCart: (id: string, qty?: number, opts?: { color?: string | null; size?: string | null }) => void;
  setQty: (key: string, qty: number) => void;
  toggleWishlist: (id: string) => void;
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
  try { localStorage.setItem(key, JSON.stringify(val)); } catch {}
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const [cart, setCart] = useState<CartLine[]>([]);
  const [wishlist, setWishlist] = useState<string[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const [cartOpen, setCartOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [toast, setToast] = useState<ToastState | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load persisted state after mount to avoid hydration mismatches
  useEffect(() => {
    setCart(load<CartLine[]>("binar_cart", []));
    setWishlist(load<string[]>("binar_wishlist", []));
    setHydrated(true);
  }, []);
  useEffect(() => { if (hydrated) save("binar_cart", cart); }, [cart, hydrated]);
  useEffect(() => { if (hydrated) save("binar_wishlist", wishlist); }, [wishlist, hydrated]);

  // Lock body scroll while any overlay is open
  useEffect(() => {
    document.body.classList.toggle("no-scroll", cartOpen || searchOpen || mobileOpen);
  }, [cartOpen, searchOpen, mobileOpen]);

  // Escape closes everything
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") { setCartOpen(false); setSearchOpen(false); setMobileOpen(false); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const showToast = useCallback((msg: string, link?: ToastState["link"]) => {
    setToast({ msg, link });
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 3200);
  }, []);

  const addToCart: StoreValue["addToCart"] = useCallback((id, qty = 1, opts = {}) => {
    const p = byId(id);
    if (!p) return;
    const key = `${id}|${opts.color ?? ""}|${opts.size ?? ""}`;
    setCart((prev) => {
      const line = prev.find((l) => l.key === key);
      if (line) return prev.map((l) => (l.key === key ? { ...l, qty: l.qty + qty } : l));
      return [...prev, { key, id, qty, color: opts.color ?? null, size: opts.size ?? null }];
    });
    showToast(`Added “${p.name.split(" — ")[0]}” to your bag`, { action: "openCart", label: "View bag" });
  }, [showToast]);

  const setQty = useCallback((key: string, qty: number) => {
    setCart((prev) => (qty <= 0 ? prev.filter((l) => l.key !== key) : prev.map((l) => (l.key === key ? { ...l, qty } : l))));
  }, []);

  const toggleWishlist = useCallback((id: string) => {
    setWishlist((prev) => {
      const on = !prev.includes(id);
      showToast(on ? "Saved to your wishlist" : "Removed from wishlist", on ? { href: "/shop?wishlist=1", label: "View" } : undefined);
      return on ? [...prev, id] : prev.filter((x) => x !== id);
    });
  }, [showToast]);

  const totals = useMemo(() => {
    const subtotal = cart.reduce((s, l) => s + (byId(l.id)?.price ?? 0) * l.qty, 0);
    const count = cart.reduce((s, l) => s + l.qty, 0);
    const shipping = subtotal === 0 || subtotal >= FREE_SHIPPING_AT ? 0 : SHIPPING_FEE;
    return { subtotal, count, shipping, total: subtotal + shipping };
  }, [cart]);

  const value: StoreValue = {
    cart, wishlist, hydrated, addToCart, setQty, toggleWishlist,
    isWished: (id) => wishlist.includes(id),
    totals,
    cartOpen, openCart: () => setCartOpen(true), closeCart: () => setCartOpen(false),
    searchOpen, openSearch: () => setSearchOpen(true), closeSearch: () => setSearchOpen(false),
    mobileOpen, openMobile: () => setMobileOpen(true), closeMobile: () => setMobileOpen(false),
    toast, showToast,
  };

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useStore must be used within StoreProvider");
  return ctx;
}

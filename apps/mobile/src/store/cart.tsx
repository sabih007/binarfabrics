/* ==========================================================================
   The bag.

   Lines are stored with a small display snapshot (name, price, artwork) so the
   bag renders instantly offline, but that snapshot is never trusted for money:
   `POST /api/orders` re-prices everything from the database before checkout,
   exactly as the website does.

   Persisted to AsyncStorage so a half-filled bag survives a cold start. It
   holds nothing sensitive — slugs, quantities and variant labels only.
   ========================================================================== */

import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

import type { CartLine, Pattern, Product } from '@/api/types';

const STORAGE_KEY = 'binar.bag.v1';
/** Matches the API's per-line ceiling in `lib/validation.ts`. */
export const MAX_PER_LINE = 20;

export interface BagItem {
  slug: string;
  qty: number;
  color: string | null;
  size: string | null;
  /** Display-only snapshot. Authoritative values come from the server quote. */
  name: string;
  price: number;
  image?: string;
  pattern: Pattern;
  colors: string[];
  fabric: string;
  categoryName: string;
}

/** Identity of a bag line: the same product in another colour is another line. */
const lineKey = (slug: string, color: string | null, size: string | null) =>
  `${slug}|${color ?? ''}|${size ?? ''}`;

export const itemKey = (item: BagItem) => lineKey(item.slug, item.color, item.size);

interface CartValue {
  items: BagItem[];
  /** False until AsyncStorage has been read, so the bag never flashes empty. */
  hydrated: boolean;
  count: number;
  /** Snapshot subtotal, for the tab badge and quick summaries only. */
  estimatedSubtotal: number;
  /** The payload the API accepts. */
  lines: CartLine[];
  add: (
    product: Product,
    opts?: { qty?: number; color?: string | null; size?: string | null }
  ) => void;
  setQty: (key: string, qty: number) => void;
  remove: (key: string) => void;
  clear: () => void;
}

const CartContext = createContext<CartValue | null>(null);

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<BagItem[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    let active = true;
    AsyncStorage.getItem(STORAGE_KEY)
      .then((raw) => {
        if (!active || !raw) return;
        const parsed = JSON.parse(raw);
        // A stored bag from an older build may not match the current shape;
        // keep only what still looks like a line rather than crashing.
        if (Array.isArray(parsed)) {
          setItems(parsed.filter((i) => i && typeof i.slug === 'string' && i.qty > 0));
        }
      })
      .catch(() => {
        // A corrupt or unreadable bag is not worth surfacing — start empty.
      })
      .finally(() => {
        if (active) setHydrated(true);
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!hydrated) return; // Never write the empty initial state over a saved bag.
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(items)).catch(() => {});
  }, [items, hydrated]);

  const add = useCallback<CartValue['add']>((product, opts = {}) => {
    const color = opts.color ?? product.colors[0] ?? null;
    const size = opts.size ?? product.sizes[0] ?? null;
    const qty = Math.max(1, opts.qty ?? 1);
    const key = lineKey(product.slug, color, size);

    setItems((current) => {
      const existing = current.find((i) => itemKey(i) === key);
      // Respect both the API's per-line cap and what is actually in stock. A
      // sold-out product can't be added from the UI, so the cap stands in for
      // an unknown stock level rather than meaning "none available".
      const ceiling = product.stock > 0 ? Math.min(MAX_PER_LINE, product.stock) : MAX_PER_LINE;
      if (existing) {
        return current.map((i) =>
          itemKey(i) === key ? { ...i, qty: Math.min(ceiling, i.qty + qty) } : i
        );
      }
      const item: BagItem = {
        slug: product.slug,
        qty: Math.min(ceiling, qty),
        color,
        size,
        name: product.name,
        price: product.price,
        image: product.image,
        pattern: product.pattern,
        colors: product.colors,
        fabric: product.fabric,
        categoryName: product.categoryName,
      };
      return [...current, item];
    });
  }, []);

  const setQty = useCallback<CartValue['setQty']>((key, qty) => {
    setItems((current) =>
      qty <= 0
        ? current.filter((i) => itemKey(i) !== key)
        : current.map((i) => (itemKey(i) === key ? { ...i, qty: Math.min(MAX_PER_LINE, qty) } : i))
    );
  }, []);

  const remove = useCallback<CartValue['remove']>((key) => {
    setItems((current) => current.filter((i) => itemKey(i) !== key));
  }, []);

  const clear = useCallback(() => setItems([]), []);

  const value = useMemo<CartValue>(() => {
    const count = items.reduce((n, i) => n + i.qty, 0);
    return {
      items,
      hydrated,
      count,
      estimatedSubtotal: items.reduce((n, i) => n + i.price * i.qty, 0),
      lines: items.map(({ slug, qty, color, size }) => ({ slug, qty, color, size })),
      add,
      setQty,
      remove,
      clear,
    };
  }, [items, hydrated, add, setQty, remove, clear]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartValue {
  const value = useContext(CartContext);
  if (!value) throw new Error('useCart must be used inside <CartProvider>.');
  return value;
}

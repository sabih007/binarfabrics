/* ==========================================================================
   Shapes the API returns.

   `Product`, `Category`, `Pattern` and `Badge` are imported straight from the
   website's `lib/types.ts` (aliased to `@shared/*` in tsconfig) so the app and
   the store cannot drift apart. They are type-only imports, so nothing from
   outside this project is ever bundled.

   The order shapes below mirror `lib/serialize.ts#toApiOrder`, which cannot be
   imported because it pulls in Prisma.
   ========================================================================== */

import type { Badge, Category, Pattern, Product } from '@shared/types';

export type { Badge, Category, Pattern, Product };

export type OrderStatus =
  | 'PENDING'
  | 'CONFIRMED'
  | 'PROCESSING'
  | 'SHIPPED'
  | 'DELIVERED'
  | 'CANCELLED';
export type PaymentMethod = 'COD' | 'CARD';
export type PaymentStatus = 'UNPAID' | 'PAID' | 'REFUNDED' | 'FAILED';

export interface OrderItem {
  id: string;
  slug: string;
  name: string;
  price: number;
  qty: number;
  color: string | null;
  size: string | null;
  image: string | null;
  lineTotal: number;
}

export interface Order {
  id: string;
  number: string;
  status: OrderStatus;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  customerName: string;
  phone: string;
  email: string | null;
  address: string;
  city: string;
  postalCode: string | null;
  notes: string | null;
  subtotal: number;
  shipping: number;
  discount: number;
  total: number;
  items: OrderItem[];
  createdAt: string;
  updatedAt: string;
}

/** One page of `GET /api/products`. */
export interface ProductPage {
  products: Product[];
  total: number;
  page: number;
  perPage: number;
  pages: number;
  /** Present only when the request asked for `facets=1`. */
  facets?: Facets;
}

export interface Facets {
  fabrics: string[];
  collections: string[];
}

export type SortKey = 'featured' | 'new' | 'price-asc' | 'price-desc' | 'rating';

/** The filter set the shop screen and its filter sheet share. */
export interface ProductQuery {
  cat?: string;
  fabric?: string;
  collection?: string;
  badge?: 'new' | 'sale' | 'low';
  q?: string;
  min?: number;
  max?: number;
  /** Set by the home screen only; the filter sheet never exposes it. */
  featured?: boolean;
  sort: SortKey;
}

/** What the cart sends to the server. Prices are never sent — only slugs. */
export interface CartLine {
  slug: string;
  qty: number;
  color?: string | null;
  size?: string | null;
}

/** `POST /api/orders` — an authoritative re-price of the bag. */
export interface Quote {
  lines: {
    productId: string;
    slug: string;
    name: string;
    price: number;
    qty: number;
    color: string | null;
    size: string | null;
    image: string | null;
    lineTotal: number;
  }[];
  subtotal: number;
  shipping: number;
  discount: number;
  total: number;
}

export interface CheckoutBody {
  items: CartLine[];
  customerName: string;
  phone: string;
  email?: string;
  address: string;
  city: string;
  postalCode?: string;
  notes?: string;
  paymentMethod: PaymentMethod;
}

export interface CheckoutResult {
  order: Order;
  payment: { provider: 'cod' } | { provider: 'stripe'; url: string };
}

/** `GET /api/config` — which optional store features are switched on. */
export interface StoreConfig {
  stripeEnabled: boolean;
  freeShippingAt: number;
  shippingFee: number;
  currency: string;
}

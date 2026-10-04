/* ==========================================================================
   Shared shapes.

   One `Product` type is used by the API responses, the server components and
   the client components alike, so the shop and the database can't drift.
   ========================================================================== */

export type Pattern = "floral" | "paisley" | "stripe" | "geo" | "check" | "dots" | "plain";
export type Badge = "new" | "sale" | "low" | null;

export interface Product {
  /** The slug. Kept as `id` because the cart and URLs are built on it. */
  id: string;
  slug: string;
  name: string;
  /** Category slug, e.g. "women". */
  category: string;
  /** Display name, e.g. "Women". */
  categoryName: string;
  collection: string;
  fabric: string;
  price: number;
  oldPrice: number | null;
  pieces: number;
  pattern: Pattern;
  colors: string[];
  sizes: string[];
  badge: Badge;
  rating: number;
  reviews: number;
  description: string;
  image?: string;
  images: string[];
  inStock: boolean;
  stock: number;
  featured: boolean;
  createdAt: string;
}

export interface Category {
  id: string;
  slug: string;
  name: string;
  sub: string;
  pattern: Pattern;
  colors: string[];
  image?: string;
  href: string;
  productCount?: number;
  active: boolean;
  showOnHome: boolean;
  sortOrder: number;
}

// -------------------------------------------------------- API response shapes

/**
 * These live here, free of any Prisma import, so client components can type
 * their fetches without pulling the database layer into the browser bundle.
 */
export interface ProductPage {
  products: Product[];
  total: number;
  page: number;
  perPage: number;
  pages: number;
}

/** A filter value and how many published products carry it. */
export interface FacetCount {
  value: string;
  label: string;
  count: number;
}

export interface Facets {
  /** `value` is the category slug, `label` its display name. */
  categories: FacetCount[];
  fabrics: FacetCount[];
  collections: FacetCount[];
}

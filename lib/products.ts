/* ==========================================================================
   Shop constants and formatting helpers.

   The catalogue itself now lives in Postgres — add and edit products in the
   admin at /admin/products. The original static list is kept in
   lib/seed-data.ts and is only read by `npm run db:seed`.
   ========================================================================== */

export type {
  Badge,
  Category,
  FacetCount,
  Facets,
  Pattern,
  Product,
  ProductPage,
} from "./types";

/** Orders at or above this qualify for free delivery. */
export const FREE_SHIPPING_AT = 3000;
export const SHIPPING_FEE = 250;

export const money = (n: number) => "PKR " + n.toLocaleString("en-PK");

/**
 * Human label for a category slug. Products carry `categoryName` from the
 * database, so this is only a fallback for slugs that arrive bare (a URL
 * query parameter, say).
 */
export function catName(slug: string): string {
  if (!slug) return "";
  return slug
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

/** The collection the homepage and the header mega-menu promote. */
export const FEATURED_COLLECTION = "Summer Lawn '26";

/** Shop listing for one collection. */
export const collectionHref = (name: string) => `/shop?collection=${encodeURIComponent(name)}`;

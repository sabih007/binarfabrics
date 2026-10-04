/* ==========================================================================
   Shared read queries.

   Used by both the route handlers and the server components, so the shop
   page and /api/products can never drift apart in how they filter or sort.
   ========================================================================== */

import type { Prisma } from "@prisma/client";
import { prisma } from "./db";
import { toApiCategory, toApiProduct, type ApiCategory, type ApiProduct } from "./serialize";
import { FEATURED_COLLECTION } from "./products";
import type { Facets, ProductPage } from "./types";
import type { productQuerySchema } from "./validation";
import type { z } from "zod";

export type { Facets, ProductPage } from "./types";

export type ProductQuery = z.infer<typeof productQuerySchema>;

const SORTS: Record<ProductQuery["sort"], Prisma.ProductOrderByWithRelationInput[]> = {
  featured: [{ featured: "desc" }, { sortOrder: "asc" }, { createdAt: "desc" }],
  new: [{ createdAt: "desc" }],
  "price-asc": [{ price: "asc" }],
  "price-desc": [{ price: "desc" }],
  rating: [{ rating: "desc" }, { reviews: "desc" }],
};

/** Match any of `values` on a text column, ignoring case. */
const anyOf = (field: "fabric" | "collection", values: string[]): Prisma.ProductWhereInput => ({
  OR: values.map((v) => ({ [field]: { equals: v, mode: "insensitive" } })),
});

export function buildProductWhere(q: ProductQuery): Prisma.ProductWhereInput {
  const where: Prisma.ProductWhereInput = {};
  // Each tickable filter group is its own AND clause, so several ticked boxes
  // widen that group without widening the others.
  const and: Prisma.ProductWhereInput[] = [];

  if (!q.includeInactive) where.active = true;
  if (q.cat?.length) where.category = { slug: { in: q.cat } };
  if (q.fabric?.length) and.push(anyOf("fabric", q.fabric));
  if (q.collection?.length) and.push(anyOf("collection", q.collection));
  if (q.featured !== undefined) where.featured = q.featured;

  // "low" is derived from stock at render time, so filter on stock here
  // rather than on the stored badge — otherwise the shop would show items
  // the product card labels differently.
  if (q.badge === "low") where.stock = { gt: 0, lte: 5 };
  else if (q.badge) where.badge = q.badge;

  if (q.min !== undefined || q.max !== undefined) {
    where.price = { ...(q.min !== undefined && { gte: q.min }), ...(q.max !== undefined && { lte: q.max }) };
  }

  if (q.q) {
    and.push({
      OR: [
        { name: { contains: q.q, mode: "insensitive" } },
        { description: { contains: q.q, mode: "insensitive" } },
        { fabric: { contains: q.q, mode: "insensitive" } },
        { collection: { contains: q.q, mode: "insensitive" } },
      ],
    });
  }

  if (and.length) where.AND = and;

  return where;
}

export async function listProducts(q: ProductQuery): Promise<ProductPage> {
  const where = buildProductWhere(q);
  const [rows, total] = await Promise.all([
    prisma.product.findMany({
      where,
      include: { category: true },
      orderBy: SORTS[q.sort],
      skip: (q.page - 1) * q.perPage,
      take: q.perPage,
    }),
    prisma.product.count({ where }),
  ]);

  return {
    products: rows.map(toApiProduct),
    total,
    page: q.page,
    perPage: q.perPage,
    pages: Math.max(1, Math.ceil(total / q.perPage)),
  };
}

export async function getProduct(slug: string): Promise<ApiProduct | null> {
  const row = await prisma.product.findUnique({ where: { slug }, include: { category: true } });
  return row && row.active ? toApiProduct(row) : null;
}

/** Same-category first, then same-fabric — mirrors the old static logic. */
export async function getRelated(product: ApiProduct, take = 4): Promise<ApiProduct[]> {
  const rows = await prisma.product.findMany({
    where: {
      active: true,
      slug: { not: product.slug },
      OR: [{ category: { slug: product.category } }, { fabric: product.fabric }],
    },
    include: { category: true },
    take: take * 3,
  });

  const score = (p: (typeof rows)[number]) =>
    Number(p.category?.slug === product.category) + Number(p.fabric === product.fabric);

  return rows
    .sort((a, b) => score(b) - score(a))
    .slice(0, take)
    .map(toApiProduct);
}

export async function listCategories(opts: { includeInactive?: boolean; homeOnly?: boolean } = {}) {
  const rows = await prisma.category.findMany({
    where: {
      ...(opts.includeInactive ? {} : { active: true }),
      ...(opts.homeOnly ? { showOnHome: true } : {}),
    },
    include: { _count: { select: { products: true } } },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
  });
  return rows.map(toApiCategory);
}

/**
 * One representative published product. For pages that want real catalogue
 * artwork on a promo tile rather than one particular product.
 */
export async function pickProduct(where: Prisma.ProductWhereInput = {}): Promise<ApiProduct | null> {
  const row = await prisma.product.findFirst({
    where: { active: true, ...where },
    include: { category: true },
    orderBy: [{ featured: "desc" }, { sortOrder: "asc" }, { createdAt: "desc" }],
  });
  return row ? toApiProduct(row) : null;
}

/**
 * The shop sidebar's filter groups, with a live count beside each value.
 * Counts ignore the active filters on purpose: they tell the shopper how much
 * is behind a box they haven't ticked yet.
 */
export async function listFacets(): Promise<Facets> {
  const published = { active: true } as const;

  const [categories, byCategory, byFabric, byCollection] = await Promise.all([
    prisma.category.findMany({
      where: { active: true },
      select: { id: true, slug: true, name: true },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    }),
    prisma.product.groupBy({ by: ["categoryId"], where: published, _count: { _all: true } }),
    prisma.product.groupBy({
      by: ["fabric"],
      where: published,
      _count: { _all: true },
      orderBy: { fabric: "asc" },
    }),
    prisma.product.groupBy({
      by: ["collection"],
      where: published,
      _count: { _all: true },
      orderBy: { collection: "asc" },
    }),
  ]);

  const counts = new Map(byCategory.map((r) => [r.categoryId, r._count._all]));

  return {
    // Categories keep the order the admin gave them; empty ones are dropped so
    // the sidebar never offers a filter that returns nothing.
    categories: categories
      .map((c) => ({ value: c.slug, label: c.name, count: counts.get(c.id) ?? 0 }))
      .filter((c) => c.count > 0),
    fabrics: byFabric.map((r) => ({ value: r.fabric, label: r.fabric, count: r._count._all })),
    collections: byCollection.map((r) => ({
      value: r.collection,
      label: r.collection,
      count: r._count._all,
    })),
  };
}

export interface HomeData {
  /** Three swatches for the hero collage. */
  hero: ApiProduct[];
  categories: ApiCategory[];
  newArrivals: ApiProduct[];
  bestSellers: ApiProduct[];
  /** Six swatches for the Instagram strip. */
  lookbook: ApiProduct[];
  /** Artwork for the promo panels. Null when the catalogue has nothing to fit. */
  picks: {
    collection: ApiProduct | null;
    men: ApiProduct | null;
    sale: ApiProduct | null;
  };
  /** Distinct fabrics, each with a representative colour for its chip dot. */
  fabrics: { name: string; color: string }[];
}

export async function getHomeData(): Promise<HomeData> {
  const published = { active: true } as const;

  const [hero, newArrivals, bestSellers, lookbook, categories, collection, men, sale, fabricRows] =
    await Promise.all([
      prisma.product.findMany({
        where: { ...published, featured: true },
        include: { category: true },
        orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
        take: 3,
      }),
      prisma.product.findMany({
        where: published,
        include: { category: true },
        orderBy: { createdAt: "desc" },
        take: 4,
      }),
      prisma.product.findMany({
        where: published,
        include: { category: true },
        orderBy: [{ reviews: "desc" }, { rating: "desc" }],
        take: 4,
      }),
      prisma.product.findMany({
        where: published,
        include: { category: true },
        orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
        take: 6,
      }),
      listCategories({ homeOnly: true }),
      pickProduct({ collection: { equals: FEATURED_COLLECTION, mode: "insensitive" } }),
      pickProduct({ category: { slug: "men" } }),
      pickProduct({ badge: "sale" }),
      prisma.product.findMany({
        where: published,
        select: { fabric: true, colors: true },
        orderBy: [{ fabric: "asc" }, { sortOrder: "asc" }],
      }),
    ]);

  // The first product of each fabric donates that chip's colour dot.
  const fabrics: HomeData["fabrics"] = [];
  const seen = new Set<string>();
  for (const row of fabricRows) {
    if (seen.has(row.fabric)) continue;
    seen.add(row.fabric);
    fabrics.push({ name: row.fabric, color: row.colors[0] ?? "var(--green)" });
  }

  // A store with nothing featured yet still needs a hero, so fall back to the
  // newest products.
  const heroPicks = hero.length > 0 ? hero : newArrivals.slice(0, 3);
  const heroApi = heroPicks.map(toApiProduct);

  return {
    hero: heroApi,
    categories,
    newArrivals: newArrivals.map(toApiProduct),
    bestSellers: bestSellers.map(toApiProduct),
    lookbook: lookbook.map(toApiProduct),
    picks: {
      collection: collection ?? heroApi[0] ?? null,
      men,
      sale,
    },
    fabrics,
  };
}

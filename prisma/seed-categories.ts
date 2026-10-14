/* ==========================================================================
   Seed the category tree: main categories plus the Women / Men / Collections
   / Fabric groups and their subcategories.

   Idempotent — every row is an upsert keyed on slug, so re-running leaves
   existing artwork, sort order and product links intact. Run with:
       npm run db:seed:categories
   ========================================================================== */

import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error("DATABASE_URL is not set. Copy .env.example to .env first.");

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });

interface Node {
  slug: string;
  name: string;
  sub?: string;
  pattern?: string;
  colors?: string[];
  /** Overrides the default /shop?cat=<slug> link. */
  href?: string;
  showOnHome?: boolean;
  children?: Node[];
}

/* Palette lifted from the existing tiles so new rows match the shop's look. */
const GREEN = "#0f4c3a";
const GOLD = "#c9a24a";
const CREAM = "#f2d7a6";
const ROSE = "#e8a3a8";
const NAVY = "#2c4a6b";
const SAND = "#f4dcc4";
const CLAY = "#8b4a2f";
const SAGE = "#5b6b5a";
const INK = "#171614";

/**
 * Main categories are homepage tiles. The four grouped sections below are
 * nav groups, so their subcategories stay off the homepage.
 */
const MAIN: Node[] = [
  { slug: "unstitched", name: "Unstitched", sub: "Suit lengths by the piece", pattern: "floral", colors: [GREEN, CREAM, ROSE] },
  { slug: "stitched", name: "Stitched", sub: "Ready-sewn suits", pattern: "paisley", colors: ["#7a2b3a", SAND, GOLD] },
  { slug: "ready-to-wear", name: "Ready to Wear", sub: "Wear straight off the rail", pattern: "plain", colors: [NAVY] },
  { slug: "suits", name: "Suits", sub: "2 & 3 piece sets", pattern: "geo", colors: [GREEN, GOLD] },
  { slug: "dupattas", name: "Dupattas", sub: "Chiffon, silk & net", pattern: "dots", colors: [ROSE, "#fff5f6", GOLD] },
  { slug: "bottoms", name: "Bottoms", sub: "Trousers & shalwars", pattern: "stripe", colors: [SAGE, "#e8e3dc"] },
  { slug: "shawls", name: "Shawls", sub: "Winter wraps", pattern: "check", colors: [CLAY, CREAM] },
  { slug: "accessories", name: "Accessories", sub: "Finishing touches", pattern: "plain", colors: [GOLD, INK] },
];

const GROUPS: Node[] = [
  {
    slug: "women",
    name: "Women",
    sub: "Unstitched & Pret",
    pattern: "floral",
    colors: [GREEN, CREAM, ROSE],
    children: [
      { slug: "women-unstitched", name: "Unstitched" },
      { slug: "women-stitched", name: "Stitched" },
      { slug: "women-2-piece-suits", name: "2 Piece Suits" },
      { slug: "women-3-piece-suits", name: "3 Piece Suits" },
      { slug: "women-dupattas", name: "Dupattas" },
      { slug: "women-bottoms", name: "Bottoms" },
    ],
  },
  {
    slug: "men",
    name: "Men",
    sub: "Unstitched fabric",
    pattern: "plain",
    colors: [NAVY],
    children: [
      { slug: "men-unstitched-fabric", name: "Unstitched Fabric" },
      { slug: "men-stitched", name: "Stitched" },
      { slug: "men-kurta", name: "Kurta" },
      { slug: "men-shalwar-kameez", name: "Shalwar Kameez" },
      { slug: "men-waistcoats", name: "Waistcoats" },
    ],
  },
  {
    slug: "collections",
    name: "Collections",
    sub: "Seasonal edits",
    pattern: "geo",
    colors: [INK, GOLD],
    // A group heading rather than a tile of its own.
    showOnHome: false,
    children: [
      { slug: "new-arrivals", name: "New Arrivals" },
      { slug: "best-sellers", name: "Best Sellers" },
      { slug: "festive-collection", name: "Festive Collection" },
      { slug: "summer-collection", name: "Summer Collection" },
      { slug: "winter-collection", name: "Winter Collection" },
      { slug: "sale", name: "Sale" },
    ],
  },
  {
    slug: "fabric",
    name: "Fabric",
    sub: "Shop by cloth",
    pattern: "stripe",
    colors: [SAND, GOLD, GREEN],
    // Each fabric filters the shop by the product's own fabric field, so these
    // links work against the live catalogue straight away.
    children: [
      { slug: "fabric-lawn", name: "Lawn", href: "/shop?fabric=Lawn" },
      { slug: "fabric-cotton", name: "Cotton", href: "/shop?fabric=Cotton" },
      { slug: "fabric-linen", name: "Linen", href: "/shop?fabric=Linen" },
      { slug: "fabric-khaddar", name: "Khaddar", href: "/shop?fabric=Khaddar" },
      { slug: "fabric-karandi", name: "Karandi", href: "/shop?fabric=Karandi" },
      { slug: "fabric-chiffon", name: "Chiffon", href: "/shop?fabric=Chiffon" },
      { slug: "fabric-silk", name: "Silk", href: "/shop?fabric=Silk" },
    ],
  },
];

/**
 * Upserts one row. Artwork is only written when the node specifies it, so an
 * existing category that the owner has already styled is left alone.
 */
async function upsert(node: Node, parentId: string | null, sortOrder: number, isChild: boolean) {
  const shared = {
    name: node.name,
    parentId,
    sortOrder,
    href: node.href ?? `/shop?cat=${node.slug}`,
    active: true,
    // Subcategories belong in the nav drop-down, not the homepage grid.
    showOnHome: node.showOnHome ?? !isChild,
    ...(node.sub !== undefined ? { sub: node.sub } : {}),
    ...(node.pattern !== undefined ? { pattern: node.pattern } : {}),
    ...(node.colors !== undefined ? { colors: node.colors } : {}),
  };

  const row = await prisma.category.upsert({
    where: { slug: node.slug },
    update: shared,
    create: {
      slug: node.slug,
      pattern: node.pattern ?? "plain",
      colors: node.colors ?? [],
      ...shared,
    },
    select: { id: true },
  });

  return row.id;
}

async function main() {
  console.log("Seeding the category tree…");

  let order = 0;
  let mains = 0;
  let subs = 0;

  for (const node of MAIN) {
    await upsert(node, null, order++, false);
    mains++;
  }

  for (const group of GROUPS) {
    const parentId = await upsert(group, null, order++, false);
    mains++;

    // Children keep their own 0..n order inside the group.
    for (const [index, child] of (group.children ?? []).entries()) {
      await upsert(child, parentId, index, true);
      subs++;
    }
  }

  console.log(`  main categories: ${mains}`);
  console.log(`  subcategories:   ${subs}`);
  console.log("Done. Review them at /admin/categories.");
}

main()
  .catch((err) => {
    console.error("\nCategory seed failed:", err instanceof Error ? err.message : err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

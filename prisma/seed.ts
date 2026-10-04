/* ==========================================================================
   Seed: moves the original lib/products.ts catalogue into the database and
   creates the owner account from ADMIN_EMAIL / ADMIN_PASSWORD.

   Safe to re-run — everything is an upsert, so existing stock levels, prices
   and orders are preserved. Run with:  npm run db:seed
   ========================================================================== */

import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";
import { CATEGORIES, CATEGORY_NAMES, PRODUCTS } from "../lib/seed-data";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error("DATABASE_URL is not set. Copy .env.example to .env first.");

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });

/** Tiles in lib/products.ts mix real categories with marketing links. */
const TILE_BY_SLUG = new Map(CATEGORIES.map((c) => [c.slug, c]));

async function seedCategories() {
  const slugs = Object.keys(CATEGORY_NAMES) as (keyof typeof CATEGORY_NAMES)[];
  const ids = new Map<string, string>();

  for (const [index, slug] of slugs.entries()) {
    const tile = TILE_BY_SLUG.get(slug);
    const data = {
      name: CATEGORY_NAMES[slug],
      sub: tile?.sub ?? null,
      pattern: tile?.pattern ?? "plain",
      colors: tile?.colors ?? [],
      href: tile?.href ?? `/shop?cat=${slug}`,
      sortOrder: index,
      active: true,
      showOnHome: true,
    };

    const category = await prisma.category.upsert({
      where: { slug },
      update: data,
      create: { slug, ...data },
    });
    ids.set(slug, category.id);
  }

  console.log(`  categories: ${ids.size}`);
  return ids;
}

async function seedProducts(categoryIds: Map<string, string>) {
  let created = 0;
  let updated = 0;

  for (const [index, p] of PRODUCTS.entries()) {
    const categoryId = categoryIds.get(p.category);
    if (!categoryId) {
      console.warn(`  ! skipping ${p.id}: unknown category "${p.category}"`);
      continue;
    }

    const existing = await prisma.product.findUnique({ where: { slug: p.id } });

    // Only the descriptive fields are overwritten on re-runs; stock and
    // active/featured flags stay under the shop owner's control.
    const shared = {
      name: p.name,
      categoryId,
      collection: p.collection,
      fabric: p.fabric,
      price: p.price,
      oldPrice: p.oldPrice,
      pieces: p.pieces,
      pattern: p.pattern,
      colors: p.colors,
      badge: p.badge,
      rating: p.rating,
      reviews: p.reviews,
      description: p.description,
      image: p.image ?? null,
      sortOrder: index,
    };

    await prisma.product.upsert({
      where: { slug: p.id },
      update: shared,
      create: {
        slug: p.id,
        ...shared,
        // A sensible opening stock so the shop is buyable straight after seeding.
        stock: p.badge === "low" ? 4 : 25,
        active: true,
        featured: index < 8,
      },
    });

    existing ? updated++ : created++;
  }

  console.log(`  products:   ${created} created, ${updated} updated`);
}

async function seedOwner() {
  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD;

  if (!email || !password) {
    console.log("  admin:      skipped (set ADMIN_EMAIL and ADMIN_PASSWORD to create one)");
    return;
  }
  if (password.length < 8) {
    throw new Error("ADMIN_PASSWORD must be at least 8 characters.");
  }

  const existing = await prisma.adminUser.findUnique({ where: { email } });
  if (existing) {
    console.log(`  admin:      ${email} already exists (password left unchanged)`);
    return;
  }

  await prisma.adminUser.create({
    data: {
      email,
      name: process.env.ADMIN_NAME?.trim() || "Store Owner",
      passwordHash: await bcrypt.hash(password, 12),
      role: "OWNER",
    },
  });
  console.log(`  admin:      created ${email}`);
}

async function main() {
  console.log("Seeding BinAr Fabrics…");
  const categoryIds = await seedCategories();
  await seedProducts(categoryIds);
  await seedOwner();
  console.log("Done.");
}

main()
  .catch((err) => {
    console.error("\nSeed failed:", err instanceof Error ? err.message : err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

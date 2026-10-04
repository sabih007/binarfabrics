/* ==========================================================================
   Seed data — the original static catalogue.

   This is the starting content loaded into the database by `npm run db:seed`.
   After seeding, the shop reads from Postgres and this file is no longer
   consulted at runtime; edit products in the admin at /admin/products.
   ========================================================================== */

import type { Badge, Pattern } from "./types";

export interface SeedProduct {
  id: string;
  name: string;
  category: string;
  collection: string;
  fabric: string;
  price: number;
  oldPrice: number | null;
  pieces: number;
  pattern: Pattern;
  colors: string[];
  badge: Badge;
  rating: number;
  reviews: number;
  description: string;
  image?: string;
}

export interface SeedCategory {
  slug: string;
  name: string;
  sub: string;
  pattern: Pattern;
  colors: string[];
  href: string;
}

export const PRODUCTS: SeedProduct[] = [
  { id: "bl-101", name: "Gulnar Printed Lawn — 3 Piece Unstitched", category: "women", collection: "Summer Lawn '26", fabric: "Lawn", price: 4290, oldPrice: null, pieces: 3, pattern: "floral", colors: ["#0f4c3a", "#f2d7a6", "#e8a3a8"], badge: "new", rating: 4.8, reviews: 124, description: "Breathable premium lawn with a hand-drawn floral print. Includes printed shirt, chiffon dupatta and dyed cambric trouser." },
  { id: "bl-102", name: "Mehr Embroidered Lawn — 3 Piece Unstitched", category: "women", collection: "Summer Lawn '26", fabric: "Lawn", price: 6490, oldPrice: 7990, pieces: 3, pattern: "paisley", colors: ["#7a2b3a", "#f4dcc4", "#c9a24a"], badge: "sale", rating: 4.9, reviews: 88, description: "Embroidered neckline and border on soft lawn, paired with a printed silk dupatta and plain trouser." },
  { id: "bl-103", name: "Sahar Digital Print Lawn — 2 Piece", category: "women", collection: "Summer Lawn '26", fabric: "Lawn", price: 2990, oldPrice: null, pieces: 2, pattern: "dots", colors: ["#2c4a6b", "#f7f3ec"], badge: null, rating: 4.6, reviews: 57, description: "Everyday two-piece in crisp digital-printed lawn. Shirt and trouser only — dupatta not included." },
  { id: "bl-104", name: "Zeenat Chikankari Cotton — 3 Piece", category: "women", collection: "Festive Edit", fabric: "Cotton", price: 5890, oldPrice: null, pieces: 3, pattern: "dots", colors: ["#f7f3ec", "#c9b8a3"], badge: "new", rating: 4.7, reviews: 41, description: "Traditional chikankari on ivory cotton with a matching net dupatta. Light, elegant, and perfect for Eid." },
  { id: "bl-105", name: "Noor Chiffon Formal — 3 Piece", category: "women", collection: "Festive Edit", fabric: "Chiffon", price: 9490, oldPrice: 11990, pieces: 3, pattern: "paisley", colors: ["#171614", "#c9a24a", "#8a8580"], badge: "sale", rating: 4.9, reviews: 63, description: "Sequin-embellished chiffon shirt with a heavy embroidered dupatta and raw-silk trouser. Ideal for evening wear." },
  { id: "bl-106", name: "Aab Pure Linen — 2 Piece Unstitched", category: "women", collection: "Winter Weaves", fabric: "Linen", price: 4790, oldPrice: null, pieces: 2, pattern: "stripe", colors: ["#5b6b5a", "#e8e3dc", "#c9a24a"], badge: null, rating: 4.5, reviews: 29, description: "Soft-washed pure linen with a subtle yarn-dyed stripe. Shirt and trouser fabric, 2.5 m each." },
  { id: "bl-107", name: "Roshan Khaddar Winter — 3 Piece", category: "women", collection: "Winter Weaves", fabric: "Khaddar", price: 5290, oldPrice: null, pieces: 3, pattern: "check", colors: ["#8b4a2f", "#f2d7a6"], badge: "new", rating: 4.7, reviews: 35, description: "Warm brushed khaddar with a printed shirt, woollen shawl and plain trouser fabric." },
  { id: "bl-108", name: "Falak Silk Jacquard — 3 Piece", category: "women", collection: "Festive Edit", fabric: "Silk", price: 12990, oldPrice: null, pieces: 3, pattern: "geo", colors: ["#0f4c3a", "#c9a24a"], badge: "low", rating: 5.0, reviews: 18, description: "Self-jacquard silk shirt with an organza dupatta and jamawar trouser. Limited pieces available." },
  { id: "bm-201", name: "Classic Wash & Wear — Men's Unstitched", category: "men", collection: "Men's Essentials", fabric: "Wash & Wear", price: 3490, oldPrice: null, pieces: 1, pattern: "plain", colors: ["#dcd6cc"], badge: null, rating: 4.6, reviews: 210, description: "Wrinkle-free blended wash & wear, 4.5 m suit length. Cool in summer, easy to maintain." },
  { id: "bm-202", name: "Premium Egyptian Cotton — Men's Unstitched", category: "men", collection: "Men's Essentials", fabric: "Cotton", price: 4990, oldPrice: 5990, pieces: 1, pattern: "plain", colors: ["#2c4a6b"], badge: "sale", rating: 4.8, reviews: 96, description: "Long-staple Egyptian cotton with a soft finish. 4.5 m unstitched suit length in a deep navy." },
  { id: "bm-203", name: "Karandi Winter Fabric — Men's Unstitched", category: "men", collection: "Winter Weaves", fabric: "Karandi", price: 4290, oldPrice: null, pieces: 1, pattern: "check", colors: ["#4a4744", "#8a8580"], badge: "new", rating: 4.7, reviews: 44, description: "Warm, textured karandi in charcoal. Ideal for winter kurta shalwar; 4.5 m length." },
  { id: "bm-204", name: "Boski Silk Blend — Men's Unstitched", category: "men", collection: "Festive Edit", fabric: "Silk", price: 6890, oldPrice: null, pieces: 1, pattern: "plain", colors: ["#f2e8cf"], badge: null, rating: 4.9, reviews: 31, description: "Lustrous boski blend for weddings and Eid. Cream shade, 4.5 m unstitched." },
  { id: "bk-301", name: "Little Blooms Girls' Lawn — 2 Piece", category: "kids", collection: "Summer Lawn '26", fabric: "Lawn", price: 1990, oldPrice: null, pieces: 2, pattern: "floral", colors: ["#e8a3a8", "#fff5f6", "#c9a24a"], badge: "new", rating: 4.8, reviews: 52, description: "Soft printed lawn for girls aged 2–12, sold as an unstitched shirt and trouser set." },
  { id: "bk-302", name: "Boys' Wash & Wear Kurta Fabric", category: "kids", collection: "Men's Essentials", fabric: "Wash & Wear", price: 1790, oldPrice: 2190, pieces: 1, pattern: "plain", colors: ["#5b6b5a"], badge: "sale", rating: 4.5, reviews: 27, description: "Easy-care wash & wear in sage green, 2.5 m — enough for a boy's kurta shalwar." },
  { id: "bh-401", name: "Cotton Percale Bedsheet Set — King", category: "home", collection: "Home Textiles", fabric: "Cotton", price: 5490, oldPrice: null, pieces: 3, pattern: "geo", colors: ["#f7f3ec", "#0f4c3a"], badge: null, rating: 4.7, reviews: 73, description: "200-thread-count cotton percale king bedsheet with two pillow covers in a geometric print." },
  { id: "bh-402", name: "Jacquard Cushion Covers — Set of 2", category: "home", collection: "Home Textiles", fabric: "Jacquard", price: 1890, oldPrice: null, pieces: 2, pattern: "paisley", colors: ["#c9a24a", "#171614"], badge: "new", rating: 4.6, reviews: 19, description: "Rich jacquard cushion covers with a paisley motif, 18\" x 18\", hidden zip." },
];

export const CATEGORIES: SeedCategory[] = [
  { slug: "women", name: "Women", sub: "Unstitched & Pret", pattern: "floral", colors: ["#0f4c3a", "#f2d7a6", "#e8a3a8"], href: "/shop?cat=women" },
  { slug: "men", name: "Men", sub: "Unstitched fabric", pattern: "plain", colors: ["#2c4a6b"], href: "/shop?cat=men" },
  { slug: "kids", name: "Kids", sub: "Girls & Boys", pattern: "dots", colors: ["#e8a3a8", "#fff5f6"], href: "/shop?cat=kids" },
  { slug: "lawn", name: "Lawn", sub: "Summer Collection", pattern: "paisley", colors: ["#7a2b3a", "#f4dcc4", "#c9a24a"], href: "/shop?fabric=Lawn" },
  { slug: "winter", name: "Winter", sub: "Khaddar & Karandi", pattern: "check", colors: ["#8b4a2f", "#f2d7a6"], href: "/shop?collection=Winter%20Weaves" },
  { slug: "home", name: "Home", sub: "Bed & Living", pattern: "geo", colors: ["#f7f3ec", "#0f4c3a"], href: "/shop?cat=home" },
];

export const CATEGORY_NAMES: Record<string, string> = { women: "Women", men: "Men", kids: "Kids", home: "Home" };


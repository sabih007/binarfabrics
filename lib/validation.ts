/* ==========================================================================
   Zod schemas — the single source of truth for what the API accepts.
   Anything reaching the database has been through one of these.
   ========================================================================== */

import { z } from "zod";

export const PATTERNS = ["floral", "paisley", "stripe", "geo", "check", "dots", "plain"] as const;
export const BADGES = ["new", "sale", "low"] as const;

/** Pakistani mobile/landline, tolerant of spaces, dashes and +92. */
const phoneRe = /^(\+92|0092|0)?3?\d{9,10}$/;

export const phone = z
  .string()
  .trim()
  .min(1, "Phone number is required.")
  .refine((v) => phoneRe.test(v.replace(/[\s-()]/g, "")), "Enter a valid Pakistani phone number.");

export const email = z
  .string()
  .trim()
  .toLowerCase()
  .pipe(z.string().email("Enter a valid email address."));

/** Query strings arrive as text, so "false" must not coerce to true. */
const boolish = z
  .union([z.boolean(), z.string(), z.number()])
  .transform((v) => {
    if (typeof v === "boolean") return v;
    if (typeof v === "number") return v !== 0;
    return ["1", "true", "yes", "on"].includes(v.trim().toLowerCase());
  });

/**
 * Repeatable query filter: `?fabric=Lawn&fabric=Cotton` or `?fabric=Lawn,Cotton`.
 * The shop sidebar lets several boxes be ticked at once, so each of these
 * arrives as a list.
 */
const listish = (max: number, lower = false) =>
  z
    .union([z.string(), z.array(z.string())])
    .transform((v) => {
      const parts = (Array.isArray(v) ? v : v.split(","))
        .map((s) => (lower ? s.trim().toLowerCase() : s.trim()))
        .filter((s) => s !== "" && s.length <= max);
      return [...new Set(parts)].slice(0, 20);
    })
    .transform((v) => (v.length === 0 ? undefined : v))
    .optional();

/** Optional text field: empty string is treated as "not provided". */
const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .transform((v) => (v === "" ? undefined : v))
    .optional();

const hexColor = z.string().regex(/^#[0-9a-fA-F]{6}$/, "Colours must be hex, e.g. #0f4c3a");

const slug = z
  .string()
  .trim()
  .toLowerCase()
  .pipe(
    z
      .string()
      .min(2, "Slug is too short.")
      .max(64)
      .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Use lowercase letters, numbers and dashes only.")
  );

/** Strips HTML tags and control characters from free text. */
const clean = (max: number, min = 0, msg?: string) =>
  z
    .string()
    .trim()
    .max(max, `Please keep this under ${max} characters.`)
    .transform((v) =>
      v
        .replace(/<[^>]*>/g, "")
        .replace(/[\u0000-\u001F\u007F]/g, " ")
        .trim()
    )
    .pipe(z.string().min(min, msg ?? "This field is required."));

// ------------------------------------------------------------------ public

export const cartLineSchema = z.object({
  slug: z.string().trim().min(1),
  qty: z.number().int().min(1, "Quantity must be at least 1.").max(20, "Maximum 20 per item."),
  color: z.string().trim().max(32).nullish(),
  size: z.string().trim().max(16).nullish(),
});

export const checkoutSchema = z.object({
  items: z.array(cartLineSchema).min(1, "Your bag is empty.").max(50),
  customerName: clean(80, 2, "Please enter your full name."),
  phone,
  email: email.optional(),
  address: clean(300, 8, "Please enter a complete street address."),
  city: clean(80, 2, "City is required."),
  postalCode: optionalText(12),
  notes: optionalText(500),
  paymentMethod: z.enum(["COD", "CARD", "BANK"]).default("COD"),
});
export type CheckoutInput = z.infer<typeof checkoutSchema>;

export const contactSchema = z.object({
  name: clean(80, 2, "Please enter your name."),
  phone,
  email: email.optional(),
  topic: clean(60, 1, "Please choose a topic."),
  orderNumber: optionalText(24),
  message: clean(2000, 10, "Please give us a little more detail."),
  /** Honeypot: real users never fill this. */
  company: z.string().max(0).optional(),
});

export const newsletterSchema = z.object({
  email,
  source: optionalText(40),
  company: z.string().max(0).optional(),
});

export const productQuerySchema = z.object({
  cat: listish(60, true),
  fabric: listish(60),
  collection: listish(80),
  badge: z.enum(BADGES).optional(),
  q: optionalText(80),
  min: z.coerce.number().int().min(0).optional(),
  max: z.coerce.number().int().min(0).optional(),
  featured: boolish.optional(),
  sort: z.enum(["featured", "new", "price-asc", "price-desc", "rating"]).default("featured"),
  page: z.coerce.number().int().min(1).default(1),
  perPage: z.coerce.number().int().min(1).max(100).default(48),
  /** Admin listings pass this to see drafts too. */
  includeInactive: boolish.default(false),
});

export const orderLookupSchema = z.object({
  number: z.string().trim().min(3).max(24),
  phone: z.string().trim().min(4).max(24),
});

// ------------------------------------------------------------------- admin

/**
 * Builds the PATCH counterpart of a create schema.
 *
 * `.partial()` alone is a data-loss trap: it makes keys optional but keeps any
 * `.default()` wrapper, so Zod still injects the default for every key the
 * request left out. A PATCH of `{ active: false }` would come back out as
 * `{ active: false, stock: 0, rating: 0, pieces: 1, … }` and overwrite real
 * values with defaults. Stripping the defaults first means an absent key stays
 * absent, so the spread in the route only writes what the caller actually sent.
 */
type Undefaulted<T extends z.ZodRawShape> = {
  [K in keyof T]: T[K] extends z.ZodDefault<infer Inner> ? Inner : T[K];
};

function patchSchema<T extends z.ZodRawShape>(fields: z.ZodObject<T>) {
  const shape: Record<string, unknown> = {};
  for (const [key, field] of Object.entries(fields.shape)) {
    shape[key] = field instanceof z.ZodDefault ? field.removeDefault() : field;
  }
  return z.object(shape as unknown as Undefaulted<T>).partial();
}

export const loginSchema = z.object({
  email,
  password: z.string().min(8, "Password must be at least 8 characters."),
});

const categoryFields = z.object({
  slug,
  name: clean(60, 2, "Name is required."),
  sub: optionalText(80),
  pattern: z.enum(PATTERNS).default("plain"),
  colors: z.array(hexColor).max(5).default([]),
  image: optionalText(300),
  href: optionalText(300),
  sortOrder: z.coerce.number().int().default(0),
  active: z.boolean().default(true),
  showOnHome: z.boolean().default(true),
});

export const categoryCreateSchema = categoryFields;
export const categoryUpdateSchema = patchSchema(categoryFields);

const productFields = z.object({
  slug,
  name: clean(140, 3, "Product name is required."),
  categoryId: z.string().trim().min(1, "Choose a category."),
  collection: clean(80, 1, "Collection is required."),
  fabric: clean(60, 1, "Fabric is required."),
  price: z.coerce.number().int().min(1, "Price must be greater than zero.").max(10_000_000),
  oldPrice: z.coerce.number().int().min(0).max(10_000_000).nullish(),
  pieces: z.coerce.number().int().min(1).max(20).default(1),
  pattern: z.enum(PATTERNS).default("plain"),
  colors: z.array(hexColor).max(8).default([]),
  sizes: z.array(z.string().trim().max(16)).max(12).default([]),
  badge: z.enum(BADGES).nullish(),
  rating: z.coerce.number().min(0).max(5).default(0),
  reviews: z.coerce.number().int().min(0).default(0),
  description: clean(4000, 10, "Please write a description."),
  image: optionalText(300),
  images: z.array(z.string().trim().max(300)).max(10).default([]),
  stock: z.coerce.number().int().min(0).default(0),
  lowStockAt: z.coerce.number().int().min(0).default(5),
  active: z.boolean().default(true),
  featured: z.boolean().default(false),
  sortOrder: z.coerce.number().int().default(0),
});

/** A sale price that isn't a discount confuses customers — reject it. */
const sanePricing = (p: { price?: number; oldPrice?: number | null }) =>
  p.oldPrice == null || p.oldPrice === 0 || p.price == null || p.oldPrice > p.price;
const pricingMessage = {
  message: "The old price should be higher than the current price.",
  path: ["oldPrice"],
};

export const productCreateSchema = productFields.refine(sanePricing, pricingMessage);
export const productUpdateSchema = patchSchema(productFields).refine(sanePricing, pricingMessage);

export const orderUpdateSchema = z.object({
  status: z
    .enum(["PENDING", "CONFIRMED", "PROCESSING", "SHIPPED", "DELIVERED", "CANCELLED"])
    .optional(),
  paymentStatus: z.enum(["UNPAID", "PAID", "REFUNDED", "FAILED"]).optional(),
  notes: optionalText(500),
});

export const messageUpdateSchema = z.object({
  status: z.enum(["NEW", "READ", "ARCHIVED"]),
});

// --------------------------------------------------------------------- pos

/**
 * One line on a counter sale. A catalogue line sends only `slug` and the
 * price is read from the database; a manual line sends `name` + `price`
 * because there is no catalogue row to read it from.
 */
export const saleLineSchema = z
  .object({
    slug: z.string().trim().max(64).nullish(),
    name: optionalText(140),
    price: z.coerce.number().int().min(0).max(10_000_000).optional(),
    qty: z.coerce.number().int().min(1, "Quantity must be at least 1.").max(999),
    color: z.string().trim().max(32).nullish(),
    size: z.string().trim().max(16).nullish(),
  })
  .refine((l) => Boolean(l.slug) || (Boolean(l.name) && l.price !== undefined), {
    message: "A manual line needs both a description and an amount.",
    path: ["name"],
  })
  // A zero-rupee catalogue item is a pricing mistake; a zero-rupee manual
  // line is usually a half-typed amount. Either way, don't ring it up.
  .refine((l) => l.slug != null || (l.price ?? 0) > 0, {
    message: "Enter an amount greater than zero.",
    path: ["price"],
  });

export const saleCreateSchema = z
  .object({
    items: z.array(saleLineSchema).min(1, "Add at least one item.").max(200),
    customerName: optionalText(80),
    // The till leaves both customer boxes blank for most walk-ins, so an
    // empty string has to mean "not given" rather than "invalid number".
    phone: z.preprocess(
      (v) => (typeof v === "string" && v.trim() === "" ? undefined : v),
      phone.optional()
    ),

    /** Flat rupees off, or a percentage of the subtotal — not both. */
    discountMode: z.enum(["amount", "percent"]).default("amount"),
    discountValue: z.coerce.number().min(0).max(10_000_000).default(0),
    /** Sent as a percentage; stored as basis points. */
    taxRate: z.coerce.number().min(0).max(100).default(0),

    payment: z.enum(["CASH", "CARD", "MIXED"]).default("CASH"),
    cashGiven: z.coerce.number().int().min(0).max(100_000_000).optional(),
    cardAmount: z.coerce.number().int().min(0).max(100_000_000).optional(),

    notes: optionalText(500),
  })
  .refine((s) => s.discountMode !== "percent" || s.discountValue <= 100, {
    message: "A percentage discount cannot exceed 100.",
    path: ["discountValue"],
  })
  .refine((s) => s.payment !== "MIXED" || (s.cardAmount ?? 0) > 0, {
    message: "Enter the amount paid by card.",
    path: ["cardAmount"],
  });
export type SaleCreateInput = z.infer<typeof saleCreateSchema>;

export const saleVoidSchema = z.object({
  status: z.literal("VOIDED"),
  voidReason: clean(200, 3, "Please say why this sale is being voided."),
});

export const saleQuerySchema = z.object({
  status: z.enum(["COMPLETED", "VOIDED"]).optional(),
  payment: z.enum(["CASH", "CARD", "MIXED"]).optional(),
  q: optionalText(60),
  /** Inclusive calendar days in the shop's local reading, e.g. "2026-10-05". */
  from: z.string().trim().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  to: z.string().trim().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  page: z.coerce.number().int().min(1).default(1),
  perPage: z.coerce.number().int().min(1).max(100).default(30),
});

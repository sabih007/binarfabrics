/* ==========================================================================
   GET  /api/admin/products — list, drafts included
   POST /api/admin/products — create
   ========================================================================== */

import { handler, ok, readJson, HttpError } from "@/lib/api";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { buildProductWhere } from "@/lib/queries";
import { toAdminProduct } from "@/lib/serialize";
import { productCreateSchema, productQuerySchema } from "@/lib/validation";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export const GET = handler(async (req: Request) => {
  await requireAdmin();

  const params = Object.fromEntries(new URL(req.url).searchParams);
  const query = productQuerySchema.parse({ includeInactive: true, sort: "new", ...params });
  const where = buildProductWhere(query);

  const [rows, total] = await Promise.all([
    prisma.product.findMany({
      where,
      include: { category: true },
      orderBy: [{ updatedAt: "desc" }],
      skip: (query.page - 1) * query.perPage,
      take: query.perPage,
    }),
    prisma.product.count({ where }),
  ]);

  return ok({
    products: rows.map(toAdminProduct),
    total,
    page: query.page,
    perPage: query.perPage,
    pages: Math.max(1, Math.ceil(total / query.perPage)),
  });
});

export const POST = handler(async (req: Request) => {
  await requireAdmin();

  const data = productCreateSchema.parse(await readJson(req));

  // Fail with a field-level message rather than a raw foreign-key error.
  const category = await prisma.category.findUnique({ where: { id: data.categoryId } });
  if (!category) throw new HttpError(422, "That category no longer exists.", "BAD_CATEGORY");

  const product = await prisma.product.create({
    data: { ...data, oldPrice: data.oldPrice || null, badge: data.badge ?? null },
    include: { category: true },
  });

  return ok({ product: toAdminProduct(product) }, { status: 201 });
});

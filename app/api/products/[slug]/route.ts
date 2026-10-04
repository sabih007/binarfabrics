import { fail, handler, ok } from "@/lib/api";
import { getProduct, getRelated } from "@/lib/queries";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ slug: string }> };

/** GET /api/products/:slug — the product plus four related items. */
export const GET = handler(async (_req: Request, ctx: Ctx) => {
  const { slug } = await ctx.params;
  const product = await getProduct(slug);
  if (!product) return fail("Product not found.", 404, { code: "NOT_FOUND" });

  return ok({ product, related: await getRelated(product) });
});

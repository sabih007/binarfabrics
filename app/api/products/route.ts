import { handler, ok } from "@/lib/api";
import { listProducts, listFacets } from "@/lib/queries";
import { productQuerySchema } from "@/lib/validation";

export const dynamic = "force-dynamic";

/**
 * GET /api/products
 *   ?cat=women&fabric=Lawn&collection=Festive%20Edit&badge=new&q=lawn
 *   &min=1000&max=8000&sort=price-asc&page=1&perPage=48&facets=1
 */
export const GET = handler(async (req: Request) => {
  const url = new URL(req.url);
  const params = Object.fromEntries(url.searchParams);

  // `includeInactive` is an admin-only concern; ignore it on the public route
  // so a crafted query string can't reveal unpublished products.
  delete params.includeInactive;

  const query = productQuerySchema.parse(params);
  const page = await listProducts(query);

  if (url.searchParams.get("facets")) {
    return ok({ ...page, facets: await listFacets() });
  }
  return ok(page);
});

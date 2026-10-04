import { handler, ok } from "@/lib/api";
import { listCategories } from "@/lib/queries";

export const dynamic = "force-dynamic";

/** GET /api/categories?home=1 — active categories, optionally homepage-only. */
export const GET = handler(async (req: Request) => {
  const homeOnly = new URL(req.url).searchParams.get("home") === "1";
  return ok({ categories: await listCategories({ homeOnly }) });
});

import { handler, ok } from "@/lib/api";
import { listCategories, listCategoryTree } from "@/lib/queries";

export const dynamic = "force-dynamic";

/**
 * GET /api/categories
 *   ?home=1    — homepage tiles only
 *   ?top=1     — top-level groups only, no subcategories
 *   ?parent=x  — the subcategories of group `x`
 *   ?tree=1    — groups with their subcategories nested
 */
export const GET = handler(async (req: Request) => {
  const q = new URL(req.url).searchParams;
  if (q.get("tree") === "1") return ok({ categories: await listCategoryTree() });

  return ok({
    categories: await listCategories({
      homeOnly: q.get("home") === "1",
      topLevelOnly: q.get("top") === "1",
      parentSlug: q.get("parent")?.trim() || undefined,
    }),
  });
});

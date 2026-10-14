/* ==========================================================================
   Pure category-tree helpers. No database imports, so client components can
   use these without pulling Prisma into the browser bundle.
   ========================================================================== */

import type { Category } from "./types";

type TreeNode = Pick<Category, "id" | "name" | "parentId" | "sortOrder">;

/**
 * Flat list -> each parent followed by its own children, so a table can be
 * rendered in tree order without nesting the markup.
 */
export function sortIntoTree<T extends TreeNode>(categories: T[]): T[] {
  const byParent = new Map<string, T[]>();
  const roots: T[] = [];

  for (const c of categories) {
    if (c.parentId) {
      const bucket = byParent.get(c.parentId);
      bucket ? bucket.push(c) : byParent.set(c.parentId, [c]);
    } else {
      roots.push(c);
    }
  }

  const order = (a: T, b: T) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name);
  const out: T[] = [];

  for (const root of roots.sort(order)) {
    out.push(root);
    out.push(...(byParent.get(root.id) ?? []).sort(order));
    byParent.delete(root.id);
  }

  // A child whose parent was filtered out must still appear rather than vanish.
  for (const orphans of byParent.values()) out.push(...orphans.sort(order));

  return out;
}

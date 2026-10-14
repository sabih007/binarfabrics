/* ==========================================================================
   Category-tree rules.

   The tree is intentionally exactly one level deep: top-level groups (Women,
   Men, Collections, Fabric, and the main-category tiles) and their
   subcategories. Both route handlers enforce that here so the depth rule
   lives in one place.
   ========================================================================== */

import { HttpError } from "./api";
import { prisma } from "./db";

/** Refuses a parent that doesn't exist, or that is itself a subcategory. */
export async function assertParentIsTopLevel(parentId: string | null | undefined) {
  if (!parentId) return;

  const parent = await prisma.category.findUnique({
    where: { id: parentId },
    select: { id: true, name: true, parentId: true },
  });
  if (!parent) {
    throw new HttpError(400, "That parent category no longer exists.", "INVALID_PARENT");
  }
  if (parent.parentId) {
    throw new HttpError(
      400,
      `"${parent.name}" is already a subcategory. Categories can only be nested one level deep.`,
      "INVALID_PARENT"
    );
  }
}

/** Refuses to push a group that still has subcategories under another one. */
export async function assertHasNoChildren(id: string) {
  const children = await prisma.category.count({ where: { parentId: id } });
  if (children > 0) {
    throw new HttpError(
      400,
      `This category has ${children} subcategor${
        children === 1 ? "y" : "ies"
      } of its own, so it can't be moved under another category.`,
      "INVALID_PARENT"
    );
  }
}

/* PATCH/DELETE /api/admin/messages/:id */

import { handler, ok, readJson } from "@/lib/api";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { messageUpdateSchema } from "@/lib/validation";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type Ctx = { params: Promise<{ id: string }> };

export const PATCH = handler(async (req: Request, ctx: Ctx) => {
  await requireAdmin();
  const { id } = await ctx.params;
  const { status } = messageUpdateSchema.parse(await readJson(req));

  const message = await prisma.contactMessage.update({ where: { id }, data: { status } });
  return ok({ message: { ...message, createdAt: message.createdAt.toISOString() } });
});

export const DELETE = handler(async (_req: Request, ctx: Ctx) => {
  await requireAdmin();
  const { id } = await ctx.params;

  await prisma.contactMessage.delete({ where: { id } });
  return ok({ deleted: true });
});

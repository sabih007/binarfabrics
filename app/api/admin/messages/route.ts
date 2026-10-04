/* GET /api/admin/messages?status=NEW — contact-form inbox. */

import { handler, ok } from "@/lib/api";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { z } from "zod";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const querySchema = z.object({
  status: z.enum(["NEW", "READ", "ARCHIVED"]).optional(),
  page: z.coerce.number().int().min(1).default(1),
  perPage: z.coerce.number().int().min(1).max(100).default(30),
});

export const GET = handler(async (req: Request) => {
  await requireAdmin();
  const query = querySchema.parse(Object.fromEntries(new URL(req.url).searchParams));

  const where = query.status ? { status: query.status } : {};
  const [rows, total, unread] = await Promise.all([
    prisma.contactMessage.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (query.page - 1) * query.perPage,
      take: query.perPage,
    }),
    prisma.contactMessage.count({ where }),
    prisma.contactMessage.count({ where: { status: "NEW" } }),
  ]);

  return ok({
    messages: rows.map((m) => ({ ...m, createdAt: m.createdAt.toISOString() })),
    total,
    unread,
    page: query.page,
    pages: Math.max(1, Math.ceil(total / query.perPage)),
  });
});

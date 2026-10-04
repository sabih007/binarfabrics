/* GET /api/admin/subscribers — list, or ?format=csv to export. */

import { handler, ok } from "@/lib/api";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export const GET = handler(async (req: Request) => {
  await requireAdmin();

  const rows = await prisma.subscriber.findMany({
    where: { active: true },
    orderBy: { createdAt: "desc" },
  });

  if (new URL(req.url).searchParams.get("format") === "csv") {
    const csv = [
      "email,source,subscribed_at",
      ...rows.map((s) => `${s.email},${s.source ?? ""},${s.createdAt.toISOString()}`),
    ].join("\n");

    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="binar-subscribers.csv"`,
      },
    });
  }

  return ok({
    subscribers: rows.map((s) => ({ ...s, createdAt: s.createdAt.toISOString() })),
    total: rows.length,
  });
});

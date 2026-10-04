import { handler, ok } from "@/lib/api";
import { requireAdmin } from "@/lib/auth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** GET /api/admin/me — who am I? Used by the admin shell on load. */
export const GET = handler(async () => {
  const session = await requireAdmin();
  return ok({ user: { email: session.email, name: session.name, role: session.role } });
});

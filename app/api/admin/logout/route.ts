import { handler, ok } from "@/lib/api";
import { endSession } from "@/lib/auth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** POST /api/admin/logout — clears the session cookie. */
export const POST = handler(async () => {
  await endSession();
  return ok({ signedOut: true });
});

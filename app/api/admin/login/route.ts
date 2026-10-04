import { clientIp, handler, ok, readJson } from "@/lib/api";
import { enforce } from "@/lib/rate-limit";
import { authenticate, startSession } from "@/lib/auth";
import { loginSchema } from "@/lib/validation";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** POST /api/admin/login — sets the signed session cookie. */
export const POST = handler(async (req: Request) => {
  const { email, password } = loginSchema.parse(await readJson(req));

  // Throttle per IP *and* per account, so one attacker can't lock out an
  // owner by hammering their address from elsewhere.
  enforce(`login:ip:${clientIp(req)}`, 10, 15 * 60_000);
  enforce(`login:user:${email}`, 5, 15 * 60_000);

  const session = await authenticate(email, password);
  await startSession(session);

  return ok({ user: { email: session.email, name: session.name, role: session.role } });
});

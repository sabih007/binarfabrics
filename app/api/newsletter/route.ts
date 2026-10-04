import { clientIp, handler, ok, readJson } from "@/lib/api";
import { enforce } from "@/lib/rate-limit";
import { prisma } from "@/lib/db";
import { newsletterSchema } from "@/lib/validation";

export const dynamic = "force-dynamic";

/** POST /api/newsletter — idempotent subscribe. */
export const POST = handler(async (req: Request) => {
  enforce(`newsletter:${clientIp(req)}`, 5, 10 * 60_000);

  const { company, email, source } = newsletterSchema.parse(await readJson(req));
  if (company) return ok({ subscribed: true });

  // Re-subscribing an existing address reactivates it rather than erroring —
  // the visitor gets the same friendly confirmation either way.
  await prisma.subscriber.upsert({
    where: { email },
    update: { active: true },
    create: { email, source: source ?? "footer" },
  });

  return ok({ subscribed: true }, { status: 201 });
});

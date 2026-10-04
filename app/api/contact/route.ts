import { clientIp, handler, ok, readJson } from "@/lib/api";
import { enforce } from "@/lib/rate-limit";
import { prisma } from "@/lib/db";
import { contactSchema } from "@/lib/validation";
import { sendContactNotification } from "@/lib/mail";

export const dynamic = "force-dynamic";

/** POST /api/contact — stores the enquiry and notifies the shop. */
export const POST = handler(async (req: Request) => {
  const ip = clientIp(req);
  enforce(`contact:${ip}`, 5, 10 * 60_000);

  const { company, ...input } = contactSchema.parse(await readJson(req));

  // Honeypot hit: answer as if it worked so the bot doesn't retry.
  if (company) return ok({ received: true });

  const message = await prisma.contactMessage.create({
    data: {
      name: input.name,
      phone: input.phone,
      email: input.email ?? null,
      topic: input.topic,
      orderNumber: input.orderNumber ?? null,
      message: input.message,
      ip,
    },
  });

  // Email is a convenience; the message is already safely stored.
  await Promise.allSettled([sendContactNotification(input)]);

  return ok({ received: true, id: message.id }, { status: 201 });
});

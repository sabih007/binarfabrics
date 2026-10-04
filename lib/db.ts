/* ==========================================================================
   Prisma client singleton.

   Prisma 7 talks to Postgres through a driver adapter (node-postgres here).
   The singleton matters because Next.js hot-reloads modules in dev, which
   would otherwise open a new pool on every save until Postgres refuses
   connections.
   ========================================================================== */

import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { env } from "./env";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

function createClient() {
  const adapter = new PrismaPg({ connectionString: env.databaseUrl });
  return new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });
}

export const prisma: PrismaClient = globalForPrisma.prisma ?? createClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

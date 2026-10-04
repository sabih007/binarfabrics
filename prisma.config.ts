/* ==========================================================================
   Prisma CLI configuration (Prisma 7+).
   Connection URLs live here rather than in schema.prisma; the runtime client
   gets its connection from the driver adapter in lib/db.ts.
   ========================================================================== */

import "dotenv/config";
import path from "node:path";
import { defineConfig, env } from "prisma/config";

export default defineConfig({
  schema: path.join("prisma", "schema.prisma"),
  migrations: {
    path: path.join("prisma", "migrations"),
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    // Migrations want the unpooled connection when the host provides one
    // (Supabase, Neon); the app itself uses the pooled DATABASE_URL.
    url: process.env.DIRECT_URL ? env("DIRECT_URL") : env("DATABASE_URL"),
  },
});

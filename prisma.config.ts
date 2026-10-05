import "dotenv/config";
import { defineConfig } from "prisma/config";

// Config for the Prisma CLI only (migrate, generate, seed, studio).
// The running app connects separately in src/lib/db.ts.
export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    // Migrations need a direct (non-pooled) connection: Neon's PgBouncer pooler
    // in transaction mode does not support the session features migrate uses.
    // DIRECT_URL is our name for it; DATABASE_URL_UNPOOLED is the name Vercel's
    // Neon integration creates. Falls back to DATABASE_URL for local Postgres,
    // where there is no pooler.
    url: process.env["DIRECT_URL"] ?? process.env["DATABASE_URL_UNPOOLED"] ?? process.env["DATABASE_URL"],
  },
});

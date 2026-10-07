import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";
import { env, isProduction } from "@/lib/env";

/**
 * Prisma client singleton. Runtime queries use the pooled DATABASE_URL
 * (Neon PgBouncer); migrations use DIRECT_URL via prisma.config.ts.
 * The instance is cached on globalThis so dev hot-reloads don't open new pools.
 */
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

/**
 * node-postgres currently treats `sslmode=require` as `verify-full` but warns that
 * this will change to libpq semantics (no certificate check). Pin the strict mode.
 */
function withStrictSsl(connectionString: string): string {
  const url = new URL(connectionString);
  if (url.searchParams.get("sslmode") === "require") {
    url.searchParams.set("sslmode", "verify-full");
  }
  return url.toString();
}

function createPrismaClient(): PrismaClient {
  const adapter = new PrismaPg({ connectionString: withStrictSsl(env.DATABASE_URL) });
  return new PrismaClient({
    adapter,
    log: isProduction ? ["error"] : ["warn", "error"],
  });
}

export const prisma: PrismaClient = globalForPrisma.prisma ?? createPrismaClient();

if (!isProduction) {
  globalForPrisma.prisma = prisma;
}

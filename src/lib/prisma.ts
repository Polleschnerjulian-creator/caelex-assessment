import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

/**
 * Whether the database is configured and available.
 * Check this before using prisma in optional contexts.
 */
export const isDatabaseConfigured = Boolean(process.env.DATABASE_URL);

/**
 * Create a lazy Prisma proxy that defers connection until first use.
 * If DATABASE_URL is not set, accessing any property throws a helpful error
 * at runtime instead of crashing at import/startup time.
 *
 * This preserves the PrismaClient type for all existing consumers while
 * allowing the app to boot and serve public pages without a database.
 */
function createPrismaProxy(): PrismaClient {
  if (!process.env.DATABASE_URL) {
    if (process.env.NODE_ENV === "development") {
      console.warn(
        "[prisma] DATABASE_URL is not set. Database features are disabled. " +
          "The assessment wizard and public pages will still work.",
      );
    }

    // Return a proxy that throws a clear error on any property access
    // This lets the module load without crashing; only actual DB calls fail
    return new Proxy({} as PrismaClient, {
      get(_target, prop) {
        // Allow certain properties that might be checked without DB access
        if (
          prop === "then" ||
          prop === Symbol.toPrimitive ||
          prop === Symbol.toStringTag
        ) {
          return undefined;
        }
        if (prop === "$disconnect" || prop === "$connect") {
          return async () => {}; // no-op for lifecycle methods
        }
        throw new Error(
          `Database is not configured (DATABASE_URL is missing). ` +
            `Cannot access prisma.${String(prop)}. ` +
            `Set DATABASE_URL in your environment to enable database features.`,
        );
      },
    });
  }

  return new PrismaClient({
    log:
      process.env.NODE_ENV === "development"
        ? ["query", "error", "warn"]
        : ["error"],
  });
}

// Standard Prisma client works with Neon PostgreSQL via pooled connections
// For edge deployments, consider using @prisma/adapter-neon with dynamic imports
export const prisma: PrismaClient =
  globalForPrisma.prisma ?? createPrismaProxy();

if (process.env.NODE_ENV !== "production" && isDatabaseConfigured) {
  globalForPrisma.prisma = prisma;
}

// Cleanup function for serverless environments
export async function disconnectPrisma(): Promise<void> {
  await prisma.$disconnect();
}

/**
 * NextAuth Configuration - Hardened
 *
 * Security features:
 * - JWT session strategy with rotation
 * - Secure cookie settings
 * - Login attempt rate limiting
 * - Account deactivation support
 * - Audit logging integration
 *
 * NOTE: Prisma is dynamically imported to support Edge Runtime in middleware.
 * The middleware only needs JWT verification, not database access.
 *
 * GRACEFUL DEGRADATION: If AUTH_SECRET is not set, exports no-op stubs
 * so public pages and the assessment wizard still work without auth.
 */

import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import * as Sentry from "@sentry/nextjs";
import { logger } from "@/lib/logger";

// ─── Auth availability check ───

export const isAuthConfigured = Boolean(process.env.AUTH_SECRET);

if (!isAuthConfigured) {
  if (process.env.NODE_ENV === "development") {
    console.warn(
      "[auth] AUTH_SECRET is not set. Authentication is disabled. " +
        "Public pages and the assessment wizard will still work.",
    );
  }
}

// Dynamic import helper for Prisma (avoids Edge Runtime issues)
const getPrisma = async () => {
  const { prisma } = await import("@/lib/prisma");
  return prisma;
};

// ─── Types ───

declare module "next-auth" {
  interface User {
    role?: string;
    theme?: string;
  }
  interface Session {
    user: {
      id: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
      role?: string;
      theme?: string;
    };
  }
}

// JWT type augmentation moved to src/types/next-auth.d.ts

// ─── Configuration ───

const isProduction = process.env.NODE_ENV === "production";

// ─── No-op stubs when auth is not configured ───

function createNoOpAuth() {
  // Returns a middleware-compatible function that passes through
  const noOpMiddleware = (
    handler: (req: Request & { auth?: null }) => Promise<Response>,
  ) => {
    return async (req: Request & { auth?: null }) => {
      // Attach empty auth to the request so middleware doesn't crash
      req.auth = null;
      return handler(req);
    };
  };

  return {
    handlers: {
      GET: async () => new Response("Auth not configured", { status: 501 }),
      POST: async () => new Response("Auth not configured", { status: 501 }),
    },
    signIn: async () => undefined,
    signOut: async () => undefined,
    auth: noOpMiddleware as any, // Intentional: cannot match NextAuth's complex return type
  };
}

const authResult = isAuthConfigured
  ? NextAuth({
      // Note: PrismaAdapter removed to support Edge Runtime middleware
      // User creation/linking is handled manually in the authorize callback

      // ─── Session Configuration ───
      session: {
        strategy: "jwt",
        maxAge: 24 * 60 * 60, // 24 hours
        updateAge: 60 * 60, // Refresh token every hour
      },

      // ─── Secure Cookie Settings ───
      cookies: {
        sessionToken: {
          name: isProduction
            ? "__Secure-authjs.session-token"
            : "authjs.session-token",
          options: {
            httpOnly: true,
            sameSite: "lax",
            path: "/",
            secure: isProduction,
          },
        },
        callbackUrl: {
          name: isProduction
            ? "__Secure-authjs.callback-url"
            : "authjs.callback-url",
          options: {
            httpOnly: true,
            sameSite: "lax",
            path: "/",
            secure: isProduction,
          },
        },
        csrfToken: {
          name: isProduction ? "__Host-authjs.csrf-token" : "authjs.csrf-token",
          options: {
            httpOnly: true,
            sameSite: "lax",
            path: "/",
            secure: isProduction,
          },
        },
      },

      // ─── Custom Pages ───
      pages: {
        signIn: "/login",
        error: "/login?error=true",
      },

      // ─── Callbacks ───
      callbacks: {
        async jwt({ token, user, trigger, session: updateData }) {
          // Initial sign in
          if (user) {
            token.id = user.id;
            token.role = user.role || "user";
            token.theme = user.theme || "system";
          }

          // Session update trigger - verify user is still active and sync preferences
          if (trigger === "update" && token.id) {
            // If theme is being updated via updateSession({ theme: ... })
            if (updateData?.theme) {
              token.theme = updateData.theme as string;
            }

            try {
              const prisma = await getPrisma();
              if (!prisma) throw new Error("Database not configured");
              const dbUser = await prisma.user.findUnique({
                where: { id: token.id as string },
                select: { role: true, isActive: true, theme: true },
              });

              if (!dbUser?.isActive) {
                throw new Error("Account deactivated");
              }

              token.role = dbUser.role as string;
              // Only update theme from DB if not being set via updateSession
              if (!updateData?.theme) {
                token.theme = dbUser.theme || "system";
              }
            } catch (error) {
              // If we can't reach DB, keep existing token values
              logger.error("Failed to refresh user data", error);
            }
          }

          return token;
        },

        async session({ session, token }) {
          if (session.user) {
            session.user.id = token.id as string;
            session.user.role = token.role as string | undefined;
            session.user.theme = token.theme as string | undefined;
          }
          return session;
        },

        async signIn({ user, account }) {
          // For OAuth providers, check if user is active
          if (account?.provider !== "credentials" && user.id) {
            try {
              const prisma = await getPrisma();
              if (!prisma) return true; // Allow sign in if DB not configured
              const dbUser = await prisma.user.findUnique({
                where: { id: user.id },
                select: { isActive: true },
              });

              if (dbUser && !dbUser.isActive) {
                return false; // Block sign in
              }
            } catch (error) {
              logger.error("Failed to check user status", error);
              // Allow sign in if DB check fails (fail open)
            }
          }
          return true;
        },
      },

      // ─── Providers ───
      providers: [
        // Google OAuth
        ...(process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET
          ? [
              Google({
                clientId: process.env.AUTH_GOOGLE_ID,
                clientSecret: process.env.AUTH_GOOGLE_SECRET,
                authorization: {
                  params: {
                    prompt: "consent",
                    access_type: "offline",
                  },
                },
              }),
            ]
          : []),

        // Credentials (Email/Password)
        Credentials({
          name: "credentials",
          credentials: {
            email: { label: "Email", type: "email" },
            password: { label: "Password", type: "password" },
          },

          async authorize(credentials) {
            if (!credentials?.email || !credentials?.password) {
              return null;
            }

            const email = (credentials.email as string).toLowerCase().trim();
            const password = credentials.password as string;

            const prisma = await getPrisma();

            if (!prisma) {
              logger.error("Database not configured - cannot authenticate");
              return null;
            }

            // ─── Rate Limit Check ───
            const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000);

            const recentAttempts = await prisma.loginAttempt.count({
              where: {
                email,
                createdAt: { gte: fifteenMinutesAgo },
              },
            });

            if (recentAttempts >= 5) {
              // Log security event
              await prisma.securityEvent.create({
                data: {
                  type: "BRUTE_FORCE_ATTEMPT",
                  severity: "HIGH",
                  description: `Login rate limit exceeded for email: ${email}`,
                  metadata: JSON.stringify({ email, attempts: recentAttempts }),
                },
              });

              throw new Error(
                "Too many login attempts. Please try again in 15 minutes.",
              );
            }

            // ─── Log Attempt ───
            await prisma.loginAttempt.create({
              data: {
                email,
                success: false, // Will update if successful
              },
            });

            // ─── Find User ───
            const user = await prisma.user.findUnique({
              where: { email },
              select: {
                id: true,
                email: true,
                name: true,
                image: true,
                password: true,
                role: true,
                isActive: true,
                theme: true,
              },
            });

            // User not found or no password (OAuth only)
            if (!user?.password) {
              return null;
            }

            // Account deactivated
            if (!user.isActive) {
              throw new Error(
                "Account has been deactivated. Please contact support.",
              );
            }

            // ─── Verify Password ───
            const isValid = await bcrypt.compare(password, user.password);

            if (!isValid) {
              return null;
            }

            // ─── Success - Clear Attempts ───
            await prisma.loginAttempt.deleteMany({
              where: { email },
            });

            // Update last attempt as successful
            await prisma.loginAttempt.create({
              data: {
                email,
                success: true,
              },
            });

            // ─── Return User ───
            return {
              id: user.id,
              email: user.email,
              name: user.name,
              image: user.image,
              role: user.role,
              theme: user.theme || "system",
            };
          },
        }),
      ],

      // ─── Events ───
      events: {
        async signIn({ user, account }) {
          // Log successful sign in
          if (user.id) {
            try {
              const prisma = await getPrisma();
              if (prisma) {
                await prisma.auditLog.create({
                  data: {
                    userId: user.id,
                    action: "LOGIN",
                    entityType: "User",
                    entityId: user.id,
                    description: `User signed in via ${account?.provider || "credentials"}`,
                  },
                });
              }
            } catch (error) {
              logger.error("Failed to log sign in", error);
            }

            // Set Sentry user context
            Sentry.setUser({
              id: user.id,
              email: user.email || undefined,
            });
          }
        },

        async signOut(message) {
          // Log sign out - handle both JWT and session strategies
          const token = "token" in message ? message.token : null;
          if (token?.id) {
            try {
              const prisma = await getPrisma();
              if (prisma) {
                await prisma.auditLog.create({
                  data: {
                    userId: token.id as string,
                    action: "LOGOUT",
                    entityType: "User",
                    entityId: token.id as string,
                    description: "User signed out",
                  },
                });
              }
            } catch (error) {
              logger.error("Failed to log sign out", error);
            }
          }

          // Clear Sentry user context
          Sentry.setUser(null);
        },
      },

      // ─── Debug ───
      debug: process.env.NODE_ENV === "development",
    })
  : createNoOpAuth();

export const { handlers, signIn, signOut, auth } = authResult;

// ─── Utility Functions ───

/**
 * Hash a password using bcrypt.
 * Use this when creating/updating user passwords.
 */
export async function hashPassword(password: string): Promise<string> {
  const saltRounds = 12; // OWASP recommends 10+
  return bcrypt.hash(password, saltRounds);
}

/**
 * Verify a password against a hash.
 */
export async function verifyPassword(
  password: string,
  hash: string,
): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

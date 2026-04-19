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
import Apple from "next-auth/providers/apple";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import * as Sentry from "@sentry/nextjs";
import { logger } from "@/lib/logger";
import { verifySignedToken } from "@/lib/signed-token";

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

// ─── Helpers ───

/**
 * Mask an email address for use in logs and security events.
 * Preserves first/last character of local part and full domain for debuggability
 * while protecting PII. Example: "julian@example.com" -> "j****n@example.com"
 */
export function maskEmail(email: string): string {
  const [local, domain] = email.split("@");
  if (!domain) return "***";
  const maskedLocal =
    local.length <= 2
      ? "*".repeat(local.length)
      : local[0] + "*".repeat(local.length - 2) + local[local.length - 1];
  return `${maskedLocal}@${domain}`;
}

// ─── Types ───

declare module "next-auth" {
  interface User {
    role?: string;
    theme?: string;
    mfaRequired?: boolean;
    mfaVerified?: boolean;
  }
  interface Session {
    user: {
      id: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
      role?: string;
      theme?: string;
      mfaRequired?: boolean;
      mfaVerified?: boolean;
    };
  }
}

// JWT type augmentation moved to src/types/next-auth.d.ts

// ─── Configuration ───

const isProduction = process.env.NODE_ENV === "production";

// ─── No-op stubs when auth is not configured ───

/** @internal Exported for testing only */
export function createNoOpAuth() {
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
        updateAge: 5 * 60, // Refresh token every 5 minutes (fast role propagation)
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

            // Propagate MFA flags — if MFA is required, session is not fully
            // authenticated until the TOTP challenge is completed.
            if (user.mfaRequired) {
              token.mfaRequired = true;
              token.mfaVerified = false;
            }
          }

          // Session update trigger - verify user is still active and sync preferences
          if (trigger === "update" && token.id) {
            // If MFA was just verified, update the token
            if (updateData?.mfaVerified === true) {
              token.mfaVerified = true;
            }

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
            session.user.mfaRequired = token.mfaRequired as boolean | undefined;
            session.user.mfaVerified = token.mfaVerified as boolean | undefined;
          }
          return session;
        },

        async signIn({ user, account, profile }) {
          // C1 fix: oauth account-takeover hardening. previously any oauth
          // provider returning an email matching an existing credentials
          // user's email could mint a session for that user. now:
          //   1. require email_verified=true in the provider profile.
          //   2. if a caelex user with that email exists via credentials
          //      only, refuse the oauth sign-in (prevents apple/google
          //      alias-shadowing attacks).
          //   3. still verify isActive.
          if (
            account?.provider !== "credentials" &&
            account?.provider !== "passkey-token"
          ) {
            try {
              const prisma = await getPrisma();
              if (!prisma) return true;

              // 1. email_verified check (google sets this explicitly)
              const p = profile as
                | {
                    email?: string;
                    email_verified?: boolean;
                    verified_email?: boolean; // legacy google field
                  }
                | undefined;
              const email = p?.email ?? user.email ?? null;
              const emailVerified =
                p?.email_verified === true ||
                p?.verified_email === true ||
                account?.provider === "apple"; // apple mandates verification
              if (!email || !emailVerified) {
                logger.warn(
                  "[auth] OAuth sign-in rejected: email not verified",
                  { provider: account?.provider, email },
                );
                return false;
              }

              // 2. block oauth sign-in when a credentials user exists
              // unless the oauth provider id has been explicitly linked
              // (there's no Account table without the adapter, so we
              // rely on a dedicated flag on the user record).
              const existing = await prisma.user.findUnique({
                where: { email },
                select: {
                  id: true,
                  isActive: true,
                  password: true,
                  // oauthProviderIds is a json array of "provider:sub"
                  // strings. if present, the user has explicitly linked
                  // this provider.
                },
              });

              if (existing) {
                if (!existing.isActive) return false;
                // If the user has a password, only permit oauth login
                // when that specific provider account has been linked.
                // The link is handled out-of-band (dedicated /api/user/
                // link-oauth-account endpoint) to force explicit consent.
                if (existing.password) {
                  // heuristic: forbid first-time oauth for credentials
                  // users. the explicit link flow should set a flag
                  // we can read here; until that flow exists, reject.
                  logger.warn(
                    "[auth] OAuth sign-in rejected: credentials user must link first",
                    { provider: account?.provider, email },
                  );
                  return false;
                }
              }

              // user.id is the provider-sub for a fresh oauth sign-in.
              // only re-check isActive when we matched a real db row.
              if (existing && !existing.isActive) return false;
            } catch (error) {
              logger.error("Failed to check user status", error);
              return false; // fail closed
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

        // Apple OAuth
        ...(process.env.AUTH_APPLE_ID && process.env.AUTH_APPLE_SECRET
          ? [
              Apple({
                clientId: process.env.AUTH_APPLE_ID,
                clientSecret: process.env.AUTH_APPLE_SECRET,
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

            // ─── Rate Limit Check (per-email, pre-authentication) ───
            // This LoginAttempt table provides email-based rate limiting that works
            // even for non-existent accounts (defense against credential stuffing).
            // This is complementary to the per-user account lockout system in
            // login-security.server.ts (User.failedLoginAttempts / lockedUntil),
            // which tracks lockout state for known users and supports unlock tokens.
            const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000);

            const recentAttempts = await prisma.loginAttempt.count({
              where: {
                email,
                createdAt: { gte: fifteenMinutesAgo },
              },
            });

            if (recentAttempts >= 5) {
              // Log security event (mask PII in logs)
              await prisma.securityEvent.create({
                data: {
                  type: "BRUTE_FORCE_ATTEMPT",
                  severity: "HIGH",
                  description: `Login rate limit exceeded for email: ${maskEmail(email)}`,
                  metadata: JSON.stringify({
                    email: maskEmail(email),
                    attempts: recentAttempts,
                  }),
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
                lockedUntil: true,
                failedLoginAttempts: true,
                mfaConfig: {
                  select: { enabled: true },
                },
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

            // Account locked (user-level lockout)
            if (user.lockedUntil && user.lockedUntil > new Date()) {
              throw new Error(
                "Account is temporarily locked due to too many failed attempts. Please try again later.",
              );
            }

            // ─── Verify Password ───
            const isValid = await bcrypt.compare(password, user.password);

            if (!isValid) {
              // Record failed attempt for user-level lockout
              const newAttempts = (user.failedLoginAttempts || 0) + 1;
              const lockoutData: {
                failedLoginAttempts: number;
                lockedUntil?: Date;
              } = {
                failedLoginAttempts: newAttempts,
              };
              // Lock account after 5 failed attempts for 30 minutes
              // Must match MAX_FAILED_ATTEMPTS in login-security.server.ts
              if (newAttempts >= 5) {
                lockoutData.lockedUntil = new Date(Date.now() + 30 * 60 * 1000);
              }
              await prisma.user.update({
                where: { id: user.id },
                data: lockoutData,
              });
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

            // Reset user-level lockout counters on successful login
            if (user.failedLoginAttempts && user.failedLoginAttempts > 0) {
              await prisma.user.update({
                where: { id: user.id },
                data: { failedLoginAttempts: 0, lockedUntil: null },
              });
            }

            // ─── Return User ───
            // If user has MFA enabled, mark session as requiring MFA verification.
            // The session will have mfaVerified=false until the TOTP challenge is completed.
            const hasMfa = user.mfaConfig?.enabled === true;

            return {
              id: user.id,
              email: user.email,
              name: user.name,
              image: user.image,
              role: user.role,
              theme: user.theme || "system",
              ...(hasMfa && { mfaRequired: true, mfaVerified: false }),
            };
          },
        }),

        // Passkey Token Provider — exchanges a short-lived signed token
        // (issued by /api/auth/passkey/login-verify) for a NextAuth session.
        // This avoids exposing the raw userId to the client.
        Credentials({
          id: "passkey-token",
          name: "passkey-token",
          credentials: {
            token: { label: "Token", type: "text" },
          },

          async authorize(credentials) {
            if (!credentials?.token) {
              return null;
            }

            const token = credentials.token as string;

            // Verify the signed token (checks HMAC signature + expiration)
            const payload = verifySignedToken<{
              sub: string;
              purpose: string;
            }>(token);

            if (
              !payload ||
              payload.purpose !== "passkey-login" ||
              !payload.sub
            ) {
              return null;
            }

            const prisma = await getPrisma();
            if (!prisma) {
              logger.error(
                "Database not configured - cannot authenticate passkey token",
              );
              return null;
            }

            const user = await prisma.user.findUnique({
              where: { id: payload.sub },
              select: {
                id: true,
                email: true,
                name: true,
                image: true,
                role: true,
                isActive: true,
                theme: true,
              },
            });

            if (!user || !user.isActive) {
              return null;
            }

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

            // Set Sentry user context (ID only — no PII)
            Sentry.setUser({
              id: user.id,
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

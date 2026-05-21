-- Caelex Trade Sprint T1 — Multi-Product Access Ledger.
--
-- Introduces a new persistence layer that decouples Caelex product
-- access from `Organization.orgType`. Until now Atlas (LAW_FIRM/BOTH)
-- and Pharos (AUTHORITY) were gated purely by orgType, and Comply was
-- gated via Subscription.plan != FREE. The new Trade product targets
-- the same orgType=OPERATOR as Comply, so a subscription/grant-based
-- access mechanism is required.
--
-- The new table `OrganizationProductAccess` stores one row per
-- (Organization, Product) tuple. Sources of writes:
--   - Stripe webhook (subscription.created/updated/deleted)
--   - Admin API (manual grants for enterprise sales)
--   - Backfill script (one-time migration for legacy orgs)
--   - Trial promos (e.g. 6-month Trade Starter loyalty bonus)
--
-- T1 is foundation only — the existing SubscriptionGate, Atlas layout
-- and Pharos layout continue to use their current gates. A follow-up
-- sprint will switch the gates to this table once Trade ships.

-- CreateEnum
CREATE TYPE "ProductCode" AS ENUM ('COMPLY', 'TRADE', 'ATLAS', 'PHAROS');

-- CreateEnum
CREATE TYPE "ProductAccessStatus" AS ENUM ('ACTIVE', 'TRIAL', 'SUSPENDED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "ProductAccessSource" AS ENUM ('STRIPE', 'MANUAL', 'LEGACY_BACKFILL', 'TRIAL_PROMO', 'ORG_TYPE');

-- CreateTable
CREATE TABLE "OrganizationProductAccess" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "product" "ProductCode" NOT NULL,
    "status" "ProductAccessStatus" NOT NULL DEFAULT 'ACTIVE',
    "source" "ProductAccessSource" NOT NULL,
    "stripeSubscriptionId" TEXT,
    "stripePriceId" TEXT,
    "grantedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3),
    "suspendedAt" TIMESTAMP(3),
    "suspendedReason" TEXT,
    "grantedById" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OrganizationProductAccess_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "OrganizationProductAccess_organizationId_idx" ON "OrganizationProductAccess"("organizationId");

-- CreateIndex
CREATE INDEX "OrganizationProductAccess_product_idx" ON "OrganizationProductAccess"("product");

-- CreateIndex
CREATE INDEX "OrganizationProductAccess_status_idx" ON "OrganizationProductAccess"("status");

-- CreateIndex
CREATE INDEX "OrganizationProductAccess_stripeSubscriptionId_idx" ON "OrganizationProductAccess"("stripeSubscriptionId");

-- CreateIndex
CREATE UNIQUE INDEX "OrganizationProductAccess_organizationId_product_key" ON "OrganizationProductAccess"("organizationId", "product");

-- AddForeignKey
ALTER TABLE "OrganizationProductAccess" ADD CONSTRAINT "OrganizationProductAccess_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

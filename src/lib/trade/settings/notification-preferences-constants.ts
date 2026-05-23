/**
 * Caelex Trade — Notification Preferences constants (client+server safe).
 *
 * Extracted from `notification-preferences-service.ts` so client components
 * (e.g. AuditTab, NotificationsTab) can import the validation bounds
 * without pulling in the server-only Prisma client.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

export const MIN_RETENTION_YEARS = 1;
export const MAX_RETENTION_YEARS = 30;
export const DEFAULT_RETENTION_YEARS = 5;

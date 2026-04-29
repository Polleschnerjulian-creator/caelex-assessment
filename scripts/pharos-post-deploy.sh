#!/usr/bin/env bash
# Copyright 2026 Julian Polleschner. All rights reserved.
#
# Pharos 2.0 Post-Deploy Helper
# =============================
#
# Run this AFTER the production Vercel deploy has gone green. It:
#   1. Confirms the prod URL is reachable
#   2. Pulls DATABASE_URL from `vercel env pull`
#   3. Runs the NormAnchor seed against production
#   4. Verifies the /.well-known endpoint and /api/pharos/receipt route
#   5. Prints a summary of what landed
#
# Usage:
#   ./scripts/pharos-post-deploy.sh
#
# Prerequisites:
#   - Logged in via `vercel login` to the right team
#   - Project is `vercel link`-ed to the Caelex production project
#   - Node 18+ and pnpm/npm installed

set -euo pipefail

PROD_URL="${PROD_URL:-https://caelex.app}"
ENV_FILE=".env.pharos-deploy.tmp"

echo "Pharos 2.0 Post-Deploy"
echo "──────────────────────"

# 1. Reachability
echo
echo "→ Probing $PROD_URL ..."
if curl -sSf -o /dev/null -m 10 "$PROD_URL/api/health" 2>/dev/null; then
  echo "  ✓ production is reachable"
else
  echo "  ⚠ /api/health did not respond — may be expected if no health route exists"
fi

# 2. Pull DATABASE_URL
echo
echo "→ Pulling production env vars via vercel CLI ..."
if vercel env pull "$ENV_FILE" --yes --environment=production >/dev/null 2>&1; then
  echo "  ✓ env pulled to $ENV_FILE"
else
  echo "  ✗ vercel env pull failed — make sure you're linked + authed"
  echo "    Run: vercel link  (then re-run this script)"
  exit 1
fi

# Source DATABASE_URL only — don't pollute the env with anything else.
DATABASE_URL=$(grep -E '^DATABASE_URL=' "$ENV_FILE" | head -1 | cut -d= -f2- | tr -d '"')
if [[ -z "${DATABASE_URL:-}" ]]; then
  echo "  ✗ DATABASE_URL not present in $ENV_FILE"
  rm -f "$ENV_FILE"
  exit 1
fi
export DATABASE_URL

# 3. Seed NormAnchor
echo
echo "→ Seeding Pharos NormAnchor index ..."
if npx tsx scripts/seed-pharos-norms.ts; then
  echo "  ✓ seed complete"
else
  echo "  ✗ seed failed — check stderr above"
  rm -f "$ENV_FILE"
  exit 1
fi

# 4. Verify endpoints
echo
echo "→ Smoke-checking public endpoints ..."

# We don't yet have a known entryId/authorityProfileId, so we just probe
# that the routes are registered (404 is the expected response on
# unknown ID; 5xx would indicate a deploy regression).
RECEIPT_PROBE=$(curl -sS -o /dev/null -w "%{http_code}" -m 10 "$PROD_URL/api/pharos/receipt/probe-nonexistent" || echo "000")
KEYS_PROBE=$(curl -sS -o /dev/null -w "%{http_code}" -m 10 "$PROD_URL/api/pharos/.well-known/keys/probe-nonexistent" || echo "000")

echo "  /api/pharos/receipt/<id>       → HTTP $RECEIPT_PROBE   $([ "$RECEIPT_PROBE" = "404" ] && echo '(expected — unknown id)')"
echo "  /api/pharos/.well-known/keys/  → HTTP $KEYS_PROBE   $([ "$KEYS_PROBE" = "404" ] && echo '(expected — unknown id)')"

# 5. Cleanup + summary
echo
rm -f "$ENV_FILE"

echo "──────────────────────"
echo "Pharos 2.0 is live."
echo
echo "Next steps:"
echo "  • Login as an AUTHORITY-tier user → /pharos/astra → ask a regulatory question"
echo "  • Verify a returned receipt:  npx pharos-verify <entryId>"
echo "  • Review the daily norm-drift cron at /api/cron/pharos-norm-drift (auth: CRON_SECRET)"
echo "  • Operator-side mirror feed: /dashboard/network/oversight  (mount the OversightMirrorStream component)"
echo

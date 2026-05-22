-- Caelex Trade Sprint Z2 — EU Reg. 833/2014 Annex IV as a separate
-- sanctions-list value.
--
-- Annex IV is the enhanced end-user list under Reg. 833/2014 Art. 2b:
-- export of EU dual-use items to ANY entity on this list is prohibited
-- regardless of civilian intent. The list overlaps with EU FSF for some
-- Russian entities but carries a separately enforceable prohibition
-- surface, so we model it as its own TradeSanctionsList value (not just
-- "more entries in FSF").
--
-- Reg. (EU) 2026/506 of 23 April 2026 added 60 entities (32 Russian,
-- 28 third-country) — current total ~200+.

ALTER TYPE "TradeSanctionsList" ADD VALUE 'EU_ANNEX_IV';

-- Caelex Trade Sprint Z3a — TradeItem parametric attribute columns.
--
-- Extends TradeItem with typed technical specs that drive the
-- parametric matcher (Z3c) against the cross-walk graph (Z3b). Three
-- fields already existed from Sprint B3 (apertureMeters, rangeKm,
-- payloadKg, plus the boolean flags); this migration adds the
-- remaining tier-1 attributes called out in the research blueprint
-- § 5 + § 8.
--
-- All columns are nullable — operators populate them as known. The
-- matcher skips predicates whose attribute is NULL on the item.

ALTER TABLE "TradeItem"
    ADD COLUMN "gsdMeters" DOUBLE PRECISION,
    ADD COLUMN "IspSeconds" DOUBLE PRECISION,
    ADD COLUMN "deltaVMetersPerSecond" DOUBLE PRECISION,
    ADD COLUMN "transmitPowerW" DOUBLE PRECISION,
    ADD COLUMN "frequencyGhz" DOUBLE PRECISION,
    ADD COLUMN "radHardTidKrad" DOUBLE PRECISION,
    ADD COLUMN "seuRateErrorsPerBitDay" DOUBLE PRECISION,
    ADD COLUMN "itemClass" TEXT,
    ADD COLUMN "parametricAttributes" JSONB;

-- Caelex Trade Sprint Z3e — extended technical-attribute columns.
--
-- Driven by the May 2026 ontology research blueprint § 12. Each new
-- column maps to at least one regulatory hard-edge threshold across
-- USML / CCL / EU Annex I / MTCR. All nullable; matcher uses three-
-- valued logic (Z3f) to distinguish "predicate refuted" from
-- "attribute unknown".

ALTER TABLE "TradeItem"
    ADD COLUMN "spectralBandCount" INTEGER,
    ADD COLUMN "peakWavelengthNm" DOUBLE PRECISION,
    ADD COLUMN "radarCenterFreqGhz" DOUBLE PRECISION,
    ADD COLUMN "radarBandwidthMhz" DOUBLE PRECISION,
    ADD COLUMN "antennaDiameterM" DOUBLE PRECISION,
    ADD COLUMN "starTrackerAccuracyArcsec" DOUBLE PRECISION,
    ADD COLUMN "starTrackerSlewRateDegPerS" DOUBLE PRECISION,
    ADD COLUMN "totalImpulseNs" DOUBLE PRECISION,
    ADD COLUMN "neutronFluenceNPerCm2" DOUBLE PRECISION,
    ADD COLUMN "selLetThresholdMevCm2Mg" DOUBLE PRECISION,
    ADD COLUMN "doseRateUpsetRadSiPerS" DOUBLE PRECISION,
    ADD COLUMN "gnssMaxVelocityMPerS" DOUBLE PRECISION,
    ADD COLUMN "antennaActiveScanning" BOOLEAN,
    ADD COLUMN "antennaAdaptiveBeamforming" BOOLEAN,
    ADD COLUMN "isSpeciallyDesigned" BOOLEAN;

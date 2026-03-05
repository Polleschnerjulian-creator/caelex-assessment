import { describe, it, expect } from "vitest";
import {
  EUSpaceActAssessSchema,
  NIS2ClassifySchema,
  NIS2AssessSchema,
  SpaceLawAssessSchema,
  QuickCheckSchema,
  NIS2QuickClassifySchema,
  WidgetTrackSchema,
} from "./api-compliance";

describe("api-compliance validation schemas", () => {
  describe("EUSpaceActAssessSchema", () => {
    it("accepts valid input", () => {
      const result = EUSpaceActAssessSchema.safeParse({
        activityType: "spacecraft",
        establishment: "eu",
        entitySize: "medium",
      });
      expect(result.success).toBe(true);
    });

    it("rejects missing required fields", () => {
      const result = EUSpaceActAssessSchema.safeParse({});
      expect(result.success).toBe(false);
    });

    it("rejects invalid activityType", () => {
      const result = EUSpaceActAssessSchema.safeParse({
        activityType: "invalid",
        establishment: "eu",
        entitySize: "medium",
      });
      expect(result.success).toBe(false);
    });
  });

  describe("NIS2ClassifySchema", () => {
    it("accepts valid input", () => {
      const result = NIS2ClassifySchema.safeParse({
        entitySize: "large",
      });
      expect(result.success).toBe(true);
    });

    it("defaults sector to 'space'", () => {
      const result = NIS2ClassifySchema.parse({ entitySize: "medium" });
      expect(result.sector).toBe("space");
    });

    it("rejects invalid entitySize", () => {
      const result = NIS2ClassifySchema.safeParse({
        entitySize: "huge",
      });
      expect(result.success).toBe(false);
    });
  });

  describe("NIS2AssessSchema", () => {
    it("extends NIS2ClassifySchema with additional fields", () => {
      const result = NIS2AssessSchema.safeParse({
        entitySize: "large",
        hasISO27001: true,
        employeeCount: 500,
      });
      expect(result.success).toBe(true);
    });

    it("defaults optional fields to null", () => {
      const result = NIS2AssessSchema.parse({ entitySize: "small" });
      expect(result.manufacturesSpacecraft).toBeNull();
      expect(result.providesEOData).toBeNull();
      expect(result.annualRevenue).toBeNull();
    });
  });

  describe("SpaceLawAssessSchema", () => {
    it("accepts valid jurisdictions", () => {
      const result = SpaceLawAssessSchema.safeParse({
        selectedJurisdictions: ["FR", "DE"],
      });
      expect(result.success).toBe(true);
    });

    it("rejects empty jurisdictions array", () => {
      const result = SpaceLawAssessSchema.safeParse({
        selectedJurisdictions: [],
      });
      expect(result.success).toBe(false);
    });

    it("rejects invalid jurisdiction codes", () => {
      const result = SpaceLawAssessSchema.safeParse({
        selectedJurisdictions: ["US"],
      });
      expect(result.success).toBe(false);
    });
  });

  describe("QuickCheckSchema", () => {
    it("accepts valid input", () => {
      const result = QuickCheckSchema.safeParse({
        activityType: "spacecraft",
        entitySize: "small",
        establishment: "eu",
      });
      expect(result.success).toBe(true);
    });

    it("rejects missing fields", () => {
      const result = QuickCheckSchema.safeParse({
        activityType: "spacecraft",
      });
      expect(result.success).toBe(false);
    });
  });

  describe("NIS2QuickClassifySchema", () => {
    it("accepts valid input", () => {
      const result = NIS2QuickClassifySchema.safeParse({
        entitySize: "micro",
      });
      expect(result.success).toBe(true);
    });

    it("defaults sector to space", () => {
      const result = NIS2QuickClassifySchema.parse({ entitySize: "large" });
      expect(result.sector).toBe("space");
    });
  });

  describe("WidgetTrackSchema", () => {
    it("accepts valid input", () => {
      const result = WidgetTrackSchema.safeParse({
        event: "impression",
        widgetId: "widget-123",
      });
      expect(result.success).toBe(true);
    });

    it("rejects empty widgetId", () => {
      const result = WidgetTrackSchema.safeParse({
        event: "impression",
        widgetId: "",
      });
      expect(result.success).toBe(false);
    });

    it("rejects invalid event type", () => {
      const result = WidgetTrackSchema.safeParse({
        event: "invalid_event",
        widgetId: "w1",
      });
      expect(result.success).toBe(false);
    });
  });
});

import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  RegisterSchema,
  LoginSchema,
  PasswordChangeSchema,
  OperatorTypeEnum,
  ArticleStatusEnum,
  UpdateArticleStatusSchema,
  EnvironmentalAssessmentSchema,
  CybersecurityAssessmentSchema,
  InsuranceAssessmentSchema,
  QueryParamsSchema,
  sanitizeHtml,
  sanitizeString,
  validateInput,
  formatZodErrors,
  createValidationErrorResponse,
  parsePaginationLimit,
  getSafeErrorMessage,
  isUserFacingError,
  safeJsonParse,
  safeJsonParseArray,
  safeJsonParseObject,
  CuidSchema,
  UuidSchema,
  WebhookUrlSchema,
  CreateWebhookSchema,
  UpdateWebhookSchema,
  CreateApiKeySchema,
  MarkNotificationsReadSchema,
  DismissNotificationSchema,
  NotificationSettingsSchema,
  RevokeSessionsSchema,
  CreateCheckoutSessionSchema,
  CreatePortalSessionSchema,
  AuditReportRequestSchema,
  ComplianceCertificateSchema,
  UpdateWorkflowStatusSchema,
  WorkflowDocumentSchema,
} from "@/lib/validations";
import { z } from "zod";

describe("Validation Schemas", () => {
  describe("Sanitization Helpers", () => {
    describe("sanitizeHtml", () => {
      it("should strip HTML tags", () => {
        const input = '<script>alert("xss")</script>Hello';
        const result = sanitizeHtml(input);
        expect(result).toBe('alert("xss")Hello');
      });

      it("should handle nested HTML", () => {
        const input = "<div><p>Text</p></div>";
        const result = sanitizeHtml(input);
        expect(result).toBe("Text");
      });

      it("should preserve plain text", () => {
        const input = "Plain text without HTML";
        const result = sanitizeHtml(input);
        expect(result).toBe("Plain text without HTML");
      });

      it("should handle empty string", () => {
        const result = sanitizeHtml("");
        expect(result).toBe("");
      });

      it("should handle special characters in text", () => {
        const input = "Text with & symbols";
        const result = sanitizeHtml(input);
        expect(result).toContain("&");
      });
    });

    describe("sanitizeString", () => {
      it("should trim whitespace", () => {
        const input = "  test  ";
        const result = sanitizeString(input);
        expect(result).toBe("test");
      });

      it("should strip HTML and trim", () => {
        const input = "  <b>test</b>  ";
        const result = sanitizeString(input);
        expect(result).toBe("test");
      });
    });
  });

  describe("RegisterSchema", () => {
    it("should validate valid registration data", () => {
      const validData = {
        name: "John Doe",
        email: "john@example.com",
        password: "SecurePass123!@#",
        organization: "Acme Corp",
        acceptTerms: true,
      };

      const result = RegisterSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it("should reject short name", () => {
      const data = {
        name: "J",
        email: "john@example.com",
        password: "SecurePass123!@#",
      };

      const result = RegisterSchema.safeParse(data);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].path).toContain("name");
      }
    });

    it("should reject name with HTML", () => {
      const data = {
        name: "<script>alert(1)</script>John",
        email: "john@example.com",
        password: "SecurePass123!@#",
      };

      const result = RegisterSchema.safeParse(data);
      expect(result.success).toBe(false);
    });

    it("should reject invalid email", () => {
      const data = {
        name: "John Doe",
        email: "not-an-email",
        password: "SecurePass123!@#",
      };

      const result = RegisterSchema.safeParse(data);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].path).toContain("email");
      }
    });

    it("should lowercase email", () => {
      const data = {
        name: "John Doe",
        email: "JOHN@EXAMPLE.COM",
        password: "SecurePass123!@#",
        acceptTerms: true,
      };

      const result = RegisterSchema.safeParse(data);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.email).toBe("john@example.com");
      }
    });

    it("should reject short password", () => {
      const data = {
        name: "John Doe",
        email: "john@example.com",
        password: "Short1!",
      };

      const result = RegisterSchema.safeParse(data);
      expect(result.success).toBe(false);
    });

    it("should reject password without lowercase", () => {
      const data = {
        name: "John Doe",
        email: "john@example.com",
        password: "ALLUPPERCASE123!@#",
      };

      const result = RegisterSchema.safeParse(data);
      expect(result.success).toBe(false);
    });

    it("should reject password without uppercase", () => {
      const data = {
        name: "John Doe",
        email: "john@example.com",
        password: "alllowercase123!@#",
      };

      const result = RegisterSchema.safeParse(data);
      expect(result.success).toBe(false);
    });

    it("should reject password without number", () => {
      const data = {
        name: "John Doe",
        email: "john@example.com",
        password: "NoNumbersHere!@#",
      };

      const result = RegisterSchema.safeParse(data);
      expect(result.success).toBe(false);
    });

    it("should reject password without special character", () => {
      const data = {
        name: "John Doe",
        email: "john@example.com",
        password: "NoSpecialChar123",
      };

      const result = RegisterSchema.safeParse(data);
      expect(result.success).toBe(false);
    });

    it("should allow optional organization", () => {
      const data = {
        name: "John Doe",
        email: "john@example.com",
        password: "SecurePass123!@#",
        acceptTerms: true,
      };

      const result = RegisterSchema.safeParse(data);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.organization).toBeUndefined();
      }
    });
  });

  describe("LoginSchema", () => {
    it("should validate valid login data", () => {
      const data = {
        email: "john@example.com",
        password: "anypassword",
      };

      const result = LoginSchema.safeParse(data);
      expect(result.success).toBe(true);
    });

    it("should reject invalid email", () => {
      const data = {
        email: "invalid",
        password: "password",
      };

      const result = LoginSchema.safeParse(data);
      expect(result.success).toBe(false);
    });

    it("should reject empty password", () => {
      const data = {
        email: "john@example.com",
        password: "",
      };

      const result = LoginSchema.safeParse(data);
      expect(result.success).toBe(false);
    });
  });

  describe("PasswordChangeSchema", () => {
    it("should validate valid password change", () => {
      const data = {
        currentPassword: "OldPassword123!",
        newPassword: "NewSecurePass123!@#",
        confirmPassword: "NewSecurePass123!@#",
      };

      const result = PasswordChangeSchema.safeParse(data);
      expect(result.success).toBe(true);
    });

    it("should reject non-matching passwords", () => {
      const data = {
        currentPassword: "OldPassword123!",
        newPassword: "NewSecurePass123!@#",
        confirmPassword: "DifferentPassword123!@#",
      };

      const result = PasswordChangeSchema.safeParse(data);
      expect(result.success).toBe(false);
      if (!result.success) {
        const confirmError = result.error.issues.find((i) =>
          i.path.includes("confirmPassword"),
        );
        expect(confirmError).toBeDefined();
      }
    });

    it("should reject same old and new password", () => {
      const data = {
        currentPassword: "SamePassword123!@#",
        newPassword: "SamePassword123!@#",
        confirmPassword: "SamePassword123!@#",
      };

      const result = PasswordChangeSchema.safeParse(data);
      expect(result.success).toBe(false);
    });
  });

  describe("OperatorTypeEnum", () => {
    it("should accept valid operator types", () => {
      const validTypes = ["SCO", "LO", "LSO", "TCO", "ISOS", "PDP", "CAP"];
      for (const type of validTypes) {
        const result = OperatorTypeEnum.safeParse(type);
        expect(result.success).toBe(true);
      }
    });

    it("should reject invalid operator type", () => {
      const result = OperatorTypeEnum.safeParse("INVALID");
      expect(result.success).toBe(false);
    });
  });

  describe("ArticleStatusEnum", () => {
    it("should accept valid statuses", () => {
      const validStatuses = [
        "not_started",
        "in_progress",
        "under_review",
        "compliant",
        "not_applicable",
      ];
      for (const status of validStatuses) {
        const result = ArticleStatusEnum.safeParse(status);
        expect(result.success).toBe(true);
      }
    });

    it("should reject invalid status", () => {
      const result = ArticleStatusEnum.safeParse("done");
      expect(result.success).toBe(false);
    });
  });

  describe("UpdateArticleStatusSchema", () => {
    it("should validate valid update", () => {
      const data = {
        articleId: "art-123",
        status: "compliant",
        notes: "Compliance verified",
      };

      const result = UpdateArticleStatusSchema.safeParse(data);
      expect(result.success).toBe(true);
    });

    it("should reject invalid article ID format", () => {
      const data = {
        articleId: "invalid<>id",
        status: "compliant",
      };

      const result = UpdateArticleStatusSchema.safeParse(data);
      expect(result.success).toBe(false);
    });

    it("should sanitize notes", () => {
      const data = {
        articleId: "art-123",
        status: "compliant",
        notes: "<script>alert(1)</script>Valid notes",
      };

      const result = UpdateArticleStatusSchema.safeParse(data);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.notes).not.toContain("<script>");
      }
    });

    it("should allow null notes", () => {
      const data = {
        articleId: "art-123",
        status: "in_progress",
        notes: null,
      };

      const result = UpdateArticleStatusSchema.safeParse(data);
      expect(result.success).toBe(true);
    });
  });

  describe("EnvironmentalAssessmentSchema", () => {
    it("should validate valid environmental assessment", () => {
      const data = {
        operatorType: "spacecraft",
        missionType: "commercial",
        spacecraftMassKg: 500,
        spacecraftCount: 1,
        orbitType: "LEO",
        missionDurationYears: 5,
        launchVehicle: "Falcon 9",
        launchSharePercent: 100,
        groundStationCount: 3,
        dailyContactHours: 8,
        deorbitStrategy: "controlled_deorbit",
      };

      const result = EnvironmentalAssessmentSchema.safeParse(data);
      expect(result.success).toBe(true);
    });

    it("should reject invalid orbit type", () => {
      const data = {
        operatorType: "spacecraft",
        missionType: "commercial",
        spacecraftMassKg: 500,
        spacecraftCount: 1,
        orbitType: "INVALID",
        missionDurationYears: 5,
        launchVehicle: "Falcon 9",
        launchSharePercent: 100,
        groundStationCount: 3,
        dailyContactHours: 8,
        deorbitStrategy: "controlled_deorbit",
      };

      const result = EnvironmentalAssessmentSchema.safeParse(data);
      expect(result.success).toBe(false);
    });

    it("should coerce string numbers", () => {
      const data = {
        operatorType: "spacecraft",
        missionType: "commercial",
        spacecraftMassKg: "500",
        spacecraftCount: "1",
        orbitType: "LEO",
        missionDurationYears: "5",
        launchVehicle: "Falcon 9",
        launchSharePercent: "100",
        groundStationCount: "3",
        dailyContactHours: "8",
        deorbitStrategy: "controlled_deorbit",
      };

      const result = EnvironmentalAssessmentSchema.safeParse(data);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(typeof result.data.spacecraftMassKg).toBe("number");
      }
    });

    it("should reject negative mass", () => {
      const data = {
        operatorType: "spacecraft",
        missionType: "commercial",
        spacecraftMassKg: -100,
        spacecraftCount: 1,
        orbitType: "LEO",
        missionDurationYears: 5,
        launchVehicle: "Falcon 9",
        launchSharePercent: 100,
        groundStationCount: 3,
        dailyContactHours: 8,
        deorbitStrategy: "controlled_deorbit",
      };

      const result = EnvironmentalAssessmentSchema.safeParse(data);
      expect(result.success).toBe(false);
    });

    it("should reject launch share over 100%", () => {
      const data = {
        operatorType: "spacecraft",
        missionType: "commercial",
        spacecraftMassKg: 500,
        spacecraftCount: 1,
        orbitType: "LEO",
        missionDurationYears: 5,
        launchVehicle: "Falcon 9",
        launchSharePercent: 150,
        groundStationCount: 3,
        dailyContactHours: 8,
        deorbitStrategy: "controlled_deorbit",
      };

      const result = EnvironmentalAssessmentSchema.safeParse(data);
      expect(result.success).toBe(false);
    });

    it("should validate country code format", () => {
      const data = {
        operatorType: "spacecraft",
        missionType: "commercial",
        spacecraftMassKg: 500,
        spacecraftCount: 1,
        orbitType: "LEO",
        missionDurationYears: 5,
        launchVehicle: "Falcon 9",
        launchSharePercent: 100,
        launchSiteCountry: "US",
        groundStationCount: 3,
        dailyContactHours: 8,
        deorbitStrategy: "controlled_deorbit",
      };

      const result = EnvironmentalAssessmentSchema.safeParse(data);
      expect(result.success).toBe(true);
    });

    it("should reject invalid country code", () => {
      const data = {
        operatorType: "spacecraft",
        missionType: "commercial",
        spacecraftMassKg: 500,
        spacecraftCount: 1,
        orbitType: "LEO",
        missionDurationYears: 5,
        launchVehicle: "Falcon 9",
        launchSharePercent: 100,
        launchSiteCountry: "USA", // Should be 2 letters
        groundStationCount: 3,
        dailyContactHours: 8,
        deorbitStrategy: "controlled_deorbit",
      };

      const result = EnvironmentalAssessmentSchema.safeParse(data);
      expect(result.success).toBe(false);
    });
  });

  describe("CybersecurityAssessmentSchema", () => {
    it("should validate valid cybersecurity assessment", () => {
      const data = {
        organizationSize: "medium",
        spaceSegmentComplexity: "small_constellation",
        dataSensitivityLevel: "confidential",
      };

      const result = CybersecurityAssessmentSchema.safeParse(data);
      expect(result.success).toBe(true);
    });

    it("should apply defaults", () => {
      const data = {
        organizationSize: "small",
        spaceSegmentComplexity: "single_satellite",
        dataSensitivityLevel: "internal",
      };

      const result = CybersecurityAssessmentSchema.safeParse(data);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.hasGroundSegment).toBe(true);
        expect(result.data.processesPersonalData).toBe(false);
        expect(result.data.hasSecurityTeam).toBe(false);
      }
    });

    it("should validate existing certifications array", () => {
      const data = {
        organizationSize: "large",
        spaceSegmentComplexity: "large_constellation",
        dataSensitivityLevel: "restricted",
        existingCertifications: ["ISO27001", "SOC2", "NIST"],
      };

      const result = CybersecurityAssessmentSchema.safeParse(data);
      expect(result.success).toBe(true);
    });

    it("should reject too many certifications", () => {
      const data = {
        organizationSize: "large",
        spaceSegmentComplexity: "large_constellation",
        dataSensitivityLevel: "restricted",
        existingCertifications: new Array(25).fill("CERT"),
      };

      const result = CybersecurityAssessmentSchema.safeParse(data);
      expect(result.success).toBe(false);
    });
  });

  describe("InsuranceAssessmentSchema", () => {
    it("should validate valid insurance assessment", () => {
      const data = {
        primaryJurisdiction: "DE",
        operatorType: "spacecraft",
        companySize: "medium",
        orbitRegime: "LEO",
        satelliteCount: 5,
        missionDurationYears: 7,
      };

      const result = InsuranceAssessmentSchema.safeParse(data);
      expect(result.success).toBe(true);
    });

    it("should coerce dates", () => {
      const data = {
        primaryJurisdiction: "FR",
        operatorType: "launch",
        companySize: "large",
        orbitRegime: "GEO",
        satelliteCount: 1,
        missionDurationYears: 15,
        launchDate: "2025-06-15",
      };

      const result = InsuranceAssessmentSchema.safeParse(data);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.launchDate).toBeInstanceOf(Date);
      }
    });

    it("should reject invalid jurisdiction", () => {
      const data = {
        primaryJurisdiction: "GERMANY",
        operatorType: "spacecraft",
        companySize: "medium",
        orbitRegime: "LEO",
        satelliteCount: 1,
        missionDurationYears: 5,
      };

      const result = InsuranceAssessmentSchema.safeParse(data);
      expect(result.success).toBe(false);
    });
  });

  describe("QueryParamsSchema", () => {
    it("should apply defaults", () => {
      const data = {};

      const result = QueryParamsSchema.safeParse(data);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.page).toBe(1);
        expect(result.data.limit).toBe(20);
        expect(result.data.sortBy).toBe("createdAt");
        expect(result.data.sortOrder).toBe("desc");
      }
    });

    it("should validate custom values", () => {
      const data = {
        page: 5,
        limit: 50,
        sortBy: "name",
        sortOrder: "asc",
        search: "test query",
      };

      const result = QueryParamsSchema.safeParse(data);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.page).toBe(5);
        expect(result.data.limit).toBe(50);
      }
    });

    it("should coerce string numbers", () => {
      const data = {
        page: "3",
        limit: "25",
      };

      const result = QueryParamsSchema.safeParse(data);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.page).toBe(3);
        expect(result.data.limit).toBe(25);
      }
    });

    it("should reject page below 1", () => {
      const data = { page: 0 };

      const result = QueryParamsSchema.safeParse(data);
      expect(result.success).toBe(false);
    });

    it("should reject limit over 100", () => {
      const data = { limit: 500 };

      const result = QueryParamsSchema.safeParse(data);
      expect(result.success).toBe(false);
    });

    it("should sanitize search string", () => {
      const data = {
        search: "<script>alert(1)</script>query",
      };

      const result = QueryParamsSchema.safeParse(data);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.search).not.toContain("<script>");
      }
    });
  });

  describe("validateInput helper", () => {
    it("should return success with valid data", () => {
      const schema = z.object({ name: z.string() });
      const result = validateInput(schema, { name: "Test" });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.name).toBe("Test");
      }
    });

    it("should return errors with invalid data", () => {
      const schema = z.object({ name: z.string().min(5) });
      const result = validateInput(schema, { name: "Hi" });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.errors).toBeDefined();
      }
    });
  });

  describe("formatZodErrors", () => {
    it("should format errors by path", () => {
      const schema = z.object({
        name: z.string().min(5),
        email: z.string().email(),
      });

      const result = schema.safeParse({ name: "Hi", email: "invalid" });

      if (!result.success) {
        const formatted = formatZodErrors(result.error);
        expect(formatted).toHaveProperty("name");
        expect(formatted).toHaveProperty("email");
        expect(Array.isArray(formatted.name)).toBe(true);
        expect(Array.isArray(formatted.email)).toBe(true);
      }
    });

    it("should handle nested paths", () => {
      const schema = z.object({
        user: z.object({
          name: z.string().min(5),
        }),
      });

      const result = schema.safeParse({ user: { name: "Hi" } });

      if (!result.success) {
        const formatted = formatZodErrors(result.error);
        expect(formatted).toHaveProperty("user.name");
      }
    });
  });

  describe("createValidationErrorResponse", () => {
    it("should create a 400 response with errors", async () => {
      const schema = z.object({ name: z.string().min(5) });
      const result = schema.safeParse({ name: "Hi" });

      if (!result.success) {
        const response = createValidationErrorResponse(result.error);
        expect(response.status).toBe(400);

        const body = await response.json();
        expect(body).toHaveProperty("error", "Validation Error");
        expect(body).toHaveProperty("details");
      }
    });

    it("should set correct content type", () => {
      const schema = z.object({ name: z.string().min(5) });
      const result = schema.safeParse({ name: "Hi" });

      if (!result.success) {
        const response = createValidationErrorResponse(result.error);
        expect(response.headers.get("Content-Type")).toBe("application/json");
      }
    });
  });

  describe("parsePaginationLimit", () => {
    it("should return default when raw is null", () => {
      expect(parsePaginationLimit(null)).toBe(50);
    });

    it("should return custom default when raw is null", () => {
      expect(parsePaginationLimit(null, 25)).toBe(25);
    });

    it("should return default for NaN input", () => {
      expect(parsePaginationLimit("abc")).toBe(50);
    });

    it("should return default for value below 1", () => {
      expect(parsePaginationLimit("0")).toBe(50);
      expect(parsePaginationLimit("-5")).toBe(50);
    });

    it("should clamp to maxLimit", () => {
      expect(parsePaginationLimit("200", 50, 100)).toBe(100);
    });

    it("should return parsed value when within range", () => {
      expect(parsePaginationLimit("30", 50, 100)).toBe(30);
    });

    it("should use custom default and maxLimit", () => {
      expect(parsePaginationLimit(null, 10, 50)).toBe(10);
      expect(parsePaginationLimit("999", 10, 50)).toBe(50);
    });
  });

  describe("getSafeErrorMessage", () => {
    const originalEnv = process.env.NODE_ENV;

    beforeEach(() => {
      process.env.NODE_ENV = originalEnv;
    });

    it("should return actual error message in development", () => {
      process.env.NODE_ENV = "development";
      const error = new Error("Something broke");
      expect(getSafeErrorMessage(error)).toBe("Something broke");
    });

    it("should return generic message in production", () => {
      process.env.NODE_ENV = "production";
      const error = new Error("Internal database error");
      expect(getSafeErrorMessage(error)).toBe("An error occurred");
    });

    it("should return generic message for non-Error in development", () => {
      process.env.NODE_ENV = "development";
      expect(getSafeErrorMessage("string error")).toBe("An error occurred");
    });

    it("should return custom generic message in production", () => {
      process.env.NODE_ENV = "production";
      const error = new Error("details");
      expect(getSafeErrorMessage(error, "Custom message")).toBe(
        "Custom message",
      );
    });

    it("should return custom generic message for non-Error in development", () => {
      process.env.NODE_ENV = "development";
      expect(getSafeErrorMessage(42, "Fallback")).toBe("Fallback");
    });
  });

  describe("isUserFacingError", () => {
    it('should return true for "not found" errors', () => {
      expect(isUserFacingError(new Error("Resource not found"))).toBe(true);
    });

    it('should return true for "already exists" errors', () => {
      expect(isUserFacingError(new Error("User already exists"))).toBe(true);
    });

    it('should return true for "invalid" errors', () => {
      expect(isUserFacingError(new Error("Invalid token"))).toBe(true);
    });

    it('should return true for "unauthorized" errors', () => {
      expect(isUserFacingError(new Error("Unauthorized access"))).toBe(true);
    });

    it('should return true for "required" errors', () => {
      expect(isUserFacingError(new Error("Field is required"))).toBe(true);
    });

    it('should return true for "forbidden" errors', () => {
      expect(isUserFacingError(new Error("Forbidden resource"))).toBe(true);
    });

    it('should return true for "expired" errors', () => {
      expect(isUserFacingError(new Error("Token expired"))).toBe(true);
    });

    it("should return false for non-Error input", () => {
      expect(isUserFacingError("not an error")).toBe(false);
      expect(isUserFacingError(null)).toBe(false);
      expect(isUserFacingError(undefined)).toBe(false);
    });

    it("should return false for non-matching errors", () => {
      expect(isUserFacingError(new Error("Internal server error"))).toBe(false);
      expect(isUserFacingError(new Error("Connection timeout"))).toBe(false);
    });
  });

  describe("safeJsonParse", () => {
    it("should parse valid JSON", () => {
      const result = safeJsonParse('{"key": "value"}', {});
      expect(result).toEqual({ key: "value" });
    });

    it("should return fallback for invalid JSON", () => {
      const result = safeJsonParse("not valid json", { fallback: true });
      expect(result).toEqual({ fallback: true });
    });

    it("should return fallback for null input", () => {
      const result = safeJsonParse(null, "default");
      expect(result).toBe("default");
    });

    it("should return fallback for undefined input", () => {
      const result = safeJsonParse(undefined, []);
      expect(result).toEqual([]);
    });

    it("should return fallback for empty string", () => {
      const result = safeJsonParse("", 42);
      expect(result).toBe(42);
    });
  });

  describe("safeJsonParseArray", () => {
    it("should parse valid JSON array", () => {
      const result = safeJsonParseArray("[1, 2, 3]");
      expect(result).toEqual([1, 2, 3]);
    });

    it("should return empty array for null", () => {
      const result = safeJsonParseArray(null);
      expect(result).toEqual([]);
    });

    it("should return empty array for invalid JSON", () => {
      const result = safeJsonParseArray("bad");
      expect(result).toEqual([]);
    });
  });

  describe("safeJsonParseObject", () => {
    it("should parse valid JSON object", () => {
      const result = safeJsonParseObject('{"a": 1}');
      expect(result).toEqual({ a: 1 });
    });

    it("should return empty object for null", () => {
      const result = safeJsonParseObject(null);
      expect(result).toEqual({});
    });

    it("should return empty object for invalid JSON", () => {
      const result = safeJsonParseObject("{bad}");
      expect(result).toEqual({});
    });
  });

  describe("CuidSchema", () => {
    it("should accept valid cuid", () => {
      const result = CuidSchema.safeParse("clh1234567890abcdef");
      expect(result.success).toBe(true);
    });

    it("should reject invalid format (uppercase)", () => {
      const result = CuidSchema.safeParse("CLH1234567890");
      expect(result.success).toBe(false);
    });

    it("should reject empty string", () => {
      const result = CuidSchema.safeParse("");
      expect(result.success).toBe(false);
    });

    it("should reject string not starting with c", () => {
      const result = CuidSchema.safeParse("xlh1234567890abcdef");
      expect(result.success).toBe(false);
    });
  });

  describe("UuidSchema", () => {
    it("should accept valid UUID", () => {
      const result = UuidSchema.safeParse(
        "550e8400-e29b-41d4-a716-446655440000",
      );
      expect(result.success).toBe(true);
    });

    it("should reject invalid UUID", () => {
      const result = UuidSchema.safeParse("not-a-uuid");
      expect(result.success).toBe(false);
    });
  });

  describe("WebhookUrlSchema", () => {
    it("should accept valid HTTPS URL", () => {
      const result = WebhookUrlSchema.safeParse("https://example.com/webhook");
      expect(result.success).toBe(true);
    });

    it("should reject HTTP URL", () => {
      const result = WebhookUrlSchema.safeParse("http://example.com/webhook");
      expect(result.success).toBe(false);
    });

    it("should reject URL exceeding 2048 characters", () => {
      const longUrl = "https://example.com/" + "a".repeat(2048);
      const result = WebhookUrlSchema.safeParse(longUrl);
      expect(result.success).toBe(false);
    });
  });

  describe("CreateWebhookSchema", () => {
    it("should accept valid webhook", () => {
      const result = CreateWebhookSchema.safeParse({
        name: "My Webhook",
        url: "https://example.com/hook",
        events: ["assessment.completed"],
        organizationId: "clh1234567890abcdef",
      });
      expect(result.success).toBe(true);
    });

    it("should reject empty events array", () => {
      const result = CreateWebhookSchema.safeParse({
        name: "My Webhook",
        url: "https://example.com/hook",
        events: [],
        organizationId: "clh1234567890abcdef",
      });
      expect(result.success).toBe(false);
    });
  });

  describe("UpdateWebhookSchema", () => {
    it("should accept partial update with only name", () => {
      const result = UpdateWebhookSchema.safeParse({
        name: "Updated Name",
      });
      expect(result.success).toBe(true);
    });

    it("should accept partial update with only url", () => {
      const result = UpdateWebhookSchema.safeParse({
        url: "https://example.com/new-hook",
      });
      expect(result.success).toBe(true);
    });

    it("should accept partial update with isActive", () => {
      const result = UpdateWebhookSchema.safeParse({
        isActive: false,
      });
      expect(result.success).toBe(true);
    });
  });

  describe("CreateApiKeySchema", () => {
    it("should accept valid key creation", () => {
      const result = CreateApiKeySchema.safeParse({
        name: "My API Key",
        scopes: ["read:assessments", "write:assessments"],
      });
      expect(result.success).toBe(true);
    });

    it("should reject invalid scope format (uppercase)", () => {
      const result = CreateApiKeySchema.safeParse({
        name: "My API Key",
        scopes: ["READ:Assessments"],
      });
      expect(result.success).toBe(false);
    });

    it("should reject empty scopes", () => {
      const result = CreateApiKeySchema.safeParse({
        name: "My API Key",
        scopes: [],
      });
      expect(result.success).toBe(false);
    });
  });

  describe("MarkNotificationsReadSchema", () => {
    it("should accept valid array of notification IDs", () => {
      const result = MarkNotificationsReadSchema.safeParse({
        notificationIds: ["clh1234567890abcdef", "clh0987654321abcdef"],
      });
      expect(result.success).toBe(true);
    });

    it("should reject empty array", () => {
      const result = MarkNotificationsReadSchema.safeParse({
        notificationIds: [],
      });
      expect(result.success).toBe(false);
    });
  });

  describe("DismissNotificationSchema", () => {
    it("should accept valid cuid", () => {
      const result = DismissNotificationSchema.safeParse({
        notificationId: "clh1234567890abcdef",
      });
      expect(result.success).toBe(true);
    });

    it("should reject invalid ID", () => {
      const result = DismissNotificationSchema.safeParse({
        notificationId: "INVALID",
      });
      expect(result.success).toBe(false);
    });
  });

  describe("NotificationSettingsSchema", () => {
    it("should accept valid settings with quiet hours", () => {
      const result = NotificationSettingsSchema.safeParse({
        emailEnabled: true,
        pushEnabled: false,
        quietHoursEnabled: true,
        quietHoursStart: "22:00",
        quietHoursEnd: "07:00",
        quietHoursTimezone: "Europe/Berlin",
      });
      expect(result.success).toBe(true);
    });

    it("should reject invalid time format", () => {
      const result = NotificationSettingsSchema.safeParse({
        quietHoursStart: "25:00",
      });
      expect(result.success).toBe(false);
    });

    it("should accept valid digest settings", () => {
      const result = NotificationSettingsSchema.safeParse({
        digestEnabled: true,
        digestFrequency: "weekly",
      });
      expect(result.success).toBe(true);
    });

    it("should accept categories with email/push flags", () => {
      const result = NotificationSettingsSchema.safeParse({
        categories: {
          compliance: { email: true, push: false },
          billing: { email: false },
        },
      });
      expect(result.success).toBe(true);
    });
  });

  describe("RevokeSessionsSchema", () => {
    it("should accept with sessionIds", () => {
      const result = RevokeSessionsSchema.safeParse({
        sessionIds: ["clh1234567890abcdef"],
      });
      expect(result.success).toBe(true);
    });

    it("should accept with revokeAll", () => {
      const result = RevokeSessionsSchema.safeParse({
        revokeAll: true,
      });
      expect(result.success).toBe(true);
    });

    it("should reject neither sessionIds nor revokeAll", () => {
      const result = RevokeSessionsSchema.safeParse({});
      expect(result.success).toBe(false);
    });

    it("should reject empty sessionIds without revokeAll", () => {
      const result = RevokeSessionsSchema.safeParse({
        sessionIds: [],
      });
      expect(result.success).toBe(false);
    });
  });

  describe("CreateCheckoutSessionSchema", () => {
    it("should accept valid priceId", () => {
      const result = CreateCheckoutSessionSchema.safeParse({
        priceId: "price_1234567890",
      });
      expect(result.success).toBe(true);
    });

    it("should reject wrong priceId format", () => {
      const result = CreateCheckoutSessionSchema.safeParse({
        priceId: "prod_1234567890",
      });
      expect(result.success).toBe(false);
    });

    it("should accept with optional URLs", () => {
      const result = CreateCheckoutSessionSchema.safeParse({
        priceId: "price_1234567890",
        successUrl: "https://example.com/success",
        cancelUrl: "https://example.com/cancel",
      });
      expect(result.success).toBe(true);
    });
  });

  describe("CreatePortalSessionSchema", () => {
    it("should accept with returnUrl", () => {
      const result = CreatePortalSessionSchema.safeParse({
        returnUrl: "https://example.com/dashboard",
      });
      expect(result.success).toBe(true);
    });

    it("should accept without returnUrl", () => {
      const result = CreatePortalSessionSchema.safeParse({});
      expect(result.success).toBe(true);
    });
  });

  describe("AuditReportRequestSchema", () => {
    it("should accept valid request", () => {
      const result = AuditReportRequestSchema.safeParse({
        startDate: "2025-01-01",
        endDate: "2025-12-31",
        format: "csv",
      });
      expect(result.success).toBe(true);
    });

    it("should apply default format as pdf", () => {
      const result = AuditReportRequestSchema.safeParse({
        startDate: "2025-01-01",
        endDate: "2025-12-31",
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.format).toBe("pdf");
      }
    });

    it("should accept optional entityType and actions", () => {
      const result = AuditReportRequestSchema.safeParse({
        startDate: "2025-01-01",
        endDate: "2025-12-31",
        entityType: "user",
        actions: ["create", "update"],
      });
      expect(result.success).toBe(true);
    });
  });

  describe("ComplianceCertificateSchema", () => {
    it("should accept with assessmentId", () => {
      const result = ComplianceCertificateSchema.safeParse({
        assessmentId: "clh1234567890abcdef",
      });
      expect(result.success).toBe(true);
    });

    it("should accept without assessmentId", () => {
      const result = ComplianceCertificateSchema.safeParse({});
      expect(result.success).toBe(true);
    });

    it("should default includeDetails to false", () => {
      const result = ComplianceCertificateSchema.safeParse({});
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.includeDetails).toBe(false);
      }
    });
  });

  describe("UpdateWorkflowStatusSchema", () => {
    it("should accept valid status", () => {
      const result = UpdateWorkflowStatusSchema.safeParse({
        status: "UNDER_REVIEW",
      });
      expect(result.success).toBe(true);
    });

    it("should sanitize notes", () => {
      const result = UpdateWorkflowStatusSchema.safeParse({
        status: "APPROVED",
        notes: "<script>alert(1)</script>Clean notes",
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.notes).not.toContain("<script>");
        expect(result.data.notes).toContain("Clean notes");
      }
    });

    it("should reject invalid status", () => {
      const result = UpdateWorkflowStatusSchema.safeParse({
        status: "INVALID_STATUS",
      });
      expect(result.success).toBe(false);
    });

    it("should accept all valid status values", () => {
      const validStatuses = [
        "DRAFT",
        "PENDING_DOCUMENTS",
        "UNDER_REVIEW",
        "PENDING_AUTHORITY",
        "APPROVED",
        "REJECTED",
        "WITHDRAWN",
      ];
      for (const status of validStatuses) {
        const result = UpdateWorkflowStatusSchema.safeParse({ status });
        expect(result.success).toBe(true);
      }
    });
  });

  describe("WorkflowDocumentSchema", () => {
    it("should accept valid document", () => {
      const result = WorkflowDocumentSchema.safeParse({
        documentType: "compliance_report",
        fileName: "report.pdf",
        mimeType: "application/pdf",
        fileSize: 1024,
      });
      expect(result.success).toBe(true);
    });

    it("should reject file too large (over 100MB)", () => {
      const result = WorkflowDocumentSchema.safeParse({
        documentType: "compliance_report",
        fileName: "report.pdf",
        mimeType: "application/pdf",
        fileSize: 200 * 1024 * 1024,
      });
      expect(result.success).toBe(false);
    });

    it("should reject fileSize of 0", () => {
      const result = WorkflowDocumentSchema.safeParse({
        documentType: "compliance_report",
        fileName: "report.pdf",
        mimeType: "application/pdf",
        fileSize: 0,
      });
      expect(result.success).toBe(false);
    });
  });

  describe("sanitizeHtml HTML entity decoding", () => {
    it("should decode &lt; and &gt;", () => {
      const result = sanitizeHtml("&lt;p&gt;");
      // After decoding &lt; -> <, &gt; -> >, the second regex pass removes <p>
      expect(result).not.toContain("&lt;");
      expect(result).not.toContain("&gt;");
    });

    it("should decode &amp;", () => {
      const result = sanitizeHtml("foo &amp; bar");
      expect(result).toBe("foo & bar");
    });

    it("should decode &quot;", () => {
      const result = sanitizeHtml("say &quot;hello&quot;");
      expect(result).toBe('say "hello"');
    });

    it("should decode &#39;", () => {
      const result = sanitizeHtml("it&#39;s fine");
      expect(result).toBe("it's fine");
    });

    it("should decode &nbsp;", () => {
      const result = sanitizeHtml("word&nbsp;word");
      expect(result).toBe("word word");
    });

    it("should decode entities within HTML tags and remove resulting tags", () => {
      const result = sanitizeHtml("&lt;script&gt;alert(1)&lt;/script&gt;");
      expect(result).not.toContain("<script>");
      expect(result).not.toContain("</script>");
    });
  });
});

import { describe, it, expect } from "vitest";
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
} from "@/lib/validations";
import { z } from "zod";

describe("Validation Schemas", () => {
  describe("Sanitization Helpers", () => {
    describe("sanitizeHtml", () => {
      it("should strip HTML tags", () => {
        const input = '<script>alert("xss")</script>Hello';
        const result = sanitizeHtml(input);
        expect(result).toBe("Hello");
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
        const input = "Text with & and < and > symbols";
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
});

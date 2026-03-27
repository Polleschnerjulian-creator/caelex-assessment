import { describe, it, expect } from "vitest";
import { z } from "zod";
import {
  createSuccessResponse,
  createErrorResponse,
  createValidationError,
  createEngineErrorResponse,
  ErrorCode,
} from "./api-response";

describe("createSuccessResponse", () => {
  it("wraps data in { data: ... } envelope", async () => {
    const response = createSuccessResponse({ result: { score: 85 } });
    const body = await response.json();
    expect(body).toEqual({ data: { result: { score: 85 } } });
    expect(response.status).toBe(200);
  });
  it("supports custom status codes", async () => {
    const response = createSuccessResponse({ id: "123" }, 201);
    expect(response.status).toBe(201);
  });
});

describe("createErrorResponse", () => {
  it("returns error envelope with code", async () => {
    const response = createErrorResponse("Not found", ErrorCode.NOT_FOUND, 404);
    const body = await response.json();
    expect(body).toEqual({ error: "Not found", code: "NOT_FOUND" });
    expect(response.status).toBe(404);
  });
  it("includes details when provided", async () => {
    const response = createErrorResponse(
      "Invalid",
      ErrorCode.VALIDATION_ERROR,
      400,
      { field: "entitySize" },
    );
    const body = await response.json();
    expect(body.details).toEqual({ field: "entitySize" });
  });
  it("defaults to 500 status", async () => {
    const response = createErrorResponse("fail", ErrorCode.ENGINE_ERROR);
    expect(response.status).toBe(500);
  });
});

describe("createValidationError", () => {
  it("formats Zod errors into response", async () => {
    const schema = z.object({ name: z.string() });
    const result = schema.safeParse({ name: 123 });
    if (result.success) throw new Error("Should fail");
    const response = createValidationError(result.error);
    const body = await response.json();
    expect(body.error).toBe("Validation failed");
    expect(body.code).toBe("VALIDATION_ERROR");
    expect(body.details).toBeDefined();
    expect(response.status).toBe(400);
  });
});

describe("createEngineErrorResponse", () => {
  it("returns 503 for EngineDataError", async () => {
    const error = new Error("data load failed");
    error.name = "EngineDataError";
    const response = createEngineErrorResponse(error);
    expect(response.status).toBe(503);
    const body = await response.json();
    expect(body.code).toBe("ENGINE_DATA_UNAVAILABLE");
  });
  it("returns 500 for generic errors", async () => {
    const response = createEngineErrorResponse(new Error("something broke"));
    expect(response.status).toBe(500);
    const body = await response.json();
    expect(body.code).toBe("ENGINE_ERROR");
  });
});

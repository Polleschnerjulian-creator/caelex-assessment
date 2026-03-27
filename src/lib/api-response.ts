import { NextResponse } from "next/server";
import { z } from "zod";
import { getSafeErrorMessage } from "./validations";

export enum ErrorCode {
  VALIDATION_ERROR = "VALIDATION_ERROR",
  UNAUTHORIZED = "UNAUTHORIZED",
  FORBIDDEN = "FORBIDDEN",
  NOT_FOUND = "NOT_FOUND",
  RATE_LIMITED = "RATE_LIMITED",
  ENGINE_ERROR = "ENGINE_ERROR",
  ENGINE_DATA_UNAVAILABLE = "ENGINE_DATA_UNAVAILABLE",
  CONFLICT = "CONFLICT",
}

export function createSuccessResponse<T>(data: T, status = 200): NextResponse {
  return NextResponse.json({ data }, { status });
}

export function createErrorResponse(
  message: string,
  code: ErrorCode,
  status = 500,
  details?: Record<string, unknown>,
): NextResponse {
  const body: {
    error: string;
    code: string;
    details?: Record<string, unknown>;
  } = {
    error: message,
    code,
  };
  if (details) body.details = details;
  return NextResponse.json(body, { status });
}

export function createValidationError(zodError: z.ZodError): NextResponse {
  return createErrorResponse(
    "Validation failed",
    ErrorCode.VALIDATION_ERROR,
    400,
    zodError.flatten().fieldErrors as Record<string, unknown>,
  );
}

export function createEngineErrorResponse(error: unknown): NextResponse {
  const message = getSafeErrorMessage(error, "Assessment calculation failed");
  if (error instanceof Error && error.name === "EngineDataError") {
    return createErrorResponse(message, ErrorCode.ENGINE_DATA_UNAVAILABLE, 503);
  }
  return createErrorResponse(message, ErrorCode.ENGINE_ERROR, 500);
}

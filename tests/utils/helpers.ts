import { render, RenderOptions, RenderResult } from "@testing-library/react";
import React, { ReactElement, ReactNode } from "react";
import userEvent from "@testing-library/user-event";

// Type for custom render options
interface CustomRenderOptions extends Omit<RenderOptions, "wrapper"> {
  initialRoute?: string;
  // Add more options as needed (e.g., initial state, providers)
}

/**
 * Custom render function that wraps components with necessary providers
 */
export function customRender(
  ui: ReactElement,
  options?: CustomRenderOptions,
): RenderResult & { user: ReturnType<typeof userEvent.setup> } {
  const { ...renderOptions } = options || {};

  // Setup userEvent
  const user = userEvent.setup();

  // Wrapper with providers (add more as needed)
  function Wrapper({ children }: { children: ReactNode }) {
    return React.createElement(React.Fragment, null, children);
  }

  return {
    user,
    ...render(ui, { wrapper: Wrapper, ...renderOptions }),
  };
}

/**
 * Wait for a condition to be true
 */
export async function waitFor(
  condition: () => boolean | Promise<boolean>,
  options?: { timeout?: number; interval?: number },
): Promise<void> {
  const { timeout = 5000, interval = 50 } = options || {};
  const startTime = Date.now();

  while (Date.now() - startTime < timeout) {
    if (await condition()) {
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, interval));
  }

  throw new Error(`Condition not met within ${timeout}ms`);
}

/**
 * Create a mock Request object for API testing
 */
export function createMockRequest(
  url: string,
  options?: {
    method?: string;
    body?: unknown;
    headers?: Record<string, string>;
    searchParams?: Record<string, string>;
  },
): Request {
  const { method = "GET", body, headers = {}, searchParams } = options || {};

  let fullUrl = url;
  if (searchParams) {
    const params = new URLSearchParams(searchParams);
    fullUrl = `${url}?${params.toString()}`;
  }

  const requestInit: RequestInit = {
    method,
    headers: {
      "Content-Type": "application/json",
      ...headers,
    },
  };

  if (body && method !== "GET") {
    requestInit.body = JSON.stringify(body);
  }

  return new Request(fullUrl, requestInit);
}

/**
 * Create a mock FormData request for file uploads
 */
export function createMockFormDataRequest(
  url: string,
  formData: FormData,
  options?: {
    method?: string;
    headers?: Record<string, string>;
  },
): Request {
  const { method = "POST", headers = {} } = options || {};

  return new Request(url, {
    method,
    body: formData,
    headers,
  });
}

/**
 * Parse JSON response from a NextResponse
 */
export async function parseJsonResponse<T = unknown>(
  response: Response,
): Promise<T> {
  const text = await response.text();
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new Error(`Failed to parse JSON response: ${text}`);
  }
}

/**
 * Mock session for authenticated API tests
 */
export function createMockSession(
  overrides?: Partial<MockSession>,
): MockSession {
  return {
    user: {
      id: "test-user-id",
      email: "test@example.com",
      name: "Test User",
      role: "USER",
    },
    expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    ...overrides,
  };
}

export interface MockSession {
  user: {
    id: string;
    email: string;
    name: string;
    role: string;
  };
  expires: string;
}

/**
 * Wait for async operations to settle
 */
export async function flushPromises(): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, 0));
}

/**
 * Generate a unique test ID
 */
export function generateTestId(prefix = "test"): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Deep clone an object (useful for test isolation)
 */
export function deepClone<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj));
}

/**
 * Assert that an API response has the expected status
 */
export function assertStatus(response: Response, expectedStatus: number): void {
  if (response.status !== expectedStatus) {
    throw new Error(
      `Expected status ${expectedStatus}, got ${response.status}`,
    );
  }
}

/**
 * Assert that an API response is successful (2xx)
 */
export function assertSuccess(response: Response): void {
  if (!response.ok) {
    throw new Error(
      `Expected successful response, got status ${response.status}`,
    );
  }
}

/**
 * Create a delay for testing async behavior
 */
export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Mock console methods for testing
 */
export function mockConsole() {
  const originalConsole = { ...console };
  const mocks = {
    log: vi.spyOn(console, "log").mockImplementation(() => {}),
    error: vi.spyOn(console, "error").mockImplementation(() => {}),
    warn: vi.spyOn(console, "warn").mockImplementation(() => {}),
    info: vi.spyOn(console, "info").mockImplementation(() => {}),
  };

  return {
    mocks,
    restore: () => {
      Object.assign(console, originalConsole);
    },
  };
}

/**
 * Create mock params for Next.js dynamic routes
 */
export function createMockParams(
  params: Record<string, string>,
): Promise<Record<string, string>> {
  return Promise.resolve(params);
}

/**
 * Format date for comparison in tests
 */
export function formatTestDate(date: Date): string {
  return date.toISOString().split("T")[0];
}

/**
 * Check if two dates are the same day
 */
export function isSameDay(date1: Date, date2: Date): boolean {
  return formatTestDate(date1) === formatTestDate(date2);
}

/**
 * Create a mock file for upload tests
 */
export function createMockFile(
  name: string = "test.pdf",
  type: string = "application/pdf",
  size: number = 1024,
): File {
  const content = new Array(size).fill("a").join("");
  const blob = new Blob([content], { type });
  return new File([blob], name, { type });
}

// Re-export testing utilities
export { userEvent };
export * from "@testing-library/react";

// Import vi for mockConsole
import { vi } from "vitest";

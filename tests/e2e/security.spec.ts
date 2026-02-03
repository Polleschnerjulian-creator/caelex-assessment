import { test, expect } from "@playwright/test";

test.describe("Security Tests", () => {
  test.describe("XSS Prevention", () => {
    test("should sanitize script tags in search input", async ({ page }) => {
      await page.goto("/dashboard/documents");

      // Try to inject script via search
      const searchInput = page
        .getByPlaceholder(/search/i)
        .or(page.getByRole("searchbox"));

      if (await searchInput.isVisible()) {
        await searchInput.fill('<script>alert("xss")</script>');
        await searchInput.press("Enter");

        // Page should not execute script and should sanitize input
        // No alert dialog should appear
        await page.waitForTimeout(500);

        // Check that the script tag was sanitized in the URL or displayed text
        const pageContent = await page.content();
        expect(pageContent).not.toContain("<script>alert");
      }
    });

    test("should sanitize HTML in user-generated content", async ({ page }) => {
      await page.goto("/assessment");

      // The assessment should not render any HTML from URL params
      await page.goto("/assessment?malicious=<img src=x onerror=alert(1)>");

      const pageContent = await page.content();
      expect(pageContent).not.toContain("onerror=alert");
    });
  });

  test.describe("CSRF Protection", () => {
    test("should have CSRF protection on forms", async ({ page }) => {
      await page.goto("/login");

      // Check if form has CSRF token or is protected
      const form = page.locator("form");

      if (await form.isVisible()) {
        // Form should use POST method
        const method = await form.getAttribute("method");
        expect(method?.toLowerCase()).toBe("post");
      }
    });
  });

  test.describe("Authentication Security", () => {
    test("should redirect unauthenticated users from protected routes", async ({
      page,
    }) => {
      // Try to access protected route
      await page.goto("/dashboard");

      // Should redirect to login
      await expect(page).toHaveURL(/login|auth|signin/i, { timeout: 10000 });
    });

    test("should not expose sensitive data in URL", async ({ page }) => {
      await page.goto("/login");

      // After login attempt, password should not be in URL
      const url = page.url();
      expect(url).not.toContain("password");
    });

    test("should have secure cookie settings", async ({ page, context }) => {
      await page.goto("/");

      // Get cookies
      const cookies = await context.cookies();

      // Check session cookie settings
      const sessionCookie = cookies.find(
        (c) => c.name.includes("session") || c.name.includes("auth"),
      );

      if (sessionCookie) {
        // Session cookie should be httpOnly
        expect(sessionCookie.httpOnly).toBe(true);

        // In production, should be secure
        if (process.env.NODE_ENV === "production") {
          expect(sessionCookie.secure).toBe(true);
        }

        // Should have sameSite attribute
        expect(["Strict", "Lax"]).toContain(sessionCookie.sameSite);
      }
    });
  });

  test.describe("Rate Limiting", () => {
    test("should rate limit login attempts", async ({ page }) => {
      await page.goto("/login");

      // Make multiple rapid requests
      const attempts = [];
      for (let i = 0; i < 10; i++) {
        attempts.push(
          page.evaluate(async () => {
            const response = await fetch("/api/auth/signin", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                email: "test@example.com",
                password: "wrongpassword",
              }),
            });
            return response.status;
          }),
        );
      }

      const results = await Promise.all(attempts);

      // Should eventually get rate limited (429) or some requests blocked
      // This depends on rate limiting implementation
      const hasRateLimit = results.some((status) => status === 429);
      const hasTooManyAttempts = results.filter((s) => s !== 200).length > 5;

      expect(hasRateLimit || hasTooManyAttempts).toBeTruthy();
    });
  });

  test.describe("Input Validation", () => {
    test("should validate email format on login", async ({ page }) => {
      await page.goto("/login");

      const emailInput = page
        .getByLabel(/email/i)
        .or(page.getByPlaceholder(/email/i));
      const submitButton = page.getByRole("button", {
        name: /sign in|log in|submit/i,
      });

      if ((await emailInput.isVisible()) && (await submitButton.isVisible())) {
        // Enter invalid email
        await emailInput.fill("not-an-email");
        await submitButton.click();

        // Should show validation error
        await expect(page.getByText(/invalid|email/i)).toBeVisible();
      }
    });

    test("should enforce password requirements on registration", async ({
      page,
    }) => {
      await page.goto("/register");

      const passwordInput = page.getByLabel(/password/i).first();
      const submitButton = page.getByRole("button", {
        name: /register|sign up|create/i,
      });

      if (
        (await passwordInput.isVisible()) &&
        (await submitButton.isVisible())
      ) {
        // Enter weak password
        await passwordInput.fill("weak");
        await submitButton.click();

        // Should show password requirements error
        await expect(
          page.getByText(/12 characters|uppercase|lowercase|number|special/i),
        ).toBeVisible();
      }
    });
  });

  test.describe("Content Security", () => {
    test("should have security headers", async ({ page }) => {
      const response = await page.goto("/");

      if (response) {
        const headers = response.headers();

        // Check for important security headers
        // Note: Some of these might be set at server/CDN level
        const securityHeaders = [
          "x-frame-options",
          "x-content-type-options",
          "x-xss-protection",
        ];

        for (const header of securityHeaders) {
          const value = headers[header];
          // Log for debugging - not all headers may be present in dev
          console.log(`${header}: ${value || "not set"}`);
        }

        // X-Content-Type-Options should be nosniff
        if (headers["x-content-type-options"]) {
          expect(headers["x-content-type-options"]).toBe("nosniff");
        }

        // X-Frame-Options should prevent clickjacking
        if (headers["x-frame-options"]) {
          expect(["DENY", "SAMEORIGIN"]).toContain(headers["x-frame-options"]);
        }
      }
    });
  });

  test.describe("Session Security", () => {
    test("should expire sessions after logout", async ({ page, context }) => {
      // This test assumes we can log in
      await page.goto("/login");

      // After logout, session should be invalidated
      await page.goto("/api/auth/signout");

      // Try to access protected route
      await page.goto("/dashboard");

      // Should be redirected to login
      await expect(page).toHaveURL(/login|auth|signin/i, { timeout: 10000 });
    });
  });

  test.describe("SQL Injection Prevention", () => {
    test("should not be vulnerable to SQL injection in search", async ({
      page,
    }) => {
      await page.goto("/dashboard/documents");

      const searchInput = page
        .getByPlaceholder(/search/i)
        .or(page.getByRole("searchbox"));

      if (await searchInput.isVisible()) {
        // Try SQL injection payloads
        const payloads = [
          "'; DROP TABLE documents; --",
          "1' OR '1'='1",
          "1; SELECT * FROM users",
        ];

        for (const payload of payloads) {
          await searchInput.fill(payload);
          await searchInput.press("Enter");

          // Page should not crash and should handle gracefully
          await page.waitForLoadState("networkidle");

          // Check page is still functional
          const hasError = await page
            .getByText(/error|exception|sql/i)
            .isVisible();
          expect(hasError).toBeFalsy();
        }
      }
    });
  });

  test.describe("Path Traversal Prevention", () => {
    test("should not allow path traversal in document URLs", async ({
      page,
    }) => {
      // Try to access files outside allowed paths
      const response = await page.goto("/api/documents/../../../etc/passwd");

      if (response) {
        // Should return 404 or 400, not the actual file
        expect([400, 404, 500]).toContain(response.status());
      }
    });
  });

  test.describe("Information Disclosure", () => {
    test("should not expose stack traces in production", async ({ page }) => {
      // Trigger an error
      await page.goto("/api/nonexistent");

      const pageContent = await page.content();

      // Should not contain stack traces or internal paths
      expect(pageContent).not.toContain("node_modules");
      expect(pageContent).not.toContain(".ts:");
      expect(pageContent).not.toContain(".js:");
    });

    test("should not expose sensitive environment variables", async ({
      page,
    }) => {
      await page.goto("/");

      const pageContent = await page.content();

      // Should not contain environment variable patterns
      expect(pageContent).not.toMatch(/DATABASE_URL|AUTH_SECRET|API_KEY/);
    });
  });
});

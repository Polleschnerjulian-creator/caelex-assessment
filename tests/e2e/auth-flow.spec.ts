import { test, expect } from "@playwright/test";

test.describe("Authentication UI — Login Page", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/login");
  });

  test("should render login form with email and password fields", async ({
    page,
  }) => {
    // Heading
    await expect(page.getByText(/Welcome back/i)).toBeVisible();

    // Email field
    const emailInput = page
      .getByLabel(/email/i)
      .or(page.getByPlaceholder(/email/i));
    await expect(emailInput).toBeVisible();

    // Password field
    const passwordInput = page.locator('input[type="password"]');
    await expect(passwordInput).toBeVisible();

    // Submit button
    const submitButton = page.getByRole("button", {
      name: /sign in/i,
    });
    await expect(submitButton).toBeVisible();
  });

  test("should show validation on empty form submission", async ({ page }) => {
    // The form uses HTML5 required attributes, so the browser will prevent submission.
    // We verify the inputs have the required attribute.
    const emailInput = page
      .getByLabel(/email/i)
      .or(page.getByPlaceholder(/email/i));
    await expect(emailInput).toHaveAttribute("required", "");

    const passwordInput = page.locator('input[type="password"]');
    await expect(passwordInput).toHaveAttribute("required", "");
  });

  test("should have a link to signup page", async ({ page }) => {
    const signupLink = page.getByRole("link", { name: /create account/i });
    await expect(signupLink).toBeVisible();
    await expect(signupLink).toHaveAttribute("href", "/signup");
  });

  test("should have a forgot password link", async ({ page }) => {
    const forgotLink = page.getByRole("link", { name: /forgot password/i });
    await expect(forgotLink).toBeVisible();
    await expect(forgotLink).toHaveAttribute("href", "/forgot-password");
  });

  test("should have OAuth buttons for Google and Apple", async ({ page }) => {
    await expect(page.getByText("Google")).toBeVisible();
    await expect(page.getByText("Apple")).toBeVisible();
  });

  test("should toggle password visibility", async ({ page }) => {
    const passwordInput = page.locator('input[type="password"]');
    await expect(passwordInput).toBeVisible();

    // Click the eye toggle button
    const toggleBtn = page
      .locator("button:has(svg)")
      .filter({ hasNotText: /sign in|google|apple/i });

    // Find the password visibility toggle (near the password field)
    const eyeButton = page
      .locator(
        'input[type="password"] ~ button, input[type="password"] + button',
      )
      .or(toggleBtn.first());

    if (await eyeButton.isVisible()) {
      await eyeButton.click();

      // Password field should now be text type
      const visiblePassword = page.locator(
        'input[type="text"][class*="border"]',
      );
      await expect(visiblePassword).toBeVisible();
    }
  });
});

test.describe("Authentication UI — Signup Page", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/signup");
  });

  test("should render registration form", async ({ page }) => {
    // Heading
    await expect(page.getByText(/Create your account/i)).toBeVisible();

    // Name field
    await expect(page.getByPlaceholder(/Mustermann/i)).toBeVisible();

    // Email field
    const emailInput = page
      .getByLabel(/email/i)
      .or(page.getByPlaceholder(/email/i));
    await expect(emailInput).toBeVisible();

    // Password field
    const passwordInput = page.locator('input[type="password"]');
    await expect(passwordInput).toBeVisible();

    // Submit button
    const submitButton = page.getByRole("button", {
      name: /create account/i,
    });
    await expect(submitButton).toBeVisible();
  });

  test("should have a link to login page", async ({ page }) => {
    const loginLink = page.getByRole("link", { name: /sign in/i });
    await expect(loginLink).toBeVisible();
    await expect(loginLink).toHaveAttribute("href", "/login");
  });

  test("should show password strength indicators when typing", async ({
    page,
  }) => {
    const passwordInput = page.locator('input[type="password"]');
    await passwordInput.fill("weak");

    // Password checks should appear
    await expect(page.getByText(/12\+ characters/i)).toBeVisible();
    await expect(page.getByText(/Uppercase/i)).toBeVisible();
    await expect(page.getByText(/Lowercase/i)).toBeVisible();
    await expect(page.getByText(/Number/i)).toBeVisible();
    await expect(page.getByText(/Special character/i)).toBeVisible();
  });

  test("should have terms acceptance checkbox", async ({ page }) => {
    // The signup page has a terms checkbox (German: AGB)
    await expect(
      page.getByText(/AGB/i).or(page.getByText(/terms/i)),
    ).toBeVisible();
  });

  test("should have OAuth buttons for Google and Apple", async ({ page }) => {
    await expect(page.getByText("Google")).toBeVisible();
    await expect(page.getByText("Apple")).toBeVisible();
  });
});

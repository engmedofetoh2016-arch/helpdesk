import { test, expect } from "@playwright/test";
import {
  TEST_USERS,
  login,
  loginAsAdmin,
  logout,
  expectLoginPage,
  expectHomePage,
} from "../fixtures/auth";

test.describe("Authentication", () => {
  test.describe("Login Page", () => {
    test.beforeEach(async ({ page }) => {
      await page.goto("/login");
    });

    test("should display login form with all elements", async ({ page }) => {
      // Check page title and description
      await expect(page.getByText("Welcome back")).toBeVisible();
      await expect(page.getByText(/sign in to your helpdesk account/i)).toBeVisible();

      // Check form fields
      await expect(page.getByLabel("Email")).toBeVisible();
      await expect(page.getByLabel("Password")).toBeVisible();

      // Check submit button
      await expect(
        page.getByRole("button", { name: /sign in/i })
      ).toBeVisible();
    });

    test("should login successfully with valid admin credentials", async ({
      page,
    }) => {
      await login(page, TEST_USERS.admin);

      // Should redirect to home page
      await expectHomePage(page);

      // Should display user name in navigation
      await expect(page.getByText(TEST_USERS.admin.name)).toBeVisible();
    });

    test("should show error with invalid email format", async ({ page }) => {
      await page.getByLabel("Email").fill("invalid-email");
      await page.getByLabel("Password").fill("password123");
      await page.getByRole("button", { name: /sign in/i }).click();

      // Should show client-side validation error
      await expect(
        page.getByText(/please enter a valid email/i)
      ).toBeVisible();

      // Should remain on login page
      await expectLoginPage(page);
    });

    test("should show error with empty email", async ({ page }) => {
      await page.getByLabel("Password").fill("password123");
      await page.getByRole("button", { name: /sign in/i }).click();

      // Should show client-side validation error
      await expect(
        page.getByText(/please enter a valid email/i)
      ).toBeVisible();

      // Should remain on login page
      await expectLoginPage(page);
    });

    test("should show error with empty password", async ({ page }) => {
      await page.getByLabel("Email").fill(TEST_USERS.admin.email);
      await page.getByRole("button", { name: /sign in/i }).click();

      // Should show client-side validation error
      await expect(page.getByText(/password is required/i)).toBeVisible();

      // Should remain on login page
      await expectLoginPage(page);
    });

    test("should show error with empty email and password", async ({
      page,
    }) => {
      await page.getByRole("button", { name: /sign in/i }).click();

      // Should show both validation errors
      await expect(
        page.getByText(/please enter a valid email/i)
      ).toBeVisible();
      await expect(page.getByText(/password is required/i)).toBeVisible();

      // Should remain on login page
      await expectLoginPage(page);
    });

    test("should show error with invalid email (non-existent user)", async ({
      page,
    }) => {
      await login(page, {
        email: "nonexistent@example.com",
        password: "password123",
      });

      // Should show server error message
      await expect(page.getByRole("alert")).toBeVisible();
      await expect(page.getByRole("alert")).toContainText(
        /invalid email or password/i
      );

      // Should remain on login page
      await expectLoginPage(page);
    });

    test("should show error with incorrect password", async ({ page }) => {
      await login(page, {
        email: TEST_USERS.admin.email,
        password: "wrongpassword",
      });

      // Should show server error message
      await expect(page.getByRole("alert")).toBeVisible();
      await expect(page.getByRole("alert")).toContainText(
        /invalid email or password/i
      );

      // Should remain on login page
      await expectLoginPage(page);
    });

    test("should show loading state during login", async ({ page }) => {
      // Delay the auth response so we can observe the loading state
      let resolveDelay!: () => void;
      const delay = new Promise<void>((resolve) => {
        resolveDelay = resolve;
      });

      await page.route("**/api/auth/sign-in/email", async (route) => {
        await delay;
        await route.continue();
      });

      await page.getByLabel("Email").fill(TEST_USERS.admin.email);
      await page.getByLabel("Password").fill(TEST_USERS.admin.password);
      await page.getByRole("button", { name: /sign in/i }).click();

      // Check loading state appears (button disabled with loading text)
      await expect(page.getByText(/signing in.../i)).toBeVisible();

      // Allow the request to complete
      resolveDelay();
      await page.unrouteAll({ behavior: "ignoreErrors" });
    });

    test("should redirect to home if already authenticated", async ({
      page,
    }) => {
      // Login first
      await loginAsAdmin(page);

      // Try to visit login page again
      await page.goto("/login");

      // Should redirect to home page
      await expectHomePage(page);
    });

    test("should clear server error on new submission", async ({ page }) => {
      // First submission with wrong password
      await login(page, {
        email: TEST_USERS.admin.email,
        password: "wrongpassword",
      });

      // Error should be visible
      await expect(page.getByRole("alert")).toBeVisible();

      // Try again with correct password
      await page.getByLabel("Email").clear();
      await page.getByLabel("Password").clear();
      await login(page, TEST_USERS.admin);

      // Should redirect to home (error cleared)
      await expectHomePage(page);
    });
  });

  test.describe("Session Persistence", () => {
    test("should maintain session after page reload", async ({ page }) => {
      // Login
      await loginAsAdmin(page);

      // Reload the page
      await page.reload();

      // Should still be authenticated and on home page
      await expectHomePage(page);
      await expect(page.getByText(TEST_USERS.admin.name)).toBeVisible();
    });

    test("should maintain session when navigating directly to protected route", async ({
      page,
    }) => {
      // Login
      await loginAsAdmin(page);

      // Navigate to another protected route
      await page.goto("/users");

      // Should be able to access it
      await expect(page).toHaveURL("/users");
      await expect(
        page.getByRole("heading", { name: /users/i })
      ).toBeVisible();
    });

    test("should maintain session across multiple page navigations", async ({
      page,
    }) => {
      // Login
      await loginAsAdmin(page);

      // Navigate to different routes
      await page.goto("/users");
      await expect(page).toHaveURL("/users");

      await page.goto("/");
      await expectHomePage(page);

      // Should still show user in nav
      await expect(page.getByText(TEST_USERS.admin.name)).toBeVisible();
    });
  });

  test.describe("Logout", () => {
    test.beforeEach(async ({ page }) => {
      await loginAsAdmin(page);
    });

    test("should logout successfully", async ({ page }) => {
      await logout(page);

      // Should redirect to login page
      await expectLoginPage(page);
    });

    test("should not be able to access protected routes after logout", async ({
      page,
    }) => {
      await logout(page);

      // Try to access home page
      await page.goto("/");

      // Should redirect to login
      await expectLoginPage(page);
    });

    test("should not be able to access admin routes after logout", async ({
      page,
    }) => {
      await logout(page);

      // Try to access admin page
      await page.goto("/users");

      // Should redirect to login
      await expectLoginPage(page);
    });

    test("should require login again after logout", async ({ page }) => {
      await logout(page);

      // Try to access home page
      await page.goto("/");

      // Should be on login page
      await expectLoginPage(page);

      // Login again
      await loginAsAdmin(page);

      // Should be able to access home page
      await expectHomePage(page);
    });
  });

  test.describe("Protected Routes", () => {
    test("should redirect unauthenticated user to login when accessing root", async ({
      page,
    }) => {
      await page.goto("/");
      await expectLoginPage(page);
    });

    test("should redirect unauthenticated user to login when accessing admin route", async ({
      page,
    }) => {
      await page.goto("/users");
      await expectLoginPage(page);
    });

    test("should redirect unauthenticated user from home to login", async ({
      page,
    }) => {
      await page.goto("/");

      // Should redirect to login
      await expectLoginPage(page);
    });

    test("should allow access to protected route after login", async ({
      page,
    }) => {
      // Try to access protected route first
      await page.goto("/");
      await expectLoginPage(page);

      // Login
      await loginAsAdmin(page);

      // Should now be on home page
      await expectHomePage(page);
    });
  });

  test.describe("Admin Route Protection", () => {
    test("should allow admin to access admin routes", async ({ page }) => {
      await loginAsAdmin(page);

      // Navigate to admin route
      await page.goto("/users");

      // Should be able to access it
      await expect(page).toHaveURL("/users");
      await expect(
        page.getByRole("heading", { name: /users/i })
      ).toBeVisible();
    });

    test("should show 'Users' link in navigation for admin", async ({
      page,
    }) => {
      await loginAsAdmin(page);

      // Users link should be visible in navigation
      await expect(page.getByRole("link", { name: /users/i })).toBeVisible();
    });

    test("should navigate to users page when clicking Users link", async ({
      page,
    }) => {
      await loginAsAdmin(page);

      // Click Users link
      await page.getByRole("link", { name: /users/i }).click();

      // Should navigate to users page
      await expect(page).toHaveURL("/users");
      await expect(
        page.getByRole("heading", { name: /users/i })
      ).toBeVisible();
    });

    test("should maintain access to home route while on admin route", async ({
      page,
    }) => {
      await loginAsAdmin(page);

      // Go to admin route
      await page.goto("/users");
      await expect(page).toHaveURL("/users");

      // Manually navigate back to home
      await page.goto("/");

      // Should be able to access home
      await expectHomePage(page);
    });

    // Note: Currently only admin user is seeded. If agent users are added to seed.ts,
    // uncomment and update these tests:
    //
    // test("should redirect agent to home when accessing admin route", async ({
    //   page,
    // }) => {
    //   await login(page, TEST_USERS.agent);
    //   await page.goto("/users");
    //   await expectHomePage(page);
    // });
    //
    // test("should not show 'Users' link in navigation for agent", async ({
    //   page,
    // }) => {
    //   await login(page, TEST_USERS.agent);
    //   await expect(page.getByRole("link", { name: /users/i })).not.toBeVisible();
    // });
  });

  test.describe("URL Handling", () => {
    test("should redirect unknown routes to home for authenticated user", async ({
      page,
    }) => {
      await loginAsAdmin(page);

      // Visit unknown route
      await page.goto("/unknown-route");

      // Should redirect to home
      await expectHomePage(page);
    });

    test("should redirect unknown routes to login for unauthenticated user", async ({
      page,
    }) => {
      // Visit unknown route without being logged in
      await page.goto("/unknown-route");

      // Should redirect to login (via home redirect)
      await expectLoginPage(page);
    });
  });

  test.describe("Navigation Bar", () => {
    test.beforeEach(async ({ page }) => {
      await loginAsAdmin(page);
    });

    test("should display correct user information", async ({ page }) => {
      // User name should be visible
      await expect(page.getByText(TEST_USERS.admin.name)).toBeVisible();

      // Sign out button should be visible
      await expect(
        page.getByRole("button", { name: /sign out/i })
      ).toBeVisible();
    });

    test("should display Helpdesk branding", async ({ page }) => {
      await expect(page.getByText("Helpdesk").first()).toBeVisible();
    });

    test("should show navigation appropriate to user role", async ({
      page,
    }) => {
      // Admin should see Users link
      await expect(page.getByRole("link", { name: /users/i })).toBeVisible();

      // When we have agent users, we would test they don't see it
    });
  });
});

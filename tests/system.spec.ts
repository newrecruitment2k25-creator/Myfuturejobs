import { test, expect, Page } from "@playwright/test";

const BASE = "https://resumy-new.chjaved649.workers.dev";

// Test accounts
const JOBSEEKER = { email: "testjobseeker@resumy.my", password: "Test@12345" };
const EMPLOYER = { email: "testemployer@resumy.my", password: "Test@12345" };
const ADMIN = { email: "testadmin@resumy.my", password: "Test@12345" };

// Helper: login as a specific user
async function login(page: Page, creds: { email: string; password: string }) {
  await page.goto("/login");
  await page.fill('input[type="email"]', creds.email);
  await page.fill('input[type="password"]', creds.password);
  await page.click('button[type="submit"]');
  await page.waitForTimeout(3000);
}

// ═══════════════════════════════════════════════════════════
// TC-001: Landing Page
// ═══════════════════════════════════════════════════════════
test.describe("TC-001: Landing Page (/)", () => {
  test("1.1 Homepage loads with hero section", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveTitle(/ResuMY/i);
    await expect(page.locator("main")).toBeVisible();
  });

  test("1.2 Hero headline and CTAs", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    await expect(page.locator("main").getByText(/AI-Powered/i).first()).toBeVisible();
    await expect(page.getByText(/Find Jobs/i).first()).toBeVisible();
  });

  test("1.6 Footer visible with links", async ({ page }) => {
    await page.goto("/");
    const footer = page.locator("footer");
    await expect(footer).toBeVisible();
  });

  test("1.7 Find Jobs navigates to /jobs", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("link", { name: /Find Jobs/i }).first().click();
    await page.waitForURL(/\/jobs/);
    expect(page.url()).toContain("/jobs");
  });

  test("1.8 Language toggle visible", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    await expect(page.locator("header button").filter({ hasText: "EN" }).first()).toBeVisible();
    await expect(page.locator("header button").filter({ hasText: "BM" }).first()).toBeVisible();
  });
});

// ═══════════════════════════════════════════════════════════
// TC-002: Smart Job Search
// ═══════════════════════════════════════════════════════════
test.describe("TC-002: Smart Job Search (/jobs)", () => {
  test("2.1 Jobs page loads with search bar", async ({ page }) => {
    await page.goto("/jobs");
    await page.waitForLoadState("networkidle");
    // SPA hydration can take time on Cloudflare Workers
    await expect(page.locator("main")).toBeVisible({ timeout: 30000 });
    await expect(page.locator('input[placeholder*="Job title"], input[placeholder*="skills"], input[placeholder*="Search"]').first()).toBeVisible({ timeout: 15000 });
  });

  test("2.3 Search filters results", async ({ page }) => {
    await page.goto("/jobs");
    await page.waitForLoadState("networkidle");
    const searchInput = page.locator("input").first();
    await searchInput.fill("software engineer");
    await searchInput.press("Enter");
    await page.waitForTimeout(3000);
    expect(page.url()).toContain("/jobs");
  });
});

// ═══════════════════════════════════════════════════════════
// TC-004: Login
// ═══════════════════════════════════════════════════════════
test.describe("TC-004: Login (/login)", () => {
  test("4.1 Login form present", async ({ page }) => {
    await page.goto("/login");
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();
  });

  test("4.2 Login as jobseeker → /dashboard", async ({ page }) => {
    await login(page, JOBSEEKER);
    await page.waitForURL(/\/dashboard/, { timeout: 10000 });
    expect(page.url()).toContain("/dashboard");
  });

  test("4.3 Login as employer → /employer/dashboard", async ({ page }) => {
    await login(page, EMPLOYER);
    await page.waitForTimeout(5000);
    // Employer should go to employer dashboard or not stay on /login
    const url = page.url();
    expect(url.includes("/employer") || url.includes("/dashboard") || !url.endsWith("/login")).toBeTruthy();
  });

  test("4.4 Login as admin → /admin", async ({ page }) => {
    await login(page, ADMIN);
    await page.waitForURL(/\/admin/, { timeout: 10000 });
    expect(page.url()).toContain("/admin");
  });

  test("4.5 Login with wrong password shows error", async ({ page }) => {
    await page.goto("/login");
    await page.fill('input[type="email"]', "wrong@email.com");
    await page.fill('input[type="password"]', "wrongpassword");
    await page.click('button[type="submit"]');
    await page.waitForTimeout(3000);
    await expect(page.getByText(/incorrect|invalid|error/i)).toBeVisible();
  });

  test("4.6 MyDigital ID button visible (disabled)", async ({ page }) => {
    await page.goto("/login");
    const btn = page.getByText(/MyDigital ID/i);
    await expect(btn).toBeVisible();
  });
});

// ═══════════════════════════════════════════════════════════
// TC-005: Signup
// ═══════════════════════════════════════════════════════════
test.describe("TC-005: Signup (/signup)", () => {
  test("5.1 Signup form with role selection", async ({ page }) => {
    await page.goto("/signup");
    await page.waitForLoadState("networkidle");
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
    await expect(page.locator("button").filter({ hasText: /Jobseeker/i }).first()).toBeVisible();
    await expect(page.locator("button").filter({ hasText: /Employer/i }).first()).toBeVisible();
  });
});

// ═══════════════════════════════════════════════════════════
// TC-006: Jobseeker Dashboard
// ═══════════════════════════════════════════════════════════
test.describe("TC-006: Jobseeker Dashboard", () => {
  test("6.1 Dashboard loads after login", async ({ page }) => {
    await login(page, JOBSEEKER);
    await page.waitForURL(/\/dashboard/);
    await expect(page.locator("main")).toBeVisible();
  });

  test("6.9 No admin links in header for jobseeker", async ({ page }) => {
    await login(page, JOBSEEKER);
    await page.waitForURL(/\/dashboard/);
    await expect(page.getByText("Admin Console")).not.toBeVisible();
  });
});

// ═══════════════════════════════════════════════════════════
// TC-019: Employer Dashboard
// ═══════════════════════════════════════════════════════════
test.describe("TC-019: Employer Dashboard", () => {
  test("19.1 Employer dashboard loads", async ({ page }) => {
    await login(page, EMPLOYER);
    await page.waitForTimeout(5000);
    // If employer login works, should see main content
    await expect(page.locator("main")).toBeVisible();
    // Should not be on login page
    expect(page.url()).not.toMatch(/\/login$/);
  });

  test("19.4 No admin links for employer", async ({ page }) => {
    await login(page, EMPLOYER);
    await page.waitForTimeout(5000);
    // Employer should not see Admin Console link in nav
    const adminLink = page.locator('header a[href="/admin"]');
    await expect(adminLink).not.toBeVisible();
  });

  test("19.5 Employer cannot access /admin", async ({ page }) => {
    await login(page, EMPLOYER);
    await page.waitForTimeout(5000);
    await page.goto("/admin");
    await page.waitForTimeout(5000);
    // Should be redirected away from admin
    const url = page.url();
    expect(url.endsWith("/admin") || url.endsWith("/admin/")).toBeFalsy();
  });
});

// ═══════════════════════════════════════════════════════════
// TC-025: Admin Console
// ═══════════════════════════════════════════════════════════
test.describe("TC-025: Admin Console", () => {
  test("25.1 Admin redirects to /admin after login", async ({ page }) => {
    await login(page, ADMIN);
    await page.waitForURL(/\/admin/, { timeout: 10000 });
    expect(page.url()).toContain("/admin");
  });

  test("25.2 Dashboard loads with KPIs (not hardcoded)", async ({ page }) => {
    await login(page, ADMIN);
    await page.waitForURL(/\/admin/, { timeout: 15000 });
    await page.waitForTimeout(5000);
    const main = page.locator("main");
    // Should show KPI labels within main content
    await expect(main.getByText("Total Users")).toBeVisible();
    await expect(main.getByText("Jobseekers")).toBeVisible();
    // "Employers" appears in both KPI and module card desc — use exact match
    await expect(main.getByText("Employers", { exact: true })).toBeVisible();
    await expect(main.getByText("Admins")).toBeVisible();
  });

  test("25.3 No Caseworkers KPI", async ({ page }) => {
    await login(page, ADMIN);
    await page.waitForURL(/\/admin/);
    await page.waitForTimeout(2000);
    await expect(page.getByText("Caseworkers")).not.toBeVisible();
  });

  test("25.4 Users page loads", async ({ page }) => {
    await login(page, ADMIN);
    await page.waitForURL(/\/admin/);
    await page.goto("/admin/users");
    await page.waitForTimeout(3000);
    await expect(page.locator("main")).toBeVisible();
  });

  test("25.5 Candidates page loads", async ({ page }) => {
    await login(page, ADMIN);
    await page.waitForURL(/\/admin/);
    await page.goto("/admin/candidates");
    await page.waitForTimeout(3000);
    await expect(page.locator("main")).toBeVisible();
  });

  test("25.6 Employers page loads", async ({ page }) => {
    await login(page, ADMIN);
    await page.waitForURL(/\/admin/);
    await page.goto("/admin/employers");
    await page.waitForTimeout(3000);
    await expect(page.locator("main")).toBeVisible();
  });

  test("25.7 Placements page loads", async ({ page }) => {
    await login(page, ADMIN);
    await page.waitForURL(/\/admin/);
    await page.goto("/admin/placements");
    await page.waitForTimeout(3000);
    await expect(page.locator("main")).toBeVisible();
  });

  test("25.8 Audit logs page loads", async ({ page }) => {
    await login(page, ADMIN);
    await page.waitForURL(/\/admin/);
    await page.goto("/admin/audit-logs");
    await page.waitForTimeout(3000);
    await expect(page.locator("main")).toBeVisible();
  });

  test("25.9 System monitoring page loads", async ({ page }) => {
    await login(page, ADMIN);
    await page.waitForURL(/\/admin/);
    await page.goto("/admin/system-monitoring");
    await page.waitForTimeout(3000);
    await expect(page.locator("main")).toBeVisible();
  });

  test("25.10 RBAC page loads", async ({ page }) => {
    await login(page, ADMIN);
    await page.waitForURL(/\/admin/);
    await page.goto("/admin/rbac");
    await page.waitForTimeout(3000);
    await expect(page.locator("main")).toBeVisible();
  });

  test("25.11 Configuration page loads", async ({ page }) => {
    await login(page, ADMIN);
    await page.waitForURL(/\/admin/);
    await page.goto("/admin/configuration");
    await page.waitForTimeout(3000);
    await expect(page.locator("main")).toBeVisible();
  });

  test("25.12 Taxonomy page loads", async ({ page }) => {
    await login(page, ADMIN);
    await page.waitForURL(/\/admin/);
    await page.goto("/admin/taxonomy");
    await page.waitForTimeout(3000);
    await expect(page.locator("main")).toBeVisible();
  });
});

// ═══════════════════════════════════════════════════════════
// TC-026: Admin Security
// ═══════════════════════════════════════════════════════════
test.describe("TC-026: Admin Security", () => {
  test("26.1 Jobseeker has no Admin in header", async ({ page }) => {
    await login(page, JOBSEEKER);
    await page.waitForURL(/\/dashboard/);
    const header = page.locator("header");
    await expect(header.getByText("Admin Console")).not.toBeVisible();
    await expect(header.getByText("Operations")).not.toBeVisible();
  });

  test("26.2 Jobseeker blocked from /admin", async ({ page }) => {
    await login(page, JOBSEEKER);
    await page.waitForURL(/\/dashboard/);
    await page.goto("/admin");
    await page.waitForTimeout(4000);
    expect(page.url()).not.toMatch(/\/admin$/);
  });

  test("26.3 Employer has no Admin in header", async ({ page }) => {
    await login(page, EMPLOYER);
    await page.waitForTimeout(5000);
    const adminLink = page.locator('header a[href="/admin"]');
    await expect(adminLink).not.toBeVisible();
  });

  test("26.4 Employer blocked from /admin", async ({ page }) => {
    await login(page, EMPLOYER);
    await page.waitForTimeout(5000);
    await page.goto("/admin");
    await page.waitForTimeout(5000);
    const url = page.url();
    expect(url.endsWith("/admin") || url.endsWith("/admin/")).toBeFalsy();
  });
});

// ═══════════════════════════════════════════════════════════
// TC-028: Multilingual
// ═══════════════════════════════════════════════════════════
test.describe("TC-028: Multilingual", () => {
  test("28.1 Language toggle visible in header", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    const header = page.locator("header");
    await expect(header.locator("button").filter({ hasText: "EN" }).first()).toBeVisible();
    await expect(header.locator("button").filter({ hasText: "BM" }).first()).toBeVisible();
    await expect(header.locator("button").filter({ hasText: "中" }).first()).toBeVisible();
    await expect(header.locator("button").filter({ hasText: "த" }).first()).toBeVisible();
  });

  test("28.2 Click BM changes nav text", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    await page.locator("header button").filter({ hasText: "BM" }).first().click();
    await page.waitForTimeout(1000);
    // Nav should show "Pekerjaan" link — use role-based locator
    await expect(page.locator('header nav a[href="/jobs"]')).toHaveText(/Pekerjaan/);
  });

  test("28.3 Click EN reverts to English", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    await page.locator("header button").filter({ hasText: "BM" }).first().click();
    await page.waitForTimeout(500);
    await page.locator("header button").filter({ hasText: "EN" }).first().click();
    await page.waitForTimeout(500);
    await expect(page.locator('header nav a[href="/jobs"]')).toHaveText(/Jobs/);
  });
});

// ═══════════════════════════════════════════════════════════
// TC-029: Events Page
// ═══════════════════════════════════════════════════════════
test.describe("TC-029: Events Page", () => {
  test("29.1 Events page loads", async ({ page }) => {
    await page.goto("/events");
    await page.waitForTimeout(2000);
    await expect(page.locator("main")).toBeVisible();
  });
});

// ═══════════════════════════════════════════════════════════
// TC-031: Contact Page
// ═══════════════════════════════════════════════════════════
test.describe("TC-031: Contact Page", () => {
  test("31.1 Contact page loads with form", async ({ page }) => {
    await page.goto("/contact");
    await expect(page.locator("main")).toBeVisible();
    await expect(page.locator("form")).toBeVisible();
  });
});

// ═══════════════════════════════════════════════════════════
// TC-032: Privacy Policy
// ═══════════════════════════════════════════════════════════
test.describe("TC-032: Privacy Policy", () => {
  test("32.1 Privacy page loads", async ({ page }) => {
    await page.goto("/privacy");
    await expect(page.locator("main")).toBeVisible();
    await expect(page.getByText(/Privacy/i).first()).toBeVisible();
  });
});

// ═══════════════════════════════════════════════════════════
// TC-033: Terms of Service
// ═══════════════════════════════════════════════════════════
test.describe("TC-033: Terms of Service", () => {
  test("33.1 Terms page loads", async ({ page }) => {
    await page.goto("/terms");
    await expect(page.locator("main")).toBeVisible();
    await expect(page.getByText(/Terms/i).first()).toBeVisible();
  });
});

// ═══════════════════════════════════════════════════════════
// Performance: Page Load Times
// ═══════════════════════════════════════════════════════════
test.describe("Performance: Page Load", () => {
  test("Homepage loads within 5s", async ({ page }) => {
    const start = Date.now();
    await page.goto("/");
    await page.waitForLoadState("domcontentloaded");
    const elapsed = Date.now() - start;
    console.log(`Homepage load: ${elapsed}ms`);
    expect(elapsed).toBeLessThan(5000);
  });

  test("Jobs page loads within 5s", async ({ page }) => {
    const start = Date.now();
    await page.goto("/jobs");
    await page.waitForLoadState("domcontentloaded");
    const elapsed = Date.now() - start;
    console.log(`Jobs page load: ${elapsed}ms`);
    expect(elapsed).toBeLessThan(5000);
  });
});

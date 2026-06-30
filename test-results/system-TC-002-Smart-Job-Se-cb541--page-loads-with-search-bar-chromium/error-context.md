# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: system.spec.ts >> TC-002: Smart Job Search (/jobs) >> 2.1 Jobs page loads with search bar
- Location: tests\system.spec.ts:61:3

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: locator('main')
Expected: visible
Timeout: 10000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 10000ms
  - waiting for locator('main')

```

```yaml
- banner:
  - link "ResuMY":
    - /url: /
  - navigation:
    - link "Home":
      - /url: /
    - link "Jobs":
      - /url: /jobs
    - link "Events":
      - /url: /events
    - link "How It Works":
      - /url: /#how-it-works
  - button "EN"
  - button "BM"
  - button "中"
  - button "த"
  - link "Log In":
    - /url: /login
  - link "Sign Up":
    - /url: /signup
  - link "Find Jobs":
    - /url: /jobs
- heading "Discover Jobs" [level=1]
- button "More Options"
- textbox "Job title, skills…"
- textbox "Location…"
- button "Search"
- paragraph: 5,830 Jobs Available
- text: G
- heading "Finance Executive" [level=3]
- paragraph: gmail
- paragraph: Kuala Lumpur
- text: Permanent · Normal Hour 4d ago C
- heading "MARKETING CONTENT CREATOR" [level=3]
- paragraph: Comp A
- paragraph: Shah Alam
- text: Permanent · Normal Hour 1w ago C
- heading "CUSTOMER RELATION EXECUTIVE" [level=3]
- paragraph: Customer contact centre information clerk
- paragraph: Kuala Lumpur, Kuala Lumpur
- text: Permanent · Normal Hour Today A
- heading "DEVELOPER/PROGRAMMER" [level=3]
- paragraph: Application engineer
- paragraph: Puchong, Selangor
- text: Permanent · Normal Hour Today P
- heading "PROCESS ENGINEER" [level=3]
- paragraph: Process engineer
- paragraph: Simpang Ampat, Pulau Pinang
- text: Permanent · Normal Hour Today A
- heading "ERP COORDINATOR" [level=3]
- paragraph: Administrative assistant
- paragraph: Sungai Petani, Kedah
- text: Permanent · Normal Hour Today S
- heading "PROGRAM COORDINATOR" [level=3]
- paragraph: Sales assistant
- paragraph: Sungai Petani, Kedah
- text: Permanent · Normal Hour Today S
- heading "MUTAWIF MERANGKAP PEGAWAI JUALAN (UMRAH)" [level=3]
- paragraph: Sales support assistant
- paragraph: Petaling Jaya, Selangor
- text: Permanent · Normal Hour Today E
- heading "TECHNICIAN" [level=3]
- paragraph: Electrical engineering technician
- paragraph: Puchong, Selangor
- text: Permanent · Normal Hour Today A
- heading "TECHNICAL SUPPORT SYSTEM" [level=3]
- paragraph: After-sales service technician
- paragraph: Rawang, Selangor
- text: Permanent · Normal Hour Today S
- heading "ASSISTANT MANAGER" [level=3]
- paragraph: Sales manager
- paragraph: Sandakan, Sabah
- text: Permanent · Normal Hour Today O
- heading "ADMIN CLERK" [level=3]
- paragraph: Office clerk
- paragraph: Kuching, Sarawak
- text: Permanent · Normal Hour Today H
- heading "SUPERVISOR - SECURITY AND ENVIRONMENTAL, HEALTH AND SAFETY" [level=3]
- paragraph: Health and safety officer
- paragraph: Bayan Lepas, Pulau Pinang
- text: Permanent · Normal Hour Today S
- heading "CASHIER" [level=3]
- paragraph: Sales assistant
- paragraph: Kota Kinabalu, Sabah
- text: Permanent · Normal Hour Today A
- heading "ADMIN" [level=3]
- paragraph: Administrative assistant
- paragraph: Johor Bahru, Johor
- text: Permanent · Normal Hour Today A
- heading "TECHNICIAN (DIPLOMA)" [level=3]
- paragraph: Air pollution analyst
- paragraph: Puchong, Selangor
- text: Permanent · Normal Hour Today A
- heading "BEAUTY EXPERT AT MAHKOTA CHERAS" [level=3]
- paragraph: Aesthetician
- paragraph: Cheras, Selangor
- text: Permanent · Normal Hour Today F
- heading "HEALTH ADVISOR (D'PULZE, CYBERJAYA)" [level=3]
- paragraph: Family planning counsellor
- paragraph: Cyberjaya, Selangor
- text: Permanent · Normal Hour Today B
- heading "BARISTA" [level=3]
- paragraph: Barista
- paragraph: Kota Bharu, Kelantan
- text: Permanent · Normal Hour Today W
- heading "WOOD TECHNOLOGY SPECIALIST" [level=3]
- paragraph: Wood technology engineer
- paragraph: Muar, Johor
- text: Permanent · Normal Hour Today A
- heading "PRODUCTION TECHNICIAN" [level=3]
- paragraph: After-sales service technician
- paragraph: Simpang Ampat, Pulau Pinang
- text: Permanent · Normal Hour Today C
- heading "CNC MACHINIST SETTER" [level=3]
- paragraph: Computer numerical control machine operator
- paragraph: Melaka, Melaka
- text: Permanent · Normal Hour Today
- button "Load More"
- paragraph: Showing 22 of 5,830
- paragraph: Select a job to view details
- contentinfo:
  - paragraph: ResuMY 🇲🇾
  - paragraph: Malaysia's AI-Powered Employment Portal — connecting jobseekers and employers.
  - paragraph: AI-Powered Employment Intelligence · PERKESO · MYFutureJobs
  - heading "For Jobseekers" [level=4]
  - list:
    - listitem:
      - link "Find Jobs":
        - /url: /jobs
    - listitem:
      - link "Analyze CV":
        - /url: /analyze
    - listitem:
      - link "Resume Builder":
        - /url: /resume-builder
    - listitem:
      - link "Interview Prep":
        - /url: /interview-preparation
    - listitem:
      - link "Training & Upskilling":
        - /url: /dashboard
  - heading "For Employers" [level=4]
  - list:
    - listitem:
      - link "Post a Job":
        - /url: /employer/vacancy-builder
    - listitem:
      - link "Find Candidates":
        - /url: /employer/dashboard
    - listitem:
      - link "AI Interviews":
        - /url: /employer/interviews
    - listitem:
      - link "Labour Market Intelligence":
        - /url: /employer/labour-market-intelligence
  - heading "Platform" [level=4]
  - list:
    - listitem:
      - link "Events":
        - /url: /events
    - listitem: Career Pathway
    - listitem: Skills Passport
    - listitem: POC Demo
  - heading "About" [level=4]
  - list:
    - listitem:
      - link "About ResuMY":
        - /url: /
    - listitem:
      - link "Contact":
        - /url: /contact
    - listitem:
      - link "Privacy Policy":
        - /url: /privacy
    - listitem:
      - link "Terms":
        - /url: /terms
  - text: © 2026 ResuMY · AI-Powered Employment Intelligence · PERKESO · MYFutureJobs 🇲🇾
- region "Notifications alt+T"
- button "Open chat"
```

# Test source

```ts
  1   | import { test, expect, Page } from "@playwright/test";
  2   | 
  3   | const BASE = "https://resumy-new.chjaved649.workers.dev";
  4   | 
  5   | // Test accounts
  6   | const JOBSEEKER = { email: "testjobseeker@resumy.my", password: "Test@12345" };
  7   | const EMPLOYER = { email: "testemployer@resumy.my", password: "Test@12345" };
  8   | const ADMIN = { email: "testadmin@resumy.my", password: "Test@12345" };
  9   | 
  10  | // Helper: login as a specific user
  11  | async function login(page: Page, creds: { email: string; password: string }) {
  12  |   await page.goto("/login");
  13  |   await page.fill('input[type="email"]', creds.email);
  14  |   await page.fill('input[type="password"]', creds.password);
  15  |   await page.click('button[type="submit"]');
  16  |   await page.waitForTimeout(3000);
  17  | }
  18  | 
  19  | // ═══════════════════════════════════════════════════════════
  20  | // TC-001: Landing Page
  21  | // ═══════════════════════════════════════════════════════════
  22  | test.describe("TC-001: Landing Page (/)", () => {
  23  |   test("1.1 Homepage loads with hero section", async ({ page }) => {
  24  |     await page.goto("/");
  25  |     await expect(page).toHaveTitle(/ResuMY/i);
  26  |     await expect(page.locator("main")).toBeVisible();
  27  |   });
  28  | 
  29  |   test("1.2 Hero headline and CTAs", async ({ page }) => {
  30  |     await page.goto("/");
  31  |     await page.waitForLoadState("networkidle");
  32  |     await expect(page.locator("main").getByText(/AI-Powered/i).first()).toBeVisible();
  33  |     await expect(page.getByText(/Find Jobs/i).first()).toBeVisible();
  34  |   });
  35  | 
  36  |   test("1.6 Footer visible with links", async ({ page }) => {
  37  |     await page.goto("/");
  38  |     const footer = page.locator("footer");
  39  |     await expect(footer).toBeVisible();
  40  |   });
  41  | 
  42  |   test("1.7 Find Jobs navigates to /jobs", async ({ page }) => {
  43  |     await page.goto("/");
  44  |     await page.getByRole("link", { name: /Find Jobs/i }).first().click();
  45  |     await page.waitForURL(/\/jobs/);
  46  |     expect(page.url()).toContain("/jobs");
  47  |   });
  48  | 
  49  |   test("1.8 Language toggle visible", async ({ page }) => {
  50  |     await page.goto("/");
  51  |     await page.waitForLoadState("networkidle");
  52  |     await expect(page.locator("header button").filter({ hasText: "EN" }).first()).toBeVisible();
  53  |     await expect(page.locator("header button").filter({ hasText: "BM" }).first()).toBeVisible();
  54  |   });
  55  | });
  56  | 
  57  | // ═══════════════════════════════════════════════════════════
  58  | // TC-002: Smart Job Search
  59  | // ═══════════════════════════════════════════════════════════
  60  | test.describe("TC-002: Smart Job Search (/jobs)", () => {
  61  |   test("2.1 Jobs page loads with search bar", async ({ page }) => {
  62  |     await page.goto("/jobs");
  63  |     await page.waitForLoadState("networkidle");
  64  |     await page.waitForTimeout(5000);
> 65  |     await expect(page.locator("main")).toBeVisible();
      |                                        ^ Error: expect(locator).toBeVisible() failed
  66  |     // Wait for the job title input to appear
  67  |     await expect(page.locator('input[placeholder*="Job title"], input[placeholder*="skills"], input[placeholder*="Search"]').first()).toBeVisible({ timeout: 15000 });
  68  |   });
  69  | 
  70  |   test("2.3 Search filters results", async ({ page }) => {
  71  |     await page.goto("/jobs");
  72  |     await page.waitForLoadState("networkidle");
  73  |     const searchInput = page.locator("input").first();
  74  |     await searchInput.fill("software engineer");
  75  |     await searchInput.press("Enter");
  76  |     await page.waitForTimeout(3000);
  77  |     expect(page.url()).toContain("/jobs");
  78  |   });
  79  | });
  80  | 
  81  | // ═══════════════════════════════════════════════════════════
  82  | // TC-004: Login
  83  | // ═══════════════════════════════════════════════════════════
  84  | test.describe("TC-004: Login (/login)", () => {
  85  |   test("4.1 Login form present", async ({ page }) => {
  86  |     await page.goto("/login");
  87  |     await expect(page.locator('input[type="email"]')).toBeVisible();
  88  |     await expect(page.locator('input[type="password"]')).toBeVisible();
  89  |     await expect(page.locator('button[type="submit"]')).toBeVisible();
  90  |   });
  91  | 
  92  |   test("4.2 Login as jobseeker → /dashboard", async ({ page }) => {
  93  |     await login(page, JOBSEEKER);
  94  |     await page.waitForURL(/\/dashboard/, { timeout: 10000 });
  95  |     expect(page.url()).toContain("/dashboard");
  96  |   });
  97  | 
  98  |   test("4.3 Login as employer → /employer/dashboard", async ({ page }) => {
  99  |     await login(page, EMPLOYER);
  100 |     await page.waitForTimeout(5000);
  101 |     // Employer should go to employer dashboard or not stay on /login
  102 |     const url = page.url();
  103 |     expect(url.includes("/employer") || url.includes("/dashboard") || !url.endsWith("/login")).toBeTruthy();
  104 |   });
  105 | 
  106 |   test("4.4 Login as admin → /admin", async ({ page }) => {
  107 |     await login(page, ADMIN);
  108 |     await page.waitForURL(/\/admin/, { timeout: 10000 });
  109 |     expect(page.url()).toContain("/admin");
  110 |   });
  111 | 
  112 |   test("4.5 Login with wrong password shows error", async ({ page }) => {
  113 |     await page.goto("/login");
  114 |     await page.fill('input[type="email"]', "wrong@email.com");
  115 |     await page.fill('input[type="password"]', "wrongpassword");
  116 |     await page.click('button[type="submit"]');
  117 |     await page.waitForTimeout(3000);
  118 |     await expect(page.getByText(/incorrect|invalid|error/i)).toBeVisible();
  119 |   });
  120 | 
  121 |   test("4.6 MyDigital ID button visible (disabled)", async ({ page }) => {
  122 |     await page.goto("/login");
  123 |     const btn = page.getByText(/MyDigital ID/i);
  124 |     await expect(btn).toBeVisible();
  125 |   });
  126 | });
  127 | 
  128 | // ═══════════════════════════════════════════════════════════
  129 | // TC-005: Signup
  130 | // ═══════════════════════════════════════════════════════════
  131 | test.describe("TC-005: Signup (/signup)", () => {
  132 |   test("5.1 Signup form with role selection", async ({ page }) => {
  133 |     await page.goto("/signup");
  134 |     await page.waitForLoadState("networkidle");
  135 |     await expect(page.locator('input[type="email"]')).toBeVisible();
  136 |     await expect(page.locator('input[type="password"]')).toBeVisible();
  137 |     await expect(page.locator("button").filter({ hasText: /Jobseeker/i }).first()).toBeVisible();
  138 |     await expect(page.locator("button").filter({ hasText: /Employer/i }).first()).toBeVisible();
  139 |   });
  140 | });
  141 | 
  142 | // ═══════════════════════════════════════════════════════════
  143 | // TC-006: Jobseeker Dashboard
  144 | // ═══════════════════════════════════════════════════════════
  145 | test.describe("TC-006: Jobseeker Dashboard", () => {
  146 |   test("6.1 Dashboard loads after login", async ({ page }) => {
  147 |     await login(page, JOBSEEKER);
  148 |     await page.waitForURL(/\/dashboard/);
  149 |     await expect(page.locator("main")).toBeVisible();
  150 |   });
  151 | 
  152 |   test("6.9 No admin links in header for jobseeker", async ({ page }) => {
  153 |     await login(page, JOBSEEKER);
  154 |     await page.waitForURL(/\/dashboard/);
  155 |     await expect(page.getByText("Admin Console")).not.toBeVisible();
  156 |   });
  157 | });
  158 | 
  159 | // ═══════════════════════════════════════════════════════════
  160 | // TC-019: Employer Dashboard
  161 | // ═══════════════════════════════════════════════════════════
  162 | test.describe("TC-019: Employer Dashboard", () => {
  163 |   test("19.1 Employer dashboard loads", async ({ page }) => {
  164 |     await login(page, EMPLOYER);
  165 |     await page.waitForTimeout(5000);
```
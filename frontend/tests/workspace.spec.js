import { Buffer } from "node:buffer";
import { test, expect } from "@playwright/test";
import { sample } from "../src/lib/bills.js";
const bill = { ...sample, _id: "test-bill", fileName: "Synthetic bill.pdf" };
async function authenticated(page) {
  await page.addInitScript(() => {
    localStorage.setItem("token", "synthetic-test-token");
    localStorage.setItem(
      "user",
      JSON.stringify({ name: "Alex Sample", email: "sample@example.test" }),
    );
  });
}
async function mock(page, bills = [bill]) {
  await page.route("**/api/**", async (route) => {
    const url = route.request().url();
    if (url.endsWith("/bills/limits"))
      return route.fulfill({
        json: { maxBytes: 5242880, maxPages: 5, retentionHours: 24 },
      });
    if (url.endsWith("/bills")) return route.fulfill({ json: bills });
    return route.fulfill({ json: bill });
  });
}
test("public sample is isolated, responsive, and has working charge links", async ({
  page,
}) => {
  let calls = 0;
  await page.route("**/api/**", (r) => {
    calls++;
    return r.abort();
  });
  await page.goto("/sample");
  await expect(
    page.getByText("Fictional sample · precomputed results"),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Itemized charges" }),
  ).toBeVisible();
  await page.screenshot({
    path: "../artifacts/sample-desktop.png",
    fullPage: true,
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({
    path: "../artifacts/sample-mobile.png",
    fullPage: true,
  });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  expect(calls).toBe(0);
});
test("dashboard, history and upload states", async ({ page }) => {
  await authenticated(page);
  await mock(page);
  await page.goto("/dashboard");
  await expect(
    page.getByRole("heading", { name: "Your bills, made clearer." }),
  ).toBeVisible();
  await expect(
    page.locator(".bills-table").getByText("Synthetic bill.pdf"),
  ).toBeVisible();
  await page.screenshot({
    path: "../artifacts/dashboard-desktop.png",
    fullPage: true,
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({
    path: "../artifacts/dashboard-mobile.png",
    fullPage: true,
  });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.goto("/history");
  await page.getByLabel("Search bills").fill("not found");
  await expect(
    page.getByRole("heading", { name: "No matching bills" }),
  ).toBeVisible();
  await page.getByLabel("Search bills").fill("");
  await page.screenshot({
    path: "../artifacts/history-mobile.png",
    fullPage: true,
  });
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.screenshot({
    path: "../artifacts/history-desktop.png",
    fullPage: true,
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/upload");
  await expect(page.getByText("5 MB maximum", { exact: false })).toBeVisible();
  await page.screenshot({
    path: "../artifacts/upload-mobile.png",
    fullPage: true,
  });
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.screenshot({
    path: "../artifacts/upload-desktop.png",
    fullPage: true,
  });
});
test("empty, loading, error and login validation screens", async ({ page }) => {
  await authenticated(page);
  await mock(page, []);
  await page.goto("/dashboard");
  await expect(
    page.getByRole("heading", { name: "No bills yet" }),
  ).toBeVisible();
  await page.screenshot({
    path: "../artifacts/dashboard-empty.png",
    fullPage: true,
  });
  await page.unroute("**/api/**");
  await page.route("**/api/bills", async (r) => {
    await new Promise((resolve) => setTimeout(resolve, 1000));
    await r.fulfill({
      status: 503,
      json: { message: "Synthetic service unavailable. Retry." },
    });
  });
  await page.reload();
  await expect(page.getByRole("status")).toContainText("Loading");
  await page.screenshot({
    path: "../artifacts/dashboard-loading.png",
    fullPage: true,
  });
  await expect(page.getByRole("alert")).toContainText(
    "Synthetic service unavailable",
  );
  await page.screenshot({
    path: "../artifacts/dashboard-error.png",
    fullPage: true,
  });
  await page.goto("/login");
  await page.getByLabel("Email").fill("sample@example.test");
  await page.getByLabel("Password", { exact: true }).fill("wrong-password");
  await page.route("**/api/auth/login", (r) =>
    r.fulfill({ status: 401, json: { message: "Invalid email or password" } }),
  );
  await page.getByRole("button", { name: "Log In", exact: true }).click();
  await expect(page.getByText("Invalid email or password")).toBeVisible();
  await page.screenshot({
    path: "../artifacts/login-desktop.png",
    fullPage: true,
  });
});
test("review, failed analysis and retry reuse the bill without upload", async ({
  page,
}) => {
  await authenticated(page);
  let current = {
      ...bill,
      reviewedAt: null,
      processing: { stage: "review" },
      aiAnalysis: null,
      summary: {
        ...bill.summary,
        complete: false,
        status: "Review charges",
        stage: "review",
        ruleFindings: [],
        suggestions: [],
        affectedCharges: 0,
      },
    },
    uploads = 0,
    analyses = 0;
  await page.route("**/api/**", async (r) => {
    const url = r.request().url();
    if (url.endsWith("/upload")) uploads++;
    if (url.endsWith("/review")) {
      const body = r.request().postDataJSON();
      expect(body.currency).toBe("USD");
      current = {
        ...current,
        parsedData: body.rows,
        reviewedAt: "2026-01-15",
        processing: { stage: "analyze" },
      };
      return r.fulfill({ json: { bill: current } });
    }
    if (url.endsWith("/analyze")) {
      analyses++;
      current = {
        ...current,
        processing: {
          stage: "failed",
          failedStage: "analyze",
          message: "AI unavailable. Retry later.",
        },
        summary: { ...current.summary, status: "Processing interrupted" },
      };
      return r.fulfill({ json: { bill: current } });
    }
    return r.fulfill({ json: current });
  });
  await page.goto("/bills/test-bill");
  await expect(
    page.getByRole("heading", { name: "Review extracted charges" }),
  ).toBeVisible();
  await page.screenshot({
    path: "../artifacts/review-desktop.png",
    fullPage: true,
  });
  await page.getByLabel("Line total 1").fill("125");
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "Confirm charges & analyze" }).click();
  await expect(
    page.getByText("AI unavailable. Retry later.", { exact: false }),
  ).toBeVisible();
  await page.reload();
  await page.getByRole("button", { name: "Retry / resume analysis" }).click();
  await expect.poll(() => analyses).toBe(2);
  expect(uploads).toBe(0);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({
    path: "../artifacts/analysis-error-mobile.png",
    fullPage: true,
  });
});

test("account screens and file picker remain accessible on mobile", async ({
  page,
}) => {
  await mock(page);
  await page.goto("/");
  await expect(page).toHaveURL(/\/sample$/);
  await page.goto("/register");
  await expect(page.getByLabel("Full Name")).toBeVisible();
  await page.screenshot({
    path: "../artifacts/register-desktop.png",
    fullPage: true,
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({
    path: "../artifacts/register-mobile.png",
    fullPage: true,
  });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.goto("/login");
  await page.screenshot({
    path: "../artifacts/login-mobile.png",
    fullPage: true,
  });
  await page.keyboard.press("Tab");
  await expect(
    page.getByRole("link", { name: "Skip to content" }),
  ).toBeFocused();
  await authenticated(page);
  await page.goto("/upload");
  await page.locator("input[type=file]").setInputFiles({
    name: "fictional.pdf",
    mimeType: "application/pdf",
    buffer: Buffer.from("%PDF-synthetic-selection-only"),
  });
  await expect(
    page.getByRole("heading", { name: "fictional.pdf" }),
  ).toBeVisible();
  await page.screenshot({
    path: "../artifacts/upload-selected-mobile.png",
    fullPage: true,
  });
  await page.getByRole("button", { name: "Remove file" }).click();
  await expect(
    page.getByRole("heading", { name: "Drop your bill here" }),
  ).toBeVisible();
});

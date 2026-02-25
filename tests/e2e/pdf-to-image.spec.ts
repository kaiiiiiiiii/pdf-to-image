import { expect, test } from "@playwright/test";

test.describe("PDF to Image App", () => {
  test("loads app shell and controls", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { name: "PDF to Image" })).toBeVisible();
    await expect(page.getByText("Drop PDFs here or click to browse")).toBeVisible();
    await expect(page.getByText("Image format")).toBeVisible();
    await expect(page.getByRole("button", { name: "Download ZIP" })).toBeVisible();
  });

  test("format selector has PNG/JPEG/WEBP", async ({ page }) => {
    await page.goto("/");
    const select = page.locator("select");
    await expect(select).toHaveValue("JPEG");
    await expect(select.locator('option[value="png"]')).toHaveText("PNG");
    await expect(select.locator('option[value="jpeg"]')).toHaveText("JPEG");
    await expect(select.locator('option[value="webp"]')).toHaveText("WEBP");
  });

  // Note: full upload rendering tests are covered in unit-level helpers.
  // E2E multi-browser rendering can be added with fixture PDFs and file uploads.
});

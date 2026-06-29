import { expect, test } from "@playwright/test";

test("renders live room and admin rooms UI", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1, name: "The Future of AI in Everyday Life" })).toBeVisible();
  await expect(page.getByText("ON STAGE — 3")).toBeVisible();
  await expect(page.getByText("Raise Hand")).toBeVisible();

  await page.goto("/admin/rooms");
  await expect(page.getByRole("heading", { name: "All Rooms" })).toBeVisible();
  await expect(page.getByRole("link", { name: /The Future of AI in Everyday Life/ })).toBeVisible();
});

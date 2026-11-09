import { test, expect } from "playwright/test";

test("demo: load the graph, select a cited file, and search", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/explore");
  await expect(page.getByRole("heading", { name: "Graph Topology" })).toBeVisible();
  await expect(page.locator("canvas").first()).toBeVisible();
  await page.getByRole("button", { name: "Ask RepoAtlas AI" }).click();
  await page.getByRole("button", { name: "Architecture", exact: true }).click();
  await expect(page.getByRole("textbox", { name: "Ask a question" })).toBeEnabled();
  await page
    .getByTitle(/^Focus src\/core\//)
    .first()
    .click();
  await expect(page.getByRole("heading", { name: "core_module_01.py", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Close chat", exact: true }).click();
  await page.keyboard.press("Control+k");
  const search = page.getByRole("textbox", { name: "Search files and symbols" });
  await expect(search).toBeFocused();
  await search.fill("core_module_01");
  await expect(page.getByRole("status")).toHaveText("1 / 150 files");
  await page.getByRole("button", { name: "Clear filters" }).click();
  await expect(page.getByRole("status")).toHaveText("150 / 150 files");
  await page.getByRole("button", { name: "Complexity", exact: true }).click();
  await expect(page.getByRole("heading", { name: "core_module_01.py", exact: true })).toBeVisible();
  expect(errors).toEqual([]);
});

test("mobile drawer, focus trap, shortcuts, and chat fit the viewport", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto("/explore");
  await expect(page.locator("canvas").first()).toBeVisible();
  await page.keyboard.press("Control+k");
  const dialog = page.getByRole("dialog", { name: "Repository sidebar" });
  await expect(dialog).toBeVisible();
  await expect(page.getByRole("textbox", { name: "Search files and symbols" })).toBeFocused();
  const lastControl = dialog.getByRole("button").last();
  await lastControl.focus();
  await page.keyboard.press("Tab");
  await expect(page.getByRole("button", { name: "Close sidebar", exact: true })).toBeFocused();
  await page.keyboard.press("Shift+Tab");
  await expect(lastControl).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
  await page.keyboard.press("?");
  await expect(page.getByRole("dialog", { name: "Keyboard shortcuts" })).toBeVisible();
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "Ask AI", exact: true }).click();
  const input = page.getByRole("textbox", { name: "Ask a question" });
  await expect(input).toBeVisible();
  const bounds = await input.boundingBox();
  expect(bounds!.x).toBeGreaterThanOrEqual(0);
  expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(375);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(375);
});

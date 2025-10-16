/**
 * docs:
 * - 目的: トラックカードの編集操作がAPI更新からUI反映まで一貫して動作することを検証する。
 * - 検証観点:
 *   - 編集モーダルに既存のメモ・タグ・コンディションが表示されること
 *   - メモとタグ、コンディションを変更し保存するとカード表示が更新されること
 */
import { expect, test } from "@playwright/test";

import { resetDatabase } from "../helpers/db";

test.describe("トラックカードの編集", () => {
  let secondTagName: string;

  test.beforeEach(async ({ page }) => {
    await resetDatabase();

    const categoryResponse = await page.request.post("/api/categories", {
      data: { name: "生活習慣", color: "#FF8A65" },
    });
    expect(categoryResponse.status()).toBe(201);
    const category = await categoryResponse.json();

    const firstTagResponse = await page.request.post("/api/tags", {
      data: { categoryId: category.id, name: "睡眠" },
    });
    expect(firstTagResponse.status()).toBe(201);
    const firstTag = await firstTagResponse.json();

    const secondTagResponse = await page.request.post("/api/tags", {
      data: { categoryId: category.id, name: "運動" },
    });
    expect(secondTagResponse.status()).toBe(201);
    const secondTag = await secondTagResponse.json();
    secondTagName = secondTag.name as string;

    const trackResponse = await page.request.post("/api/tracks", {
      data: { memo: "初期メモ", condition: 0, tagIds: [firstTag.id] },
    });
    expect(trackResponse.status()).toBe(201);
  });

  test("メモ・タグ・コンディションを更新できる", async ({ page }) => {
    await page.goto("/track");
    await expect(page.getByText("初期メモ")).toBeVisible();

    await page.getByRole("button", { name: "編集" }).click();
    const dialog = page.getByRole("dialog", { name: /記録を編集/ });
    await expect(dialog).toBeVisible();

    const memoField = dialog.getByPlaceholder("記録内容を更新...");
    await expect(memoField).toHaveValue("初期メモ");
    await memoField.fill("更新済みメモ");
    await expect(dialog.getByText("睡眠")).toBeVisible();

    const removeButton = dialog.getByRole("button", { name: "睡眠 を外す" });
    await removeButton.click();

    await dialog.getByRole("button", { name: "タグを追加" }).click();
    await page.locator("text=読み込み中...").waitFor({ state: "detached" });
    const tagButton = page.getByRole("button", { name: secondTagName });
    await expect(tagButton).toBeVisible();
    await tagButton.click();

    await dialog.getByRole("button", { name: "コンディションを選択" }).click();
    await page.getByRole("button", { name: /-1/ }).click();

    await dialog.getByRole("button", { name: "保存" }).click();
    await expect(dialog).toBeHidden();

    const card = page.getByTestId("track-card");
    await expect(card).toContainText("更新済みメモ");
    await expect(card).toContainText(secondTagName);
    await expect(card).toContainText("-1");
  });
});

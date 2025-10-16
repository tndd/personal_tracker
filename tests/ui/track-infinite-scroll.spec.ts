/**
 * docs:
 * - 目的: トラック画面の無限スクロールがネットワークエラー後も再試行可能であることを担保する。
 * - 検証観点:
 *   - 初回取得が失敗した際に「過去のトラックを読み込む」ボタンが残り、エラーメッセージが表示されること
 *   - 再試行で成功した後にトラック一覧が表示され、エラーメッセージが解消されること
 */
import { expect, test } from "@playwright/test";

import { resetDatabase } from "../helpers/db";

test.describe("トラック画面の無限スクロール", () => {
  test.beforeEach(async ({ page }) => {
    await resetDatabase();

    for (let index = 0; index < 25; index++) {
      const response = await page.request.post("/api/tracks", {
        data: { memo: `テスト記録${index}`, condition: 0 },
      });
      expect(response.status()).toBe(201);
    }
  });

  test("ネットワークエラー後に再試行できる", async ({ page }) => {
    let shouldFail = true;
    await page.route("**/api/tracks?**", async (route) => {
      if (shouldFail) {
        shouldFail = false;
        await route.fulfill({
          status: 500,
          contentType: "application/json",
          body: JSON.stringify({ error: "forced failure" }),
        });
        return;
      }

      await route.continue();
    });

    await page.goto("/track");

    const errorLocator = page.getByText("過去のトラックの取得に失敗しました。再試行してください。");
    await expect(errorLocator).toBeVisible();
    const retryButton = page.getByRole("button", { name: "もう一度読み込む" });
    await expect(retryButton).toBeVisible();

    await retryButton.click();
    await expect(page.getByText("テスト記録24")).toBeVisible();
    await expect(errorLocator).toBeHidden();
    const loadMoreButton = page.getByRole("button", { name: "過去のトラックを読み込む" });
    await expect(loadMoreButton).toBeVisible();
  });
});

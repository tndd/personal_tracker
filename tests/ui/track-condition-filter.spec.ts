/**
 * docs:
 * - 目的: トラック画面のコンディション絞り込み機能が正常に動作することを担保する。
 * - 検証観点:
 *   - サイドバーにコンディションフィルターが表示されること
 *   - コンディションを選択するとフィルタリングされること
 *   - 複数のコンディションを選択すると、いずれかに該当するトラックが表示されること
 *   - コンディションフィルターをクリアすると全てのトラックが表示されること
 *   - コンディションとタグの複合フィルタリングが正常に動作すること
 */
import { expect, test } from "@playwright/test";

import { resetDatabase } from "../helpers/db";

test.describe("トラック画面のコンディションフィルター", () => {
  test.beforeEach(async ({ page }) => {
    await resetDatabase();

    // カテゴリとタグを作成
    const categoryRes = await page.request.post("/api/categories", {
      data: { name: "テストカテゴリ", color: "#3b82f6" },
    });
    expect(categoryRes.status()).toBe(201);
    const category = await categoryRes.json();

    const tagRes = await page.request.post("/api/tags", {
      data: { name: "テストタグ", categoryId: category.id },
    });
    expect(tagRes.status()).toBe(201);
    const tag = await tagRes.json();

    // 異なるコンディションのトラックを作成
    // condition +2 (とても良い)
    await page.request.post("/api/tracks", {
      data: { memo: "最高の一日", condition: 2, tagIds: [tag.id] },
    });

    // condition +1 (良い)
    await page.request.post("/api/tracks", {
      data: { memo: "良い一日", condition: 1, tagIds: [tag.id] },
    });

    // condition 0 (普通)
    await page.request.post("/api/tracks", {
      data: { memo: "普通の一日", condition: 0, tagIds: [] },
    });

    // condition -1 (悪い)
    await page.request.post("/api/tracks", {
      data: { memo: "悪い一日", condition: -1, tagIds: [] },
    });

    // condition -2 (とても悪い)
    await page.request.post("/api/tracks", {
      data: { memo: "最悪の一日", condition: -2, tagIds: [] },
    });
  });

  test("コンディションフィルターが表示される", async ({ page }) => {
    await page.goto("/track");

    // サイドバーのコンディションフィルターが表示されること
    await expect(page.getByText("コンディションフィルター")).toBeVisible();

    // 5つのコンディションボタンが表示されること
    await expect(page.getByRole("button", { name: "コンディション: +2" })).toBeVisible();
    await expect(page.getByRole("button", { name: "コンディション: +1" })).toBeVisible();
    await expect(page.getByRole("button", { name: "コンディション: ±0" })).toBeVisible();
    await expect(page.getByRole("button", { name: "コンディション: -1" })).toBeVisible();
    await expect(page.getByRole("button", { name: "コンディション: -2" })).toBeVisible();
  });

  test("単一コンディションでフィルタリングできる", async ({ page }) => {
    await page.goto("/track");

    // 初期状態では全てのトラックが表示されている
    await expect(page.getByText("最高の一日")).toBeVisible();
    await expect(page.getByText("良い一日")).toBeVisible();
    await expect(page.getByText("普通の一日")).toBeVisible();
    await expect(page.getByText("悪い一日")).toBeVisible();
    await expect(page.getByText("最悪の一日")).toBeVisible();

    // コンディション +2 を選択
    await page.getByRole("button", { name: "コンディション: +2" }).click();

    // コンディション +2 のトラックのみ表示される
    await expect(page.getByText("最高の一日")).toBeVisible();
    await expect(page.getByText("良い一日")).toBeHidden();
    await expect(page.getByText("普通の一日")).toBeHidden();
    await expect(page.getByText("悪い一日")).toBeHidden();
    await expect(page.getByText("最悪の一日")).toBeHidden();

    // 絞り込み中メッセージが表示される
    await expect(page.getByText("1個のコンディションで絞り込み中")).toBeVisible();
  });

  test("複数コンディションでフィルタリングできる", async ({ page }) => {
    await page.goto("/track");

    // コンディション +2 を選択
    await page.getByRole("button", { name: "コンディション: +2" }).click();

    // コンディション -2 を選択
    await page.getByRole("button", { name: "コンディション: -2" }).click();

    // コンディション +2 と -2 のトラックのみ表示される
    await expect(page.getByText("最高の一日")).toBeVisible();
    await expect(page.getByText("良い一日")).toBeHidden();
    await expect(page.getByText("普通の一日")).toBeHidden();
    await expect(page.getByText("悪い一日")).toBeHidden();
    await expect(page.getByText("最悪の一日")).toBeVisible();

    // 絞り込み中メッセージが表示される
    await expect(page.getByText("2個のコンディションで絞り込み中")).toBeVisible();
  });

  test("コンディションフィルターをクリアできる", async ({ page }) => {
    await page.goto("/track");

    // コンディション +2 を選択
    await page.getByRole("button", { name: "コンディション: +2" }).click();

    // フィルタリングされていることを確認
    await expect(page.getByText("最高の一日")).toBeVisible();
    await expect(page.getByText("良い一日")).toBeHidden();

    // クリアボタンをクリック
    await page.getByRole("button", { name: "クリア" }).first().click();

    // 全てのトラックが再表示される
    await expect(page.getByText("最高の一日")).toBeVisible();
    await expect(page.getByText("良い一日")).toBeVisible();
    await expect(page.getByText("普通の一日")).toBeVisible();
    await expect(page.getByText("悪い一日")).toBeVisible();
    await expect(page.getByText("最悪の一日")).toBeVisible();

    // 絞り込み中メッセージが非表示になる
    await expect(page.getByText("個のコンディションで絞り込み中")).toBeHidden();
  });

  test("選択されたコンディションを再度クリックすると選択解除される", async ({ page }) => {
    await page.goto("/track");

    // コンディション +2 を選択
    const button = page.getByRole("button", { name: "コンディション: +2" });
    await button.click();

    // フィルタリングされていることを確認
    await expect(page.getByText("最高の一日")).toBeVisible();
    await expect(page.getByText("良い一日")).toBeHidden();

    // 同じボタンを再度クリック
    await button.click();

    // 全てのトラックが再表示される
    await expect(page.getByText("最高の一日")).toBeVisible();
    await expect(page.getByText("良い一日")).toBeVisible();
    await expect(page.getByText("普通の一日")).toBeVisible();
  });

  test("コンディションとタグの複合フィルタリングができる", async ({ page }) => {
    await page.goto("/track");

    // コンディション +2 と +1 を選択（タグありの2件に該当）
    await page.getByRole("button", { name: "コンディション: +2" }).click();
    await page.getByRole("button", { name: "コンディション: +1" }).click();

    // 2件表示される
    await expect(page.getByText("最高の一日")).toBeVisible();
    await expect(page.getByText("良い一日")).toBeVisible();
    await expect(page.getByText("普通の一日")).toBeHidden();

    // タグツリーを展開
    await page.getByRole("button", { name: /テストカテゴリ/ }).click();

    // テストタグを選択
    await page.getByText("テストタグ").click();

    // コンディションとタグの両方に該当する2件が表示される
    await expect(page.getByText("最高の一日")).toBeVisible();
    await expect(page.getByText("良い一日")).toBeVisible();
    await expect(page.getByText("普通の一日")).toBeHidden();
    await expect(page.getByText("悪い一日")).toBeHidden();
    await expect(page.getByText("最悪の一日")).toBeHidden();
  });
});

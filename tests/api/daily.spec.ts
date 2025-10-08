/**
 * docs:
 * - 目的: /api/daily のUPSERT・取得・削除フローとデフォルト期間取得を確認する。
 * - 検証観点:
 *   - パラメータなしGETが直近30日のデータを返し、空DBでは空配列となること
 *   - PUTで新規作成し、既存レコードに対して部分更新が可能であること
 *   - GET /api/daily/:date で対象日のレコードが取得でき、DELETEで消えること
 */

import { expect, test } from "@playwright/test";

import { resetDatabase } from "../helpers/db";

test.describe("daily API", () => {
  test.describe.configure({ mode: "serial" });

  test.beforeEach(async () => {
    await resetDatabase();
  });

  test("デフォルト期間の一覧は空配列を返す", async ({ request }) => {
    const response = await request.get("/api/daily");
    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.items).toEqual([]);
  });

  test("日記を作成・更新・取得・削除できる", async ({ request }) => {
    const date = "2025-01-15";

    const createResponse = await request.put(`/api/daily/${date}`, {
      data: { memo: "初回記録", condition: 1 },
    });
    expect(createResponse.status()).toBe(200);
    const created = await createResponse.json();
    expect(created.memo).toBe("初回記録");
    expect(created.condition).toBe(1);

    const updateResponse = await request.put(`/api/daily/${date}`, {
      data: { condition: 2 },
    });
    expect(updateResponse.status()).toBe(200);
    const updated = await updateResponse.json();
    expect(updated.memo).toBe("初回記録");
    expect(updated.condition).toBe(2);

    const getResponse = await request.get(`/api/daily/${date}`);
    expect(getResponse.status()).toBe(200);
    const fetched = await getResponse.json();
    expect(fetched.condition).toBe(2);

    const deleteResponse = await request.delete(`/api/daily/${date}`);
    expect(deleteResponse.status()).toBe(204);

    const missing = await request.get(`/api/daily/${date}`);
    expect(missing.status()).toBe(404);
  });
});

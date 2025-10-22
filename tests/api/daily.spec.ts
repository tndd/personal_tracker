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

  test("睡眠記録（開始・終了時刻）を作成・更新できる", async ({ request }) => {
    const date = "2025-01-16";

    // 睡眠記録を含む日記を作成
    const createResponse = await request.put(`/api/daily/${date}`, {
      data: {
        memo: "睡眠記録テスト",
        condition: 1,
        sleepStart: "2025-01-15T23:00:00.000Z",
        sleepEnd: "2025-01-16T07:00:00.000Z",
      },
    });
    expect(createResponse.status()).toBe(200);
    const created = await createResponse.json();
    expect(created.memo).toBe("睡眠記録テスト");
    expect(created.condition).toBe(1);
    expect(created.sleepStart).toBe("2025-01-15T23:00:00.000Z");
    expect(created.sleepEnd).toBe("2025-01-16T07:00:00.000Z");

    // 睡眠終了時刻のみ更新
    const updateResponse = await request.put(`/api/daily/${date}`, {
      data: { sleepEnd: "2025-01-16T08:00:00.000Z" },
    });
    expect(updateResponse.status()).toBe(200);
    const updated = await updateResponse.json();
    expect(updated.sleepStart).toBe("2025-01-15T23:00:00.000Z");
    expect(updated.sleepEnd).toBe("2025-01-16T08:00:00.000Z");
    expect(updated.sleepStart).toBe("2025-01-15T23:00:00.000Z");

    // 睡眠記録をnullで削除
    const deleteResponse = await request.put(`/api/daily/${date}`, {
      data: {
        sleepStart: null,
        sleepEnd: null,
      },
    });
    expect(deleteResponse.status()).toBe(200);
    const deleted = await deleteResponse.json();
    expect(deleted.sleepStart).toBeNull();
    expect(deleted.sleepEnd).toBeNull();
  });
});

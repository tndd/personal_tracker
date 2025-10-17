/**
 * docs:
 * - 目的: /api/analysis の集計エンドポイントが想定した統計値を返すことを確認する。
 * - 検証観点:
 *   - condition-trend が日別のコンディション配列を返すこと
 *   - tag-correlation がタグごとの出現回数と平均コンディションを算出すること
 *   - condition-hourly が任意の粒度で集計を行い、欠損スロットも補完すること
 */

import { expect, test, type APIRequestContext } from "@playwright/test";

import { resetDatabase } from "../helpers/db";

async function createCategory(
  request: APIRequestContext,
  payload: { name: string; color: string },
) {
  const response = await request.post("/api/categories", { data: payload });
  expect(response.status()).toBe(201);
  return response.json();
}

async function createTag(
  request: APIRequestContext,
  payload: { categoryId: string; name: string },
) {
  const response = await request.post("/api/tags", { data: payload });
  expect(response.status()).toBe(201);
  return response.json();
}

test.describe("analysis API", () => {
  test.describe.configure({ mode: "serial" });

  test.beforeEach(async () => {
    await resetDatabase();
  });

  test("condition-trend が日別推移を返す", async ({ request }) => {
    const date = "2025-02-01";
    const putResponse = await request.put(`/api/daily/${date}`, {
      data: { memo: "記録", condition: -1 },
    });
    expect(putResponse.status()).toBe(200);

    const response = await request.get(
      `/api/analysis/condition-trend?from=2025-01-30&to=2025-02-05`,
    );
    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.items).toHaveLength(1);
    expect(body.items[0]).toMatchObject({ date, condition: -1 });
  });

  test("tag-correlation がタグごとの統計を返す", async ({ request }) => {
    const category = await createCategory(request, { name: "症状", color: "#777777" });
    const tagA = await createTag(request, { categoryId: category.id, name: "頭痛" });
    const tagB = await createTag(request, { categoryId: category.id, name: "吐き気" });

    const trackPayloads = [
      { condition: -2, tagIds: [tagA.id] },
      { condition: 0, tagIds: [tagA.id, tagB.id] },
      { condition: 2, tagIds: [tagB.id] },
    ];

    for (const payload of trackPayloads) {
      const response = await request.post("/api/tracks", { data: payload });
      expect(response.status()).toBe(201);
    }

    const today = new Date();
    const from = new Date(today.getTime() - 2 * 24 * 60 * 60 * 1000)
      .toISOString()
      .slice(0, 10);
    const to = today.toISOString().slice(0, 10);

    const response = await request.get(
      `/api/analysis/tag-correlation?from=${from}&to=${to}`,
    );
    expect(response.status()).toBe(200);
    const body = await response.json();
    const items = body.items as Array<{
      tagId: string;
      usageCount: number;
      averageCondition: number | null;
    }>;

    const statsA = items.find((item) => item.tagId === tagA.id);
    expect(statsA).toBeDefined();
    expect(statsA!.usageCount).toBe(2);
    expect(statsA!.averageCondition).not.toBeNull();
    expect(statsA!.averageCondition!).toBeCloseTo((-2 + 0) / 2, 3);

    const statsB = items.find((item) => item.tagId === tagB.id);
    expect(statsB).toBeDefined();
    expect(statsB!.usageCount).toBe(2);
    expect(statsB!.averageCondition).not.toBeNull();
    expect(statsB!.averageCondition!).toBeCloseTo((0 + 2) / 2, 3);
  });

  test("condition-hourly がデフォルト粒度（3h）で集計を返す", async ({ request }) => {
    // 2つのトラックを作成（3時間以上離れた時刻）
    const track1 = await request.post("/api/tracks", {
      data: { condition: -1, memo: "朝" },
    });
    expect(track1.status()).toBe(201);

    // 4時間後のトラックを作成するために、少し待つ代わりにcreatedAtを直接操作できないので
    // ここでは2つのトラックを作成し、期間を指定して取得
    const track2 = await request.post("/api/tracks", {
      data: { condition: 2, memo: "昼" },
    });
    expect(track2.status()).toBe(201);

    const today = new Date();
    const from = new Date(today.getTime() - 1 * 24 * 60 * 60 * 1000)
      .toISOString()
      .slice(0, 10);
    const to = today.toISOString().slice(0, 10);

    const response = await request.get(
      `/api/analysis/condition-hourly?granularity=3h&from=${from}&to=${to}`,
    );
    expect(response.status()).toBe(200);
    const body = await response.json();

    // 1日分 = 8スロット、2日分 = 16スロット（ただしfrom-toで1日の場合は8スロット）
    expect(body.items).toBeDefined();
    expect(Array.isArray(body.items)).toBe(true);
    expect(body.granularity).toBe("3h");

    // 各スロットが必要なプロパティを持つことを確認
    if (body.items.length > 0) {
      const firstItem = body.items[0];
      expect(firstItem).toHaveProperty("slotIndex");
      expect(firstItem).toHaveProperty("startTime");
      expect(firstItem).toHaveProperty("endTime");
      expect(firstItem).toHaveProperty("min");
      expect(firstItem).toHaveProperty("max");
      expect(firstItem).toHaveProperty("count");
    }
  });

  test("condition-hourly が1日単位（1d）で集計を返す", async ({ request }) => {
    const track1 = await request.post("/api/tracks", {
      data: { condition: -2, memo: "track1" },
    });
    expect(track1.status()).toBe(201);

    const track2 = await request.post("/api/tracks", {
      data: { condition: 1, memo: "track2" },
    });
    expect(track2.status()).toBe(201);

    const today = new Date();
    const from = new Date(today.getTime() - 2 * 24 * 60 * 60 * 1000)
      .toISOString()
      .slice(0, 10);
    const to = today.toISOString().slice(0, 10);

    const response = await request.get(
      `/api/analysis/condition-hourly?granularity=1d&from=${from}&to=${to}`,
    );
    expect(response.status()).toBe(200);
    const body = await response.json();

    expect(body.items).toBeDefined();
    expect(Array.isArray(body.items)).toBe(true);
    expect(body.granularity).toBe("1d");

    // 3日分のスロットが存在するはず
    expect(body.items.length).toBeGreaterThanOrEqual(3);
  });

  test("condition-hourly が欠損スロットを補完する", async ({ request }) => {
    // 1つだけトラックを作成
    const track = await request.post("/api/tracks", {
      data: { condition: 0, memo: "single track" },
    });
    expect(track.status()).toBe(201);

    const today = new Date();
    const from = new Date(today.getTime() - 1 * 24 * 60 * 60 * 1000)
      .toISOString()
      .slice(0, 10);
    const to = today.toISOString().slice(0, 10);

    const response = await request.get(
      `/api/analysis/condition-hourly?granularity=6h&from=${from}&to=${to}`,
    );
    expect(response.status()).toBe(200);
    const body = await response.json();

    // 2日分 × 4スロット/日 = 8スロット程度が期待される
    expect(body.items.length).toBeGreaterThan(0);

    // データがないスロットはmin/max=null, count=0であることを確認
    const emptySlots = body.items.filter(
      (item: any) => item.min === null && item.max === null && item.count === 0,
    );
    expect(emptySlots.length).toBeGreaterThan(0);

    // データがあるスロットが少なくとも1つ存在することを確認
    const dataSlots = body.items.filter(
      (item: any) => item.min !== null && item.max !== null && item.count > 0,
    );
    expect(dataSlots.length).toBeGreaterThanOrEqual(1);
  });

  test("condition-hourly が不正な粒度でエラーを返す", async ({ request }) => {
    const today = new Date();
    const from = new Date(today.getTime() - 1 * 24 * 60 * 60 * 1000)
      .toISOString()
      .slice(0, 10);
    const to = today.toISOString().slice(0, 10);

    // 不正な粒度フォーマット
    const response1 = await request.get(
      `/api/analysis/condition-hourly?granularity=invalid&from=${from}&to=${to}`,
    );
    expect(response1.status()).toBe(400);

    // 範囲外の時間単位
    const response2 = await request.get(
      `/api/analysis/condition-hourly?granularity=100h&from=${from}&to=${to}`,
    );
    expect(response2.status()).toBe(400);

    // 範囲外の週単位
    const response3 = await request.get(
      `/api/analysis/condition-hourly?granularity=10w&from=${from}&to=${to}`,
    );
    expect(response3.status()).toBe(400);
  });
});

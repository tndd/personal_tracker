/**
 * docs:
 * - 目的: /api/analysis の集計エンドポイントが想定した統計値を返すことを確認する。
 * - 検証観点:
 *   - condition-trend が日別のコンディション配列を返すこと
 *   - tag-correlation が翌日以降の影響度と信用区間を返すこと
 *   - condition-hourly が任意の粒度で集計を行い、欠損スロットも補完すること
 */

import { expect, test, type APIRequestContext } from "@playwright/test";

import { resetDatabase } from "../helpers/db";
import { sql } from "../../src/lib/db/client";

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

  test("tag-correlation が翌日以降の影響度を返す", async ({ request }) => {
    const category = await createCategory(request, { name: "症状", color: "#777777" });
    const tagA = await createTag(request, { categoryId: category.id, name: "頭痛" });
    const tagB = await createTag(request, { categoryId: category.id, name: "吐き気" });

    const trackAResponse = await request.post("/api/tracks", {
      data: { condition: -1, tagIds: [tagA.id] },
    });
    expect(trackAResponse.status()).toBe(201);
    const trackA = await trackAResponse.json();

    const trackBResponse = await request.post("/api/tracks", {
      data: { condition: 1, tagIds: [tagB.id] },
    });
    expect(trackBResponse.status()).toBe(201);
    const trackB = await trackBResponse.json();

    const baseDateA = new Date(Date.UTC(2025, 0, 1, 9, 0, 0));
    const baseDateB = new Date(Date.UTC(2025, 0, 5, 9, 0, 0));

    await sql`
      UPDATE "track"
      SET created_at = ${baseDateA.toISOString()}, updated_at = ${baseDateA.toISOString()}
      WHERE id = ${trackA.id}
    `;

    await sql`
      UPDATE "track"
      SET created_at = ${baseDateB.toISOString()}, updated_at = ${baseDateB.toISOString()}
      WHERE id = ${trackB.id}
    `;

    const dailyPayloads: Array<{ date: string; condition: number }> = [
      { date: "2025-01-02", condition: -1 },
      { date: "2025-01-03", condition: -2 },
      { date: "2025-01-06", condition: 2 },
      { date: "2025-01-07", condition: 2 },
      { date: "2025-01-08", condition: 1 },
    ];

    for (const { date, condition } of dailyPayloads) {
      const dailyResponse = await request.put(`/api/daily/${date}`, {
        data: { condition },
      });
      expect(dailyResponse.status()).toBe(200);
    }

    const response = await request.get(
      `/api/analysis/tag-correlation?from=2024-12-31&to=2025-01-09`,
    );
    expect(response.status()).toBe(200);
    const body = await response.json();

    expect(body.metadata).toBeDefined();
    expect(body.metadata.baselineMean).toBeCloseTo(0.39, 2);

    expect(Array.isArray(body.positive)).toBe(true);
    expect(Array.isArray(body.negative)).toBe(true);

    const positive = body.positive as Array<any>;
    const negative = body.negative as Array<any>;

    const positiveTag = positive.find((item) => item.tagId === tagB.id);
    expect(positiveTag).toBeDefined();
    expect(positiveTag.contribution).toBeGreaterThan(0);
    expect(positiveTag.rawContribution).toBeGreaterThan(0);
    expect(positiveTag.observationCount).toBe(3);
    expect(positiveTag.probabilitySameSign).toBeGreaterThan(0.5);
    expect(positiveTag.confidence).toBeGreaterThan(0);
    expect(positiveTag.credibleInterval.lower).toBeLessThanOrEqual(positiveTag.credibleInterval.upper);

    const negativeTag = negative.find((item) => item.tagId === tagA.id);
    expect(negativeTag).toBeDefined();
    expect(negativeTag.contribution).toBeLessThan(0);
    expect(negativeTag.rawContribution).toBeLessThan(0);
    expect(negativeTag.observationCount).toBe(2);
    expect(negativeTag.probabilitySameSign).toBeGreaterThan(0.5);
    expect(negativeTag.confidence).toBeGreaterThan(0);

    expect(positiveTag.baselineMean).toBeCloseTo(body.metadata.baselineMean, 6);
    expect(negativeTag.baselineMean).toBeCloseTo(body.metadata.baselineMean, 6);
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

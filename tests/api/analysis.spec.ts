/**
 * docs:
 * - 目的: /api/analysis の集計エンドポイントが想定した統計値を返すことを確認する。
 * - 検証観点:
 *   - condition-trend が日別のコンディション配列を返すこと
 *   - tag-correlation が翌日以降の影響度と信用区間を返すこと
 *   - condition-track がトラックベースの粒度別集計を返すこと
 *   - condition-daily が週次・月次のコンディション比率を算出すること
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
    expect(body.metadata.granularity).toBe("1d");
    expect(body.metadata.lagDays).toEqual([1, 2, 3]);

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

  test("tag-correlation が週次粒度でラグを切り替える", async ({ request }) => {
    const category = await createCategory(request, { name: "習慣", color: "#333333" });
    const tagPositive = await createTag(request, { categoryId: category.id, name: "運動" });
    const tagNegative = await createTag(request, { categoryId: category.id, name: "夜更かし" });

    const positiveTrackResponse = await request.post("/api/tracks", {
      data: { condition: 1, tagIds: [tagPositive.id] },
    });
    expect(positiveTrackResponse.status()).toBe(201);
    const positiveTrack = await positiveTrackResponse.json();

    const negativeTrackResponse = await request.post("/api/tracks", {
      data: { condition: -1, tagIds: [tagNegative.id] },
    });
    expect(negativeTrackResponse.status()).toBe(201);
    const negativeTrack = await negativeTrackResponse.json();

    const positiveBase = new Date(Date.UTC(2025, 0, 1, 9, 0, 0));
    const negativeBase = new Date(Date.UTC(2025, 1, 1, 9, 0, 0));

    await sql`
      UPDATE "track"
      SET created_at = ${positiveBase.toISOString()}, updated_at = ${positiveBase.toISOString()}
      WHERE id = ${positiveTrack.id}
    `;

    await sql`
      UPDATE "track"
      SET created_at = ${negativeBase.toISOString()}, updated_at = ${negativeBase.toISOString()}
      WHERE id = ${negativeTrack.id}
    `;

    const weeklyDaily = [
      { date: "2025-01-08", condition: 2 },
      { date: "2025-01-15", condition: 1 },
      { date: "2025-01-22", condition: 2 },
      { date: "2025-02-08", condition: -1 },
      { date: "2025-02-15", condition: -2 },
      { date: "2025-02-22", condition: -2 },
    ];

    for (const { date, condition } of weeklyDaily) {
      const putResponse = await request.put(`/api/daily/${date}`, { data: { condition } });
      expect(putResponse.status()).toBe(200);
    }

    const response = await request.get(
      `/api/analysis/tag-correlation?granularity=1w&from=2024-12-25&to=2025-02-25`,
    );
    expect(response.status()).toBe(200);
    const body = await response.json();

    expect(body.metadata.granularity).toBe("1w");
    expect(body.metadata.lagDays).toEqual([7, 14, 21]);
    expect(body.metadata.lagWeights).toHaveLength(3);
    expect(body.metadata.lagWeights[0]).toBeCloseTo(1, 2);
    expect(body.metadata.lagWeights[1]).toBeCloseTo(0.67, 2);
    expect(body.metadata.lagWeights[2]).toBeCloseTo(0.5, 2);

    const positive = (body.positive as Array<any>).find(
      (item) => item.tagId === tagPositive.id,
    );
    const negative = (body.negative as Array<any>).find(
      (item) => item.tagId === tagNegative.id,
    );

    expect(positive).toBeDefined();
    expect(negative).toBeDefined();

    expect(positive.occurrenceCount).toBe(1);
    expect(positive.observationCount).toBe(3);
    expect(positive.contribution).toBeGreaterThan(0);

    expect(negative.occurrenceCount).toBe(1);
    expect(negative.observationCount).toBe(3);
    expect(negative.contribution).toBeLessThan(0);
  });

  test("condition-track がデフォルト粒度（3h）で集計を返す", async ({ request }) => {
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
      `/api/analysis/condition-track?granularity=3h&from=${from}&to=${to}`,
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

  test("condition-track が1日単位（1d）で集計を返す", async ({ request }) => {
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
      `/api/analysis/condition-track?granularity=1d&from=${from}&to=${to}`,
    );
    expect(response.status()).toBe(200);
    const body = await response.json();

    expect(body.items).toBeDefined();
    expect(Array.isArray(body.items)).toBe(true);
    expect(body.granularity).toBe("1d");

    // 3日分のスロットが存在するはず
    expect(body.items.length).toBeGreaterThanOrEqual(3);
  });

  test("condition-track が欠損スロットを補完する", async ({ request }) => {
    // 1つだけトラックを作成し、直近スロットに収まるよう時刻を補正する
    const trackResponse = await request.post("/api/tracks", {
      data: { condition: 0, memo: "single track" },
    });
    expect(trackResponse.status()).toBe(201);
    const trackBody = await trackResponse.json();

    const now = new Date();
    const adjusted = new Date(now.getTime() - 3 * 60 * 60 * 1000);
    await sql`
      UPDATE "track"
      SET created_at = ${adjusted.toISOString()}, updated_at = ${adjusted.toISOString()}
      WHERE id = ${trackBody.id}
    `;

    const from = new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000)
      .toISOString()
      .slice(0, 10);
    const to = now.toISOString().slice(0, 10);

    const response = await request.get(
      `/api/analysis/condition-track?granularity=6h&from=${from}&to=${to}`,
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

  test("condition-daily が週単位でdaily比率を返す", async ({ request }) => {
    const weeklyDaily = [
      { date: "2025-01-01", condition: -1 },
      { date: "2025-01-02", condition: 2 },
      { date: "2025-01-04", condition: 2 },
      { date: "2025-01-09", condition: -2 },
      { date: "2025-01-10", condition: 0 },
    ];

    for (const payload of weeklyDaily) {
      const putResponse = await request.put(`/api/daily/${payload.date}`, {
        data: { condition: payload.condition },
      });
      expect(putResponse.status()).toBe(200);
    }

    const response = await request.get(
      "/api/analysis/condition-daily?granularity=1w&from=2025-01-01&to=2025-01-21",
    );
    expect(response.status()).toBe(200);

    const body = await response.json();
    expect(Array.isArray(body.items)).toBe(true);
    expect(body.granularity).toBe("1w");
    expect(body.items.length).toBeGreaterThanOrEqual(2);

    const firstSlot = body.items[0];
    expect(firstSlot.count).toBe(3);
    expect(firstSlot.ratios[2]).toBeCloseTo(2 / 3, 2);
    expect(firstSlot.ratios[-1]).toBeCloseTo(1 / 3, 2);

    const secondSlot = body.items[1];
    expect(secondSlot.count).toBe(2);
    expect(secondSlot.ratios[-2]).toBeCloseTo(0.5, 2);
    expect(secondSlot.ratios[0]).toBeCloseTo(0.5, 2);
  });

  test("condition-daily が月単位でdaily比率を返す", async ({ request }) => {
    const monthlyDaily = [
      { date: "2025-02-01", condition: 2 },
      { date: "2025-02-10", condition: 1 },
      { date: "2025-02-20", condition: -2 },
      { date: "2025-03-05", condition: -1 },
    ];

    for (const payload of monthlyDaily) {
      const putResponse = await request.put(`/api/daily/${payload.date}`, {
        data: { condition: payload.condition },
      });
      expect(putResponse.status()).toBe(200);
    }

    const response = await request.get(
      "/api/analysis/condition-daily?granularity=1m&from=2025-02-01&to=2025-03-15",
    );
    expect(response.status()).toBe(200);

    const body = await response.json();
    expect(body.granularity).toBe("1m");
    expect(body.items.length).toBeGreaterThanOrEqual(2);

    const firstSlot = body.items[0];
    expect(firstSlot.count).toBe(3);
    expect(firstSlot.ratios[2]).toBeCloseTo(1 / 3, 2);
    expect(firstSlot.ratios[1]).toBeCloseTo(1 / 3, 2);
    expect(firstSlot.ratios[-2]).toBeCloseTo(1 / 3, 2);

    const secondSlot = body.items[1];
    expect(secondSlot.count).toBe(1);
    expect(secondSlot.ratios[-1]).toBeCloseTo(1, 2);
  });

  test("condition-track が不正な粒度でエラーを返す", async ({ request }) => {
    const today = new Date();
    const from = new Date(today.getTime() - 1 * 24 * 60 * 60 * 1000)
      .toISOString()
      .slice(0, 10);
    const to = today.toISOString().slice(0, 10);

    // 不正な粒度フォーマット
    const response1 = await request.get(
      `/api/analysis/condition-track?granularity=invalid&from=${from}&to=${to}`,
    );
    expect(response1.status()).toBe(400);

    // 範囲外の時間単位
    const response2 = await request.get(
      `/api/analysis/condition-track?granularity=100h&from=${from}&to=${to}`,
    );
    expect(response2.status()).toBe(400);

    // 範囲外の週単位
    const response3 = await request.get(
      `/api/analysis/condition-track?granularity=10w&from=${from}&to=${to}`,
    );
    expect(response3.status()).toBe(400);
  });
});

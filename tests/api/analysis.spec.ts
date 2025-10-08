/**
 * docs:
 * - 目的: /api/analysis の集計エンドポイントが想定した統計値を返すことを確認する。
 * - 検証観点:
 *   - condition-trend が日別のコンディション配列を返すこと
 *   - tag-correlation がタグごとの出現回数と平均コンディションを算出すること
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
});

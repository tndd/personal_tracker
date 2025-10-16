/**
 * docs:
 * - 目的: /api/categories 系エンドポイントの主要フローを検証し、並び替えやアーカイブ等の仕様を担保する。
 * - 検証観点:
 *   - 初期状態での一覧取得と新規作成の結果が整合していること
 *   - PATCH による名称・色・アーカイブ状態の更新が反映され、デフォルト一覧ではアーカイブ済みが除外されること
 *   - 並び替えAPIが0始まりの連番制約を満たし、結果の順序が期待通りになること
 */

import { expect, test } from "@playwright/test";

import { resetDatabase } from "../helpers/db";

test.describe("categories API", () => {
  test.describe.configure({ mode: "serial" });

  test.beforeEach(async () => {
    await resetDatabase();
  });

  test("カテゴリを作成して一覧取得できる", async ({ request }) => {
    const initialResponse = await request.get("/api/categories");
    expect(initialResponse.status()).toBe(200);
    const initialBody = (await initialResponse.json()) as { items: unknown[] };
    expect(initialBody.items).toEqual([]);

    const createResponse = await request.post("/api/categories", {
      data: { name: "服薬", color: "#FFAA00" },
    });
    expect(createResponse.status()).toBe(201);
    const created = await createResponse.json();
    expect(created.name).toBe("服薬");
    expect(created.color).toBe("#FFAA00");
    expect(created.sortOrder).toBe(0);

    const listResponse = await request.get("/api/categories");
    expect(listResponse.status()).toBe(200);
    const listBody = await listResponse.json();
    expect(listBody.items).toHaveLength(1);
    expect(listBody.items[0].name).toBe("服薬");
  });

  test("カテゴリを更新してアーカイブ可能", async ({ request }) => {
    const createResponse = await request.post("/api/categories", {
      data: { name: "食事", color: "#00AAFF" },
    });
    const created = await createResponse.json();

    const archivedAt = new Date().toISOString();
    const patchResponse = await request.patch(`/api/categories/${created.id}`, {
      data: { name: "食習慣", color: "#00BBFF", archivedAt },
    });
    expect(patchResponse.status()).toBe(200);
    const patched = await patchResponse.json();
    expect(patched.name).toBe("食習慣");
    expect(patched.color).toBe("#00BBFF");
    expect(patched.archivedAt).not.toBeNull();

    const activeList = await request.get("/api/categories");
    const activeBody = await activeList.json();
    expect(activeBody.items).toHaveLength(0);

    const allList = await request.get("/api/categories?include_archived=true");
    const allBody = await allList.json();
    expect(allBody.items).toHaveLength(1);
    expect(allBody.items[0].name).toBe("食習慣");
  });

  test("カテゴリの並び替えが連番制約を満たす", async ({ request }) => {
    const createdIds: string[] = [];
    const payloads = ["コンディション", "症状", "生活"];
    for (let index = 0; index < payloads.length; index++) {
      const payload = payloads[index];
      const response = await request.post("/api/categories", {
        data: { name: payload, color: `#${index}${index}${index}${index}${index}${index}` },
      });
      const body = await response.json();
      createdIds.push(body.id);
    }

    const reorderResponse = await request.post("/api/categories/reorder", {
      data: {
        items: [
          { id: createdIds[2], sortOrder: 0 },
          { id: createdIds[0], sortOrder: 1 },
          { id: createdIds[1], sortOrder: 2 },
        ],
      },
    });
    expect(reorderResponse.status()).toBe(200);
    const reordered = await reorderResponse.json();
    expect(reordered.items.map((item: any) => item.id)).toEqual([
      createdIds[2],
      createdIds[0],
      createdIds[1],
    ]);
    expect(reordered.items.map((item: any) => item.sortOrder)).toEqual([0, 1, 2]);
  });
});

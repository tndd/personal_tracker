/**
 * docs:
 * - 目的: /api/tags 系エンドポイントの生成・更新・並び替え仕様を網羅的に確認する。
 * - 検証観点:
 *   - カテゴリ配下でのタグ作成と一覧取得の順序保証
 *   - PATCH による名称・アーカイブ・カテゴリ移動が適切に反映され、旧カテゴリの並びが再計算されること
 *   - 並び替えAPIがカテゴリ単位で0始まりの連番を要求し、結果の順序が一致すること
 */

import { expect, test, type APIRequestContext } from "@playwright/test";

import { resetDatabase } from "../helpers/db";

async function createCategory(
  request: APIRequestContext,
  payload: {
    name: string;
    color: string;
  },
) {
  const response = await request.post("/api/categories", { data: payload });
  expect(response.status()).toBe(201);
  return response.json();
}

test.describe("tags API", () => {
  test.describe.configure({ mode: "serial" });

  test.beforeEach(async () => {
    await resetDatabase();
  });

  test("タグを作成して一覧を取得できる", async ({ request }) => {
    const category = await createCategory(request, { name: "服薬", color: "#AA5500" });

    const createResponse = await request.post("/api/tags", {
      data: { categoryId: category.id, name: "デパス" },
    });
    expect(createResponse.status()).toBe(201);
    const created = await createResponse.json();
    expect(created.sortOrder).toBe(0);

    const listResponse = await request.get(
      `/api/tags?category_id=${category.id}&include_archived=false`,
    );
    const listBody = await listResponse.json();
    expect(listBody.items).toHaveLength(1);
    expect(listBody.items[0].name).toBe("デパス");
  });

  test("タグを更新しカテゴリ移動しても並びが保たれる", async ({ request }) => {
    const categoryA = await createCategory(request, { name: "症状", color: "#111111" });
    const categoryB = await createCategory(request, { name: "生活", color: "#222222" });

    const tagResponse = await request.post("/api/tags", {
      data: { categoryId: categoryA.id, name: "頭痛" },
    });
    const tag = await tagResponse.json();

    const archivedAt = new Date().toISOString();
    const patchResponse = await request.patch(`/api/tags/${tag.id}`, {
      data: { name: "後頭部痛", archivedAt, categoryId: categoryB.id },
    });
    expect(patchResponse.status()).toBe(200);
    const patched = await patchResponse.json();
    expect(patched.name).toBe("後頭部痛");
    expect(patched.categoryId).toBe(categoryB.id);
    expect(patched.archivedAt).not.toBeNull();

    const listA = await request.get(`/api/tags?category_id=${categoryA.id}`);
    const bodyA = await listA.json();
    expect(bodyA.items).toHaveLength(0);

    const listB = await request.get(
      `/api/tags?category_id=${categoryB.id}&include_archived=true`,
    );
    const bodyB = await listB.json();
    expect(bodyB.items).toHaveLength(1);
    expect(bodyB.items[0].name).toBe("後頭部痛");
    expect(bodyB.items[0].sortOrder).toBe(0);
  });

  test("タグの並び替えがカテゴリ単位で適用される", async ({ request }) => {
    const category = await createCategory(request, { name: "サプリ", color: "#333333" });

    const createdIds: string[] = [];
    for (const name of ["ビタミンC", "鉄分", "マグネシウム"]) {
      const response = await request.post("/api/tags", {
        data: { categoryId: category.id, name },
      });
      const body = await response.json();
      createdIds.push(body.id);
    }

    const reorderResponse = await request.post("/api/tags/reorder", {
      data: {
        items: [
          { id: createdIds[1], categoryId: category.id, sortOrder: 0 },
          { id: createdIds[2], categoryId: category.id, sortOrder: 1 },
          { id: createdIds[0], categoryId: category.id, sortOrder: 2 },
        ],
      },
    });
    expect(reorderResponse.status()).toBe(200);

    const listResponse = await request.get(`/api/tags?category_id=${category.id}`);
    const listBody = await listResponse.json();
    expect(listBody.items.map((item: any) => item.id)).toEqual([
      createdIds[1],
      createdIds[2],
      createdIds[0],
    ]);
    expect(listBody.items.map((item: any) => item.sortOrder)).toEqual([0, 1, 2]);
  });
});

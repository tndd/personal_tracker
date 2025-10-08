/**
 * docs:
 * - 目的: /api/tracks のCRUDとページング仕様、タグIDフィルタ処理を検証する。
 * - 検証観点:
 *   - POST時に存在しないタグIDが無視されること
 *   - PATCHでメモ・コンディション・タグが更新できること
 *   - GETがカーソル付きページングを行い、cursor指定で続きが取得できること
 *   - DELETEでレコードが削除され再取得できなくなること
 */

import { expect, test, type APIRequestContext } from "@playwright/test";
import { randomUUID } from "node:crypto";

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

test.describe("tracks API", () => {
  test.describe.configure({ mode: "serial" });

  test.beforeEach(async () => {
    await resetDatabase();
  });

  test("存在しないタグIDは無視して記録される", async ({ request }) => {
    const category = await createCategory(request, { name: "服薬", color: "#123456" });
    const tag = await createTag(request, { categoryId: category.id, name: "朝服薬" });

    const invalidId = randomUUID();
    const createResponse = await request.post("/api/tracks", {
      data: {
        memo: "朝の服薬を実施",
        condition: 1,
        tagIds: [tag.id, invalidId],
      },
    });
    expect(createResponse.status()).toBe(201);
    const created = await createResponse.json();
    expect(created.tagIds).toEqual([tag.id]);

    const listResponse = await request.get("/api/tracks?limit=10");
    const listBody = await listResponse.json();
    expect(listBody.items).toHaveLength(1);
    expect(listBody.items[0].tagIds).toEqual([tag.id]);
  });

  test("カーソルを利用したページングが行える", async ({ request }) => {
    await createCategory(request, { name: "症状", color: "#654321" });

    for (const memo of ["午前", "午後", "夜"]) {
      const response = await request.post("/api/tracks", {
        data: { memo: `${memo}の記録`, condition: 0 },
      });
      expect(response.status()).toBe(201);
    }

    const firstPage = await request.get("/api/tracks?limit=2");
    const firstBody = await firstPage.json();
    expect(firstBody.items).toHaveLength(2);
    expect(firstBody.nextCursor).toBeTruthy();

    const secondPage = await request.get(`/api/tracks?limit=2&cursor=${firstBody.nextCursor}`);
    const secondBody = await secondPage.json();
    expect(secondBody.items).toHaveLength(1);
    expect(secondBody.nextCursor).toBeNull();
  });

  test("トラックを更新できる", async ({ request }) => {
    const category = await createCategory(request, { name: "生活", color: "#abcdef" });
    const tag = await createTag(request, { categoryId: category.id, name: "運動" });

    const createResponse = await request.post("/api/tracks", {
      data: { memo: "朝散歩", condition: 0, tagIds: [tag.id] },
    });
    const created = await createResponse.json();

    const patchResponse = await request.patch(`/api/tracks/${created.id}`, {
      data: { memo: "朝ランニング", condition: 2, tagIds: [tag.id, randomUUID()] },
    });
    expect(patchResponse.status()).toBe(200);
    const patched = await patchResponse.json();
    expect(patched.memo).toBe("朝ランニング");
    expect(patched.condition).toBe(2);
    expect(patched.tagIds).toEqual([tag.id]);
  });

  test("トラックを削除できる", async ({ request }) => {
    await createCategory(request, { name: "日常", color: "#0f0f0f" });
    const createResponse = await request.post("/api/tracks", {
      data: { memo: "削除予定の記録" },
    });
    const created = await createResponse.json();

    const deleteResponse = await request.delete(`/api/tracks/${created.id}`);
    expect(deleteResponse.status()).toBe(204);

    const listResponse = await request.get("/api/tracks");
    const body = await listResponse.json();
    expect(body.items).toHaveLength(0);
  });
});

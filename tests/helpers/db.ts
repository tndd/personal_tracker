import { sql } from "../../src/lib/db/client";

/**
 * docs:
 * - 目的: Playwrightテスト実行前後にDB状態を初期化するユーティリティ。
 * - 検証観点: テーブル間の依存関係を考慮し、TRUNCATEで関連データをまとめて消去する。
 */
export async function resetDatabase() {
  await sql`TRUNCATE TABLE "track", "daily", "tag", "category" RESTART IDENTITY CASCADE;`;
}

export async function closeDatabase() {
  await sql.end({ timeout: 5 });
}

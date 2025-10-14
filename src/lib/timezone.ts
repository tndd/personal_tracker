/**
 * タイムゾーン処理のユーティリティ関数
 *
 * アプリケーション全体でJST（日本標準時）を基準として扱う。
 * データベースにはUTCで保存し、表示やフィルタリングはJSTで行う。
 */

const JST_OFFSET_MS = 9 * 60 * 60 * 1000; // 9時間をミリ秒で

/**
 * UTC DateオブジェクトをJSTの日付文字列（YYYY-MM-DD）に変換
 */
export function toJSTDateString(date: Date): string {
  const jstTime = new Date(date.getTime() + JST_OFFSET_MS);
  const year = jstTime.getUTCFullYear();
  const month = `${jstTime.getUTCMonth() + 1}`.padStart(2, "0");
  const day = `${jstTime.getUTCDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * JST日付文字列（YYYY-MM-DD）からUTC Dateオブジェクトを生成
 *
 * @param dateStr - JST基準の日付文字列（例: "2025-10-15"）
 * @param timeStr - 時刻文字列（例: "00:00:00" または "23:59:59"）デフォルトは "00:00:00"
 * @returns UTC Dateオブジェクト
 *
 * 例: "2025-10-15" + "00:00:00" → 2025-10-14T15:00:00.000Z (UTC)
 */
export function fromJSTDateString(dateStr: string, timeStr = "00:00:00"): Date {
  // JST時刻として解釈
  const jstDateTime = new Date(`${dateStr}T${timeStr}+09:00`);
  return jstDateTime;
}

/**
 * UTC DateオブジェクトからJSTの時刻スロット（0-7）を取得
 *
 * 3時間単位: 0=00-03h, 1=03-06h, 2=06-09h, 3=09-12h, 4=12-15h, 5=15-18h, 6=18-21h, 7=21-24h
 */
export function getJSTTimeSlot(date: Date): number {
  const jstTime = new Date(date.getTime() + JST_OFFSET_MS);
  const hours = jstTime.getUTCHours();
  return Math.floor(hours / 3);
}

/**
 * 現在のJST日付文字列を取得
 */
export function getCurrentJSTDateString(): string {
  return toJSTDateString(new Date());
}

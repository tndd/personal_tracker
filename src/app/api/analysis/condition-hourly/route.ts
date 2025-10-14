import { NextResponse } from "next/server";
import { and, gte, lte, isNotNull } from "drizzle-orm";
import { z } from "zod";

import { db } from "@/lib/db/client";
import { tracks } from "@/lib/db/schema";

const querySchema = z.object({
  from: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  to: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
});

function formatDate(date: Date) {
  const year = date.getUTCFullYear();
  const month = `${date.getUTCMonth() + 1}`.padStart(2, "0");
  const day = `${date.getUTCDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

// 3時間単位の区間を計算（0-3, 3-6, 6-9, 9-12, 12-15, 15-18, 18-21, 21-24）
function getTimeSlot(date: Date): number {
  // UTCから9時間を加算してJSTに変換
  const jstOffset = 9 * 60 * 60 * 1000;
  const jstTime = new Date(date.getTime() + jstOffset);
  const hours = jstTime.getUTCHours();
  return Math.floor(hours / 3);
}

function getDateKey(date: Date): string {
  // UTCから9時間を加算してJSTに変換
  const jstOffset = 9 * 60 * 60 * 1000;
  const jstTime = new Date(date.getTime() + jstOffset);
  const year = jstTime.getUTCFullYear();
  const month = `${jstTime.getUTCMonth() + 1}`.padStart(2, "0");
  const day = `${jstTime.getUTCDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const parsed = querySchema.safeParse(Object.fromEntries(params));

  if (!parsed.success) {
    return NextResponse.json(
      { message: "クエリパラメータが不正です", issues: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const today = new Date();
  const defaultTo = formatDate(today);
  const defaultFrom = formatDate(new Date(today.getTime() - 6 * 24 * 60 * 60 * 1000)); // 過去7日間

  const from = parsed.data.from ?? defaultFrom;
  const to = parsed.data.to ?? defaultTo;

  if (from > to) {
    return NextResponse.json(
      { message: "from は to より過去の日付を指定してください" },
      { status: 400 },
    );
  }

  // 期間内のtrackデータを取得
  const fromDate = new Date(`${from}T00:00:00`);
  const toDate = new Date(`${to}T23:59:59`);

  const data = await db
    .select({
      createdAt: tracks.createdAt,
      condition: tracks.condition,
    })
    .from(tracks)
    .where(
      and(
        gte(tracks.createdAt, fromDate),
        lte(tracks.createdAt, toDate),
        isNotNull(tracks.condition),
      ),
    )
    .orderBy(tracks.createdAt);

  // 3時間単位で集計
  const slotMap = new Map<string, { min: number; max: number; count: number }>();

  for (const item of data) {
    if (!item.createdAt || item.condition === null) continue;

    const date = new Date(item.createdAt);
    const dateKey = getDateKey(date);
    const slot = getTimeSlot(date);
    const key = `${dateKey}-${slot}`;

    const existing = slotMap.get(key);
    if (existing) {
      existing.min = Math.min(existing.min, item.condition);
      existing.max = Math.max(existing.max, item.condition);
      existing.count += 1;
    } else {
      slotMap.set(key, {
        min: item.condition,
        max: item.condition,
        count: 1,
      });
    }
  }

  // 結果を配列に変換
  const result = Array.from(slotMap.entries()).map(([key, value]) => {
    // keyは "2025-10-15-2" のような形式なので、最後の"-"で分割
    const lastDashIndex = key.lastIndexOf("-");
    const date = key.substring(0, lastDashIndex);
    const slot = parseInt(key.substring(lastDashIndex + 1), 10);
    return {
      date,
      slot,
      startHour: slot * 3,
      endHour: (slot + 1) * 3,
      min: value.min,
      max: value.max,
      count: value.count,
    };
  });

  // 日付とスロットでソート
  result.sort((a, b) => {
    const dateCompare = a.date.localeCompare(b.date);
    if (dateCompare !== 0) return dateCompare;
    return a.slot - b.slot;
  });

  return NextResponse.json({ items: result });
}

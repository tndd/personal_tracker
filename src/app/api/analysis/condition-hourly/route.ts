import { NextResponse } from "next/server";
import { and, gte, lte, isNotNull } from "drizzle-orm";
import { z } from "zod";

import { db } from "@/lib/db/client";
import { tracks } from "@/lib/db/schema";
import {
  toJSTDateString,
  fromJSTDateString,
  getJSTTimeSlot,
  getCurrentJSTDateString,
} from "@/lib/timezone";

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
  const defaultTo = getCurrentJSTDateString();
  const defaultFrom = toJSTDateString(new Date(today.getTime() - 6 * 24 * 60 * 60 * 1000)); // 過去7日間

  const from = parsed.data.from ?? defaultFrom;
  const to = parsed.data.to ?? defaultTo;

  if (from > to) {
    return NextResponse.json(
      { message: "from は to より過去の日付を指定してください" },
      { status: 400 },
    );
  }

  // JST日付文字列をUTC Dateオブジェクトに変換
  // from="2025-10-15" は JST 2025-10-15 00:00:00 を意味し、UTC 2025-10-14 15:00:00 になる
  const fromDate = fromJSTDateString(from, "00:00:00");
  const toDate = fromJSTDateString(to, "23:59:59");

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
    const dateKey = toJSTDateString(date);
    const slot = getJSTTimeSlot(date);
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

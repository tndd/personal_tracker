import { NextResponse } from "next/server";
import { and, gte, lte, isNotNull } from "drizzle-orm";
import { z } from "zod";

import { db } from "@/lib/db/client";
import { tracks } from "@/lib/db/schema";
import {
  toJSTDateString,
  fromJSTDateString,
  getCurrentJSTDateString,
} from "@/lib/timezone";

// 粒度のパース
function parseGranularity(gran: string): { value: number; unit: "h" | "d" | "w" } {
  const match = gran.match(/^(\d+)([hdw])$/);
  if (!match) {
    throw new Error("Invalid granularity format");
  }

  const value = parseInt(match[1], 10);
  const unit = match[2] as "h" | "d" | "w";

  // 合理的な範囲に制限
  if (unit === "h" && (value < 1 || value > 24)) {
    throw new Error("時間単位は1〜24の範囲で指定してください");
  }
  if (unit === "d" && (value < 1 || value > 30)) {
    throw new Error("日単位は1〜30の範囲で指定してください");
  }
  if (unit === "w" && (value < 1 || value > 4)) {
    throw new Error("週単位は1〜4の範囲で指定してください");
  }

  return { value, unit };
}

// 粒度をミリ秒に変換
function granularityToMs(gran: { value: number; unit: "h" | "d" | "w" }): number {
  const { value, unit } = gran;
  switch (unit) {
    case "h":
      return value * 60 * 60 * 1000;
    case "d":
      return value * 24 * 60 * 60 * 1000;
    case "w":
      return value * 7 * 24 * 60 * 60 * 1000;
  }
}

const querySchema = z.object({
  granularity: z
    .string()
    .regex(/^\d+[hdw]$/)
    .default("3h"),
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

  // 粒度のパース
  let granularity: { value: number; unit: "h" | "d" | "w" };
  try {
    granularity = parseGranularity(parsed.data.granularity);
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "粒度の指定が不正です" },
      { status: 400 },
    );
  }

  const granularityMs = granularityToMs(granularity);

  // デフォルト期間: 粒度の16区間分
  const today = new Date();
  const defaultTo = getCurrentJSTDateString();
  const defaultFrom = toJSTDateString(new Date(today.getTime() - granularityMs * 16));

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

  // 指定粒度で集計
  const slotMap = new Map<number, { min: number; max: number; count: number }>();

  for (const item of data) {
    if (!item.createdAt || item.condition === null) continue;

    const timestamp = new Date(item.createdAt).getTime();
    const slotIndex = Math.floor((timestamp - fromDate.getTime()) / granularityMs);

    const existing = slotMap.get(slotIndex);
    if (existing) {
      existing.min = Math.min(existing.min, item.condition);
      existing.max = Math.max(existing.max, item.condition);
      existing.count += 1;
    } else {
      slotMap.set(slotIndex, {
        min: item.condition,
        max: item.condition,
        count: 1,
      });
    }
  }

  // 全スロットを生成（欠損を補完）
  const totalSlots = Math.ceil((toDate.getTime() - fromDate.getTime()) / granularityMs);
  const result = [];

  for (let i = 0; i < totalSlots; i++) {
    const slotStart = new Date(fromDate.getTime() + i * granularityMs);
    const slotEnd = new Date(slotStart.getTime() + granularityMs);

    const data = slotMap.get(i);
    result.push({
      slotIndex: i,
      startTime: slotStart.toISOString(),
      endTime: slotEnd.toISOString(),
      min: data?.min ?? null,
      max: data?.max ?? null,
      count: data?.count ?? 0,
    });
  }

  return NextResponse.json({ items: result, granularity: parsed.data.granularity });
}

import { NextResponse } from "next/server";
import { and, gte, lte, isNotNull } from "drizzle-orm";
import { z } from "zod";

import { db } from "@/lib/db/client";
import { tracks, dailies } from "@/lib/db/schema";
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

  // tracks データ取得
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

  // dailies データ取得（睡眠情報）
  const sleepData = await db
    .select({
      date: dailies.date,
      sleepStart: dailies.sleepStart,
      sleepEnd: dailies.sleepEnd,
    })
    .from(dailies)
    .where(
      and(
        gte(dailies.date, from),
        lte(dailies.date, to),
        isNotNull(dailies.sleepStart),
        isNotNull(dailies.sleepEnd),
      ),
    )
    .orderBy(dailies.date);

  // 指定粒度で集計（コンディション）
  const slotMap = new Map<number, {
    min: number;
    max: number;
    count: number;
    counts: Record<number, number>; // 各コンディション値の出現回数
  }>();

  for (const item of data) {
    if (!item.createdAt || item.condition === null) continue;

    const timestamp = new Date(item.createdAt).getTime();
    const slotIndex = Math.floor((timestamp - fromDate.getTime()) / granularityMs);

    const existing = slotMap.get(slotIndex);
    if (existing) {
      existing.min = Math.min(existing.min, item.condition);
      existing.max = Math.max(existing.max, item.condition);
      existing.count += 1;
      existing.counts[item.condition] = (existing.counts[item.condition] || 0) + 1;
    } else {
      slotMap.set(slotIndex, {
        min: item.condition,
        max: item.condition,
        count: 1,
        counts: { [item.condition]: 1 },
      });
    }
  }

  // 睡眠データをスロットにマッピング
  const sleepMap = new Map<number, {
    totalHours: number;
    count: number;
    sleepStarts: Date[];
    sleepEnds: Date[];
  }>();

  for (const item of sleepData) {
    if (!item.sleepStart || !item.sleepEnd) continue;

    // 睡眠時間を計算（時間単位）
    const sleepHours = (new Date(item.sleepEnd).getTime() - new Date(item.sleepStart).getTime()) / (1000 * 60 * 60);

    // 日付文字列からスロットインデックスを計算
    const dateTimestamp = fromJSTDateString(item.date, "00:00:00").getTime();
    const slotIndex = Math.floor((dateTimestamp - fromDate.getTime()) / granularityMs);

    const existing = sleepMap.get(slotIndex);
    if (existing) {
      existing.totalHours += sleepHours;
      existing.count += 1;
      existing.sleepStarts.push(new Date(item.sleepStart));
      existing.sleepEnds.push(new Date(item.sleepEnd));
    } else {
      sleepMap.set(slotIndex, {
        totalHours: sleepHours,
        count: 1,
        sleepStarts: [new Date(item.sleepStart)],
        sleepEnds: [new Date(item.sleepEnd)],
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
    const sleep = sleepMap.get(i);

    // 各コンディション値の比率を計算
    const counts = data?.counts ?? {};
    const totalCount = data?.count ?? 0;
    const ratios: Record<number, number> = {};

    if (totalCount > 0) {
      for (let condition = -2; condition <= 2; condition++) {
        const count = counts[condition] || 0;
        ratios[condition] = count / totalCount;
      }
    }

    // 睡眠時間の平均を計算（粒度が日単位以上の場合は平均を取る）
    const avgSleepHours = sleep && sleep.count > 0 ? sleep.totalHours / sleep.count : null;

    // 就寝時刻と起床時刻の平均を計算
    let avgSleepStart: string | null = null;
    let avgSleepEnd: string | null = null;

    if (sleep && sleep.count > 0) {
      // 複数ある場合は平均時刻を計算
      const avgStartTime = sleep.sleepStarts.reduce((sum, d) => sum + d.getTime(), 0) / sleep.count;
      const avgEndTime = sleep.sleepEnds.reduce((sum, d) => sum + d.getTime(), 0) / sleep.count;
      avgSleepStart = new Date(avgStartTime).toISOString();
      avgSleepEnd = new Date(avgEndTime).toISOString();
    }

    result.push({
      slotIndex: i,
      startTime: slotStart.toISOString(),
      endTime: slotEnd.toISOString(),
      min: data?.min ?? null,
      max: data?.max ?? null,
      count: totalCount,
      counts: totalCount > 0 ? counts : {},
      ratios: totalCount > 0 ? ratios : {},
      sleepHours: avgSleepHours,
      sleepStart: avgSleepStart,
      sleepEnd: avgSleepEnd,
    });
  }

  return NextResponse.json({ items: result, granularity: parsed.data.granularity });
}

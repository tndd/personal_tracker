import { NextResponse } from "next/server";
import { and, gte, lte, isNotNull } from "drizzle-orm";
import { z } from "zod";

import { db } from "@/lib/db/client";
import { dailies } from "@/lib/db/schema";
import {
  fromJSTDateString,
  getCurrentJSTDateString,
  toJSTDateString,
} from "@/lib/timezone";

type SupportedGranularity = "1w" | "1m";

const GRANULARITY_TO_MS: Record<SupportedGranularity, number> = {
  "1w": 7 * 24 * 60 * 60 * 1000,
  "1m": 30 * 24 * 60 * 60 * 1000, // 月単位は30日換算で扱う
};

const querySchema = z.object({
  granularity: z.enum(["1w", "1m"]).default("1w"),
  from: z
    .string()
    .regex(/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/)
    .optional(),
  to: z
    .string()
    .regex(/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/)
    .optional(),
});

// このAPIは daily テーブルを対象に、週次・月次スロットごとのコンディション比率を返す。
export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const parsed = querySchema.safeParse(Object.fromEntries(params));

  if (!parsed.success) {
    return NextResponse.json(
      { message: "クエリパラメータが不正です", issues: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const { granularity } = parsed.data;
  const granularityMs = GRANULARITY_TO_MS[granularity];

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

  const fromDate = fromJSTDateString(from, "00:00:00");
  const toDate = fromJSTDateString(to, "23:59:59");

  const dailyRows = await db
    .select({
      date: dailies.date,
      condition: dailies.condition,
      sleepStart: dailies.sleepStart,
      sleepEnd: dailies.sleepEnd,
    })
    .from(dailies)
    .where(
      and(
        gte(dailies.date, from),
        lte(dailies.date, to),
        isNotNull(dailies.condition),
      ),
    )
    .orderBy(dailies.date);

  type SlotData = {
    min: number;
    max: number;
    count: number;
    counts: Record<number, number>;
    sleepTotalHours: number;
    sleepSampleCount: number;
    sleepStarts: Date[];
    sleepEnds: Date[];
  };

  const slotMap = new Map<number, SlotData>();

  for (const row of dailyRows) {
    const condition = row.condition;
    if (condition === null) {
      continue;
    }

    const dateTimestamp = fromJSTDateString(row.date, "00:00:00").getTime();
    const slotIndex = Math.floor((dateTimestamp - fromDate.getTime()) / granularityMs);
    if (slotIndex < 0) {
      continue;
    }

    const existing = slotMap.get(slotIndex);
    if (existing) {
      existing.min = Math.min(existing.min, condition);
      existing.max = Math.max(existing.max, condition);
      existing.count += 1;
      existing.counts[condition] = (existing.counts[condition] || 0) + 1;
    } else {
      slotMap.set(slotIndex, {
        min: condition,
        max: condition,
        count: 1,
        counts: { [condition]: 1 },
        sleepTotalHours: 0,
        sleepSampleCount: 0,
        sleepStarts: [],
        sleepEnds: [],
      });
    }

    if (row.sleepStart && row.sleepEnd) {
      const start = new Date(row.sleepStart);
      const end = new Date(row.sleepEnd);
      const hours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
      if (!Number.isNaN(hours) && hours >= 0) {
        const target = slotMap.get(slotIndex);
        if (target) {
          target.sleepTotalHours += hours;
          target.sleepSampleCount += 1;
          target.sleepStarts.push(start);
          target.sleepEnds.push(end);
        }
      }
    }
  }

  const totalSlots = Math.ceil((toDate.getTime() - fromDate.getTime()) / granularityMs);
  const items: Array<{
    slotIndex: number;
    startTime: string;
    endTime: string;
    min: number | null;
    max: number | null;
    count: number;
    counts: Record<number, number>;
    ratios: Record<number, number>;
    sleepHours: number | null;
    sleepStart: string | null;
    sleepEnd: string | null;
  }> = [];

  for (let i = 0; i < totalSlots; i++) {
    const slotStart = new Date(fromDate.getTime() + i * granularityMs);
    const slotEnd = new Date(slotStart.getTime() + granularityMs);

    const data = slotMap.get(i);
    const totalCount = data?.count ?? 0;
    const ratios: Record<number, number> = {};

    if (totalCount > 0) {
      for (let condition = -2; condition <= 2; condition++) {
        const count = data?.counts[condition] || 0;
        ratios[condition] = count / totalCount;
      }
    }

    let avgSleepHours: number | null = null;
    let avgSleepStart: string | null = null;
    let avgSleepEnd: string | null = null;

    if (data && data.sleepSampleCount > 0) {
      avgSleepHours = data.sleepTotalHours / data.sleepSampleCount;

      const avgStart =
        data.sleepStarts.reduce((sum, date) => sum + date.getTime(), 0) /
        data.sleepSampleCount;
      const avgEnd =
        data.sleepEnds.reduce((sum, date) => sum + date.getTime(), 0) /
        data.sleepSampleCount;

      avgSleepStart = new Date(avgStart).toISOString();
      avgSleepEnd = new Date(avgEnd).toISOString();
    }

    items.push({
      slotIndex: i,
      startTime: slotStart.toISOString(),
      endTime: slotEnd.toISOString(),
      min: data?.min ?? null,
      max: data?.max ?? null,
      count: totalCount,
      counts: totalCount > 0 ? data?.counts ?? {} : {},
      ratios: totalCount > 0 ? ratios : {},
      sleepHours: avgSleepHours,
      sleepStart: avgSleepStart,
      sleepEnd: avgSleepEnd,
    });
  }

  return NextResponse.json({ items, granularity });
}

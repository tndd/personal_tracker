import { NextResponse } from "next/server";
import { sql } from "drizzle-orm";
import { z } from "zod";

import { db } from "@/lib/db/client";
import { tags, tracks, dailies } from "@/lib/db/schema";

const querySchema = z.object({
  from: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  to: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  granularity: z.enum(["1d", "1w", "1m"]).optional(),
});

function formatDate(date: Date) {
  const year = date.getUTCFullYear();
  const month = `${date.getUTCMonth() + 1}`.padStart(2, "0");
  const day = `${date.getUTCDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function toTimestampRange(date: string, isEnd: boolean): Date {
  if (isEnd) {
    return new Date(`${date}T23:59:59.999Z`);
  }
  return new Date(`${date}T00:00:00.000Z`);
}

// 統計計算用の定数
const LAG_WEIGHTS = [1.0, 0.67, 0.5]; // 翌日, 翌々日, 3日後
const PRIOR_WEIGHT = 5; // ベイズ平均の仮想データ数
const PRIOR_MEAN = 0; // 事前仮定値
const CONFIDENCE_THRESHOLD = 10; // この回数で信頼度100%

// 時間減衰重み付き平均を計算
function calculateWeightedContribution(
  records: Array<{ day1: number | null; day2: number | null; day3: number | null }>,
): number {
  let weightedSum = 0;
  let totalWeight = 0;

  records.forEach((rec) => {
    if (rec.day1 !== null) {
      weightedSum += rec.day1 * LAG_WEIGHTS[0];
      totalWeight += LAG_WEIGHTS[0];
    }
    if (rec.day2 !== null) {
      weightedSum += rec.day2 * LAG_WEIGHTS[1];
      totalWeight += LAG_WEIGHTS[1];
    }
    if (rec.day3 !== null) {
      weightedSum += rec.day3 * LAG_WEIGHTS[2];
      totalWeight += LAG_WEIGHTS[2];
    }
  });

  return totalWeight > 0 ? weightedSum / totalWeight : 0;
}

// ベイズ平均で調整
function applyBayesianAdjustment(rawContribution: number, count: number): number {
  return (rawContribution * count + PRIOR_MEAN * PRIOR_WEIGHT) / (count + PRIOR_WEIGHT);
}

// 信頼度計算
function calculateConfidence(count: number): number {
  return Math.min(1, count / CONFIDENCE_THRESHOLD);
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
  const defaultFrom = formatDate(new Date(today.getTime() - 29 * 24 * 60 * 60 * 1000));

  const from = parsed.data.from ?? defaultFrom;
  const to = parsed.data.to ?? defaultTo;

  if (from > to) {
    return NextResponse.json(
      { message: "from は to より過去の日付を指定してください" },
      { status: 400 },
    );
  }

  const fromTimestamp = toTimestampRange(from, false).toISOString();
  const toTimestamp = toTimestampRange(to, true).toISOString();

  // SQLは単純なデータ取得のみ: trackが記録された日付、タグID、翌日以降3日間のdaily condition
  const result = await db.execute(sql`
    WITH track_tags AS (
      SELECT
        UNNEST(tag_ids) AS tag_id,
        DATE(created_at AT TIME ZONE 'UTC') AS track_date
      FROM track
      WHERE created_at BETWEEN ${fromTimestamp} AND ${toTimestamp}
        AND array_length(tag_ids, 1) > 0
    )
    SELECT
      tt.tag_id,
      tt.track_date,
      d1.condition AS day1_condition,
      d2.condition AS day2_condition,
      d3.condition AS day3_condition
    FROM track_tags tt
    LEFT JOIN daily d1 ON d1.date = tt.track_date + INTERVAL '1 day'
    LEFT JOIN daily d2 ON d2.date = tt.track_date + INTERVAL '2 days'
    LEFT JOIN daily d3 ON d3.date = tt.track_date + INTERVAL '3 days'
  `);

  // タグごとにグループ化
  const groupedByTag = new Map<
    string,
    Array<{ day1: number | null; day2: number | null; day3: number | null }>
  >();

  for (const row of result) {
    const tagId = row.tag_id as string;
    if (!groupedByTag.has(tagId)) {
      groupedByTag.set(tagId, []);
    }
    groupedByTag.get(tagId)!.push({
      day1: row.day1_condition !== null ? Number(row.day1_condition) : null,
      day2: row.day2_condition !== null ? Number(row.day2_condition) : null,
      day3: row.day3_condition !== null ? Number(row.day3_condition) : null,
    });
  }

  // タグ情報を取得
  const tagIds = Array.from(groupedByTag.keys());
  if (tagIds.length === 0) {
    return NextResponse.json({
      positive: [],
      negative: [],
      metadata: {
        priorWeight: PRIOR_WEIGHT,
        lagWeights: LAG_WEIGHTS,
        confidenceThreshold: CONFIDENCE_THRESHOLD,
      },
    });
  }

  const tagInfo = await db.execute(sql`
    SELECT id, name
    FROM tag
    WHERE id = ANY(${sql.raw(`ARRAY[${tagIds.map((id) => `'${id}'`).join(",")}]::uuid[]`)})
  `);

  const tagIdToName = new Map<string, string>();
  for (const row of tagInfo) {
    tagIdToName.set(row.id as string, row.name as string);
  }

  // 各タグについて統計計算
  const results = Array.from(groupedByTag.entries()).map(([tagId, records]) => {
    const rawContribution = calculateWeightedContribution(records);
    const adjustedContribution = applyBayesianAdjustment(rawContribution, records.length);
    const confidence = calculateConfidence(records.length);

    return {
      tagId,
      tagName: tagIdToName.get(tagId) ?? "Unknown",
      occurrenceCount: records.length,
      contribution: adjustedContribution,
      rawContribution,
      confidence,
    };
  });

  // プラス寄与とマイナス寄与に分類し、|寄与度| × 信頼度 でソート
  const positive = results
    .filter((r) => r.contribution > 0)
    .sort((a, b) => Math.abs(b.contribution) * b.confidence - Math.abs(a.contribution) * a.confidence);

  const negative = results
    .filter((r) => r.contribution < 0)
    .sort((a, b) => Math.abs(b.contribution) * b.confidence - Math.abs(a.contribution) * a.confidence);

  return NextResponse.json({
    positive,
    negative,
    metadata: {
      priorWeight: PRIOR_WEIGHT,
      lagWeights: LAG_WEIGHTS,
      confidenceThreshold: CONFIDENCE_THRESHOLD,
    },
  });
}

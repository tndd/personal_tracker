import { NextResponse } from "next/server";
import { sql } from "drizzle-orm";
import { z } from "zod";

import { db } from "@/lib/db/client";

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
const PRIOR_WEIGHT = 5; // 事前仮定の仮想サンプル数
const PRIOR_MEAN = 0; // ベースラインとの差分に対する事前平均
const PRIOR_VARIANCE = 1; // 事前分散（条件値のレンジに合わせた緩やかな幅）

type LagRecord = { day1: number | null; day2: number | null; day3: number | null };

type ObservationStats = {
  trackCount: number;
  observationCount: number;
  totalWeight: number;
  weightedSum: number;
  sumWeightsSquared: number;
  weightedVariance: number;
  effectiveCount: number;
  rawMean: number | null;
};

// ラグごとの値を重み付きで集計し、平均や有効サンプル数を算出
function extractObservationStats(records: LagRecord[]): ObservationStats {
  const weightedValues: Array<{ value: number; weight: number }> = [];

  let observationCount = 0;
  let totalWeight = 0;
  let weightedSum = 0;
  let sumWeightsSquared = 0;

  records.forEach((rec) => {
    const values = [rec.day1, rec.day2, rec.day3] as const;

    values.forEach((value, index) => {
      if (value === null || Number.isNaN(value)) {
        return;
      }
      const weight = LAG_WEIGHTS[index];
      observationCount += 1;
      totalWeight += weight;
      weightedSum += value * weight;
      sumWeightsSquared += weight * weight;
      weightedValues.push({ value, weight });
    });
  });

  if (totalWeight === 0) {
    return {
      trackCount: records.length,
      observationCount,
      totalWeight,
      weightedSum,
      sumWeightsSquared,
      weightedVariance: 0,
      effectiveCount: 0,
      rawMean: null,
    };
  }

  const rawMean = weightedSum / totalWeight;
  let varianceNumerator = 0;
  weightedValues.forEach(({ value, weight }) => {
    const diff = value - rawMean;
    varianceNumerator += weight * diff * diff;
  });

  const weightedVariance = varianceNumerator / totalWeight;
  const effectiveCount =
    sumWeightsSquared > 0 ? (totalWeight * totalWeight) / sumWeightsSquared : 0;

  return {
    trackCount: records.length,
    observationCount,
    totalWeight,
    weightedSum,
    sumWeightsSquared,
    weightedVariance,
    effectiveCount,
    rawMean,
  };
}

// 標準正規分布の累積分布関数
function normalCdf(x: number): number {
  return 0.5 * (1 + erf(x / Math.sqrt(2)));
}

// 誤差関数（数値近似）
function erf(x: number): number {
  // Abramowitz and Stegun 7.1.26 に基づく近似
  const sign = Math.sign(x);
  const absX = Math.abs(x);
  const t = 1 / (1 + 0.5 * absX);
  const tau = t * Math.exp(
    -absX * absX -
      1.26551223 +
      1.00002368 * t +
      0.37409196 * t * t +
      0.09678418 * t ** 3 -
      0.18628806 * t ** 4 +
      0.27886807 * t ** 5 -
      1.13520398 * t ** 6 +
      1.48851587 * t ** 7 -
      0.82215223 * t ** 8 +
      0.17087277 * t ** 9,
  );
  const approximation = 1 - tau;
  return sign * approximation;
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
        priorMean: PRIOR_MEAN,
        priorVariance: PRIOR_VARIANCE,
        lagWeights: LAG_WEIGHTS,
        baselineMean: 0,
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

  const statsByTag = new Map<
    string,
    ObservationStats & {
      rawContribution: number;
      adjustedContribution: number;
      confidence: number;
      probability: number;
      credibleInterval: { lower: number; upper: number };
    }
  >();

  let globalWeightedSum = 0;
  let globalTotalWeight = 0;

  // まずタグごとの観測統計と全体平均を算出
  for (const [tagId, records] of Array.from(groupedByTag.entries())) {
    const stats = extractObservationStats(records);
    statsByTag.set(tagId, {
      ...stats,
      rawContribution: 0,
      adjustedContribution: 0,
      confidence: 0,
      probability: 0,
      credibleInterval: { lower: 0, upper: 0 },
    });
    globalWeightedSum += stats.weightedSum;
    globalTotalWeight += stats.totalWeight;
  }

  const baselineMean = globalTotalWeight > 0 ? globalWeightedSum / globalTotalWeight : 0;

  // 各タグについてベイズ推定に基づく寄与度を計算
  for (const [tagId, stats] of Array.from(statsByTag.entries())) {
    const rawContribution =
      stats.rawMean !== null ? stats.rawMean - baselineMean : 0;
    const effectiveCount = stats.effectiveCount;
    const posteriorWeight = effectiveCount + PRIOR_WEIGHT;

    const posteriorMean =
      posteriorWeight > 0
        ? (rawContribution * effectiveCount + PRIOR_MEAN * PRIOR_WEIGHT) / posteriorWeight
        : PRIOR_MEAN;

    const varianceComponent =
      effectiveCount > 0 && stats.weightedVariance > 0
        ? stats.weightedVariance
        : PRIOR_VARIANCE;

    const posteriorVarianceNumerator =
      varianceComponent * effectiveCount + PRIOR_VARIANCE * PRIOR_WEIGHT;

    const posteriorVariance =
      posteriorWeight > 0 ? posteriorVarianceNumerator / posteriorWeight : PRIOR_VARIANCE;

    const posteriorStd =
      posteriorWeight > 0 ? Math.sqrt(posteriorVariance / posteriorWeight) : Math.sqrt(PRIOR_VARIANCE);

    const zScore = posteriorStd > 0 ? posteriorMean / posteriorStd : Number.POSITIVE_INFINITY;
    const probability = Number.isFinite(zScore)
      ? normalCdf(Math.abs(zScore))
      : 1;
    const confidence = Math.max(0, Math.min(1, (probability - 0.5) * 2));

    const ciHalfWidth = posteriorStd * 1.96;
    const credibleInterval = {
      lower: posteriorMean - ciHalfWidth,
      upper: posteriorMean + ciHalfWidth,
    };

    statsByTag.set(tagId, {
      ...stats,
      rawContribution,
      adjustedContribution: posteriorMean,
      confidence,
      probability,
      credibleInterval,
    });
  }

  const results = Array.from(statsByTag.entries()).map(([tagId, stats]) => ({
    tagId,
    tagName: tagIdToName.get(tagId) ?? "Unknown",
    occurrenceCount: stats.trackCount,
    observationCount: stats.observationCount,
    effectiveSampleSize: stats.effectiveCount,
    totalWeight: stats.totalWeight,
    rawMean: stats.rawMean,
    baselineMean,
    contribution: stats.adjustedContribution,
    rawContribution: stats.rawContribution,
    confidence: stats.confidence,
    probabilitySameSign: stats.probability,
    credibleInterval: stats.credibleInterval,
  }));

  // プラス寄与とマイナス寄与に分類し、|寄与度| でソート
  const positive = results
    .filter((r) => r.contribution > 0)
    .sort((a, b) => Math.abs(b.contribution) - Math.abs(a.contribution));

  const negative = results
    .filter((r) => r.contribution < 0)
    .sort((a, b) => Math.abs(b.contribution) - Math.abs(a.contribution));

  return NextResponse.json({
    positive,
    negative,
    metadata: {
      priorWeight: PRIOR_WEIGHT,
      priorMean: PRIOR_MEAN,
      priorVariance: PRIOR_VARIANCE,
      lagWeights: LAG_WEIGHTS,
      baselineMean,
    },
  });
}

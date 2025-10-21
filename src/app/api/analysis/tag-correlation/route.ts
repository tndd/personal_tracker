import { NextResponse } from "next/server";
import { sql } from "drizzle-orm";
import { z } from "zod";

import { db } from "@/lib/db/client";

type Granularity = "1d" | "1w" | "1m";

const BASE_LAG_DAYS = [1, 2, 3] as const;
const BASE_LAG_WEIGHTS = [1.0, 0.67, 0.5] as const;

const GRANULARITY_CONFIG: Record<Granularity, { lagDays: number[]; lagWeights: number[] }> = {
  "1d": {
    lagDays: Array.from(BASE_LAG_DAYS),
    lagWeights: Array.from(BASE_LAG_WEIGHTS),
  },
  "1w": {
    lagDays: BASE_LAG_DAYS.map((day) => day * 7),
    lagWeights: Array.from(BASE_LAG_WEIGHTS),
  },
  "1m": {
    lagDays: BASE_LAG_DAYS.map((day) => day * 30),
    lagWeights: Array.from(BASE_LAG_WEIGHTS),
  },
};

const querySchema = z.object({
  from: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  to: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  granularity: z.enum(["1d", "1w", "1m"]).default("1d"),
  priorWeight: z.coerce.number().positive().optional().default(5),
  priorMean: z.coerce.number().optional().default(0),
  priorVariance: z.coerce.number().positive().optional().default(1),
  lagWeight0: z.coerce.number().min(0).max(1).optional().default(1.0),
  lagWeight1: z.coerce.number().min(0).max(1).optional().default(0.67),
  lagWeight2: z.coerce.number().min(0).max(1).optional().default(0.5),
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
const PRIOR_WEIGHT = 5; // 事前仮定の仮想サンプル数
const PRIOR_MEAN = 0; // ベースラインとの差分に対する事前平均
const PRIOR_VARIANCE = 1; // 事前分散（条件値のレンジに合わせた緩やかな幅）

type LagRecord = Array<number | null>;

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
function extractObservationStats(records: LagRecord[], lagWeights: number[]): ObservationStats {
  const weightedValues: Array<{ value: number; weight: number }> = [];

  let observationCount = 0;
  let totalWeight = 0;
  let weightedSum = 0;
  let sumWeightsSquared = 0;

  records.forEach((values) => {
    values.forEach((value, index) => {
      if (index >= lagWeights.length) {
        return;
      }
      if (value === null || Number.isNaN(value)) {
        return;
      }
      const weight = lagWeights[index];
      if (weight <= 0) {
        return;
      }

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

  const granularity = parsed.data.granularity;
  const config = GRANULARITY_CONFIG[granularity];
  const { lagDays } = config;

  // クエリパラメータからラグ重みを取得
  const lagWeights = [
    parsed.data.lagWeight0,
    parsed.data.lagWeight1,
    parsed.data.lagWeight2,
  ];

  // クエリパラメータから事前分布パラメータを取得
  const priorWeight = parsed.data.priorWeight;
  const priorMean = parsed.data.priorMean;
  const priorVariance = parsed.data.priorVariance;

  if (lagDays.length === 0 || lagWeights.length === 0) {
    return NextResponse.json({
      positive: [],
      negative: [],
      metadata: {
        priorWeight,
        priorMean,
        priorVariance,
        lagWeights: [],
        lagDays: [],
        baselineMean: 0,
        granularity,
      },
    });
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

  const lagDaysArrayLiteral = lagDays.join(", ");
  const result = await db.execute(sql`
    WITH track_tags AS (
      SELECT
        id AS track_id,
        UNNEST(tag_ids) AS tag_id,
        DATE(created_at AT TIME ZONE 'UTC') AS track_date
      FROM track
      WHERE created_at BETWEEN ${fromTimestamp} AND ${toTimestamp}
        AND array_length(tag_ids, 1) > 0
    ),
    lag_series AS (
      SELECT UNNEST(${sql.raw(`ARRAY[${lagDaysArrayLiteral}]::int[]`)}) AS day_offset
    )
    SELECT
      tt.tag_id,
      tt.track_id,
      tt.track_date,
      lag_series.day_offset,
      d.condition AS lag_condition
    FROM track_tags tt
    CROSS JOIN lag_series
    LEFT JOIN daily d ON d.date = tt.track_date + lag_series.day_offset
  `);

  // タグごとにグループ化（track_id + 日付単位で一意に扱う）
  const groupedByTag = new Map<string, Map<string, LagRecord>>();

  for (const row of result as Array<Record<string, unknown>>) {
    const tagId = row.tag_id as string | undefined;
    if (!tagId) {
      continue;
    }

    const trackId = row.track_id as string | undefined;
    if (!trackId) {
      continue;
    }

    const trackDateValue = row.track_date;
    const trackDateKey = trackDateValue instanceof Date
      ? trackDateValue.toISOString().slice(0, 10)
      : String(trackDateValue);

    const dayOffsetRaw = row.day_offset;
    const dayOffset = typeof dayOffsetRaw === "number" ? dayOffsetRaw : Number(dayOffsetRaw);
    if (!Number.isFinite(dayOffset)) {
      continue;
    }

    const recordMap = groupedByTag.get(tagId) ?? new Map<string, LagRecord>();
    if (!groupedByTag.has(tagId)) {
      groupedByTag.set(tagId, recordMap);
    }

    const recordKey = `${trackId}:${trackDateKey}`;
    const record = recordMap.get(recordKey) ?? Array(lagDays.length).fill(null);

    const index = lagDays.indexOf(dayOffset);
    if (index !== -1) {
      const conditionRaw = row.lag_condition;
      if (conditionRaw != null) {
        const conditionValue =
          typeof conditionRaw === "number" ? conditionRaw : Number(conditionRaw);
        if (!Number.isNaN(conditionValue)) {
          record[index] = conditionValue;
        }
      }
    }

    if (!recordMap.has(recordKey)) {
      recordMap.set(recordKey, record);
    }
  }

  const tagIds = Array.from(groupedByTag.keys());
  if (tagIds.length === 0) {
    return NextResponse.json({
      positive: [],
      negative: [],
      metadata: {
        priorWeight,
        priorMean,
        priorVariance,
        lagWeights,
        lagDays,
        baselineMean: 0,
        granularity,
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

  for (const [tagId, recordMap] of Array.from(groupedByTag.entries())) {
    const records = Array.from(recordMap.values());
    const stats = extractObservationStats(records, lagWeights);
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

  for (const [tagId, stats] of Array.from(statsByTag.entries())) {
    const rawContribution = stats.rawMean !== null ? stats.rawMean - baselineMean : 0;
    const effectiveCount = stats.effectiveCount;
    const posteriorWeight = effectiveCount + priorWeight;

    const posteriorMean =
      posteriorWeight > 0
        ? (rawContribution * effectiveCount + priorMean * priorWeight) / posteriorWeight
        : priorMean;

    const varianceComponent =
      effectiveCount > 0 && stats.weightedVariance > 0
        ? stats.weightedVariance
        : priorVariance;

    const posteriorVarianceNumerator =
      varianceComponent * effectiveCount + priorVariance * priorWeight;

    const posteriorVariance =
      posteriorWeight > 0 ? posteriorVarianceNumerator / posteriorWeight : priorVariance;

    const posteriorStd =
      posteriorWeight > 0
        ? Math.sqrt(posteriorVariance / posteriorWeight)
        : Math.sqrt(priorVariance);

    const zScore = posteriorStd > 0 ? posteriorMean / posteriorStd : Number.POSITIVE_INFINITY;
    const probability = Number.isFinite(zScore) ? normalCdf(Math.abs(zScore)) : 1;
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
      priorWeight,
      priorMean,
      priorVariance,
      lagWeights,
      lagDays,
      baselineMean,
      granularity,
    },
  });
}

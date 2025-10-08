import { NextResponse } from "next/server";
import { sql } from "drizzle-orm";
import { z } from "zod";

import { db } from "@/lib/db/client";
import { tags, tracks } from "@/lib/db/schema";

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

function toTimestampRange(date: string, isEnd: boolean): Date {
  if (isEnd) {
    return new Date(`${date}T23:59:59.999Z`);
  }
  return new Date(`${date}T00:00:00.000Z`);
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

  const fromTimestamp = toTimestampRange(from, false);
  const toTimestamp = toTimestampRange(to, true);

  const result = await db.execute(
    sql`
      SELECT
        tag.id AS tag_id,
        tag.name AS tag_name,
        stats.usage_count,
        stats.avg_condition
      FROM ${tags} AS tag
      JOIN (
        SELECT
          UNNEST(${tracks.tagIds}) AS tag_id,
          COUNT(*)::int AS usage_count,
          AVG(${tracks.condition})::float AS avg_condition
        FROM ${tracks}
        WHERE ${tracks.createdAt} BETWEEN ${fromTimestamp} AND ${toTimestamp}
        GROUP BY tag_id
      ) AS stats
        ON stats.tag_id = tag.id
      ORDER BY stats.usage_count DESC, tag.name ASC
    `,
  );

  const items = Array.from(result).map((row) => ({
    tagId: row.tag_id as string,
    tagName: row.tag_name as string,
    usageCount: Number(row.usage_count ?? 0),
    averageCondition: row.avg_condition !== null ? Number(row.avg_condition) : null,
  }));

  return NextResponse.json({ items });
}

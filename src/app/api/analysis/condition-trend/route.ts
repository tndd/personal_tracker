import { NextResponse } from "next/server";
import { and, gte, lte } from "drizzle-orm";
import { z } from "zod";

import { db } from "@/lib/db/client";
import { dailies } from "@/lib/db/schema";

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

  const data = await db
    .select({
      date: dailies.date,
      condition: dailies.condition,
    })
    .from(dailies)
    .where(and(gte(dailies.date, from), lte(dailies.date, to)))
    .orderBy(dailies.date);

  return NextResponse.json({ items: data });
}

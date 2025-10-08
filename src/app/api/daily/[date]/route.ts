import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { z } from "zod";

import { db } from "@/lib/db/client";
import { dailies } from "@/lib/db/schema";

const paramsSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

const upsertSchema = z
  .object({
    memo: z.string().max(5000).optional(),
    condition: z.number().int().min(-2).max(2).optional(),
  })
  .refine(
    (value) => Object.keys(value).length > 0,
    "いずれかの項目を指定してください",
  );

type RouteContext = {
  params: { date: string };
};

export async function GET(_request: Request, context: RouteContext) {
  const parsedParams = paramsSchema.safeParse(context.params);
  if (!parsedParams.success) {
    return NextResponse.json(
      { message: "日付が不正です", issues: parsedParams.error.flatten() },
      { status: 400 },
    );
  }

  const [record] = await db
    .select()
    .from(dailies)
    .where(eq(dailies.date, parsedParams.data.date))
    .limit(1);

  if (!record) {
    return NextResponse.json({ message: "日記が見つかりません" }, { status: 404 });
  }

  return NextResponse.json(record);
}

export async function PUT(request: Request, context: RouteContext) {
  const parsedParams = paramsSchema.safeParse(context.params);
  if (!parsedParams.success) {
    return NextResponse.json(
      { message: "日付が不正です", issues: parsedParams.error.flatten() },
      { status: 400 },
    );
  }

  const body = await request.json().catch(() => null);
  const parsed = upsertSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { message: "入力値が不正です", issues: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const [existing] = await db
    .select()
    .from(dailies)
    .where(eq(dailies.date, parsedParams.data.date))
    .limit(1);

  const memo = parsed.data.memo ?? existing?.memo ?? null;
  const condition = parsed.data.condition ?? existing?.condition ?? 0;
  const now = new Date();

  const [record] = await db
    .insert(dailies)
    .values({
      date: parsedParams.data.date,
      memo,
      condition,
      createdAt: now,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: dailies.date,
      set: {
        memo,
        condition,
        updatedAt: now,
      },
    })
    .returning();

  return NextResponse.json(record);
}

export async function DELETE(_request: Request, context: RouteContext) {
  const parsedParams = paramsSchema.safeParse(context.params);
  if (!parsedParams.success) {
    return NextResponse.json(
      { message: "日付が不正です", issues: parsedParams.error.flatten() },
      { status: 400 },
    );
  }

  const result = await db
    .delete(dailies)
    .where(eq(dailies.date, parsedParams.data.date))
    .returning({ date: dailies.date });

  if (result.length === 0) {
    return NextResponse.json({ message: "日記が見つかりません" }, { status: 404 });
  }

  return new NextResponse(null, { status: 204 });
}

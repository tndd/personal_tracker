import { NextResponse } from "next/server";
import { desc, inArray, lt, sql } from "drizzle-orm";
import { z } from "zod";

import { db } from "@/lib/db/client";
import { tags, tracks } from "@/lib/db/schema";

const querySchema = z.object({
  limit: z
    .string()
    .transform((value) => Number.parseInt(value, 10))
    .pipe(z.number().int().min(1).max(100))
    .optional(),
  cursor: z
    .string()
    .datetime({ offset: true })
    .transform((value) => new Date(value))
    .optional(),
});

const createSchema = z.object({
  memo: z.string().max(1000).optional(),
  condition: z.number().int().min(-2).max(2).optional(),
  tagIds: z.array(z.string().uuid()).max(100).optional(),
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

  const limit = parsed.data.limit ?? 50;
  const cursorDate = parsed.data.cursor;

  const rows = await db
    .select()
    .from(tracks)
    .where(cursorDate ? lt(tracks.createdAt, cursorDate) : undefined)
    .orderBy(desc(tracks.createdAt), desc(tracks.id))
    .limit(limit + 1);

  const hasNext = rows.length > limit;
  const items = hasNext ? rows.slice(0, limit) : rows;
  const lastItem = hasNext && items.length > 0 ? items[items.length - 1] : null;
  const nextCursor = lastItem?.createdAt ? lastItem.createdAt.toISOString() : null;

  return NextResponse.json({
    items,
    nextCursor,
  });
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = createSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { message: "入力値が不正です", issues: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const now = new Date();
  const uniqueTagIds = Array.from(new Set(parsed.data.tagIds ?? []));

  let filteredTagIds: string[] = [];
  if (uniqueTagIds.length > 0) {
    const existing = await db
      .select({ id: tags.id })
      .from(tags)
      .where(inArray(tags.id, uniqueTagIds));

    const existingSet = new Set(existing.map((row) => row.id));
    filteredTagIds = uniqueTagIds.filter((id) => existingSet.has(id));
  }

  const [created] = await db
    .insert(tracks)
    .values({
      memo: parsed.data.memo,
      condition: parsed.data.condition ?? 0,
      tagIds: filteredTagIds.length > 0 ? filteredTagIds : sql`'{}'::uuid[]`,
      createdAt: now,
      updatedAt: now,
    })
    .returning();

  return NextResponse.json(created, { status: 201 });
}

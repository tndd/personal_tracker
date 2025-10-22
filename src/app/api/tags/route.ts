import { NextResponse } from "next/server";
import { and, eq, isNull, sql } from "drizzle-orm";
import { z } from "zod";

import { db } from "@/lib/db/client";
import { categories, tags } from "@/lib/db/schema";

const querySchema = z.object({
  category_id: z.string().uuid(),
  include_archived: z
    .string()
    .transform((value) => value === "true")
    .optional(),
});

const createSchema = z.object({
  categoryId: z.string().uuid(),
  name: z.string().min(1).max(255),
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

  const includeArchived = parsed.data.include_archived ?? false;

  const list = await db
    .select()
    .from(tags)
    .where(
      includeArchived
        ? eq(tags.categoryId, parsed.data.category_id)
        : and(eq(tags.categoryId, parsed.data.category_id), isNull(tags.archivedAt)),
    )
    .orderBy(tags.sortOrder, tags.name);

  return NextResponse.json({ items: list });
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

  const category = await db
    .select({ id: categories.id })
    .from(categories)
    .where(eq(categories.id, parsed.data.categoryId))
    .limit(1);

  if (!category[0]) {
    return NextResponse.json({ message: "カテゴリが存在しません" }, { status: 404 });
  }

  const now = new Date();
  const [{ value: currentMaxOrder }] = await db
    .select({
      value: sql<number>`COALESCE(MAX(${tags.sortOrder}), -1)`,
    })
    .from(tags)
    .where(eq(tags.categoryId, parsed.data.categoryId));

  const nextSortOrder = (currentMaxOrder ?? -1) + 1;

  const [created] = await db
    .insert(tags)
    .values({
      categoryId: parsed.data.categoryId,
      name: parsed.data.name,
      sortOrder: nextSortOrder,
      createdAt: now,
      updatedAt: now,
    })
    .returning();

  return NextResponse.json(created, { status: 201 });
}

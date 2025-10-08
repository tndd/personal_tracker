import { NextResponse } from "next/server";
import { isNull, sql } from "drizzle-orm";
import { z } from "zod";

import { db } from "@/lib/db/client";
import { categories } from "@/lib/db/schema";

const querySchema = z.object({
  include_archived: z
    .string()
    .transform((value) => value === "true")
    .optional(),
});

const createBodySchema = z.object({
  name: z.string().min(1).max(255),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
});

export async function GET(request: Request) {
  const searchParams = new URL(request.url).searchParams;
  const parsed = querySchema.safeParse(Object.fromEntries(searchParams));

  if (!parsed.success) {
    return NextResponse.json(
      { message: "クエリパラメータが不正です", issues: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const includeArchived = parsed.data.include_archived ?? false;

  const list = await db
    .select()
    .from(categories)
    .where(includeArchived ? undefined : isNull(categories.archivedAt))
    .orderBy(categories.sortOrder, categories.name);

  return NextResponse.json({ items: list });
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = createBodySchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { message: "入力値が不正です", issues: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const now = new Date();
  const [{ value: currentMaxOrder }] = await db
    .select({
      value: sql<number>`COALESCE(MAX(${categories.sortOrder}), -1)`,
    })
    .from(categories);

  const nextSortOrder = (currentMaxOrder ?? -1) + 1;

  const [created] = await db
    .insert(categories)
    .values({
      name: parsed.data.name,
      color: parsed.data.color,
      sortOrder: nextSortOrder,
      createdAt: now,
      updatedAt: now,
    })
    .returning();

  return NextResponse.json(created, { status: 201 });
}

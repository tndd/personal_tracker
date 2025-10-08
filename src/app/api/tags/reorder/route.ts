import { NextResponse } from "next/server";
import { eq, inArray } from "drizzle-orm";
import { z } from "zod";

import { db } from "@/lib/db/client";
import { tags } from "@/lib/db/schema";

const reorderSchema = z.object({
  items: z
    .array(
      z.object({
        id: z.string().uuid(),
        categoryId: z.string().uuid(),
        sortOrder: z.number().int().min(0),
      }),
    )
    .min(1),
});

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = reorderSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { message: "入力値が不正です", issues: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const now = new Date();
  const items = parsed.data.items;

  const uniqueIds = new Set(items.map((item) => item.id));
  if (uniqueIds.size !== items.length) {
    return NextResponse.json({ message: "IDが重複しています" }, { status: 400 });
  }

  const ids = items.map((item) => item.id);
  const existing = await db
    .select({
      id: tags.id,
      categoryId: tags.categoryId,
    })
    .from(tags)
    .where(inArray(tags.id, ids));

  if (existing.length !== items.length) {
    return NextResponse.json({ message: "存在しないタグIDが含まれています" }, { status: 400 });
  }

  const existingById = new Map(existing.map((row) => [row.id, row.categoryId]));

  const groups = new Map<string, { id: string; sortOrder: number }[]>();
  for (const item of items) {
    const currentCategory = existingById.get(item.id);
    if (!currentCategory || currentCategory !== item.categoryId) {
      return NextResponse.json(
        { message: "カテゴリIDが現在の所属と一致しません" },
        { status: 400 },
      );
    }
    if (!groups.has(item.categoryId)) {
      groups.set(item.categoryId, []);
    }
    groups.get(item.categoryId)!.push({ id: item.id, sortOrder: item.sortOrder });
  }

  for (const [categoryId, groupItems] of Array.from(groups.entries())) {
    const sorted = [...groupItems].sort((a, b) => a.sortOrder - b.sortOrder);
    const isSequential = sorted.every((value, index) => value.sortOrder === index);
    if (!isSequential) {
      return NextResponse.json(
        {
          message: `カテゴリ ${categoryId} の sortOrder は0から始まる連番で指定してください`,
        },
        { status: 400 },
      );
    }

    const currentCount = await db
      .select({ id: tags.id })
      .from(tags)
      .where(eq(tags.categoryId, categoryId));

    if (currentCount.length !== groupItems.length) {
      return NextResponse.json(
        { message: `カテゴリ ${categoryId} の件数と一致していません` },
        { status: 400 },
      );
    }
  }

  await db.transaction(async (tx) => {
    for (const groupItems of Array.from(groups.values())) {
      const offset = groupItems.length;
      for (const item of groupItems) {
        await tx
          .update(tags)
          .set({
            sortOrder: item.sortOrder + offset,
            updatedAt: now,
          })
          .where(eq(tags.id, item.id));
      }
    }

    for (const groupItems of Array.from(groups.values())) {
      for (const item of groupItems) {
        await tx
          .update(tags)
          .set({
            sortOrder: item.sortOrder,
            updatedAt: now,
          })
          .where(eq(tags.id, item.id));
      }
    }
  });

  const updated = await db
    .select()
    .from(tags)
    .where(inArray(tags.id, ids))
    .orderBy(tags.categoryId, tags.sortOrder, tags.name);

  return NextResponse.json({ items: updated });
}

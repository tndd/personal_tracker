import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { z } from "zod";

import { db } from "@/lib/db/client";
import { categories } from "@/lib/db/schema";

const reorderSchema = z.object({
  items: z
    .array(
      z.object({
        id: z.string().uuid(),
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

  const targetOrders = items.map((item) => item.sortOrder).sort((a, b) => a - b);
  const isSequential = targetOrders.every((value, index) => value === index);
  if (!isSequential) {
    return NextResponse.json(
      { message: "sortOrder は0から始まる連番で指定してください" },
      { status: 400 },
    );
  }

  const existing = await db.select({ id: categories.id }).from(categories);
  if (existing.length !== items.length) {
    return NextResponse.json(
      { message: "カテゴリの件数と一致していません" },
      { status: 400 },
    );
  }

  const existingIds = new Set(existing.map((record) => record.id));
  const hasUnknownId = items.some((item) => !existingIds.has(item.id));
  if (hasUnknownId) {
    return NextResponse.json({ message: "存在しないカテゴリIDが含まれています" }, { status: 400 });
  }

  await db.transaction(async (tx) => {
    for (const item of items) {
      await tx
        .update(categories)
        .set({
          sortOrder: item.sortOrder + items.length,
          updatedAt: now,
        })
        .where(eq(categories.id, item.id));
    }

    for (const item of items) {
      await tx
        .update(categories)
        .set({
          sortOrder: item.sortOrder,
          updatedAt: now,
        })
        .where(eq(categories.id, item.id));
    }
  });

  const updated = await db
    .select()
    .from(categories)
    .orderBy(categories.sortOrder, categories.name);

  return NextResponse.json({ items: updated });
}

import { NextResponse } from "next/server";
import { eq, sql } from "drizzle-orm";
import { z } from "zod";

import { db } from "@/lib/db/client";
import { categories, tags } from "@/lib/db/schema";

const paramsSchema = z.object({
  id: z.string().uuid(),
});

const updateSchema = z
  .object({
    name: z.string().min(1).max(255).optional(),
    archivedAt: z
      .union([
        z.string().datetime({ offset: true }).transform((value) => new Date(value)),
        z.null(),
      ])
      .optional(),
    categoryId: z.string().uuid().optional(),
  })
  .refine(
    (value) => Object.keys(value).length > 0,
    "いずれかの項目を指定してください",
  );

type RouteContext = {
  params: { id: string };
};

export async function PATCH(request: Request, context: RouteContext) {
  const parsedParams = paramsSchema.safeParse(context.params);
  if (!parsedParams.success) {
    return NextResponse.json(
      { message: "IDが不正です", issues: parsedParams.error.flatten() },
      { status: 400 },
    );
  }

  const body = await request.json().catch(() => null);
  const parsedBody = updateSchema.safeParse(body);
  if (!parsedBody.success) {
    return NextResponse.json(
      { message: "入力値が不正です", issues: parsedBody.error.flatten() },
      { status: 400 },
    );
  }

  if (parsedBody.data.categoryId) {
    const category = await db
      .select({ id: categories.id })
      .from(categories)
      .where(eq(categories.id, parsedBody.data.categoryId))
      .limit(1);

    if (!category[0]) {
      return NextResponse.json({ message: "カテゴリが存在しません" }, { status: 404 });
    }
  }

  const now = new Date();
  const result = await db.transaction(async (tx) => {
    const existing = await tx
      .select()
      .from(tags)
      .where(eq(tags.id, parsedParams.data.id))
      .limit(1);

    const current = existing[0];
    if (!current) {
      return null;
    }

    const updatePayload: Partial<typeof tags.$inferInsert> = {
      updatedAt: now,
    };

    if (parsedBody.data.name !== undefined) {
      updatePayload.name = parsedBody.data.name;
    }

    if (parsedBody.data.archivedAt !== undefined) {
      updatePayload.archivedAt = parsedBody.data.archivedAt;
    }

    let targetCategoryId = current.categoryId;
    if (parsedBody.data.categoryId && parsedBody.data.categoryId !== current.categoryId) {
      targetCategoryId = parsedBody.data.categoryId;

      const [{ value: maxOrder }] = await tx
        .select({
          value: sql<number>`COALESCE(MAX(${tags.sortOrder}), -1)`,
        })
        .from(tags)
        .where(eq(tags.categoryId, targetCategoryId));

      updatePayload.categoryId = targetCategoryId;
      updatePayload.sortOrder = (maxOrder ?? -1) + 1;
    }

    const [updated] = await tx
      .update(tags)
      .set(updatePayload)
      .where(eq(tags.id, parsedParams.data.id))
      .returning();

    if (!updated) {
      return null;
    }

    if (targetCategoryId !== current.categoryId) {
      const rows = await tx
        .select({ id: tags.id })
        .from(tags)
        .where(eq(tags.categoryId, current.categoryId))
        .orderBy(tags.sortOrder, tags.name);

      for (let index = 0; index < rows.length; index += 1) {
        const row = rows[index];
        await tx
          .update(tags)
          .set({ sortOrder: index, updatedAt: now })
          .where(eq(tags.id, row.id));
      }
    }

    return updated;
  });

  if (!result) {
    return NextResponse.json({ message: "タグが見つかりません" }, { status: 404 });
  }

  return NextResponse.json(result);
}

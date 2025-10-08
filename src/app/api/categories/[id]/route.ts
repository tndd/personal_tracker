import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { z } from "zod";

import { db } from "@/lib/db/client";
import { categories } from "@/lib/db/schema";

type CategoryInsert = typeof categories.$inferInsert;

const paramsSchema = z.object({
  id: z.string().uuid(),
});

const updateBodySchema = z
  .object({
    name: z.string().min(1).max(255).optional(),
    color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
    archivedAt: z
      .union([
        z.string().datetime({ offset: true }).transform((value) => new Date(value)),
        z.null(),
      ])
      .optional(),
  })
  .refine(
    (value) => Object.keys(value).length > 0,
    "いずれかの項目を指定してください",
  );

type RouteContext = {
  params: { id: string };
};

export async function PATCH(_request: Request, context: RouteContext) {
  const parsedParams = paramsSchema.safeParse(context.params);
  if (!parsedParams.success) {
    return NextResponse.json(
      { message: "IDが不正です", issues: parsedParams.error.flatten() },
      { status: 400 },
    );
  }

  const body = await _request.json().catch(() => null);
  const parsedBody = updateBodySchema.safeParse(body);
  if (!parsedBody.success) {
    return NextResponse.json(
      { message: "入力値が不正です", issues: parsedBody.error.flatten() },
      { status: 400 },
    );
  }

  const now = new Date();
  const updatePayload: Partial<CategoryInsert> = {
    updatedAt: now,
  };

  if (parsedBody.data.name !== undefined) {
    updatePayload.name = parsedBody.data.name;
  }

  if (parsedBody.data.color !== undefined) {
    updatePayload.color = parsedBody.data.color;
  }

  if (parsedBody.data.archivedAt !== undefined) {
    updatePayload.archivedAt = parsedBody.data.archivedAt;
  }

  const [updated] = await db
    .update(categories)
    .set(updatePayload)
    .where(eq(categories.id, parsedParams.data.id))
    .returning();

  if (!updated) {
    return NextResponse.json({ message: "カテゴリが見つかりません" }, { status: 404 });
  }

  return NextResponse.json(updated);
}

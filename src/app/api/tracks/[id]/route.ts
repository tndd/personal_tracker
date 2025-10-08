import { NextResponse } from "next/server";
import { eq, inArray } from "drizzle-orm";
import { z } from "zod";

import { db } from "@/lib/db/client";
import { tags, tracks } from "@/lib/db/schema";

const paramsSchema = z.object({
  id: z.string().uuid(),
});

const updateSchema = z
  .object({
    memo: z.string().max(1000).optional(),
    condition: z.number().int().min(-2).max(2).optional(),
    tagIds: z.array(z.string().uuid()).max(100).optional(),
  })
  .refine((value) => Object.keys(value).length > 0, "いずれかの項目を指定してください");

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
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { message: "入力値が不正です", issues: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const now = new Date();
  const updatePayload: Partial<typeof tracks.$inferInsert> = {
    updatedAt: now,
  };

  if (parsed.data.memo !== undefined) {
    updatePayload.memo = parsed.data.memo;
  }

  if (parsed.data.condition !== undefined) {
    updatePayload.condition = parsed.data.condition;
  }

  if (parsed.data.tagIds !== undefined) {
    const uniqueTagIds = Array.from(new Set(parsed.data.tagIds));
    let filtered: string[] = [];

    if (uniqueTagIds.length > 0) {
      const existing = await db
        .select({ id: tags.id })
        .from(tags)
        .where(inArray(tags.id, uniqueTagIds));

      const existingSet = new Set(existing.map((row) => row.id));
      filtered = uniqueTagIds.filter((id) => existingSet.has(id));
    }

    updatePayload.tagIds = filtered;
  }

  const [updated] = await db
    .update(tracks)
    .set(updatePayload)
    .where(eq(tracks.id, parsedParams.data.id))
    .returning();

  if (!updated) {
    return NextResponse.json({ message: "トラックが見つかりません" }, { status: 404 });
  }

  return NextResponse.json(updated);
}

export async function DELETE(_request: Request, context: RouteContext) {
  const parsedParams = paramsSchema.safeParse(context.params);
  if (!parsedParams.success) {
    return NextResponse.json(
      { message: "IDが不正です", issues: parsedParams.error.flatten() },
      { status: 400 },
    );
  }

  const result = await db
    .delete(tracks)
    .where(eq(tracks.id, parsedParams.data.id))
    .returning({ id: tracks.id });

  if (result.length === 0) {
    return NextResponse.json({ message: "トラックが見つかりません" }, { status: 404 });
  }

  return new NextResponse(null, { status: 204 });
}

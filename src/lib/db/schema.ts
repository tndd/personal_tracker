import {
  check,
  date,
  index,
  integer,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

export const categories = pgTable(
  "category",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    name: text("name").notNull(),
    color: text("color").notNull(),
    sortOrder: integer("sort_order").notNull(),
    archivedAt: timestamp("archived_at", { withTimezone: false }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
  },
  (table) => ({
    nameUnique: uniqueIndex("category_name_unique").on(table.name),
    sortOrderUnique: uniqueIndex("category_sort_order_unique").on(table.sortOrder),
    colorHexCheck: check("category_color_hex", sql`${table.color} ~ '^#[0-9A-Fa-f]{6}$'`),
  }),
);

export const tags = pgTable(
  "tag",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    categoryId: uuid("category_id")
      .notNull()
      .references(() => categories.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    sortOrder: integer("sort_order").notNull(),
    archivedAt: timestamp("archived_at", { withTimezone: false }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
  },
  (table) => ({
    categorySortOrderUnique: uniqueIndex("tag_category_sort_order_unique").on(
      table.categoryId,
      table.sortOrder,
    ),
    categoryNameUnique: uniqueIndex("tag_category_name_unique").on(
      table.categoryId,
      table.name,
    ),
    categoryIdIdx: index("tag_category_id_idx").on(table.categoryId),
  }),
);

export const tracks = pgTable(
  "track",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    memo: text("memo"),
    condition: integer("condition").default(0),
    tagIds: uuid("tag_ids")
      .array()
      .default(sql`'{}'::uuid[]`),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
  },
  (table) => ({
    conditionRangeCheck: check(
      "track_condition_range",
      sql`${table.condition} BETWEEN -2 AND 2`,
    ),
    memoLengthCheck: check(
      "track_memo_length",
      sql`char_length(${table.memo}) <= 1000`,
    ),
  }),
);

export const dailies = pgTable(
  "daily",
  {
    date: date("date").notNull(),
    memo: text("memo"),
    condition: integer("condition").default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.date], name: "daily_pkey" }),
    conditionRangeCheck: check(
      "daily_condition_range",
      sql`${table.condition} BETWEEN -2 AND 2`,
    ),
    memoLengthCheck: check(
      "daily_memo_length",
      sql`char_length(${table.memo}) <= 5000`,
    ),
  }),
);

export type Category = typeof categories.$inferSelect;
export type Tag = typeof tags.$inferSelect;
export type Track = typeof tracks.$inferSelect;
export type Daily = typeof dailies.$inferSelect;

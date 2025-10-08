import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import { serverEnv } from "@/lib/env";

/**
 * postgres-js のクライアントはホットリロードでも使い回せるようにキャッシュする。
 * Next.js App Router ではグローバル変数に保持しておくのがシンプル。
 */
const globalForDb = globalThis as unknown as {
  sql: ReturnType<typeof postgres> | undefined;
};

const sql =
  globalForDb.sql ??
  postgres(serverEnv.DATABASE_URL, {
    prepare: false,
    max: 10,
  });

if (process.env.NODE_ENV !== "production") {
  globalForDb.sql = sql;
}

export const db = drizzle(sql);
export { sql };

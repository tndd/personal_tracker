import "dotenv/config";

import { defineConfig } from "drizzle-kit";

// ENVIRONMENTが指定されていない場合はTEST
const environment = process.env.ENVIRONMENT || "TEST";

let databaseUrl: string | undefined;

switch (environment) {
  case "PROD":
    databaseUrl = process.env.DATABASE_URL_PROD;
    break;
  case "STG":
    databaseUrl = process.env.DATABASE_URL_STG;
    break;
  case "TEST":
  default:
    databaseUrl = process.env.DATABASE_URL_TEST;
    break;
}

if (!databaseUrl) {
  throw new Error(
    `DATABASE_URL_${environment} が設定されていません。\n` +
    `.env ファイルに DATABASE_URL_${environment} を設定してください。`
  );
}

console.log(`🔧 Drizzle Kit: ${environment} 環境のデータベースに接続します`);

export default defineConfig({
  schema: "./src/lib/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: databaseUrl,
  },
});

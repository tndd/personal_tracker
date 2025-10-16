import { z } from "zod";

/**
 * 実行環境の種別
 */
const Environment = z.enum(["TEST", "STG", "PROD"]);
type Environment = z.infer<typeof Environment>;

/**
 * 環境変数のスキーマ定義。
 * サーバー側のみで利用する値なのでここでまとめて検証する。
 */
const serverEnvSchema = z.object({
  DATABASE_URL: z.string().min(1, "DATABASE_URL を設定してください").refine(
    (val) => val.startsWith("postgres://") || val.startsWith("postgresql://"),
    { message: "DATABASE_URL はPostgreSQLのURL形式で指定してください" }
  ),
  ENVIRONMENT: Environment.default("TEST"),
  // PROD環境へのアクセスには明示的な許可が必要
  ALLOW_PROD_ACCESS: z
    .string()
    .optional()
    .transform((val) => val === "true"),
});

/**
 * 環境とデータベースURLの整合性をチェック
 */
function validateEnvironment(env: z.infer<typeof serverEnvSchema>) {
  const dbUrl = env.DATABASE_URL;
  const environment = env.ENVIRONMENT;

  // データベース名から環境を推測
  const isProdDb = dbUrl.includes("/personal_tracker") && !dbUrl.includes("_test") && !dbUrl.includes("_stg");
  const isStgDb = dbUrl.includes("/personal_tracker_stg");
  const isTestDb = dbUrl.includes("/personal_tracker_test");

  // PROD環境の安全装置
  if (environment === "PROD") {
    if (!env.ALLOW_PROD_ACCESS) {
      throw new Error(
        "PROD環境へのアクセスには ALLOW_PROD_ACCESS=true の設定が必要です。\n" +
        "本当にPROD環境に接続する場合のみ、この変数を設定してください。"
      );
    }
    if (!isProdDb) {
      throw new Error(
        `ENVIRONMENT=PROD ですが、DATABASE_URLが本番用ではありません。\n` +
        `期待: personal_tracker\n` +
        `実際: ${dbUrl}`
      );
    }
    console.warn("⚠️  警告: PROD環境に接続しています");
  }

  // STG環境のチェック
  if (environment === "STG") {
    if (!isStgDb) {
      throw new Error(
        `ENVIRONMENT=STG ですが、DATABASE_URLがステージング用ではありません。\n` +
        `期待: personal_tracker_stg\n` +
        `実際: ${dbUrl}`
      );
    }
  }

  // TEST環境のチェック（デフォルト）
  if (environment === "TEST") {
    if (!isTestDb) {
      throw new Error(
        `ENVIRONMENT=TEST ですが、DATABASE_URLがテスト用ではありません。\n` +
        `期待: personal_tracker_test\n` +
        `実際: ${dbUrl}\n\n` +
        `開発時に本番DBを使う場合は ENVIRONMENT=PROD と ALLOW_PROD_ACCESS=true を設定してください。`
      );
    }
  }

  return env;
}

/**
 * パース済みの環境変数。
 * 不正な値の場合は起動時に例外を投げて気づけるようにする。
 */
const parsedEnv = serverEnvSchema.parse(process.env);
export const serverEnv = validateEnvironment(parsedEnv);

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
  DATABASE_URL_TEST: z.string().min(1, "DATABASE_URL_TEST を設定してください"),
  DATABASE_URL_STG: z.string().min(1, "DATABASE_URL_STG を設定してください"),
  DATABASE_URL_PROD: z.string().min(1, "DATABASE_URL_PROD を設定してください"),
  PROD_CONFIRMED: z
    .string()
    .optional()
    .transform((val) => val === "true"),
});

/**
 * 環境変数から適切なDATABASE_URLを選択し、安全性をチェック
 */
function selectDatabaseUrl(rawEnv: z.infer<typeof serverEnvSchema>) {
  // ENVIRONMENTが指定されていない場合はTEST
  const environment = (process.env.ENVIRONMENT as Environment) || "TEST";

  let databaseUrl: string;

  switch (environment) {
    case "PROD":
      // PROD環境への接続には明示的な確認が必要
      if (!rawEnv.PROD_CONFIRMED) {
        throw new Error(
          "❌ PROD環境への接続にはPROD_CONFIRMED=trueの設定が必要です。\n" +
          "本当に本番データベースに接続する場合のみ、この変数をtrueに設定してください。"
        );
      }
      databaseUrl = rawEnv.DATABASE_URL_PROD;
      console.warn("⚠️  警告: PROD環境（本番データベース）に接続しています");
      break;

    case "STG":
      databaseUrl = rawEnv.DATABASE_URL_STG;
      console.log("📦 STG環境（ステージングデータベース）に接続しています");
      break;

    case "TEST":
    default:
      databaseUrl = rawEnv.DATABASE_URL_TEST;
      console.log("🧪 TEST環境（テストデータベース）に接続しています");
      break;
  }

  // データベースURLの形式チェック
  if (!databaseUrl.startsWith("postgres://") && !databaseUrl.startsWith("postgresql://")) {
    throw new Error(`DATABASE_URL が PostgreSQL の URL 形式ではありません: ${databaseUrl}`);
  }

  return {
    DATABASE_URL: databaseUrl,
    ENVIRONMENT: environment,
    PROD_CONFIRMED: rawEnv.PROD_CONFIRMED,
  };
}

/**
 * パース済みの環境変数。
 * 不正な値の場合は起動時に例外を投げて気づけるようにする。
 */
const parsedEnv = serverEnvSchema.parse(process.env);
const selectedEnv = selectDatabaseUrl(parsedEnv);

export const serverEnv = {
  DATABASE_URL: selectedEnv.DATABASE_URL,
  ENVIRONMENT: selectedEnv.ENVIRONMENT,
  PROD_CONFIRMED: selectedEnv.PROD_CONFIRMED,
};

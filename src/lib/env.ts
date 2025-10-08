import { z } from "zod";

/**
 * 環境変数のスキーマ定義。
 * サーバー側のみで利用する値なのでここでまとめて検証する。
 */
const serverEnvSchema = z.object({
  DATABASE_URL: z.string().url("DATABASE_URL はURL形式で指定してください"),
});

/**
 * パース済みの環境変数。
 * 不正な値の場合は起動時に例外を投げて気づけるようにする。
 */
export const serverEnv = serverEnvSchema.parse(process.env);

# 変更履歴
- 2025-10-08: `specification.md` を更新し、日時型を`TIMESTAMPTZ`へ統一。`category`/`tag`の整合条件、`tag_ids`での存在しないID無視の仕様、`updated_at`の運用方針、API草案を追記。
- 2025-10-08: DrizzleスキーマとDBクライアントを組み込み、カテゴリ/タグ/トラック/日記/分析APIをNext.js App Routerで実装。Docker Composeと環境変数テンプレート、Drizzle設定、ESLint/ビルドの検証を追加。
- 2025-10-08: Drizzle CLIスクリプトを最新仕様に合わせて更新し、`dotenv` を導入。`db:push` 実行でPostgreSQLにテーブルを適用済み。
- 2025-10-09: PlaywrightベースのAPI E2Eテストを追加し、`test:e2e` スクリプトと `start:test` を整備。`TEST_DATABASE_URL` の運用とテスト用DB初期化ユーティリティを導入。`docs/specification/api.md` を詳細版へ差し替え。
- 2025-10-09: `docs/specification/view.md` を刷新し、Track/Daily/Analysis/Tag 各画面のUI仕様とAPI整合性を定義。

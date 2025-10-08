# 変更履歴
- 2025-10-08: `specification.md` を更新し、`track`テーブルの日時型を`TIMESTAMPTZ`へ変更。`category`および`tag`テーブルの`sort_order`整合条件、`tag`テーブルのユニーク制約、`updated_at`更新方式（アプリ側で `NOW()` を明示設定する方針）を追記。

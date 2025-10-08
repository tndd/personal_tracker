# API 設計（草案）
- ベースURLは `/api`。リクエスト/レスポンスはJSON、タイムスタンプはISO 8601（UTC）で返す。
- 認証は無し（個人利用）。`updated_at` は更新系リクエストでアプリが `NOW()` を明示設定する。

## category API
- `GET /api/categories?include_archived=false`  
  表示対象のカテゴリ一覧を `sort_order` 昇順で返却。`include_archived=true` でアーカイブも含む。
- `POST /api/categories`  
  `{ name, color }` を受け取り新規作成。`sort_order` は末尾の値+1を自動採番。
- `PATCH /api/categories/:id`  
  `name` / `color` / `archived_at` を部分更新。`archived_at: null` で復帰。
- `POST /api/categories/reorder`  
  `[{ id, sort_order }, ...]` を受け取り一括並び替え。重複や欠番がある場合は400。

## tag API
- `GET /api/tags?category_id=<uuid>&include_archived=false`  
  指定カテゴリ内のタグを `sort_order` 昇順 → `name` 昇順で返す。
- `POST /api/tags`  
  `{ category_id, name }` を受け取り作成。`sort_order` は対象カテゴリの末尾に付与。
- `PATCH /api/tags/:id`  
  `name` / `archived_at` / `category_id` を部分更新。カテゴリ変更時は新カテゴリ末尾に再配置。
- `POST /api/tags/reorder`  
  `[{ id, sort_order }, ...]` を受け取り、一括で順序更新。カテゴリ単位で検証し、矛盾があれば400。

## track API
- `GET /api/tracks?limit=50&cursor=<timestamp>`  
  `created_at` 降順で返し、`cursor` より古いレコードをページング。レスポンスに次ページ用カーソルを含める。
- `POST /api/tracks`  
  `{ memo?, condition?, tag_ids? }` を受け取り作成。存在しないタグIDは無視し、既存IDのみ保存。
- `PATCH /api/tracks/:id`  
  上記フィールドを部分更新。同様に存在しないタグIDは無視。
- `DELETE /api/tracks/:id`  
  指定レコードを削除。

## daily API
- `GET /api/daily?from=<date>&to=<date>`  
  指定期間の日記を日付昇順で返却。未指定時は直近30日。
- `GET /api/daily/:date`  
  単一日の日記を取得。無ければ404。
- `PUT /api/daily/:date`  
  `{ memo?, condition? }` を受け取りUPSERT。`updated_at` をアプリが更新。
- `DELETE /api/daily/:date`  
  該当日の日記を削除。

## analysis API
- `GET /api/analysis/condition-trend?from=<date>&to=<date>`  
  `daily.condition` の推移を日別で返却。グラフ用の単純な配列を想定。
- `GET /api/analysis/tag-correlation?from=<date>&to=<date>`  
  期間内の `track` に対するタグ出現回数と平均 `condition` をまとめ、簡易的な相関指標を返す。詳細な統計処理は将来拡張。
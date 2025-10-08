# 健康管理アプリ 仕様書
個人用の健康管理・日記アプリ。日々のコンディション、服薬、症状などを記録し、分析する。

---

# 技術スタック

```
Frontend:  Next.js 14 (App Router) + TypeScript
Backend:   Next.js API Routes
DB:        PostgreSQL (Supabase) - 配列型使用
ORM:       Drizzle ORM
UI:        Tailwind CSS + shadcn/ui
Deploy:    Vercel
Auth:      なし（個人用）
```

---

# データベース設計

**共通仕様**
- `updated_at` はアプリケーション側で更新時に `NOW()` を明示的に設定する。

## category テーブル
カテゴリ情報を管理（薬、症状、食事など）

| カラム名    | 型         | 制約                                          | 説明                             |
| ----------- | ---------- | --------------------------------------------- | -------------------------------- |
| id          | UUID       | PRIMARY KEY, DEFAULT gen_random_uuid()        | カテゴリID                       |
| name        | TEXT       | NOT NULL, UNIQUE                              | カテゴリ名                       |
| color       | TEXT       | NOT NULL, CHECK (color ~ '^#[0-9A-Fa-f]{6}$') | 表示色（#RRGGBB形式）            |
| sort_order  | INTEGER    | NOT NULL                                      | 表示順                           |
| archived_at | TIMESTAMPZ | NULLABLE                                      | アーカイブ日時（NULLなら表示中） |
| created_at  | TIMESTAMPZ | DEFAULT NOW()                                 | 作成日時                         |
| updated_at  | TIMESTAMPZ | DEFAULT NOW()                                 | 更新日時                         |

**整合条件:**
- `sort_order` はカテゴリ全体で重複しない連番（0以上）を維持する。


---

## tag テーブル
タグ情報を管理（デパス、頭痛など）

| カラム名    | 型         | 制約                                          | 説明                             |
| ----------- | ---------- | --------------------------------------------- | -------------------------------- |
| id          | UUID       | PRIMARY KEY, DEFAULT gen_random_uuid()        | タグID                           |
| category_id | UUID       | NOT NULL, FK to category.id ON DELETE CASCADE | 所属カテゴリ                     |
| name        | TEXT       | NOT NULL                                      | タグ名                           |
| sort_order  | INTEGER    | NOT NULL                                      | カテゴリ内での表示順             |
| archived_at | TIMESTAMPZ | NULLABLE                                      | アーカイブ日時（NULLなら表示中） |
| created_at  | TIMESTAMPZ | DEFAULT NOW()                                 | 作成日時                         |
| updated_at  | TIMESTAMPZ | DEFAULT NOW()                                 | 更新日時                         |

**整合条件:**
- 各カテゴリ内で `sort_order` は重複しない連番（0以上）を維持する。
- `UNIQUE(category_id, name)` を付与し、カテゴリ内での名称重複を禁止する。

---

## track テーブル
日々の記録（メモ、コンディション、タグ）

| カラム名   | 型          | 制約                                          | 説明                       |
| ---------- | ----------- | --------------------------------------------- | -------------------------- |
| id         | UUID        | PRIMARY KEY, DEFAULT gen_random_uuid()        | トラックID                 |
| memo       | TEXT        | CHECK (char_length(memo) <= 1000)             | メモ内容（最大1000文字）   |
| condition  | INTEGER     | DEFAULT 0, CHECK (condition BETWEEN -2 AND 2) | コンディション（-2~2）     |
| tag_ids    | UUID[]      | DEFAULT '{}'                                  | 紐付いたタグIDの配列       |
| created_at | TIMESTAMPTZ | DEFAULT NOW()                                 | 記録日時（タイムゾーン込） |
| updated_at | TIMESTAMPTZ | DEFAULT NOW()                                 | 更新日時                   |

**補足仕様:**
- `tag_ids` に存在しないタグIDが含まれている場合は無視して保存する（エラーにはしない）。

---

## daily テーブル
日記（1日1件）

| カラム名   | 型          | 制約                                          | 説明                            |
| ---------- | ----------- | --------------------------------------------- | ------------------------------- |
| date       | DATE        | PRIMARY KEY                                   | 日付（YYYY-MM-DD）              |
| memo       | TEXT        | CHECK (char_length(memo) <= 5000)             | 日記内容（最大5000文字）        |
| condition  | INTEGER     | DEFAULT 0, CHECK (condition BETWEEN -2 AND 2) | 1日全体のコンディション（-2~2） |
| created_at | TIMESTAMPTZ | DEFAULT NOW()                                 | 作成日時                        |
| updated_at | TIMESTAMPTZ | DEFAULT NOW()                                 | 更新日時                        |

---

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

---

# View

## track

おおよそslackのような具合で上から下にトラックは流れる。

過去を遡るのは上方向の無限スクロール方式。

## daily

googleカレンダーのように上から下に日記が流れる形式と、カレンダーでコンディションを一目で見られるようにもしたい。

カードを上に無限スクロールすることで過去のカードを次々読み込んでいく。

## analysis

trackやdailyの統計データを表示する

コンディションの推移や、タグとコンディションとの相関計算などを行う。

## tag

タグの追加・アーカイブ・表示順位の並び替えを行う。

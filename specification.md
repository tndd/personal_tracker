# 健康管理アプリ 仕様書

## 概要
個人用の健康管理・日記アプリ。日々のコンディション、服薬、症状などを記録し、分析する。

---

## 技術スタック

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

## データベース設計

### category テーブル
カテゴリ情報を管理（薬、症状、食事など）

| カラム名    | 型        | 制約                                          | 説明                             |
| ----------- | --------- | --------------------------------------------- | -------------------------------- |
| id          | UUID      | PRIMARY KEY, DEFAULT gen_random_uuid()        | カテゴリID                       |
| name        | TEXT      | NOT NULL, UNIQUE                              | カテゴリ名                       |
| color       | TEXT      | NOT NULL, CHECK (color ~ '^#[0-9A-Fa-f]{6}$') | 表示色（#RRGGBB形式）            |
| sort_order  | INTEGER   | NOT NULL                                      | 表示順                           |
| archived_at | TIMESTAMP | NULLABLE                                      | アーカイブ日時（NULLなら表示中） |
| created_at  | TIMESTAMP | DEFAULT NOW()                                 | 作成日時                         |
| updated_at  | TIMESTAMP | DEFAULT NOW()                                 | 更新日時                         |


---

### tag テーブル
タグ情報を管理（デパス、頭痛など）

| カラム名    | 型        | 制約                                          | 説明                             |
| ----------- | --------- | --------------------------------------------- | -------------------------------- |
| id          | UUID      | PRIMARY KEY, DEFAULT gen_random_uuid()        | タグID                           |
| category_id | UUID      | NOT NULL, FK to category.id ON DELETE CASCADE | 所属カテゴリ                     |
| name        | TEXT      | NOT NULL                                      | タグ名                           |
| sort_order  | INTEGER   | NOT NULL                                      | カテゴリ内での表示順             |
| archived_at | TIMESTAMP | NULLABLE                                      | アーカイブ日時（NULLなら表示中） |
| created_at  | TIMESTAMP | DEFAULT NOW()                                 | 作成日時                         |
| updated_at  | TIMESTAMP | DEFAULT NOW()                                 | 更新日時                         |


**表示順:**
- 同一カテゴリ内では `sort_order` ASC、次に `name` ASC で表示する
- ドラッグ&ドロップの結果は `sort_order` に反映される

---

### track テーブル
日々の記録（メモ、コンディション、タグ）

| カラム名   | 型        | 制約                                          | 説明                     |
| ---------- | --------- | --------------------------------------------- | ------------------------ |
| id         | UUID      | PRIMARY KEY, DEFAULT gen_random_uuid()        | トラックID               |
| memo       | TEXT      | CHECK (char_length(memo) <= 1000)             | メモ内容（最大1000文字） |
| condition  | INTEGER   | DEFAULT 0, CHECK (condition BETWEEN -2 AND 2) | コンディション（-2~2）   |
| tag_ids    | UUID[]    | DEFAULT '{}'                                  | 紐付いたタグIDの配列     |
| created_at | TIMESTAMP | DEFAULT NOW()                                 | 作成日時                 |
| updated_at | TIMESTAMP | DEFAULT NOW()                                 | 更新日時                 |

---

### daily テーブル
日記（1日1件）

| カラム名   | 型        | 制約                                          | 説明                            |
| ---------- | --------- | --------------------------------------------- | ------------------------------- |
| date       | DATE      | PRIMARY KEY                                   | 日付（YYYY-MM-DD）              |
| memo       | TEXT      | CHECK (char_length(memo) <= 5000)             | 日記内容（最大5000文字）        |
| condition  | INTEGER   | DEFAULT 0, CHECK (condition BETWEEN -2 AND 2) | 1日全体のコンディション（-2~2） |
| created_at | TIMESTAMP | DEFAULT NOW()                                 | 作成日時                        |
| updated_at | TIMESTAMP | DEFAULT NOW()                                 | 更新日時                        |

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

| カラム名   | 型         | 制約                                          | 説明                       |
| ---------- | ---------- | --------------------------------------------- | -------------------------- |
| id         | UUID       | PRIMARY KEY, DEFAULT gen_random_uuid()        | トラックID                 |
| memo       | TEXT       | CHECK (char_length(memo) <= 1000)             | メモ内容（最大1000文字）   |
| condition  | INTEGER    | DEFAULT 0, CHECK (condition BETWEEN -2 AND 2) | コンディション（-2~2）     |
| tag_ids    | UUID[]     | DEFAULT '{}'                                  | 紐付いたタグIDの配列       |
| created_at | TIMESTAMPZ | DEFAULT NOW()                                 | 記録日時（タイムゾーン込） |
| updated_at | TIMESTAMPZ | DEFAULT NOW()                                 | 更新日時                   |

---

## daily テーブル
日記（1日1件）

| カラム名   | 型         | 制約                                          | 説明                            |
| ---------- | ---------- | --------------------------------------------- | ------------------------------- |
| date       | DATE       | PRIMARY KEY                                   | 日付（YYYY-MM-DD）              |
| memo       | TEXT       | CHECK (char_length(memo) <= 5000)             | 日記内容（最大5000文字）        |
| condition  | INTEGER    | DEFAULT 0, CHECK (condition BETWEEN -2 AND 2) | 1日全体のコンディション（-2~2） |
| created_at | TIMESTAMPZ | DEFAULT NOW()                                 | 作成日時                        |
| updated_at | TIMESTAMPZ | DEFAULT NOW()                                 | 更新日時                        |

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

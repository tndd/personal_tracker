# データベース設計

**共通仕様**
- `updated_at` はアプリケーション側で更新時に `NOW()` を明示的に設定する。

## category テーブル
カテゴリ情報を管理（薬、症状、食事など）

| カラム名    | 型          | 制約                                          | 説明                             |
| ----------- | ----------- | --------------------------------------------- | -------------------------------- |
| id          | UUID        | PRIMARY KEY, DEFAULT gen_random_uuid()        | カテゴリID                       |
| name        | TEXT        | NOT NULL, UNIQUE                              | カテゴリ名                       |
| color       | TEXT        | NOT NULL, CHECK (color ~ '^#[0-9A-Fa-f]{6}$') | 表示色（#RRGGBB形式）            |
| sort_order  | INTEGER     | NOT NULL                                      | 表示順                           |
| archived_at | TIMESTAMPTZ | NULLABLE                                      | アーカイブ日時（NULLなら表示中） |
| created_at  | TIMESTAMPTZ | DEFAULT NOW()                                 | 作成日時                         |
| updated_at  | TIMESTAMPTZ | DEFAULT NOW()                                 | 更新日時                         |

**整合条件:**
- `sort_order` はカテゴリ全体で重複しない連番（0以上）を維持する。


---

## tag テーブル
タグ情報を管理（デパス、頭痛など）

| カラム名    | 型          | 制約                                          | 説明                             |
| ----------- | ----------- | --------------------------------------------- | -------------------------------- |
| id          | UUID        | PRIMARY KEY, DEFAULT gen_random_uuid()        | タグID                           |
| category_id | UUID        | NOT NULL, FK to category.id ON DELETE CASCADE | 所属カテゴリ                     |
| name        | TEXT        | NOT NULL                                      | タグ名                           |
| sort_order  | INTEGER     | NOT NULL                                      | カテゴリ内での表示順             |
| archived_at | TIMESTAMPTZ | NULLABLE                                      | アーカイブ日時（NULLなら表示中） |
| created_at  | TIMESTAMPTZ | DEFAULT NOW()                                 | 作成日時                         |
| updated_at  | TIMESTAMPTZ | DEFAULT NOW()                                 | 更新日時                         |

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

| カラム名      | 型          | 制約                                                           | 説明                            |
| ------------- | ----------- | -------------------------------------------------------------- | ------------------------------- |
| date          | DATE        | PRIMARY KEY                                                    | 日付（YYYY-MM-DD）              |
| memo          | TEXT        | CHECK (char_length(memo) <= 5000)                              | 日記内容（最大5000文字）        |
| condition     | INTEGER     | DEFAULT 0, CHECK (condition BETWEEN -2 AND 2)                  | 1日全体のコンディション（-2~2） |
| sleep_start   | TIMESTAMPTZ | NULLABLE                                                       | 就寝時刻                        |
| sleep_end     | TIMESTAMPTZ | NULLABLE                                                       | 起床時刻                        |
| sleep_quality | INTEGER     | NULLABLE, CHECK (sleep_quality IS NULL OR sleep_quality BETWEEN -2 AND 2) | 睡眠の質（-2~2）                |
| created_at    | TIMESTAMPTZ | DEFAULT NOW()                                                  | 作成日時                        |
| updated_at    | TIMESTAMPTZ | DEFAULT NOW()                                                  | 更新日時                        |
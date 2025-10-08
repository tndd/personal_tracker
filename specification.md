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

**インデックス:**
```sql
CREATE INDEX idx_category_active ON category(sort_order) WHERE archived_at IS NULL;
```

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

**制約:**
```sql
UNIQUE(category_id, name)  -- 同一カテゴリ内で名前重複不可
UNIQUE(category_id, sort_order)  -- 並び順もユニークに保つ
```

**インデックス:**
```sql
CREATE INDEX idx_tag_active ON tag(category_id) WHERE archived_at IS NULL;
CREATE INDEX idx_tag_sort_order ON tag(sort_order) WHERE archived_at IS NULL;
```

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

**インデックス:**
```sql
CREATE INDEX idx_track_created_at ON track(created_at DESC);
CREATE INDEX idx_track_tag_ids ON track USING GIN (tag_ids);
```

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

**インデックス:**
```sql
CREATE INDEX idx_daily_date ON daily(date DESC);
```

---

## テーブル作成SQL（完全版）

```sql
-- category
CREATE TABLE category (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT UNIQUE NOT NULL,
  color TEXT NOT NULL CHECK (color ~ '^#[0-9A-Fa-f]{6}$'),
  sort_order INTEGER NOT NULL,
  archived_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_category_active ON category(sort_order) WHERE archived_at IS NULL;

-- tag
CREATE TABLE tag (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id UUID NOT NULL REFERENCES category(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  sort_order INTEGER NOT NULL,
  archived_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(category_id, name),
  UNIQUE(category_id, sort_order)
);

CREATE INDEX idx_tag_active ON tag(category_id) WHERE archived_at IS NULL;
CREATE INDEX idx_tag_sort_order ON tag(sort_order) WHERE archived_at IS NULL;

-- track
CREATE TABLE track (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  memo TEXT CHECK (char_length(memo) <= 1000),
  condition INTEGER DEFAULT 0 CHECK (condition BETWEEN -2 AND 2),
  tag_ids UUID[] DEFAULT '{}',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_track_created_at ON track(created_at DESC);
CREATE INDEX idx_track_tag_ids ON track USING GIN (tag_ids);

-- daily
CREATE TABLE daily (
  date DATE PRIMARY KEY,
  memo TEXT CHECK (char_length(memo) <= 5000),
  condition INTEGER DEFAULT 0 CHECK (condition BETWEEN -2 AND 2),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_daily_date ON daily(date DESC);
```

---

## API仕様

### Track API

#### POST /api/tracks
新規track作成

**Request Body:**
```json
{
  "memo": "頭痛がする",
  "condition": -1,
  "tag_ids": ["uuid1", "uuid2"]
}
```

**Response:**
```json
{
  "id": "uuid",
  "memo": "頭痛がする",
  "condition": -1,
  "tag_ids": ["uuid1", "uuid2"],
  "created_at": "2025-10-08T10:00:00Z",
  "updated_at": "2025-10-08T10:00:00Z"
}
```

---

#### GET /api/tracks
track一覧取得（ページネーション、フィルタリング対応）

**Query Parameters:**
- `limit`: 取得件数（デフォルト: 50）
- `before`: この日時より前のtrackを取得（ISO 8601形式）
- `tag_ids`: タグIDのカンマ区切り（OR検索）

**Example:**
```
GET /api/tracks?limit=50&before=2025-10-08T10:00:00Z&tag_ids=uuid1,uuid2
```

**Response:**
```json
{
  "data": [
    {
      "id": "uuid",
      "memo": "頭痛がする",
      "condition": -1,
      "created_at": "2025-10-08T10:00:00Z",
      "updated_at": "2025-10-08T10:00:00Z",
      "tags": [
        {
          "id": "tag-uuid",
          "name": "デパス",
          "sort_order": 12,
          "category_name": "薬",
          "category_color": "#3B82F6"
        }
      ]
    }
  ],
  "pagination": {
    "oldest_timestamp": "2025-10-01T00:00:00Z",
    "newest_timestamp": "2025-10-08T10:00:00Z",
    "has_older": true,
    "has_newer": false
  }
}
```

---

#### PUT /api/tracks/:id
track更新（全置換）

**Request Body:**
```json
{
  "memo": "頭痛が治った",
  "condition": 1,
  "tag_ids": ["uuid1"]
}
```

**Response:**
```json
{
  "id": "uuid",
  "memo": "頭痛が治った",
  "condition": 1,
  "tag_ids": ["uuid1"],
  "created_at": "2025-10-08T10:00:00Z",
  "updated_at": "2025-10-08T10:30:00Z"
}
```

---

#### DELETE /api/tracks/:id
track削除（物理削除）

**Response:**
```json
{
  "success": true
}
```

---

### Daily API

#### POST /api/dailies
daily保存（upsert）

**Request Body:**
```json
{
  "date": "2025-10-08",
  "memo": "良い1日だった",
  "condition": 2
}
```

**Response:**
```json
{
  "date": "2025-10-08",
  "memo": "良い1日だった",
  "condition": 2,
  "created_at": "2025-10-08T23:00:00Z",
  "updated_at": "2025-10-08T23:00:00Z"
}
```

---

#### GET /api/dailies
daily一覧取得（ページネーション）

**Query Parameters:**
- `limit`: 取得件数（デフォルト: 30）
- `before`: この日付より前のdailyを取得（YYYY-MM-DD形式）

**Example:**
```
GET /api/dailies?limit=30&before=2025-10-08
```

**Response:**
```json
{
  "data": [
    {
      "date": "2025-10-08",
      "memo": "良い1日だった",
      "condition": 2,
      "created_at": "2025-10-08T23:00:00Z",
      "updated_at": "2025-10-08T23:00:00Z"
    }
  ],
  "pagination": {
    "oldest_date": "2025-09-01",
    "newest_date": "2025-10-08",
    "has_older": true,
    "has_newer": false
  }
}
```

---

#### GET /api/dailies/month
月別daily取得（カレンダーモード用）

**Query Parameters:**
- `year`: 年（YYYY）
- `month`: 月（1-12）

**Example:**
```
GET /api/dailies/month?year=2025&month=10
```

**Response:**
```json
{
  "data": [
    {
      "date": "2025-10-01",
      "memo": "...",
      "condition": 1
    },
    {
      "date": "2025-10-08",
      "memo": "良い1日だった",
      "condition": 2
    }
  ]
}
```

---

#### DELETE /api/dailies/:date
daily削除（物理削除）

**Example:**
```
DELETE /api/dailies/2025-10-08
```

**Response:**
```json
{
  "success": true
}
```

---

### Category API

#### GET /api/categories
カテゴリ一覧取得

**Query Parameters:**
- `include_archived`: アーカイブ済みも含めるか（デフォルト: false）

**備考:**
- カテゴリ内のタグは `sort_order` ASC、同順位の場合は `name` ASC で返す

**Response:**
```json
{
  "data": [
    {
      "id": "uuid",
      "name": "薬",
      "color": "#3B82F6",
      "sort_order": 1,
      "archived_at": null,
      "tag_count": 5
    }
  ]
}
```

---

#### POST /api/categories
カテゴリ作成

**Request Body:**
```json
{
  "name": "薬",
  "color": "#3B82F6",
  "sort_order": 1
}
```

**Response:**
```json
{
  "id": "uuid",
  "name": "薬",
  "color": "#3B82F6",
  "sort_order": 1,
  "archived_at": null,
  "created_at": "2025-10-08T10:00:00Z",
  "updated_at": "2025-10-08T10:00:00Z"
}
```

---

#### PUT /api/categories/:id
カテゴリ更新

**Request Body:**
```json
{
  "name": "医薬品",
  "color": "#FF0000"
}
```

---

#### PATCH /api/categories/reorder
カテゴリ並び替え

**Request Body:**
```json
{
  "orders": [
    { "id": "uuid1", "sort_order": 1 },
    { "id": "uuid2", "sort_order": 2 }
  ]
}
```

---

#### PATCH /api/categories/:id/archive
カテゴリアーカイブ

**Response:**
```json
{
  "success": true
}
```

---

#### PATCH /api/categories/:id/unarchive
カテゴリ復元

**Response:**
```json
{
  "success": true
}
```

---

### Tag API

#### GET /api/tags/grouped
タグ一覧取得（カテゴリでグループ化）

**Query Parameters:**
- `include_archived`: アーカイブ済みも含めるか（デフォルト: false）

**Response:**
```json
{
  "data": [
    {
      "category": {
        "id": "cat-uuid",
        "name": "薬",
        "color": "#3B82F6",
        "sort_order": 1,
        "archived_at": null
      },
      "tags": [
        {
          "id": "tag-uuid",
          "name": "デパス",
          "sort_order": 10,
          "archived_at": null
        }
      ]
    }
  ]
}
```

---

#### POST /api/tags
タグ作成

**Request Body:**
```json
{
  "category_id": "uuid",
  "name": "デパス",
  "sort_order": 10
}
```

**Response:**
```json
{
  "id": "uuid",
  "category_id": "uuid",
  "name": "デパス",
  "sort_order": 10,
  "archived_at": null,
  "created_at": "2025-10-08T10:00:00Z",
  "updated_at": "2025-10-08T10:00:00Z"
}
```

---

#### PATCH /api/tags/:id
タグ更新

**Request Body:**
```json
{
  "name": "デパス5mg",
  "sort_order": 8,
  "category_id": "uuid-category"
}
```

**Response:**
```json
{
  "id": "uuid",
  "category_id": "uuid-category",
  "name": "デパス5mg",
  "sort_order": 8,
  "archived_at": null,
  "created_at": "2025-10-08T10:00:00Z",
  "updated_at": "2025-10-08T11:00:00Z"
}
```

---

#### PATCH /api/tags/reorder
タグの並び替え

**Request Body:**
```json
{
  "category_id": "uuid",
  "orders": [
    { "id": "tag-uuid-1", "sort_order": 1 },
    { "id": "tag-uuid-2", "sort_order": 2 }
  ]
}
```

**Response:**
```json
{
  "success": true
}
```

---

#### PATCH /api/tags/:id/archive
タグアーカイブ

**Response:**
```json
{
  "success": true
}
```

---

#### PATCH /api/tags/:id/unarchive
タグ復元

**Response:**
```json
{
  "success": true
}
```

---

### Analysis API（後回し）

#### GET /api/analysis/condition-trend
コンディション推移

**Query Parameters:**
- `from`: 開始日（YYYY-MM-DD）
- `to`: 終了日（YYYY-MM-DD）
- `granularity`: 粒度（day / week / month）

---

#### GET /api/analysis/tag-frequency
タグ使用頻度

**Query Parameters:**
- `from`: 開始日
- `to`: 終了日

---

#### GET /api/analysis/tag-correlation
タグとコンディションの相関

**Query Parameters:**
- `tag_id`: タグID
- `from`: 開始日
- `to`: 終了日

---

## エラーレスポンス

全APIで統一されたエラーレスポンス形式

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "メモは1000文字以内で入力してください",
    "details": {
      "field": "memo",
      "maxLength": 1000
    }
  }
}
```

**エラーコード一覧:**
- `VALIDATION_ERROR`: バリデーションエラー
- `NOT_FOUND`: リソースが見つからない
- `CONFLICT`: 重複エラー（同名カテゴリなど）
- `INTERNAL_ERROR`: サーバーエラー

---

## バリデーションルール

### track
- `memo`: 最大1000文字
- `condition`: -2~2の整数（必須）
- `tag_ids`: 存在するタグIDのみ（重複は無視）

### daily
- `date`: YYYY-MM-DD形式、未来日付は不可
- `memo`: 最大5000文字
- `condition`: -2~2の整数（必須）

### tag
- `name`: 1~50文字、カテゴリ内で重複不可
- `sort_order`: 1以上の整数
- `category_id`: 存在するカテゴリID

### category
- `name`: 1~30文字、全体で重複不可
- `color`: #RRGGBB形式
- `sort_order`: 整数

---

## フロントエンド構成

```
/app
  /page.tsx              # トップ（trackビュー）
  /daily/page.tsx        # 日記ビュー
  /tags/page.tsx         # タグ管理
  /analysis/page.tsx     # 分析（後回し）
  
/components
  /track
    /TrackInput.tsx      # track入力フォーム
    /TrackCard.tsx       # trackカード
    /TrackList.tsx       # 無限スクロールリスト
  /daily
    /DailyCalendar.tsx   # カレンダーモード
    /DailyFlow.tsx       # フローモード
    /DailyModal.tsx      # 入力モーダル
  /tag
    /TagManager.tsx      # タグ管理画面
    /TagSelector.tsx     # タグ選択UI
    /CategorySection.tsx # カテゴリセクション
  /ui                    # shadcn/ui components
  
/lib
  /supabase.ts          # Supabase client
  /api.ts               # API呼び出しラッパー
  
/hooks
  /useTracks.ts         # track取得・更新
  /useDailies.ts        # daily取得・更新
  /useTags.ts           # tag取得
  /useInfiniteScroll.ts # 無限スクロール
```

---

## UI仕様

### Track View
- Slack風の縦スクロール
- 上方向の無限スクロールで過去を遡る
- 各trackカードには以下を表示:
  - メモ内容
  - コンディション（-2~2のアイコン表示）
  - タグ（カテゴリ色で色分け）
  - 作成日時

### Track入力フォーム
- メッセージ入力ボックス
- 左側にコンディションボタン（-2, -1, 0, +1, +2）
- タグ追加メンションボタン
  - メンションボタン → カテゴリ選択 → タグ追加
  - タグはメッセージ下部に表示（丸みを帯びたバッジ）
  - カテゴリごとに色分け

### Daily View
#### カレンダーモード
- 月間カレンダー表示
- 各日付にコンディションアイコン表示
- 日付クリックで入力モーダル表示

#### フローモード
- Googleカレンダー風の縦スクロール
- dailyがカードになって上から下に流れる
- 上方向の無限スクロールで過去を遡る
- カードクリックで入力モーダル表示

#### 入力モーダル
- 画面に余白を残す程度のサイズ
- メモ入力エリア（大きめ）
- コンディション選択
- 保存/キャンセルボタン

### Tag管理画面
カテゴリごとにセクション分け:
```
カテゴリ名 [色] [アーカイブボタン]
- タグ名 [ドラッグハンドル] [アーカイブボタン]
- タグ名 [ドラッグハンドル] [アーカイブボタン]

[アーカイブを表示]トグル
```

**機能:**
- カテゴリの並び替え（ドラッグ&ドロップ）
- タグの並び替え（同カテゴリ内ドラッグ&ドロップ）
- タグのカテゴリ間移動（ドラッグ&ドロップ）
- アーカイブ/復元
- 名前・色の編集

---

## 実装優先順位

### Phase 1: 基盤
1. Supabase setup + テーブル作成
2. Drizzle ORM schema定義
3. 基本的なAPI Routes（track CRUD）
4. TrackInput + TrackCard コンポーネント

### Phase 2: コア機能
5. 無限スクロール実装
6. Tag管理画面
7. Tag選択UI
8. Daily基本機能

### Phase 3: UX改善
9. Dailyカレンダーモード
10. フィルタリング機能
11. エラーハンドリング
12. ローディング状態

### Phase 4: 分析（最後）
13. Conditionグラフ
14. タグ頻度
15. 相関分析

---

## 設計上の重要な決定事項

### 1. アーカイブ方式
- **tag/category**: 論理削除（`archived_at`フラグ）
- **track/daily**: 物理削除
- 理由: tag/categoryは度々復活させる、track/dailyは完全に消したい

### 2. タグの保持方法
- PostgreSQLの配列型（`UUID[]`）を使用
- track_tags中間テーブルは不要
- JOIN回数を削減してパフォーマンス向上

### 3. タグフィルタリング
- OR検索のみ（AND検索は不要）
- 複数タグ指定時、いずれかを含むtrackを返す

### 4. 責務の分離
- `archived_at`: 表示/非表示の制御
- `sort_order`: 画面上の並び順（カテゴリ内でユニーク）
- 並び順と公開状態を分けることで、アーカイブ→復元時にも元の並び順を再現できる

### 5. updated_at自動更新
- DB側のトリガーまたはORM側で自動更新
- API側で明示的に指定する必要なし

---

## Drizzle ORM スキーマ例

```typescript
import { pgTable, uuid, text, integer, timestamp, date } from 'drizzle-orm/pg-core';

export const category = pgTable('category', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull().unique(),
  color: text('color').notNull(),
  sortOrder: integer('sort_order').notNull(),
  archivedAt: timestamp('archived_at'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const tag = pgTable('tag', {
  id: uuid('id').primaryKey().defaultRandom(),
  categoryId: uuid('category_id').notNull().references(() => category.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  sortOrder: integer('sort_order').notNull(),
  archivedAt: timestamp('archived_at'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const track = pgTable('track', {
  id: uuid('id').primaryKey().defaultRandom(),
  memo: text('memo'),
  condition: integer('condition').default(0).notNull(),
  tagIds: uuid('tag_ids').array().default([]),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const daily = pgTable('daily', {
  date: date('date').primaryKey(),
  memo: text('memo'),
  condition: integer('condition').default(0).notNull(),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});
```

---

## 次のステップ

1. Supabaseプロジェクト作成
2. 上記SQLを実行してテーブル作成
3. Next.jsプロジェクト初期化
4. Drizzle ORM設定
5. 最初のAPI（POST /api/tracks）実装
6. TrackInput/TrackCardコンポーネント実装

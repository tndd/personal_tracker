# API 仕様

## 共通仕様
- ベースURL: `/api`
- 通信: HTTPS/HTTP、`Content-Type: application/json`
- 認証: なし（個人利用前提）
- タイムゾーン: すべてUTCで扱い、タイムスタンプは ISO 8601 形式（例: `2025-10-08T12:34:56.789Z`）で返却する
- `updated_at`: 更新系リクエストを受け付けたサーバー側で `NOW()` を代入する
- エラー時レスポンス: `{"message": string, "issues"?: Record<string, string[]>}` を基本とし、スキーマ検証エラー時のみ `issues` を付与
- バリデーションエラー: `400 Bad Request`
- リソース未存在: `404 Not Found`
- 並び替えAPI: `sort_order` は 0 始まりの連番で指定する（重複・抜け番は 400）

---

## category API

### 共通フィールド
| フィールド   | 型             | 説明                                         |
| ------------ | -------------- | -------------------------------------------- |
| `id`         | string(uuid)   | カテゴリID                                   |
| `name`       | string         | カテゴリ名                                   |
| `color`      | string         | `#RRGGBB` 形式のカラーコード                 |
| `sortOrder`  | number         | 表示順。0 始まり連番                         |
| `archivedAt` | string \| null | アーカイブ日時（UTC）。未アーカイブは `null` |
| `createdAt`  | string         | 作成日時                                     |
| `updatedAt`  | string         | 更新日時                                     |

### GET `/api/categories`
- 説明: カテゴリ一覧取得
- クエリ:
  - `include_archived` (optional, boolean文字列) — `true` の場合はアーカイブ済みも含める（省略時は未アーカイブのみ）
- レスポンス 200:
  ```json
  {
    "items": [
      {
        "id": "b0f...",
        "name": "服薬",
        "color": "#FFAA00",
        "sortOrder": 0,
        "archivedAt": null,
        "createdAt": "2025-10-08T12:00:00.000Z",
        "updatedAt": "2025-10-08T12:00:00.000Z"
      }
    ]
  }
  ```

### POST `/api/categories`
- 説明: カテゴリ新規作成（既存の最大 `sort_order` + 1 を自動採番）
- リクエストボディ:
  ```json
  {
    "name": "服薬",
    "color": "#FFAA00"
  }
  ```
- レスポンス 201: 作成されたカテゴリオブジェクト（上記フィールド参照）
- エラー:
  - `400`: 入力スキーマ不正

### PATCH `/api/categories/:id`
- 説明: カテゴリの部分更新
- リクエストボディ（1項目以上必須）:
  ```json
  {
    "name": "食習慣",
    "color": "#00BBFF",
    "archivedAt": "2025-10-08T15:00:00.000Z"
  }
  ```
- 特記事項: `archivedAt` に `null` を指定するとアーカイブ解除
- レスポンス 200: 更新後のカテゴリ
- エラー:
  - `400`: スキーマ不正または `id` 不正
  - `404`: 指定IDが存在しない

### POST `/api/categories/reorder`
- 説明: カテゴリ表示順一括更新
- リクエストボディ:
  ```json
  {
    "items": [
      { "id": "id-3", "sortOrder": 0 },
      { "id": "id-1", "sortOrder": 1 },
      { "id": "id-2", "sortOrder": 2 }
    ]
  }
  ```
- バリデーション:
  - 指定ID数がDB件数と等しいこと
  - `sortOrder` が 0 からの連番であること
- レスポンス 200:
  ```json
  {
    "items": [
      { "...": "..." }
    ]
  }
  ```
- エラー:
  - `400`: スキーマ不正 / ID重複 / `sortOrder` 非連番 / 存在しないID

---

## tag API

### 共通フィールド
| フィールド                | 型             | 説明               |
| ------------------------- | -------------- | ------------------ |
| `id`                      | string(uuid)   | タグID             |
| `categoryId`              | string(uuid)   | 所属カテゴリID     |
| `name`                    | string         | タグ名称           |
| `sortOrder`               | number         | カテゴリ内の表示順 |
| `archivedAt`              | string \| null | アーカイブ日時     |
| `createdAt` / `updatedAt` | string         | 作成・更新日時     |

### GET `/api/tags`
- 説明: 指定カテゴリ内のタグ一覧取得
- クエリ:
  - `category_id` (必須, uuid)
  - `include_archived` (optional, boolean文字列)
- レスポンス 200:
  ```json
  {
    "items": [
      {
        "id": "tag-1",
        "categoryId": "cat-1",
        "name": "デパス",
        "sortOrder": 0,
        "archivedAt": null,
        "createdAt": "2025-10-08T12:00:00.000Z",
        "updatedAt": "2025-10-08T12:00:00.000Z"
      }
    ]
  }
  ```
- エラー:
  - `400`: パラメータ不正

### POST `/api/tags`
- 説明: タグ新規作成（カテゴリ末尾に追加）
- リクエスト:
  ```json
  {
    "categoryId": "cat-1",
    "name": "デパス"
  }
  ```
- レスポンス 201: 作成されたタグ
- エラー:
  - `400`: スキーマ不正
  - `404`: `categoryId` が存在しない

### PATCH `/api/tags/:id`
- 説明: タグの部分更新。カテゴリを変更した場合、移動先カテゴリ末尾へ再配置し、移動元カテゴリは再採番。
- リクエスト例:
  ```json
  {
    "name": "後頭部痛",
    "archivedAt": "2025-10-08T15:00:00.000Z",
    "categoryId": "other-cat-id"
  }
  ```
- レスポンス 200: 更新後タグ
- エラー:
  - `400`: スキーマ不正
  - `404`: タグ/カテゴリいずれか存在しない

### POST `/api/tags/reorder`
- 説明: タグ表示順一括更新。カテゴリ単位で 0 からの連番を確認。
- リクエスト:
  ```json
  {
    "items": [
      { "id": "tag-1", "categoryId": "cat-1", "sortOrder": 0 },
      { "id": "tag-2", "categoryId": "cat-1", "sortOrder": 1 }
    ]
  }
  ```
- レスポンス 200: 更新後タグ一覧（指定IDのみ）
- エラー:
  - `400`: ID重複 / カテゴリ不一致 / 件数不一致 / sortOrder 非連番

---

## track API

### 共通フィールド
| フィールド                | 型             | 説明                                       |
| ------------------------- | -------------- | ------------------------------------------ |
| `id`                      | string(uuid)   | トラックID                                 |
| `memo`                    | string \| null | メモ（最大1000文字）                       |
| `condition`               | number         | -2〜2                                      |
| `tagIds`                  | string[]       | 紐付いたタグID。存在しないIDは保存時に除外 |
| `createdAt` / `updatedAt` | string         | タイムスタンプ                             |

### GET `/api/tracks`
- 説明: トラック一覧（カーソルページング）
- クエリ:
  - `limit` (optional, int, 1〜100, default 50)
  - `cursor` (optional, ISO8601。指定するとその日時より古いデータを返す)
- レスポンス 200:
  ```json
  {
    "items": [
      {
        "id": "track-1",
        "memo": "朝の服薬",
        "condition": 1,
        "tagIds": ["tag-1"],
        "createdAt": "2025-10-08T12:30:00.000Z",
        "updatedAt": "2025-10-08T12:30:00.000Z"
      }
    ],
    "nextCursor": "2025-10-08T11:00:00.000Z" // 続きがない場合は null
  }
  ```

### POST `/api/tracks`
- 説明: トラック新規作成。`tagIds` に存在しないIDが含まれていても無視（エラーにしない）。
- リクエスト:
  ```json
  {
    "memo": "朝散歩",
    "condition": 1,
    "tagIds": ["tag-1", "non-existent-id"]
  }
  ```
- レスポンス 201: 作成行（`tagIds` から無効IDは除外済み）
- エラー:
  - `400`: スキーマ不正

### PATCH `/api/tracks/:id`
- 説明: トラック部分更新。`tagIds` はPOSTと同様に既存IDのみ保持。
- リクエスト例:
  ```json
  {
    "memo": "夜ランニング",
    "condition": 2,
    "tagIds": ["tag-1"]
  }
  ```
- レスポンス 200: 更新後トラック
- エラー:
  - `400`: スキーマ不正
  - `404`: 該当トラックなし

### DELETE `/api/tracks/:id`
- 説明: トラック削除
- レスポンス 204: ボディなし
- エラー:
  - `400`: ID不正
  - `404`: 該当トラックなし

---

## daily API

### 共通フィールド
| フィールド                | 型                  | 説明                         |
| ------------------------- | ------------------- | ---------------------------- |
| `date`                    | string (YYYY-MM-DD) | 主キー                       |
| `memo`                    | string \| null      | 最大5000文字                 |
| `condition`               | number              | -2〜2                        |
| `sleepStart`              | string \| null      | 就寝時刻（ISO8601形式）      |
| `sleepEnd`                | string \| null      | 起床時刻（ISO8601形式）      |
| `createdAt` / `updatedAt` | string              | タイムスタンプ               |

### GET `/api/daily`
- 説明: 日記の期間取得（デフォルトは直近30日）
- クエリ:
  - `from` (optional, YYYY-MM-DD)
  - `to` (optional, YYYY-MM-DD)
- バリデーション: `from <= to`
- レスポンス 200:
  ```json
  {
    "items": [
      {
        "date": "2025-01-15",
        "memo": "記録",
        "condition": 1,
        "sleepStart": "2025-01-14T23:00:00.000Z",
        "sleepEnd": "2025-01-15T07:00:00.000Z",
        "createdAt": "2025-01-15T05:00:00.000Z",
        "updatedAt": "2025-01-15T05:00:00.000Z"
      }
    ]
  }
  ```

### GET `/api/daily/:date`
- 説明: 単一日記録取得
- パスパラメータ: `date`（YYYY-MM-DD）
- レスポンス 200: 日記オブジェクト
- エラー:
  - `400`: 日付形式不正
  - `404`: 記録が存在しない

### PUT `/api/daily/:date`
- 説明: UPSERT。指定日が存在すれば更新、無ければ作成。
- リクエスト:
  ```json
  {
    "memo": "初回記録",
    "condition": 0,
    "sleepStart": "2025-01-14T23:00:00.000Z",
    "sleepEnd": "2025-01-15T07:00:00.000Z"
  }
  ```
- 部分更新: 既存値とマージ（例: memo未指定の場合は過去値を保持）
- 睡眠記録の削除: `sleepStart`, `sleepEnd` に `null` を指定すると削除可能
- レスポンス 200: 作成・更新後のレコード
- エラー:
  - `400`: スキーマ不正 / 日付不正

### DELETE `/api/daily/:date`
- 説明: 指定日の日記削除
- レスポンス 204: ボディなし
- エラー:
  - `400`: 日付不正
  - `404`: 該当記録なし

---

## analysis API

### GET `/api/analysis/condition-trend`
- 説明: `daily.condition` の日次推移
- クエリ: `from` / `to` (optional, YYYY-MM-DD。未指定時は直近30日)
- レスポンス 200:
  ```json
  {
    "items": [
      { "date": "2025-02-01", "condition": -1 }
    ]
  }
  ```
- エラー:
  - `400`: パラメータ不正

### GET `/api/analysis/condition-track`
- 説明: `track` テーブルの `created_at` を起点に、指定粒度（時間/日）でコンディション比率と睡眠情報を集計する
- クエリ:
  - `granularity` (optional, `1-24h` や `1-30d`。既定は `3h`)
  - `from` / `to` (optional, YYYY-MM-DD。未指定時は粒度16区間分を直近で補間)
- レスポンス 200:
  ```json
  {
    "items": [
      {
        "slotIndex": 0,
        "startTime": "2025-02-01T00:00:00.000Z",
        "endTime": "2025-02-01T23:59:59.000Z",
        "min": -1,
        "max": 2,
        "count": 5,
        "counts": { "-1": 1, "0": 2, "2": 2 },
        "ratios": { "-1": 0.2, "0": 0.4, "2": 0.4 },
        "sleepHours": 6.5,
        "sleepStart": "2025-01-31T14:30:00.000Z",
        "sleepEnd": "2025-02-01T00:30:00.000Z"
      }
    ],
    "granularity": "1d"
  }
  ```
- 備考:
  - 粒度は時間（`h`）もしくは日（`d`）単位のみサポート。週次・月次は `/api/analysis/condition-daily` を利用する
  - スロット内の睡眠統計は `daily` テーブルを同一期間で参照し平均値を返す
- エラー:
  - `400`: パラメータ不正

### GET `/api/analysis/condition-daily`
- 説明: `daily` テーブルの記録を週次・月次のスロットへ集約し、コンディション比率と睡眠情報を返す
- クエリ:
  - `granularity` (optional, `"1w" | "1m"`。既定は `"1w"`)
  - `from` / `to` (optional, YYYY-MM-DD。未指定時は粒度16区間分を直近で補間)
- レスポンス 200:
  ```json
  {
    "items": [
      {
        "slotIndex": 0,
        "startTime": "2025-02-01T00:00:00.000Z",
        "endTime": "2025-03-03T00:00:00.000Z",
        "min": -2,
        "max": 2,
        "count": 12,
        "counts": { "-2": 2, "0": 5, "1": 3, "2": 2 },
        "ratios": { "-2": 0.17, "0": 0.42, "1": 0.25, "2": 0.17 },
        "sleepHours": 6.8,
        "sleepStart": "2025-02-01T14:30:00.000Z",
        "sleepEnd": "2025-02-02T00:15:00.000Z"
      }
    ],
    "granularity": "1m"
  }
  ```
- 備考:
  - 週次は7日、月次は30日を1スロットとして計算する（JST基準で区切る）
  - スロット内の睡眠統計は `daily.sleep_start/sleep_end` が存在する行のみ平均値を算出
- エラー:
  - `400`: パラメータ不正

### GET `/api/analysis/tag-correlation`
- 説明: トラックに紐付いたタグが指定粒度で先行日数分の `daily.condition` に与える影響度を、ベイズ推定で算出し返却する
- クエリ:
  - `from` / `to` (optional, YYYY-MM-DD。未指定時は直近30日)
  - `granularity` (optional, `"1d" | "1w" | "1m"`。未指定時は `"1d"`) — 参照する先行日数セットを切り替える
- レスポンス 200:
  ```json
  {
    "positive": [
      {
        "tagId": "tag-2",
        "tagName": "睡眠十分",
        "occurrenceCount": 3,
        "observationCount": 7,
        "effectiveSampleSize": 4.2,
        "totalWeight": 4.84,
        "rawMean": 1.75,
        "baselineMean": 0.42,
        "rawContribution": 1.33,
        "contribution": 0.58,
        "confidence": 0.76,
        "probabilitySameSign": 0.88,
        "credibleInterval": {
          "lower": -0.01,
          "upper": 1.17
        }
      }
    ],
    "negative": [
      {
        "tagId": "tag-4",
        "tagName": "夜更かし",
        "occurrenceCount": 2,
        "observationCount": 4,
        "effectiveSampleSize": 2.1,
        "totalWeight": 3.17,
        "rawMean": -1.20,
        "baselineMean": 0.42,
        "rawContribution": -1.62,
        "contribution": -0.49,
        "confidence": 0.64,
        "probabilitySameSign": 0.82,
        "credibleInterval": {
          "lower": -1.04,
          "upper": 0.06
        }
      }
    ],
    "metadata": {
      "lagWeights": [1.0, 0.67, 0.5],
      "lagDays": [1, 2, 3],
      "granularity": "1d",
      "baselineMean": 0.42,
      "priorMean": 0,
      "priorWeight": 5,
      "priorVariance": 1
    }
  }
  ```
- 備考:
  - `occurrenceCount` は期間中に該当タグを含んだトラック件数、`observationCount` は翌日〜3日後で取得できた `daily` の有効データ件数
  - `rawMean` はタグ出現時の重み付き平均値、`baselineMean` は全タグ横断の重み付き平均値
  - `rawContribution` はベースラインとの差分、`contribution` はベイズ調整後の寄与度
  - `confidence` は 0〜1 のスケールに正規化した信頼指標、`probabilitySameSign` は効果の符号が維持される事後確率 (0.5〜1.0)
  - `credibleInterval` は 95% 信用区間
  - 集計対象は `track.created_at` が `from`〜`to` のデータで、粒度ごとのラグ日数（`1d`: 翌日・翌々日・3日後、`1w`: 7/14/21日後、`1m`: 30/60/90日後）に存在する `daily` レコードのみを参照。`metadata.lagDays` に実際の参照日数を返却する
- エラー:
  - `400`: パラメータ不正

---

## エラー応答例

```json
HTTP/1.1 400 Bad Request
Content-Type: application/json

{
  "message": "入力値が不正です",
  "issues": {
    "name": ["必須項目です"]
  }
}
```

```json
HTTP/1.1 404 Not Found
Content-Type: application/json

{
  "message": "カテゴリが見つかりません"
}
```

---

## 動作確認コマンド例

```bash
# カテゴリ一覧
curl -s http://localhost:3000/api/categories

# タグ作成
curl -X POST http://localhost:3000/api/tags \
  -H "Content-Type: application/json" \
  -d '{"categoryId":"...","name":"頭痛"}'

# トラック取得（カーソル付き）
curl -s "http://localhost:3000/api/tracks?limit=20&cursor=2025-10-08T12:00:00.000Z"
```

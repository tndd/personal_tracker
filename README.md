# Personal Health Tracker

健康データを記録・管理するためのWebアプリケーション。日々の体調、服薬、症状などをトラッキングし、分析できます。

## 技術スタック

- **フロントエンド**: Next.js 14 (App Router), React, TypeScript, Tailwind CSS
- **バックエンド**: Next.js API Routes
- **データベース**: PostgreSQL
- **ORM**: Drizzle ORM
- **テスト**: Playwright

## セットアップ

### 1. データベースの起動

```bash
docker-compose up -d
```

### 2. 環境変数の設定

`.env` ファイルを作成し、以下の環境変数を設定します：

```bash
# 実行環境（TEST/STG/PROD）
# デフォルト: TEST
ENVIRONMENT=PROD

# データベースURL
DATABASE_URL=postgresql://personal_tracker:personal_tracker@localhost:5432/personal_tracker

# PROD環境へのアクセスを許可（開発時のみ）
# PROD環境に接続する場合は必須
ALLOW_PROD_ACCESS=true

# テスト用データベースURL（Playwrightテスト時に使用）
TEST_DATABASE_URL=postgresql://personal_tracker:personal_tracker@localhost:5432/personal_tracker_test
```

### 3. データベースのマイグレーション

```bash
npm run db:push
```

### 4. 開発サーバーの起動

```bash
npm run dev
```

http://localhost:3000 にアクセスしてアプリケーションを確認できます。

## 環境変数の詳細

### ENVIRONMENT

実行環境を指定します。この設定により、誤って本番データベースにテストデータが混入することを防ぎます。

| 値 | 説明 | 要求されるDB名 |
|---|---|---|
| `TEST` | テスト環境（デフォルト） | `personal_tracker_test` |
| `STG` | ステージング環境 | `personal_tracker_stg` |
| `PROD` | 本番環境 | `personal_tracker` |

### ALLOW_PROD_ACCESS

PROD環境への接続を明示的に許可するフラグです。

- **`true`**: PROD環境への接続を許可
- **未設定**: PROD環境への接続を拒否（エラー）

### 安全装置の仕組み

本プロジェクトでは、誤操作による本番データベース汚染を防ぐため、以下の安全装置を実装しています：

1. **デフォルトはTEST環境**
   - 環境変数未設定時は自動的にテスト用DBを要求
   - 起動時に環境とDBの整合性をチェック

2. **PROD環境への二重チェック**
   - `ENVIRONMENT=PROD` の設定
   - さらに `ALLOW_PROD_ACCESS=true` の明示的な許可が必要
   - 両方が揃わないと起動時にエラー

3. **整合性チェック**
   - ENVIRONMENTとDATABASE_URLのDB名が一致するか検証
   - 不一致の場合は詳細なエラーメッセージを表示

### 使用例

#### テスト実行時（推奨）

```bash
# 環境変数なし or ENVIRONMENT=TEST
npm run test:e2e
# → personal_tracker_test に接続
```

#### 開発時（本番DBを使用）

```bash
# .env ファイル
ENVIRONMENT=PROD
ALLOW_PROD_ACCESS=true
DATABASE_URL=postgresql://...personal_tracker

npm run dev
# → ⚠️ 警告: PROD環境に接続しています
```

#### ステージング環境

```bash
ENVIRONMENT=STG
DATABASE_URL=postgresql://...personal_tracker_stg

npm run dev
```

## スクリプト

```bash
# 開発サーバーの起動
npm run dev

# ビルド
npm run build

# 本番サーバーの起動
npm start

# Lint
npm run lint

# Drizzle ORMのマイグレーションファイル生成
npm run db:generate

# データベースにスキーマを適用
npm run db:push

# E2Eテストの実行
npm run test:e2e
```

## プロジェクト構成

```
├── src/
│   ├── app/              # Next.js App Router
│   │   ├── api/         # API Routes
│   │   └── (dashboard)/ # ダッシュボード画面
│   ├── components/       # Reactコンポーネント
│   ├── lib/             # ユーティリティとライブラリ
│   │   ├── db/          # データベース関連
│   │   └── env.ts       # 環境変数の検証
│   └── contexts/        # React Context
├── tests/               # E2Eテスト
└── docker-compose.yml   # PostgreSQLコンテナ
```

## データベース構成

同一のDockerコンテナ内に以下の3つのデータベースを用意しています：

- `personal_tracker`: 本番用
- `personal_tracker_stg`: ステージング用
- `personal_tracker_test`: テスト用

これにより、リソース効率を保ちながら環境を分離できます。

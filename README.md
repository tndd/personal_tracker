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
# 各環境のDB接続情報
DATABASE_URL_TEST="postgresql://postgres:postgres@localhost:5432/personal_tracker_test"
DATABASE_URL_STG="postgresql://postgres:postgres@localhost:5432/personal_tracker_stg"
DATABASE_URL_PROD="postgresql://postgres:postgres@localhost:5432/personal_tracker_prod"

# 本番環境への接続確認（trueに設定すると本番DBへの接続を許可）
PROD_CONFIRMED=false
```

**注意**: 接続先を切り替えるには環境変数 `ENVIRONMENT` を指定します：

```bash
# TEST環境（デフォルト）
npm run dev

# STG環境
ENVIRONMENT=STG npm run dev

# PROD環境（PROD_CONFIRMED=trueも必要）
ENVIRONMENT=PROD npm run dev
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

### ENVIRONMENT（実行時に指定）

実行環境をコマンド実行時に指定します。この設定により、誤って本番データベースにテストデータが混入することを防ぎます。

| 値 | 説明 | 使用されるURL |
|---|---|---|
| 未指定 | テスト環境（デフォルト） | `DATABASE_URL_TEST` |
| `TEST` | テスト環境 | `DATABASE_URL_TEST` |
| `STG` | ステージング環境 | `DATABASE_URL_STG` |
| `PROD` | 本番環境 | `DATABASE_URL_PROD` |

### DATABASE_URL_XXX

各環境のデータベース接続URLを指定します：

- **DATABASE_URL_TEST**: テスト環境のデータベースURL
- **DATABASE_URL_STG**: ステージング環境のデータベースURL
- **DATABASE_URL_PROD**: 本番環境のデータベースURL

### PROD_CONFIRMED

PROD環境への接続を明示的に許可するフラグです。

- **`true`**: PROD環境への接続を許可
- **`false` または未設定**: PROD環境への接続を拒否（エラー）

### 安全装置の仕組み

本プロジェクトでは、誤操作による本番データベース汚染を防ぐため、以下の安全装置を実装しています：

1. **デフォルトはTEST環境**
   - `ENVIRONMENT`未指定時は自動的にテスト用DBに接続
   - 起動時に環境に応じた適切なURLを選択

2. **PROD環境への安全装置**
   - `ENVIRONMENT=PROD` で本番環境を指定
   - さらに `.env` で `PROD_CONFIRMED=true` の設定が必要
   - 両方が揃わないと起動時にエラー

3. **環境ごとの分離**
   - 各環境のURLを明示的に分けて管理
   - コマンド実行時に環境を明示的に選択

### 使用例

#### テスト環境（デフォルト）

```bash
# ENVIRONMENTを指定しない場合、自動的にTEST環境
npm run dev
# → 🧪 TEST環境（テストデータベース）に接続しています

# または明示的に指定
ENVIRONMENT=TEST npm run dev
```

#### ステージング環境

```bash
ENVIRONMENT=STG npm run dev
# → 📦 STG環境（ステージングデータベース）に接続しています

# マイグレーション
ENVIRONMENT=STG npm run db:push
```

#### 本番環境（要注意）

```bash
# .env ファイルでPROD_CONFIRMED=trueを設定した上で
ENVIRONMENT=PROD npm run dev
# → ⚠️ 警告: PROD環境（本番データベース）に接続しています
```

#### マイグレーションの環境切り替え

```bash
# TEST環境にマイグレーション（デフォルト）
npm run db:push

# STG環境にマイグレーション
ENVIRONMENT=STG npm run db:push

# PROD環境にマイグレーション（要注意）
ENVIRONMENT=PROD npm run db:push
```

## スクリプト

```bash
# 開発サーバーの起動
npm run dev

# 開発サーバーの安全な起動（既存プロセスチェック付き）
./scripts/safe-dev.sh

# 開発サーバーの安全な起動（キャッシュクリーンアップ付き）
./scripts/safe-dev.sh --clean

# プロセスのクリーンアップ（playwright MCP/npm run devの重複解消）
./scripts/cleanup-processes.sh

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

### トラブルシューティング

#### playwright MCPが動作しない場合

playwright MCPのプロセスが重複していることが原因の可能性があります。以下のコマンドでクリーンアップしてください：

```bash
./scripts/cleanup-processes.sh
```

#### npm run devでポート3000が既に使用されている場合

既存のプロセスを自動でチェックして安全に起動するには：

```bash
./scripts/safe-dev.sh
```

このスクリプトは以下を自動で行います：
- ポート3000の使用状況チェック
- 必要に応じて既存プロセスの終了確認
- playwright MCPの重複警告
- 開発サーバーの起動

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

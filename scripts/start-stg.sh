#!/bin/bash

# Personal Tracker STG環境 自動起動スクリプト
# 使い方: npm run stg
#
# このスクリプトは以下を自動実行します：
# 1. PostgreSQL起動確認
# 2. 既存プロセスのクリーンアップ
# 3. データベース初期化（テーブル削除→マイグレーション→シード投入）
# 4. 開発サーバーのバックグラウンド起動

set -e  # エラー時は即座に停止

# カラー定義
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# プロジェクトルート
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$PROJECT_ROOT"

# ログとPIDファイル
LOG_DIR="$PROJECT_ROOT/logs"
LOG_FILE="$LOG_DIR/stg-dev.log"
PID_FILE="$PROJECT_ROOT/.stg.pid"

# 開始時刻
START_TIME=$(date +%s)

echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${CYAN}🚀 STG環境を起動します...${NC}"
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# ========================================
# 1. PostgreSQL起動確認
# ========================================
echo -e "${BLUE}📦 PostgreSQL起動確認中...${NC}"

# Dockerコンテナの確認
if ! docker ps --format '{{.Names}}' | grep -q "postgres-docker"; then
  echo -e "${YELLOW}⚠️  postgres-dockerコンテナが停止しています${NC}"

  # コンテナが存在するか確認
  if docker ps -a --format '{{.Names}}' | grep -q "postgres-docker"; then
    echo -e "${BLUE}   コンテナを起動中...${NC}"
    docker start postgres-docker
  else
    echo -e "${RED}❌ エラー: postgres-dockerコンテナが見つかりません${NC}"
    echo -e "${YELLOW}   以下のコマンドでコンテナを作成してください:${NC}"
    echo -e "   docker run -d --name postgres-docker -e POSTGRES_PASSWORD=postgres -p 5432:5432 postgres:16-alpine"
    exit 1
  fi
fi

echo -e "${GREEN}✓${NC} postgres-dockerコンテナ: 起動中"

# PostgreSQL接続待機（最大30秒）
echo -e "${BLUE}   PostgreSQL接続待機中...${NC}"
RETRY_COUNT=0
MAX_RETRIES=30

while [ $RETRY_COUNT -lt $MAX_RETRIES ]; do
  if docker exec postgres-docker pg_isready -U postgres > /dev/null 2>&1; then
    echo -e "${GREEN}✓${NC} PostgreSQL接続確認: 成功"
    break
  fi

  RETRY_COUNT=$((RETRY_COUNT + 1))
  if [ $RETRY_COUNT -eq $MAX_RETRIES ]; then
    echo -e "${RED}❌ エラー: PostgreSQLへの接続がタイムアウトしました${NC}"
    exit 1
  fi

  sleep 1
done

echo ""

# ========================================
# 2. 既存プロセスのクリーンアップ
# ========================================
echo -e "${BLUE}🗑️  既存プロセスのクリーンアップ中...${NC}"

# ポート3000の使用状況確認
PORT_3000_PIDS=$(lsof -ti :3000 || true)

if [ -n "$PORT_3000_PIDS" ]; then
  echo -e "${YELLOW}   ポート3000を使用中のプロセスを停止します (PID: $PORT_3000_PIDS)${NC}"

  for PID in $PORT_3000_PIDS; do
    kill "$PID" 2>/dev/null || true
  done

  sleep 2

  # 強制終了が必要な場合
  PORT_3000_PIDS=$(lsof -ti :3000 || true)
  if [ -n "$PORT_3000_PIDS" ]; then
    echo -e "${YELLOW}   強制終了中...${NC}"
    for PID in $PORT_3000_PIDS; do
      kill -9 "$PID" 2>/dev/null || true
    done
    sleep 1
  fi

  echo -e "${GREEN}✓${NC} ポート3000のプロセスを停止しました"
else
  echo -e "${GREEN}✓${NC} ポート3000は空いています"
fi

# 既存のPIDファイルをクリア
if [ -f "$PID_FILE" ]; then
  OLD_PID=$(cat "$PID_FILE")
  if ps -p "$OLD_PID" > /dev/null 2>&1; then
    echo -e "${YELLOW}   前回のプロセスを停止します (PID: $OLD_PID)${NC}"
    kill "$OLD_PID" 2>/dev/null || true
    sleep 1
  fi
  rm -f "$PID_FILE"
fi

echo ""

# ========================================
# 3. データベース初期化
# ========================================
echo -e "${BLUE}🔄 データベース初期化中...${NC}"

# 3-1. テーブル削除
echo -e "${YELLOW}   テーブル削除中...${NC}"
ENVIRONMENT=STG npx tsx scripts/reset-stg-db.ts > /dev/null 2>&1
echo -e "${GREEN}✓${NC} テーブル削除完了"

# 3-2. マイグレーション実行
echo -e "${YELLOW}   マイグレーション実行中...${NC}"
ENVIRONMENT=STG npm run db:push > /dev/null 2>&1
echo -e "${GREEN}✓${NC} マイグレーション完了"

# 3-3. シードデータ投入
echo -e "${YELLOW}   シードデータ投入中...${NC}"
npm run seed:stg > /dev/null 2>&1
echo -e "${GREEN}✓${NC} シードデータ投入完了（90日分）"

echo ""

# ========================================
# 4. 開発サーバー起動（バックグラウンド）
# ========================================
echo -e "${BLUE}🌐 開発サーバー起動中...${NC}"

# ログディレクトリ作成
mkdir -p "$LOG_DIR"

# 古いログファイルをローテーション（最新5件保持）
if [ -f "$LOG_FILE" ]; then
  TIMESTAMP=$(date +%Y%m%d_%H%M%S)
  mv "$LOG_FILE" "$LOG_DIR/stg-dev_${TIMESTAMP}.log"

  # 古いログを削除（最新5件のみ保持）
  ls -t "$LOG_DIR"/stg-dev_*.log 2>/dev/null | tail -n +6 | xargs rm -f 2>/dev/null || true
fi

# バックグラウンドで開発サーバー起動
ENVIRONMENT=STG nohup npm run dev > "$LOG_FILE" 2>&1 &
DEV_PID=$!

# PIDをファイルに保存
echo "$DEV_PID" > "$PID_FILE"

echo -e "${GREEN}✓${NC} バックグラウンドで起動しました (PID: $DEV_PID)"

# 起動待機（最大30秒）
echo -e "${YELLOW}   起動確認中...${NC}"
RETRY_COUNT=0
MAX_RETRIES=30

while [ $RETRY_COUNT -lt $MAX_RETRIES ]; do
  if curl -s http://localhost:3000 > /dev/null 2>&1; then
    echo -e "${GREEN}✓${NC} http://localhost:3000 で接続可能です"
    break
  fi

  # プロセスが既に終了していないか確認
  if ! ps -p "$DEV_PID" > /dev/null 2>&1; then
    echo -e "${RED}❌ エラー: 開発サーバーの起動に失敗しました${NC}"
    echo -e "${YELLOW}ログを確認してください: $LOG_FILE${NC}"
    tail -20 "$LOG_FILE"
    exit 1
  fi

  RETRY_COUNT=$((RETRY_COUNT + 1))
  if [ $RETRY_COUNT -eq $MAX_RETRIES ]; then
    echo -e "${RED}❌ エラー: 開発サーバーの起動確認がタイムアウトしました${NC}"
    echo -e "${YELLOW}ログを確認してください: $LOG_FILE${NC}"
    exit 1
  fi

  sleep 1
done

echo ""

# ========================================
# 5. 完了サマリー
# ========================================
END_TIME=$(date +%s)
ELAPSED=$((END_TIME - START_TIME))

echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}✨ STG環境の起動が完了しました！${NC} ${YELLOW}(所要時間: ${ELAPSED}秒)${NC}"
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo -e "${BLUE}📍 URL:${NC}      http://localhost:3000"
echo -e "${BLUE}📄 ログ:${NC}    $LOG_FILE"
echo -e "${BLUE}🆔 PID:${NC}     $DEV_PID"
echo -e "${BLUE}⏹️  停止:${NC}    npm run stg:stop"
echo ""
echo -e "${YELLOW}💡 Tips:${NC}"
echo -e "  - ログ確認: ${CYAN}tail -f $LOG_FILE${NC}"
echo -e "  - プロセス確認: ${CYAN}ps -p $DEV_PID${NC}"
echo -e "  - ブラウザで開く: ${CYAN}open http://localhost:3000${NC}"
echo ""

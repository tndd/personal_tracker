#!/bin/bash

# Personal Tracker STG環境 停止スクリプト
# 使い方: npm run stg:stop
#
# このスクリプトはバックグラウンドで動作中の開発サーバーを停止します

set -e

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

# PIDファイル
PID_FILE="$PROJECT_ROOT/.stg.pid"

echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${CYAN}⏹️  STG環境を停止します...${NC}"
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# PIDファイルから停止
if [ -f "$PID_FILE" ]; then
  PID=$(cat "$PID_FILE")

  if ps -p "$PID" > /dev/null 2>&1; then
    echo -e "${BLUE}🗑️  プロセスを停止中... (PID: $PID)${NC}"

    # 通常終了を試みる
    kill "$PID" 2>/dev/null || true
    sleep 2

    # プロセスが残っている場合は強制終了
    if ps -p "$PID" > /dev/null 2>&1; then
      echo -e "${YELLOW}   強制終了中...${NC}"
      kill -9 "$PID" 2>/dev/null || true
      sleep 1
    fi

    if ! ps -p "$PID" > /dev/null 2>&1; then
      echo -e "${GREEN}✓${NC} プロセスを停止しました (PID: $PID)"
    else
      echo -e "${RED}❌ プロセスの停止に失敗しました${NC}"
      exit 1
    fi
  else
    echo -e "${YELLOW}⚠️  PIDファイルに記録されたプロセスは既に停止しています (PID: $PID)${NC}"
  fi

  # PIDファイルを削除
  rm -f "$PID_FILE"
else
  echo -e "${YELLOW}⚠️  PIDファイルが見つかりません${NC}"
fi

# ポート3000を使用中のプロセスも停止
PORT_3000_PIDS=$(lsof -ti :3000 || true)

if [ -n "$PORT_3000_PIDS" ]; then
  echo -e "${BLUE}🗑️  ポート3000を使用中のプロセスを停止中...${NC}"

  for PORT_PID in $PORT_3000_PIDS; do
    echo -e "${YELLOW}   PID $PORT_PID を停止中...${NC}"
    kill "$PORT_PID" 2>/dev/null || true
  done

  sleep 2

  # 強制終了が必要な場合
  PORT_3000_PIDS=$(lsof -ti :3000 || true)
  if [ -n "$PORT_3000_PIDS" ]; then
    echo -e "${YELLOW}   強制終了中...${NC}"
    for PORT_PID in $PORT_3000_PIDS; do
      kill -9 "$PORT_PID" 2>/dev/null || true
    done
    sleep 1
  fi

  echo -e "${GREEN}✓${NC} ポート3000のプロセスを停止しました"
else
  echo -e "${GREEN}✓${NC} ポート3000は既に空いています"
fi

echo ""
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}✨ STG環境を停止しました${NC}"
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo -e "${BLUE}💡 再起動する場合:${NC} ${CYAN}npm run stg${NC}"
echo ""

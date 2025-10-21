#!/bin/bash

# Personal Tracker プロセスクリーンアップスクリプト
# 重複したplaywright MCPプロセスとnpm run devプロセスを整理します

set -e

echo "🧹 プロセスクリーンアップを開始します..."

# 1. playwright MCPプロセスの重複をチェック
echo ""
echo "📊 playwright MCPプロセスを確認中..."
PLAYWRIGHT_PIDS=$(pgrep -f "mcp-server-playwright" || true)

if [ -n "$PLAYWRIGHT_PIDS" ]; then
  PLAYWRIGHT_COUNT=$(echo "$PLAYWRIGHT_PIDS" | wc -l | tr -d ' ')
  echo "⚠️  playwright MCPプロセスが ${PLAYWRIGHT_COUNT} 個見つかりました"

  if [ "$PLAYWRIGHT_COUNT" -gt 1 ]; then
    echo "🗑️  重複プロセスを終了します..."
    pkill -f "mcp-server-playwright" || true
    sleep 2
    echo "✅ playwright MCPプロセスをクリーンアップしました"
  else
    echo "✅ playwright MCPプロセスは正常です (1個)"
  fi
else
  echo "ℹ️  playwright MCPプロセスは実行されていません"
fi

# 2. Chromiumプロセスの重複をチェック
echo ""
echo "📊 Chromiumプロセスを確認中..."
CHROMIUM_PIDS=$(pgrep -f "ms-playwright.*[Cc]hromium" || true)

if [ -n "$CHROMIUM_PIDS" ]; then
  CHROMIUM_COUNT=$(echo "$CHROMIUM_PIDS" | wc -l | tr -d ' ')
  echo "⚠️  Chromiumプロセスが ${CHROMIUM_COUNT} 個見つかりました"

  if [ "$CHROMIUM_COUNT" -gt 10 ]; then
    echo "🗑️  古いChromiumプロセスを終了します..."
    pkill -f "ms-playwright.*[Cc]hromium" || true
    sleep 1
    echo "✅ Chromiumプロセスをクリーンアップしました"
  else
    echo "✅ Chromiumプロセス数は許容範囲内です (${CHROMIUM_COUNT}個)"
  fi
else
  echo "ℹ️  Chromiumプロセスは実行されていません"
fi

# 3. npm run devの重複をチェック
echo ""
echo "📊 npm run devプロセスを確認中..."

# ポート3000を使用しているプロセスを確認
PORT_3000_PID=$(lsof -ti :3000 || true)

if [ -n "$PORT_3000_PID" ]; then
  echo "✅ ポート3000でnpm run devが実行中です (PID: $PORT_3000_PID)"

  # 重複したnpm run devプロセスをチェック
  NPM_DEV_PIDS=$(pgrep -f "npm run dev" || true)

  if [ -n "$NPM_DEV_PIDS" ]; then
    NPM_COUNT=$(echo "$NPM_DEV_PIDS" | wc -l | tr -d ' ')

    if [ "$NPM_COUNT" -gt 1 ]; then
      echo "⚠️  npm run devプロセスが ${NPM_COUNT} 個見つかりました"
      echo "ℹ️  アクティブなプロセス以外は手動で終了してください"
    fi
  fi
else
  echo "ℹ️  ポート3000でnpm run devは実行されていません"
fi

# 4. 孤立したnodeプロセスをチェック
echo ""
echo "📊 孤立したnodeプロセスを確認中..."
ORPHAN_NODES=$(ps aux | grep -E "node.*next|node.*[Nn]ext-server" | grep -v grep | wc -l | tr -d ' ')

if [ "$ORPHAN_NODES" -gt 2 ]; then
  echo "⚠️  ${ORPHAN_NODES} 個のnextjs関連nodeプロセスが見つかりました"
  echo "ℹ️  必要に応じて手動で確認してください: ps aux | grep -E 'node.*next'"
else
  echo "✅ nodeプロセスは正常範囲内です"
fi

echo ""
echo "✨ クリーンアップ完了!"
echo ""
echo "💡 Tips:"
echo "  - playwright MCPが動かない場合: このスクリプトを実行してください"
echo "  - npm run dev実行前: lsof -i :3000 で既存プロセスを確認"
echo "  - 強制クリーンアップ: ./scripts/cleanup-processes.sh --force"

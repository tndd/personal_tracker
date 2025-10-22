#!/bin/bash

# Personal Tracker 安全なnpm run dev起動スクリプト
# 既存のプロセスをチェックし、必要に応じてクリーンアップしてから起動します

set -e

echo "🚀 Personal Tracker開発サーバーを起動します..."
echo ""

# 1. ポート3000の使用状況を確認
PORT_3000_PID=$(lsof -ti :3000 || true)

if [ -n "$PORT_3000_PID" ]; then
  echo "⚠️  ポート3000は既に使用されています (PID: $PORT_3000_PID)"
  echo ""
  echo "プロセス情報:"
  ps -p "$PORT_3000_PID" -o pid,comm,args || true
  echo ""

  read -p "このプロセスを終了して新しく起動しますか? (y/N): " -n 1 -r
  echo ""

  if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "🗑️  既存のプロセスを終了します..."
    kill "$PORT_3000_PID" || true
    sleep 2

    # プロセスが残っている場合は強制終了
    if lsof -ti :3000 > /dev/null 2>&1; then
      echo "⚡ 強制終了します..."
      kill -9 "$PORT_3000_PID" || true
      sleep 1
    fi

    echo "✅ 既存のプロセスを終了しました"
  else
    echo "❌ 起動をキャンセルしました"
    exit 1
  fi
fi

# 2. .nextキャッシュのクリーンアップ (オプション)
if [ "$1" = "--clean" ]; then
  echo "🧹 .nextキャッシュをクリーンアップします..."
  rm -rf .next
  echo "✅ クリーンアップ完了"
  echo ""
fi

# 3. playwright MCPプロセスの重複チェック
PLAYWRIGHT_COUNT=$(pgrep -f "mcp-server-playwright" | wc -l | tr -d ' ')

if [ "$PLAYWRIGHT_COUNT" -gt 1 ]; then
  echo "⚠️  playwright MCPプロセスが ${PLAYWRIGHT_COUNT} 個重複しています"
  echo "💡 playwright MCPが正常に動作しない場合は、以下を実行してください:"
  echo "   ./scripts/cleanup-processes.sh"
  echo ""
fi

# 4. npm run devを起動
echo "🌐 開発サーバーを起動中..."
echo "📍 URL: http://localhost:3000"
echo ""

npm run dev

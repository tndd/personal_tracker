"use client";

import { useState } from "react";
import { DailyCard } from "@/components/daily/daily-card";
import { ArrowUp, LayoutGrid, List } from "lucide-react";
import { Button } from "@/components/ui/button";

// モックデータ
const mockDailies = [
  {
    date: "2025-10-13",
    memo: "今日は調子が良かった。朝から散歩して、午後は読書。夜もぐっすり眠れそう。",
    condition: 1,
  },
  {
    date: "2025-10-12",
    memo: "特に変化なし。普通の一日。",
    condition: 0,
  },
  {
    date: "2025-10-11",
    memo: "頭痛がひどくて辛い一日だった。早めに薬を飲んで休んだ。",
    condition: -2,
  },
  {
    date: "2025-10-10",
    memo: "友人と会ってリフレッシュできた。久しぶりに外食も楽しめた。",
    condition: 2,
  },
  {
    date: "2025-10-09",
    memo: null,
    condition: 0,
  },
];

export default function DailyPage() {
  const [dailies] = useState(mockDailies);
  const [viewMode, setViewMode] = useState<"list" | "calendar">("list");

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      {/* ヘッダー */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Daily</h1>
          <p className="mt-1 text-sm text-gray-500">日々の日記を記録</p>
        </div>

        {/* ビュー切り替え（モック） */}
        <div className="flex gap-1 rounded-lg border p-1">
          <Button
            variant={viewMode === "list" ? "default" : "ghost"}
            size="sm"
            onClick={() => setViewMode("list")}
            className="gap-2"
          >
            <List className="h-4 w-4" />
            リスト
          </Button>
          <Button
            variant={viewMode === "calendar" ? "default" : "ghost"}
            size="sm"
            onClick={() => setViewMode("calendar")}
            className="gap-2"
          >
            <LayoutGrid className="h-4 w-4" />
            カレンダー
          </Button>
        </div>
      </div>

      {viewMode === "list" ? (
        <>
          {/* 過去を読み込むボタン（モック） */}
          <div className="flex justify-center">
            <button className="flex items-center gap-2 rounded-md px-4 py-2 text-sm text-gray-500 hover:bg-gray-100 transition-colors">
              <ArrowUp className="h-4 w-4" />
              過去の日記を読み込む
            </button>
          </div>

          {/* 日記一覧 */}
          <div className="space-y-3">
            {dailies.map((daily) => (
              <DailyCard
                key={daily.date}
                {...daily}
                onEdit={() => console.log("Edit", daily.date)}
              />
            ))}
          </div>

          {/* 無限スクロール用のセンチネル */}
          <div className="h-20 flex items-center justify-center text-sm text-gray-400">
            これより古い日記はありません
          </div>
        </>
      ) : (
        <div className="flex h-96 items-center justify-center rounded-lg border-2 border-dashed">
          <p className="text-gray-400">カレンダービュー（未実装）</p>
        </div>
      )}
    </div>
  );
}

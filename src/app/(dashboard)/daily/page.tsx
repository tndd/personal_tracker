"use client";

import { useState } from "react";
import { DailyCard } from "@/components/daily/daily-card";
import { CalendarView } from "@/components/daily/calendar-view";
import { DailyFormDialog } from "@/components/daily/daily-form-dialog";
import { ArrowUp, LayoutGrid, List, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";

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
  const [dailies, setDailies] = useState(mockDailies);
  const [viewMode, setViewMode] = useState<"list" | "calendar">("calendar");
  const [showFormDialog, setShowFormDialog] = useState(false);

  // 今日の日付
  const today = format(new Date(), "yyyy-MM-dd");
  // 今日の日記が既に存在するかチェック
  const hasTodayEntry = dailies.some((daily) => daily.date === today);

  const handleSubmit = (data: { memo: string; condition: number }) => {
    const newDaily = {
      date: today,
      memo: data.memo || null,
      condition: data.condition,
    };
    setDailies([newDaily, ...dailies]);
  };

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
            variant={viewMode === "calendar" ? "default" : "ghost"}
            size="sm"
            onClick={() => setViewMode("calendar")}
            className="gap-2"
          >
            <LayoutGrid className="h-4 w-4" />
            カレンダー
          </Button>
          <Button
            variant={viewMode === "list" ? "default" : "ghost"}
            size="sm"
            onClick={() => setViewMode("list")}
            className="gap-2"
          >
            <List className="h-4 w-4" />
            リスト
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
        <CalendarView
          dailies={dailies}
          onEdit={(date) => console.log("Edit", date)}
        />
      )}

      {/* FAB（Floating Action Button） */}
      <button
        onClick={() => setShowFormDialog(true)}
        disabled={hasTodayEntry}
        className={`fixed bottom-8 right-8 flex h-14 w-14 items-center justify-center rounded-full shadow-lg transition-all ${
          hasTodayEntry
            ? "bg-gray-400 cursor-not-allowed"
            : "bg-blue-600 hover:bg-blue-700 hover:scale-110"
        }`}
        title={hasTodayEntry ? "今日の日記は既に記録済みです" : "今日の日記を追加"}
      >
        <Plus className="h-6 w-6 text-white" />
      </button>

      {/* 日記作成ダイアログ */}
      <DailyFormDialog
        isOpen={showFormDialog}
        onClose={() => setShowFormDialog(false)}
        onSubmit={handleSubmit}
        date={today}
      />
    </div>
  );
}

"use client";

import { useState, useEffect, useMemo } from "react";
import { DailyCard } from "@/components/daily/daily-card";
import { CalendarView } from "@/components/daily/calendar-view";
import { DailyFormDialog } from "@/components/daily/daily-form-dialog";
import { DailySidebarContent } from "@/components/daily/daily-sidebar-content";
import { useSidebarContent } from "@/contexts/sidebar-content-context";
import { ArrowUp, LayoutGrid, List, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";

// モックデータの型定義
type DailyData = {
  date: string;
  memo: string | null;
  condition: number;
  sleepStart: string | null;
  sleepEnd: string | null;
  sleepQuality: number | null;
};

// モックデータ
const mockDailies: DailyData[] = [
  {
    date: "2025-10-13",
    memo: "今日は調子が良かった。朝から散歩して、午後は読書。夜もぐっすり眠れそう。",
    condition: 1,
    sleepStart: "2025-10-12T23:30:00.000Z",
    sleepEnd: "2025-10-13T07:00:00.000Z",
    sleepQuality: 2,
  },
  {
    date: "2025-10-12",
    memo: "特に変化なし。普通の一日。",
    condition: 0,
    sleepStart: "2025-10-11T23:00:00.000Z",
    sleepEnd: "2025-10-12T06:30:00.000Z",
    sleepQuality: 0,
  },
  {
    date: "2025-10-11",
    memo: "頭痛がひどくて辛い一日だった。早めに薬を飲んで休んだ。",
    condition: -2,
    sleepStart: "2025-10-10T22:00:00.000Z",
    sleepEnd: "2025-10-11T05:00:00.000Z",
    sleepQuality: -2,
  },
  {
    date: "2025-10-10",
    memo: "友人と会ってリフレッシュできた。久しぶりに外食も楽しめた。",
    condition: 2,
    sleepStart: "2025-10-09T23:00:00.000Z",
    sleepEnd: "2025-10-10T08:00:00.000Z",
    sleepQuality: 1,
  },
  {
    date: "2025-10-09",
    memo: null,
    condition: 0,
    sleepStart: null,
    sleepEnd: null,
    sleepQuality: null,
  },
];

export default function DailyPage() {
  const { setSidebarContent } = useSidebarContent();

  const [dailies, setDailies] = useState(mockDailies);
  const [viewMode, setViewMode] = useState<"list" | "calendar">("calendar");
  const [showFormDialog, setShowFormDialog] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string>("");
  const [selectedCondition, setSelectedCondition] = useState<number | null>(null);

  // 今日の日付
  const today = format(new Date(), "yyyy-MM-dd");
  // 今日の日記が既に存在するかチェック
  const hasTodayEntry = dailies.some((daily) => daily.date === today);

  // サイドバーコンテンツを設定
  useEffect(() => {
    setSidebarContent(
      <DailySidebarContent
        selectedCondition={selectedCondition}
        onConditionChange={setSelectedCondition}
      />
    );

    // クリーンアップ時にサイドバーコンテンツをクリア
    return () => setSidebarContent(null);
  }, [selectedCondition, setSidebarContent]);

  const handleOpenForm = (date: string) => {
    setSelectedDate(date);
    setShowFormDialog(true);
  };

  // フィルタリング（リスト表示用）
  const filteredDailies = useMemo(() => {
    if (selectedCondition === null) {
      return dailies;
    }
    return dailies.filter((daily) => daily.condition === selectedCondition);
  }, [dailies, selectedCondition]);

  const handleSubmit = (data: {
    memo: string;
    condition: number;
    sleepStart?: string | null;
    sleepEnd?: string | null;
    sleepQuality?: number | null;
  }) => {
    const updatedDaily = {
      date: selectedDate,
      memo: data.memo || null,
      condition: data.condition,
      sleepStart: data.sleepStart ?? null,
      sleepEnd: data.sleepEnd ?? null,
      sleepQuality: data.sleepQuality ?? null,
    };

    // 既存の日記があれば更新、なければ追加
    const existingIndex = dailies.findIndex((d) => d.date === selectedDate);
    let updatedDailies;

    if (existingIndex >= 0) {
      // 既存の日記を更新
      updatedDailies = [...dailies];
      updatedDailies[existingIndex] = updatedDaily;
    } else {
      // 新規追加して日付順にソート（新しい順）
      updatedDailies = [...dailies, updatedDaily].sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
      );
    }

    setDailies(updatedDailies);
  };

  return (
    <div className="mx-auto max-w-3xl space-y-4 sm:space-y-6">
      {/* ヘッダー */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold text-gray-900">Daily</h1>
          <p className="mt-1 text-sm text-gray-500">日々の日記を記録</p>
        </div>

        {/* ビュー切り替え（モック） */}
        <div className="flex gap-1 rounded-lg border p-1 self-start sm:self-auto">
          <Button
            variant={viewMode === "calendar" ? "default" : "ghost"}
            size="sm"
            onClick={() => setViewMode("calendar")}
            className="gap-2"
          >
            <LayoutGrid className="h-4 w-4" />
            <span className="hidden sm:inline">カレンダー</span>
          </Button>
          <Button
            variant={viewMode === "list" ? "default" : "ghost"}
            size="sm"
            onClick={() => setViewMode("list")}
            className="gap-2"
          >
            <List className="h-4 w-4" />
            <span className="hidden sm:inline">リスト</span>
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
          {filteredDailies.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              {selectedCondition !== null
                ? "該当するコンディションの日記がありません"
                : "日記がありません"}
            </div>
          ) : (
            <div className="space-y-3">
              {filteredDailies.map((daily) => (
                <DailyCard
                  key={daily.date}
                  {...daily}
                  onEdit={() => handleOpenForm(daily.date)}
                />
              ))}
            </div>
          )}

          {/* 無限スクロール用のセンチネル */}
          {filteredDailies.length > 0 && (
            <div className="h-20 flex items-center justify-center text-sm text-gray-400">
              これより古い日記はありません
            </div>
          )}
        </>
      ) : (
        <CalendarView
          dailies={dailies}
          onEdit={handleOpenForm}
          onAddNew={handleOpenForm}
          selectedCondition={selectedCondition}
        />
      )}

      {/* FAB（Floating Action Button） */}
      <button
        onClick={() => handleOpenForm(today)}
        disabled={hasTodayEntry}
        className={`fixed bottom-6 right-6 sm:bottom-8 sm:right-8 flex h-12 w-12 sm:h-14 sm:w-14 items-center justify-center rounded-full shadow-lg transition-all z-30 ${
          hasTodayEntry
            ? "bg-gray-400 cursor-not-allowed"
            : "bg-blue-600 hover:bg-blue-700 hover:scale-110"
        }`}
        title={hasTodayEntry ? "今日の日記は既に記録済みです" : "今日の日記を追加"}
      >
        <Plus className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
      </button>

      {/* 日記作成・編集ダイアログ */}
      <DailyFormDialog
        isOpen={showFormDialog}
        onClose={() => setShowFormDialog(false)}
        onSubmit={handleSubmit}
        date={selectedDate}
        initialMemo={dailies.find((d) => d.date === selectedDate)?.memo || ""}
        initialCondition={dailies.find((d) => d.date === selectedDate)?.condition ?? 0}
        initialSleepStart={dailies.find((d) => d.date === selectedDate)?.sleepStart}
        initialSleepEnd={dailies.find((d) => d.date === selectedDate)?.sleepEnd}
        initialSleepQuality={dailies.find((d) => d.date === selectedDate)?.sleepQuality}
      />
    </div>
  );
}

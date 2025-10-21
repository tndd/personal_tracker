"use client";

import { useState, useEffect, useMemo } from "react";
import { DailyCard } from "@/components/daily/daily-card";
import { CalendarView } from "@/components/daily/calendar-view";
import { DailyFormDialog } from "@/components/daily/daily-form-dialog";
import { DailySidebarContent } from "@/components/daily/daily-sidebar-content";
import { normalizeCondition, type ConditionValue } from "@/constants/condition-style";
import { useSidebarContent } from "@/contexts/sidebar-content-context";
import { ArrowUp, LayoutGrid, List, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";

// データの型定義
type DailyApiItem = {
  date: string;
  memo: string | null;
  condition: number;
  sleepStart: string | null;
  sleepEnd: string | null;
};

type DailyData = {
  date: string;
  memo: string | null;
  condition: ConditionValue;
  sleepStart: string | null;
  sleepEnd: string | null;
};

export default function DailyPage() {
  const { setSidebarContent } = useSidebarContent();

  const [dailies, setDailies] = useState<DailyData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [viewMode, setViewMode] = useState<"list" | "calendar">("calendar");
  const [showFormDialog, setShowFormDialog] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string>("");
  const [selectedCondition, setSelectedCondition] = useState<ConditionValue | null>(null);

  // 今日の日付
  const today = format(new Date(), "yyyy-MM-dd");
  // 今日の日記が既に存在するかチェック
  const hasTodayEntry = dailies.some((daily) => daily.date === today);

  // データ取得
  useEffect(() => {
    const fetchDailies = async () => {
      try {
        setIsLoading(true);

        // 90日分のデータを取得
        const today = new Date();
        const from = new Date(today);
        from.setDate(today.getDate() - 89); // 今日を含めて90日分

        const fromStr = format(from, "yyyy-MM-dd");
        const toStr = format(today, "yyyy-MM-dd");

        const response = await fetch(`/api/daily?from=${fromStr}&to=${toStr}`);

        if (!response.ok) {
          throw new Error("データの取得に失敗しました");
        }

        const data = await response.json();
        const items: DailyApiItem[] = data.items || [];
        setDailies(
          items.map((item) => ({
            ...item,
            condition: normalizeCondition(item.condition),
          }))
        );
      } catch (error) {
        console.error("データ取得エラー:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchDailies();
  }, []);

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
    condition: ConditionValue;
    sleepStart?: string | null;
    sleepEnd?: string | null;
  }) => {
    const updatedDaily = {
      date: selectedDate,
      memo: data.memo || null,
      condition: data.condition,
      sleepStart: data.sleepStart ?? null,
      sleepEnd: data.sleepEnd ?? null,
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

  // ローディング中の表示
  if (isLoading) {
    return (
      <div className="mx-auto max-w-3xl">
        <div className="flex items-center justify-center py-12">
          <div className="text-gray-500">読み込み中...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-4 sm:space-y-6">
      {/* ヘッダー */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold text-gray-900">Daily</h1>
          <p className="mt-1 text-sm text-gray-500">日々の日記を記録</p>
        </div>

        {/* ビュー切り替え */}
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
      />
    </div>
  );
}

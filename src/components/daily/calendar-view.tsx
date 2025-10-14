"use client";

import { useState } from "react";
import {
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  format,
  isSameMonth,
  addMonths,
  subMonths,
  isSameDay,
} from "date-fns";
import { ja } from "date-fns/locale";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Daily {
  date: string;
  memo: string | null;
  condition: number;
}

interface CalendarViewProps {
  dailies: Daily[];
  onEdit?: (date: string) => void;
  onAddNew?: (date: string) => void;
}

// コンディションの色設定
const conditionColors = {
  2: "bg-green-600",
  1: "bg-green-400",
  0: "bg-gray-400",
  "-1": "bg-orange-400",
  "-2": "bg-red-600",
} as const;

export function CalendarView({ dailies, onEdit, onAddNew }: CalendarViewProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date());

  // dailiesを日付でマップ化
  const dailyMap = new Map(dailies.map((d) => [d.date, d]));

  // カレンダーの日付配列を生成
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const calendarStart = startOfWeek(monthStart, { locale: ja });
  const calendarEnd = endOfWeek(monthEnd, { locale: ja });
  const calendarDays = eachDayOfInterval({
    start: calendarStart,
    end: calendarEnd,
  });

  const handlePrevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));
  const handleNextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));
  const handleToday = () => setCurrentMonth(new Date());

  const handleDayClick = (day: Date) => {
    const dateStr = format(day, "yyyy-MM-dd");
    const daily = dailyMap.get(dateStr);

    console.log("日付クリック:", dateStr, "既存の日記:", !!daily);

    if (daily) {
      // 既存の日記がある場合は編集フォームを開く
      console.log("既存の日記を編集");
      onEdit?.(dateStr);
    } else {
      // 空白の日で今日以前の場合は新規作成（未来の日付は不可）
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const isInMonth = isSameMonth(day, currentMonth);
      const isNotFuture = day <= today;

      console.log("新規作成チェック:", {
        isInMonth,
        isNotFuture,
        today: format(today, "yyyy-MM-dd"),
      });

      if (isNotFuture && isInMonth) {
        console.log("新規作成フォームを開く:", dateStr);
        onAddNew?.(dateStr);
      } else {
        console.log("条件を満たさないためスキップ");
      }
    }
  };

  return (
    <div className="space-y-4">
      {/* 月の切り替えヘッダー */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <h2 className="text-lg sm:text-xl font-semibold">
          {format(currentMonth, "yyyy年M月", { locale: ja })}
        </h2>
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <Button variant="outline" size="sm" onClick={handleToday}>
            今日
          </Button>
          <Button variant="outline" size="sm" onClick={handlePrevMonth}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={handleNextMonth}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* カレンダーグリッド */}
      <div className="rounded-lg border bg-white overflow-hidden">
        {/* 曜日ヘッダー */}
        <div className="grid grid-cols-7 border-b">
          {["日", "月", "火", "水", "木", "金", "土"].map((day, i) => (
            <div
              key={day}
              className={`py-1 sm:py-2 text-center text-xs sm:text-sm font-semibold ${
                i === 0 ? "text-red-600" : i === 6 ? "text-blue-600" : "text-gray-700"
              }`}
            >
              {day}
            </div>
          ))}
        </div>

        {/* 日付グリッド */}
        <div className="grid grid-cols-7">
          {calendarDays.map((day, i) => {
            const dateStr = format(day, "yyyy-MM-dd");
            const daily = dailyMap.get(dateStr);
            const isCurrentMonth = isSameMonth(day, currentMonth);
            const isToday = isSameDay(day, new Date());

            // 今日以前の日付かチェック（未来の日付は不可）
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const isNotFuture = day <= today;

            // クリック可能：既存の日記がある または 今日以前の当月の日
            const isClickable = daily || (isNotFuture && isCurrentMonth);

            return (
              <button
                key={i}
                onClick={() => handleDayClick(day)}
                disabled={!isClickable}
                className={`
                  relative aspect-square border-b border-r p-1 sm:p-2
                  transition-colors
                  ${!isCurrentMonth ? "bg-gray-50" : ""}
                  ${isClickable ? "hover:bg-gray-100 cursor-pointer" : "cursor-default"}
                  ${isToday ? "ring-1 sm:ring-2 ring-blue-500 ring-inset" : ""}
                `}
              >
                {/* 日付 */}
                <div
                  className={`text-xs sm:text-sm font-medium ${
                    !isCurrentMonth
                      ? "text-gray-400"
                      : isToday
                        ? "text-blue-600 font-bold"
                        : "text-gray-700"
                  }`}
                >
                  {format(day, "d")}
                </div>

                {/* コンディション表示（色の丸） */}
                {daily && (
                  <div className="mt-0.5 sm:mt-1 flex justify-center">
                    <div
                      className={`h-4 w-4 sm:h-6 sm:w-6 rounded-full ${
                        conditionColors[daily.condition as keyof typeof conditionColors]
                      }`}
                      title={`コンディション: ${daily.condition > 0 ? "+" : ""}${daily.condition}`}
                    />
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>

    </div>
  );
}

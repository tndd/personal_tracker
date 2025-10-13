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
import { DailyCard } from "./daily-card";
import { Card } from "@/components/ui/card";

interface Daily {
  date: string;
  memo: string | null;
  condition: number;
}

interface CalendarViewProps {
  dailies: Daily[];
  onEdit?: (date: string) => void;
}

// コンディションの色設定
const conditionColors = {
  2: "bg-green-600",
  1: "bg-green-400",
  0: "bg-gray-400",
  "-1": "bg-orange-400",
  "-2": "bg-red-600",
} as const;

export function CalendarView({ dailies, onEdit }: CalendarViewProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDaily, setSelectedDaily] = useState<Daily | null>(null);

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
    if (daily) {
      setSelectedDaily(daily);
    }
  };

  return (
    <div className="space-y-4">
      {/* 月の切り替えヘッダー */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">
          {format(currentMonth, "yyyy年M月", { locale: ja })}
        </h2>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleToday}>
            今日
          </Button>
          <Button variant="outline" size="icon" onClick={handlePrevMonth}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon" onClick={handleNextMonth}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* カレンダーグリッド */}
      <div className="rounded-lg border bg-white">
        {/* 曜日ヘッダー */}
        <div className="grid grid-cols-7 border-b">
          {["日", "月", "火", "水", "木", "金", "土"].map((day, i) => (
            <div
              key={day}
              className={`py-2 text-center text-sm font-semibold ${
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

            return (
              <button
                key={i}
                onClick={() => handleDayClick(day)}
                disabled={!daily}
                className={`
                  relative aspect-square border-b border-r p-2
                  transition-colors
                  ${!isCurrentMonth ? "bg-gray-50" : ""}
                  ${daily ? "hover:bg-gray-100 cursor-pointer" : "cursor-default"}
                  ${isToday ? "ring-2 ring-blue-500 ring-inset" : ""}
                `}
              >
                {/* 日付 */}
                <div
                  className={`text-sm font-medium ${
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
                  <div className="mt-1 flex justify-center">
                    <div
                      className={`h-6 w-6 rounded-full ${
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

      {/* 選択された日の詳細 */}
      {selectedDaily && (
        <Card className="p-4">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-lg font-semibold">
              {format(new Date(selectedDaily.date + "T00:00:00"), "M月d日 (E)", {
                locale: ja,
              })}
            </h3>
            <Button variant="ghost" size="sm" onClick={() => setSelectedDaily(null)}>
              閉じる
            </Button>
          </div>
          <DailyCard
            {...selectedDaily}
            onEdit={() => {
              setSelectedDaily(null);
              onEdit?.(selectedDaily.date);
            }}
          />
        </Card>
      )}
    </div>
  );
}

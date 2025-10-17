"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";

interface DailyFormDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: {
    memo: string;
    condition: number;
    sleepStart?: string | null;
    sleepEnd?: string | null;
  }) => void;
  date: string; // YYYY-MM-DD
  initialMemo?: string; // 既存の日記内容（編集時）
  initialCondition?: number; // 既存のコンディション（編集時）
  initialSleepStart?: string | null; // 既存の就寝時刻（編集時）
  initialSleepEnd?: string | null; // 既存の起床時刻（編集時）
}

const conditionOptions = [
  { value: 2, label: "+2", description: "最高", bgColor: "bg-green-600" },
  { value: 1, label: "+1", description: "良い", bgColor: "bg-green-400" },
  { value: 0, label: "±0", description: "普通", bgColor: "bg-gray-400" },
  { value: -1, label: "-1", description: "悪い", bgColor: "bg-orange-400" },
  { value: -2, label: "-2", description: "最悪", bgColor: "bg-red-600" },
];

export function DailyFormDialog({
  isOpen,
  onClose,
  onSubmit,
  date,
  initialMemo = "",
  initialCondition = 0,
  initialSleepStart = null,
  initialSleepEnd = null,
}: DailyFormDialogProps) {
  const [memo, setMemo] = useState(initialMemo);
  const [condition, setCondition] = useState(initialCondition);
  const [sleepStart, setSleepStart] = useState(initialSleepStart);
  const [sleepEnd, setSleepEnd] = useState(initialSleepEnd);

  // ダイアログが開いた時に既存データで初期化
  useEffect(() => {
    if (isOpen) {
      setMemo(initialMemo);
      setCondition(initialCondition);
      setSleepStart(initialSleepStart);
      setSleepEnd(initialSleepEnd);
    }
  }, [isOpen, initialMemo, initialCondition, initialSleepStart, initialSleepEnd]);

  if (!isOpen || !date) return null;

  const handleSubmit = () => {
    onSubmit({
      memo: memo.trim(),
      condition,
      sleepStart,
      sleepEnd,
    });
    // リセット
    setMemo("");
    setCondition(0);
    setSleepStart(null);
    setSleepEnd(null);
    onClose();
  };

  // ISO文字列から時刻部分のみ抽出 (HH:mm)
  const formatTimeOnly = (isoString: string | null) => {
    if (!isoString) return "";
    const date = new Date(isoString);
    const hours = String(date.getHours()).padStart(2, "0");
    const minutes = String(date.getMinutes()).padStart(2, "0");
    return `${hours}:${minutes}`;
  };

  // 時刻文字列(HH:mm)とベース日付からISO文字列を生成
  const parseTimeToISO = (timeString: string, baseDate: string) => {
    if (!timeString) return null;
    const [hours, minutes] = timeString.split(":");
    // 就寝時刻の場合は前日の可能性を考慮
    // 例: 23:00 -> 前日の23:00、07:00 -> 当日の07:00
    const targetDate = new Date(baseDate + "T00:00:00");
    const timeValue = parseInt(hours) * 60 + parseInt(minutes);

    // 就寝時刻が遅い時間(19:00以降)の場合は前日とみなす
    if (timeValue >= 19 * 60) {
      targetDate.setDate(targetDate.getDate() - 1);
    }

    targetDate.setHours(parseInt(hours), parseInt(minutes), 0, 0);
    return targetDate.toISOString();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Cmd+Enter または Ctrl+Enter で送信
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
      e.preventDefault();
      handleSubmit();
    }
  };

  const dateObj = new Date(date + "T00:00:00");
  const formattedDate = dateObj.toLocaleDateString("ja-JP", {
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "short",
  });

  return (
    <>
      {/* 背景オーバーレイ */}
      <div
        className="fixed inset-0 z-[60] bg-black/50"
        onClick={onClose}
      />

      {/* ダイアログ */}
      <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
        <Card className="w-full max-w-2xl">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
            <CardTitle>{formattedDate}の日記</CardTitle>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="h-5 w-5" />
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* メモ入力 */}
            <div className="space-y-2">
              <label className="text-sm font-medium">日記</label>
              <Textarea
                value={memo}
                onChange={(e) => setMemo(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="今日の出来事を記録..."
                className="min-h-[200px] resize-none"
                maxLength={5000}
              />
              <p className="text-xs text-gray-500">{memo.length}/5000</p>
            </div>

            {/* コンディション選択 */}
            <div className="space-y-2">
              <label className="text-sm font-medium">コンディション</label>
              <div className="grid grid-cols-5 gap-2">
                {conditionOptions.map((option) => (
                  <button
                    key={option.value}
                    onClick={() => setCondition(option.value)}
                    className={`flex flex-col items-center gap-2 rounded-md border-2 p-3 transition-colors ${
                      condition === option.value
                        ? "border-blue-500 bg-blue-50"
                        : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                    }`}
                  >
                    <span className={`h-8 w-8 rounded-full ${option.bgColor}`} />
                    <div className="text-center">
                      <div className="text-sm font-medium">{option.label}</div>
                      <div className="text-xs text-gray-500">{option.description}</div>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* 睡眠記録 */}
            <div className="space-y-3 rounded-lg border p-4">
              <label className="text-sm font-medium">睡眠記録</label>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs text-gray-600">就寝時刻</label>
                  <input
                    type="time"
                    value={formatTimeOnly(sleepStart)}
                    onChange={(e) => setSleepStart(parseTimeToISO(e.target.value, date))}
                    onClick={(e) => {
                      try {
                        (e.target as HTMLInputElement).showPicker?.();
                      } catch (error) {
                        // showPicker()がサポートされていない場合は何もしない
                      }
                    }}
                    className="w-full cursor-pointer rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs text-gray-600">起床時刻</label>
                  <input
                    type="time"
                    value={formatTimeOnly(sleepEnd)}
                    onChange={(e) => setSleepEnd(parseTimeToISO(e.target.value, date))}
                    onClick={(e) => {
                      try {
                        (e.target as HTMLInputElement).showPicker?.();
                      } catch (error) {
                        // showPicker()がサポートされていない場合は何もしない
                      }
                    }}
                    className="w-full cursor-pointer rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                  />
                </div>
              </div>
            </div>

            {/* 送信ボタン */}
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={onClose}>
                キャンセル
              </Button>
              <Button onClick={handleSubmit}>
                保存
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
}

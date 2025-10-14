"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";

interface DailyFormDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: { memo: string; condition: number }) => void;
  date: string; // YYYY-MM-DD
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
}: DailyFormDialogProps) {
  const [memo, setMemo] = useState("");
  const [condition, setCondition] = useState(0);

  if (!isOpen || !date) return null;

  const handleSubmit = () => {
    onSubmit({ memo: memo.trim(), condition });
    // リセット
    setMemo("");
    setCondition(0);
    onClose();
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
        className="fixed inset-0 z-40 bg-black/50"
        onClick={onClose}
      />

      {/* ダイアログ */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
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

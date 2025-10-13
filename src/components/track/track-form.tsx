"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Send } from "lucide-react";

// コンディションの選択肢
const conditionOptions = [
  { value: -2, emoji: "😞", label: "-2" },
  { value: -1, emoji: "😟", label: "-1" },
  { value: 0, emoji: "😐", label: "±0" },
  { value: 1, emoji: "🙂", label: "+1" },
  { value: 2, emoji: "😄", label: "+2" },
];

interface TrackFormProps {
  onSubmit?: (data: { memo: string; condition: number; tagIds: string[] }) => void;
}

export function TrackForm({ onSubmit }: TrackFormProps) {
  const [memo, setMemo] = useState("");
  const [condition, setCondition] = useState(0);

  const handleSubmit = () => {
    if (!memo.trim()) return;

    onSubmit?.({
      memo: memo.trim(),
      condition,
      tagIds: [], // TODO: タグ選択機能
    });

    // リセット
    setMemo("");
    setCondition(0);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Cmd+Enter または Ctrl+Enter で送信
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <Card>
      <CardContent className="p-4">
        <div className="space-y-4">
          {/* メモ入力 */}
          <Textarea
            value={memo}
            onChange={(e) => setMemo(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="何かメモを記録..."
            className="min-h-[100px] resize-none"
            maxLength={1000}
          />

          {/* コンディション選択 */}
          <div className="flex items-center justify-between">
            <div className="flex gap-2">
              {conditionOptions.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setCondition(option.value)}
                  className={`flex h-10 w-10 items-center justify-center rounded-md border-2 transition-all ${
                    condition === option.value
                      ? "border-blue-600 bg-blue-50"
                      : "border-gray-200 hover:border-gray-300"
                  }`}
                  title={option.label}
                >
                  <span className="text-lg">{option.emoji}</span>
                </button>
              ))}
            </div>

            {/* 送信ボタン */}
            <Button
              onClick={handleSubmit}
              disabled={!memo.trim()}
              className="gap-2"
            >
              <Send className="h-4 w-4" />
              記録
            </Button>
          </div>

          {/* ヒント */}
          <p className="text-xs text-gray-500">
            ⌘+Enter で送信 • {memo.length}/1000
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

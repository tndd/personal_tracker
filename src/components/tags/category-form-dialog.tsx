"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";

interface CategoryFormDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: { name: string; color: string }) => void;
  initialName?: string; // 既存のカテゴリ名（編集時）
  initialColor?: string; // 既存の色（編集時）
}

// 色プリセット
const colorPresets = [
  { name: "青", value: "#3B82F6" },
  { name: "赤", value: "#EF4444" },
  { name: "緑", value: "#10B981" },
  { name: "黄", value: "#F59E0B" },
  { name: "紫", value: "#8B5CF6" },
  { name: "ピンク", value: "#EC4899" },
  { name: "シアン", value: "#06B6D4" },
  { name: "オレンジ", value: "#F97316" },
];

export function CategoryFormDialog({
  isOpen,
  onClose,
  onSubmit,
  initialName = "",
  initialColor = "#3B82F6",
}: CategoryFormDialogProps) {
  const [categoryName, setCategoryName] = useState(initialName);
  const [selectedColor, setSelectedColor] = useState(initialColor);

  // ダイアログが開いた時に既存データで初期化
  useEffect(() => {
    if (isOpen) {
      setCategoryName(initialName);
      setSelectedColor(initialColor);
    }
  }, [isOpen, initialName, initialColor]);

  if (!isOpen) return null;

  const handleSubmit = () => {
    const trimmedName = categoryName.trim();
    if (trimmedName) {
      onSubmit({ name: trimmedName, color: selectedColor });
      setCategoryName("");
      setSelectedColor("#3B82F6");
      onClose();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Enterで送信
    if (e.key === "Enter") {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <>
      {/* 背景オーバーレイ */}
      <div
        className="fixed inset-0 z-40 bg-black/50"
        onClick={onClose}
      />

      {/* ダイアログ */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
            <CardTitle>
              {initialName ? "カテゴリ編集" : "カテゴリ追加"}
            </CardTitle>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="h-5 w-5" />
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* カテゴリ名入力 */}
            <div className="space-y-2">
              <label className="text-sm font-medium">カテゴリ名</label>
              <Input
                value={categoryName}
                onChange={(e) => setCategoryName(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="例: 服薬"
                maxLength={50}
                autoFocus
              />
              <p className="text-xs text-gray-500">{categoryName.length}/50</p>
            </div>

            {/* 色選択 */}
            <div className="space-y-2">
              <label className="text-sm font-medium">色</label>
              <div className="grid grid-cols-4 gap-2">
                {colorPresets.map((color) => (
                  <button
                    key={color.value}
                    onClick={() => setSelectedColor(color.value)}
                    className={`flex flex-col items-center gap-2 rounded-md border-2 p-3 transition-colors ${
                      selectedColor === color.value
                        ? "border-blue-500 bg-blue-50"
                        : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                    }`}
                  >
                    <div
                      className="h-8 w-8 rounded"
                      style={{ backgroundColor: color.value }}
                    />
                    <span className="text-xs">{color.name}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* プレビュー */}
            {categoryName.trim() && (
              <div className="space-y-2">
                <label className="text-sm font-medium">プレビュー</label>
                <div className="flex items-center gap-3 rounded-md border p-3">
                  <div
                    className="h-4 w-4 rounded"
                    style={{ backgroundColor: selectedColor }}
                  />
                  <span className="font-medium">{categoryName.trim()}</span>
                </div>
              </div>
            )}

            {/* ボタン */}
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={onClose}>
                キャンセル
              </Button>
              <Button onClick={handleSubmit} disabled={!categoryName.trim()}>
                {initialName ? "更新" : "追加"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
}

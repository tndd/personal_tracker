"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";

interface TagFormDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (tagName: string) => void;
  categoryName: string;
  categoryColor: string;
  initialName?: string; // 既存のタグ名（編集時）
}

export function TagFormDialog({
  isOpen,
  onClose,
  onSubmit,
  categoryName,
  categoryColor,
  initialName = "",
}: TagFormDialogProps) {
  const [tagName, setTagName] = useState(initialName);

  // ダイアログが開いた時に既存データで初期化
  useEffect(() => {
    if (isOpen) {
      setTagName(initialName);
    }
  }, [isOpen, initialName]);

  if (!isOpen) return null;

  const handleSubmit = () => {
    const trimmedName = tagName.trim();
    if (trimmedName) {
      onSubmit(trimmedName);
      setTagName("");
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
        className="fixed inset-0 z-[60] bg-black/50"
        onClick={onClose}
      />

      {/* ダイアログ */}
      <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
            <CardTitle>
              {initialName ? "タグ編集" : "タグ追加"} - {categoryName}
            </CardTitle>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="h-5 w-5" />
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* タグ名入力 */}
            <div className="space-y-2">
              <label className="text-sm font-medium">タグ名</label>
              <Input
                value={tagName}
                onChange={(e) => setTagName(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="例: デパス"
                maxLength={50}
                autoFocus
              />
              <p className="text-xs text-gray-500">{tagName.length}/50</p>
            </div>

            {/* プレビュー */}
            {tagName.trim() && (
              <div className="space-y-2">
                <label className="text-sm font-medium">プレビュー</label>
                <div className="flex items-center gap-2">
                  <span
                    className="inline-flex items-center rounded-md px-3 py-1.5 text-sm font-medium"
                    style={{
                      backgroundColor: `${categoryColor}20`,
                      color: categoryColor,
                    }}
                  >
                    {tagName.trim()}
                  </span>
                </div>
              </div>
            )}

            {/* ボタン */}
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={onClose}>
                キャンセル
              </Button>
              <Button onClick={handleSubmit} disabled={!tagName.trim()}>
                {initialName ? "更新" : "追加"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
}

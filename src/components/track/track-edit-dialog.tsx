"use client";

import { useEffect, useRef, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { X, Plus } from "lucide-react";
import { TagSelectorPopup } from "./tag-selector-popup";
import { ConditionSelectorPopup } from "./condition-selector-popup";

interface Tag {
  id: string;
  name: string;
  categoryId: string;
  categoryName: string;
  color: string;
}

interface TrackEditDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: { memo: string; condition: number; tagIds: string[] }) => void;
  trackLabel: string;
  initialMemo: string;
  initialCondition: number;
  initialTags: Tag[];
  errorMessage?: string | null;
  isSubmitting?: boolean;
}

const conditionConfig = {
  2: { label: "+2", bgColor: "bg-green-600" },
  1: { label: "+1", bgColor: "bg-green-400" },
  0: { label: "±0", bgColor: "bg-gray-400" },
  "-1": { label: "-1", bgColor: "bg-orange-400" },
  "-2": { label: "-2", bgColor: "bg-red-600" },
} as const;

/**
 * docs:
 * - 目的: トラック既存データの編集を行うモーダルUIを提供する。
 * - 検証観点:
 *   - 初期値が開いたタイミングで入力欄に反映されること
 *   - タグおよびコンディションの選択を行えること
 *   - 保存時に現在の入力値がそのまま送信されること
 */
export function TrackEditDialog({
  isOpen,
  onClose,
  onSubmit,
  trackLabel,
  initialMemo,
  initialCondition,
  initialTags,
  errorMessage,
  isSubmitting = false,
}: TrackEditDialogProps) {
  const [memo, setMemo] = useState(initialMemo);
  const [condition, setCondition] = useState(initialCondition);
  const [selectedTags, setSelectedTags] = useState<Tag[]>(initialTags);
  const [showTagPopup, setShowTagPopup] = useState(false);
  const [showConditionPopup, setShowConditionPopup] = useState(false);
  const tagButtonRef = useRef<HTMLButtonElement>(null);
  const conditionButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (isOpen) {
      setMemo(initialMemo);
      setCondition(initialCondition);
      setSelectedTags(initialTags);
    }
  }, [isOpen, initialMemo, initialCondition, initialTags]);

  if (!isOpen) {
    return null;
  }

  const currentCondition = conditionConfig[condition as keyof typeof conditionConfig];

  const handleSubmit = () => {
    onSubmit({
      memo: memo.trim(),
      condition,
      tagIds: selectedTags.map((tag) => tag.id),
    });
  };

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
      event.preventDefault();
      handleSubmit();
    }
  };

  const handleTagSelect = (tag: Tag) => {
    setSelectedTags((prev) => {
      if (prev.some((item) => item.id === tag.id)) {
        return prev;
      }
      return [...prev, tag];
    });
    setShowTagPopup(false);
  };

  const handleTagRemove = (tagId: string) => {
    setSelectedTags((prev) => prev.filter((tag) => tag.id !== tagId));
  };

  const getTagPopupPosition = () => {
    if (!tagButtonRef.current) return { bottom: 0, left: 0 };
    const rect = tagButtonRef.current.getBoundingClientRect();
    return {
      bottom: window.innerHeight - rect.top + 8,
      left: rect.left,
    };
  };

  const getConditionPopupPosition = () => {
    if (!conditionButtonRef.current) return { bottom: 0, right: 0 };
    const rect = conditionButtonRef.current.getBoundingClientRect();
    return {
      bottom: window.innerHeight - rect.top + 8,
      right: window.innerWidth - rect.right,
    };
  };

  return (
    <>
      <div className="fixed inset-0 z-[60] bg-black/50" onClick={onClose} />
      <div
        className="fixed inset-0 z-[70] flex items-center justify-center p-4"
        role="dialog"
        aria-modal="true"
        aria-labelledby="track-edit-dialog-title"
      >
        <Card className="w-full max-w-3xl">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
            <CardTitle id="track-edit-dialog-title">{trackLabel} の記録を編集</CardTitle>
            <Button variant="ghost" size="icon" onClick={onClose} aria-label="編集を閉じる">
              <X className="h-5 w-5" />
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">メモ</label>
              <Textarea
                value={memo}
                onChange={(event) => setMemo(event.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="記録内容を更新..."
                className="min-h-[160px] resize-none"
                maxLength={1000}
              />
              <p className="text-xs text-gray-500">{memo.length}/1000</p>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">タグ</label>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  ref={tagButtonRef}
                  type="button"
                  onClick={() => setShowTagPopup((prev) => !prev)}
                className="flex h-9 w-9 items-center justify-center rounded-md border-2 border-dashed border-gray-300 hover:border-gray-400 hover:bg-gray-50 transition-colors"
                title="タグを追加"
                aria-label="タグを追加"
              >
                  <Plus className="h-4 w-4 text-gray-500" />
              </button>
                {selectedTags.map((tag) => (
                  <span
                    key={tag.id}
                    className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-sm font-medium"
                    style={{
                      backgroundColor: `${tag.color}20`,
                      color: tag.color,
                    }}
                  >
                    <span className="hidden sm:inline">{tag.categoryName}/</span>
                    {tag.name}
                    <button
                      type="button"
                      onClick={() => handleTagRemove(tag.id)}
                      className="hover:opacity-70"
                      aria-label={`${tag.name} を外す`}
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
              </div>
              {showTagPopup && (
                <TagSelectorPopup
                  onSelect={handleTagSelect}
                  onClose={() => setShowTagPopup(false)}
                  position={getTagPopupPosition()}
                />
              )}
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">コンディション</label>
              <button
                ref={conditionButtonRef}
                type="button"
                onClick={() => setShowConditionPopup((prev) => !prev)}
                className="flex items-center gap-2 h-10 px-3 rounded-md border-2 border-gray-300 hover:border-gray-400 hover:bg-gray-50 transition-colors"
                title="コンディションを選択"
                aria-label="コンディションを選択"
              >
                <span className={`h-5 w-5 rounded-full ${currentCondition.bgColor}`} />
                <span className="text-sm font-medium">{currentCondition.label}</span>
              </button>
              {showConditionPopup && (
                <ConditionSelectorPopup
                  currentCondition={condition}
                  onSelect={(value) => {
                    setCondition(value);
                    setShowConditionPopup(false);
                  }}
                  onClose={() => setShowConditionPopup(false)}
                  position={getConditionPopupPosition()}
                />
              )}
            </div>

            {errorMessage && (
              <p className="text-sm text-red-500 text-right -mt-2">{errorMessage}</p>
            )}
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
                キャンセル
              </Button>
              <Button onClick={handleSubmit} disabled={isSubmitting}>
                保存
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
}

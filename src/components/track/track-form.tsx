"use client";

import { useState, useRef } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Send, Plus, X } from "lucide-react";
import { TagSelectorPopup } from "./tag-selector-popup";
import { ConditionSelectorPopup } from "./condition-selector-popup";
import {
  CONDITION_COLORS,
  CONDITION_METADATA,
  CONDITION_VALUES_DESC,
  type ConditionValue,
} from "@/constants/condition-style";

interface Tag {
  id: string;
  name: string;
  categoryId: string;
  categoryName: string;
  color: string;
}

interface TrackFormProps {
  onSubmit?: (data: { memo: string; condition: ConditionValue; tagIds: string[] }) => void;
}

const conditionConfig = CONDITION_VALUES_DESC.reduce(
  (acc, value) => {
    acc[value] = {
      label: CONDITION_METADATA[value].label,
      bgColor: CONDITION_COLORS[value].dot,
    };
    return acc;
  },
  {} as Record<ConditionValue, { label: string; bgColor: string }>
);

export function TrackForm({ onSubmit }: TrackFormProps) {
  const [memo, setMemo] = useState("");
  const [condition, setCondition] = useState<ConditionValue>(0);
  const [selectedTags, setSelectedTags] = useState<Tag[]>([]);
  const [showTagPopup, setShowTagPopup] = useState(false);
  const [showConditionPopup, setShowConditionPopup] = useState(false);

  const tagButtonRef = useRef<HTMLButtonElement>(null);
  const conditionButtonRef = useRef<HTMLButtonElement>(null);

  const conditionInfo = conditionConfig[condition];

  const handleSubmit = () => {
    if (!memo.trim()) return;

    onSubmit?.({
      memo: memo.trim(),
      condition,
      tagIds: selectedTags.map((tag) => tag.id),
    });

    // リセット
    setMemo("");
    setCondition(0);
    setSelectedTags([]);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Cmd+Enter または Ctrl+Enter で送信
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleTagSelect = (tag: Tag) => {
    // 同じタグが既に追加されていなければ追加
    if (!selectedTags.find((t) => t.id === tag.id)) {
      setSelectedTags([...selectedTags, tag]);
    }
  };

  const handleTagRemove = (tagId: string) => {
    setSelectedTags(selectedTags.filter((t) => t.id !== tagId));
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
    <Card>
      <CardContent className="p-4">
        <div className="space-y-4">
          {/* メモ入力 */}
          <div className="relative">
            <Textarea
              value={memo}
              onChange={(e) => setMemo(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="何かメモを記録..."
              className="min-h-[100px] resize-none pr-32"
              maxLength={1000}
            />
            {/* ヒント（テキストエリア内部右下） */}
            <p className="absolute right-3 bottom-3 text-xs text-gray-400 pointer-events-none">
              ⌘+Enter で送信
            </p>
          </div>

          {/* 下部コントロール */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
            {/* 左側: タグエリア */}
            <div className="flex-1 flex items-center gap-2 flex-wrap relative min-h-[2rem]">
              {/* タグ追加ボタン */}
              <button
                ref={tagButtonRef}
                onClick={() => setShowTagPopup(!showTagPopup)}
                className="flex h-8 w-8 items-center justify-center rounded-md border-2 border-dashed border-gray-300 hover:border-gray-400 hover:bg-gray-50 transition-colors"
                title="タグ追加"
              >
                <Plus className="h-4 w-4 text-gray-500" />
              </button>

              {/* 選択済みタグ */}
              {selectedTags.map((tag) => (
                <span
                  key={tag.id}
                  className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs sm:text-sm font-medium"
                  style={{
                    backgroundColor: `${tag.color}20`,
                    color: tag.color,
                  }}
                >
                  <span className="hidden sm:inline">{tag.categoryName}/</span>{tag.name}
                  <button
                    onClick={() => handleTagRemove(tag.id)}
                    className="hover:opacity-70"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}

              {/* タグ選択ポップアップ */}
              {showTagPopup && (
                <TagSelectorPopup
                  onSelect={handleTagSelect}
                  onClose={() => setShowTagPopup(false)}
                  position={getTagPopupPosition()}
                />
              )}
            </div>

            {/* 右側: コンディション + 送信ボタン */}
            <div className="flex items-center justify-between sm:justify-start gap-2">
              {/* コンディションボタン */}
              <button
                ref={conditionButtonRef}
                onClick={() => setShowConditionPopup(!showConditionPopup)}
                className="flex items-center gap-2 h-10 px-3 rounded-md border-2 border-gray-300 hover:border-gray-400 hover:bg-gray-50 transition-colors"
                title="コンディション選択"
              >
                <span className={`h-5 w-5 rounded-full ${conditionInfo.bgColor}`} />
                <span className="text-sm font-medium">{conditionInfo.label}</span>
              </button>

              {/* コンディション選択ポップアップ */}
              {showConditionPopup && (
                <ConditionSelectorPopup
                  currentCondition={condition}
                  onSelect={setCondition}
                  onClose={() => setShowConditionPopup(false)}
                  position={getConditionPopupPosition()}
                />
              )}

              {/* 送信ボタン */}
              <Button
                onClick={handleSubmit}
                disabled={!memo.trim()}
                className="gap-2"
              >
                <Send className="h-4 w-4" />
                <span className="hidden sm:inline">記録</span>
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

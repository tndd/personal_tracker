"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { ChevronDown, ChevronRight } from "lucide-react";

// モックデータ（後でAPIから取得）
const mockCategories = [
  {
    id: "cat-1",
    name: "服薬",
    color: "#3B82F6",
    tags: [
      { id: "tag-1", name: "デパス" },
      { id: "tag-2", name: "ワイパックス" },
      { id: "tag-3", name: "リボトリール" },
    ],
  },
  {
    id: "cat-2",
    name: "症状",
    color: "#EF4444",
    tags: [
      { id: "tag-4", name: "頭痛" },
      { id: "tag-5", name: "めまい" },
      { id: "tag-6", name: "吐き気" },
    ],
  },
  {
    id: "cat-3",
    name: "運動",
    color: "#10B981",
    tags: [
      { id: "tag-7", name: "散歩" },
      { id: "tag-8", name: "ジョギング" },
    ],
  },
];

interface Tag {
  id: string;
  name: string;
  categoryId: string;
  categoryName: string;
  color: string;
}

interface TagSelectorPopupProps {
  onSelect: (tag: Tag) => void;
  onClose: () => void;
  position?: { bottom: number; left: number };
}

export function TagSelectorPopup({ onSelect, onClose, position }: TagSelectorPopupProps) {
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());

  const toggleCategory = (categoryId: string) => {
    setExpandedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(categoryId)) {
        next.delete(categoryId);
      } else {
        next.add(categoryId);
      }
      return next;
    });
  };

  const handleTagSelect = (
    tag: typeof mockCategories[0]["tags"][0],
    category: typeof mockCategories[0]
  ) => {
    onSelect({
      id: tag.id,
      name: tag.name,
      categoryId: category.id,
      categoryName: category.name,
      color: category.color,
    });
    // ポップアップは閉じずに選択を継続可能にする
  };

  return (
    <>
      {/* 背景クリックで閉じる */}
      <div
        className="fixed inset-0 z-40"
        onClick={onClose}
      />

      {/* ポップアップ */}
      <Card
        className="fixed z-50 w-72 max-h-96 overflow-y-auto shadow-lg"
        style={{
          bottom: position?.bottom || 0,
          left: position?.left || 0,
        }}
      >
        <div className="p-2">
          {/* アコーディオン形式のカテゴリ一覧 */}
          <div className="space-y-1">
            {mockCategories.map((category) => {
              const isExpanded = expandedCategories.has(category.id);

              return (
                <div key={category.id}>
                  {/* カテゴリヘッダー */}
                  <button
                    onClick={() => toggleCategory(category.id)}
                    className="w-full text-left px-3 py-2 rounded-md hover:bg-gray-100 transition-colors flex items-center gap-2"
                  >
                    {isExpanded ? (
                      <ChevronDown className="h-4 w-4 text-gray-500" />
                    ) : (
                      <ChevronRight className="h-4 w-4 text-gray-500" />
                    )}
                    <div
                      className="h-3 w-3 rounded"
                      style={{ backgroundColor: category.color }}
                    />
                    <span className="font-medium">{category.name}</span>
                    <span className="text-sm text-gray-500">({category.tags.length})</span>
                  </button>

                  {/* タグ一覧（展開時のみ表示） */}
                  {isExpanded && (
                    <div className="ml-6 mt-1 space-y-1">
                      {category.tags.map((tag) => (
                        <button
                          key={tag.id}
                          onClick={() => handleTagSelect(tag, category)}
                          className="w-full text-left px-3 py-1.5 rounded-md hover:bg-gray-50 transition-colors"
                        >
                          <span
                            className="inline-flex items-center rounded-md px-2 py-0.5 text-sm font-medium"
                            style={{
                              backgroundColor: `${category.color}20`,
                              color: category.color,
                            }}
                          >
                            {tag.name}
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </Card>
    </>
  );
}

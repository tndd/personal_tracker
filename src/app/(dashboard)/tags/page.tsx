"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronUp, Plus, Archive, Edit2 } from "lucide-react";
import { TagFormDialog } from "@/components/tags/tag-form-dialog";
import { CategoryFormDialog } from "@/components/tags/category-form-dialog";

// モックデータ
const mockCategories = [
  {
    id: "cat-1",
    name: "服薬",
    color: "#3B82F6",
    tags: [
      { id: "tag-1", name: "デパス", sortOrder: 0 },
      { id: "tag-2", name: "ワイパックス", sortOrder: 1 },
      { id: "tag-3", name: "リボトリール", sortOrder: 2 },
    ],
  },
  {
    id: "cat-2",
    name: "症状",
    color: "#EF4444",
    tags: [
      { id: "tag-4", name: "頭痛", sortOrder: 0 },
      { id: "tag-5", name: "めまい", sortOrder: 1 },
      { id: "tag-6", name: "吐き気", sortOrder: 2 },
    ],
  },
  {
    id: "cat-3",
    name: "運動",
    color: "#10B981",
    tags: [
      { id: "tag-7", name: "散歩", sortOrder: 0 },
      { id: "tag-8", name: "ジョギング", sortOrder: 1 },
    ],
  },
];

export default function TagsPage() {
  const [categories, setCategories] = useState(mockCategories);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(
    new Set(categories.map((c) => c.id))
  );

  // ダイアログの状態管理
  const [isCategoryDialogOpen, setIsCategoryDialogOpen] = useState(false);
  const [isTagDialogOpen, setIsTagDialogOpen] = useState(false);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);

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

  const moveTag = (categoryId: string, tagIndex: number, direction: "up" | "down") => {
    setCategories((prev) =>
      prev.map((cat) => {
        if (cat.id !== categoryId) return cat;

        const newTags = [...cat.tags];
        const targetIndex = direction === "up" ? tagIndex - 1 : tagIndex + 1;

        if (targetIndex < 0 || targetIndex >= newTags.length) return cat;

        // スワップ
        [newTags[tagIndex], newTags[targetIndex]] = [
          newTags[targetIndex],
          newTags[tagIndex],
        ];

        return { ...cat, tags: newTags };
      })
    );
  };

  // カテゴリ追加ハンドラー
  const handleAddCategory = (data: { name: string; color: string }) => {
    const newCategory = {
      id: `cat-${Date.now()}`,
      name: data.name,
      color: data.color,
      tags: [],
    };
    setCategories((prev) => [...prev, newCategory]);
    setExpandedCategories((prev) => new Set([...prev, newCategory.id]));
  };

  // タグ追加ダイアログを開く
  const openTagDialog = (categoryId: string) => {
    setSelectedCategoryId(categoryId);
    setIsTagDialogOpen(true);
  };

  // タグ追加ハンドラー
  const handleAddTag = (tagName: string) => {
    if (!selectedCategoryId) return;

    setCategories((prev) =>
      prev.map((cat) => {
        if (cat.id !== selectedCategoryId) return cat;

        const newTag = {
          id: `tag-${Date.now()}`,
          name: tagName,
          sortOrder: cat.tags.length,
        };

        return {
          ...cat,
          tags: [...cat.tags, newTag],
        };
      })
    );
  };

  return (
    <div className="mx-auto max-w-4xl space-y-4 sm:space-y-6">
      {/* ヘッダー */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold text-gray-900">Tags</h1>
          <p className="mt-1 text-sm text-gray-500">カテゴリとタグの管理</p>
        </div>

        <Button className="gap-2 self-start sm:self-auto" onClick={() => setIsCategoryDialogOpen(true)}>
          <Plus className="h-4 w-4" />
          <span className="hidden sm:inline">カテゴリ</span>追加
        </Button>
      </div>

      {/* カテゴリ一覧 */}
      <div className="space-y-3">
        {categories.map((category) => {
          const isExpanded = expandedCategories.has(category.id);

          return (
            <Card key={category.id}>
              <CardHeader
                className="cursor-pointer hover:bg-gray-50 transition-colors"
                onClick={() => toggleCategory(category.id)}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
                    <div
                      className="h-4 w-4 rounded flex-shrink-0"
                      style={{ backgroundColor: category.color }}
                    />
                    <CardTitle className="text-base sm:text-lg truncate">{category.name}</CardTitle>
                    <span className="text-xs sm:text-sm text-gray-500 flex-shrink-0">
                      ({category.tags.length})
                    </span>
                  </div>

                  <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
                    <Button variant="ghost" size="icon" className="h-7 w-7 sm:h-8 sm:w-8 hidden sm:flex">
                      <Edit2 className="h-3 w-3 sm:h-4 sm:w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7 sm:h-8 sm:w-8 hidden sm:flex">
                      <Archive className="h-3 w-3 sm:h-4 sm:w-4" />
                    </Button>
                    {isExpanded ? (
                      <ChevronUp className="h-4 w-4 sm:h-5 sm:w-5 text-gray-500" />
                    ) : (
                      <ChevronDown className="h-4 w-4 sm:h-5 sm:w-5 text-gray-500" />
                    )}
                  </div>
                </div>
              </CardHeader>

              {isExpanded && (
                <CardContent className="space-y-2">
                  {/* タグ一覧 */}
                  {category.tags.map((tag, index) => (
                    <div
                      key={tag.id}
                      className="flex items-center justify-between rounded-md border p-2 sm:p-3 hover:bg-gray-50 gap-2"
                    >
                      <span
                        className="inline-flex items-center rounded-md px-2 py-1 text-xs sm:text-sm font-medium truncate"
                        style={{
                          backgroundColor: `${category.color}20`,
                          color: category.color,
                        }}
                      >
                        {tag.name}
                      </span>

                      <div className="flex items-center gap-0.5 sm:gap-1 flex-shrink-0">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 sm:h-8 sm:w-8"
                          disabled={index === 0}
                          onClick={() => moveTag(category.id, index, "up")}
                        >
                          <ChevronUp className="h-3 w-3 sm:h-4 sm:w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 sm:h-8 sm:w-8"
                          disabled={index === category.tags.length - 1}
                          onClick={() => moveTag(category.id, index, "down")}
                        >
                          <ChevronDown className="h-3 w-3 sm:h-4 sm:w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7 sm:h-8 sm:w-8 hidden sm:flex">
                          <Edit2 className="h-3 w-3 sm:h-4 sm:w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7 sm:h-8 sm:w-8 hidden sm:flex">
                          <Archive className="h-3 w-3 sm:h-4 sm:w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}

                  {/* タグ追加ボタン */}
                  <Button
                    variant="secondary"
                    size="sm"
                    className="w-full gap-2"
                    onClick={(e) => {
                      e.stopPropagation();
                      openTagDialog(category.id);
                    }}
                  >
                    <Plus className="h-4 w-4" />
                    タグ追加
                  </Button>
                </CardContent>
              )}
            </Card>
          );
        })}
      </div>

      {/* カテゴリ追加ダイアログ */}
      <CategoryFormDialog
        isOpen={isCategoryDialogOpen}
        onClose={() => setIsCategoryDialogOpen(false)}
        onSubmit={handleAddCategory}
      />

      {/* タグ追加ダイアログ */}
      {selectedCategoryId && (
        <TagFormDialog
          isOpen={isTagDialogOpen}
          onClose={() => {
            setIsTagDialogOpen(false);
            setSelectedCategoryId(null);
          }}
          onSubmit={handleAddTag}
          categoryName={
            categories.find((c) => c.id === selectedCategoryId)?.name || ""
          }
          categoryColor={
            categories.find((c) => c.id === selectedCategoryId)?.color || "#3B82F6"
          }
        />
      )}
    </div>
  );
}

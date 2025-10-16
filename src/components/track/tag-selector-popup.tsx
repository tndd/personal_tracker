"use client";

import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { ChevronDown, ChevronRight } from "lucide-react";
import type { Category, Tag as DBTag } from "@/lib/db/schema";

interface CategoryWithTags extends Category {
  tags: DBTag[];
}

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
  const [categories, setCategories] = useState<CategoryWithTags[]>([]);
  const [loading, setLoading] = useState(true);

  // カテゴリとタグを取得
  useEffect(() => {
    const fetchCategoriesAndTags = async () => {
      setLoading(true);
      try {
        // カテゴリ一覧を取得
        const categoriesRes = await fetch("/api/categories");
        if (!categoriesRes.ok) {
          console.error("カテゴリ取得エラー");
          return;
        }
        const categoriesData = await categoriesRes.json();
        const categoriesList: Category[] = categoriesData.items;

        // 各カテゴリのタグを取得
        const categoriesWithTags: CategoryWithTags[] = await Promise.all(
          categoriesList.map(async (category) => {
            const tagsRes = await fetch(`/api/tags?category_id=${category.id}`);
            if (!tagsRes.ok) {
              return { ...category, tags: [] };
            }
            const tagsData = await tagsRes.json();
            return { ...category, tags: tagsData.items };
          })
        );

        setCategories(categoriesWithTags);
      } catch (error) {
        console.error("データ取得エラー:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchCategoriesAndTags();
  }, []);

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

  const handleTagSelect = (tag: DBTag, category: CategoryWithTags) => {
    onSelect({
      id: tag.id,
      name: tag.name,
      categoryId: category.id,
      categoryName: category.name,
      color: category.color,
    });
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
          {loading ? (
            <div className="text-sm text-gray-500 text-center py-4">読み込み中...</div>
          ) : categories.length === 0 ? (
            <div className="text-sm text-gray-500 text-center py-4">
              カテゴリがありません
            </div>
          ) : (
            <div className="space-y-1">
              {categories.map((category) => {
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
                        {category.tags.length === 0 ? (
                          <div className="text-xs text-gray-400 px-3 py-1">
                            タグがありません
                          </div>
                        ) : (
                          category.tags.map((tag) => (
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
                          ))
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </Card>
    </>
  );
}

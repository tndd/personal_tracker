"use client";

import { useEffect, useState } from "react";
import { Search, ChevronDown, ChevronRight } from "lucide-react";
import { Input } from "@/components/ui/input";
import type { Category, Tag } from "@/lib/db/schema";

interface TrackSidebarContentProps {
  selectedTagIds: string[];
  onTagsChange: (tagIds: string[]) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
}

interface CategoryWithTags extends Category {
  tags: Tag[];
}

export function TrackSidebarContent({
  selectedTagIds,
  onTagsChange,
  searchQuery,
  onSearchChange,
}: TrackSidebarContentProps) {
  const [categories, setCategories] = useState<CategoryWithTags[]>([]);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
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

        // デフォルトで全カテゴリを展開
        setExpandedCategories(new Set(categoriesWithTags.map((c) => c.id)));
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
      const newSet = new Set(prev);
      if (newSet.has(categoryId)) {
        newSet.delete(categoryId);
      } else {
        newSet.add(categoryId);
      }
      return newSet;
    });
  };

  const toggleTag = (tagId: string) => {
    if (selectedTagIds.includes(tagId)) {
      onTagsChange(selectedTagIds.filter((id) => id !== tagId));
    } else {
      onTagsChange([...selectedTagIds, tagId]);
    }
  };

  return (
    <div className="space-y-4">
      {/* 検索バー */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <Input
          type="text"
          placeholder="メモ・タグで検索"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-9 text-sm"
        />
      </div>

      {/* タグツリー */}
      <div>
        <h3 className="text-sm font-medium text-gray-700 mb-2">タグフィルター</h3>
        {loading ? (
          <div className="text-sm text-gray-500">読み込み中...</div>
        ) : categories.length === 0 ? (
          <div className="text-sm text-gray-500">カテゴリがありません</div>
        ) : (
          <div className="space-y-1">
            {categories.map((category) => {
              const isExpanded = expandedCategories.has(category.id);
              return (
                <div key={category.id} className="space-y-1">
                  {/* カテゴリヘッダー */}
                  <button
                    onClick={() => toggleCategory(category.id)}
                    className="flex items-center gap-2 w-full text-left px-2 py-1.5 rounded hover:bg-gray-100 transition-colors"
                  >
                    {isExpanded ? (
                      <ChevronDown className="h-4 w-4 text-gray-500" />
                    ) : (
                      <ChevronRight className="h-4 w-4 text-gray-500" />
                    )}
                    <div
                      className="w-3 h-3 rounded-full flex-shrink-0"
                      style={{ backgroundColor: category.color }}
                    />
                    <span className="text-sm font-medium text-gray-700 truncate">
                      {category.name}
                    </span>
                    <span className="text-xs text-gray-500 ml-auto">
                      {category.tags.length}
                    </span>
                  </button>

                  {/* タグリスト */}
                  {isExpanded && (
                    <div className="ml-6 space-y-1">
                      {category.tags.length === 0 ? (
                        <div className="text-xs text-gray-400 px-2 py-1">
                          タグがありません
                        </div>
                      ) : (
                        category.tags.map((tag) => (
                          <label
                            key={tag.id}
                            className="flex items-center gap-2 px-2 py-1 rounded hover:bg-gray-100 transition-colors cursor-pointer"
                          >
                            <input
                              type="checkbox"
                              checked={selectedTagIds.includes(tag.id)}
                              onChange={() => toggleTag(tag.id)}
                              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                            />
                            <span className="text-sm text-gray-700 truncate">
                              {tag.name}
                            </span>
                          </label>
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

      {/* 選択中のタグ数表示 */}
      {selectedTagIds.length > 0 && (
        <div className="pt-2 border-t">
          <div className="flex items-center justify-between text-xs text-gray-600">
            <span>{selectedTagIds.length}個のタグで絞り込み中</span>
            <button
              onClick={() => onTagsChange([])}
              className="text-blue-600 hover:text-blue-700 font-medium"
            >
              クリア
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

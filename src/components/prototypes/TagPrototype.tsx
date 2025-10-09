import { useMemo, useState } from "react";
import { AppHeader } from "../AppHeader";

export interface TagItem {
  id: string;
  name: string;
  usageCount: number;
  archivedAt: string | null;
}

export interface CategoryItem {
  id: string;
  name: string;
  color: string;
  sortOrder: number;
  archivedAt: string | null;
  tags: TagItem[];
}

export interface TagPrototypeProps {
  categories: CategoryItem[];
  showArchived?: boolean;
}

/**
 * Tag管理画面のプロトタイプ。カテゴリ/タグの並び替えUIを可視化する。
 */
export function TagPrototype({
  categories,
  showArchived: initialShowArchived = false,
}: TagPrototypeProps) {
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>(
    categories[0]?.id ?? ""
  );
  const [showArchived, setShowArchived] = useState(initialShowArchived);
  const [isSortingCategory, setIsSortingCategory] = useState(false);
  const [isSortingTag, setIsSortingTag] = useState(false);

  const visibleCategories = useMemo(() => {
    return categories.filter(
      (category) => showArchived || category.archivedAt === null
    );
  }, [categories, showArchived]);

  const selectedCategory = useMemo(() => {
    return (
      visibleCategories.find((category) => category.id === selectedCategoryId) ??
      visibleCategories[0]
    );
  }, [selectedCategoryId, visibleCategories]);

  return (
    <div className="min-h-screen bg-slate-50">
      <AppHeader activeTab="tag" />
      <main className="mx-auto grid max-w-5xl gap-6 px-6 py-8 lg:grid-cols-[260px_1fr]">
        <section className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <header className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">カテゴリ</h2>
            <button
              type="button"
              className="rounded bg-indigo-600 px-3 py-1 text-xs font-semibold text-white"
            >
              カテゴリ追加
            </button>
          </header>
          <div className="mt-4 space-y-3">
            <div className="flex items-center justify-between text-xs text-gray-500">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={showArchived}
                  onChange={() => setShowArchived((prev) => !prev)}
                  className="h-3 w-3 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                />
                アーカイブを表示
              </label>
              <button
                type="button"
                className="text-indigo-600"
                onClick={() => setIsSortingCategory((prev) => !prev)}
              >
                並び替え
              </button>
            </div>
            <div className="space-y-2">
              {visibleCategories.map((category) => {
                const isSelected = selectedCategory?.id === category.id;
                return (
                  <button
                    key={category.id}
                    type="button"
                    onClick={() => setSelectedCategoryId(category.id)}
                    className={`flex w-full items-center justify-between rounded-lg border px-3 py-2 text-left ${
                      isSelected
                        ? "border-indigo-500 bg-indigo-50"
                        : "border-gray-200 bg-white hover:border-indigo-200"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className="h-3 w-3 rounded-full border"
                        style={{ backgroundColor: category.color }}
                      />
                      <div>
                        <div className="text-sm font-medium text-gray-800">
                          {category.name}
                        </div>
                        <div className="text-xs text-gray-400">
                          タグ {category.tags.length} / 並び順 {category.sortOrder}
                        </div>
                      </div>
                    </div>
                    {category.archivedAt && (
                      <span className="text-xs text-gray-400">Archived</span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
          {isSortingCategory && (
            <div className="mt-4 rounded-lg border border-dashed border-gray-300 px-3 py-4 text-xs text-gray-500">
              ドラッグ＆ドロップでカテゴリの順序を編集し、保存ボタンを押します。
            </div>
          )}
        </section>

        <section className="flex flex-col gap-4">
          <header className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">
                {selectedCategory?.name ?? "カテゴリ未選択"}
              </h2>
              <p className="text-xs text-gray-500">
                タグの並び替えやアーカイブを管理します。
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                className="rounded bg-gray-100 px-3 py-1 text-xs text-gray-600"
              >
                編集
              </button>
              <button
                type="button"
                className="rounded bg-indigo-600 px-3 py-1 text-xs font-semibold text-white"
              >
                タグ追加
              </button>
            </div>
          </header>

          {selectedCategory ? (
            <div className="flex flex-col gap-3 rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
              <div className="flex items-center justify-between text-xs text-gray-500">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    className="text-indigo-600"
                    onClick={() => setIsSortingTag((prev) => !prev)}
                  >
                    並び替え
                  </button>
                  <button type="button" className="text-gray-400">
                    アーカイブ済みを表示
                  </button>
                </div>
                <div>タグ数: {selectedCategory.tags.length}</div>
              </div>
              {selectedCategory.tags.length === 0 ? (
                <div className="rounded-lg border border-dashed border-gray-300 px-6 py-10 text-center text-sm text-gray-500">
                  タグが登録されていません。右上の「タグ追加」から登録できます。
                </div>
              ) : (
                <div className="space-y-2">
                  {selectedCategory.tags.map((tag) => (
                    <article
                      key={tag.id}
                      className={`flex items-center justify-between rounded-lg border px-3 py-2 ${
                        tag.archivedAt
                          ? "border-gray-200 bg-gray-50 opacity-60"
                          : "border-gray-200 bg-white"
                      }`}
                    >
                      <div>
                        <h3 className="text-sm font-semibold text-gray-900">
                          {tag.name}
                        </h3>
                        <p className="text-xs text-gray-400">
                          使用回数 {tag.usageCount}回
                        </p>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-indigo-600">
                        <button type="button">編集</button>
                        {tag.archivedAt ? (
                          <button type="button" className="text-gray-500">
                            解除
                          </button>
                        ) : (
                          <button type="button" className="text-gray-500">
                            アーカイブ
                          </button>
                        )}
                        <button type="button" className="text-gray-400">
                          並び替え
                        </button>
                      </div>
                    </article>
                  ))}
                </div>
              )}
              {isSortingTag && (
                <div className="rounded-lg border border-dashed border-gray-300 px-3 py-4 text-xs text-gray-500">
                  並び替え中です。操作完了後は「保存」ボタンを押してください。
                </div>
              )}
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-gray-300 px-6 py-10 text-center text-sm text-gray-500">
              左のリストからカテゴリを選択すると詳細が表示されます。
            </div>
          )}

          {(isSortingCategory || isSortingTag) && (
            <div className="sticky bottom-6 mx-auto flex w-full max-w-md items-center justify-between rounded-full border border-indigo-200 bg-indigo-50 px-6 py-3 shadow-lg">
              <span className="text-xs font-semibold text-indigo-700">
                並び替え編集中
              </span>
              <div className="flex items-center gap-2 text-sm">
                <button
                  type="button"
                  className="rounded-full border border-indigo-200 px-4 py-1 text-indigo-600"
                >
                  取り消す
                </button>
                <button
                  type="button"
                  className="rounded-full bg-indigo-600 px-4 py-1 font-semibold text-white"
                >
                  保存
                </button>
              </div>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
